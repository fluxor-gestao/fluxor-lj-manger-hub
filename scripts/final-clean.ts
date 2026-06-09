import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uxwdzcjhrhlugrjgpkcr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4d2R6Y2pocmhsdWdyamdwa2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTQzODUsImV4cCI6MjA5NTY3MDM4NX0.Q3ZlbOlGeohoxrlWRcpLS7NNn2LaQ1KMctisAg_P2OQ";

async function run() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, email, name');

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log(`Clientes encontrados: ${clients?.length}`);

  for (const client of clients || []) {
    let email = client.email;
    if (email && typeof email === 'string' && (email.includes('<') || email.includes('>') || email.includes(',') || email.includes(';'))) {
      let cleaned = email.replace(/[<>"'\s]/g, '').trim();
      if (cleaned.includes(',') || cleaned.includes(';')) {
        cleaned = cleaned.split(/[,;]/)[0].trim();
      }
      
      const { error: updErr } = await supabase
        .from('clients')
        .update({ email: cleaned })
        .eq('id', client.id);
        
      if (updErr) {
        console.error(`Erro ao atualizar ${client.id}:`, updErr);
      } else {
        console.log(`Corrigido: ${email} -> ${cleaned}`);
      }
    }
  }
}

run();
