"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date?: Date | null;
  onSelect: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  date,
  onSelect,
  placeholder = "Pilih tanggal",
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(date || new Date());
  const [showMonthDropdown, setShowMonthDropdown] = React.useState(false);
  const [showYearDropdown, setShowYearDropdown] = React.useState(false);
  const monthDropdownRef = React.useRef<HTMLDivElement>(null);
  const yearDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setShowMonthDropdown(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setShowYearDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onSelect(selectedDate);
      setOpen(false);
    }
  };

  const handleToday = () => {
    const today = new Date();
    onSelect(today);
    setOpen(false);
  };

  const handlePrevMonth = () => {
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  };

  const handleMonthSelect = (monthIndex: number) => {
    setMonth(new Date(month.getFullYear(), monthIndex, 1));
    setShowMonthDropdown(false);
  };

  const handleYearSelect = (year: number) => {
    setMonth(new Date(year, month.getMonth(), 1));
    setShowYearDropdown(false);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const days = [];
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const prevLastDay = new Date(month.getFullYear(), month.getMonth(), 0);
    const firstDayOfWeek = firstDay.getDay(); // 0 is Sunday
    const lastDateOfPrevMonth = prevLastDay.getDate();

    // Previous month days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(
        <div
          key={`prev-${i}`}
          className="h-10 w-10 flex items-center justify-center text-zinc-300"
        >
          {lastDateOfPrevMonth - i}
        </div>
      );
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const currentDate = new Date(month.getFullYear(), month.getMonth(), i);
      const isSelected = date && format(currentDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
      
      days.push(
        <div
          key={`current-${i}`}
          className={cn(
            "h-10 w-10 flex items-center justify-center cursor-pointer rounded-lg transition-colors",
            isSelected && "bg-zinc-900 text-white",
            isToday && !isSelected && "bg-zinc-100 text-zinc-900 font-semibold",
            !isSelected && !isToday && "hover:bg-zinc-100"
          )}
          onClick={() => handleSelect(currentDate)}
        >
          {i}
        </div>
      );
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(
        <div
          key={`next-${i}`}
          className="h-10 w-10 flex items-center justify-center text-zinc-300"
        >
          {i}
        </div>
      );
    }

    return days;
  };

  const weekdays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

  // Generate year range from 1900 to current year + 10
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 10 }, (_, i) => 1900 + i);

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setShowMonthDropdown(false);
        setShowYearDropdown(false);
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal rounded-xl h-14 text-base px-4",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd-MM-yyyy", { locale: id }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-2xl shadow-lg" align="start">
        <div className="p-4 bg-white rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-zinc-600" />
            </button>

            <div className="flex items-center gap-2 relative">
              <div className="relative" ref={monthDropdownRef}>
                <button
                  onClick={() => {
                    setShowMonthDropdown(!showMonthDropdown);
                    setShowYearDropdown(false);
                  }}
                  className="px-4 py-1.5 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
                >
                  {monthNames[month.getMonth()]}
                </button>
                {showMonthDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-32 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {monthNames.map((name, index) => (
                      <button
                        key={index}
                        onClick={() => handleMonthSelect(index)}
                        className={cn(
                          "w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 transition-colors",
                          index === month.getMonth() && "bg-zinc-100 font-medium"
                        )}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative" ref={yearDropdownRef}>
                <button
                  onClick={() => {
                    setShowYearDropdown(!showYearDropdown);
                    setShowMonthDropdown(false);
                  }}
                  className="px-4 py-1.5 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
                >
                  {month.getFullYear()}
                </button>
                {showYearDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-24 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {years.map((year) => (
                      <button
                        key={year}
                        onClick={() => handleYearSelect(year)}
                        className={cn(
                          "w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 transition-colors",
                          year === month.getFullYear() && "bg-zinc-100 font-medium"
                        )}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-zinc-600" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 mb-2">
            {weekdays.map((day, index) => (
              <div
                key={index}
                className="h-10 w-10 flex items-center justify-center text-xs font-semibold text-zinc-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1 mb-6">
            {generateCalendarDays()}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleToday}
              className="flex-1 h-11 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Hari ini
            </Button>
            <Button
              onClick={() => setOpen(false)}
              className="flex-1 h-11 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium"
            >
              Terapkan
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
