#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const scriptDir = __dirname;
const psScript = path.join(scriptDir, 'ota-publish-git.ps1');
const shScript = path.join(scriptDir, 'ota-publish-git.sh');
const extraArgs = process.argv.slice(2);
const showHelp = extraArgs.includes('--help') || extraArgs.includes('-h');

if (showHelp) {
  console.log('Usage: yarn ota:git');
  console.log('Optional env vars:');
  console.log('  OTA_GIT_REPO=https://github.com/<org>/<repo>.git');
  console.log('  OTA_GIT_BRANCH=main');
  console.log('  OTA_GIT_BUNDLE_PATH=ota/android/main.jsbundle');
  console.log('  OTA_GIT_ASSETS_PATH=ota/android');
  console.log('  OTA_GIT_TEMP_DIR=/tmp/farmadolores_ota_public');
  console.log('  OTA_GIT_COMMIT_MESSAGE=\"ota(android): update YYYY-MM-DD HH:mm\"');
  process.exit(0);
}

const run = (cmd, args) =>
  spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: false,
  });

const toExitCode = (result) => {
  if (typeof result?.status === 'number') {
    return result.status;
  }
  return result?.error ? 1 : 0;
};

if (process.platform === 'win32') {
  let result = run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psScript, ...extraArgs]);

  if (result.error) {
    result = run('pwsh', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psScript, ...extraArgs]);
  }

  process.exit(toExitCode(result));
} else {
  const result = run('bash', [shScript, ...extraArgs]);
  process.exit(toExitCode(result));
}
