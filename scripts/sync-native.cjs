const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
if (args.some((arg) => !['--regenerate', '--android', '--ios'].includes(arg)) ||
    (args.includes('--android') && args.includes('--ios'))) {
  console.error('Usage: npm run native:sync -- [--regenerate] [--android | --ios]');
  process.exit(1);
}

try {
  const changes = execFileSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'ios', 'android'], {
    cwd: root, encoding: 'utf8',
  });
  if (changes.trim()) {
    console.error('Native files have uncommitted changes. Review and preserve them before running Prebuild.');
    console.error(changes);
    process.exit(1);
  }
} catch {
  console.error('Cannot verify native Git status. Refusing to regenerate.');
  process.exit(1);
}

const platform = args.includes('--android') ? 'android' : args.includes('--ios') ? 'ios' : 'all';
if (process.platform === 'win32' && platform !== 'android') {
  console.error('Expo skips iOS on Windows. Use --android here; sync iOS on macOS or Linux (see README).');
  process.exit(1);
}
const command = ['prebuild', '--platform', platform, '--no-install'];
// SDK 57 recreates native folders by default. Opt out unless explicitly requested.
if (!args.includes('--regenerate')) command.push('--no-clean');
const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), ...command], {
  cwd: root, stdio: 'inherit',
});
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
