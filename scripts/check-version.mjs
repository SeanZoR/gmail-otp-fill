// Fails if manifest.json, package.json and (in CI) the git tag disagree on the version.
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8')).version;
const pkg = JSON.parse(readFileSync('package.json', 'utf8')).version;
const tag = process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME.replace(/^v/, '') : null;

const problems = [];
if (manifest !== pkg) problems.push(`manifest.json is ${manifest}, package.json is ${pkg}`);
if (tag && tag !== manifest) problems.push(`tag is v${tag}, manifest.json is ${manifest}`);

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`version ${manifest} ok`);
