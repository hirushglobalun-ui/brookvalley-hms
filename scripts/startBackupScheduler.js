import { exec } from 'child_process';
import path from 'path';

console.log('⏰ [Backup & Keep-Alive Scheduler] Automated Daily Backup & Keep-Alive Scheduler Started...');

// Run immediate backup and ping on start
runBackup();
pingKeepAlive();

// Schedule daily backup every 24 hours (86,400,000 ms)
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
setInterval(() => {
  console.log('⏰ [Backup Scheduler] Triggering automated daily backup...');
  runBackup();
}, TWENTY_FOUR_HOURS);

// Schedule keep-alive heartbeat ping every 6 hours (21,600,000 ms)
const SIX_HOURS = 6 * 60 * 60 * 1000;
setInterval(() => {
  pingKeepAlive();
}, SIX_HOURS);

function runBackup() {
  const scriptPath = path.resolve(process.cwd(), 'scripts', 'backupFullSystem.js');
  exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ [Backup Scheduler Error]:', error.message);
      return;
    }
    console.log(stdout);
  });
}

async function pingKeepAlive() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const fs = await import('fs');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    let url = '';
    let key = '';
    content.split('\n').forEach(line => {
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.replace('NEXT_PUBLIC_SUPABASE_URL=', '').trim();
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.replace('NEXT_PUBLIC_SUPABASE_ANON_KEY=', '').trim();
    });

    if (url && key) {
      const res = await fetch(`${url}/rest/v1/bookings?select=id&limit=1`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
      });
      if (res.ok) {
        console.log('💓 [Supabase Keep-Alive Heartbeat] Supabase pinged successfully! Project is active.');
      }
    }
  } catch (e) {
    // Ignore heartbeat errors
  }
}
