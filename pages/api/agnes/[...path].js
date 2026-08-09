const AUTH_TOKEN = process.env.PROXY_KEY;
const TARGET_HOST = "https://apihub.agnes-ai.com";
const HOP_BY_HOP = new Set(["host", "connection", "keep-alive", "transfer-encoding", "upgrade"]);

function buildHeaders(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    const lowerKey = key.toLowerCase();
    if (HOP_BY_HOP.has(lowerKey)) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item));
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

export default async function handler(req, res) {
  const incomingUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const key = incomingUrl.searchParams.get("key");

  if (!key || key !== AUTH_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const params = new URLSearchParams(incomingUrl.search);
  params.delete("key");

  const targetPath = incomingUrl.pathname.replace(/^\/api\/agnes/, "") || "/";
  const targetUrl = `${TARGET_HOST}${targetPath}${params.toString() ? `?${params}` : ""}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: buildHeaders(req),
      body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
      redirect: "follow",
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => res.setHeader(key, value));
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    res.status(502).json({
      error: "Bad Gateway",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
