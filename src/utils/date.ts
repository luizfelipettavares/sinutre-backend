// O servidor em produção (Railway) roda em UTC, mas o usuário registra
// refeições no fuso local. Sem esse ajuste, uma refeição às 22h de um dia
// cairia no dia seguinte nos agrupamentos por data.
const OFFSET_MINUTES = Number(process.env.TIMEZONE_OFFSET_MINUTES ?? -180);

// Converte um Date para a chave "YYYY-MM-DD" do dia no fuso configurado.
export function toLocalDateKey(date: Date): string {
  const shifted = new Date(date.getTime() + OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

// Instante que corresponde à meia-noite local de N dias atrás.
export function startOfLocalDayAgo(daysAgo: number): Date {
  const now = new Date();
  const shifted = new Date(now.getTime() + OFFSET_MINUTES * 60_000);

  shifted.setUTCHours(0, 0, 0, 0);
  shifted.setUTCDate(shifted.getUTCDate() - daysAgo);

  return new Date(shifted.getTime() - OFFSET_MINUTES * 60_000);
}

// Lista das chaves "YYYY-MM-DD" dos últimos N dias, do mais antigo ao mais recente.
export function lastLocalDateKeys(days: number): string[] {
  const keys: string[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(toLocalDateKey(startOfLocalDayAgo(i)));
  }

  return keys;
}
