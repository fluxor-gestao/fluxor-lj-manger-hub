// Gera proposta jurídica (Devis) — IA gera o Escopo dos Serviços (Seção III) e sugere itens de precificação.
// As demais 10 cláusulas (I, II, IV–XI) vêm de um template fixo, localizado no idioma do cliente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Lang = "pt" | "fr" | "en" | "es" | "de";

const SUPPORTED_LANGS: Lang[] = ["pt", "fr", "en", "es", "de"];

const LANG_FULL_NAME: Record<Lang, string> = {
  pt: "português do Brasil (pt-BR)",
  fr: "français",
  en: "English",
  es: "español",
  de: "Deutsch",
};

const CONTRACTORS: Record<string, { name: string; document: string; address: string; representative: string }> = {
  DE: {
    name: "LUNDGAARD JENSEN ADVOCACIA E CONSULTORIA INTERNACIONAL",
    document: "21.682.183/0001-42",
    address: "Rua João Cordeiro, nº 831, Praia de Iracema, Fortaleza/CE",
    representative: "Leonardo Carapeba Lundgaard Jensen, brasileiro, casado, advogado, inscrito na OAB/CE sob o nº 20.985",
  },
  CO: {
    name: "LUNDGAARD JENSEN CONTABILIDADE INTERNACIONAL",
    document: "21.682.183/0001-42",
    address: "Rua João Cordeiro, nº 831, Praia de Iracema, Fortaleza/CE",
    representative: "Leonardo Carapeba Lundgaard Jensen, brasileiro, casado, advogado, inscrito na OAB/CE sob o nº 20.985",
  },
  AM: {
    name: "LUNDGAARD JENSEN CONSULTORIA AMBIENTAL",
    document: "21.682.183/0001-42",
    address: "Rua João Cordeiro, nº 831, Praia de Iracema, Fortaleza/CE",
    representative: "Leonardo Carapeba Lundgaard Jensen, brasileiro, casado, advogado, inscrito na OAB/CE sob o nº 20.985",
  },
  IM: {
    name: "LUNDGAARD JENSEN CONSULTORIA IMOBILIÁRIA",
    document: "21.682.183/0001-42",
    address: "Rua João Cordeiro, nº 831, Praia de Iracema, Fortaleza/CE",
    representative: "Leonardo Carapeba Lundgaard Jensen, brasileiro, casado, advogado, inscrito na OAB/CE sob o nº 20.985",
  },
  GE: {
    name: "LUNDGAARD JENSEN GESTÃO INTERNACIONAL",
    document: "21.682.183/0001-42",
    address: "Rua João Cordeiro, nº 831, Praia de Iracema, Fortaleza/CE",
    representative: "Leonardo Carapeba Lundgaard Jensen, brasileiro, casado, advogado, inscrito na OAB/CE sob o nº 20.985",
  },
};

const DEFAULT_CONTRACTOR = CONTRACTORS.DE;

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

interface ScopeItem {
  letter: string;
  title: string;
  description: string;
  deliverables?: string[];
  stakeholders?: string[];
  success_metrics?: string[];
  duration?: string;
  amount: number;
}

// Localized labels for the markdown template (clause headings + inline labels)
type TemplateStrings = {
  identification: string; contractor: string; contractee: string; document: string; address: string;
  object: string; objectText: (scope: string) => string;
  scope: string;
  fees: string; total: string; downPayment: string; balance: string; ipca: string;
  payment: string; paymentText: string;
  contractorObligations: string; contractorObligationsText: string;
  contracteeObligations: string; contracteeObligationsText: string;
  scopeLimit: string; scopeLimitText: string;
  termination: string; terminationText: string;
  jurisdiction: string; jurisdictionText: string; deadlineNote: (d: string) => string;
  signatures: string; signaturesText: string;
  descr: string; deliverables: string; stakeholders: string; metrics: string; duration: string;
};

