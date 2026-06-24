# Admin order alert sound

When a customer places a new order, `/admin/orders` and the dashboard can play an alert.

## Use your own sound file

1. Copy your effect file to this folder as **`new-order-alert.mp3`** (recommended).
2. Or use **`new-order-alert.wav`**.
3. Redeploy (or refresh locally).

The app tries `.mp3` first, then `.wav`. If neither loads, a short built-in tone is used.

## Enable in admin

1. Open **Orders** (`/admin/orders`).
2. Click **Enable chime** (or any click on the page, then enable).
3. Keep the admin tab open — sound plays when a new **pending** or **paid** order appears.

Settings are stored in `localStorage` (`selpic-admin-order-sound-enabled`).
