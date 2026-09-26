#!/usr/bin/env node
// Blueprinted & built by Drferdi.
/**
 * Auto-Commit Script for Solo Development
 * Automatically commits changes with smart commit messages
 */

const { execSync } = require('child_process');
const _fs = require('fs');
const _path = require('path');

// Configuration
const CONFIG = {
  // Auto-commit interval in minutes (0 = manual trigger only)
  intervalMinutes: 0,

  // Commit message prefix
  prefix: '🔄 Auto-commit:',

  // Files/folders to always ignore (in addition to .gitignore)
  ignorePatterns: ['node_modules/', '.wxt/', '.output/', 'dist/', 'build/'],
};

/**
 * Execute git command
 */
function git(command) {
  try {
    return execSync(`git ${command}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (_error) {
    return null;
  }
}

/**
 * Check if there are changes to commit
 */
function hasChanges() {
  const status = git('status --porcelain');
  return status && status.length > 0;
}

/**
 * Get list of changed files
 */
function getChangedFiles() {
  const status = git('status --porcelain');
  if (!status) return [];

  return status
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const match = line.match(/^.{3}(.+)$/);
      return match ? match[1].trim() : '';
    })
    .filter((file) => file);
}

/**
 * Generate smart commit message based on changed files
 */
function generateCommitMessage(files) {
  if (files.length === 0) return `${CONFIG.prefix} No changes`;

  // Categorize changes
  const categories = {
    docs: [],
    components: [],
    lib: [],
    utils: [],
    config: [],
    styles: [],
    scripts: [],
    other: [],
  };

  files.forEach((file) => {
    if (file.includes('docs/') || file.endsWith('.md')) {
      categories.docs.push(file);
    } else if (file.includes('components/')) {
      categories.components.push(file);
    } else if (file.includes('lib/')) {
      categories.lib.push(file);
    } else if (file.includes('utils/')) {
      categories.utils.push(file);
    } else if (file.includes('entrypoints/')) {
      categories.components.push(file);
    } else if (file.endsWith('.css') || file.endsWith('.scss')) {
      categories.styles.push(file);
    } else if (
      file.endsWith('.json') ||
      file.endsWith('.config.js') ||
      file.endsWith('.config.ts')
    ) {
      categories.config.push(file);
    } else if (file.includes('scripts/')) {
      categories.scripts.push(file);
    } else {
      categories.other.push(file);
    }
  });

  // Build message
  const parts = [];

  if (categories.components.length > 0) {
    parts.push(`Updated ${categories.components.length} component(s)`);
  }
  if (categories.lib.length > 0) {
    parts.push(`Modified ${categories.lib.length} lib file(s)`);
  }
  if (categories.utils.length > 0) {
    parts.push(`Changed ${categories.utils.length} util(s)`);
  }
  if (categories.docs.length > 0) {
    parts.push(`Updated docs`);
  }
  if (categories.styles.length > 0) {
    parts.push(`Styled ${categories.styles.length} file(s)`);
  }
  if (categories.config.length > 0) {
    parts.push(`Config changes`);
  }
  if (categories.scripts.length > 0) {
    parts.push(`Script updates`);
  }
  if (categories.other.length > 0) {
    parts.push(`${categories.other.length} other change(s)`);
  }

  const message = parts.join(' • ');
  return `${CONFIG.prefix} ${message}`;
}

/**
 * Perform auto-commit
 */
function autoCommit() {
  console.log('🔍 Checking for changes...');

  if (!hasChanges()) {
    console.log('✅ No changes to commit');
    return false;
  }

  const files = getChangedFiles();
  console.log(`📝 Found ${files.length} changed file(s):`);
  files.forEach((file) => console.log(`   - ${file}`));

  // Add all changes
  console.log('\n📦 Staging changes...');
  git('add -A');

  // Generate commit message
  const message = generateCommitMessage(files);
  console.log(`💬 Commit message: "${message}"`);

  // Commit
  console.log('✨ Committing...');
  const result = git(`commit -m "${message}"`);

  if (result) {
    console.log('✅ Auto-commit successful!');
    console.log(result);
    return true;
  } else {
    console.log('❌ Commit failed');
    return false;
  }
}

/**
 * Auto-commit and push
 */
function autoCommitAndPush() {
  const committed = autoCommit();

  if (committed) {
    console.log('\n🚀 Pushing to remote...');
    const branch = git('branch --show-current');
    const pushResult = git(`push origin ${branch}`);

    if (pushResult !== null) {
      console.log('✅ Push successful!');
    } else {
      console.log('⚠️  Push failed (you may need to push manually)');
    }
  }
}

/**
 * Watch mode - auto-commit at intervals
 */
function watchMode() {
  console.log(`👀 Watch mode enabled - auto-committing every ${CONFIG.intervalMinutes} minutes`);
  console.log('Press Ctrl+C to stop\n');

  // Initial commit
  autoCommit();

  // Set interval
  setInterval(
    () => {
      console.log('\n' + '='.repeat(50));
      console.log(`⏰ Auto-commit triggered at ${new Date().toLocaleTimeString()}`);
      console.log('='.repeat(50) + '\n');
      autoCommit();
    },
    CONFIG.intervalMinutes * 60 * 1000
  );
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'push':
    autoCommitAndPush();
    break;
  case 'watch': {
    const interval = parseInt(args[1]) || CONFIG.intervalMinutes;
    if (interval === 0) {
      console.log('❌ Please specify interval in minutes: npm run commit:watch 5');
      process.exit(1);
    }
    CONFIG.intervalMinutes = interval;
    watchMode();
    break;
  }
  default:
    autoCommit();
}
