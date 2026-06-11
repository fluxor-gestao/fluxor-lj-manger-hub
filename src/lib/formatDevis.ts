/**
 * Helper para exibir o código comercial do Devis.
 * Garante que o usuário nunca veja o UUID interno.
 */
export function formatDevisCode(devisNumber: string | null | undefined, fallbackId?: string): string {
  if (devisNumber && devisNumber.trim().length > 0) {
    return devisNumber;
  }
  
  if (!fallbackId) return "S/N";

  // Se for um UUID (formato 8-4-4-4-12), pegamos apenas os primeiros 8 caracteres para um fallback seguro
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(fallbackId)) {
    return `DE-${fallbackId.slice(0, 8).toUpperCase()}`;
  }

  return fallbackId;
}

/**
 * Limpa a descrição removendo referências a UUIDs e substituindo pelo código do Devis.
 */
export function formatMovementDescription(description: string | null | undefined, devisNumber: string | null | undefined, devisId: string | null | undefined): string {
  if (!description) return "—";
  if (!devisId) return description;

  const code = formatDevisCode(devisNumber, devisId);
  const shortId = devisId.slice(0, 8);
  
  // Substitui #uuid por #código
  let result = description.replace(new RegExp(`#${shortId}[^\\s]*`, 'gi'), `#${code}`);
  
  // Caso não tenha o #, mas tenha o uuid solto ou parte dele
  result = result.replace(new RegExp(devisId, 'gi'), code);
  
  return result;
}
