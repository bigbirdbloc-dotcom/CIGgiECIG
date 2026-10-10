# AI Integration Security Notes

## Trust boundaries

- AI credentials live only in server-side environment variables (AI_API_KEY). They are never embedded in frontend JavaScript or sent back by status endpoints.
- GET /api/admin/ai/status and POST /api/admin/ai/chat must pass the same admin-session middleware as other protected admin endpoints.
- Admin sessions are HMAC-signed with ADMIN_SESSION_SECRET, expire after eight hours, and are rejected if tampered with or expired. Authentication is disabled unless both ADMIN_PASS and ADMIN_SESSION_SECRET are configured.
- The configured provider URL is not user-controlled. HTTPS is required except for loopback addresses to enable deterministic local tests.

## Bounds and failure behavior

- Prompt must be a non-empty string no longer than 4,000 characters.
- The request timeout is clamped to 100–30,000 ms; the default is 15,000 ms.
- Provider response body is capped at 256 KiB and returned answer text is capped at 20,000 characters.
- Missing settings return 503; invalid prompts return 400; provider failures and malformed replies return generic 502 errors; timeout returns 504.
- Prompts, API keys, and raw upstream error bodies are not logged by the integration.
- The assistant is configured as a text-only advisor. The app does not pass shell execution tools, GitHub write tools, Linear API credentials, or production deployment actions into the model.

## Operational safeguards

1. Use a dedicated provider key with spending limits where available; rotate it if exposed.
2. Use HTTPS and restrict the admin app to the expected operator network in production.
3. Keep payment, identity, DOB, and customer data out of prompts. Do not treat model output as verified code.
4. Review all generated suggestions as untrusted input, apply them in a feature branch, and require tests plus pull-request review.
5. Keep .env, order files, and audit records out of source control.

## Known limitation

The existing storefront has other security and compliance concerns beyond this feature, including the original JSON-file persistence model and age-verification implementation. This change does not certify the full storefront as production-ready. Admin cookie hardening here does not replace a broader security assessment, rate limiting, CSRF protections for all state-changing routes, durable session revocation, or production secrets management.