const T: Record<Lang, TemplateStrings> = {
  pt: {
    identification: "I. Identificação das Partes",
    contractor: "CONTRATADO", contractee: "CONTRATANTE",
    document: "Documento", address: "Endereço",
    object: "II. Objeto do Contrato",
    objectText: (s) => `O presente contrato tem por objeto a prestação, pelo CONTRATADO ao CONTRATANTE, dos serviços jurídicos e de consultoria detalhados na Seção III abaixo. ${s}`,
    scope: "III. Escopo dos Serviços",
    fees: "IV. Honorários", total: "Valor Total", downPayment: "Entrada (50%) na assinatura", balance: "Saldo (50%) na conclusão dos serviços",
    ipca: "Em caso de execução superior a 12 (doze) meses, os valores remanescentes serão reajustados pela variação acumulada do IPCA/IBGE no período.",
    payment: "V. Forma de Pagamento",
    paymentText: "Os pagamentos serão realizados via PIX ou transferência bancária para conta de titularidade do CONTRATADO, em até 5 (cinco) dias úteis contados da emissão da respectiva cobrança. A entrada de 50% é condição para o início da execução; o saldo de 50% é devido na entrega final ou conforme cronograma específico previamente acordado entre as partes.",
    contractorObligations: "VI. Obrigações do Contratado",
    contractorObligationsText: "O CONTRATADO obriga-se a: (a) executar os serviços com zelo, diligência profissional e observância da legislação aplicável e das normas da OAB; (b) manter sigilo absoluto sobre informações, documentos e dados a que tiver acesso; (c) manter o CONTRATANTE informado sobre o andamento dos trabalhos por meio de relatórios periódicos; (d) empregar profissionais qualificados para a condução do objeto; (e) entregar os produtos jurídicos contratados dentro dos prazos estabelecidos na Seção III.",
    contracteeObligations: "VII. Obrigações do Contratante",
    contracteeObligationsText: "O CONTRATANTE obriga-se a: (a) fornecer, em tempo hábil, todos os documentos, dados e informações necessários à execução dos serviços; (b) prestar esclarecimentos e tomar decisões tempestivas sempre que solicitado; (c) efetuar os pagamentos nas datas e condições pactuadas; (d) custear despesas de terceiros eventualmente necessárias (notário, tradutor juramentado, taxas, custas judiciais, peritos), salvo quando expressamente incluídas no escopo.",
    scopeLimit: "VIII. Limitação de Escopo",
    scopeLimitText: "Os serviços contratados restringem-se ao objeto descrito na Seção III. Quaisquer atos, peças, diligências, audiências, recursos, pareceres adicionais ou demandas judiciais não expressamente previstos neste instrumento configuram serviços extraordinários, sujeitos a aditivo contratual com honorários específicos. O CONTRATADO não assume obrigação de resultado, mas de meio, comprometendo-se com a melhor técnica e diligência profissional aplicáveis.",
    termination: "IX. Rescisão",
    terminationText: "O presente contrato poderá ser rescindido: (a) por comum acordo entre as partes, mediante distrato escrito; (b) por inadimplemento de qualquer obrigação contratual, após notificação com prazo de 10 (dez) dias para purgação da mora; (c) unilateralmente por qualquer das partes, mediante aviso prévio de 30 (trinta) dias. Em qualquer hipótese de rescisão, são devidos ao CONTRATADO os honorários proporcionais aos serviços efetivamente prestados até a data da rescisão, bem como o reembolso de despesas comprovadamente incorridas.",
    jurisdiction: "X. Foro",
    jurisdictionText: "Fica eleito o foro da Comarca de Fortaleza/CE para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.",
    deadlineNote: (d) => `*Prazo estimado de execução: até ${d}.*`,
    signatures: "XI. Assinaturas",
    signaturesText: "As partes assinam o presente instrumento em via eletrônica, juntamente com 2 (duas) testemunhas, declarando ter lido e concordado com todas as cláusulas e condições aqui pactuadas.",
    descr: "Descrição", deliverables: "Entregáveis", stakeholders: "Partes envolvidas", metrics: "Indicadores de sucesso", duration: "Prazo",
  },
  fr: {
    identification: "I. Identification des Parties",
    contractor: "PRESTATAIRE", contractee: "CLIENT",
    document: "Document", address: "Adresse",
    object: "II. Objet du Contrat",
    objectText: (s) => `Le présent contrat a pour objet la prestation, par le PRESTATAIRE au CLIENT, des services juridiques et de conseil détaillés dans la Section III ci-dessous. ${s}`,
    scope: "III. Étendue des Services",
    fees: "IV. Honoraires", total: "Montant Total", downPayment: "Acompte (50%) à la signature", balance: "Solde (50%) à la fin des services",
    ipca: "En cas d'exécution supérieure à 12 (douze) mois, les montants restants seront réajustés selon la variation cumulée de l'IPCA/IBGE sur la période.",
    payment: "V. Modalités de Paiement",
    paymentText: "Les paiements seront effectués par PIX ou virement bancaire vers un compte du PRESTATAIRE, dans un délai maximum de 5 (cinq) jours ouvrés à compter de l'émission de la facture correspondante. L'acompte de 50% conditionne le début de l'exécution; le solde de 50% est dû à la livraison finale ou selon un calendrier spécifique préalablement convenu entre les parties.",
    contractorObligations: "VI. Obligations du Prestataire",
    contractorObligationsText: "Le PRESTATAIRE s'engage à : (a) exécuter les services avec soin, diligence professionnelle et dans le respect de la législation applicable et des normes de l'OAB; (b) maintenir la confidentialité absolue des informations, documents et données auxquels il aura accès; (c) informer le CLIENT de l'avancement des travaux par des rapports périodiques; (d) employer des professionnels qualifiés; (e) livrer les prestations juridiques dans les délais prévus à la Section III.",
    contracteeObligations: "VII. Obligations du Client",
    contracteeObligationsText: "Le CLIENT s'engage à : (a) fournir en temps utile tous les documents, données et informations nécessaires à l'exécution des services; (b) apporter les éclaircissements et prendre les décisions en temps opportun; (c) effectuer les paiements aux dates et conditions convenues; (d) prendre en charge les frais de tiers éventuellement nécessaires (notaire, traducteur assermenté, taxes, frais de justice, experts), sauf inclusion expresse dans la portée.",
    scopeLimit: "VIII. Limitation de la Portée",
    scopeLimitText: "Les services contractés se limitent à l'objet décrit à la Section III. Tous actes, pièces, diligences, audiences, recours, avis additionnels ou demandes judiciaires non expressément prévus constituent des services extraordinaires, soumis à un avenant avec honoraires spécifiques. Le PRESTATAIRE n'assume pas une obligation de résultat, mais de moyens, s'engageant à apporter sa meilleure technique et diligence professionnelle.",
    termination: "IX. Résiliation",
    terminationText: "Le présent contrat pourra être résilié : (a) d'un commun accord entre les parties, par acte écrit; (b) pour inexécution de toute obligation contractuelle, après mise en demeure assortie d'un délai de 10 (dix) jours pour y remédier; (c) unilatéralement par l'une des parties moyennant un préavis de 30 (trente) jours. En toute hypothèse de résiliation, les honoraires proportionnels aux services effectivement rendus jusqu'à la date de résiliation sont dus au PRESTATAIRE, ainsi que le remboursement des frais effectivement engagés.",
    jurisdiction: "X. Juridiction",
    jurisdictionText: "Il est élu le for de la Comarca de Fortaleza/CE pour trancher tout différend ou litige découlant du présent contrat, avec renonciation expresse à tout autre, aussi privilégié soit-il.",
    deadlineNote: (d) => `*Délai estimé d'exécution : jusqu'au ${d}.*`,
    signatures: "XI. Signatures",
    signaturesText: "Les parties signent le présent instrument sous forme électronique, en présence de 2 (deux) témoins, déclarant avoir lu et accepté toutes les clauses et conditions ici convenues.",
    descr: "Description", deliverables: "Livrables", stakeholders: "Parties prenantes", metrics: "Indicateurs de réussite", duration: "Délai",
  },
  en: {
    identification: "I. Identification of the Parties",
    contractor: "CONTRACTOR", contractee: "CLIENT",
    document: "Document", address: "Address",
    object: "II. Object of the Contract",
    objectText: (s) => `The purpose of this contract is the provision, by the CONTRACTOR to the CLIENT, of the legal and consulting services detailed in Section III below. ${s}`,
    scope: "III. Scope of Services",
    fees: "IV. Fees", total: "Total Amount", downPayment: "Down payment (50%) at signature", balance: "Balance (50%) upon completion",
    ipca: "If performance exceeds 12 (twelve) months, the remaining amounts will be adjusted by the accumulated variation of IPCA/IBGE for the period.",
    payment: "V. Payment Terms",
    paymentText: "Payments will be made via PIX or bank transfer to an account held by the CONTRACTOR, within 5 (five) business days from the issuance of the corresponding invoice. The 50% down payment is a condition for the commencement of services; the 50% balance is due upon final delivery or according to a specific schedule previously agreed between the parties.",
    contractorObligations: "VI. Contractor Obligations",
    contractorObligationsText: "The CONTRACTOR undertakes to: (a) perform the services with care, professional diligence and in compliance with applicable law and OAB rules; (b) maintain absolute confidentiality regarding the information, documents and data accessed; (c) keep the CLIENT informed of progress through periodic reports; (d) engage qualified professionals; (e) deliver the contracted legal services within the deadlines set in Section III.",
    contracteeObligations: "VII. Client Obligations",
    contracteeObligationsText: "The CLIENT undertakes to: (a) provide in a timely manner all documents, data and information necessary for the performance of the services; (b) provide clarifications and make timely decisions when requested; (c) make payments on the dates and conditions agreed; (d) cover any third-party expenses required (notary, sworn translator, taxes, court costs, experts), unless expressly included in the scope.",
    scopeLimit: "VIII. Scope Limitation",
    scopeLimitText: "The contracted services are limited to the object described in Section III. Any acts, pleadings, due diligence, hearings, appeals, additional opinions or judicial proceedings not expressly provided in this instrument constitute extraordinary services, subject to a contractual addendum with specific fees. The CONTRACTOR does not assume an obligation of result, but of means, committing to the best applicable technique and professional diligence.",
    termination: "IX. Termination",
    terminationText: "This contract may be terminated: (a) by mutual agreement of the parties, by written distrato; (b) for breach of any contractual obligation, after notice with a 10 (ten) day cure period; (c) unilaterally by either party, with 30 (thirty) days prior notice. In any case of termination, the CONTRACTOR is entitled to fees proportional to the services actually rendered up to the termination date, as well as reimbursement of duly incurred expenses.",
    jurisdiction: "X. Jurisdiction",
    jurisdictionText: "The forum of the Judicial District of Fortaleza/CE is hereby elected to settle any doubts or disputes arising from this contract, with express waiver of any other, however privileged.",
    deadlineNote: (d) => `*Estimated performance deadline: by ${d}.*`,
    signatures: "XI. Signatures",
    signaturesText: "The parties sign this instrument electronically, together with 2 (two) witnesses, declaring that they have read and agreed to all the clauses and conditions herein.",
    descr: "Description", deliverables: "Deliverables", stakeholders: "Stakeholders", metrics: "Success metrics", duration: "Duration",
  },
  es: {
    identification: "I. Identificación de las Partes",
    contractor: "CONTRATADO", contractee: "CONTRATANTE",
    document: "Documento", address: "Dirección",
    object: "II. Objeto del Contrato",
    objectText: (s) => `El presente contrato tiene por objeto la prestación, por el CONTRATADO al CONTRATANTE, de los servicios jurídicos y de consultoría detallados en la Sección III a continuación. ${s}`,
    scope: "III. Alcance de los Servicios",
    fees: "IV. Honorarios", total: "Valor Total", downPayment: "Entrada (50%) a la firma", balance: "Saldo (50%) a la conclusión de los servicios",
    ipca: "En caso de ejecución superior a 12 (doce) meses, los valores restantes se reajustarán por la variación acumulada del IPCA/IBGE en el período.",
    payment: "V. Forma de Pago",
    paymentText: "Los pagos se realizarán mediante PIX o transferencia bancaria a cuenta del CONTRATADO, en un plazo máximo de 5 (cinco) días hábiles desde la emisión de la factura correspondiente. La entrada del 50% es condición para el inicio de la ejecución; el saldo del 50% es debido en la entrega final o conforme a un cronograma específico previamente acordado entre las partes.",
    contractorObligations: "VI. Obligaciones del Contratado",
    contractorObligationsText: "El CONTRATADO se obliga a: (a) ejecutar los servicios con celo, diligencia profesional y observancia de la legislación aplicable y normas de la OAB; (b) mantener absoluta confidencialidad sobre la información, documentos y datos a los que tenga acceso; (c) mantener al CONTRATANTE informado del avance mediante informes periódicos; (d) emplear profesionales cualificados; (e) entregar los productos jurídicos dentro de los plazos previstos en la Sección III.",
    contracteeObligations: "VII. Obligaciones del Contratante",
    contracteeObligationsText: "El CONTRATANTE se obliga a: (a) proporcionar oportunamente todos los documentos, datos e informaciones necesarios para la ejecución de los servicios; (b) prestar aclaraciones y tomar decisiones de forma oportuna; (c) efectuar los pagos en las fechas y condiciones pactadas; (d) sufragar gastos de terceros eventualmente necesarios (notario, traductor jurado, tasas, costas judiciales, peritos), salvo cuando se incluyan expresamente en el alcance.",
    scopeLimit: "VIII. Limitación del Alcance",
    scopeLimitText: "Los servicios contratados se limitan al objeto descrito en la Sección III. Cualquier acto, escrito, diligencia, audiencia, recurso, dictamen adicional o demanda judicial no expresamente previsto constituye servicio extraordinario, sujeto a adenda contractual con honorarios específicos. El CONTRATADO no asume obligación de resultado, sino de medios, comprometiéndose con la mejor técnica y diligencia profesional aplicables.",
    termination: "IX. Rescisión",
    terminationText: "El presente contrato podrá rescindirse: (a) por mutuo acuerdo de las partes, mediante distrato escrito; (b) por incumplimiento de cualquier obligación contractual, previa notificación con plazo de 10 (diez) días para subsanar la mora; (c) unilateralmente por cualquiera de las partes, con aviso previo de 30 (treinta) días. En cualquier hipótesis de rescisión, son debidos al CONTRATADO los honorarios proporcionales a los servicios efectivamente prestados hasta la fecha de la rescisión, así como el reembolso de gastos efectivamente incurridos.",
    jurisdiction: "X. Fuero",
    jurisdictionText: "Se elige el fuero de la Comarca de Fortaleza/CE para dirimir cualquier duda o controversia derivada de este contrato, con renuncia expresa a cualquier otro, por más privilegiado que sea.",
    deadlineNote: (d) => `*Plazo estimado de ejecución: hasta ${d}.*`,
    signatures: "XI. Firmas",
    signaturesText: "Las partes firman el presente instrumento de forma electrónica, junto con 2 (dos) testigos, declarando haber leído y aceptado todas las cláusulas y condiciones aquí pactadas.",
    descr: "Descripción", deliverables: "Entregables", stakeholders: "Partes involucradas", metrics: "Indicadores de éxito", duration: "Plazo",
  },
  de: {
    identification: "I. Identifizierung der Parteien",
    contractor: "AUFTRAGNEHMER", contractee: "AUFTRAGGEBER",
    document: "Dokument", address: "Anschrift",
    object: "II. Vertragsgegenstand",
    objectText: (s) => `Gegenstand dieses Vertrages ist die Erbringung der in Abschnitt III aufgeführten Rechts- und Beratungsdienstleistungen durch den AUFTRAGNEHMER an den AUFTRAGGEBER. ${s}`,
    scope: "III. Leistungsumfang",
    fees: "IV. Honorare", total: "Gesamtbetrag", downPayment: "Anzahlung (50%) bei Unterzeichnung", balance: "Restbetrag (50%) bei Abschluss der Dienstleistungen",
    ipca: "Bei einer Vertragsausführung von mehr als 12 (zwölf) Monaten werden die ausstehenden Beträge nach der kumulierten Veränderung des IPCA/IBGE im Zeitraum angepasst.",
    payment: "V. Zahlungsbedingungen",
    paymentText: "Die Zahlungen erfolgen per PIX oder Banküberweisung auf ein Konto des AUFTRAGNEHMERS innerhalb von 5 (fünf) Werktagen nach Rechnungsstellung. Die Anzahlung von 50% ist Voraussetzung für den Beginn der Ausführung; der Restbetrag von 50% ist mit der Endlieferung oder nach einem zwischen den Parteien zuvor vereinbarten Zeitplan fällig.",
    contractorObligations: "VI. Pflichten des Auftragnehmers",
    contractorObligationsText: "Der AUFTRAGNEHMER verpflichtet sich: (a) die Dienstleistungen mit Sorgfalt und beruflicher Gewissenhaftigkeit unter Beachtung der geltenden Gesetze und der OAB-Vorschriften zu erbringen; (b) absolute Vertraulichkeit über alle Informationen, Dokumente und Daten zu wahren; (c) den AUFTRAGGEBER durch periodische Berichte über den Fortschritt zu informieren; (d) qualifizierte Fachkräfte einzusetzen; (e) die vertraglichen Leistungen innerhalb der in Abschnitt III festgelegten Fristen zu erbringen.",
    contracteeObligations: "VII. Pflichten des Auftraggebers",
    contracteeObligationsText: "Der AUFTRAGGEBER verpflichtet sich: (a) alle für die Ausführung erforderlichen Dokumente, Daten und Informationen rechtzeitig bereitzustellen; (b) auf Anforderung zeitnah Klärungen vorzunehmen und Entscheidungen zu treffen; (c) Zahlungen zu den vereinbarten Terminen und Bedingungen zu leisten; (d) etwaige Kosten Dritter (Notar, vereidigter Übersetzer, Gebühren, Gerichtskosten, Sachverständige) zu tragen, sofern nicht ausdrücklich im Leistungsumfang enthalten.",
    scopeLimit: "VIII. Begrenzung des Leistungsumfangs",
    scopeLimitText: "Die vertraglichen Leistungen beschränken sich auf den in Abschnitt III beschriebenen Gegenstand. Handlungen, Schriftsätze, Recherchen, Anhörungen, Rechtsmittel, zusätzliche Gutachten oder gerichtliche Verfahren, die hierin nicht ausdrücklich vorgesehen sind, stellen außerordentliche Leistungen dar und unterliegen einem Vertragsnachtrag mit spezifischen Honoraren. Der AUFTRAGNEHMER schuldet keinen Erfolg, sondern verpflichtet sich zur fachgerechten und sorgfältigen Erbringung der Leistung.",
    termination: "IX. Kündigung",
    terminationText: "Dieser Vertrag kann gekündigt werden: (a) im gegenseitigen Einvernehmen der Parteien durch schriftliche Aufhebungsvereinbarung; (b) bei Nichterfüllung vertraglicher Pflichten nach Mahnung mit Nachfrist von 10 (zehn) Tagen; (c) einseitig durch eine der Parteien mit Vorankündigung von 30 (dreißig) Tagen. In jedem Fall der Kündigung stehen dem AUFTRAGNEHMER die anteiligen Honorare für die bis zur Kündigung tatsächlich erbrachten Leistungen sowie die Erstattung tatsächlich entstandener Auslagen zu.",
    jurisdiction: "X. Gerichtsstand",
    jurisdictionText: "Als Gerichtsstand für alle Streitigkeiten aus diesem Vertrag wird der Gerichtsbezirk Fortaleza/CE vereinbart, unter ausdrücklichem Verzicht auf jeden anderen, auch noch so privilegierten Gerichtsstand.",
    deadlineNote: (d) => `*Geschätzte Ausführungsfrist: bis ${d}.*`,
    signatures: "XI. Unterschriften",
    signaturesText: "Die Parteien unterzeichnen dieses Dokument elektronisch in Anwesenheit von 2 (zwei) Zeugen und erklären, alle hier vereinbarten Klauseln und Bedingungen gelesen und akzeptiert zu haben.",
    descr: "Beschreibung", deliverables: "Leistungen", stakeholders: "Beteiligte", metrics: "Erfolgskennzahlen", duration: "Dauer",
  },
};

