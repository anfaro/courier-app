import https from "https";

const BUCKET = "courier-images";

function extractSupabaseUrl(): string | null {
  const envUrl = process.env.SUPABASE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;
  const match = dbUrl.match(/@([^.]+)\.pooler\.supabase\.com/);
  if (!match) return null;
  return `https://${match[1]}.supabase.co`;
}

export async function uploadImage(buffer: Buffer, filename: string): Promise<string> {
  const supabaseUrl = extractSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const url = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filename}`;
      const responseText = await new Promise<string>((resolve, reject) => {
        const req = https.request(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "image/webp",
            "Content-Length": buffer.length,
          },
          rejectUnauthorized: true,
        }, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
            } else {
              reject(new Error(`Supabase Storage upload failed (${res.statusCode}): ${data.substring(0, 500)}`));
            }
          });
        });
        req.on("error", reject);
        req.write(buffer);
        req.end();
      });
      const key = JSON.parse(responseText).Key;
      return `${supabaseUrl}/storage/v1/object/public/${key}`;
    } catch (e) {
      console.warn("Supabase Storage upload failed, falling back:", e);
    }
  }

  const imgbbKey = process.env.IMGBB_API_KEY;
  if (imgbbKey) {
    try {
      return await uploadToImgBB(buffer, filename);
    } catch (e) {
      console.warn("imgBB upload failed:", e);
    }
  }

  return await uploadToIimgLive(buffer, filename);
}

function uploadToImgBB(buffer: Buffer, filename: string): Promise<string> {
  const apiKey = process.env.IMGBB_API_KEY!;
  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).slice(2, 18);
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: image/webp\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([Buffer.from(header), buffer, Buffer.from(footer)]);

  return new Promise((resolve, reject) => {
    const req = https.request(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      rejectUnauthorized: true,
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          const d = JSON.parse(data);
          if (d?.data?.url) resolve(d.data.url);
          else reject(new Error("imgBB returned unexpected response"));
        } else {
          reject(new Error(`imgBB upload failed (${res.statusCode}): ${data.substring(0, 500)}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function uploadToIimgLive(buffer: Buffer, filename: string): Promise<string> {
  const apiKey = process.env.IIMG_LIVE_API_KEY;
  if (!apiKey) throw new Error("IIMG_LIVE_API_KEY is not configured");

  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).slice(2, 18);
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: image/webp\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([Buffer.from(header), buffer, Buffer.from(footer)]);

  const responseText = await new Promise<string>((resolve, reject) => {
    const req = https.request("https://api.iimg.live/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      rejectUnauthorized: true,
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`iimg.live upload failed (${res.statusCode}): ${data.substring(0, 500)}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });

  const data = JSON.parse(responseText);
  if (!data.success || !data.url) throw new Error("iimg.live returned unexpected response");
  return data.url;
}
