import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uxwdzcjhrhlugrjgpkcr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4d2R6Y2pocmhsdWdyamdwa2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTQzODUsImV4cCI6MjA5NTY3MDM4NX0.Q3ZlbOlGeohoxrlWRcpLS7NNn2LaQ1KMctisAg_P2OQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function cleanEmail(emailStr: string): string | null {
  if (!emailStr) return null;
  // Remove <, >, ", ' e espaços
  let cleaned = emailStr.replace(/[<>"'\s]/g, '').trim();
  // Se ainda houver múltiplos emails separados por vírgula ou ponto e vírgula, pega o primeiro
  if (cleaned.includes(',') || cleaned.includes(';')) {
    cleaned = cleaned.split(/[,;]/)[0].trim();
  }
  return cleaned || null;
}

async function run() {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, email, notes');

  if (error) {
    console.error('Erro ao buscar clientes:', error.message);
    return;
  }

  console.log(`Analisando ${clients.length} clientes para limpeza de e-mails...`);

  for (const client of clients) {
    const originalEmail = client.email;
    const newEmail = cleanEmail(originalEmail);

    if (newEmail !== originalEmail) {
      const { error: updateError } = await supabase
        .from('clients')
        .update({ email: newEmail })
        .eq('id', client.id);

      if (updateError) {
        console.error(`Erro ao atualizar cliente ${client.id}:`, updateError.message);
      } else {
        console.log(`E-mail corrigido: [${originalEmail}] -> [${newEmail}]`);
      }
    }
  }
  console.log('Limpeza concluída.');
}

run().catch(console.error);
