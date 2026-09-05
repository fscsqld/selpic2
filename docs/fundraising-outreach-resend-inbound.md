# Fundraising outreach — Resend Receiving (Needs reply)

**Status:** Code supports official `email.received` (fetches body via Receiving API), `FUNDRAISING_OUTREACH_REPLY_TO`, and **Svix signature verification** via `RESEND_WEBHOOK_SECRET`.

Apply-only path does **not** need this. Use this when you want email **replies** in `/admin/fundraising/agent` → Needs reply.

## Your checklist (run in order)

### 1. Resend Receiving
1. Open [Resend Domains](https://resend.com/domains).
2. Open the domain used for sending (e.g. `selpic.com.au`).
3. Enable **Receiving**.
4. Add the shown **MX** record in DNS → wait until **Verified**.
5. Note the inbound address Resend gives you (often `…@inbound.yourdomain` or a managed `…@….resend.app`).

### 2. Vercel env
In Vercel project **selpic2** → Settings → Environment Variables (Production):

| Name | Value | Type |
|------|--------|------|
| `FUNDRAISING_OUTREACH_REPLY_TO` | The inbound address from step 1 | Plain / Secret |
| `RESEND_WEBHOOK_SECRET` | Signing secret from the Resend webhook details page (`whsec_…`) | **Secret** |

`RESEND_API_KEY` must already exist (it does).

**Redeploy** after adding or changing `RESEND_WEBHOOK_SECRET` (env is read at runtime on the deployment).

### 3. Webhook
1. Resend → **Webhooks** → **Add Webhook** (or open the existing one).
2. URL:

```text
https://www.selpic.com.au/api/webhooks/resend/inbound
```

3. Event: **`email.received`**.
4. Copy **Signing secret** into Vercel as `RESEND_WEBHOOK_SECRET` (step 2).
5. Save — list must show this URL.

### 4. Smoke test (after deploy with new env)
1. Agent → Confirm Send to your own inbox.
2. Check Reply-To header = `FUNDRAISING_OUTREACH_REPLY_TO`.
3. Reply with `We would like to apply`.
4. Resend Receiving shows the reply; webhook delivery **200**.
5. Agent → **Needs reply** shows the row (customer text only, not quoted SELPIC letter).
6. Reply `unsubscribe` → target **OPTED_OUT**, not left open in Needs reply.

## Auth notes
- Production should use **Svix** (`RESEND_WEBHOOK_SECRET`). Requests without valid `svix-id` / `svix-timestamp` / `svix-signature` are rejected.
- Legacy `RESEND_INBOUND_WEBHOOK_SECRET` + `x-selpic-webhook-secret` is only used when the Svix secret is **unset** (local/dev). It is **not** related to SELPIC-X.
- Verification uses the **raw** request body (`req.text()`). Do not re-serialize JSON before verify.

## What the app does
- Outreach send uses `fundraisingOutreachReplyTo()` (`FUNDRAISING_OUTREACH_REPLY_TO` → else `info@`).
- Webhook on `email.received` verifies Svix, loads body from `GET /emails/receiving/{email_id}`, then classifies into Needs reply / opt-out.
