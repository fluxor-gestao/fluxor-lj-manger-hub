import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// GIF transparente 1x1
const PIXEL = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
]);

const pixelHeaders = {
  "Content-Type": "image/gif",
  "Cache-Control": "no-cache, no-store, must-revalidate, private, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
  "Access-Control-Allow-Origin": "*",
};

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response(PIXEL, { headers: pixelHeaders });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: entry } = await admin
      .from("financial_entries")
      .select("notes, document_reference")
      .eq("id", id)
      .single();

    // Registra somente a primeira abertura para evitar poluição (clientes de e-mail buscam o pixel várias vezes)
    if (entry && !(entry.notes || "").includes("[Sistema] Cliente visualizou")) {
      const now = new Date();
      const stamp = now.toLocaleString("pt-BR");
      const newNote = `\n[Sistema] Cliente visualizou a cobrança em ${stamp}.`;
      const nowIso = now.toISOString();
      await admin
        .from("financial_entries")
        .update({ notes: (entry.notes || "") + newNote, updated_at: nowIso })
        .eq("id", id);
    }
  } catch (e) {
    console.error("track-email-open error:", e);
  }
  return new Response(PIXEL, { headers: pixelHeaders });
});
