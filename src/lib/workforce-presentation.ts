export function workforceWaitLabel(value: number | undefined): string {
  if (value == null || !Number.isFinite(value) || value < 0) return "—";
  const seconds = Math.round(value);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const remainder = seconds % 60;
  if (hours) return `${hours} h ${minutes} min${remainder ? ` ${remainder} s` : ""}`;
  if (minutes) return `${minutes} min${remainder ? ` ${remainder} s` : ""}`;
  return `${seconds} s`;
}

export function workforceNoTransferTitle(queues: Record<string, number>): string {
  return Object.values(queues).some(count => count > 0)
    ? "Files en attente : revue nécessaire"
    : "Aucun renfort nécessaire";
}
