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
    const u = new URL(url);
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(
      url,
      {
        method: "POST",
        headers,
        rejectUnauthorized: true,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`iimg.live upload failed (${res.statusCode}): ${data.substring(0, 500)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

export async function uploadToIimgLive(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const apiKey = process.env.IIMG_LIVE_API_KEY;
  if (!apiKey) {
    throw new Error("IIMG_LIVE_API_KEY is not configured");
  }

  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).slice(2, 18);
  const body = multipartBody(buffer, filename, boundary);

  const responseText = await httpsPost("https://api.iimg.live/upload", {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
  }, body);

  const data = JSON.parse(responseText);
  if (!data.success || !data.url) {
    throw new Error("iimg.live returned unexpected response");
  }

  return data.url;
}
