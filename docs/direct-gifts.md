# Direct gift delivery

Checkout defaults to ordinary delivery. Enabling direct gifts stores the buyer contact separately from the recipient address, requires a greeting card (200 Unicode characters maximum), and requires full prepayment. COD is rejected by the API as well as hidden in the UI. A gift cannot be dispatched until fully paid, including legacy orders with a 50% deposit.

Anonymous gifts show `Giftory` on the recipient page and printed slip. The recipient API uses a strict whitelist without prices, buyer contact information, payment data, or internal notifications. QR codes are rendered locally. Their random access token is carried in the URL fragment and checked against a server-side hash. Buyer/admin order JSON omits both the token and hash. Administrators obtain the printable slip through a dedicated guarded endpoint.

The existing address catalogue contains province/ward relationships. Direct gifts also accept an optional district text field for addresses that include one; no invented district hierarchy is added to that catalogue.

## Simulated notifications

No email, SMS, or Zalo provider is contacted. Notices are stored on the order with `status: SIMULATED`. Order creation, payment, production, dispatch, delivery exceptions, and successful delivery notify only the buyer. There is no recipient notification on order creation. After a delivery exception, the admin can simulate a recipient invitation and copy its link.

Delivery failures hold the gift in transit, contact the buyer, and require a new delivery time instead of automatically returning the parcel. Successful gift delivery requires an HTTPS proof-of-delivery image URL. Buyer order details show the proof and simulated notifications.

## Recipient support and financial rights

`/gift/:code#token` lets the recipient confirm an invited delivery time and create a product defect/exchange case without an account. Allowed defect reasons are scratched, broken, and wrong customization. Requests are idempotent per order/product. Recipient cases do not grant financial ownership; refund requests and refund resolutions are rejected. Existing buyer cancellation/refund rules remain in force. Refund adapter requests explicitly target the original payment source.

Gift checkout currently pays the full amount immediately. The buyer order page also supports simulated settlement of legacy partially paid gifts. Payment simulation remains unavailable in production or when disabled by configuration.

## Verification

- Backend: `npm run build`, then `node test/direct-gift.integration.cjs` (isolated MongoDB replica set; never uses the application database).
- Frontend: `npm run build`, `node test/checkout-direct-gift.cjs`, `node test/checkout-recipients.cjs`.
- Regression: backend `node test/care.integration.cjs`.

Set `FRONTEND_URL` to the public storefront origin before deploying so printed recipient QR links point to the intended site. This change does not deploy the application or configure a notification provider.
