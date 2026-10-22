import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BANK_CREDIT, CASES, JOURNAL, ORDER, PAYMENT, PAYOUT, REFS, REF_RECORDS, RECORD_NAMES, SETTLEMENT_LINE,
  caseDifference, inr, paiseToDecimal,
} from "./landingExample.mjs";

test("paise become exact decimal strings", () => {
  assert.equal(paiseToDecimal(115215), "1152.15");
  assert.equal(paiseToDecimal(5), "0.05");
  assert.equal(paiseToDecimal(0), "0.00");
  assert.equal(paiseToDecimal(-2785), "-27.85");
  assert.throws(() => paiseToDecimal(1.5));
  assert.throws(() => paiseToDecimal(2 ** 53));
});

test("amounts are shown with Indian grouping and a true minus sign", () => {
  assert.equal(inr(4821240), "48,212.40");
  assert.equal(inr(36190418), "3,61,904.18");
  assert.equal(inr(-2785), "−27.85");
  assert.equal(inr(0), "0.00");
});

test("the order, the payment and the settlement line describe the same gross amount", () => {
  assert.equal(PAYMENT.amountMinor, ORDER.totalPaise);
  assert.equal(SETTLEMENT_LINE.grossPaise, ORDER.totalPaise);
});

test("the settlement line's net is its gross less the reported fee and GST", () => {
  const { grossPaise, feePaise, taxPaise, netPaise } = SETTLEMENT_LINE;
  assert.equal(grossPaise - feePaise - taxPaise, netPaise);
});

test("the payout carries other payments too, and the bank credit equals the payout", () => {
  assert.ok(PAYOUT.lines > 1);
  assert.ok(PAYOUT.amountPaise > SETTLEMENT_LINE.netPaise);
  assert.equal(BANK_CREDIT.creditPaise, PAYOUT.amountPaise);
  assert.ok(BANK_CREDIT.narration.includes(REFS.utr));
});

test("the payout's journal entry balances and holds this payment's share", () => {
  const debit = JOURNAL.lines.reduce((sum, l) => sum + (l.debitPaise ?? 0), 0);
  const credit = JOURNAL.lines.reduce((sum, l) => sum + (l.creditPaise ?? 0), 0);
  assert.equal(debit, credit);
  const [bank, fees, gst] = JOURNAL.lines;
  assert.equal(bank.debitPaise, PAYOUT.amountPaise);
  assert.ok(fees.debitPaise >= SETTLEMENT_LINE.feePaise);
  assert.ok(gst.debitPaise >= SETTLEMENT_LINE.taxPaise);
  assert.ok(JOURNAL.memo.includes(REFS.settlement));
});

test("every shared reference links at least two named records", () => {
  for (const [ref, records] of Object.entries(REF_RECORDS)) {
    assert.ok(REFS[ref], ref);
    assert.ok(records.length >= 2, ref);
    for (const r of records) assert.ok(RECORD_NAMES[r], `${ref} → ${r}`);
  }
});

test("each difference is explained exactly by its parts, agrees, or stays open", () => {
  for (const c of CASES) {
    const diff = caseDifference(c);
    const explained = c.parts.reduce((sum, p) => sum + p.paise, 0);
    if (c.status === "explained") assert.equal(explained, diff, c.id);
    else if (c.status === "agrees") assert.equal(diff, 0, c.id);
    else {
      assert.equal(c.status, "open", c.id);
      assert.notEqual(diff, 0, c.id);
      assert.equal(c.parts.length, 0, c.id);
    }
    for (const side of [c.a, c.b]) if (side.paise !== null) assert.ok(Number.isSafeInteger(side.paise), c.id);
  }
});

test("case identifiers are unique", () => {
  assert.equal(new Set(CASES.map((c) => c.id)).size, CASES.length);
});
