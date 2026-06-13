// Proxy serverless para o Fluxor Monitor.
// Esconde a FLUXOR_MONITOR_API_KEY do navegador.
// Endpoints aceitos:
//   POST /api/public/fluxor-monitor/errors
//   POST /api/public/fluxor-monitor/tickets
import { createFileRoute } from "@tanstack/react-router";

const FLUXOR_BASE = "https://ljmanager.fluxorbi.com";
const ALLOWED = new Set(["errors", "tickets"]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/fluxor-monitor/$")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request, params }) => {
        const target = (params._splat ?? "").split("/")[0];
        if (!ALLOWED.has(target)) {
          return new Response(JSON.stringify({ error: "Unknown endpoint" }), {
            status: 404,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }

        const apiKey = process.env.FLUXOR_MONITOR_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Fluxor Monitor não configurado" }), {
            status: 503,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }

        try {
          const upstream = await fetch(`${FLUXOR_BASE}/api/monitor/${target}`, {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(8000),
          });

          const text = await upstream.text();
          return new Response(text || "{}", {
            status: upstream.status,
            headers: {
              "Content-Type": upstream.headers.get("content-type") ?? "application/json",
              ...CORS,
            },
          });
        } catch (err) {
          // Fluxor fora do ar — não derruba o app
          return new Response(
            JSON.stringify({ error: "Fluxor Monitor indisponível", detail: String(err) }),
            { status: 502, headers: { "Content-Type": "application/json", ...CORS } },
          );
        }
      },
    },
  },
});
