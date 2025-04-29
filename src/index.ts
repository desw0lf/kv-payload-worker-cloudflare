// Utility: current server timestamp
const now = () => Date.now();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

// Utility: JSON response
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    // Handle Batch Update only
    if (request.method === "POST" && url.pathname === "/update/batch") {
      const auth = request.headers.get("Authorization");
      if (auth !== `Bearer ${env.WORKER_SECRET}`) {
        return json({ error: "Unauthorized" }, 401);
      }

      const body: { data: any[], timestamp?: number } = await request.json();

      if (typeof body !== "object" || body === null || !Array.isArray(body.data)) {
        return json({ error: "Data must be an array" }, 400);
      }
      
      const { data, timestamp } = body;

      const nowTimestamp = timestamp ?? now();
      const writes: [string, string, Record<string, string>][] = data.reduce((acc, item: any) => {
        const { hmac, timestamp, ...rest } = item;
        if (!hmac) return acc;

        acc.push([`hmac:${hmac}`, JSON.stringify(rest), { timestamp: timestamp ?? nowTimestamp }]);
        return acc;
      }, []);

      await Promise.all(writes.map(([key, value, metadata]) => env.STORAGE_KV_PAYLOAD.put(key, value, {
        metadata: { someMetadataKey: "someMetadataValue" },
      })));

      return json({ message: "Batch saved", saved: writes.length });
    }

    // Handle Fetch
    if (request.method === "GET" && url.pathname.startsWith("/fetch/")) {
      const hmac = url.pathname.split("/fetch/")[1];
      if (!hmac) return json({ error: "Missing hmac" }, 400);

      const result = await env.STORAGE_KV_PAYLOAD.get(`hmac:${hmac}`);
      if (!result) {
        return json({ error: "Not Found" }, 404);
      }

      return new Response(result, {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Healthcheck
    if (request.method === "GET" && url.pathname === "/healthz") {
      return new Response("OK", { status: 200 });
    }

    return json({ error: "Not Found" }, 404);
  },
};
