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

  console.log(`Lendo ${data.length} linhas do Excel...`);

  for (const row of data as any[]) {
    const cnpj = String(row['CNPJ'] || '').trim();
    const empresa = String(row['EMPRESA'] || '').trim();
    const qsa = String(row['CLIENTE - QSA'] || '').trim();
    const idioma = String(row['Idioma'] || '').trim();
    const email = String(row['e-mail de contato'] || '').trim();

    if (!empresa) continue;

    const clientData = {
      name: empresa,
      document: cnpj || null,
      email: email || null,
      type: 'PJ',
      notes: `Sócio/QSA: ${qsa}\nIdioma: ${idioma}`,
      active: true
    };

    const { error } = await supabase.from('clients').insert(clientData);
    if (error) {
      console.error(`Erro ao inserir ${empresa}:`, error.message);
    } else {
      console.log(`Cliente cadastrado: ${empresa}`);
    }
  }
}

run().catch(console.error);
