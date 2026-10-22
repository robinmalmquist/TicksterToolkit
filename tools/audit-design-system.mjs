#!/usr/bin/env node

/**
 * Lightweight design-system guardrail.
 *
 * Run before a commit with:
 *   node tools/audit-design-system.mjs
 *
 * It audits only additions relative to HEAD, so it protects the token contract
 * incrementally without blocking the remaining legacy clean-up. New CSS colours
 * and spacing must be expressed through custom-property tokens; token
 * declarations themselves are allowed. Inline presentation in the HTML is not.
 */

import { execFileSync } from 'node:child_process';

const files = ['arena-designer.css', 'arena-designer.html'];
const safeDirectory = process.cwd().replaceAll('\\', '/');
const diff = execFileSync(
  'git',
  ['-c', `safe.directory=${safeDirectory}`, 'diff', '--no-ext-diff', '--unified=0', 'HEAD', '--', ...files],
  { encoding: 'utf8' }
);

const findings = [];
let currentFile = '';

for (const line of diff.split(/\r?\n/)) {
  if (line.startsWith('+++ b/')) {
    currentFile = line.slice(6);
    continue;
  }
  if (!line.startsWith('+') || line.startsWith('+++')) continue;

  const source = line.slice(1).trim();
  if (!source || source.startsWith('/*') || source.startsWith('*')) continue;

  if (currentFile === 'arena-designer.html' && /\bstyle\s*=/i.test(source)) {
    findings.push({ file: currentFile, type: 'inline style', source });
    continue;
  }

  if (currentFile !== 'arena-designer.css') continue;
  if (source.startsWith('--')) continue;

  if (/(?:#[0-9a-f]{3,8}\b|rgba?\(|hsla?\()/i.test(source)) {
    findings.push({ file: currentFile, type: 'direct colour', source });
  }

  const hasLiteralSpacing = /\b(?:margin(?:-(?:top|right|bottom|left))?|padding(?:-(?:top|right|bottom|left))?|gap|(?:inset|top|right|bottom|left)(?:-(?:top|right|bottom|left))?)\s*:\s*[^;]*(?:\d+(?:\.\d+)?(?:px|rem|em|vw|vh|%))/i.test(source);
  if (hasLiteralSpacing) {
    findings.push({ file: currentFile, type: 'literal spacing', source });
  }
}

if (findings.length) {
  console.error('Design-system audit failed. Use semantic tokens or a documented utility class instead:');
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.type}: ${finding.source}`);
  }
  process.exitCode = 1;
} else {
  console.log('Design-system audit passed: no new direct UI colours, literal spacing, or inline styles.');
}
