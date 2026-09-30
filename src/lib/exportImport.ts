import type { Subscription, StoredValueCard } from './types';

export interface Backup {
  app: 'asset-tracker';
  version: 1;
  exportedAt: string;
  subscriptions: Subscription[];
  cards: StoredValueCard[];
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildBackup(subs: Subscription[], cards: StoredValueCard[]): Backup {
  return {
    app: 'asset-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    subscriptions: subs,
    cards,
  };
}

export function exportJson(subs: Subscription[], cards: StoredValueCard[]) {
  const backup = buildBackup(subs, cards);
  triggerDownload(`asset-tracker-backup-${stamp()}.json`, JSON.stringify(backup, null, 2), 'application/json');
  return backup.subscriptions.length + backup.cards.length;
}

const SUB_COLS = ['name', 'amount', 'period_days', 'end_date', 'category', 'status', 'notes'] as const;
const CARD_COLS = [
  'name',
  'type',
  'initial_amount',
  'remaining_amount',
  'initial_uses',
  'remaining_uses',
  'expires_at',
  'status',
  'notes',
] as const;

function csvCell(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Record<string, unknown>[], cols: readonly string[]): string {
  // BOM so Excel on Windows detects UTF-8
  const head = cols.join(',');
  const body = rows.map((r) => cols.map((c) => csvCell(r[c])).join(',')).join('\n');
  return `\uFEFF${head}\n${body}`;
}

export function exportCsv(subs: Subscription[], cards: StoredValueCard[]) {
  const s = stamp();
  triggerDownload(`subscriptions-${s}.csv`, toCsv(subs as unknown as Record<string, unknown>[], SUB_COLS), 'text/csv');
  // second download needs a beat so browsers don't drop it
  setTimeout(() => {
    triggerDownload(
      `stored-value-cards-${s}.csv`,
      toCsv(cards as unknown as Record<string, unknown>[], CARD_COLS),
      'text/csv',
    );
  }, 400);
  return subs.length + cards.length;
}

export async function parseImportFile(
  file: File,
): Promise<{ subscriptions: Subscription[]; cards: StoredValueCard[] }> {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('invalid_json');
  }
  const obj = data as Partial<Backup> & { subscriptions?: unknown; cards?: unknown };
  if (!obj || typeof obj !== 'object') throw new Error('invalid_shape');

  const subs = Array.isArray(obj.subscriptions) ? obj.subscriptions : null;
  const cards = Array.isArray(obj.cards) ? obj.cards : null;
  if (!subs && !cards) throw new Error('invalid_shape');

  const clean = <T>(rows: unknown[]): T[] =>
    rows.map((r) => {
      const { id, created_at, updated_at, ...rest } = r as Record<string, unknown>;
      return rest as T;
    });

  return {
    subscriptions: clean<Subscription>(subs ?? []),
    cards: clean<StoredValueCard>(cards ?? []),
  };
}
