// app/api/upload/route.ts
import { NextResponse, NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getToken } from "next-auth/jwt";
import { logServerAccess, logActivity, logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    
    // 1. Grab the form data (which contains the file)
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // 'house' or 'delivery'

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    // 2. Convert the file into a Node.js Buffer so we can save it
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. Determine the correct folder based on the type
    let folderPath = "";
    if (type === "house") {
      folderPath = "static/uploaded_images/house_image";
    } else if (type === "delivery") {
      folderPath = "static/uploaded_images/proof-of-deliveries";
    } else {
      return NextResponse.json({ message: "Invalid upload type" }, { status: 400 });
    }

    // 4. Create the absolute path to the public folder
    const uploadDir = path.join(process.cwd(), "public", folderPath);

    // 5. Make sure the folder exists
    await mkdir(uploadDir, { recursive: true });

    // 6. Create a unique filename
    const uniqueFilename = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    // 7. Write the file
    await writeFile(filePath, buffer);

    // 8. Return the public URL
    const publicUrl = `/${folderPath}/${uniqueFilename}`;

    // Log the upload
    if (token) {
        await logActivity({
          userId: token.id as string,
          userName: token.name as string,
          action: "DELIVERY_UPDATED", // Generic update log
          details: `Uploaded ${type} image: ${file.name}`,
        });
    }

    return NextResponse.json(
      { message: "File uploaded successfully", url: publicUrl },
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
