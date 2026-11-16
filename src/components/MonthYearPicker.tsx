import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  LanguageCode,
  MONTH_NAMES_BY_LANG,
  SHORT_MONTHS_BY_LANG,
  UI_TEXT,
} from '../lib/i18n.ts';

interface MonthYearPickerProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
  align?: 'left' | 'center' | 'right';
  compact?: boolean;
  lang?: LanguageCode;
}

export function MonthYearPicker({
  month,
  year,
  onChange,
  align = 'center',
  compact = false,
  lang = 'id',
}: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'months' | 'years'>('months');
  const [viewYear, setViewYear] = useState(year);
  const [yearInput, setYearInput] = useState(String(year));
  const containerRef = useRef<HTMLDivElement>(null);

  const t = UI_TEXT[lang].picker;
  const monthNames = MONTH_NAMES_BY_LANG[lang];
  const shortMonths = SHORT_MONTHS_BY_LANG[lang];

  const now = new Date();
  const currentRealMonth = now.getMonth() + 1;
  const currentRealYear = now.getFullYear();

  useEffect(() => {
    setViewYear(year);
    setYearInput(String(year));
  }, [year]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleToggleOpen = () => {
    if (!open) {
      setViewYear(year);
      setYearInput(String(year));
      setViewMode('months');
    }
    setOpen((prev) => !prev);
  };

  const handleStepMonth = (delta: number) => {
    const target = new Date(year, month - 1 + delta, 1);
    onChange(target.getMonth() + 1, target.getFullYear());
  };

  const handleSelectMonth = (nextMonth: number) => {
    onChange(nextMonth, viewYear);
    setOpen(false);
  };

  const handleSelectYear = (nextYear: number) => {
    setViewYear(nextYear);
    setYearInput(String(nextYear));
    setViewMode('months');
  };

  const handleYearInputCommit = () => {
    const parsed = Number.parseInt(yearInput, 10);
    if (Number.isFinite(parsed) && parsed >= 1970 && parsed <= 2100) {
      setViewYear(parsed);
    } else {
      setYearInput(String(viewYear));
    }
  };

  const handleJumpToday = () => {
    onChange(currentRealMonth, currentRealYear);
    setViewYear(currentRealYear);
    setYearInput(String(currentRealYear));
    setOpen(false);
  };

  const decadeStart = Math.floor(viewYear / 12) * 12;
  const yearGrid = Array.from({ length: 12 }, (_, idx) => decadeStart + idx);

  const alignmentClass =
    align === 'left'
      ? 'left-0'
      : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => handleStepMonth(-1)}
          aria-label={t.prevMonth}
          title={t.prevMonth}
          className={`inline-flex items-center justify-center rounded-l-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100 ${
            compact ? 'h-8 w-7' : 'h-9 w-8'
          }`}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={handleToggleOpen}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={`${t.selectPeriod} (${monthNames[month - 1]} ${year})`}
          className={`inline-flex items-center gap-1.5 border-x border-slate-200 font-medium text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-700/70 whitespace-nowrap ${
            compact ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-xs sm:text-[13px]'
          }`}
        >
          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
          <span className="tabular-nums">
            {monthNames[month - 1]} {year}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => handleStepMonth(1)}
          aria-label={t.nextMonth}
          title={t.nextMonth}
          className={`inline-flex items-center justify-center rounded-r-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100 ${
            compact ? 'h-8 w-7' : 'h-9 w-8'
          }`}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label={t.dialogLabel}
          className={`absolute top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 ${alignmentClass}`}
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'months') {
                  const next = Math.max(1970, viewYear - 1);
                  setViewYear(next);
                  setYearInput(String(next));
                } else {
                  const next = Math.max(1970, viewYear - 12);
                  setViewYear(next);
                  setYearInput(String(next));
                }
              }}
              aria-label={viewMode === 'months' ? t.prevYear : t.prevDecade}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                setViewMode((prev) => (prev === 'months' ? 'years' : 'months'))
              }
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-100 tabular-nums dark:text-slate-100 dark:hover:bg-slate-800"
              title={viewMode === 'months' ? t.switchToYears : t.switchToMonths}
            >
              {viewMode === 'months'
                ? viewYear
                : `${decadeStart} – ${decadeStart + 11}`}
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                  viewMode === 'years' ? 'rotate-180' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => {
                if (viewMode === 'months') {
                  const next = Math.min(2100, viewYear + 1);
                  setViewYear(next);
                  setYearInput(String(next));
                } else {
                  const next = Math.min(2100, viewYear + 12);
                  setViewYear(next);
                  setYearInput(String(next));
                }
              }}
              aria-label={viewMode === 'months' ? t.nextYear : t.nextDecade}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {viewMode === 'years' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleYearInputCommit();
              }}
              className="mt-3 flex items-center gap-1.5"
            >
              <input
                type="number"
                min={1970}
                max={2100}
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                placeholder={t.yearPlaceholder}
                aria-label={t.yearAria}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 tabular-nums focus:border-slate-900 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {t.selectYearBtn}
              </button>
            </form>
          )}

          {viewMode === 'months' ? (
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {shortMonths.map((shortName, idx) => {
                const mNum = idx + 1;
                const isSelected = mNum === month && viewYear === year;
                const isCurrentReal =
                  mNum === currentRealMonth && viewYear === currentRealYear;

                return (
                  <button
                    key={monthNames[idx]}
                    type="button"
                    onClick={() => handleSelectMonth(mNum)}
                    aria-label={`${monthNames[idx]} ${viewYear}`}
                    className={`relative rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-slate-900 text-white font-semibold dark:bg-slate-100 dark:text-slate-900'
                        : isCurrentReal
                        ? 'border border-emerald-500/60 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {shortName}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {yearGrid.map((y) => {
                const isSelected = y === year;
                const isViewed = y === viewYear;
                const isCurrentReal = y === currentRealYear;

                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => handleSelectYear(y)}
                    className={`rounded-lg px-2 py-2 text-xs font-medium tabular-nums transition-colors ${
                      isSelected
                        ? 'bg-slate-900 text-white font-semibold dark:bg-slate-100 dark:text-slate-900'
                        : isViewed
                        ? 'border border-slate-400 bg-slate-100 text-slate-900 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100'
                        : isCurrentReal
                        ? 'border border-emerald-500/60 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
            <button
              type="button"
              onClick={handleJumpToday}
              className="rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
            >
              {t.thisMonth}
            </button>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {viewMode === 'months' ? t.hintMonths : t.hintYears}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
