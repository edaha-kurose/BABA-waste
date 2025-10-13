// tools/orchestrator/src/index.ts — v3.2
import { promises as fs } from 'node:fs';
import path from 'node:path';

async function main() {
  const root = process.cwd();
  const runbookDir = path.join(root, 'docs', 'runbooks');
  const incidentDir = path.join(runbookDir, 'incidents');
  await fs.mkdir(incidentDir, { recursive: true });

  // Build runbook index
  const files = (await fs.readdir(runbookDir)).filter(f => f.endsWith('.md') && !f.startsWith('_'));
  const indexPath = path.join(runbookDir, '_index.md');
  const rows = files.sort().map(f => `- [${f}](./${f})`).join('\n');
  const md = `# Runbook Index\n\n${rows}\n`;
  await fs.writeFile(indexPath, md, 'utf-8');

  // If env indicates schema impact, create an incident stub
  const tbl = process.env.SCHEMA_IMPACT_TABLE;
  if (tbl) {
    const col = process.env.SCHEMA_IMPACT_COLUMN || '(table)';
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const fname = path.join(incidentDir, `incident_${ts}.md`);
    const body = `# Incident — Schema Impact\n\n- table: ${tbl}\n- column: ${col}\n- risk: (fill after running schema:impact)\n- actions:\n  - [ ] impact analyzed\n  - [ ] mitigation plan\n  - [ ] tests added\n`;
    await fs.writeFile(fname, body, 'utf-8');
    process.stdout.write(`Incident stub created: ${path.relative(root, fname)}\n`);
  }

  process.stdout.write('Runbook index refreshed.\n');
}

main().catch(err => { console.error(err); process.exit(1); });
