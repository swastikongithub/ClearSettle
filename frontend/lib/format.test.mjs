import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAmount, formatCountdown, formatDateTime, formatTime } from "./format.mjs";

test("INR uses Indian digit grouping", () => {
  assert.equal(formatAmount("124500.00", "INR"), "1,24,500.00");
  assert.equal(formatAmount("6342180", "INR"), "63,42,180.00");
  assert.equal(formatAmount("100000000.5", "INR"), "10,00,00,000.50");
  assert.equal(formatAmount("999", "INR"), "999.00");
  assert.equal(formatAmount("1000", "INR"), "1,000.00");
  assert.equal(formatAmount("0.01", "INR"), "0.01");
});

test("other currencies use international grouping and their own minor units", () => {
  assert.equal(formatAmount("124500.00", "USD"), "124,500.00");
  assert.equal(formatAmount("1234567.8", "EUR"), "1,234,567.80");
  assert.equal(formatAmount("1234567", "JPY"), "1,234,567");
  assert.equal(formatAmount("12.345", "KWD"), "12.345");
});

test("negative amounts: a minus sign on working screens, parentheses only in statements", () => {
  assert.equal(formatAmount("-450.00", "INR"), "−450.00");
  assert.equal(formatAmount("-124500", "INR", { style: "statement" }), "(1,24,500.00)");
  assert.equal(formatAmount("-0.00", "INR"), "0.00", "negative zero is zero");
});

test("exact: no rounding, no floating point, nothing it cannot show exactly", () => {
  assert.equal(formatAmount("90071992547409931.23", "USD"), "90,071,992,547,409,931.23");
  assert.equal(formatAmount("0.10", "USD"), "0.10");
  assert.throws(() => formatAmount("1.005", "INR"), /decimal places/);
  assert.throws(() => formatAmount("1e5", "INR"), /not a decimal/);
  assert.throws(() => formatAmount("12,000", "INR"), /not a decimal/);
  assert.throws(() => formatAmount("", "INR"), /not a decimal/);
  assert.throws(() => formatAmount("10", "XYZ"), /unsupported currency/);
});

test("times are shown in the product's default zone with its label", () => {
  const at = new Date("2026-10-19T09:07:00Z");
  assert.equal(formatTime(at), "14:37 IST");
  assert.equal(formatDateTime(at), "19 Oct 2026, 14:37 IST");
});

test("countdowns never go negative", () => {
  assert.equal(formatCountdown(125000), "2:05");
  assert.equal(formatCountdown(999), "0:01");
  assert.equal(formatCountdown(-5000), "0:00");
});
