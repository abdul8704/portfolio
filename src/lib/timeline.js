// Timeline maths: month parsing, the period label, and the branch layout
// (which entry sits on which lane, and where every bar and label goes).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** "2025-06" -> month index (year * 12 + month0). */
const idx = (ym) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;
const ym = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
const nowIdx = () => {
  const d = new Date();
  return d.getFullYear() * 12 + d.getMonth();
};
export const fmtMonth = (s) => (MONTH_RE.test(s || '') ? `${MONTHS[Number(s.slice(5, 7)) - 1]} ${s.slice(0, 4)}` : '');

/** Human period, e.g. "Jun 2025 — Aug 2025" or "Aug 2023 — Present". */
export function periodText(start, end) {
  if (!MONTH_RE.test(start || '')) return '';
  return `${fmtMonth(start)} — ${MONTH_RE.test(end || '') ? fmtMonth(end) : 'Present'}`;
}

/** "3 mo", "1 yr", "2 yrs 4 mo". Inclusive of both months. */
export function durationText(months) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y} yr${y > 1 ? 's' : ''}`, m && `${m} mo`].filter(Boolean).join(' ') || '1 mo';
}

/**
 * Start/end for an entry. Entries saved before start/end existed only have the
 * free-text period ("2021 — 2025", "2025 — Present"); read the years out of it.
 */
export function range(t) {
  if (MONTH_RE.test(t.start || '')) {
    const s = idx(t.start);
    const e = MONTH_RE.test(t.end || '') ? idx(t.end) : null;
    return { s, e: e ?? Math.max(s, nowIdx()), present: e === null };
  }
  const years = String(t.period || '').match(/\b(19|20)\d{2}\b/g) || [];
  if (!years.length) return null;
  const s = Number(years[0]) * 12;
  const present = years.length < 2 || /present|now|current/i.test(t.period);
  const e = present ? Math.max(s, nowIdx()) : Number(years[1]) * 12 + 11;
  return { s, e: Math.max(s, e), present };
}

/** Start/end months for the editor, filled in from an old free-text period. */
export function legacyMonths(t) {
  const r = range(t);
  if (!r || MONTH_RE.test(t.start || '')) return {};
  return { start: ym(r.s), end: r.present ? '' : ym(r.e) };
}

/** The label shown for an entry: prefers start/end, falls back to the old text. */
export const entryPeriod = (t) => periodText(t.start, t.end) || t.period || '';

/**
 * Branch layout. Longest entries claim the main line (lane 0); anything that
 * overlaps an entry already on a lane moves out to the next free lane, so a
 * stranger sees "this happened during that" at a glance.
 * Newest is at the top: y grows as time goes back.
 */
export function layoutTimeline(items, { pxPerMonthMax = 18, targetHeight = 820, labelH = 66, labelGap = 10 } = {}) {
  const rows = items
    .map((t) => ({ t, r: range(t) }))
    .filter((x) => x.r)
    .map(({ t, r }) => ({ t, ...r, months: r.e - r.s + 1 }));
  if (!rows.length) return null;

  // lanes: longest first, then earliest
  const lanes = [];
  [...rows].sort((a, b) => b.months - a.months || a.s - b.s).forEach((row) => {
    let lane = 0;
    while (lanes[lane]?.some((o) => row.s <= o.e && o.s <= row.e)) lane++;
    (lanes[lane] ||= []).push(row);
    row.lane = lane;
    // the entry it branches off from: the overlapping one on the lane just inside
    row.parent = lane > 0 ? lanes[lane - 1].find((o) => row.s <= o.e && o.s <= row.e) : null;
  });

  const first = Math.floor(Math.min(...rows.map((r) => r.s)) / 12) * 12; // Jan of first year
  const last = Math.floor(Math.max(...rows.map((r) => r.e), nowIdx()) / 12) * 12 + 11; // Dec of last year
  const span = last - first + 1;
  const ppm = Math.max(7, Math.min(pxPerMonthMax, targetHeight / span));
  const pad = 14;
  const y = (i) => pad + (last + 1 - i) * ppm; // top edge of month i's slot bottom
  const axisH = pad * 2 + span * ppm;

  for (const r of rows) {
    r.top = y(r.e + 1); // end of the last month
    r.bottom = y(r.s); // start of the first month
    r.mid = (r.top + r.bottom) / 2;
  }

  // labels sit beside their bar, nudged apart when bars are close in time
  const ordered = [...rows].sort((a, b) => a.mid - b.mid);
  let cursor = -Infinity;
  for (const r of ordered) {
    const want = r.mid - labelH / 2;
    r.labelY = Math.max(want, cursor, 0);
    cursor = r.labelY + labelH + labelGap;
  }
  const height = Math.max(axisH, cursor - labelGap);

  const years = [];
  for (let i = first; i <= last; i += 12) years.push({ year: i / 12, y: y(i + 6), line: y(i + 12) });
  const n = nowIdx();
  const now = n >= first && n <= last ? y(n + 1) : null;

  return {
    height,
    laneCount: lanes.length,
    years,
    now,
    rows: rows.map((r) => ({
      ...r,
      start: ym(r.s),
      label: entryPeriod(r.t),
      duration: durationText(r.months),
      parentLane: r.parent ? r.parent.lane : null,
    })),
  };
}
