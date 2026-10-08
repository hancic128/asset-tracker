import { useState, useMemo } from 'react';
import {
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Subscription, Status } from '@/lib/types';
import {
  fmtDate,
  isExpiringSoon,
  statusClass,
  statusLabel,
  getSortedFiltered,
  paginate,
  isExpiredSub,
  currencySymbol,
} from '@/lib/utils';
import Select, { type SelectOption } from './Select';
import Switch from './Switch';

type SortKey = 'name' | 'amount' | 'end_date' | 'category' | 'status';
const PAGE_SIZE = 5;

interface Props {
  subs: Subscription[];
  search: string;
  onSearch: (s: string) => void;
  filter: string;
  onFilter: (s: string) => void;
  filterCategory: string;
  onFilterCategory: (s: string) => void;
  categories: string[];
  showExpired: boolean;
  onShowExpired: (v: boolean) => void;
  onEdit: (s: Subscription) => void;
  onDelete: (s: Subscription) => void;
  onRenew?: (s: Subscription) => void;
}

const statusOpts = (t: (k: string) => string): SelectOption[] => [
  { value: 'all', label: t('status.all') },
  { value: 'active', label: t('status.active') },
  { value: 'paused', label: t('status.paused') },
  { value: 'cancelled', label: t('status.cancelled') },
];

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 text-ink-400" />;
  return dir === 'asc' ? (
    <ArrowUp className="w-3 h-3 text-brand-600" />
  ) : (
    <ArrowDown className="w-3 h-3 text-brand-600" />
  );
}

