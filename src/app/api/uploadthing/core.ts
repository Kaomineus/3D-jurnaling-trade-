import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const f = createUploadthing();

export const ourFileRouter = {
  tradeImage: f({
    image: { maxFileSize: "4MB", maxFileCount: 3 },
  })
    .middleware(async ({ req }) => {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // File is uploaded to Uploadthing cloud.
      // We'll save the URL to our database from the client side
      // so that we can associate it with a tradeId even for new trades.
      console.log("Upload complete:", file.url);
      return { uploadedUrl: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
