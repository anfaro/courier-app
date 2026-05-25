import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { logServerAccess, logActivity, logError } from "@/lib/logger";
import { uploadToIimgLive } from "@/lib/images";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = file.name.replace(/\.[^.]+$/, ".webp");

    const url = await uploadToIimgLive(buffer, filename);

    if (token) {
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "IMAGE_UPLOADED",
        details: `Uploaded image to iimg.live: ${filename}`,
      });
    }

    return NextResponse.json(
      { message: "File uploaded successfully", url },
      { status: 201 }
    );
  } catch (error) {
    await logError({
      errorName: "UploadError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { message: "Failed to upload file" },
      { status: 500 }
    );
  }
}
