import { NextRequest, NextResponse } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { logServerAccess, logError } from "@/lib/logger";
import sharp from "sharp";

export const runtime = "nodejs";

async function ocrSpace(buffer: Buffer, apiKey: string): Promise<string> {
  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).slice(2, 18);
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="scan.webp"\r\nContent-Type: image/webp\r\n\r\n`;
  const footer = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\neng\r\n--${boundary}\r\nContent-Disposition: form-data; name="OCREngine"\r\n\r\n2\r\n--${boundary}\r\nContent-Disposition: form-data; name="scale"\r\n\r\ntrue\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([Buffer.from(header), buffer, Buffer.from(footer)]);

  const responseText = await new Promise<string>((resolve, reject) => {
    const https = require("https");
    const req = https.request("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
      rejectUnauthorized: true,
    }, (res: any) => {
      let data = "";
      res.on("data", (chunk: string) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });

  const parsed = JSON.parse(responseText);
  if (parsed.OCRExitCode !== 1) {
    throw new Error(parsed.ErrorMessage?.[0] || parsed.ErrorMessage || "OCR failed");
  }
  return (parsed.ParsedResults?.[0]?.ParsedText || "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ message: "No image uploaded" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        message: "OCR.space API key not configured. Add OCR_SPACE_API_KEY to .env (free at ocr.space)",
      }, { status: 400 });
    }

    const webpBuffer = await sharp(buffer).webp({ quality: 85 }).toBuffer();
    const text = await ocrSpace(webpBuffer, apiKey);

    return NextResponse.json({ text }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await logError({
      errorName: "ScanError",
      errorMessage: msg,
    });
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
