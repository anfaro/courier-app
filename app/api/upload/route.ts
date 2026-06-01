import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { logServerAccess, logActivity, logError } from "@/lib/logger";
import { uploadImage } from "@/lib/images";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await logServerAccess(req, token);

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = file.name.replace(/\.[^.]+$/, ".webp");

    const url = await uploadImage(buffer, filename);

    if (token) {
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "IMAGE_UPLOADED",
        details: `Uploaded image: ${filename}`,
      });
    }

    return NextResponse.json(
      { message: "File uploaded successfully", url },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logError({
      errorName: "UploadError",
      errorMessage,
    });
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
