import fs from 'fs';
import path from 'path';

// Read .env.local manually to get Supabase credentials
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

async function downloadOrSaveImage(imageUrl, targetPath) {
  try {
    if (imageUrl.startsWith('data:image/')) {
      // Handle Data URL (Base64)
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(targetPath, buffer);
      return true;
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Handle Remote HTTP/HTTPS URL
      const res = await fetch(imageUrl);
      if (!res.ok) return false;
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(targetPath, buffer);
      return true;
    }
  } catch (err) {
    console.warn(`⚠️ Warning saving image from ${imageUrl.slice(0, 30)}...:`, err.message);
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

  console.log('\n📦 Starting Full System Backup (Database + Photos & Media)...\n');

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
  console.log(`   └─ ✅ Downloaded & saved ${imageCounter} payment proof images into backups.`);

  // Save latest & timestamped JSON backups
  const latestJsonPath = path.resolve(process.cwd(), 'backups', 'latest-backup.json');
  const timestampJsonPath = path.join(backupDir, 'database-backup.json');

  fs.writeFileSync(latestJsonPath, JSON.stringify(backupData, null, 2));
  fs.writeFileSync(timestampJsonPath, JSON.stringify(backupData, null, 2));

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

  console.log('\n🎉 FULL BACKUP COMPLETED SUCCESSFULLY!');
  console.log(`📁 Backup Folder: file:///${backupDir.replace(/\\/g, '/')}`);
  console.log(`🖼️ Saved ${imageCounter} Photos to: file:///${imagesDir.replace(/\\/g, '/')}`);
  console.log(`📄 Database SQL: file:///${sqlPath.replace(/\\/g, '/')}`);
}

runFullBackup();
