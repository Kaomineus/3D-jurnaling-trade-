import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const trade = await prisma.trade.findFirst({
      where: { id, userId: session.user.id },
      include: { images: true },
    });

    if (!trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...trade,
      tags: JSON.parse(trade.tags),
      entryDate: trade.entryDate.toISOString(),
      exitDate: trade.exitDate?.toISOString() || null,
      createdAt: trade.createdAt.toISOString(),
      updatedAt: trade.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching trade:", error);
    return NextResponse.json(
      { error: "Failed to fetch trade" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.trade.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    const body = await req.json();
    const trade = await prisma.trade.update({
      where: { id },
      data: {
        symbol: body.symbol?.toUpperCase(),
        type: body.type,
        entryDate: body.entryDate ? new Date(body.entryDate) : undefined,
        exitDate: body.exitDate ? new Date(body.exitDate) : null,
        entryPrice: body.entryPrice ? parseFloat(body.entryPrice) : undefined,
        exitPrice: body.exitPrice ? parseFloat(body.exitPrice) : null,
        size: body.size ? parseFloat(body.size) : undefined,
        sl: body.sl ? parseFloat(body.sl) : null,
        tp: body.tp ? parseFloat(body.tp) : null,
        notes: body.notes ?? undefined,
        mood: body.mood ?? null,
        tags: body.tags ? JSON.stringify(body.tags) : undefined,
        commission: body.commission ? parseFloat(body.commission) : 0,
      },
      include: { images: true },
    });

    return NextResponse.json({
      ...trade,
      tags: JSON.parse(trade.tags),
      entryDate: trade.entryDate.toISOString(),
      exitDate: trade.exitDate?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error updating trade:", error);
    return NextResponse.json(
      { error: "Failed to update trade" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.trade.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    await prisma.trade.delete({ where: { id } });

    return NextResponse.json({ message: "Trade deleted" });
  } catch (error) {
    console.error("Error deleting trade:", error);
    return NextResponse.json(
      { error: "Failed to delete trade" },
      { status: 500 }
    );
  }
}