function renderScopeItems(items: ScopeItem[], t: TemplateStrings): string {
  return items
    .map((it) => {
      const head = `**${(it.letter || "").toUpperCase()}) ${it.title} — ${fmtBRL(it.amount)}**`;
      const lines = [head];
      if (it.description) lines.push(`*${t.descr}:* ${it.description}`);
      if (it.deliverables?.length) lines.push(`*${t.deliverables}:* ${it.deliverables.join("; ")}.`);
      if (it.stakeholders?.length) lines.push(`*${t.stakeholders}:* ${it.stakeholders.join("; ")}.`);
      if (it.success_metrics?.length) lines.push(`*${t.metrics}:* ${it.success_metrics.join("; ")}.`);
      if (it.duration) lines.push(`*${t.duration}:* ${it.duration}.`);
      return lines.join("\n");
    })
    .join("\n\n");
}

function buildProposalMarkdown(args: {
  business_unit?: string;
  title: string;
  client_name?: string;
  client_document?: string;
  client_address?: string;
  scope_description: string;
  scope_items: ScopeItem[];
  total_amount: number;
  down_payment_amount: number;
  deadline_date?: string | null;
  language: Lang;
}): string {
  const t = T[args.language] || T.pt;
  const balance = Math.max(args.total_amount - args.down_payment_amount, 0);
  const clientLines = [
    `- **${t.contractee}:** ${args.client_name || "—"}`,
    args.client_document ? `  - ${t.document}: ${args.client_document}` : "",
    args.client_address ? `  - ${t.address}: ${args.client_address}` : "",
  ].filter(Boolean).join("\n");
  const contractor = CONTRACTORS[args.business_unit || "DE"] || DEFAULT_CONTRACTOR;

  return `# ${args.title}

## ${t.identification}
- **${t.contractor}:** ${contractor.name}, CNPJ ${contractor.document}, ${contractor.address}. ${contractor.representative}.
${clientLines}

## ${t.object}
${t.objectText(args.scope_description || "")}

## ${t.scope}
${renderScopeItems(args.scope_items, t)}

## ${t.fees}
- **${t.total}:** ${fmtBRL(args.total_amount)}.
- **${t.downPayment}:** ${fmtBRL(args.down_payment_amount)}.
- **${t.balance}:** ${fmtBRL(balance)}.
- ${t.ipca}

## ${t.payment}
${t.paymentText}

## ${t.contractorObligations}
${t.contractorObligationsText}

## ${t.contracteeObligations}
${t.contracteeObligationsText}

## ${t.scopeLimit}
${t.scopeLimitText}

## ${t.termination}
${t.terminationText}

## ${t.jurisdiction}
${t.jurisdictionText}${args.deadline_date ? `\n\n${t.deadlineNote(args.deadline_date)}` : ""}

## ${t.signatures}
${t.signaturesText}
`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      meeting_report,
      client_name,
      client_document,
      client_address,
      total_amount,
      deadline_date,
      tier,
      business_unit,
      source_language,
    } = await req.json();

    const lang: Lang = SUPPORTED_LANGS.includes(source_language) ? source_language : "pt";
    const langName = LANG_FULL_NAME[lang];

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: officialPrices } = await supabase
      .from("service_prices")
      .select("name, price, description, category");

    const pricesRef = officialPrices?.map(p => `- ${p.name} (${p.category}): R$ ${p.price}${p.description ? ` - ${p.description}` : ""}`).join("\n") || "—";

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");
    if (!meeting_report) throw new Error("meeting_report é obrigatório");

    const model = tier === "final" ? "gpt-5" : "gpt-5-mini";
    const hasTotal = typeof total_amount === "number" && total_amount > 0;

    const systemPrompt = `You are a senior lawyer at Lundgaard Jensen, drafting commercial legal proposals (devis).

CRITICAL LANGUAGE RULE:
- The CLIENT's native language is: ${langName} (code "${lang}").
- ALL textual output you produce (title, scope_description, scope_items.title/description/deliverables/stakeholders/success_metrics/duration, payment_terms, assumptions) MUST be written natively and fluently in ${langName}.
- If the meeting report below is in a different language, translate the content as you draft. Never mix languages. Never leave foreign words from other languages.
- Do NOT use placeholders ([...], {...}, <...>, "TBD", "XXX").
- Service names taken from the official price table may keep their canonical Portuguese name only when no natural equivalent exists in ${langName}; otherwise translate naturally.

DRAFTING RULES:
- Tone: formal commercial legal proposal, third person, active voice.
- Personalize every paragraph based on the meeting report — never generic text.
- Provide 3 to 6 scope_items with letter (A, B, C…), title, description (3–6 sentences), deliverables, stakeholders, success_metrics, duration, amount (BRL > 0).
- ${hasTotal
      ? `Total amount is fixed at R$ ${total_amount}. Distribute proportionally across items; the sum MUST equal ${total_amount} EXACTLY.`
      : `Estimate plausible Brazilian market values (BRL): real-estate due diligence 15,000–60,000; company incorporation 8,000–25,000; urban licensing 10,000–40,000; consulting/negotiation 5,000–20,000; legal opinions 4,000–15,000; multidisciplinary coordination 5,000–15,000.`}
- ZERO amounts are forbidden in any scope_items[].amount.

OFFICIAL PRICE TABLE (mandatory reference for amounts when a matching service exists):
${pricesRef}`;

    const userPrompt = `Meeting report${client_name ? ` with client "${client_name}"` : ""}:

${meeting_report}

${hasTotal ? `Target total amount: R$ ${total_amount}` : "No fixed total — estimate per ranges."}

Output ONLY title, scope_description, scope_items (A/B/C…), total_amount and suggested_pricing_items. Write every textual field in ${langName}.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "build_scope",
            description: "Generates only the scope of the proposal (title, summary, items).",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                service_type: { type: "string" },
                responsible_sector: { type: "string" },
                scope_description: { type: "string" },
                scope_items: {
                  type: "array",
                  minItems: 3,
                  items: {
                    type: "object",
                    properties: {
                      letter: { type: "string" },
                      title: { type: "string" },
                      description: { type: "string" },
                      deliverables: { type: "array", items: { type: "string" } },
                      stakeholders: { type: "array", items: { type: "string" } },
                      success_metrics: { type: "array", items: { type: "string" } },
                      duration: { type: "string" },
                      amount: { type: "number", exclusiveMinimum: 0 },
                    },
                    required: ["letter", "title", "description", "duration", "amount"],
                  },
                },
                suggested_pricing_items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      service_name: { type: "string" },
                      quantity: { type: "number", default: 1 },
                      unit_price: { type: "number" },
                    },
                    required: ["service_name", "quantity", "unit_price"],
                  },
                },
                total_amount: { type: "number", exclusiveMinimum: 0 },
                deadline_date: { type: "string" },
                payment_terms: { type: "string" },
                assumptions: { type: "array", items: { type: "string" } },
              },
              required: ["title", "scope_description", "scope_items", "total_amount", "suggested_pricing_items"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "build_scope" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requisições da OpenAI atingido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (response.status === 401) {
      return new Response(JSON.stringify({ error: "Chave OPENAI_API_KEY inválida." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("OpenAI error:", response.status, t);
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Resposta sem tool_call");
    const ai = JSON.parse(toolCall.function.arguments);

    const scrub = (s: string): string => {
      if (!s) return s;
      return s
        .replace(/\[([^\]]*)\]/g, "$1")
        .replace(/\{([^}]*)\}/g, "$1")
        .replace(/«\s*([^»]*)\s*»/g, "$1")
        .replace(/\s{2,}/g, " ")
        .trim();
    };
    if (typeof ai.title === "string") ai.title = scrub(ai.title);
    if (typeof ai.scope_description === "string") ai.scope_description = scrub(ai.scope_description);
    const scopeItems: ScopeItem[] = (Array.isArray(ai.scope_items) ? ai.scope_items : []).map((it: any) => ({
      ...it,
      title: typeof it.title === "string" ? scrub(it.title) : it.title,
      description: typeof it.description === "string" ? scrub(it.description) : it.description,
      duration: typeof it.duration === "string" ? scrub(it.duration) : it.duration,
      deliverables: Array.isArray(it.deliverables) ? it.deliverables.map((d: any) => typeof d === "string" ? scrub(d) : d) : it.deliverables,
      stakeholders: Array.isArray(it.stakeholders) ? it.stakeholders.map((d: any) => typeof d === "string" ? scrub(d) : d) : it.stakeholders,
      success_metrics: Array.isArray(it.success_metrics) ? it.success_metrics.map((d: any) => typeof d === "string" ? scrub(d) : d) : it.success_metrics,
    }));
    const finalTitle = ai.title || "Proposta de Prestação de Serviços Jurídicos";

    const computedTotal = scopeItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const finalTotal = hasTotal ? Number(total_amount) : Number(ai.total_amount) || computedTotal;
    const downPayment = +(finalTotal * 0.5).toFixed(2);

    const proposal_structure = buildProposalMarkdown({
      business_unit,
      title: finalTitle,
      client_name,
      client_document,
      client_address,
      scope_description: ai.scope_description || "",
      scope_items: scopeItems,
      total_amount: finalTotal,
      down_payment_amount: downPayment,
      deadline_date: deadline_date || ai.deadline_date || null,
      language: lang,
    });

    const proposal = {
      title: finalTitle,
      service_type: ai.service_type,
      responsible_sector: ai.responsible_sector,
      scope_description: ai.scope_description,
      scope_items: scopeItems,
      total_amount: finalTotal,
      deadline_date: ai.deadline_date || deadline_date || null,
      payment_terms: ai.payment_terms || "",
      assumptions: ai.assumptions || [],
      suggested_pricing_items: ai.suggested_pricing_items || [],
      proposal_structure,
      source_language: lang,
    };

    return new Response(JSON.stringify({ proposal, model_used: model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-devis-proposal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
