import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Read .env.local manually to get Supabase and Cloudflare R2 credentials
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  const index = trimmed.indexOf('=');
  if (index > 0) {
    const key = trimmed.slice(0, index).trim();
    const val = trimmed.slice(index + 1).trim();
    envVars[key] = val;
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log(`📡 Connecting to Supabase Project: ${supabaseUrl}`);

const tables = ['profiles', 'employees', 'room_types', 'rooms', 'bookings', 'activity_logs'];

async function fetchTable(table) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`⚠️ Error fetching table "${table}":`, err.message);
    return [];
  }
}

async function uploadToCloudflareR2(key, body, contentType) {
  const accountId = envVars['R2_ACCOUNT_ID'];
  const accessKeyId = envVars['R2_ACCESS_KEY_ID'];
  const secretAccessKey = envVars['R2_SECRET_ACCESS_KEY'];
  const bucketName = envVars['R2_BUCKET_NAME'] || 'brookvalley-hms';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn('⚠️ Cloudflare R2 credentials missing. Skipping R2 cloud backup upload.');
    return null;
  }

  try {
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000'
      })
    );

    const publicUrl = envVars['R2_PUBLIC_URL'] ? `${envVars['R2_PUBLIC_URL']}/${key}` : key;
    console.log(`   └─ ☁️ Uploaded to Cloudflare R2: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.warn(`   └─ ⚠️ Notice uploading ${key} to Cloudflare R2:`, err.message);
    return null;
  }
}

async function downloadOrSaveImage(imageUrl, targetPath) {
  try {
    if (imageUrl.startsWith('data:image/')) {
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(targetPath, buffer);
      return true;
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const res = await fetch(imageUrl);
      if (!res.ok) return false;
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(targetPath, buffer);
      return true;
    }
  } catch (err) {
    console.warn(`⚠️ Warning saving image:`, err.message);
  }
  return false;
}

async function runFullBackup() {
  const backupData = {
    timestamp: new Date().toISOString(),
    supabaseUrl,
    tables: {},
    downloadedImagesCount: 0
  };

  const dateStr = new Date().toISOString().slice(0, 10);
  const backupDir = path.resolve(process.cwd(), 'backups', `backup-${dateStr}`);
  const imagesDir = path.join(backupDir, 'payment-proofs');

  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  console.log('\n📦 Starting Full System Backup (Database + Cloudflare R2 Uploads + Photos)...\n');

  for (const table of tables) {
    console.log(`📄 Fetching table: ${table}...`);
    backupData.tables[table] = await fetchTable(table);
    console.log(`   └─ Found ${backupData.tables[table].length} records.`);
  }

  // Backup payment proof images from bookings
  const bookings = backupData.tables['bookings'] || [];
  let imageCounter = 0;

  console.log('\n📸 Backing up Payment Proof Photos & Images...');
  for (const booking of bookings) {
    if (!booking.payment_proof) continue;

    const proofUrls = booking.payment_proof.split(',').map(p => p.trim()).filter(Boolean);
    for (let i = 0; i < proofUrls.length; i++) {
      const url = proofUrls[i];
      const ext = url.includes('.png') ? 'png' : url.includes('.webp') ? 'webp' : 'jpg';
      const filename = `proof_${booking.booking_id || 'booking'}_${i + 1}.${ext}`;
      const imgPath = path.join(imagesDir, filename);

      const saved = await downloadOrSaveImage(url, imgPath);
      if (saved) {
        imageCounter++;
      }
    }
  }

  backupData.downloadedImagesCount = imageCounter;
  console.log(`   └─ ✅ Downloaded & saved ${imageCounter} payment proof images locally.`);

  // Save JSON backups
  const latestJsonPath = path.resolve(process.cwd(), 'backups', 'latest-backup.json');
  const timestampJsonPath = path.join(backupDir, 'database-backup.json');

  const jsonStr = JSON.stringify(backupData, null, 2);
  fs.writeFileSync(latestJsonPath, jsonStr);
  fs.writeFileSync(timestampJsonPath, jsonStr);

  // Generate SQL Restore Script
  let sqlContent = `-- AUTOMATIC FULL BACKUP RESTORE SCRIPT\n-- Generated: ${backupData.timestamp}\n\n`;

  for (const [table, rows] of Object.entries(backupData.tables)) {
    if (rows.length === 0) continue;
    sqlContent += `-- --- DATA FOR TABLE: public.${table} ---\n`;
    
    for (const row of rows) {
      const keys = Object.keys(row);
      const values = Object.values(row).map(v => {
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number' || typeof v === 'boolean') return v;
        if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
        return `'${String(v).replace(/'/g, "''")}'`;
      });

      sqlContent += `INSERT INTO public.${table} (${keys.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
    }
    sqlContent += `\n`;
  }

  const sqlPath = path.join(backupDir, 'restore-data.sql');
  fs.writeFileSync(sqlPath, sqlContent);

  // Upload Database JSON & SQL Restore file directly to Cloudflare R2
  console.log('\n☁️ Uploading Database Snapshot & SQL to Cloudflare R2...');
  await uploadToCloudflareR2(`backups/database-backup-${dateStr}.json`, Buffer.from(jsonStr), 'application/json');
  await uploadToCloudflareR2(`backups/restore-data-${dateStr}.sql`, Buffer.from(sqlContent), 'text/plain');

  console.log('\n🎉 FULL BACKUP COMPLETED SUCCESSFULLY!');
  console.log(`📁 Local Backup Folder: file:///${backupDir.replace(/\\/g, '/')}`);
  console.log(`📄 Database JSON & SQL: Saved locally AND uploaded to Cloudflare R2!`);
}

runFullBackup();
