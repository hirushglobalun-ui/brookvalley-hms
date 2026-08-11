import { exec } from 'child_process';
import path from 'path';

console.log('⏰ [Backup Scheduler] Automated Daily Backup Scheduler Started...');

// Run immediate backup on start
runBackup();

// Schedule daily backup every 24 hours (86,400,000 ms)
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
setInterval(() => {
  console.log('⏰ [Backup Scheduler] Triggering automated daily backup...');
  runBackup();
}, TWENTY_FOUR_HOURS);

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
