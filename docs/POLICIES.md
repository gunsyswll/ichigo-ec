# Ichigo — store policy placeholders

Published live 2026-07-20 (Terms, Refund, Shipping via `shopPolicyUpdate`).
**Privacy is under Shopify's automatic management** — Shopify generates and maintains it, so our
draft was NOT applied. Turn automatic management off in Admin only if you want to replace it.

Every bracket below renders literally on the live policy page. Fill them before launch.

| Placeholder | Appears in |
|---|---|
| `[ANALYTICS / AD TOOLS]` | privacy |
| `[CANCELLATION REFUND TERMS]` | refund |
| `[CLUB RENEWAL AFTER 3 DELIVERIES]` | refund, terms |
| `[COMPANY ADDRESS]` | privacy |
| `[COMPANY REGISTRATION NUMBER]` | privacy, refund |
| `[COMPANY REPRESENTATIVE NAME]` | refund |
| `[COMPLIANCE REVIEW PENDING]` | privacy |
| `[COOKIE AUDIT PENDING]` | privacy |
| `[COURIER NAME]` | privacy |
| `[CUSTOMS / DUTY ARRANGEMENT]` | shipping, terms |
| `[CUSTOMS / QUARANTINE HOLDS]` | refund |
| `[DISPUTE RESOLUTION FORUM]` | terms |
| `[GUARANTEE SCOPE — FAILED DELIVERY]` | refund, shipping |
| `[GUEST CHECKOUT]` | terms |
| `[JAPAN COMPANY REGISTRATION NUMBER]` | terms |
| `[JAPANESE CONSUMPTION TAX]` | terms |
| `[LEGAL ENTITY NAME]` | privacy, refund, terms |
| `[MULTI-LOT ORDER SHIPPING]` | shipping |
| `[OTHER CITIES DELIVERY WINDOW]` | shipping |
| `[PARTIAL-ORDER CLAIMS]` | refund |
| `[PH CONSUMER LAW]` | terms |
| `[REFUND PROCESSING TIME]` | refund |
| `[REGISTERED ADDRESS IN JAPAN]` | terms |
| `[REGISTERED COMPANY ADDRESS]` | refund |
| `[REPRESENTATIVE NAME AND TITLE]` | terms |
| `[REPRESENTATIVE NAME]` | privacy |
| `[RETENTION PERIOD]` | privacy |
| `[SHIPPING-FEE REFUND]` | refund |
| `[SPECIFIED COMMERCIAL TRANSACTIONS ACT]` | refund, terms |
| `[SUBSTITUTION POLICY]` | terms |
| `[SUPPORT DATA RETENTION]` | privacy |
| `[SUPPORT EMAIL ADDRESS]` | terms |
| `[SUPPORT EMAIL]` | privacy, refund, shipping |
| `[SUPPORT PHONE NUMBER]` | terms |
| `[SUPPORT PHONE]` | privacy, refund |
| `[TAX / INVOICE REGISTRATION NUMBER]` | privacy, terms |

## Decisions, not just blanks

These are open policy questions, not missing strings — they change what you promise:

- **`[GUARANTEE SCOPE — FAILED DELIVERY]`** — does the 100% Freshness Guarantee still apply if the
  berries spoil because a delivery could not be completed (nobody home, wrong address)? The site
  promises the guarantee *unconditionally* everywhere it appears, so narrowing it is your call and
  is deliberately left open rather than assumed.
- **`[SHIPPING-FEE REFUND]`** — does a full refund include the shipping the customer paid?
- **`[CLUB RENEWAL AFTER 3 DELIVERIES]`** — does the Ichigo Club stop after three deliveries or
  auto-start a new cycle? The theme says subscriptions 'renew automatically'; the marketing says
  three deliveries. These currently contradict each other.
- **`[CUSTOMS / DUTY ARRANGEMENT]`** — DDP (you prepay duties) or DDU (customer pays on arrival)?
  Depends on the courier, which isn't appointed.
- **`[JAPANESE CONSUMPTION TAX]`**, **`[SPECIFIED COMMERCIAL TRANSACTIONS ACT]`**, **`[PH CONSUMER LAW]`**
  — need a tax advisor and local counsel. Left blank rather than guessed.

## Health warning

These were written by an AI from what the site already promises. They are a **starting draft, not
legal advice**, and they have not been reviewed by a lawyer. Cross-border sale of perishable food
to consumers touches Japanese and Philippine consumer law; get them reviewed before you launch.
