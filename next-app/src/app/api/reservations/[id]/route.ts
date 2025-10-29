// ============================================================================
// Reservations API - 単一リソース
// GET/PUT/DELETE /api/reservations/:id
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { reservationUpdateSchema } from '@/utils/validation/common'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reservation = await prisma.reservations.findUnique({
      where: {
        id: params.id,
        org_id: user.org_id,
        deleted_at: null,
      },
      include: {
        plans: {
          include: {
            stores: true,
            item_maps: true,
          },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    return NextResponse.json(reservation)
  } catch (error) {
    console.error('[Reservations API] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = reservationUpdateSchema.parse(body)

    const existing = await prisma.reservations.findUnique({
      where: {
        id: params.id,
        org_id: user.org_id,
        deleted_at: null,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const updated = await prisma.reservations.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        last_sent_at: validatedData.last_sent_at
          ? new Date(validatedData.last_sent_at)
          : undefined,
        updated_at: new Date(),
        updated_by: user.id,
      },
      include: {
        plans: {
          include: {
            stores: true,
            item_maps: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[Reservations API] PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await prisma.reservations.findUnique({
      where: {
        id: params.id,
        org_id: user.org_id,
        deleted_at: null,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    await prisma.reservations.update({
      where: { id: params.id },
      data: {
        deleted_at: new Date(),
        updated_by: user.id,
      },
    })

    return NextResponse.json({ message: 'Reservation deleted successfully' })
  } catch (error) {
    console.error('[Reservations API] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}







