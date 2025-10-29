import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { z } from 'zod'

const queueEmailSchema = z.object({
  to_email: z.string().email(),
  to_name: z.string(),
  subject: z.string(),
  body_html: z.string(),
  body_text: z.string().optional(),
  template_type: z.enum(['NOTIFICATION', 'REMINDER', 'ESCALATION', 'REPORT']),
  related_entity_type: z.string().optional(),
  related_entity_id: z.string().uuid().optional(),
  priority: z.number().min(1).max(5).optional().default(3),
  scheduled_at: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // JSON パースエラーハンドリング
    let json;
    try {
      json = await request.json();
    } catch (parseError) {
      console.error('[Email Queue] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validatedData = queueEmailSchema.parse(json)

    console.log('[Email Queue] キュー登録:', {
      to: validatedData.to_email,
      subject: validatedData.subject,
      template_type: validatedData.template_type,
    })

    // キューに登録
    let queueItem;
    try {
      queueItem = await prisma.email_queue.create({
        data: {
          org_id: user.org_id,
          to_email: validatedData.to_email,
          to_name: validatedData.to_name,
          subject: validatedData.subject,
          body_html: validatedData.body_html,
          body_text: validatedData.body_text || null,
          template_type: validatedData.template_type,
          related_entity_type: validatedData.related_entity_type || null,
          related_entity_id: validatedData.related_entity_id || null,
          status: 'PENDING',
          priority: validatedData.priority,
          scheduled_at: validatedData.scheduled_at
            ? new Date(validatedData.scheduled_at)
            : new Date(),
          retry_count: 0,
          max_retries: 3,
        },
      });
    } catch (dbError) {
      console.error('[Email Queue] Database error - queue creation:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    console.log('[Email Queue] ✅ キュー登録成功:', queueItem.id)

    return NextResponse.json({
      success: true,
      queue_id: queueItem.id,
      message: 'メール送信をキューに登録しました',
    })
  } catch (error) {
    console.error('[Email Queue API] Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: any = {
      org_id: user.org_id,
    }

    if (status) {
      where.status = status
    }

    let items, total;
    try {
      [items, total] = await Promise.all([
        prisma.email_queue.findMany({
          where,
          orderBy: [
            { priority: 'asc' },
            { scheduled_at: 'asc' },
          ],
          take: limit,
          skip: offset,
        }),
        prisma.email_queue.count({ where }),
      ]);
    } catch (dbError) {
      console.error('[Email Queue GET API] Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: items,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[Email Queue GET API] Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message },
      { status: 500 }
    )
  }
}

