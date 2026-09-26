# AusPost Brisbane shipping defaults (learned 2026-09-26)

Retail sources: [AusPost Regular letters](https://auspost.com.au/personal/sending/letters/sending-in-australia/regular) (own envelope) and Brisbane Parcel Post guide (own packaging ≤500 g, from 1 Jul 2026).

| Store option | Previous default | AusPost retail (2026) | New code default |
|---|---|---|---|
| Standard Letter (stickers) | $2.40 | Large ≤125 g **$3.70** (small letter $1.85 only if ≤5 mm DL) | **$3.70** |
| Market S untracked letter | $3.20 | Large ≤125 g **$3.70** | **$3.70** |
| Tracked Letter | $5.50 | Large ≤250 g **$5.55** | **$5.55** |
| Parcel Post (Goods) | $10.90 | ≤500 g **~$11.70** (Brisbane Q1 guide) | **$11.70** |
| Express Post | $14.50 | (left) | $14.50 |
| Click & Collect | $0 | n/a | $0 |

**Live CMS:** Admin → Shipping edits **Standard Letter**, **Market S untracked letter**, Parcel, etc. All are CMS `shippingOptions` rows. Hydrate inserts Market S letter if missing; save persists to Supabase. See `.cursor/rules/market-s-letter-admin-editable-rate.mdc`.

**Free shipping:** threshold default **$70**. Market S letter free-at-threshold defaults **ON**; Admin checkbox can turn it off.
