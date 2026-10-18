# Production Release Checklist

## What is included

- Node.js 20 Express application and a non-root Docker image.
- Server-rendered age gate and static storefront assets.
- Live published-product API, client cart, server-calculated checkout totals, and signed CyberSource form fields.
- Admin sign-in, draft product creation, stock/price editing, and publish/unpublish controls.
- Signed webhook validation for CyberSource, Persona, and Veriff adapter callbacks.
- Request-body limits, baseline response security headers, bounded request timeouts, health check, and JavaScript syntax checks in CI.

## Required before public launch

1. Configure `ADMIN_PASS` and `ADMIN_SESSION_SECRET` with independent random values in the hosting provider's secret manager.
2. Set `NODE_ENV=production` and terminate TLS at a trusted HTTPS reverse proxy or hosting platform. Do not expose the container directly to the public internet without HTTPS.
3. Configure merchant-owned CyberSource credentials and `CYBS_PAYMENT_URL=https://secureacceptance.cybersource.com/pay` only after sandbox checkout and signed callback tests pass. The default URL is the CyberSource test endpoint.
4. Configure and test the real identity provider and webhook secrets. The current Persona and Veriff callbacks record signed event metadata; they do not automatically bind a verified identity to a customer/order.
5. Add real product records through Admin. Products begin unpublished and require a product authorization/order reference before publishing. Do not publish demo or placeholder product data.
6. Configure shipping states, local ZIP codes, shipping charges, and tax rules for the actual business.
7. Mount a persistent writable volume at `/app/data` when using Docker. Runtime JSON files are not a transactional database and are not safe for multi-replica deployment or high-concurrency ordering.
8. Before accepting real orders at scale, migrate products, orders, and audit events to a transactional database, add stock reservation/atomic decrement, backups, restore tests, and payment reconciliation.
9. Configure monitoring, error alerts, log retention, secret rotation, login rate limiting, and a documented incident/recovery procedure.
10. Review current provider-specific payment callback fields against the merchant's actual CyberSource integration contract and test acceptance, decline, duplicate callbacks, mismatched amounts, and malformed signatures end to end.

## Local verification

```sh
npm install
npm test
docker build -t ciggiecig:release .
docker run --rm -p 3000:3000 -e ADMIN_PASS='use-a-secret' -e ADMIN_SESSION_SECRET='use-a-different-secret' -v ciggiecig-data:/app/data ciggiecig:release
```

Then open `http://localhost:3000`, complete the age gate, and visit `/admin` to sign in and create draft products. Local HTTP is suitable only for local testing; production requires HTTPS.

## Release status

A passing CI run validates syntax and the repository's automated unit/smoke tests. It does not prove live merchant payment processing, identity-provider approval, tax correctness, database durability, or a production deployment. Keep the release gated until the environment-specific checks above have passed.
