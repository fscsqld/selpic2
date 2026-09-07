# Admin test checklist — Agent OpenAI usage + imagery UX (local, before deploy)

Do **not** deploy until this passes. Production already has `OPENAI_API_KEY`.

## 1. Agent hub usage card
1. Open `/admin/agent` (needs `agent:read`).
2. See **OpenAI usage (Agent HITL)** card with month (UTC), est. total, calls, by sector.
3. Empty month: `$0.0000` / “No Agent OpenAI calls this month yet” is OK.
4. Link **OpenAI Billing** opens platform.openai.com billing.
5. Disclaimer mentions accounting sandbox is separate.

## 2. Log a chat call
1. Inbound or Community → **Polish with AI** once (costs a few cents).
2. Refresh Agent hub → call count / sector row updates (may take a second after the polish response).

## 3. Log an image call + Media Library
1. Products → Edit product → Generate / Edit with AI → success.
2. Apply → **Save product** (button label is Save product, not Edit).
3. Agent hub → image calls +1.
4. Media Library should list a new **AI product — …** tagged `ai-generated`.

## 4. Performance deep-link
1. `/admin/agent/performance` → weak imagery item link.
2. Lands on Products with `?q=&edit=` and opens the edit modal when id matches.

## 5. Kill switches (optional)
- With `AGENT_PRODUCT_IMAGE_GEN=0` locally, Generate fails with clear message; usage unchanged.
- Template Generate (no Polish) must not increase usage.

## 6. Permissions
- `agent:run` alone can hit polish/image APIs when domain write missing (staff JWT).
- Send / Approve still need sector **write**.
