export interface CutoffPeriod {
  start: string;
  end: string;
}

export function getCutoffPeriod(date: Date = new Date()): CutoffPeriod {
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();
  if (day >= 6 && day < 20) {
    const start = `${year}-${String(month + 1).padStart(2, "0")}-06`;
    const end = `${year}-${String(month + 1).padStart(2, "0")}-20`;
    return { start, end };
  } else if (day >= 20) {
    const start = `${year}-${String(month + 1).padStart(2, "0")}-20`;
    const nextMonth = month + 1 > 11 ? 0 : month + 1;
    const nextYear = month + 1 > 11 ? year + 1 : year;
    const end = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-06`;
    return { start, end };
  } else {
    const prevMonth = month - 1 < 0 ? 11 : month - 1;
    const prevYear = month - 1 < 0 ? year - 1 : year;
    const start = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-20`;
    const end = `${year}-${String(month + 1).padStart(2, "0")}-06`;
    return { start, end };
  }
}

function daysAfterMidnight(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  return d.getTime() / 86400000;
}

export function shiftPeriod(
  start: string,
  end: string,
  direction: "prev" | "next"
): CutoffPeriod {
  const startDays = daysAfterMidnight(start);
  const endDays = daysAfterMidnight(end);
  const span = endDays - startDays;

  if (direction === "prev") {
    const newEndDays = startDays - 1;
    const newEnd = dateStrFromDays(newEndDays);
    const newStartDays = newEndDays - span;
    return { start: dateStrFromDays(newStartDays), end: newEnd };
  } else {
    const newStartDays = endDays + 1;
    const newStart = dateStrFromDays(newStartDays);
    const newEndDays = newStartDays + span;
    return { start: newStart, end: dateStrFromDays(newEndDays) };
  }
}

function dateStrFromDays(days: number): string {
  const d = new Date(days * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isCurrentPeriod(start: string, end: string): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return today >= start && today <= end;
}

export function isAfterToday(dateStr: string): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return dateStr > today;
}
