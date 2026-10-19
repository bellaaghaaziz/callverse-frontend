// Geometry and grouping behind the dashboards' charts. No React; tested in tests/workspace-ux.test.mjs.

// Bar lengths proportional to the largest value; a non-zero value never shrinks below a 4px stub.
export function barWidths(values: number[], max: number) {
  const top = Math.max(0, ...values);
  if (top <= 0) return values.map(() => 0);
  return values.map(value => (value <= 0 ? 0 : Math.max(4, Math.round((value / top) * max))));
}

export interface Share { key: string; value: number; percent: number; label: string }

// Part-to-whole: percentages that add up to 100, with French labels.
export function shareSegments(parts: { key: string; value: number }[]): Share[] {
  const total = parts.reduce((sum, part) => sum + Math.max(0, part.value), 0);
  return parts.map(part => {
    const percent = total > 0 ? (Math.max(0, part.value) / total) * 100 : 0;
    return { key: part.key, value: part.value, percent, label: `${Math.round(percent)} %` };
  });
}

export interface TrendPoint { x: number; y: number; value: number }

// Values onto a width×height plot: oldest on the left, newest on the right; 0 at the bottom.
export function trendPoints(values: number[], width: number, height: number): TrendPoint[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [{ x: width, y: height / 2, value: values[0] }];
  const low = Math.min(0, ...values);
  const high = Math.max(...values);
  const span = high - low;
  return values.map((value, index) => ({
    x: Math.round((index / (values.length - 1)) * width * 100) / 100,
    y: span === 0 ? height / 2 : Math.round((height - ((value - low) / span) * height) * 100) / 100,
    value,
  }));
}

export interface Sample { at: string; value: number }

// A rolling window of live snapshots: only newer ones are added, the oldest drop out.
export function pushSample(history: Sample[], sample: Sample, limit: number): Sample[] {
  const last = history[history.length - 1];
  if (last && sample.at <= last.at) return history;
  return [...history, sample].slice(-limit);
}

const KIND_LABELS: Record<string, string> = {
  CARD_PAYMENT: "Paiements par carte",
  DIRECT_DEBIT: "Prélèvements",
  TRANSFER_OUT: "Virements émis",
  ATM_WITHDRAWAL: "Retraits",
  FEE: "Frais bancaires",
};

// Where the money went over the last `days` days: booked or pending debits, grouped by kind.
export function spendingByKind(
  rows: { type: string; amount: number; status: string; bookedAt: string }[],
  now: Date,
  days: number,
) {
  const since = now.getTime() - days * 86400000;
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.amount >= 0 || row.status === "REJECTED" || Date.parse(row.bookedAt) < since) continue;
    totals.set(row.type, (totals.get(row.type) || 0) + Math.round(-row.amount * 100));
  }
  return [...totals.entries()]
    .map(([kind, cents]) => ({ kind, label: KIND_LABELS[kind] || "Autres dépenses", total: cents / 100 }))
    .sort((a, b) => b.total - a.total);
}
