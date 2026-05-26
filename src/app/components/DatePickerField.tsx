import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface DatePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
}

function parseDateValue(value: string) {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_RANGE_HALF = 10;

export function DatePickerField({
  value,
  onChange,
  placeholder = 'Selecciona una fecha',
  disabled = false,
  minDate,
  maxDate,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'year'>('calendar');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => parseDateValue(value) ?? new Date());
  const [yearPage, setYearPage] = useState(0);

  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const minDateValue = useMemo(() => parseDateValue(minDate ?? ''), [minDate]);
  const maxDateValue = useMemo(() => parseDateValue(maxDate ?? ''), [maxDate]);
  const buttonLabel = selectedDate
    ? format(selectedDate, "dd 'de' MMM yyyy", { locale: es })
    : placeholder;

  const isDateDisabled = (date: Date) => {
    if (minDateValue && date < minDateValue) return true;
    if (maxDateValue && date > maxDateValue) return true;
    return false;
  };

  const yearRangeStart = CURRENT_YEAR - YEAR_RANGE_HALF + yearPage * 20;
  const years = Array.from({ length: 20 }, (_, i) => yearRangeStart + i);

  const handleYearSelect = (year: number) => {
    const newMonth = new Date(calendarMonth);
    newMonth.setFullYear(year);
    setCalendarMonth(newMonth);
    setViewMode('calendar');
  };

  return (
    <Popover open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) setViewMode('calendar'); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex h-9 w-full items-center justify-between rounded-[4px] border border-border bg-surface-secondary px-3 text-left text-[12px] font-normal text-foreground transition-colors hover:bg-accent/60 disabled:opacity-50"
        >
          <span className={selectedDate ? 'text-foreground' : 'text-muted-foreground'}>{buttonLabel}</span>
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto rounded-[6px] border-border bg-card p-0 shadow-xl">
        {viewMode === 'year' ? (
          <div className="p-3 w-[240px]">
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => setYearPage((p) => p - 1)} className="p-1 rounded hover:bg-accent/60">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[12px] font-medium text-foreground">{yearRangeStart} – {yearRangeStart + 19}</span>
              <button type="button" onClick={() => setYearPage((p) => p + 1)} className="p-1 rounded hover:bg-accent/60">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleYearSelect(year)}
                  className={`h-8 rounded-[3px] text-[11px] font-medium transition-colors ${
                    year === calendarMonth.getFullYear()
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent/60 text-foreground'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className="mt-2 w-full h-7 text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-[3px] hover:bg-accent/30 transition-colors"
            >
              Volver al calendario
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-center gap-2 px-3 pt-3 pb-1">
              <button
                type="button"
                onClick={() => setViewMode('year')}
                className="text-[12px] font-semibold text-foreground hover:text-primary transition-colors px-2 py-0.5 rounded hover:bg-accent/30"
              >
                {format(calendarMonth, 'yyyy')}
              </button>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              disabled={isDateDisabled}
              onSelect={(date) => {
                if (!date) return;
                if (isDateDisabled(date)) return;
                onChange(format(date, 'yyyy-MM-dd'));
                setOpen(false);
              }}
              initialFocus
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}