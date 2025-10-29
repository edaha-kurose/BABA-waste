import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';

// ============================================================================
// Zodバリデーションスキーマ
// ============================================================================

const UpdateReportSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED']).optional(),
  report_file_url: z.string().url().optional(),
  notes: z.string().optional(),
  submitted_at: z.string().datetime().optional(),
  approved_at: z.string().datetime().optional(),
});

// ============================================================================
// GET: 年間報告書詳細取得
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser(request);
  if (!user || !user.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let report
  try {
    // Prisma経由でorg_id分離
    report = await prisma.annual_waste_reports.findFirst({
      where: {
        id: params.id,
        org_id: user.org_id,
        deleted_at: null,
      },
      include: {
        items: {
          where: { deleted_at: null },
          include: {
            store: {
              select: {
                id: true,
                store_code: true,
                name: true,
                address: true,
              },
            },
            collector: {
              select: {
                id: true,
                company_name: true,
                contact_person: true,
                phone: true,
              },
            },
            waste_type: {
              select: {
                id: true,
                waste_type_code: true,
                waste_type_name: true,
                unit_code: true,
                unit_price: true,
              },
            },
          },
          orderBy: [
            { store_id: 'asc' },
            { collector_id: 'asc' },
            { waste_type_id: 'asc' },
          ],
        },
      },
    });
  } catch (dbError) {
    console.error('[GET /api/annual-waste-reports/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!report) {
    return NextResponse.json(
      { error: '年間報告書が見つかりません' },
      { status: 404 }
    );
  }

  return NextResponse.json(report);
}

// ============================================================================
// PUT: 年間報告書更新
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser(request);
  if (!user || !user.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  try {
    // Zodバリデーション
    const validatedData = UpdateReportSchema.parse(body);

    // 存在確認（org_id分離）
    let existingReport
    try {
      existingReport = await prisma.annual_waste_reports.findFirst({
        where: {
          id: params.id,
          org_id: user.org_id,
          deleted_at: null,
        },
      });
    } catch (dbError) {
      console.error('[PUT /api/annual-waste-reports/[id]] Prisma検索エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    if (!existingReport) {
      return NextResponse.json(
        { error: '年間報告書が見つかりません' },
        { status: 404 }
      );
    }

    // ステータス変更時の検証
    if (validatedData.status === 'SUBMITTED' && !validatedData.submitted_at) {
      validatedData.submitted_at = new Date().toISOString();
    }
    if (validatedData.status === 'APPROVED' && !validatedData.approved_at) {
      validatedData.approved_at = new Date().toISOString();
    }

    // Prismaトランザクションで更新
    let report
    try {
      report = await prisma.annual_waste_reports.update({
        where: {
          id: params.id,
        },
        data: {
          status: validatedData.status,
          report_file_url: validatedData.report_file_url,
          notes: validatedData.notes,
          submitted_at: validatedData.submitted_at
            ? new Date(validatedData.submitted_at)
            : undefined,
          submitted_by: validatedData.status === 'SUBMITTED'
            ? user.id
            : undefined,
          approved_at: validatedData.approved_at
            ? new Date(validatedData.approved_at)
            : undefined,
          approved_by: validatedData.status === 'APPROVED'
            ? user.id
            : undefined,
          updated_by: user.id,
          updated_at: new Date(),
        },
        include: {
          items: {
            where: { deleted_at: null },
          },
        },
      });
    } catch (dbError) {
      console.error('[PUT /api/annual-waste-reports/[id]] Prisma更新エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('年間報告書更新エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE: 年間報告書削除（論理削除）
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser(request);
  if (!user || !user.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 存在確認（org_id分離）
  let existingReport
  try {
    existingReport = await prisma.annual_waste_reports.findFirst({
      where: {
        id: params.id,
        org_id: user.org_id,
        deleted_at: null,
      },
    });
  } catch (dbError) {
    console.error('[DELETE /api/annual-waste-reports/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!existingReport) {
    return NextResponse.json(
      { error: '年間報告書が見つかりません' },
      { status: 404 }
    );
  }

  // 提出済み・承認済みは削除不可
  if (existingReport.status === 'SUBMITTED' || existingReport.status === 'APPROVED') {
    return NextResponse.json(
      { error: '提出済み・承認済みの報告書は削除できません' },
      { status: 400 }
    );
  }

  // Prismaトランザクションで論理削除（カスケード）
  try {
    await prisma.$transaction(async (tx) => {
      // 明細も論理削除
      await tx.annual_waste_report_items.updateMany({
        where: { report_id: params.id },
        data: { deleted_at: new Date() },
      });

      // 親も論理削除
      await tx.annual_waste_reports.update({
        where: { id: params.id },
        data: { deleted_at: new Date() },
      });
    });
  } catch (dbError) {
    console.error('[DELETE /api/annual-waste-reports/[id]] Prismaトランザクションエラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: '削除しました' });
}
