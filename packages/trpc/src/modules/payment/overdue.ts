const startOfUtcDay = (date: Date) =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

export const startOfDueDay = (now: Date) => new Date(startOfUtcDay(now));

export const isOverdue = (dueDate: Date, now: Date = new Date()) =>
  dueDate.getTime() < startOfUtcDay(now);
