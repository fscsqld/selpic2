# Fundraising outreach — Resend Receiving (Needs reply)

**Status:** Code supports official `email.received` (fetches body via Receiving API) and `FUNDRAISING_OUTREACH_REPLY_TO`.  
**You still configure Resend Dashboard + DNS + Vercel env**, then ask for deploy.

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

| Name | Value |
|------|--------|
| `FUNDRAISING_OUTREACH_REPLY_TO` | The inbound address from step 1 |

`RESEND_API_KEY` must already exist (it does). Optional: `RESEND_INBOUND_WEBHOOK_SECRET` (only if you will send that header; Resend’s default webhook does not).

Redeploy after adding env (or ask the agent to deploy when ready).

### 3. Webhook
1. Resend → **Webhooks** → **Add Webhook**.
2. URL:

```text
https://www.selpic.com.au/api/webhooks/resend/inbound
```

3. Event: **`email.received`**.
4. Save — list must show this URL (previously empty).

### 4. Smoke test (after deploy with new env)
1. Agent → Confirm Send to your own inbox.
2. Check Reply-To header = `FUNDRAISING_OUTREACH_REPLY_TO`.
3. Reply with `We would like to apply`.
4. Resend Receiving shows the reply.
5. Agent → **Needs reply** shows the row.
6. Reply `unsubscribe` → target **OPTED_OUT**, not left open in Needs reply.

## What the app does
- Outreach send uses `fundraisingOutreachReplyTo()` (`FUNDRAISING_OUTREACH_REPLY_TO` → else `info@`).
- Webhook on `email.received` loads body from `GET /emails/receiving/{email_id}` then classifies into Needs reply / opt-out.
