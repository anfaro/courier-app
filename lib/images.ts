import https from "https";
import http from "http";

function multipartBody(buffer: Buffer, filename: string, boundary: string): Buffer {
  const header = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="image"; filename="${filename}"`,
    "Content-Type: image/webp",
    "",
  ].join("\r\n");
  const footer = `\r\n--${boundary}--\r\n`;
  return Buffer.concat([Buffer.from(header), buffer, Buffer.from(footer)]);
}

function httpsPost(url: string, headers: Record<string, string>, body: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.request(url, { method: "POST", headers, rejectUnauthorized: true }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Upload failed (${res.statusCode}): ${data.substring(0, 500)}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function isCloudflareChallenge(text: string): boolean {
  return text.includes("Just a moment") && text.includes("cloudflare");
}

async function uploadToImgBB(buffer: Buffer, filename: string): Promise<string> {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) throw new Error("IMGBB_API_KEY is not configured");

  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).slice(2, 18);
  const body = multipartBody(buffer, filename, boundary);

  const responseText = await httpsPost(
    `https://api.imgbb.com/1/upload?key=${apiKey}`,
    {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
    body
  );

  const data = JSON.parse(responseText);
  if (!data?.data?.url) throw new Error("imgBB returned unexpected response");
  return data.data.url;
}

async function uploadToIimgLive(buffer: Buffer, filename: string): Promise<string> {
  const apiKey = process.env.IIMG_LIVE_API_KEY;
  if (!apiKey) throw new Error("IIMG_LIVE_API_KEY is not configured");

  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).slice(2, 18);
  const body = multipartBody(buffer, filename, boundary);

  const responseText = await httpsPost("https://api.iimg.live/upload", {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
  }, body);

  const data = JSON.parse(responseText);
  if (!data.success || !data.url) throw new Error("iimg.live returned unexpected response");
  return data.url;
}

export async function uploadImage(buffer: Buffer, filename: string): Promise<string> {
  // Try imgBB first (no Cloudflare, works from Vercel)
  if (process.env.IMGBB_API_KEY) {
    try {
      return await uploadToImgBB(buffer, filename);
    } catch (e) {
      if (e instanceof Error && isCloudflareChallenge(e.message)) {
        throw e;
      }
      // If imgBB fails, fall through to iimg.live
      console.warn("imgBB upload failed, falling back to iimg.live:", e);
    }
  }

  // Fall back to iimg.live
  return await uploadToIimgLive(buffer, filename);
}
