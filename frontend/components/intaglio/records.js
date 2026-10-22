// Each ring's record as its source shows it: a store export row, a gateway API object, a settlement report line,
// a payout, a bank statement line and a journal entry. Every value comes from the illustrative data.

import {
  BANK_CREDIT, JOURNAL, ORDER, PAYMENT, PAYOUT, REFS, SETTLEMENT_LINE, inr, paiseToDecimal,
} from "../../lib/landingExample.mjs";
import s from "./intaglio.module.css";

function Fields({ rows }) {
  return (
    <dl className={s.fields}>
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const VIEWS = {
  order: () => (
    <Fields rows={[["order_id", REFS.order], ["placed", ORDER.placedAt], ["total", `${inr(ORDER.totalPaise)} INR`]]} />
  ),
  payment: () => (
    <pre className={s.code}>{`{
  "id": "${REFS.payment}",
  "status": "${PAYMENT.status}",
  "amount": ${PAYMENT.amountMinor},
  "currency": "INR",
  "order_id": "${REFS.order}",
  "created_at": "${PAYMENT.createdAt}"
}`}</pre>
  ),
  settlement: () => (
    <pre className={s.code}>{`settlement_id,payment_id,gross,fee,tax,net,settled_on
${REFS.settlement},${REFS.payment},${paiseToDecimal(SETTLEMENT_LINE.grossPaise)},${paiseToDecimal(SETTLEMENT_LINE.feePaise)},${paiseToDecimal(SETTLEMENT_LINE.taxPaise)},${paiseToDecimal(SETTLEMENT_LINE.netPaise)},${SETTLEMENT_LINE.settledOn}`}</pre>
  ),
  payout: () => (
    <Fields rows={[["payout", REFS.settlement], ["lines", String(PAYOUT.lines)], ["amount", `${inr(PAYOUT.amountPaise)} INR`], ["status", PAYOUT.status], ["paid_on", PAYOUT.paidOn], ["utr", REFS.utr]]} />
  ),
  bank: () => (
    <Fields rows={[["Date", BANK_CREDIT.date], ["Narration", BANK_CREDIT.narration], ["Credit", inr(BANK_CREDIT.creditPaise)], ["Balance", inr(BANK_CREDIT.balancePaise)]]} />
  ),
  journal: () => (
    <table className={s.journal}>
      <caption>
        {JOURNAL.id}, {JOURNAL.date}, {JOURNAL.memo}
      </caption>
      <thead>
        <tr>
          <th scope="col">Account</th>
          <th scope="col">Debit</th>
          <th scope="col">Credit</th>
        </tr>
      </thead>
      <tbody>
        {JOURNAL.lines.map((l) => (
          <tr key={l.account}>
            <th scope="row">{l.account}</th>
            <td>{l.debitPaise ? inr(l.debitPaise) : ""}</td>
            <td>{l.creditPaise ? inr(l.creditPaise) : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};

export function RecordView({ id }) {
  const View = VIEWS[id];
  return View ? <View /> : null;
}
