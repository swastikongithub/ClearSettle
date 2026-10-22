// The example payment on the public landing page (/welcome/). Every figure here is illustrative, not customer
// data, and the page says so wherever it shows one. Amounts are whole paise, so the arithmetic is exact integer
// arithmetic; they reach the screen as decimal strings through formatAmount (D-UI-09), never as rupee floats.
// The fee and the GST on it are the settlement report's own figures, never derived from a rate (FR-REC-023).
// landingExample.test.mjs checks that every total, difference and explanation adds up.

import { formatAmount } from "./format.mjs";

/** Whole paise to an exact decimal string: 115215 → "1152.15", -2785 → "-27.85". */
export function paiseToDecimal(paise) {
  if (!Number.isSafeInteger(paise)) throw new Error("paise must be a safe integer");
  const abs = Math.abs(paise);
  return `${paise < 0 ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Whole paise as INR for display: Indian grouping, a true minus sign, no currency code. */
export const inr = (paise) => formatAmount(paiseToDecimal(paise), "INR");

/** References shared between records. Each is exact evidence that links two or more of them. */
export const REFS = {
  order: "SO-24-10482",
  payment: "pay_8KX2M4QW7T",
  settlement: "setl_5JQ1",
  utr: "XMPLN26293018472",
};

export const ORDER = { placedAt: "18/10/2026 14:07", totalPaise: 118000 };

// Gateways often report amounts in minor units; the import template states the unit (FR-IMP-008).
export const PAYMENT = { amountMinor: 118000, status: "captured", createdAt: "2026-10-18T14:07:52+05:30" };

export const SETTLEMENT_LINE = { grossPaise: 118000, feePaise: 2360, taxPaise: 425, netPaise: 115215, settledOn: "20/10/2026" };

// One payout carries many settlement lines: this payment is one of them, never the whole payout.
export const PAYOUT = { lines: 42, amountPaise: 4821240, status: "processed", paidOn: "20/10/2026" };

export const BANK_CREDIT = {
  date: "20/10/2026",
  narration: `NEFT CR ${REFS.utr} GATEWAY SETTL`,
  creditPaise: 4821240,
  balancePaise: 36190418,
};

// The payout's journal is one entry for all 42 lines; this payment's share is inside each line.
export const JOURNAL = {
  id: "JV-0193",
  date: "20/10/2026",
  memo: `Payout ${REFS.settlement}`,
  lines: [
    { account: "Bank", debitPaise: 4821240 },
    { account: "Payment gateway charges", debitPaise: 97040 },
    { account: "Input GST", debitPaise: 17467 },
    { account: "Gateway clearing", creditPaise: 4935747 },
  ],
};

/** Which records each shared reference appears in, for the trace's highlighting. */
export const REF_RECORDS = {
  order: ["order", "payment"],
  payment: ["payment", "settlement"],
  settlement: ["settlement", "payout", "journal"],
  utr: ["payout", "bank"],
};

export const RECORD_NAMES = {
  order: "the order",
  payment: "the payment",
  settlement: "the settlement line",
  payout: "the payout",
  bank: "the bank credit",
  journal: "the journal entry",
};

/**
 * Differences the matching is being built to show (FR-REC-004, FR-REC-007, FR-REC-031, FR-EXC-009). Each case
 * compares two records' original amounts. "explained" and "agrees" cases are fully accounted for by figures in
 * the source data; "open" cases are not, so they stay open. There is no blanket amount tolerance (D-REC-07): a
 * difference is explained only by components the source reports or by a documented rounding rule (FR-REC-007).
 */
export const CASES = [
  {
    id: "fees",
    title: "Fee and GST deducted",
    status: "explained",
    a: { record: "Payment, gross", source: "Gateway transactions", ref: REFS.payment, paise: 118000 },
    b: { record: "Settlement line, net", source: "Settlement report", ref: REFS.settlement, paise: 115215 },
    parts: [
      { label: "Fee, as reported", paise: -2360 },
      { label: "GST on the fee, as reported", paise: -425 },
    ],
    why: "The settlement report states both deductions, and together they account for the whole difference. Nothing is estimated from a rate.",
  },
  {
    id: "grouped",
    title: "Paid out with other payments",
    status: "agrees",
    a: { record: "Payout, 42 lines", source: "Settlement report", ref: REFS.settlement, paise: 4821240 },
    b: { record: "Bank credit", source: "Bank statement", ref: REFS.utr, paise: 4821240 },
    parts: [],
    why: "No single payment equals the credit. The payout's 42 lines add up to it exactly, and the UTR ties the payout to the bank line.",
  },
  {
    id: "refund",
    title: "Refund taken from a later payout",
    status: "explained",
    a: { record: "Payments in the payout, net", source: "Settlement report", ref: "setl_5JV3", paise: 3145000 },
    b: { record: "Payout", source: "Settlement report", ref: "setl_5JV3", paise: 2909000 },
    parts: [{ label: "Refund rfnd_3LQ8 of payment pay_7HD2M1", paise: -236000 }],
    why: "The refund line names the payment it belongs to, so the deduction links back to it. The original payment's record is never changed.",
  },
  {
    id: "chargeback",
    title: "Chargeback deducted",
    status: "explained",
    a: { record: "Payments in the payout, net", source: "Settlement report", ref: "setl_5JX1", paise: 2264150 },
    b: { record: "Payout", source: "Settlement report", ref: "setl_5JX1", paise: 1764250 },
    parts: [{ label: "Chargeback chb_9TE4 of payment pay_2WN6K8", paise: -499900 }],
    why: "The chargeback line links to the disputed payment. If the gateway later reverses it, the reversal links to the same payment.",
  },
  {
    id: "missing",
    title: "Payout with no bank credit",
    status: "open",
    a: { record: "Payout", source: "Settlement report", ref: "setl_5JW9", paise: 1564000 },
    b: { record: "Bank credit", source: "Statement to 22/10/2026", ref: null, paise: null },
    parts: [],
    why: "No credit with this payout's UTR appears on the statement. It stays open until a credit or other evidence explains it.",
  },
  {
    id: "short",
    title: "Bank credit short of the payout",
    status: "open",
    a: { record: "Payout", source: "Settlement report", ref: "setl_5JT7", paise: 2648000 },
    b: { record: "Bank credit", source: "Bank statement", ref: "XMPLN26294007315", paise: 2647000 },
    parts: [],
    why: "Ten rupees is small, but there is no blanket tolerance. The difference stays open until evidence explains it, such as a bank charge on the statement.",
  },
];

/** The difference between a case's two records, in paise (b − a); a missing record counts as nothing received. */
export const caseDifference = (c) => (c.b.paise ?? 0) - c.a.paise;
