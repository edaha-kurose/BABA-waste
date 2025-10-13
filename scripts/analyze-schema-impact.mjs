#!/usr/bin/env node
/**
 * analyze-schema-impact.mjs — v3.2
 * Usage: node scripts/analyze-schema-impact.mjs --table <name> [--column <name>] [--dir .]
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const get = (k, d=null) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i+1] : d;
};

const table = get('--table');
const column = get('--column', null);
const root = get('--dir', process.cwd());

if (!table) {
  console.error('Error: --table is required');
  process.exit(2);
}

const exts = ['.ts', '.tsx', '.js', '.jsx', '.sql', '.md'];
const targets = ['app', 'src', 'services', 'scripts', 'prisma', 'contracts', 'docs'];

function listFiles(dir) {
  let res = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
      res = res.concat(listFiles(p));
    } else {
      if (exts.includes(path.extname(entry.name))) res.push(p);
    }
  }
  return res;
}

function analyze() {
  const files = [];
  for (const t of targets) {
    const p = path.join(root, t);
    if (fs.existsSync(p)) files.push(...listFiles(p));
  }
  const hits = [];
  const tableRe = new RegExp(`\\b${table}\\b`, 'i');
  const columnRe = column ? new RegExp(`\\b${column}\\b`, 'i') : null;

  for (const f of files) {
    const txt = fs.readFileSync(f, 'utf-8');
    if (!tableRe.test(txt)) continue;
    if (columnRe && !columnRe.test(txt)) continue;
    // collect line numbers
    const lines = txt.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (tableRe.test(line) && (!columnRe || columnRe.test(line))) {
        hits.push({ file: path.relative(root, f), line: i+1, excerpt: line.trim().slice(0, 160) });
      }
    });
  }

  const usageCount = hits.length;
  let level = 'LOW';
  if (usageCount >= 10) level = 'CRITICAL';
  else if (usageCount >= 5) level = 'HIGH';
  else if (usageCount >= 2) level = 'MEDIUM';

  console.log('================================================================================');
  console.log('📊 スキーマ影響範囲分析レポート');
  console.log('================================================================================');
  console.log(`📋 対象テーブル: ${table}`);
  console.log(`📋 対象カラム: ${column ?? '(表全体)'}`);
  console.log(`🚦 リスクレベル: ${level}`);
  console.log('');
  const recommendation = {
    LOW: 'LOW: 使用箇所が少ない。比較的安全に変更可能。',
    MEDIUM: 'MEDIUM: 影響箇所を確認してから変更。',
    HIGH: 'HIGH: 十分なテストが必要。段階移行を検討。',
    CRITICAL: 'CRITICAL: 段階的な移行計画が必須。互換カラム/ビューで下位互換提供を検討。'
  }[level];
  console.log(`💡 推奨事項: ${recommendation}`);
  console.log('');
  if (hits.length) {
    console.log('📍 使用箇所:');
    for (const h of hits.slice(0, 200)) {
      console.log(`- ${h.file}:${h.line} :: ${h.excerpt}`);
    }
    if (hits.length > 200) console.log(`... (+${hits.length - 200} more)`);
  } else {
    console.log('✅ 使用箇所は見つかりませんでした。');
  }
  console.log('================================================================================');

  if (['HIGH', 'CRITICAL'].includes(level)) {
    process.exitCode = 3;
  }
}

analyze();
