# RNGBLOX Client Testing Guide

This guide covers how to test the full delivery workflow from customer checkout through to final delivery confirmation.

---

## Prerequisites

- RNGBLOX app running locally (`npm run dev`)
- At least one MM2 bot account set to `ONLINE` with inventory in the admin panel
- Admin account credentials

---

## Part 1: Full Payment → Inventory Flow

1. Visit `/store` and add MM2 items to your cart.
2. Click **Checkout with Stripe** and use test card `4242 4242 4242 4242`.
3. After payment, check `/inventory` for the credited items.
4. Verify the admin `/admin/orders` page shows the order as `PAID` / `INVENTORY_CREDITED`.

---

## Part 2: Withdrawal Flow (Under $200)

1. From `/inventory`, click **Withdraw** on an item.
2. You will be redirected to `/withdraw/[withdrawalCode]`.
3. Enter your Roblox username and click **Confirm Username**.
4. Click **Start Delivery** to be assigned a bot.
5. Proceed with the game-specific flow below.

### Over $200 Rule
- Withdrawals over $200 go to `SUPPORT_REQUIRED`.
- Admin must approve in `/admin/support` before delivery continues.

---

## Part 3: MM2 Private Server Delivery Flow

### Customer Side

| Step | Action |
|------|--------|
| 1 | Withdraw an MM2 item from `/inventory` |
| 2 | Enter your Roblox username and confirm |
| 3 | Click **Start Delivery** — bot is assigned |
| 4 | On the **MM2 Delivery Instructions** panel, click **Add Bot** to open the bot's profile |
| 5 | Send a Roblox friend request to the bot |
| 6 | Click **I Sent Friend Request** on the website |
| 7 | Click **Join MM2 Server** — the MM2 private server opens in a new tab |
| 8 | Enter the private server and stay in the lobby |
| 9 | Click **I Am In Server** to notify the operator |
| 10 | Wait for a trade request from the assigned bot |
| 11 | **Only accept the trade from the bot username shown on the panel** |
| 12 | After accepting the trade, the page will update to **Delivered** |

**Important:** Never accept a trade from any other player. Only accept from the bot shown.

### Operator Side (Admin)

| Step | Action |
|------|--------|
| 1 | Open `/admin/deliveries` — look for MM2 deliveries with customer waiting |
| 2 | Click on the delivery to open the detail page |
| 3 | Find the **MM2 Operator Panel** section |
| 4 | Log in to the assigned Roblox bot account manually (outside the website) |
| 5 | Open MM2 (Murder Mystery 2) in Roblox |
| 6 | Click **Open MM2 Private Server** in the admin panel to join the correct server |
| 7 | Look for the customer username shown in the operator panel |
| 8 | Click **Mark Operator Ready** once you are in the server |
| 9 | Find the customer in the MM2 lobby |
| 10 | Click **Mark Customer Found** once you locate them |
| 11 | Send a trade request to the customer username |
| 12 | Add the exact listed items to the trade |
| 13 | Click **Mark Trade Sent** on the admin panel |
| 14 | Confirm the trade in Roblox |
| 15 | Click **Mark Delivered** — this completes the delivery and deducts bot inventory |

**If the trade fails:** Click **Mark Failed** (optionally provide a reason). Bot inventory reservation is released. Customer can retry.

---

## Part 4: GAG2 Mailbox Flow

GAG2 uses the MAILBOX delivery method. No friend request or server join is required.

1. Customer withdraws a GAG2 item.
2. Customer confirms Roblox username.
3. Delivery enters the queue automatically.
4. Admin opens `/admin/deliveries` and finds the queued GAG2 delivery.
5. Admin manually sends the item through the GAG2 mailbox system.
6. Admin clicks **Mark Delivered**.

---

## Part 5: Admin Support Review (High-Value)

For withdrawals over $200:

1. Customer withdrawal is auto-set to `SUPPORT_REQUIRED`.
2. Admin opens `/admin/support` and reviews the withdrawal.
3. Admin can:
   - **Add Note** — document reasons
   - **Approve for Delivery** — assigns bot and enters normal queue
   - **Reject** — cancels withdrawal, releases customer inventory reservation
4. Customer page auto-updates when approved or rejected.

---

## Part 6: Queue and Status Checks

| Status | Customer Sees |
|--------|--------------|
| `WAITING_FRIEND_REQUEST` | Add bot + I Sent Friend Request buttons |
| `WAITING_JOIN` | Join MM2 Server button |
| `PROCESSING` | Operator is handling it |
| `DELIVERED` | Green success screen |
| `FAILED` | Error with retry option |
| `SUPPORT_REQUIRED` | Fraud review message |
| `EXPIRED` | Expired message with support link |

---

## Part 7: MM2 Session Status Reference

| MM2 Session Status | Meaning |
|--------------------|---------|
| `WAITING_FRIEND` | Customer needs to add bot as friend |
| `WAITING_CUSTOMER_JOIN` | Customer needs to join the server |
| `CUSTOMER_IN_SERVER` | Customer clicked I Am In Server |
| `OPERATOR_READY` | Operator is in the MM2 server |
| `TRADE_SENT` | Operator sent trade request to customer |
| `TRADE_ACCEPTED` | Trade accepted (delivery in progress) |
| `DELIVERED` | Trade complete, inventory deducted |
| `FAILED` | Trade failed, inventory released |
| `EXPIRED` | Session timed out |

---

## Quick Verification Checklist

- [ ] Stripe payment → inventory credited
- [ ] Duplicate webhook does not double-credit inventory
- [ ] Under $200 withdrawal enters delivery queue
- [ ] Over $200 withdrawal goes to SUPPORT_REQUIRED
- [ ] MM2 bot assigned with correct private server URL
- [ ] Customer can add friend and click I Sent Friend Request
- [ ] Customer can join server and click I Am In Server
- [ ] Admin sees customer-in-server notification
- [ ] Admin can mark operator ready, customer found, trade sent
- [ ] Admin Mark Delivered completes delivery and deducts bot inventory once
- [ ] Second Mark Delivered does not deduct inventory twice
- [ ] Admin Mark Failed releases reserved inventory
- [ ] GAG2 flow does not show friend/join buttons
- [ ] Admin support approve assigns bot correctly
- [ ] Admin support reject cancels and releases reservation
- [ ] Expired withdrawal releases bot inventory

---

## Local Development Setup

```bash
# Start dev server
npm run dev

# Seed database (includes MM2 bot accounts and game configs)
npx prisma db seed

# Run type checks
npm run typecheck

# Run all tests
npm run test

# Build for production
npm run build
```

### Environment Variables Required

```env
DATABASE_URL=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
APP_URL=http://localhost:3000
ADMIN_SESSION_SECRET=...
DELIVERY_ADAPTER=manual  # manual | mock | auto
```

### Stripe Local Webhook Testing

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```
