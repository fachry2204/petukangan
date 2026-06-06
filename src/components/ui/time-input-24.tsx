'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeInput24Props {
  id?: string;
  defaultValue?: string;
  className?: string;
  ariaLabel?: string;
}

function clampTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (!digits) return '';
  let hours = parseInt(digits.slice(0, 2) || '0', 10);
  let minutes = parseInt(digits.slice(2, 4) || '0', 10);
  if (isNaN(hours)) hours = 0;
  if (isNaN(minutes)) minutes = 0;
  hours = Math.min(23, Math.max(0, hours));
  minutes = Math.min(59, Math.max(0, minutes));
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function maskInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/**
 * 24-hour time input that always renders HH:MM regardless of browser locale.
 * Native <input type="time"> follows the OS/browser locale and may show AM/PM,
 * so this masked text input is used to guarantee a 24-hour format.
 */
export function TimeInput24({ id, defaultValue = '', className, ariaLabel }: TimeInput24Props) {
  const [value, setValue] = useState(maskInput(defaultValue));

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        id={id}
        aria-label={ariaLabel}
        placeholder="08:00"
        maxLength={5}
        value={value}
        onChange={(e) => setValue(maskInput(e.target.value))}
        onBlur={(e) => setValue(clampTime(e.target.value))}
        className={cn('tabular-nums', className)}
      />
      <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
    </span>
  );
}
