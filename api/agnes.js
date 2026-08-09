export const runtime = "edge";

const AUTH_TOKEN = process.env.PROXY_KEY;
const TARGET_HOST = "https://apihub.agnes-ai.com";

export default async function handler(req) {
  const incomingUrl = new URL(req.url);

  // ======================
  // 1. 简单鉴权（通过 ?key=xxx 传参）
  // ======================
  const key = incomingUrl.searchParams.get("key");
  if (!key || key !== AUTH_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: { "content-type": "application/json" },
      }
    );
  }

  // ======================
  // 2. 构造目标 URL
  // ======================
  // 去掉路径前缀 /api/agnes，保留剩余路径
  const targetPath = incomingUrl.pathname.replace(/^\/api\/agnes/, "");
  // 去掉鉴权用的 key 参数，保留其他查询参数
  const params = new URLSearchParams(incomingUrl.search);
  params.delete("key");
  const queryString = params.toString();
  const targetUrl =
    TARGET_HOST + targetPath + (queryString ? `?${queryString}` : "");

  // ======================
  // 3. 处理请求头（移除 hop‑by‑hop 头）
  // ======================
  const headers = new Headers();
  for (const [k, v] of req.headers.entries()) {
    const lowerK = k.toLowerCase();
    if (
      lowerK === "host" ||
      lowerK === "connection" ||
      lowerK === "keep-alive" ||
      lowerK === "transfer-encoding" ||
      lowerK === "upgrade"
    ) {
      continue;
    }
    headers.set(k, v);
  }

  // ======================
  // 4. 发起上游请求并返回
  // ======================
  const body = req.method === "GET" || req.method === "HEAD"
    ? undefined
    : req.body;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: "follow",
    });

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: upstreamRes.headers,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Bad Gateway", details: error.message }),
      {
        status: 502,
        headers: { "content-type": "application/json" },
      }
    );
  }
}