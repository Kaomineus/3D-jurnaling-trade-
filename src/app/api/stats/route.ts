import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const trades = await prisma.trade.findMany({
      where: { userId: session.user.id },
      include: { images: true },
      orderBy: { entryDate: "desc" },
    });

    const totalTrades = trades.length;
    const closedTrades = trades.filter(
      (t: (typeof trades)[0]) => t.exitPrice !== null
    );
    const winningTrades = closedTrades.filter(
      (t: (typeof closedTrades)[0]) => {
        const pl =
          t.type === "LONG"
            ? (t.exitPrice! - t.entryPrice) * t.size
            : (t.entryPrice - t.exitPrice!) * t.size;
        return pl > 0;
      }
    );

    const winRate = closedTrades.length > 0
      ? (winningTrades.length / closedTrades.length) * 100
      : 0;

    let totalProfit = 0;
    let totalLoss = 0;
    let totalRR = 0;
    let bestTrade = 0;
    let worstTrade = 0;

    const plData: { date: string; pl: number }[] = [];
    let cumulativeEquity = 0;
    const equityCurve: { date: string; equity: number }[] = [];
    const plDistribution: Record<string, number> = {};

    for (const trade of closedTrades) {
      const pl =
        trade.type === "LONG"
          ? (trade.exitPrice! - trade.entryPrice) * trade.size
          : (trade.entryPrice - trade.exitPrice!) * trade.size;

      const adjPL = pl - (trade.commission || 0);
      plData.push({ date: trade.exitDate?.toISOString() || "", pl: adjPL });

      if (adjPL > 0) {
        totalProfit += adjPL;
        if (adjPL > bestTrade) bestTrade = adjPL;
      } else {
        totalLoss += Math.abs(adjPL);
        if (adjPL < worstTrade) worstTrade = adjPL;
      }

      if (trade.sl && trade.tp) {
        const risk = Math.abs(trade.entryPrice - trade.sl) * trade.size;
        const reward = Math.abs(trade.tp - trade.entryPrice) * trade.size;
        if (risk > 0) totalRR += reward / risk;
      }

      cumulativeEquity += adjPL;
      equityCurve.push({
        date: trade.exitDate?.toISOString().split("T")[0] || "",
        equity: cumulativeEquity,
      });

      // Distribution
      const range = Math.floor(adjPL / 100) * 100;
      const key = `${range}-${range + 100}`;
      plDistribution[key] = (plDistribution[key] || 0) + 1;
    }

    // Sort equity curve by date
    equityCurve.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const avgRR = closedTrades.length > 0 ? totalRR / closedTrades.length : 0;

    const recentTrades = trades.slice(0, 10).map((trade: (typeof trades)[0]) => ({
      ...trade,
      tags: JSON.parse(trade.tags),
      entryDate: trade.entryDate.toISOString(),
      exitDate: trade.exitDate?.toISOString() || null,
    }));

    return NextResponse.json({
      totalTrades,
      winRate: parseFloat(winRate.toFixed(1)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      totalLoss: parseFloat(totalLoss.toFixed(2)),
      netProfit: parseFloat((totalProfit - totalLoss).toFixed(2)),
      avgRR: parseFloat(avgRR.toFixed(2)),
      bestTrade: parseFloat(bestTrade.toFixed(2)),
      worstTrade: parseFloat(worstTrade.toFixed(2)),
      recentTrades,
      equityCurve,
      plDistribution: Object.entries(plDistribution).map(([range, count]) => ({
        range,
        count,
      })),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
