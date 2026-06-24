# Admin order alert sound

When a customer places a new order, `/admin/orders` and the dashboard can play an alert.

## Sound file

Default: **`new-order-alert.mp3`** in this folder (your coin/order effect).

To change it later, replace that file or add **`new-order-alert.wav`**.

The app tries `.mp3` first, then `.wav`. If neither loads, a short built-in tone is used.

## Enable in admin

1. Open **Orders** (`/admin/orders`).
2. Click **Enable chime**.
3. Keep the admin tab open — sound plays when a new **pending** or **paid** order appears.

Settings are stored in `localStorage` (`selpic-admin-order-sound-enabled`).
