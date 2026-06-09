import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uxwdzcjhrhlugrjgpkcr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4d2R6Y2pocmhsdWdyamdwa2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTQzODUsImV4cCI6MjA5NTY3MDM4NX0.Q3ZlbOlGeohoxrlWRcpLS7NNn2LaQ1KMctisAg_P2OQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const filePath = '/mnt/user-uploads/LISTAGEM_CLIENTES_36.xlsx';
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Lendo ${data.length} linhas do Excel para re-importação...`);

  // Deletar clientes antigos importados (opcional, mas o usuário pediu para "subir tudo novamente")
  // Para evitar apagar dados reais, vamos focar em atualizar ou apenas inserir os novos com o formato correto.
  // Como o usuário disse "suba tudo novamente", vou tentar limpar os registros que não possuem vinculação se possível,
  // ou apenas processar a planilha garantindo que Empresa vá para Empresa e Nome (QSA) vá para Nome.

  for (const row of data as any[]) {
    const cnpj = String(row['CNPJ'] || '').trim();
    const empresa = String(row['EMPRESA'] || '').trim();
    const nomeQsa = String(row['CLIENTE - QSA'] || '').trim();
    const idioma = String(row['Idioma'] || '').trim();
    const emailField = String(row['e-mail de contato'] || '').trim();

    if (!empresa) continue;

    // Se tiver mais de um email, pegamos o primeiro para a coluna email e deixamos o resto nas notas
    const emails = emailField.split(/[,;\s/]+/).filter(e => e.includes('@'));
    const primaryEmail = emails[0] || null;
    const allEmails = emails.join(', ');

    const clientData = {
      name: nomeQsa || empresa, // Nome do cliente (QSA) ou Empresa se não houver QSA
      company: empresa,         // Empresa
      document: cnpj || null,
      email: primaryEmail,
      type: 'PJ',
      notes: `E-mails: ${allEmails}\nSócio/QSA: ${nomeQsa}\nIdioma: ${idioma}`,
      active: true
    };

    // Tentar encontrar por documento ou empresa para evitar duplicatas infinitas se rodar várias vezes
    const { data: existing } = await supabase.from('clients').select('id').eq('company', empresa).maybeSingle();

    if (existing) {
      const { error } = await supabase.from('clients').update(clientData).eq('id', existing.id);
      if (error) console.error(`Erro ao atualizar ${empresa}:`, error.message);
      else console.log(`Cliente atualizado: ${empresa}`);
    } else {
      const { error } = await supabase.from('clients').insert(clientData);
      if (error) console.error(`Erro ao inserir ${empresa}:`, error.message);
      else console.log(`Cliente cadastrado: ${empresa}`);
    }
  }
}

run().catch(console.error);
