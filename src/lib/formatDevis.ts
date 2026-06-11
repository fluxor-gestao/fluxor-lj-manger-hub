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
