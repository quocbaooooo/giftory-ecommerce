# Product loading

## Changes

- Public catalog reads no longer attach a bearer token. Logged-in visitors avoid the extra CORS preflight for these requests; mutations, cart, orders, profile and admin category reads retain authentication.
- Catalog responses survive reloads within the same browser tab using sessionStorage. Responses younger than 60 seconds are reused. Older responses, up to 30 minutes after expiry, display immediately while one shared request refreshes them. Successful admin edits clear both caches. Product details and checkout requests are not persisted.
- Storage is optional and bounded to 12 responses / 1 million serialized characters. Private browsing, quota failures and malformed entries do not prevent network loading.
- Best sellers are fetched only for an empty result instead of competing with the initial product list.
- MongoDB compound indexes cover active products ordered by date/popularity, category/popularity, customizable/date and flash-sale discount. These indexes need to exist in the deployed database; Mongoose normally creates them when autoIndex is enabled. Do not use syncIndexes to deploy this change, because it can remove other indexes.
- The browser can establish the API connection before Angular starts.

## Verify and deploy

Run `npm run test:catalog` and `npm run test:auth` in frontend, then `npm run build` in both frontend and backend. Deploy both applications through the existing Vercel / Render deployment flow. Local edits alone do not change the public sites.

On 2026-10-19 a read-only probe of the existing deployed API (`/api/products?view=catalog&sort=popular&page=1&limit=12`) returned HTTP 200, 11,545 bytes, first byte in approximately 0.95 seconds. This is one observation of the existing deployment, not a before/after benchmark or evidence of cold-start latency.

In browser DevTools, compare the first visit, reload within 60 seconds, and reload after 60 seconds. The second visit should restore saved catalog data without a product request; the third should display saved data before the background refresh finishes. Change filters to verify each query has its own response. An empty/first-time browser tab still needs the backend.

## Render cold starts

The deployed instance plan has not been verified. If it uses Render Free, Render documents that services sleep after 15 minutes without inbound traffic and need about one minute to start again: https://render.com/docs/free#spinning-down-on-idle . Client caching improves return visits but cannot eliminate that wait for a visitor with no saved data. To remove this source of first-visit latency, use an instance that remains running. No hosting plan or billing changes are made by this patch.
