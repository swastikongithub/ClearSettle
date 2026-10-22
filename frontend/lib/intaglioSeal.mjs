// The Intaglio seal on the public landing page (/welcome/, D-UI-15): its geometry, computed from the illustrative
// records in landingExample.mjs. Each ring is one record of the example payment. A ring's divisions are that
// record's own amounts, so a ring that closes is arithmetic that closes. Amounts stay whole paise; floating point
// is used only for drawing angles, never for money.

import {
  BANK_CREDIT, CASES, JOURNAL, ORDER, PAYMENT, PAYOUT, REFS, SETTLEMENT_LINE, caseDifference, inr,
} from "./landingExample.mjs";

/** FNV-1a (32-bit): a stable seed from a record's reference, so the same records always cut the same seal. */
export function seedOf(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Splits a total into arcs, each a fraction of the whole turn. Throws unless the parts add up exactly. */
function arcs(parts, totalPaise, share = 1) {
  const sum = parts.reduce((s, p) => s + p.paise, 0);
  if (sum !== totalPaise) throw new Error(`parts ${sum} do not add up to ${totalPaise}`);
  return parts.map((p) => ({ ...p, turn: (p.paise / totalPaise) * share }));
}

/**
 * The engraving of one ring: a family of interlaced sinusoidal lines (r = base ± a·sin(pθ + φ) + b·sin(qθ)),
 * the classic guilloché construction. Petal counts grow outward with the circumference; the seed varies the
 * secondary harmonic and the twist, so no two records engrave alike.
 */
function pattern(ref, index) {
  const s = seedOf(ref);
  const petals = [9, 12, 16, 20, 24, 30][index] + (s % 3);
  return {
    petals,
    harmonic: petals * 2 + 1 + ((s >>> 3) % 4),
    harmonicGain: 0.16 + ((s >>> 7) % 5) * 0.03,
    lines: 11 + ((s >>> 11) % 4),
    twist: 1 + ((s >>> 15) % 3),
    phase: ((s >>> 19) % 360) * (Math.PI / 180),
  };
}

const repeatTo = (text, min = 260) => {
  let out = "";
  while (out.length < min) out += text;
  return out;
};

const debits = JOURNAL.lines.filter((l) => l.debitPaise).map((l) => ({ label: `Dr ${l.account}`, paise: l.debitPaise }));
const credits = JOURNAL.lines.filter((l) => l.creditPaise).map((l) => ({ label: `Cr ${l.account}`, paise: l.creditPaise }));
const debitTotal = debits.reduce((s, l) => s + l.paise, 0);
const creditTotal = credits.reduce((s, l) => s + l.paise, 0);

/** The medallion at the centre carries the payment's amount in raised numerals. */
export const MEDALLION = { r1: 0.2, z: 0.118, text: inr(PAYMENT.amountMinor) };

/** The registration angle: every ring's notch points here when its record agrees with the others. */
export const REGISTER = (128 * Math.PI) / 180;

/**
 * The six rings, inner to outer: radii are fractions of the seal's radius; heights step down from the centre
 * like a die. `divisions` are engraved marks that split a ring by the record's own amounts.
 */
export const RINGS = [
  {
    id: "order",
    name: "Order",
    source: "Store orders export",
    ref: REFS.order,
    amountPaise: ORDER.totalPaise,
    r0: 0.222, r1: 0.332, z: 0.1,
    divisions: arcs([{ label: "Order total", paise: ORDER.totalPaise }], ORDER.totalPaise),
    microtext: repeatTo(`${REFS.order} PLACED ${ORDER.placedAt} TOTAL ${inr(ORDER.totalPaise)} INR   `),
  },
  {
    id: "payment",
    name: "Payment",
    source: "Gateway transactions report",
    ref: REFS.payment,
    amountPaise: PAYMENT.amountMinor,
    r0: 0.346, r1: 0.456, z: 0.084,
    divisions: arcs([{ label: "Captured", paise: PAYMENT.amountMinor }], PAYMENT.amountMinor),
    microtext: repeatTo(`${REFS.payment} ${PAYMENT.status} ${PAYMENT.createdAt} amount ${PAYMENT.amountMinor} INR order ${REFS.order}   `),
  },
  {
    id: "settlement",
    name: "Settlement line",
    source: "Gateway settlement report",
    ref: REFS.settlement,
    amountPaise: SETTLEMENT_LINE.grossPaise,
    r0: 0.47, r1: 0.58, z: 0.068,
    divisions: arcs([
      { label: "Net", paise: SETTLEMENT_LINE.netPaise },
      { label: "Fee, as reported", paise: SETTLEMENT_LINE.feePaise },
      { label: "GST on the fee, as reported", paise: SETTLEMENT_LINE.taxPaise },
    ], SETTLEMENT_LINE.grossPaise),
    microtext: repeatTo(`${REFS.settlement} ${REFS.payment} GROSS ${inr(SETTLEMENT_LINE.grossPaise)} FEE ${inr(SETTLEMENT_LINE.feePaise)} TAX ${inr(SETTLEMENT_LINE.taxPaise)} NET ${inr(SETTLEMENT_LINE.netPaise)} SETTLED ${SETTLEMENT_LINE.settledOn}   `),
  },
  {
    id: "payout",
    name: "Payout",
    source: "Gateway settlement report",
    ref: REFS.settlement,
    amountPaise: PAYOUT.amountPaise,
    r0: 0.594, r1: 0.704, z: 0.052,
    divisions: arcs([{ label: `${PAYOUT.lines} lines`, paise: PAYOUT.amountPaise }], PAYOUT.amountPaise),
    graduations: PAYOUT.lines,
    // Which graduation is this payment's line is illustrative; the report's line order carries no meaning.
    markedGraduation: seedOf(REFS.payment) % PAYOUT.lines,
    microtext: repeatTo(`PAYOUT ${REFS.settlement} ${PAYOUT.lines} LINES ${inr(PAYOUT.amountPaise)} ${PAYOUT.status.toUpperCase()} ${PAYOUT.paidOn} UTR ${REFS.utr}   `),
  },
  {
    id: "bank",
    name: "Bank credit",
    source: "Bank statement",
    ref: REFS.utr,
    amountPaise: BANK_CREDIT.creditPaise,
    r0: 0.718, r1: 0.828, z: 0.036,
    divisions: arcs([{ label: "Credit", paise: BANK_CREDIT.creditPaise }], BANK_CREDIT.creditPaise),
    microtext: repeatTo(`${BANK_CREDIT.date} ${BANK_CREDIT.narration} CR ${inr(BANK_CREDIT.creditPaise)} BAL ${inr(BANK_CREDIT.balancePaise)}   `),
  },
  {
    id: "journal",
    name: "Journal entry",
    source: "General ledger",
    ref: JOURNAL.id,
    amountPaise: debitTotal,
    r0: 0.842, r1: 0.952, z: 0.02,
    // Debits fill one half of the ring and credits the other: the halves meet only if the entry balances.
    divisions: [...arcs(debits, debitTotal, 0.5), ...arcs(credits, creditTotal, 0.5)],
    microtext: repeatTo(`${JOURNAL.id} ${JOURNAL.date} ${JOURNAL.memo.toUpperCase()} ${JOURNAL.lines.map((l) => `${l.debitPaise ? "DR" : "CR"} ${l.account.toUpperCase()} ${inr(l.debitPaise ?? l.creditPaise)}`).join(" ")}   `),
  },
].map((ring, index) => ({ ...ring, index, pattern: pattern(ring.ref + ring.id, index) }));

export const RING_INDEX = Object.fromEntries(RINGS.map((r) => [r.id, r.index]));

/** Where each ring rests before the opening sequence turns it into register: a deterministic scatter. */
export const OPENING_OFFSETS = RINGS.map((r, i) => ((seedOf(r.ref) % 1000) / 1000 - 0.5) * 2.4 + (i % 2 ? 1.1 : -1.3));

/** Which two rings each difference compares (record a, record b). */
const CASE_PAIRS = {
  fees: ["payment", "settlement"],
  grouped: ["payout", "bank"],
  refund: ["settlement", "payout"],
  chargeback: ["settlement", "payout"],
  missing: ["payout", "bank"],
  short: ["payout", "bank"],
};

/**
 * The seal's state for one difference. An explained or agreeing case can be brought into register by its evidence;
 * an open case cannot: its ring stays turned by an angle that grows with the difference. The angle is magnified
 * (a difference of a few paise must still be visible) and never zero while the difference is not explained.
 */
export function caseSeal(caseId) {
  const c = CASES.find((x) => x.id === caseId);
  if (!c) throw new Error(`unknown case: ${caseId}`);
  const [a, b] = CASE_PAIRS[caseId].map((id) => RING_INDEX[id]);
  const differencePaise = caseDifference(c);
  const partsPaise = c.parts.reduce((s, p) => s + p.paise, 0);
  const missing = c.b.paise === null;
  const ratio = c.a.paise ? Math.abs(differencePaise) / Math.abs(c.a.paise) : 0;
  const offset = differencePaise === 0 ? 0 : Math.sign(differencePaise) * Math.min(0.62, 0.11 + 0.9 * Math.sqrt(ratio));
  return {
    case: c,
    rings: [a, b],
    differencePaise,
    partsPaise,
    missing,
    closable: c.status !== "open",
    offset,
    medallion: inr(differencePaise),
  };
}

export const CASE_IDS = CASES.map((c) => c.id);

/** The arithmetic each ring states, in words, for the record panel. */
export const RING_NOTES = {
  order: `One total, ${inr(ORDER.totalPaise)}, engraved as a single unbroken ring.`,
  payment: `Captured for ${inr(PAYMENT.amountMinor)}, the same amount as the order, so the two rings register.`,
  settlement: `Divided in proportion by the report's own figures: ${inr(SETTLEMENT_LINE.netPaise)} net, ${inr(SETTLEMENT_LINE.feePaise)} fee and ${inr(SETTLEMENT_LINE.taxPaise)} GST make ${inr(SETTLEMENT_LINE.grossPaise)}.`,
  payout: `${PAYOUT.lines} graduations, one per settlement line, for ${inr(PAYOUT.amountPaise)}. One of them is this payment's line.`,
  bank: `One credit of ${inr(BANK_CREDIT.creditPaise)} under the UTR the payout names, so it registers with the payout.`,
  journal: `Debits fill one half of the ring and credits the other. They meet because both come to ${inr(debitTotal)}.`,
};

export const JOURNAL_BALANCE = { debitPaise: debitTotal, creditPaise: creditTotal };
