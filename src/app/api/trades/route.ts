import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const symbol = searchParams.get("symbol");
  const type = searchParams.get("type");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const tag = searchParams.get("tag");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  const where: Record<string, unknown> = { userId: session.user.id };

  if (symbol) where.symbol = { contains: symbol };
  if (type) where.type = type;
  if (tag) where.tags = { contains: tag };
  if (startDate || endDate) {
    where.entryDate = {} as Record<string, Date>;
    if (startDate) (where.entryDate as Record<string, Date>).gte = new Date(startDate);
    if (endDate) (where.entryDate as Record<string, Date>).lte = new Date(endDate);
  }

  const orderBy: Record<string, string> = {
    [sortBy]: sortOrder,
  };

  try {
    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: { images: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.trade.count({ where }),
    ]);

    const formatted = trades.map((trade: (typeof trades)[0]) => ({
      ...trade,
      tags: JSON.parse(trade.tags),
      entryDate: trade.entryDate.toISOString(),
      exitDate: trade.exitDate?.toISOString() || null,
      createdAt: trade.createdAt.toISOString(),
      updatedAt: trade.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      trades: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching trades:", error);
    return NextResponse.json(
      { error: "Failed to fetch trades" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const trade = await prisma.trade.create({
      data: {
        userId: session.user.id,
        symbol: body.symbol.toUpperCase(),
        type: body.type,
        entryDate: new Date(body.entryDate),
        exitDate: body.exitDate ? new Date(body.exitDate) : null,
        entryPrice: parseFloat(body.entryPrice),
        exitPrice: body.exitPrice ? parseFloat(body.exitPrice) : null,
        size: parseFloat(body.size),
        sl: body.sl ? parseFloat(body.sl) : null,
        tp: body.tp ? parseFloat(body.tp) : null,
        notes: body.notes || null,
        mood: body.mood || null,
        tags: JSON.stringify(body.tags || []),
        commission: body.commission ? parseFloat(body.commission) : 0,
        images: body.imageIds?.length
          ? { connect: body.imageIds.map((id: string) => ({ id })) }
          : undefined,
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
    console.error("Error creating trade:", error);
    return NextResponse.json(
      { error: "Failed to create trade" },
      { status: 500 }
    );
  }
}
