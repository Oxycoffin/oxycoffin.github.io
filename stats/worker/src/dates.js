export function isoDay(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
}

export function addDays(day, amount) {
  const value = new Date(`${day}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return isoDay(value);
}

export function daysAgo(amount) {
  return addDays(isoDay(), -amount);
}

export function dayParts(day) {
  const [year, month, date] = day.split("-").map(Number);
  return { year, month, day: date };
}

export function ageMs(timestamp) {
  return timestamp ? Date.now() - new Date(timestamp).getTime() : Number.POSITIVE_INFINITY;
}

export function lastDays(count, ending = isoDay()) {
  return Array.from({ length: count }, (_, index) => addDays(ending, index - count + 1));
}
