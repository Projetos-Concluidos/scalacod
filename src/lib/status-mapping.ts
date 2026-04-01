/**
 * Mapeamento bidirecional de status entre Logzz e ScalaNinja.
 */

export const LOGZZ_TO_SCALANINJA: Record<string, string> = {
  // Pendente / Inicial
  'Pendente': 'Aguardando',
  'Em aberto': 'Aguardando',
  'Aguardando': 'Aguardando',
  'A enviar': 'Aguardando',
  
  // Confirmado
  'Confirmado': 'Confirmado',
  
  // Agendado (criado com sucesso na Logzz)
  'Agendado': 'Agendado',
  'Reagendado': 'Agendado',
  
  // Separação
  'Em separação': 'Em Separação',
  'Separado': 'Separado',
  
  // Em trânsito
  'Enviado': 'Em Rota',
  'Em Rota': 'Em Rota',
  'A caminho': 'Em Rota',
  'Saiu para entrega': 'Em Rota',
  'Enviando': 'Em Rota',
  
  // Entregue
  'Entregue': 'Entregue',
  'Completo': 'Entregue',
  
  // Problemas
  'Frustrado': 'Frustrado',
  'Tentativa frustrada': 'Frustrado',
  'Atrasado': 'Frustrado',
  'Sem sucesso': 'Frustrado',
  
  // Reagendar
  'A reagendar': 'Reagendar',
  
  // Cancelado / Reembolsado
  'Cancelado': 'Cancelado',
  'Reembolsado': 'Reembolsado',
  'Reembolso em andamento': 'Reembolsado',
  
  // Especiais
  'Estoque insuficiente': 'Cancelado',
  'Aguardando retirada na agência': 'Em Rota',
  
  // Inglês (Logzz também envia em inglês às vezes)
  'pending': 'Aguardando',
  'confirmed': 'Confirmado',
  'scheduled': 'Agendado',
  'separated': 'Em Separação',
  'in_route': 'Em Rota',
  'delivered': 'Entregue',
  'frustrated': 'Frustrado',
  'canceled': 'Cancelado',
  'rescheduled': 'Reagendar',
};

export function mapLogzzToScalaNinja(logzzStatus: string): string {
  if (!logzzStatus) return 'Aguardando';
  
  // Busca exata
  if (LOGZZ_TO_SCALANINJA[logzzStatus]) {
    return LOGZZ_TO_SCALANINJA[logzzStatus];
  }
  
  // Busca case-insensitive
  const lower = logzzStatus.toLowerCase();
  for (const [key, value] of Object.entries(LOGZZ_TO_SCALANINJA)) {
    if (key.toLowerCase() === lower) return value;
  }
  
  // Busca parcial (ex: "Em rota - atraso" → "Em Rota")
  if (lower.includes('entregue') || lower.includes('completo')) return 'Entregue';
  if (lower.includes('rota') || lower.includes('caminho') || lower.includes('enviado')) return 'Em Rota';
  if (lower.includes('frustr') || lower.includes('tentativa')) return 'Frustrado';
  if (lower.includes('cancela')) return 'Cancelado';
  if (lower.includes('separa')) return 'Em Separação';
  if (lower.includes('agendado')) return 'Agendado';
  
  // Default: manter status original
  if (import.meta.env.DEV) console.warn('[StatusMap] Status Logzz não mapeado:', logzzStatus);
  return logzzStatus;
}

export const SCALANINJA_TO_LOGZZ: Record<string, string> = {
  'Aguardando': 'pending',
  'Confirmado': 'confirmed',
  'Aprovado': 'confirmed',
  'Agendado': 'scheduled',
  'Em Separação': 'separated',
  'Separado': 'separated',
  'Em Rota': 'in_route',
  'Entregue': 'delivered',
  'Frustrado': 'frustrated',
  'Reagendar': 'rescheduled',
  'Cancelado': 'canceled',
  'Reembolsado': 'refunded',
  'Coinzz Enviado': 'in_route', // pedidos Coinzz
};

export function mapScalaNinjaToLogzz(scalaNinjaStatus: string): string {
  return SCALANINJA_TO_LOGZZ[scalaNinjaStatus] || 'pending';
}

/** All valid ScalaNinja statuses for UI display */
export const SCALANINJA_STATUSES = [
  'Aguardando',
  'Confirmado',
  'Agendado',
  'Em Separação',
  'Separado',
  'Em Rota',
  'Entregue',
  'Frustrado',
  'Reagendar',
  'Cancelado',
  'Reembolsado',
] as const;

export type ScalaNinjaStatus = typeof SCALANINJA_STATUSES[number];

/** Status color mapping for UI badges */
export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Aguardando': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'Confirmado': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'Agendado': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  'Em Separação': { bg: 'bg-purple-100', text: 'text-purple-800' },
  'Separado': { bg: 'bg-violet-100', text: 'text-violet-800' },
  'Em Rota': { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  'Entregue': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  'Frustrado': { bg: 'bg-red-100', text: 'text-red-800' },
  'Reagendar': { bg: 'bg-orange-100', text: 'text-orange-800' },
  'Cancelado': { bg: 'bg-gray-100', text: 'text-gray-800' },
  'Reembolsado': { bg: 'bg-pink-100', text: 'text-pink-800' },
};
