# Ichigo — what is still blank in the live policies

Updated 2026-07-20. Terms / Refund / Shipping are live; Privacy is on Shopify's automatic management.
**Every bracket below renders literally on the live page.**

## Filled 2026-07-20 (from verified facts, not guesses)

| Was | Now | Basis |
|---|---|---|
| `[ANALYTICS / AD TOOLS]` | "none are currently in use" | grepped the theme: zero tracking code. Installed apps are Messaging, claude, Judge.me, Subscriptions, Forms — none is analytics or advertising |
| `[COOKIE AUDIT PENDING]` | the actual cookie sources | enumerated what runs on the storefront: Shopify's own, Judge.me, Shopify Forms; wishlist is browser-local; Google Fonts sees the IP |
| `[GUEST CHECKOUT]` | "you can check out as a guest" | live: `customerAccountsV2.loginRequiredAtCheckout = false` |
| `[REFUND PROCESSING TIME]` | mechanic, no invented number | issued on approval; arrival depends on the bank |
| `[CLUB RENEWAL AFTER 3 DELIVERIES]` | "ongoing, monthly, until you cancel" | **your decision 2026-07-20** |

## Still blank — grouped by who can answer

### 1. Company identity — only you

Not recorded anywhere: Shopify's billing address has `company`, `address`, `phone` all **null**; only country=Japan is set. Filling these in Shopify Admin → Settings → General would also fix invoices.

- `[COMPANY ADDRESS]` — *privacy*
- `[COMPANY REGISTRATION NUMBER]` — *privacy, refund*
- `[COMPANY REPRESENTATIVE NAME]` — *refund*
- `[JAPAN COMPANY REGISTRATION NUMBER]` — *terms*
- `[LEGAL ENTITY NAME]` — *privacy, refund, terms*
- `[REGISTERED ADDRESS IN JAPAN]` — *terms*
- `[REGISTERED COMPANY ADDRESS]` — *refund*
- `[REPRESENTATIVE NAME AND TITLE]` — *terms*
- `[REPRESENTATIVE NAME]` — *privacy*
- `[TAX / INVOICE REGISTRATION NUMBER]` — *privacy, terms*

### 2. Support contact — only you

Same ask as the Help page. The store's sender address is `s-yamanaka@credo-system.com`; whether that is the address customers should use is your call, not a fact I can read off.

- `[SUPPORT EMAIL ADDRESS]` — *terms*
- `[SUPPORT EMAIL]` — *privacy, refund, shipping*
- `[SUPPORT PHONE NUMBER]` — *terms*
- `[SUPPORT PHONE]` — *privacy, refund*

### 3. Tax and legal — needs an advisor

Consumption-tax treatment of an export sale, 特定商取引法 disclosure, Philippine consumer-law rights, DDP vs DDU, and the dispute forum. Deliberately not guessed.

- `[COMPLIANCE REVIEW PENDING]` — *privacy*
- `[CUSTOMS / DUTY ARRANGEMENT]` — *shipping, terms*
- `[DISPUTE RESOLUTION FORUM]` — *terms*
- `[JAPANESE CONSUMPTION TAX]` — *terms*
- `[PH CONSUMER LAW]` — *terms*
- `[SPECIFIED COMMERCIAL TRANSACTIONS ACT]` — *refund, terms*

### 4. Operations — unknown until a courier exists

Carrier name, the delivery window for Cebu/Davao/Iloilo/Baguio, multi-lot order splitting, customs/quarantine holds.

- `[COURIER NAME]` — *privacy*
- `[CUSTOMS / QUARANTINE HOLDS]` — *refund*
- `[MULTI-LOT ORDER SHIPPING]` — *shipping*
- `[OTHER CITIES DELIVERY WINDOW]` — *shipping*

### 5. Promise-level decisions — only you

These change what you promise the customer, so they were left visibly open rather than assumed.

- `[CANCELLATION REFUND TERMS]` — *refund*
- `[GUARANTEE SCOPE — FAILED DELIVERY]` — *refund, shipping*
- `[PARTIAL-ORDER CLAIMS]` — *refund*
- `[RETENTION PERIOD]` — *privacy*
- `[SHIPPING-FEE REFUND]` — *refund*
- `[SUBSTITUTION POLICY]` — *terms*
- `[SUPPORT DATA RETENTION]` — *privacy*

## Health warning

Drafted by an AI from what the site already promises. **Not reviewed by a lawyer.** Cross-border sale of
perishable food to consumers touches Japanese and Philippine consumer law. A starting draft, not legal advice.
