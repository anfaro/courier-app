const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.ok || (res.status !== 403 && res.status !== 503)) return res;
    await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
  }
  return fetch(url, options);
}

export async function uploadToIimgLive(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const apiKey = process.env.IIMG_LIVE_API_KEY;
  if (!apiKey) {
    throw new Error("IIMG_LIVE_API_KEY is not configured");
  }

  const formData = new FormData();
  const blob = new Blob([buffer], { type: "image/webp" });
  formData.append("image", blob, filename);

  const res = await fetchWithRetry("https://api.iimg.live/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": UA,
      Accept: "application/json, text/plain, */*",
      Origin: "https://iimg.live",
      Referer: "https://iimg.live/",
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iimg.live upload failed (${res.status}): ${text.substring(0, 500)}`);
  }

  const data = await res.json();
  if (!data.success || !data.url) {
    throw new Error("iimg.live returned unexpected response");
  }

  return data.url;
}
