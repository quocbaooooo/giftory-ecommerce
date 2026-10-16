# Voucher checkout

The voucher collection is the single catalog for Flash Sale, cart and checkout.
No hardcoded promotional codes, expiry dates, or usage percentages are displayed.
Existing expired vouchers remain expired. Do not rerun the destructive database
seed to refresh promotions.

- `GET /api/vouchers`: active, unexpired catalog; includes saved state for the
  signed-in account. Saving does not unlock a points voucher or reserve capacity.
- `POST /api/vouchers/:code/save`: authenticated, idempotent account bookmark.
- Cart responses include ranked `vouchers`, `appliedVoucher`, and `voucherNotice`.
  Eligible offers come first, ranked by actual savings; only the best gets the
  recommendation. No voucher is applied without a customer choice.
- `POST /api/cart/apply-voucher`: `{ code, sessionId }`; empty code removes it.
- `POST /api/cart/shipping-method`: `{ method: 'STANDARD' | 'EXPRESS', sessionId }`.

Standard shipping costs 30,000 VND below 250,000 VND of merchandise and is free at
or above that threshold. Express costs 50,000 VND. The threshold uses merchandise
value before vouchers, based on the cart's selling prices. Gift wrapping is free.

FIXED and PERCENT reduce merchandise only; PERCENT rounds to whole VND and applies
`maxDiscount` if positive. FREESHIP reduces actual shipping only, capped by
`discountValue` and any positive `maxDiscount`. Discounts never make either
component negative. The original seeded FREESHIP code with FIXED type is read as
FREESHIP for compatibility; new seeds use the correct type.

Each order accepts one voucher. Every cart response recalculates eligibility and
amounts; invalid selections are removed with a reason. The order service checks
again using the chosen shipping method, atomically increments usage under its
limit, and stores code/type and price components in the order snapshot. If the
order write fails, the reservation is released. Points vouchers require an unused
REDEEM transaction; consuming that transaction is atomic and it is restored if
the order write fails. Public codes have a global usage limit; no per-account
limit is configured in the current schema. Order cancellation does not restore
voucher usage.

The current standalone MongoDB setup uses reservation plus compensation rather
than a multi-document transaction. A process crash between reservation and order
write can leave a reserved use; production deployment should use a replica-set
transaction or a durable reservation/reconciliation job.

Run `npm run test:vouchers` for isolated MongoDB integration tests. It creates and
removes its own temporary database directory and never uses application data.
After a frontend build, `node test/vouchers.integration.cjs --preview` serves an
isolated preview on 127.0.0.1:4200 (API on 127.0.0.1:3000); Enter stops both.
The preview replaces the API URL in served JavaScript in memory, without editing
environment files or compiled files.
