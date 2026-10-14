// Days and hours in one time zone. GitHub returns commit times in UTC and
// drops the author's offset, while a calendar and a rhythm need a local day
// and hour; every card reads them in the zone it is given.

export const DAY = 24 * 3600 * 1000;
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** `day(t)` is the YYYY-MM-DD and `hour(t)` the 0–23 hour an instant falls on in `timeZone`. */
export function clock(timeZone) {
  let format;
  try {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    throw new Error(`Unknown time zone "${timeZone}" (use an IANA name such as Europe/Rome or UTC)`);
  }
  const parts = (t) => Object.fromEntries(format.formatToParts(new Date(t)).map((p) => [p.type, p.value]));
  return {
    day(t) {
      const p = parts(t);
      return `${p.year}-${p.month}-${p.day}`;
    },
    hour: (t) => Number(parts(t).hour) % 24,
  };
}

const dayMs = (day) => Date.parse(`${day}T00:00:00Z`);
export const addDays = (day, n) => new Date(dayMs(day) + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((dayMs(b) - dayMs(a)) / DAY);
/** Monday 0 … Sunday 6. */
export const weekday = (day) => (new Date(dayMs(day)).getUTCDay() + 6) % 7;

/** "Oct 14, 2026" for a YYYY-MM-DD. */
export function formatDay(day) {
  const [y, m, d] = day.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** How long ago a day was, counted in whole local days from `today`. */
export function ago(day, today) {
  const d = daysBetween(day, today);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 14) return "last week";
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`;
  if (d < 60) return "last month";
  if (d < 365) return `${Math.floor(d / 30)} months ago`;
  const y = Math.floor(d / 365);
  return y === 1 ? "last year" : `${y} years ago`;
}

/** A repository's age: "new", "5 months", "11 years". */
export function age(createdAt, now) {
  const from = new Date(createdAt);
  const to = new Date(now);
  const months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth()) -
    (to.getUTCDate() < from.getUTCDate() ? 1 : 0);
  if (months < 1) return "new";
  if (months < 24) return `${months} month${months === 1 ? "" : "s"}`;
  return `${Math.floor(months / 12)} years`;
}

/** How often releases come, from their dates newest first; null under two. */
export function cadence(dates) {
  const recent = dates.slice(0, 10);
  if (recent.length < 2) return null;
  const span = (Date.parse(recent[0]) - Date.parse(recent.at(-1))) / DAY;
  const every = span / (recent.length - 1);
  if (every < 1.5) return "One a day";
  if (every < 6.5) return `One every ${Math.round(every)} days`;
  if (every < 45) {
    const w = Math.round(every / 7);
    return w === 1 ? "One a week" : `One every ${w} weeks`;
  }
  const m = Math.round(every / 30);
  return m === 1 ? "One a month" : `One every ${m} months`;
}
