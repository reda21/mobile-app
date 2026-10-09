const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || 'dist-perf');
const budget = 1_500_000;
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  });
}
const bundles = files(root).filter(file => /\.js$/.test(file));
if (!bundles.length) throw new Error('No JavaScript bundles found; export Expo first.');
const platforms = new Map();
for (const file of bundles) {
  const platform = path.relative(root, file).match(/(?:^|[/\\])(web|android|ios)(?:[/\\])/)?.[1] || 'other';
  platforms.set(platform, (platforms.get(platform) || 0) + fs.statSync(file).size);
}
for (const [platform, size] of platforms) {
  process.stdout.write(`${platform}: ${size} bytes / ${budget} budget — ${size <= budget ? 'PASS' : 'OVER BUDGET'}\n`);
  if (size > budget) process.exitCode = 1;
}
