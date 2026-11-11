import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export function lintSource(filename, content) {
  const source = ts.createSourceFile(filename, content, ts.ScriptTarget.Latest, true);
  const findings = source.parseDiagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  function visit(node) {
    const dynamicCode = (ts.isCallExpression(node) || ts.isNewExpression(node))
      && ts.isIdentifier(node.expression)
      && ['eval', 'Function'].includes(node.expression.text);
    if (node.kind === ts.SyntaxKind.DebuggerStatement || dynamicCode) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source));
      findings.push(`${filename}:${position.line + 1}: debugger and dynamic code execution are forbidden`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return findings;
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Source link is not allowed: ${target}`);
    if (entry.isDirectory()) return walk(target);
    return /\.(?:ts|mjs)$/u.test(entry.name) ? [target] : [];
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const files = ['src', 'desktop', 'scripts', 'tests'].flatMap((directory) => walk(path.join(root, directory)));
  const findings = files.flatMap((filename) => lintSource(filename, fs.readFileSync(filename, 'utf8')));
  if (findings.length) {
    console.error(findings.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`Retriever lint passed: ${files.length} files checked for syntax, debugger, and dynamic code execution.`);
  }
}
