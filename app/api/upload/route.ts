// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
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
    // process.cwd() gets the root of your project
    const uploadDir = path.join(process.cwd(), "public", folderPath);

    // 5. Make sure the folder exists (recursive: true creates parent folders if missing)
    await mkdir(uploadDir, { recursive: true });

    // 6. Create a unique filename so files don't overwrite each other
    // e.g., 1700000000000-myphoto.jpg
    const uniqueFilename = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    // 7. Write the file to your hard drive (or Android phone storage)
    await writeFile(filePath, buffer);

    // 8. Return the public URL that Next.js can read
    const publicUrl = `/${folderPath}/${uniqueFilename}`;

    return NextResponse.json(
      { message: "File uploaded successfully", url: publicUrl },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { message: "Failed to upload file" },
      { status: 500 }
    );
  }
}

