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

const latestBackupPath = path.resolve(process.cwd(), 'backups', 'latest-backup.json');
if (!fs.existsSync(latestBackupPath)) {
  console.error('❌ No backup file found at backups/latest-backup.json');
  process.exit(1);
}

const backupData = JSON.parse(fs.readFileSync(latestBackupPath, 'utf8'));
console.log(`📡 Restoring backup from ${backupData.timestamp} to: ${supabaseUrl}`);

async function restoreTable(table, records) {
  if (!records || records.length === 0) return;
  console.log(`🔄 Restoring ${records.length} records into "${table}"...`);

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates'
      },
      body: JSON.stringify(records)
    });

    if (res.ok) {
      console.log(`   └─ ✅ Restored ${table} successfully.`);
    } else {
      const err = await res.text();
      console.warn(`   └─ ⚠️ Notice restoring ${table}:`, err);
    }
  } catch (err) {
    console.error(`   └─ ❌ Failed to restore ${table}:`, err.message);
  }
}

async function runRestore() {
  const tablesOrder = ['profiles', 'room_types', 'employees', 'rooms', 'bookings', 'activity_logs'];

  for (const table of tablesOrder) {
    if (backupData.tables[table]) {
      await restoreTable(table, backupData.tables[table]);
    }
  }

  console.log('\n✅ RESTORE PROCESS FINISHED!');
}

runRestore();
