import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { logServerAccess, logActivity, logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const allowedTypes = ["house", "delivery"];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ message: "Invalid upload type" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    if (token) {
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "IMAGE_UPLOADED",
        details: `Uploaded ${type} image: ${file.name}`,
      });
    }

    return NextResponse.json(
      { message: "File uploaded successfully", url: dataUrl },
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
