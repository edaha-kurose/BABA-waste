import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';

// ============================================================================
// Zodバリデーションスキーマ
// ============================================================================

const CreateReportSchema = z.object({
  fiscal_year: z.number().int().min(2000).max(2100),
  report_type: z.string().min(1).max(50),
  report_period_from: z.string().datetime(),
  report_period_to: z.string().datetime(),
  notes: z.string().optional(),
});

const UpdateReportSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED']).optional(),
  report_file_url: z.string().url().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// GET: 年間報告書一覧取得
// ============================================================================

export async function GET(request: NextRequest) {
  // 1. 認証チェック
  const user = await getAuthenticatedUser(request);
  if (!user || !user.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fiscal_year = searchParams.get('fiscal_year');
  const status = searchParams.get('status');

  // 2. データ取得
  let reports;
  try {
    reports = await prisma.annual_waste_reports.findMany({
      where: {
        org_id: user.org_id,
        deleted_at: null,
        ...(fiscal_year && { fiscal_year: parseInt(fiscal_year) }),
        ...(status && { status }),
      },
      include: {
        items: {
          where: { deleted_at: null },
          include: {
            store: true,
            collector: true,
            waste_type: true,
          },
        },
      },
      orderBy: {
        fiscal_year: 'desc',
      },
    });
  } catch (dbError) {
    console.error('[GET /api/annual-waste-reports] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json(reports);
}

// ============================================================================
// POST: 年間報告書作成
// ============================================================================

export async function POST(request: NextRequest) {
  // 1. 認証チェック
  const user = await getAuthenticatedUser(request);
  if (!user || !user.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. JSONパース
  let body;
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json(
      { error: '不正なJSONフォーマットです' },
      { status: 400 }
    );
  }
  
  // 3. Zodバリデーション
  let validatedData;
  try {
    validatedData = CreateReportSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: '不正なリクエストデータです' }, { status: 400 });
  }

  // 4. 重複チェック
  let existingReport;
  try {
    existingReport = await prisma.annual_waste_reports.findFirst({
      where: {
        org_id: user.org_id,
        fiscal_year: validatedData.fiscal_year,
        report_type: validatedData.report_type,
        deleted_at: null,
      },
    });
  } catch (dbError) {
    console.error('[POST /api/annual-waste-reports] 重複チェックエラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (existingReport) {
    return NextResponse.json(
      { error: '同一年度・同一タイプの報告書が既に存在します' },
      { status: 400 }
    );
  }

  // 5. 報告書作成
  let report;
  try {
    report = await prisma.annual_waste_reports.create({
      data: {
        org_id: user.org_id,
        fiscal_year: validatedData.fiscal_year,
        report_type: validatedData.report_type,
        report_period_from: new Date(validatedData.report_period_from),
        report_period_to: new Date(validatedData.report_period_to),
        status: 'DRAFT',
        notes: validatedData.notes,
        created_by: user.id,
      },
      include: {
        items: true,
      },
    });
  } catch (dbError) {
    console.error('[POST /api/annual-waste-reports] Prisma作成エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json(report, { status: 201 });
}



