#!/usr/bin/env node
/**
 * scripts/auto-version.mjs
 * 
 * Automated Semantic Versioning and Multi-Project Version Synchronization tool
 * based on Conventional Commits specification.
 * 
 * Synchronizes versions across:
 *  - apps/web/package.json
 *  - apps/desktop/src-tauri/Cargo.toml
 *  - apps/desktop/src-tauri/tauri.conf.json
 *  - apps/mobile/pubspec.yaml
 *  - apps/api/AITranslateMeeting.Api.csproj
 *  - CHANGELOG.md
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const forceTypeArg = args.find(a => a.startsWith('--release-type='))?.split('=')[1] || null;
const notesOutputPath = args.find(a => a.startsWith('--output-notes='))?.split('=')[1] || null;

function runGit(command) {
  try {
    return execSync(`git ${command}`, { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch (err) {
    return '';
  }
}

// 1. Get latest git tag
let latestTag = runGit('describe --tags --abbrev=0 --match "v*.*.*"');
if (!latestTag) {
  latestTag = 'v1.0.0';
  console.log(`[auto-version] No previous tag found. Defaulting base to ${latestTag}`);
} else {
  console.log(`[auto-version] Latest tag found: ${latestTag}`);
}

// 2. Extract commits since latest tag
const commitRaw = runGit(`log ${latestTag}..HEAD --pretty=format:"%h%x09%s%x09%b%x1e"`);
const commits = [];

if (commitRaw) {
  const entries = commitRaw.split('\x1e');
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const parts = trimmed.split('\x09');
    const hash = parts[0]?.trim() || '';
    const subject = parts[1]?.trim() || '';
    const body = parts[2]?.trim() || '';
    if (hash && subject) {
      commits.push({ hash, subject, body });
    }
  }
}

console.log(`[auto-version] Analyzed ${commits.length} commits since ${latestTag}`);

// 3. Determine bump type
let bumpType = 'patch'; // default fallback if there are commits
let hasBreaking = false;
let hasFeat = false;
let hasFix = false;

const categorized = {
  breaking: [],
  feat: [],
  fix: [],
  perf: [],
  refactor: [],
  docs: [],
  chore: []
};

for (const c of commits) {
  const isBreaking = c.subject.includes('!:') || c.body.includes('BREAKING CHANGE:');
  if (isBreaking) {
    hasBreaking = true;
    categorized.breaking.push(c);
  }

  const sub = c.subject;
  if (/^feat(\(.+\))?:/i.test(sub)) {
    hasFeat = true;
    categorized.feat.push(c);
  } else if (/^fix(\(.+\))?:/i.test(sub)) {
    hasFix = true;
    categorized.fix.push(c);
  } else if (/^perf(\(.+\))?:/i.test(sub)) {
    categorized.perf.push(c);
  } else if (/^refactor(\(.+\))?:/i.test(sub)) {
    categorized.refactor.push(c);
  } else if (/^docs(\(.+\))?:/i.test(sub)) {
    categorized.docs.push(c);
  } else {
    categorized.chore.push(c);
  }
}

if (forceTypeArg) {
  bumpType = forceTypeArg;
} else if (hasBreaking) {
  bumpType = 'major';
} else if (hasFeat) {
  bumpType = 'minor';
} else if (hasFix || commits.length > 0) {
  bumpType = 'patch';
} else {
  console.log('[auto-version] No new commits since last release. Nothing to version.');
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_changes=false\n`);
  }
  process.exit(0);
}

// 4. Calculate new version
const cleanLatest = latestTag.replace(/^v/, '');
const [majorStr, minorStr, patchStr] = cleanLatest.split('.');
let major = parseInt(majorStr, 10) || 1;
let minor = parseInt(minorStr, 10) || 0;
let patch = parseInt(patchStr, 10) || 0;

if (bumpType === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (bumpType === 'minor') {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

const newVersion = `${major}.${minor}.${patch}`;
const newTag = `v${newVersion}`;

console.log(`[auto-version] Version Bump (${bumpType.toUpperCase()}): ${latestTag} -> ${newTag}`);

// 5. Generate Release Notes
const today = new Date().toISOString().split('T')[0];
let releaseNotes = `## [${newVersion}] - ${today}\n\n`;

if (categorized.breaking.length > 0) {
  releaseNotes += `### ⚠️ BREAKING CHANGES\n`;
  for (const c of categorized.breaking) {
    releaseNotes += `- ${c.subject} (${c.hash})\n`;
  }
  releaseNotes += `\n`;
}

if (categorized.feat.length > 0) {
  releaseNotes += `### 🚀 Features & Enhancements\n`;
  for (const c of categorized.feat) {
    releaseNotes += `- ${c.subject} (${c.hash})\n`;
  }
  releaseNotes += `\n`;
}

if (categorized.fix.length > 0) {
  releaseNotes += `### 🐛 Bug Fixes & Stability\n`;
  for (const c of categorized.fix) {
    releaseNotes += `- ${c.subject} (${c.hash})\n`;
  }
  releaseNotes += `\n`;
}

if (categorized.perf.length > 0) {
  releaseNotes += `### ⚡ Performance Optimizations\n`;
  for (const c of categorized.perf) {
    releaseNotes += `- ${c.subject} (${c.hash})\n`;
  }
  releaseNotes += `\n`;
}

if (categorized.refactor.length > 0 || categorized.chore.length > 0) {
  releaseNotes += `### 🛠️ Maintenance & Refactoring\n`;
  for (const c of [...categorized.refactor, ...categorized.chore]) {
    releaseNotes += `- ${c.subject} (${c.hash})\n`;
  }
  releaseNotes += `\n`;
}

if (categorized.docs.length > 0) {
  releaseNotes += `### 📝 Documentation\n`;
  for (const c of categorized.docs) {
    releaseNotes += `- ${c.subject} (${c.hash})\n`;
  }
  releaseNotes += `\n`;
}

if (isDryRun) {
  console.log('\n--- DRY RUN: RELEASE NOTES PREVIEW ---');
  console.log(releaseNotes);
  console.log('--- END PREVIEW ---\n');
}

// 6. Update files if not dry run
if (!isDryRun) {
  // A. apps/web/package.json
  const webPkgPath = path.join(rootDir, 'apps/web/package.json');
  if (fs.existsSync(webPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(webPkgPath, 'utf8'));
    pkg.version = newVersion;
    fs.writeFileSync(webPkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`[auto-version] Updated apps/web/package.json to ${newVersion}`);
  }

  // B. apps/desktop/src-tauri/Cargo.toml
  const desktopCargoPath = path.join(rootDir, 'apps/desktop/src-tauri/Cargo.toml');
  if (fs.existsSync(desktopCargoPath)) {
    let content = fs.readFileSync(desktopCargoPath, 'utf8');
    content = content.replace(/^version = ".*"/m, `version = "${newVersion}"`);
    fs.writeFileSync(desktopCargoPath, content);
    console.log(`[auto-version] Updated apps/desktop/src-tauri/Cargo.toml to ${newVersion}`);
  }

  // C. apps/desktop/src-tauri/tauri.conf.json
  const tauriConfPath = path.join(rootDir, 'apps/desktop/src-tauri/tauri.conf.json');
  if (fs.existsSync(tauriConfPath)) {
    const conf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
    conf.version = newVersion;
    fs.writeFileSync(tauriConfPath, JSON.stringify(conf, null, 2) + '\n');
    console.log(`[auto-version] Updated apps/desktop/src-tauri/tauri.conf.json to ${newVersion}`);
  }

  // D. apps/mobile/pubspec.yaml
  const mobilePubspecPath = path.join(rootDir, 'apps/mobile/pubspec.yaml');
  if (fs.existsSync(mobilePubspecPath)) {
    let content = fs.readFileSync(mobilePubspecPath, 'utf8');
    const buildNumber = major * 10000 + minor * 100 + patch;
    content = content.replace(/^version: .*/m, `version: ${newVersion}+${buildNumber}`);
    fs.writeFileSync(mobilePubspecPath, content);
    console.log(`[auto-version] Updated apps/mobile/pubspec.yaml to ${newVersion}+${buildNumber}`);
  }

  // E. apps/api/AITranslateMeeting.Api.csproj
  const apiCsprojPath = path.join(rootDir, 'apps/api/AITranslateMeeting.Api.csproj');
  if (fs.existsSync(apiCsprojPath)) {
    let content = fs.readFileSync(apiCsprojPath, 'utf8');
    if (content.includes('<Version>')) {
      content = content.replace(/<Version>.*<\/Version>/, `<Version>${newVersion}</Version>`);
    } else {
      content = content.replace('</PropertyGroup>', `  <Version>${newVersion}</Version>\n  </PropertyGroup>`);
    }
    fs.writeFileSync(apiCsprojPath, content);
    console.log(`[auto-version] Updated apps/api/AITranslateMeeting.Api.csproj to ${newVersion}`);
  }

  // F. CHANGELOG.md
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  let existingChangelog = '';
  if (fs.existsSync(changelogPath)) {
    existingChangelog = fs.readFileSync(changelogPath, 'utf8');
    // Prepend new section after title
    if (existingChangelog.startsWith('# Changelog')) {
      const idx = existingChangelog.indexOf('\n\n');
      existingChangelog = existingChangelog.slice(idx + 2);
    }
  }
  const fullChangelog = `# Changelog\n\nAll notable changes to the LayaMeet platform are documented in this file.\n\n${releaseNotes}${existingChangelog}`;
  fs.writeFileSync(changelogPath, fullChangelog);
  console.log(`[auto-version] Updated CHANGELOG.md with ${newTag}`);
}

// 7. Write release notes artifact if requested
if (notesOutputPath) {
  const resolvedNotesPath = path.isAbsolute(notesOutputPath) ? notesOutputPath : path.join(rootDir, notesOutputPath);
  fs.mkdirSync(path.dirname(resolvedNotesPath), { recursive: true });
  fs.writeFileSync(resolvedNotesPath, releaseNotes);
  console.log(`[auto-version] Wrote release notes to ${resolvedNotesPath}`);
}

// 8. Set outputs for GitHub Actions environment if available
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_changes=true\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${newVersion}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `tag=${newTag}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `bump_type=${bumpType}\n`);
}

console.log(`[auto-version] Successfully completed! Next tag: ${newTag}`);
