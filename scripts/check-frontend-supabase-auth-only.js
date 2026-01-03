#!/usr/bin/env node
/*
  Frontend Supabase usage guardrail
  =================================

  Goal: ensure Supabase JS client is used ONLY for authentication flows on the frontend.

  This script scans apps/*-web/src and fails if it finds:
    - supabase.from(...)
    - supabase.rpc(...)
    - supabase.storage.*
    - supabase.functions.*
    - supabase.channel(...)/realtime usage
    - service_role keys or references
    - any "supabase." access that isn't "supabase.auth."

  Allowed:
    - createClient(...) ONLY inside apps/<app>-web/src/lib/supabase/client.(ts|tsx|js|jsx)
    - supabase.auth.* usage anywhere

  Usage:
    node scripts/check-frontend-supabase-auth-only.js

  Exit codes:
    0 = OK
    1 = Violations found
*/

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const appsDir = path.join(repoRoot, 'apps');

const isCodeFile = (filePath) => /\.(ts|tsx|js|jsx)$/.test(filePath);

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip common large dirs
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist' || entry.name === 'build') {
        continue;
      }
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function isSupabaseClientFactoryFile(filePath) {
  const normalized = filePath.split(path.sep).join('/');
  return /\/lib\/supabase\/client\.(ts|tsx|js|jsx)$/.test(normalized);
}

function findWebApps() {
  if (!fs.existsSync(appsDir)) return [];
  const entries = fs.readdirSync(appsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && /-web$/.test(e.name))
    .map((e) => path.join(appsDir, e.name));
}

function analyzeFile(filePath, content) {
  const violations = [];

  const normalizedPath = filePath.split(path.sep).join('/');
  const lines = content.split(/\r?\n/);

  const inEnvSchema = /\/src\/config\/env\.(ts|tsx|js|jsx)$/.test(normalizedPath);

  // Simple line-by-line checks for better error reporting
  let inBlockComment = false;
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    // Track /* */ block comments (best-effort; good enough for guardrail)
    if (!inBlockComment && trimmed.includes('/*')) {
      inBlockComment = true;
    }

    const isLineCommented = inBlockComment || trimmed.startsWith('//');
    if (isLineCommented) {
      if (inBlockComment && trimmed.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    // Service role keys should never appear in frontend code.
    // Allow defensive validation patterns/messages inside env schema files.
    if (/service_role|SUPABASE_SERVICE_ROLE/i.test(line)) {
      const looksLikeValidationOnly =
        inEnvSchema &&
        (
          line.includes("includes('service_role')") ||
          line.includes('includes("service_role")') ||
          /\/SERVICE_ROLE\/i/.test(line) ||
          /\/SUPABASE_SERVICE_ROLE\/i/.test(line) ||
          /forbidden/i.test(line)
        );

      if (looksLikeValidationOnly) {
        if (trimmed.includes('*/')) inBlockComment = false;
        continue;
      }

      violations.push({
        filePath: normalizedPath,
        lineNo,
        rule: 'service_role_forbidden',
        snippet: trimmed,
      });
    }

    // Realtime / Postgres changes usage is forbidden in the "auth-only" posture
    // Avoid matching URLs like "foo.supabase.co"
    if (
      /(^|[^\w$.])supabase\s*\.\s*channel\s*\(/.test(line) ||
      /(^|[^\w$.])supabase\s*\.\s*removeChannel\s*\(/.test(line)
    ) {
      violations.push({
        filePath: normalizedPath,
        lineNo,
        rule: 'realtime_forbidden',
        snippet: trimmed,
      });
    }

    // DB / RPC / storage / functions are forbidden
    if (
      /(^|[^\w$.])supabase\s*\.\s*from\s*\(/.test(line) ||
      /(^|[^\w$.])supabase\s*\.\s*rpc\s*\(/.test(line) ||
      /(^|[^\w$.])supabase\s*\.\s*storage\b/.test(line) ||
      /(^|[^\w$.])supabase\s*\.\s*functions\b/.test(line) ||
      // Also catch chained calls split across lines: `supabase\n  .from(...)`
      // This is intentionally strict for an architecture guardrail.
      (/\.from\s*\(/.test(line) && !/\b(Array|Object)\.from\b/.test(line)) ||
      /\.rpc\s*\(/.test(line) ||
      /\.storage\b/.test(line) ||
      /\.functions\b/.test(line)
    ) {
      violations.push({
        filePath: normalizedPath,
        lineNo,
        rule: 'data_access_forbidden',
        snippet: trimmed,
      });
    }

    // Any supabase.* usage that isn't auth is forbidden
    // This catches things like supabase.from, supabase.realtime, supabase.storage, etc.
    if (
      /(^|[^\w$.])supabase\s*\./.test(line) &&
      !/(^|[^\w$.])supabase\s*\.\s*auth\s*\./.test(line)
    ) {
      // Exclude the cases already captured above to avoid duplicate messages
      const alreadyFlagged = violations.some((v) => v.filePath === normalizedPath && v.lineNo === lineNo);
      if (!alreadyFlagged) {
        violations.push({
          filePath: normalizedPath,
          lineNo,
          rule: 'supabase_non_auth_forbidden',
          snippet: trimmed,
        });
      }
    }

    // createClient should only exist in the canonical supabase client module
    if (/\bcreateClient\s*\(/.test(line) || /@supabase\/supabase-js/.test(line)) {
      if (!isSupabaseClientFactoryFile(filePath)) {
        violations.push({
          filePath: normalizedPath,
          lineNo,
          rule: 'supabase_client_factory_outside_client_module',
          snippet: trimmed,
        });
      }
    }

    if (inBlockComment && trimmed.includes('*/')) {
      inBlockComment = false;
    }
  }

  return violations;
}

function main() {
  const appDirs = findWebApps();
  const violations = [];

  for (const appDir of appDirs) {
    const srcDir = path.join(appDir, 'src');
    if (!fs.existsSync(srcDir)) continue;

    const files = walk(srcDir).filter(isCodeFile);
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      violations.push(...analyzeFile(filePath, content));
    }
  }

  if (violations.length === 0) {
    process.stdout.write('OK: Frontend Supabase usage is auth-only.\n');
    process.exit(0);
  }

  // Group by file
  const byFile = new Map();
  for (const v of violations) {
    if (!byFile.has(v.filePath)) byFile.set(v.filePath, []);
    byFile.get(v.filePath).push(v);
  }

  process.stderr.write(`ERROR: Found ${violations.length} frontend Supabase usage violation(s).\n\n`);
  for (const [filePath, items] of byFile.entries()) {
    process.stderr.write(`${filePath}\n`);
    for (const v of items) {
      process.stderr.write(`  L${v.lineNo}  ${v.rule}  ${v.snippet}\n`);
    }
    process.stderr.write('\n');
  }

  process.stderr.write(
    'Fix: Remove Supabase DB/RPC/storage/realtime usage from frontend. ' +
      'Route all data through the API Gateway / backend services, and keep Supabase JS client for auth only.\n'
  );
  process.exit(1);
}

main();