export default function SubscriptionTable({
  subs,
  search,
  onSearch,
  filter,
  onFilter,
  filterCategory,
  onFilterCategory,
  categories,
  showExpired,
  onShowExpired,
  onEdit,
  onDelete,
  onRenew,
}: Props) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('end_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const visible = useMemo(() => subs.filter((it) => showExpired || !isExpiredSub(it)), [subs, showExpired]);

  const sorted = useMemo(
    () => getSortedFiltered(visible, sortKey, sortDir, search, filter, ['name', 'category'], filterCategory),
    [visible, sortKey, sortDir, search, filter, filterCategory],
  );
  const pg = useMemo(() => paginate(sorted, page, PAGE_SIZE), [sorted, page]);

  const clickSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('asc');
    }
    setPage(1);
  };

  if (pg.slice.length === 0) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                onSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t('table.search')}
              className="w-full bg-surface-1 border border-[color:var(--surface-3)] pl-8 pr-3 py-1.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 outline-none transition-colors"
            />
          </div>
          <Select
            value={filter}
            onChange={(v) => {
              onFilter(v);
              setPage(1);
            }}
            options={statusOpts(t)}
            className="sm:w-48"
            ariaLabel="filter"
          />
          <Select
            value={filterCategory}
            onChange={(v) => {
              onFilterCategory(v);
              setPage(1);
            }}
            options={[
              { value: 'all', label: t('table.filterAllCat') },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
            className="sm:w-40"
            ariaLabel="filter-category"
          />
          <Switch
            checked={showExpired}
            onChange={onShowExpired}
            label={t('table.showExpired')}
            ariaLabel="show-expired"
          />
        </div>
        <div className="text-center py-12 text-ink-500">
          <Pencil className="w-12 h-12 mx-auto mb-3 text-ink-400" />
          <p className="text-sm">{t('table.empty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-4">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              onSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('table.search')}
            className="w-full bg-surface-1 border border-[color:var(--surface-3)] pl-8 pr-3 py-1.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 outline-none transition-colors"
          />
        </div>
        <Select
          value={filter}
          onChange={(v) => {
            onFilter(v);
            setPage(1);
          }}
          options={statusOpts(t)}
          className="sm:w-48"
          ariaLabel="filter"
        />
        <Select
          value={filterCategory}
          onChange={(v) => {
            onFilterCategory(v);
            setPage(1);
          }}
          options={[
            { value: 'all', label: t('table.filterAllCat') },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
          className="sm:w-40"
          ariaLabel="filter-category"
        />
        <Switch
          checked={showExpired}
          onChange={onShowExpired}
          label={t('table.showExpired')}
          ariaLabel="show-expired"
        />
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-ink-500 border-b border-[color:var(--surface-3)]">
              <th className="py-3 px-3 font-medium">
                <button
                  onClick={() => clickSort('name')}
                  className="inline-flex items-center gap-1 hover:text-ink-700 transition-colors"
                >
                  {t('table.name')} <SortIcon active={sortKey === 'name'} dir={sortDir} />
                </button>
              </th>
              <th className="py-3 px-3 font-medium text-right">
                <button
                  onClick={() => clickSort('amount')}
                  className="inline-flex items-center gap-1 hover:text-ink-700 transition-colors"
                >
                  {t('table.amount')} <SortIcon active={sortKey === 'amount'} dir={sortDir} />
                </button>
              </th>
              <th className="py-3 px-3 font-medium text-right hidden md:table-cell">{t('table.daily')}</th>
              <th className="py-3 px-3 font-medium">
                <button
                  onClick={() => clickSort('end_date')}
                  className="inline-flex items-center gap-1 hover:text-ink-700 transition-colors"
                >
                  {t('table.nextBilling')} <SortIcon active={sortKey === 'end_date'} dir={sortDir} />
                </button>
              </th>
              <th className="py-3 px-3 font-medium hidden md:table-cell">
                <button
                  onClick={() => clickSort('category')}
                  className="inline-flex items-center gap-1 hover:text-ink-700 transition-colors"
                >
                  {t('table.category')} <SortIcon active={sortKey === 'category'} dir={sortDir} />
                </button>
              </th>
              <th className="py-3 px-3 font-medium">
                <button
                  onClick={() => clickSort('status')}
                  className="inline-flex items-center gap-1 hover:text-ink-700 transition-colors"
                >
                  {t('table.status')} <SortIcon active={sortKey === 'status'} dir={sortDir} />
                </button>
              </th>
              <th className="py-3 px-3 font-medium text-right">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--surface-3)]">
            {pg.slice.map((s) => {
              const daily = Number(s.amount) / Math.max(1, Number(s.period_days));
              const expiring = s.status === 'active' && isExpiringSoon(s.end_date);
              return (
                <tr key={s.id ?? s.name} className="hover:bg-surface-1 transition-colors">
                  <td className="py-3 px-3 font-medium text-ink-900">{s.name}</td>
                  <td className="py-3 px-3 text-right num">
                    {currencySymbol(s.currency)}
                    {Number(s.amount).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right text-ink-500 num hidden md:table-cell">
                    {currencySymbol(s.currency)}
                    {daily.toFixed(2)}
                  </td>
                  <td className={`py-3 px-3 ${expiring ? 'text-warn font-medium' : ''}`}>{fmtDate(s.end_date)}</td>
                  <td className="py-3 px-3 text-ink-500 hidden md:table-cell">{s.category || '—'}</td>
                  <td className="py-3 px-3">
                    <span className={`text-xs font-medium px-2 py-0.5 ${statusClass(s.status as Status)}`}>
                      {statusLabel(s.status, t)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => onEdit(s)}
                      aria-label={t('table.edit')}
                      className="w-8 h-8 text-ink-500 hover:text-brand-600 hover:bg-surface-2  inline-flex items-center justify-center transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {onRenew && (
                      <button
                        onClick={() => onRenew(s)}
                        aria-label={t('action.renew')}
                        title={t('action.renew')}
                        className="w-8 h-8 text-ink-500 hover:text-brand-600 hover:bg-surface-2 inline-flex items-center justify-center transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(s)}
                      aria-label={t('table.delete')}
                      className="w-8 h-8 text-ink-500 hover:text-danger hover:bg-danger-soft  inline-flex items-center justify-center transition-colors ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-3 text-xs text-ink-500">
        <span>{t('table.total', { n: pg.total })}</span>
        <span>{t('table.page', { page: pg.page, total: pg.totalPages })}</span>
      </div>
      {pg.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[color:var(--surface-3)]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-surface-2 transition-colors flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> {t('table.prev')}
          </button>
          <div className="flex gap-1">
            {Array.from({ length: pg.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-surface-2 '}`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(pg.totalPages, p + 1))}
            disabled={page === pg.totalPages}
            className="px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-surface-2 transition-colors flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t('table.next')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
