#!/usr/bin/env node
// Blueprinted & built by Drferdi.

/**
 * One-Click Documentation Automation
 *
 * Runs the complete documentation workflow:
 * 1. Auto-generate missing documentation
 * 2. Generate HTML documentation
 * 3. Open documentation in browser
 *
 * Usage: npm run docs:all
 */

const { execSync } = require('child_process');
const _path = require('path');

console.log('🚀 Starting Complete Documentation Workflow\n');
console.log('='.repeat(60));

// Step 1: Auto-generate documentation
console.log('\n📝 Step 1/3: Auto-generating missing documentation...\n');
try {
  execSync('npm run docs:auto', { stdio: 'inherit' });
  console.log('\n✅ Auto-documentation complete!');
} catch (_error) {
  console.error('❌ Auto-documentation failed:', _error.message);
  process.exit(1);
}

// Step 2: Generate HTML documentation
console.log('\n📚 Step 2/3: Generating HTML documentation...\n');
try {
  execSync('npm run docs:generate', { stdio: 'inherit' });
  console.log('\n✅ HTML documentation generated!');
} catch (_error) {
  console.error('❌ Documentation generation failed:', _error.message);
  process.exit(1);
}

// Step 3: Serve documentation
console.log('\n🌐 Step 3/3: Opening documentation in browser...\n');
try {
  execSync('npm run docs:serve', { stdio: 'inherit' });
} catch (_error) {
  // Server might already be running, that's okay
  console.log('\n⚠️  Server might already be running on port 8080');
  console.log('📖 Documentation available at: http://localhost:8080');
}

console.log('\n' + '='.repeat(60));
console.log('✨ Documentation workflow complete!');
console.log('='.repeat(60) + '\n');
