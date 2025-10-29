/**
 * 組織ごとのアクティブ収集業者数を一覧表示
 * 実行: pnpm tsx scripts/find-org-collector-counts.ts
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  const orgs = await prisma.organizations.findMany({
    where: { deleted_at: null },
    select: { id: true, name: true },
  })

  for (const org of orgs) {
    const c = await prisma.collectors.count({ where: { org_id: org.id, is_active: true, deleted_at: null } })
    console.log(`${org.id}\t${c}\t${org.name}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })

