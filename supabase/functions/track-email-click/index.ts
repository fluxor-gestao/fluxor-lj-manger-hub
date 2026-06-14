import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-cache, no-store, must-revalidate, private, max-age=0",
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const to = url.searchParams.get("to") || "https://ljmanager.fluxorbi.com";

  // Validação simples para evitar open-redirect (apenas http/https absolutos)
  let safeTo = "https://ljmanager.fluxorbi.com";
  try {
    const parsed = new URL(to);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      safeTo = parsed.toString();
    }
  } catch {
    // mantém fallback
  }

  if (id) {
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

      const { data: entry } = await admin
        .from("financial_entries")
        .select("notes")
        .eq("id", id)
        .single();

      // Clique é o sinal mais forte de visualização — registra mesmo que o pixel não tenha disparado
      if (entry && !(entry.notes || "").includes("[Sistema] Cliente visualizou")) {
        const now = new Date();
        const stamp = now.toLocaleString("pt-BR");
        const newNote = `\n[Sistema] Cliente visualizou a cobrança em ${stamp} (via clique no link).`;
        await admin
          .from("financial_entries")
          .update({ notes: (entry.notes || "") + newNote, updated_at: now.toISOString() })
          .eq("id", id);
      }
    } catch (e) {
      console.error("track-email-click error:", e);
    }
  }

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: safeTo },
  });
});
