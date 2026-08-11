import { fork } from 'child_process';
import path from 'path';

// Automatically trigger daily background backup scheduler on server launch
try {
  const schedulerPath = path.resolve(process.cwd(), 'scripts', 'startBackupScheduler.js');
  fork(schedulerPath, [], { detached: true, stdio: 'ignore' }).unref();
} catch (e) {
  // Silent catch
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
