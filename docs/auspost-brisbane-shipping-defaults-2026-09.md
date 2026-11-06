# AusPost Brisbane shipping defaults

Retail sources (2026):
- [Regular letters](https://auspost.com.au/personal/sending/letters/sending-in-australia/regular) (own envelope)
- [Domestic letter with tracking](https://auspost.com.au/personal/sending/letters/sending-in-australia/letter-tracking) (prepaid)
- Parcel / Express own packaging ≤500 g (1 Jul 2026 guides)

| Store option | Code default | AusPost retail | Notes |
|---|---|---|---|
| Standard Letter (stickers) | **$3.70** | Large ≤125 g **$3.70** | Untracked |
| Market S untracked letter | **$3.70** | Large ≤125 g **$3.70** | Untracked |
| Tracked Letter | **$8.10** | Prepaid Medium C5 **$8.10** | **Not** untracked ≤250 g $5.55. Small tracked $5.85; Large C4 $10.15 |
| Parcel Post (Goods) | **$11.70** | Own pack ≤500 g **$11.70** | Tracking included |
| Express Post | **$15.20** | Own pack ≤500 g **$15.20** | Was $14.50 legacy |
| Click & Collect | **$0** | n/a | — |

**Correction (2026-11-06):** Tracked Letter was wrongly set to **$5.55** (untracked Large ≤250 g). Hydrate/server migrate rewrites exact `5.55` → `8.10` and Express `14.5` → `15.20`. Other Admin prices are left alone.

**Live CMS:** Admin → Content → Shipping. Edit price → save so Supabase persists. See `.cursor/rules/market-s-letter-admin-editable-rate.mdc`.

**Free shipping:** threshold default **$70**. Market S letter free-at-threshold defaults **ON**; Admin checkbox can turn it off.

**Charge to customer:** one **shipping option** per cart (not a separate fee per SKU line). Eligibility (letter vs parcel) comes from cart contents (`getCartShippingRequirement`); charged amount from CMS option + free-ship / VIP rules (`computeChargedShippingPrice`).
