import { test } from "node:test";
import assert from "node:assert/strict";
import { CASES, caseDifference, inr } from "./landingExample.mjs";
import {
  CASE_IDS, JOURNAL_BALANCE, MEDALLION, OPENING_OFFSETS, RINGS, RING_INDEX, RING_NOTES, caseSeal, seedOf,
} from "./intaglioSeal.mjs";

test("the same reference always gives the same seed, and different references differ", () => {
  assert.equal(seedOf("pay_8KX2M4QW7T"), seedOf("pay_8KX2M4QW7T"));
  assert.notEqual(seedOf("pay_8KX2M4QW7T"), seedOf("pay_8KX2M4QW7U"));
});

test("six rings, inner to outer, without overlapping, stepping down from the centre", () => {
  assert.deepEqual(RINGS.map((r) => r.id), ["order", "payment", "settlement", "payout", "bank", "journal"]);
  let last = MEDALLION.r1;
  let height = MEDALLION.z;
  for (const r of RINGS) {
    assert.ok(r.r0 > last, `${r.id} overlaps the ring inside it`);
    assert.ok(r.r1 > r.r0);
    assert.ok(r.z < height, `${r.id} does not step down`);
    last = r.r1;
    height = r.z;
  }
  assert.ok(last < 1);
});

test("every ring's divisions add up exactly to its record's amount and fill one whole turn", () => {
  for (const r of RINGS) {
    if (r.id === "journal") continue;
    assert.equal(r.divisions.reduce((s, d) => s + d.paise, 0), r.amountPaise, r.id);
  }
  const settlement = RINGS[RING_INDEX.settlement];
  assert.deepEqual(settlement.divisions.map((d) => d.paise), [115215, 2360, 425]);
  for (const r of RINGS) {
    const turn = r.divisions.reduce((s, d) => s + d.turn, 0);
    assert.ok(Math.abs(turn - 1) < 1e-12, `${r.id} turns ${turn}`);
  }
});

test("the journal's debits and credits each fill half the ring because the entry balances", () => {
  assert.equal(JOURNAL_BALANCE.debitPaise, JOURNAL_BALANCE.creditPaise);
  assert.equal(JOURNAL_BALANCE.debitPaise, 4935747);
  const journal = RINGS[RING_INDEX.journal];
  const half = (prefix) => journal.divisions.filter((d) => d.label.startsWith(prefix)).reduce((s, d) => s + d.turn, 0);
  assert.ok(Math.abs(half("Dr") - 0.5) < 1e-12);
  assert.ok(Math.abs(half("Cr") - 0.5) < 1e-12);
});

test("the payout ring has one graduation per settlement line and marks one of them", () => {
  const payout = RINGS[RING_INDEX.payout];
  assert.equal(payout.graduations, 42);
  assert.ok(payout.markedGraduation >= 0 && payout.markedGraduation < 42);
});

test("each ring's microtext carries its own reference and exact amounts", () => {
  assert.match(RINGS[RING_INDEX.order].microtext, /SO-24-10482 .*1,180\.00/);
  assert.match(RINGS[RING_INDEX.settlement].microtext, /FEE 23\.60 TAX 4\.25 NET 1,152\.15/);
  assert.match(RINGS[RING_INDEX.bank].microtext, /XMPLN26293018472.*48,212\.40.*3,61,904\.18/);
  assert.match(RINGS[RING_INDEX.journal].microtext, /DR BANK 48,212\.40.*CR GATEWAY CLEARING 49,357\.47/);
  for (const r of RINGS) assert.ok(r.microtext.length >= 260, r.id);
});

test("patterns are whole petal counts that grow outward", () => {
  let last = 0;
  for (const r of RINGS) {
    const p = r.pattern;
    assert.ok(Number.isInteger(p.petals) && p.petals > last, r.id);
    assert.ok(Number.isInteger(p.lines) && p.lines >= 7);
    last = p.petals;
  }
  assert.equal(OPENING_OFFSETS.length, RINGS.length);
  assert.ok(OPENING_OFFSETS.every((o) => Math.abs(o) > 0.05));
});

test("every difference maps to two rings, and only explained or agreeing cases can close", () => {
  assert.deepEqual(CASE_IDS, CASES.map((c) => c.id));
  for (const c of CASES) {
    const s = caseSeal(c.id);
    assert.equal(s.rings.length, 2);
    assert.notEqual(s.rings[0], s.rings[1]);
    assert.equal(s.differencePaise, caseDifference(c));
    assert.equal(s.medallion, inr(caseDifference(c)));
    if (c.status === "open") {
      assert.equal(s.closable, false, c.id);
      assert.notEqual(s.offset, 0, c.id);
    } else {
      assert.equal(s.partsPaise, s.differencePaise, c.id);
    }
  }
  assert.equal(caseSeal("short").medallion, "−10.00");
  assert.equal(caseSeal("fees").medallion, "−27.85");
  assert.equal(caseSeal("grouped").offset, 0);
  assert.ok(caseSeal("missing").missing);
  assert.throws(() => caseSeal("nope"));
});

test("a smaller difference still turns its ring visibly, and a larger one turns it further", () => {
  const small = Math.abs(caseSeal("short").offset);
  const large = Math.abs(caseSeal("missing").offset);
  assert.ok(small >= 0.11);
  assert.ok(large > small);
  assert.ok(large <= 0.62);
});

test("each ring has a note, and the notes state the exact figures", () => {
  for (const r of RINGS) assert.ok(RING_NOTES[r.id], r.id);
  assert.match(RING_NOTES.settlement, /1,152\.15 net, 23\.60 fee and 4\.25 GST make 1,180\.00/);
  assert.match(RING_NOTES.journal, /49,357\.47/);
});
