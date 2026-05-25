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

  const res = await fetch("https://api.iimg.live/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iimg.live upload failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (!data.success || !data.url) {
    throw new Error("iimg.live returned unexpected response");
  }

  return data.url;
}
