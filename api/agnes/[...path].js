export const runtime = "edge";


const AUTH_TOKEN = process.env.PROXY_KEY;


export default async function handler(req) {


  return new Response(
    JSON.stringify({
      hit: true,
      url: req.url,
      method: req.method
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json"
      }
    }
  );



  const incomingUrl = new URL(req.url);


  // ======================
  // 简单鉴权
  // ======================

  const key =
    incomingUrl.searchParams.get("key");


  if (!key || key !== AUTH_TOKEN) {

    return new Response(
      JSON.stringify({
        error: "Unauthorized"
      }),
      {
        status: 401,
        headers:{
          "content-type":"application/json"
        }
      }
    );

  }



  // ======================
  // reverse proxy
  // ======================


  const targetHost =
    "https://apihub.agnes-ai.com";


  const targetUrl =
    targetHost +
    incomingUrl.pathname.replace(
      /^\/api\/agnes/,
      ""
    )
    +
    // 注意：不要把 token 转发给 agnes
    (() => {

      const params =
        new URLSearchParams(
          incomingUrl.search
        );

      params.delete("key");

      const q =
        params.toString();

      return q ? `?${q}` : "";

    })();


    console.log("targetUrl:", targetUrl);



  const headers =
    new Headers();


  for (const [key,value]
       of req.headers.entries()) {


    const k =
      key.toLowerCase();


    if(
      k === "host" ||
      k === "connection" ||
      k === "keep-alive" ||
      k === "transfer-encoding" ||
      k === "upgrade"
    ){
      continue;
    }


    headers.set(
      key,
      value
    );

  }



  const response =
    await fetch(
      targetUrl,
      {
        method:req.method,

        headers,

        body:
          req.method === "GET" ||
          req.method === "HEAD"
            ? undefined
            : req.body
      }
    );



  return new Response(
    response.body,
    {
      status:response.status,
      headers:response.headers
    }
  );

}