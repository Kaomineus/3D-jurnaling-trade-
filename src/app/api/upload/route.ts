import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url, tradeId } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Validate URL is from Uploadthing
    if (!url.includes("utfs.io") && !url.includes("uploadthing")) {
      return NextResponse.json({ error: "Invalid upload source" }, { status: 400 });
    }

    // Check trade limit if tradeId provided
    if (tradeId) {
      const trade = await prisma.trade.findFirst({
        where: { id: tradeId, userId: session.user.id },
        include: { images: true },
      });

      if (!trade) {
        return NextResponse.json({ error: "Trade not found" }, { status: 404 });
      }

      if (trade.images.length >= 3) {
        return NextResponse.json(
          { error: "Maksimal 3 gambar per trade" },
          { status: 400 }
        );
      }
    }

    // Save image record to database
    const image = await prisma.tradeImage.create({
      data: {
        tradeId: tradeId || "pending",
        url,
        thumbnailUrl: url,
      },
    });

    return NextResponse.json({
      id: image.id,
      url: image.url,
      thumbnailUrl: image.thumbnailUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan gambar" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { imageId } = await req.json();

    const image = await prisma.tradeImage.findUnique({
      where: { id: imageId },
      include: { trade: true },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    if (image.trade.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete database record (file stays on Uploadthing cloud)
    await prisma.tradeImage.delete({ where: { id: imageId } });

    return NextResponse.json({ message: "Image deleted" });
  } catch (error) {
    console.error("Delete image error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus gambar" },
      { status: 500 }
    );
  }
}
