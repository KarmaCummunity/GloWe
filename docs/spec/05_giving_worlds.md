# 05 — Giving worlds and user journeys

Shared skeleton (post, closing, karma) is in [07](./07_cross_cutting_systems.md).

## 5.1 Food (`food`) — MVP, live
More than a third of food in Israel is thrown away while families lack it. Connects surplus to need within hours. Leket is the natural partner for volume (D37); KC handles neighbor-to-neighbor.
1. Photograph & post — offer requires photo, expiry date, allergens (D28, D21).
2. Matching — notify only on good match or saved filter (D10).
3. Chat & pickup — one chat per pair, post pinned (D13).
4. "Mark delivered" — karma, internal rating (D12, D15, D24). Unclaimed offers auto-close at expiry, alert 24h before (S4). Tech: hourly `food_expired_listings_sweep` → status `expired`, `notifications_food_expiry_check` (`0467`, KC#1316); "close at midnight of the expiry date" (S4) not applied — the giver's own expiry time is used.
Hub: food-safety knowledge; food banks; distribution points & community fridges; plug-in "event leftovers" routing (S36). Requests have no expiry (D21). Emergency food-shortage template (D42).

## 5.2 Items (`items`) — MVP, live
Huge market already exists in WhatsApp/Facebook/Yad2 "giveaway" without trust or tracking; KC brings it home (D38).
1. Post — item subcategory, condition, recommended photo (S19), address at chosen display level.
2. Requests via chat/comments (D25); poster chooses.
3. Handoff — "mark delivered" + recipient (D17, D19). Large items → rides for transport.
4. No expiry; relevance reminder after 14 days (D21, S3).
Item subcategories (D18): furniture, kitchen, clothing, books, toys, baby, sport, electronics, tools, other. Baby-product safety warning.

## 5.3 Rides (`rides`) — MVP (flag on since `0511`)
Rides live in WhatsApp groups; dedicated apps failed on critical mass. This world is the main growth engine: WhatsApp group import (D38, D47) and fixed routes. The bar is the WhatsApp ride group: publishing a ride is as fast as sending a message, and everyone who cares about that route hears about it at once (D70–D75).

One rides flow (D70): ride offers and requests are posts with a ride extension; bookings use the generic handoff stage. The separate legacy ride screens are retired; their emergency button and cost-sharing caps attach to this flow.

1. Driver posts (quick publish, D75) — origin, destination, up to 3 meeting points, departure, estimated end, seats. The last route is remembered and a past ride can be published again. Anyone may drive; verification is shown (D23).
2. Places — origin, destination and meeting points are picked **only** from official catalogs: cities, streets, and named junctions & interchanges. No free-text places (D71).
3. Passenger books a seat or posts a ride request. The driver sees every booking on the ride and approves or declines each; both sides get a push on every change (D73). Chat per pair (D13). An unapproved booking expires 12 hours after it was made or at departure, whichever is earlier, and frees its seats ({{D:ride-booking-expiry}}).
4. Saved route (D74) — a user follows a route (from → to, optional days and hours) and is notified of new rides along it; the rides form of the saved filter (D10). Urgent rides notifications bypass quiet hours ({{D:rides-urgency-rule}}).
5. Map (D72) — the ride's route (origin → meeting points → destination) is shown on the map; every place has "navigate" to Waze, Google Maps or Apple Maps.
6. Ride — emergency button during an active ride.
7. "Ride completed" — karma, internal rating; offer auto-closes 30 min after estimated end (D21).

Feed (D75): offers and requests together, sorted by departure, grouped today / tomorrow / later; departed rides are hidden.
Rules: no profit — cost-sharing caps (₪70 intercity / ₪20 urban). Secondary use: moving items/food.
Gaps: G44–G46, G48, G49 (G47 ✅).

Tech (G47 ✅): driver bookings list + approve / decline / expiry sweep / one `important` push per booking change (`0511`; `list_ride_bookings`, `decline_ride_booking`, `ride_bookings_expire_sweep` every 10 min, `giving_handoffs.cancel_reason`); app: `RideBookingActions` (driver `RideBookingsPanel`, passenger `RidePassengerBooking` with seat count) over `IRideBookingRepository`.

## 5.4 Time & volunteering (`time`) — MVP, live
Anyone can give an hour (D22). One-off, person-to-person, and org events.
1. Offer or request with estimated duration (D32).
2. Match & chat.
3. "Volunteering done" — unaffiliated: karma by declared duration (S14); affiliated: hours approved by the org manager (D32).
Emotional support only via a hotline. Elderly actions are tagged with the elderly domain (D39).

## 5.5 Money (`money`) — MVP (Grow) → phase 2
No money between users (D4). Now: donate to KC, one-time or recurring, via a Grow hosted payment page (D20) — the app only redirects and receives confirmation, so the provider can be swapped without code. Bit / PayBox transfer links are interim only and disappear once the one-time clearing page is live (D64). Vision: a JGive-like platform inside the app for every approved org, section-46 receipts, with JGive as partner (D37). No post form. Org directory with proper-management badge (S35).

## 5.6 Housing (`housing`) — next to launch (D30)
Two tracks: (a) community hosting à la Couchsurfing; (b) housing for at-risk populations (street people, at-risk youth, foster care, people fleeing violence) — only via professional bodies. **ID verification required for both sides** (D30).
1. Verified host posts — room/couch, dates, nights, house rules; city only.
2. Verified guest requests — both see verification level, completed stays, seniority — not ratings (S16, D24).
3. Chat before approval — exact address revealed only after approval.
4. "Hosting done" — karma, internal rating. At-risk track: confidential request via org, not in the public feed.
Always free. Minors only with a parent; at-risk youth only via an org (S16). Emergency: evacuee hosting (D42).

## 5.7 Knowledge, rights & legal aid (`knowledge`) — phase 2
Content exists (Kol Zchut, Campus IL); the missing piece is personal connection. Lessons and mentoring for free, plus rights and legal aid (D40): a pro-bono "consulting hour" post by lawyers, accountants, advisors (S36). No binding legal advice in posts — refer to an authorized party.

## 5.8 Experiences (`experiences`) — phase 2 (D45)
Unused tickets, free class places, workshops. Its own form, expiry at event date, and closing "experience delivered". Domain tag (culture, sport, spirituality…) set per post. Free only — a priced ticket breaches the terms. An org workshop may be an event post.
