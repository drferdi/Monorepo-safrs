#!/usr/bin/env node
// Blueprinted & built by Drferdi.

/**
 * Auto-Documentation Script
 *
 * Automatically adds basic TSDoc documentation to exported functions,
 * classes, and interfaces that don't have documentation yet.
 *
 * Usage: node scripts/auto-document.js [directory]
 * Example: node scripts/auto-document.js lib/
 */

const fs = require('fs');
const path = require('path');

// Directories to process
const TARGET_DIRS = process.argv[2]
  ? [process.argv[2]]
  : ['lib', 'utils', 'components', 'entrypoints'];

// File extensions to process
const VALID_EXTENSIONS = ['.ts', '.tsx'];

// Patterns to detect undocumented exports
const _EXPORT_PATTERNS = [
  /export\s+(async\s+)?function\s+(\w+)/g,
  /export\s+class\s+(\w+)/g,
  /export\s+interface\s+(\w+)/g,
  /export\s+type\s+(\w+)/g,
  /export\s+const\s+(\w+)\s*=\s*\(/g,
];

let filesProcessed = 0;
let docsAdded = 0;

/**
 * Recursively get all TypeScript files in a directory
 */
function getTypeScriptFiles(dir) {
  const files = [];

  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  Directory not found: ${dir}`);
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...getTypeScriptFiles(fullPath));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (VALID_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Generate basic TSDoc comment for a function/class/interface
 */
function generateDocComment(type, name, indent = '') {
  const timestamp = new Date().toISOString().split('T')[0];

  switch (type) {
    case 'function':
      return `${indent}/**
${indent} * ${name}
${indent} * 
${indent} * @remarks
${indent} * TODO: Add detailed description, parameters, and examples
${indent} * Auto-generated on ${timestamp}
${indent} */\n`;

    case 'class':
      return `${indent}/**
${indent} * ${name} class
${indent} * 
${indent} * @remarks
${indent} * TODO: Add class description and usage examples
${indent} * Auto-generated on ${timestamp}
${indent} */\n`;

    case 'interface':
    case 'type':
      return `${indent}/**
${indent} * ${name} ${type}
${indent} * 
${indent} * @remarks
${indent} * TODO: Add type description and property documentation
${indent} * Auto-generated on ${timestamp}
${indent} */\n`;

    default:
      return `${indent}/**
${indent} * ${name}
${indent} * 
${indent} * @remarks
${indent} * TODO: Add documentation
${indent} * Auto-generated on ${timestamp}
${indent} */\n`;
  }
}

/**
 * Check if a line already has documentation above it
 */
function hasDocumentation(lines, lineIndex) {
  // Check previous lines for /** or //
  for (let i = lineIndex - 1; i >= 0; i--) {
    const line = lines[i].trim();

    // Empty line - keep checking
    if (line === '') continue;

    // Found documentation
    if (line.startsWith('/**') || line.startsWith('//') || line.startsWith('*')) {
      return true;
    }

    // Found code - no documentation
    return false;
  }

  return false;
}

/**
 * Process a single file and add missing documentation
 */
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const newLines = [];
  let modified = false;
  let fileDocsAdded = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line has an export that needs documentation
    let needsDoc = false;
    let exportType = null;
    let exportName = null;

    // Check for export function
    const funcMatch = line.match(/export\s+(async\s+)?function\s+(\w+)/);
    if (funcMatch && !hasDocumentation(lines, i)) {
      needsDoc = true;
      exportType = 'function';
      exportName = funcMatch[2];
    }

    // Check for export class
    const classMatch = line.match(/export\s+class\s+(\w+)/);
    if (classMatch && !hasDocumentation(lines, i)) {
      needsDoc = true;
      exportType = 'class';
      exportName = classMatch[1];
    }

    // Check for export interface
    const interfaceMatch = line.match(/export\s+interface\s+(\w+)/);
    if (interfaceMatch && !hasDocumentation(lines, i)) {
      needsDoc = true;
      exportType = 'interface';
      exportName = interfaceMatch[1];
    }

    // Check for export type
    const typeMatch = line.match(/export\s+type\s+(\w+)/);
    if (typeMatch && !hasDocumentation(lines, i)) {
      needsDoc = true;
      exportType = 'type';
      exportName = typeMatch[1];
    }

    // Check for export const function
    const constMatch = line.match(/export\s+const\s+(\w+)\s*=\s*\(/);
    if (constMatch && !hasDocumentation(lines, i)) {
      needsDoc = true;
      exportType = 'function';
      exportName = constMatch[1];
    }

    if (needsDoc) {
      // Get indentation from current line
      const indent = line.match(/^(\s*)/)[1];

      // Add documentation comment
      const docComment = generateDocComment(exportType, exportName, indent);
      newLines.push(docComment);
      modified = true;
      fileDocsAdded++;
    }

    newLines.push(line);
  }

  if (modified) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
    console.log(`✅ ${filePath} - Added ${fileDocsAdded} doc comment(s)`);
    docsAdded += fileDocsAdded;
  }

  filesProcessed++;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Auto-Documentation Script\n');
  console.log(`📁 Target directories: ${TARGET_DIRS.join(', ')}\n`);

  const allFiles = [];

  for (const dir of TARGET_DIRS) {
    const files = getTypeScriptFiles(dir);
    allFiles.push(...files);
  }

  console.log(`📄 Found ${allFiles.length} TypeScript files\n`);

  for (const file of allFiles) {
    processFile(file);
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✨ Complete!`);
  console.log(`📊 Files processed: ${filesProcessed}`);
  console.log(`📝 Documentation comments added: ${docsAdded}`);
  console.log('='.repeat(50));

  if (docsAdded > 0) {
    console.log('\n⚠️  Next steps:');
    console.log('1. Review auto-generated comments and add details');
    console.log('2. Add @param, @returns, and @example tags');
    console.log('3. Run: npm run docs:generate');
    console.log('4. Run: npm run docs:serve to view documentation\n');
  }
}

main();
