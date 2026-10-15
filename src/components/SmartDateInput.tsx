import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

interface SmartDateInputProps {
  value: string; // ISO format: YYYY-MM-DD
  onChange: (isoDate: string) => void;
  fiscalYear?: number;
  className?: string;
  required?: boolean;
  placeholder?: string;
  onCtrlD?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}

/**
 * Smart Date Input: allows typing short expressions like "09-10", "09.10", "9-10", "15"
 * and auto-expands them like Excel into full dates (e.g. 09.10.2026).
 */
export const SmartDateInput: React.FC<SmartDateInputProps> = ({
  value,
  onChange,
  fiscalYear = new Date().getFullYear(),
  className = '',
  required = true,
  placeholder = 'GG.AA veya 09-10',
  onCtrlD,
  onKeyDown,
  inputRef
}) => {
  // Format YYYY-MM-DD to DD.MM.YYYY for display/typing
  const isoToDisplay = (iso: string): string => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return iso;
  };

  const [textValue, setTextValue] = useState(() => isoToDisplay(value));
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTextValue(isoToDisplay(value));
  }, [value]);

  /**
   * Parse user input like "09-10", "09.10", "9/10", "0910", "09-10-26", "09.10.2026"
   */
  const parseAndApply = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const currentYear = fiscalYear && fiscalYear > 1900 ? fiscalYear : new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    let day = 0;
    let month = 0;
    let year = currentYear;

    // Replace slashes and dashes with dots for standard processing
    const normalized = trimmed.replace(/[/\\-]/g, '.');
    const parts = normalized.split('.').filter(Boolean);

    if (parts.length === 1) {
      // e.g. "09" or "9" -> Day 9 of current month and active fiscal year
      const num = parseInt(parts[0], 10);
      if (num >= 1 && num <= 31) {
        day = num;
        month = currentMonth;
        year = currentYear;
      } else if (parts[0].length === 4) {
        // e.g. "0910" -> 09.10
        const d = parseInt(parts[0].substring(0, 2), 10);
        const m = parseInt(parts[0].substring(2, 4), 10);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
          day = d;
          month = m;
          year = currentYear;
        }
      }
    } else if (parts.length === 2) {
      // e.g. "09.10" or "9.10" or "09-10" (user typed day and month)
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        day = d;
        month = m;
        year = currentYear;
      }
    } else if (parts.length === 3) {
      // e.g. "09.10.26" or "09.10.2026"
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      let y = parseInt(parts[2], 10);
      if (y < 100) {
        y += 2000;
      }
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1970 && y <= 2100) {
        day = d;
        month = m;
        year = y;
      }
    }

    if (day > 0 && month > 0 && year > 0) {
      const dStr = day.toString().padStart(2, '0');
      const mStr = month.toString().padStart(2, '0');
      const yStr = year.toString();
      const iso = `${yStr}-${mStr}-${dStr}`;
      onChange(iso);
      setTextValue(`${dStr}.${mStr}.${yStr}`);
    } else {
      // If parsing failed, keep previous value or sync
      setTextValue(isoToDisplay(value));
    }
  };

  const handleBlur = () => {
    parseAndApply(textValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Intercept Ctrl+D / Cmd+D for Excel Fill-Down
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      e.stopPropagation();
      onCtrlD?.();
      return;
    }

    if (onKeyDown) {
      onKeyDown(e);
      if (e.defaultPrevented) return;
    }

    if (e.key === 'Enter') {
      parseAndApply(textValue);
    }
  };

  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onChange(e.target.value);
      setTextValue(isoToDisplay(e.target.value));
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        ref={(el) => {
          (internalInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
          if (typeof inputRef === 'function') {
            inputRef(el);
          } else if (inputRef) {
            (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
          }
        }}
        type="text"
        required={required}
        placeholder={placeholder}
        value={textValue}
        onChange={(e) => setTextValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full font-mono text-xs pr-7 transition-all ${className}`}
        title="Excel gibi '09-10' yazıp Enter'a basabilir veya Ctrl+D ile üst satırın tarihini alabilirsiniz"
      />

      {/* Mini Calendar Picker Trigger */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => {
          if (hiddenDateInputRef.current) {
            try {
              hiddenDateInputRef.current.showPicker();
            } catch {
              hiddenDateInputRef.current.focus();
            }
          }
        }}
        className="absolute right-1.5 p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded"
        title="Takvimden Seç"
      >
        <Calendar className="w-3.5 h-3.5" />
      </button>

      {/* Hidden native input for date picker modal */}
      <input
        ref={hiddenDateInputRef}
        type="date"
        tabIndex={-1}
        value={value}
        onChange={handleNativePickerChange}
        className="sr-only"
        aria-hidden="true"
      />
    </div>
  );
};
