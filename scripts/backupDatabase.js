import fs from 'fs';
import path from 'path';

// Read .env.local manually to get Supabase credentials
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = trimmed.replace('NEXT_PUBLIC_SUPABASE_URL=', '').trim();
  }
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseKey = trimmed.replace('NEXT_PUBLIC_SUPABASE_ANON_KEY=', '').trim();
  }
});

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local!');
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

    if (!res.ok) {
      console.warn(`⚠️ Warning: Could not fetch table "${table}" (HTTP ${res.status})`);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`⚠️ Error fetching table "${table}":`, err.message);
    return [];
  }
}

async function runBackup() {
  const backupData = {
    timestamp: new Date().toISOString(),
    supabaseUrl,
    tables: {}
  };

  for (const table of tables) {
    console.log(`📦 Fetching table: ${table}...`);
    backupData.tables[table] = await fetchTable(table);
    console.log(`   └─ Found ${backupData.tables[table].length} records.`);
  }

  // Ensure backups directory exists
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Save JSON backups
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const latestPath = path.join(backupDir, 'latest-backup.json');
  const timestampPath = path.join(backupDir, `backup-${dateStr}.json`);

  fs.writeFileSync(latestPath, JSON.stringify(backupData, null, 2));
  fs.writeFileSync(timestampPath, JSON.stringify(backupData, null, 2));

  // Generate SQL Restore Script
  let sqlContent = `-- AUTOMATIC BACKUP SQL RESTORE SCRIPT\n-- Generated: ${backupData.timestamp}\n\n`;

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

  console.log('\n✅ BACKUP COMPLETED SUCCESSFULLY!');
  console.log(`📁 JSON Backup: file:///${latestPath.replace(/\\/g, '/')}`);
  console.log(`📄 SQL Restore Script: file:///${sqlPath.replace(/\\/g, '/')}`);
}

runBackup();
