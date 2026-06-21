export interface CutoffPeriod {
  start: string;
  end: string;
}

export function getCutoffPeriod(date: Date = new Date()): CutoffPeriod {
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();
  if (day >= 7 && day <= 20) {
    const start = `${year}-${String(month + 1).padStart(2, "0")}-07`;
    const end = `${year}-${String(month + 1).padStart(2, "0")}-20`;
    return { start, end };
  } else if (day >= 21) {
    const start = `${year}-${String(month + 1).padStart(2, "0")}-21`;
    const nextMonth = month + 1 > 11 ? 0 : month + 1;
    const nextYear = month + 1 > 11 ? year + 1 : year;
    const end = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-06`;
    return { start, end };
  } else {
    const prevMonth = month - 1 < 0 ? 11 : month - 1;
    const prevYear = month - 1 < 0 ? year - 1 : year;
    const start = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-21`;
    const end = `${year}-${String(month + 1).padStart(2, "0")}-06`;
    return { start, end };
  }
}

export function shiftPeriod(
  start: string,
  end: string,
  direction: "prev" | "next"
): CutoffPeriod {
  const startDate = new Date(start + "T00:00:00");
  const startDay = startDate.getDate();
  const year = startDate.getFullYear();
  const month = startDate.getMonth();

  if (startDay === 7) {
    // Currently in Period A (7th–20th)
    if (direction === "prev") {
      const prevMonth = month - 1 < 0 ? 11 : month - 1;
      const prevYear = month - 1 < 0 ? year - 1 : year;
      return {
        start: `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-21`,
        end: `${year}-${String(month + 1).padStart(2, "0")}-06`,
      };
    } else {
      const nextMonth = month + 1 > 11 ? 0 : month + 1;
      const nextYear = month + 1 > 11 ? year + 1 : year;
      return {
        start: `${year}-${String(month + 1).padStart(2, "0")}-21`,
        end: `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-06`,
      };
    }
  } else {
    // Currently in Period B (21st–6th)
    if (direction === "prev") {
      return {
        start: `${year}-${String(month + 1).padStart(2, "0")}-07`,
        end: `${year}-${String(month + 1).padStart(2, "0")}-20`,
      };
    } else {
      const nextMonth = month + 1 > 11 ? 0 : month + 1;
      const nextYear = month + 1 > 11 ? year + 1 : year;
      return {
        start: `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-07`,
        end: `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-20`,
      };
    }
  }
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
