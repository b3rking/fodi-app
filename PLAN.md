# Fodi — Action Plan

A money meter for a taxi driver. Not an accounting app with a taxi skin.

---

## 0. What the app is

> An offline Android app that answers three questions in under five seconds:
>
> **1.** Did I make money today?
> **2.** Am I running on fuel without making money right now?
> **3.** How much of my own money is still sitting in the tank?

Everything below serves those three questions. Anything that doesn't is out of scope.

### Locked decisions

| Question | Answer | Consequence |
|---|---|---|
| Currency & units | **FBu, kilometres, litres** | Metric only. No unit-conversion layer. Amounts read `45 000 FBu`. |
| Jerrycan fuel | **No — tank only** | One container. Simpler engine, simpler forms. A `container` column stays in the schema so it can be added without a migration. |
| Daily payment to car owner | **No — he owns the car** | No revenue-share logic. Recurring costs kept only for real outgoings: data bundle, monthly insurance, weekly wash, union dues. |
| Platform | **Android only** | Expo tuned for Android. Large touch targets, sideloadable APK for field tests. |
| Vehicles | **One car** | No fleet, no driver handover, no vehicle switcher screen. |
| Data & backend | **No backend.** One SQLite file, self-contained | Auto-mirrored on the phone, sent off it as one small zip by one tap. Theft protection is a 4-digit app lock + the backup he already sent. See §6. |
| Backup cadence | **Weekly**, auto-mirrored on every write | Warning at 7 days, red at 14. Worst case: one week of trips exists only on the phone. |
| Backup encryption | **None** | Backups are plain readable zips. Simpler, and restorable on any device without a passphrase. |
| App lock | **4-digit PIN, on by default** | Stops a phone buyer reading his records and anyone quietly editing his books. Can be turned off. |

### Reference numbers used in every example below

Realistic Bujumbura taxi figures, so all the arithmetic is consistent and checkable:

| | |
|---|---|
| Tank capacity | 60 L |
| Fuel price | ~3 800 FBu/L (moves) |
| Typical fuel economy | ~10–11 km/L in traffic |
| Fuel cost per km | ~360 FBu/km |
| Fare per km | ~450 FBu/km |
| Other costs per km | ~40 FBu/km (wear, data, wash, insurance) |
| Profit per km | ~50–70 FBu/km — a thin margin, so *break-even is the whole game* |

That last row is why this app exists. At a ~15% margin, a 15% swing in fuel economy wipes
out the profit. The driver cannot feel that; a fuel price rise at one station can do it.

---

## 1. Design principles — these are the "self-explanatory" rules

1. **Plain words only.** "Money in", "Money out", "Fuel money left in tank". Never COGS, EBITDA, odometer delta, burn rate.
2. **The app computes, you type.** Kilometres come from the odometer you already entered. Fuel used comes from the tank math. Fuel cost per trip is allocated. You are never asked for a number the app can derive.
3. **Every number speaks in a sentence.** `3 800 FBu/L` is meaningless alone, so it always appears as *"that's 373 FBu for every kilometre you drive"*.
4. **One verdict, always visible.** `MAKING MONEY` / `JUST BREAKING EVEN` / `LOSING MONEY`, with a plain reason underneath.
5. **Four taps for the common case.** New Trip = destination, fare, done. Everything else pre-filled from last time.
6. **Empty states teach.** "No trips yet. Log one trip and we'll work out your km/L automatically."
7. **No jargon, no surprises.** Anything automatic gets an `auto` tag and the formula in a tooltip.
8. **Never make him type a tank fraction.** Five big buttons: `Empty · ¼ · ½ · ¾ · Full`, with `±` fine adjust. The tank graphic fills live as he types litres.
9. **Mistakes are reversible.** Undo on every delete, soft delete only, no confirmation dialogs for routine actions.
10. **Works with no network.** 100% local. No login, no spinner, no "sync failed".

---

## 2. The fuel engine — the hard part, build and test this first

### 2.1 Why `litres × price` is wrong

A naive app posts an expense of `litres × price` and calls it a day. For this driver that is
wrong on three counts:

- He **tops up** (2 L, then +6 L, then fills up). A fill is a **price layer**, not a tank.
- He buys at **different stations at different prices**. Fuel is a **stack of layers**, each with its own cost.
- Consumption is only **knowable at the next fill**, not in real time.

So "what did that fuel actually cost me" is a **FIFO queue problem**. That queue is the product.

### 2.2 Tank state

Three values, plus a queue, maintained at all times:

```
L        litres currently in the tank
C        cost of that fuel, still unburned          ← "my money, in liquid form"
layers[] FIFO queue of { litres_remaining, price_per_litre }
```

**Operations**

```
refill(volume, price, fee):
    layers.push({ volume, price })
    L += volume
    C += volume * price + fee      // convenience fee spread into the cost

consume(litres):                    // FIFO: oldest fuel is burned first
    cost = 0
    remaining = litres
    while remaining > 0 and layers not empty:
        take = min(layers[0].litres_remaining, remaining)
        cost    += take * layers[0].price_per_litre
        layers[0].litres_remaining -= take
        remaining -= take
        pop layer when it hits 0
    L -= litres
    C -= cost

blended_price() = C / L             // "you are actually running on this price right now"
```

**Worked example — exactly the case you described**

| Event | Litres | Price/L | Tank (L) | Tank cost (FBu) | Blended (FBu/L) |
|---|---|---|---|---|---|
| Buy 2 L | +2 | 3 600 | 2 | 7 200 | 3 600 |
| Add 6 L | +6 | 3 900 | 8 | 30 600 | 3 825 |
| Drive, burn 5 L | −5 | FIFO: 2@3 600 + 3@3 900 = **18 900** | 3 | 11 700 | **3 900** |
| Fill up 12 L | +12 | 3 750 | 15 | 56 700 | 3 780 |

After the drive, the cheap fuel is gone and he is **truly running on the 3 900 stuff**. The app
says so. A naive app would have told him 3 825 — and, worse, would have credited him with a
uniform cost forever after.

### 2.3 Consumption & efficiency — exact, including partial fills

Snapshots of `(odometer_km, litres_in_tank)` are stored at every fill and every trip.

```
litres_consumed = litres_at_start + litres_bought − litres_at_end
km              = odometer_at_end − odometer_at_start
efficiency      = km / litres_consumed
```

**The easy case:** tank Full before, Full after → `litres_consumed = litres_bought`. Exact, no
guessing, and this is most of his life.

**Partial fills are also exact**, because he told us the end level with the five big buttons.
No interpolation anywhere in this app.

Fuel burned between two readings is **allocated across the trips in that window proportionally
by km** — standard practice, and each trip can be overridden by hand.

### 2.4 Profit, break-even, and the margin that matters

For any period (default: rolling 30 days, switchable to 7 / 30 / 90 / all):

```
revenue_per_km = (Σ fares + Σ extras + Σ other income) / Σ km
fuel_per_km    = Σ cost of fuel actually burned / Σ km
other_per_km   = Σ non-fuel expenses / Σ km
cost_per_km    = fuel_per_km + other_per_km
profit_per_km  = revenue_per_km − cost_per_km
```

**Break-even fuel economy** — the km/L he must average to stay in business. Note this uses the
price of the fuel **currently in his tank**, because that is what he will burn tomorrow:

```
fuel_break_even_kmL = blended_price_in_tank / revenue_per_km
true_break_even_kmL = blended_price_in_tank / (revenue_per_km − other_per_km)
```

Both have real units: `(FBu/L) / (FBu/km) = km/L`. If `revenue_per_km − other_per_km ≤ 0`,
no break-even exists and the app says so plainly: *"Your other costs already exceed your
income. Even free fuel will not save you."*

**The two margins — the actual answers to "when am I running without money"**

```
profit_margin_pct     = profit_per_km / revenue_per_km
efficiency_margin_pct = (actual_kmL − true_break_even_kmL) / true_break_even_kmL
```

`efficiency_margin_pct` is the number to put on the home screen: **how much worse his engine
can get before he starts losing money.** Negative means he is already losing.

**When things are fine**

> *Your tank is running on 3 800 FBu/litre. At your current income of 468 FBu per km you must
> average **8.1 km/L** just to cover fuel. Including your other costs you need **8.9 km/L**.
> You are averaging **10.8 km/L** — your engine can get **22% worse** before you lose money.*

**When they are not**

> *● LOSING MONEY — your fuel went up to 4 300 FBu/litre and you are getting 7.5 km/L.*
> *You need **9.2 km/L** to cover fuel. You are **1.7 km/L short**.*
> *That is **145 FBu lost on every kilometre** — about **1 450 FBu for every 10 km** you drive.*
> *Two ways out: drive **1.7 km/L** better, or charge **145 FBu more** per km.*

Verdict thresholds, shown as a chip with a reason line:

| Test | Verdict | Colour |
|---|---|---|
| `profit_margin_pct ≥ 15%` | `MAKING MONEY` | green |
| `0 ≤ profit_margin_pct < 15%` | `JUST BREAKING EVEN` | amber |
| `profit_margin_pct < 0` | `LOSING MONEY` | red |
| fewer than 3 trips in window | `NOT ENOUGH DATA` | grey |

### 2.5 Tank cycle — "have I made back the fuel money?"

A cycle = one fill-to-full → the next fill-to-full. This is the single most valuable card for
this driver, because fuel is the one cost that leaves the pocket *long before* it earns anything.

```
TANK CYCLE #12 · filled Monday with 45 L for 171 000 FBu @ 3 800/L

   Drove              243 km   (10.8 km/L)
   Fares earned       109 350 FBu
   Fuel burned       22.5 L  →  cost 85 500 FBu
   ────────────────────────────────────────────
   PROFIT FROM THIS TANK      23 850 FBu
   Still unburned            22.5 L  →  85 500 FBu (your money, not profit)

   FUEL MONEY RECOVERED   ▓▓▓▓▓▓▓▓░░  128 %
   → You have made back the fuel 1.3 times over,
     and 85 500 FBu is still sitting in the tank.
```

### 2.6 Fuel money still in the tank (cash honesty)

Profit is an accounting number. Fuel is cash out of the pocket **today**. A driver can be
profitable and still be broke, and the app must not hide that:

```
unrecovered_fuel_money = C                        // paid for, not yet turned into km
km_left_to_drive      = L × recent_km_per_litre
```

Home-screen line: *"85 500 FBu of your money is fuel in the tank right now — 238 km to go."*

### 2.7 Edge cases — each one is a unit test

- Buying **more than fits** in the tank → warn with the exact maximum, never silently clamp.
- `L > 0` but `C = 0` (edited or legacy data) → fall back to the mean of the layer prices, then to the last known price.
- Two fills at the **same odometer reading** → both kept, efficiency reported as `—` rather than infinite.
- Odometer typed **lower** than the last reading → prompt, keep history, never corrupt the ledger.
- Trip **crossing midnight** → attributed to the day it started.
- Fuel bought on **credit** (pay later) → `paid` flag; unpaid fuel stays in `unrecovered_fuel_money`.
- **First ever fill**, unknown starting level → he picks a level; efficiency for that first period is hidden instead of showing a lie.
- `fill_level = full` but the litres overflow → warn, offer the exact max.
- **Top-up then full on the same day** (very common) → both recorded, both listed, efficiency computed only on the full-to-full pair.
- **Reserve reached** → "Reserve level. Time to fill up." on Today.
- `revenue_per_km ≤ other_per_km` → "no break-even exists" message, not a divide-by-zero.

### Deliberately out of scope

- **Jerrycan / carried fuel** — one container only. The `container` column exists so it can be
  added later without a schema migration; there is no UI, no maths and no test for it.
- **Owner payout, daily settlement, revenue share** — he owns the car. `recurring` is kept only
  for genuine outgoings: data bundle, monthly insurance, weekly wash, union dues.

---

## 3. Information architecture — 5 screens, that's all

**Rule: new data is entered in a bottom sheet, never a new screen.** Screens are for looking.
The only extra route is a one-time first-run setup (three questions, see 4.6) — it is not a tab
and it is never shown again.

```
TODAY  ·  TRIPS  ·  FUEL  ·  MONEY  ·  REPORTS

Sheets: New Trip · Fueled Up · Add Cost · Add Income · Day detail · Tank detail · Settings
```

| # | Screen | The one question it answers | What it must do |
|---|---|---|---|
| 1 | **Today** | Did I make money today? | Three-second check-in: hero profit, run verdict, tank money, three big action buttons. |
| 2 | **Trips** | Where did my money come from? | A→B log with km, fare, fuel burned, profit per km. Filters and search. |
| 3 | **Fuel** | Am I losing money on fuel? | Tank gauge, tank-cycle recovery, break-even gauge, efficiency history, fill log. |
| 4 | **Money** | Where did my money go? | Non-fuel costs and extra income by category, month totals, recurring costs. |
| 5 | **Reports** | Am I actually getting richer? | Week/Month/Year P&L, profit trend, cost per km, best and worst days, export. |

**Screens we are refusing to build:** fuel analytics, vehicle manager, profile/login, budgets,
goals, streaks, achievements, community, chat, tutorial carousel, a sixth "insights" tab. That is
the "million screens" being designed out.

---

## 4. Screen specs

Amounts are FBu, distances km, fuel litres.

### 4.1 TODAY

**Journée de travail (ajout oct. 2026).** La journée s'ouvre et se ferme
explicitement : compteur de départ le matin (ouverture), compteur de retour
le soir (fermeture). Ça donne : km du jour, heures travaillées, et la
comparaison conso du jour vs moyenne (mauvais usage du carburant visible
d'un coup d'œil). Table `workdays` : date, odo_start, odo_end, started_ts,
ended_ts. Sans journée ouverte, l'écran Aujourd'hui le propose en un toucher.

```
  Wed 30 Sep                                    [⚙]  [Tank 22.5 L]
  ────────────────────────────────────────────────────────────────

    TODAY'S PROFIT
    2 980 FBu                                    ← hero, green or red, 40pt
    Fares 18 400 − Fuel 14 820 − Other 600       ← tappable to expand
    In your pocket today           +17 800 FBu   ← cash ≠ profit, smaller
      (the fuel you burned was paid for days ago)

  ────────────────────────────────────────────────────────────────
    ● MAKING MONEY
    Break-even 8.9 km/L   You 10.8 km/L           ← two bars, one scale
    Your engine can get 22% worse before you lose money.
    On pace today: 5 680 FBu profit   (on an 80 km day)

  ────────────────────────────────────────────────────────────────
    YOUR TANK
    ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░  22.5 / 60 L
    Running on 3 800 FBu/L  ·  worth 85 500 FBu
    238 km to go (at your recent average)  ·  filled 2 days ago, Station Puma
    ⚠ 85 500 FBu of your money is in the tank

  ────────────────────────────────────────────────────────────────
     [ ＋ TRIP ]      [ ⛽ FUELED UP ]      [ − COST ]
  ────────────────────────────────────────────────────────────────
    42 km      9 trips      3.9 L burned      438 FBu/km earned
    10.8 km/L  ·  10.6 km/L 30-day average

    M  T  W  T  F  S  S                     tap a day
    ▂  ▄  █  ▁  ▅  ▃  ●
```

**Sheet — New Trip.** Destination (chips of your last 10 places + "new"), Distance km
(pre-filled from your last trip to the same place, editable), Fare (big numpad), Extras
(collapsed), Start time (now). Live preview in plain English:

> *"18 km. Your usual fare for this route is 8 100 FBu. That covers the fuel — about 1.7 L,
> 6 460 FBu. Profit ≈ 1 640 FBu."*

**Sheet — Fueled Up.** Litres (numpad) → *tank graphic fills live* · Price per litre (or total;
the app derives the other) · Station (favourite chips + new) · Tank level after (five big
buttons, default **Full**) · Cash or credit · receipt photo (optional). Live preview:

> *"12 L into a tank that's at ¼ gives 27 of 60 L — not quite full. Since your last fill you
> drove 231 km on 27 L = **8.6 km/L**. That's worse than the 8.9 you need. You are now running
> on **3 800 FBu/L**."*

That sentence is the app explaining itself, before he saves anything.

### 4.2 TRIPS

```
  [Today][Week][Month][All]                       search 🔍
  42 km · 18 400 FBu fares · fuel 14 820 FBu · 71 FBu/km profit
  ────────────────────────────────────────────────────────────────
  WED 30 SEP                                       18 400 FBu
    ▸ Nyarugenge → Rohero         4.7 km         2 000 FBu
      fuel 0.4 L (1 520 FBu) · 10.8 km/L · 102 FBu/km
    ▸ Rohero → Bama               5.3 km         2 400 FBu
      fuel 0.5 L (1 900 FBu) · 10.6 km/L ·  94 FBu/km
    … 7 more
  ────────────────────────────────────────────────────────────────
  TUE 29 SEP                                       21 100 FBu
    …
  ────────────────────────────────────────────────────────────────
                                                      [ ＋ ]
```

Tap a row → edit / duplicate / delete (with undo). Missing data shows a soft ⚠, never blocks.

### 4.3 FUEL — the important one

```
  YOUR TANK
  ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░  22.5 / 60 L
  Running on 3 800 FBu/L  ·  worth 85 500 FBu  ·  238 km to go
  Last fill: Mon 28 Sep, Station Puma, 45 L @ 3 800/L
  ────────────────────────────────────────────────────────────────
  🔁 TANK CYCLE #12                      (still in progress)
  Filled Monday with 45 L — 171 000 FBu
  Drove 243 km  ·  made 109 350 FBu
  ┌──────────────────────────────────────────┐
  │  FUEL MONEY RECOVERED   ▓▓▓▓▓▓▓▓░░  128% │
  └──────────────────────────────────────────┘
  Profit from this tank        23 850 FBu
  Still unburned  22.5 L worth  85 500 FBu
  → Made back the fuel 1.3 times over
  ────────────────────────────────────────────────────────────────
  AM I LOSING ON FUEL?
  Break-even 8.9 km/L   ·   You 10.8 km/L
  ═════════════╪══════════════╪══════
  Earned 468 FBu/km   vs   cost 394 FBu/km
  Your engine can get 22% worse before you lose money.
  ────────────────────────────────────────────────────────────────
  FUEL ECONOMY — last 10 fills
  ▁▃▂▅▇▄█▆▃▂   avg 10.4   best 12.1 (8 Sep)
  ────────────────────────────────────────────────────────────────
  FILLS                     price per litre differs every time
                                      — that is the whole point
  28 Sep  Station Puma  45 L  171 000  3 800/L   <- current cycle, in progress
  24 Sep  Oil Co        25 L   97 500  3 900/L   → 230 km · 9.2 km/L
  19 Sep  Station Puma  45 L  169 200  3 760/L   → 384 km · 8.5 km/L
  15 Sep  Tresors       20 L   78 000  3 900/L   →  340 km · 8.5 km/L  ⚠ top-up (still a valid km/L)
```

### 4.4 MONEY

```
  SEPTEMBER 2026                                      [Month ▾]
  ┌────────────┬────────────┬────────────┐
  │ MONEY IN   │ MONEY OUT  │ LEFT       │
  │ 1 001 000  │ 844 000    │ 157 000    │  ← all FBu, includes fuel and trips
  └────────────┴────────────┴────────────┘

  OTHER COSTS (excluding fuel)                     86 000 FBu
    ███████████████  Maintenance & repairs 44 000    (6 taps)
    ████             Tyres                 10 500
    ███              Data bundle           15 000    🔁 30 000 / month
    ██               Insurance              9 000    🔁 monthly
    █                Car wash                4 500    🔁 every Friday
    █                Tolls & parking         3 000
  EXTRA INCOME                                     38 000 FBu
    Delivery 24 000 · Tips 8 000 · Car hire 6 000
  ────────────────────────────────────────────────────────────────
     [ ＋ COST ]              [ ＋ INCOME ]
```

Tap a category → its entries. Tap a 🔁 row → edit the rule ("30 000 FBu every month, next on 4 Oct").

### 4.5 REPORTS

```
  [Week][Month][Year][Custom]                      Sep 2026 ▾

  NET PROFIT  157 000 FBu          ▂▄█▂▅▃▇▄▂   weekly trend
  ────────────────────────────────────────────────────────────────
  Kilometres                    2 140 km
  Fares                         963 000       450 FBu/km
  Extra income                   38 000        18 FBu/km
  Fuel burned                199 L  758 000   354 FBu/km   10.8 km/L
  Other costs                   86 000        40 FBu/km
  ────────────────────────────────────────────────────────────────
  NET PROFIT                   157 000        73 FBu/km
  Margin 16%  ·  Break-even 8.9 km/L  ·  You're at 10.8
  Engine can get 22% worse before you lose money.

  BEST DAY   Sat 20 Sep    18 400 profit   68 km
  WORST DAY  Tue 25 Sep   − 1 200 loss    44 km
  WHERE IT WENT   Other costs ▦▦▦▦▦▦▦  Fuel ▦▦▦▦

  [ Export CSV ]        [ Share summary ]
```

### 4.6 First run — three questions, then straight to work

The whole onboarding is one screen, because a driver will skip it if it is long. No carousel, no
"skip", no account.

```
  WHAT ARE WE CALLING YOUR CAR?
  [ Taxi                          ]

  HOW BIG IS THE TANK?
  [ 60 ] litres
  How do you know? Most drivers know this. If not:
  [ I don't know — let me estimate it from my fuel bills ]

  HOW MANY KM DO YOU USUALLY DRIVE IN A DAY?
  [ 80 ] km        (just used to project today's pace)

  Tank 60 L at 3 800 FBu/litre. We will work out your real km/L from
  your first full tank.                            [ START ]
```

If he cannot say the tank size, the app assumes 45 L and then *infers* it from his first two
fills, telling him: *"We think your tank holds 50 L. Correct us if that is wrong."* Never a
hard blocker before he can use the app.

---

## 5. Data model (SQLite, local-first)

```sql
-- the car
vehicle(id, name, plate, odometer_km, tank_cap_l, reserve_l,
        can_cap_l,            -- always 0: jerrycan out of scope, column kept for later
        is_default)

-- every (odometer, litres) snapshot -> the source of truth for consumption
tank_reading(id, ts, odometer_km, liters, kind,      -- start | fuel | trip | manual
             vehicle_id)

fuel_buy(id, ts, vehicle_id, container,            -- always 'tank' in v1
         station, volume_l, price_per_l, amount, fee, odometer_km,
         fill_level,            -- full | three_quarter | half | quarter | empty
         paid,                  -- 1 cash, 0 credit
         receipt_uri, note)

trip(id, ts, from_place, to_place, km, fare, extras,
     odo_from_km, odo_to_km,
     fuel_l,                 -- null = allocate proportionally by km
     fuel_cost,              -- written by the engine, never by hand
     passengers, payment, note)

expense(id, ts, category, amount, odometer_km, vendor, note)
income (id, ts, category, amount, note)
recurring(id, label, amount, cadence, next_due, category, active)
         -- data bundle, monthly insurance, weekly car wash, union dues

-- settings: currency FBu (fixed), metric (fixed), day_start_hour, week_start,
--           tank capacity, reserve level, expected_km_per_day,
--           favourite stations, place history
```

Derived values — fuel cost per trip, daily rollups, efficiency, break-even — are **computed on
read** in SQL plus pure functions, never hand-maintained. Data volume is tiny (~2 000 rows per
year), so correct-by-construction beats fast-but-stale. A `daily_rollup` table can be added later
only if the year view needs it.

**Seeded categories, chosen for real taxi work**

- *Costs:* Maintenance & repairs · Tyres · Oil & servicing · Insurance · Road tax & levies ·
  Government levy · Data/airtime · Car wash · Tolls & parking · Fines · Union dues · Other
- *Income:* Passenger fare (auto-created from trips) · Delivery/courier · Car hire · Tips ·
  Bonus · Wash & detailing · Other

---

## 6. Data safety, backup and theft

No backend. One SQLite file. Here is why that is not a weak position.

### 6.1 The data is tiny — that fact unlocks the whole design

Assumptions for one driver working every day:

| Table | Rows/year | Bytes on disk |
|---|---|---|
| `trip` — 9 trips a day | 3 285 | ~590 KB |
| `fuel_buy` — 2 fills a day | 730 | ~160 KB |
| `expense` + `income` — 3 a day | 1 095 | ~205 KB |
| `tank_reading` — fills only, not every trip | 730 | ~50 KB |
| indexes + SQLite page overhead | | ~300 KB |
| **total** | **~5 800** | **~1.3 MB** |

**Gzipped, a full year of his entire business is roughly 300 KB. Five years is under 2 MB.**

So: no incremental sync, no delta logic, no server, no conflict resolution. **Just copy the
whole file every time.** A 1.3 MB file copy takes milliseconds and costs nothing. Every awkward
part of "syncing" disappears when the data is this small.

### 6.2 The one rule

> **The backup has to live somewhere that is not the phone.**

A backup on the same phone only protects against "I deleted a trip by accident". A stolen phone
and a factory reset both take the phone's storage with them. So the design target is narrow and
concrete: **make moving a sub-megabyte file off the phone a single tap.**

### 6.3 Five layers, all of them simple

**Layer 1 — Live safety (free, already in the app)**
- WAL mode, with `PRAGMA wal_checkpoint(TRUNCATE)` after every save. The single `fodi.db` file
  on disk is therefore always a complete, valid database — no `-wal`/`-shm` side files to worry
  about when copying it anywhere.
- Soft delete + undo for 30 days. Mistakes are recoverable without a backup.

**Layer 2 — Automatic mirror (zero taps, survives an uninstall)**
- Two seconds after any write, checkpoint and copy the file to
  `/storage/emulated/0/Android/data/com.fodi.app/files/fodi.db`
- Copy to `fodi.db.part` first, then rename — so a copy interrupted by a crash or a flat battery
  can never produce a broken backup.
- No storage permission needed. Invisible to other apps. Survives app updates and uninstall.
- Does **not** survive a factory reset. Hence layer 3.

**Layer 3 — Survives a factory reset (one permission, asked once)**
- Also write to a folder he picks with the system folder picker: SD card, Downloads, or a
  WhatsApp-visible folder. Target `/storage/emulated/0/Fodi/`.
- Android 11+ requires the Storage Access Framework for this; the app asks once and remembers.
- This is the file that outlives the phone.

**Layer 4 — Off the phone: one tap, and this is the part the app cannot automate**
- A `BACKUP` button builds `fodi-2026-09-30.zip` and opens the Android share sheet.
- He picks WhatsApp → himself, email → himself, Bluetooth, USB, or a cloud drive. Whatever he
  already uses. No account setup inside the app, ever.
- Inside the zip:
  - `fodi.db` — the real data, a plain SQLite file any tool can open
  - `manifest.json` — app version, row counts, date range, SHA-256 checksum
  - `summary.txt` — his September numbers as plain text
- **Why a zip and not the raw `.db`:** some mail apps strip unknown file types; a zip is never
  stripped. And `summary.txt` means that even if the database ever became unreadable, his totals
  survive as text he can read.

**Layer 5 — The reminder (weekly, and only gentle about it)**
- Today screen shows `Last backup 4 days ago`. Grey under 7 days, amber at 7, red at 14.
- Past 7 days the app asks once when it opens. Never blocks, never more than once a day, and
  "stop reminding me" switches it off permanently.
- **Weekly `PRAGMA integrity_check`** on the backup file, with a visible result:
  *"Backup checked — 1.3 MB, 4 210 trips, no problems."* Evidence, not hope. This runs on a
  7-day cycle, which is also the nudge cadence.
- The auto-mirror (layers 2 and 3) runs on *every* write regardless, so the worst case is that
  the last week exists only on the phone. That is an acceptable, understood trade for fewer taps.

**And on the new phone, restore is automatic**
- On first launch the app scans shared storage for `fodi-*.zip` and offers:
  *"Found a backup from 12 Aug — 11 months, 3 214 trips, net profit 1 240 000 FBu. Restore?"*
  with the plain-text preview shown **before** anything is written.
- It also accepts a backup opened from the Android share sheet (tap it in WhatsApp → Fodi).
- Restoring over existing data offers replace or merge, and always keeps the current file as
  `fodi.db.bak` first.

### 6.4 If the phone is stolen — what actually helps

| What the thief does | What it costs him | His protection |
|---|---|---|
| Opens the app, reads the trips | Almost nothing to them | App lock (PIN / fingerprint) |
| Deletes or invents entries | **His trust in his own numbers** | App lock; the backup file holds the real history |
| Factory resets it to sell | **Everything** | The backup he already sent himself |
| Pulls the raw `.db` off the storage | Nothing, to a stranger | It sits in app-private storage, invisible to other apps |

**Accepted trade-off — stated plainly:** backups are **not encrypted** (owner decision). Anyone who
gets hold of a backup zip can read the history with any SQLite tool. In practice that means someone
with access to his WhatsApp, email or SD card could read his records. For a stolen-phone scenario
the practical exposure is near zero, since the thief has no reason to look. Encryption was
considered and declined in favour of a backup that always restores, with no passphrase to forget.

**What is impossible without a backend:** remote wipe, remote lock, remote copy. Say this
plainly rather than pretending. With no server there is nobody to receive the instruction, and
nobody to send his data to.

**App lock — on by default, about a day of work**
- **4-digit PIN, stored hashed in `expo-secure-store`.** It stops a buyer reading his records, and
  it stops anyone quietly editing his books. Offer fingerprint as well on devices that have it.
- Auto-lock after 5 minutes in the background, not instantly — a driver checking the tank at a
  junction should not have to re-enter it every time.
- "Forgot PIN" is deliberately **not** offered: there is no account and no email to reset against.
  This is the one real cost of no-backend, and the honest handling is a clear warning at setup —
  *"There is no way to recover this PIN. Write it down or turn the lock off."* He can turn the
  lock off in settings at any time.

**Also included, since it is nearly free**
- Block screenshots and the recents-screen preview on the money screens.
- No encryption of the database or backups.

### 6.5 The paper fallback — not a joke

`Reports` gets a **print / save-as-PDF** month summary: profit, kilometres, km/L, break-even, and
every cost category. One sheet per month, kept in the glovebox.

If the phone is stolen and the backup was never sent, this paper is the only thing that survives —
and it is the only tier he cannot be robbed of. For a single-driver, no-backend app, that is a real
backup tier, not a consolation prize.

### 6.6 Optional later: fully automatic off-phone backup

If he decides the weekly tap is still too much, the app can push the same zip to storage he
already owns — a free cloud drive folder, or a free S3-compatible bucket — after every fill. No
server of ours to run. The honest costs: it needs an account and an API key, it needs internet, and
a failed upload during patchy coverage has to retry quietly in the background without ever blocking
the app.

Out of v1. Revisit after P10, and only if the field test shows he is not actually sending the
weekly backup. Note that weekly backups plus layer 2 means the *worst case* loss is one week of
trips, and only if the phone is gone and the last backup was never sent.

---

## 7. Tech stack & project layout

**Expo (managed) + TypeScript, Android target.** Fast iteration, sideloadable APK, no store
needed. Bare React Native rejected to avoid native build pain during development.

| Concern | Choice | Why |
|---|---|---|
| Navigation | `expo-router` | Typed file-based routes, five screens only |
| Storage | `expo-sqlite` | Local-first, fast aggregations, works with no network |
| State | `zustand` + one `recompute()` | Single source of truth, no cache drift |
| Charts | `react-native-svg`, hand-rolled | Three chart types only; skip heavy libraries |
| Forms | `react-hook-form` + `zod` | Fast numeric entry, real validation |
| Polish | `expo-haptics`, `expo-image-picker`, `datetimepicker` | Receipts, tactile feedback |
| Tests | `vitest` on the pure core | **The fuel maths must be provably right** |
| Build | `npx expo prebuild` + Gradle | Local debug APK; EAS only if a hosted build is wanted |

```
src/
  app/                 _layout.tsx, (tabs)/*.tsx, sheet routes
  core/                          ← pure: no React, no SQLite
    fuel/engine.ts               FIFO layers, refill/consume, blend
    fuel/cycle.ts                tank-cycle recovery
    fuel/breakeven.ts            per-km, break-even km/L, margins, verdict
    fuel/allocate.ts             split burned fuel across trips by km
    money/period.ts              profit, per-km, categorisation, recurring
  db/                schema.ts, seed.ts, queries.ts, migrate.ts
  store/             useAppStore.ts, recompute.ts
  ui/                tokens.ts, Card, Gauge, BarRow, NumPad, Sheet, Chip, EmptyState
  features/          today · trips · fuel · money · reports
```

**Architecture rule:** all money and fuel logic lives in `src/core` as pure functions with zero
React and zero SQLite imports. The UI only renders their output. That is what makes the risky
part testable, and what makes the app portable later.

---

## 8. Build phases

> **Suivi au 15 oct. 2026.** P0–P3 validés sur appareil (moteur FIFO testé au franc,
> 52 tests, couverture 100 % lignes ; trajets créés/modifiés/supprimés, totaux
> vérifiés à la main). Carburant + trajets terminés **hors parties monétaires**.
> Restent côté carburant : graphique conso, cycle de plein, seuil de rentabilité
> et verdict (tous débloqués par l'argent), photo de reçu, comptant/crédit.
> Prochaine étape : **P5 Argent**.

| # | Phase | Deliverable | Done when | État |
|---|---|---|---|
| **P0** | Scaffold | Expo + TS + router + tabs, `expo-sqlite` boots, design tokens, dark-first UI kit | App runs on a real Android phone with 5 empty tabs | ✅ fait (Single + Paramètres, SQLite OK, thème clair/sombre) |
| **P1** | Data | Schema, migrations, seeded categories, `vehicle` + `tank_reading` flows | A reading can be written, read back, and survives a restart | 🟡 partiel (table `fills` + `settings` ; pas de `trips`, `vehicle`, `tank_reading`) |
| **P2** | **Fuel engine** ⭐ | `refill/consume/blend`, FIFO layers, partial fills, allocation, tank cycle, break-even, verdict — with a full test suite covering every case in 2.7 | 100% branch coverage on `src/core`; the 2 L → 6 L → full example asserts to the last franc | ✅ moteur, seuils, verdict, cycles (reste : photo reçu, comptant/crédit) |
| **P3** | Trips | Quick-log sheet, list, filters, search, edit/duplicate/delete+undo | Ten trips logged, every total matches by hand | ✅ validé sur appareil |
| **P4** | Fuel screen | Tank gauge, live tank graphic in the form, fill log, economy chart, break-even gauge | A fill-up takes under 20 seconds and the preview sentence is correct | ✅ jauge ×3, journal, historique conso, cycle, seuil+verdict (reste : visuel animé dans la fiche) |
| **P5** | Money | Categories, cost/income sheets, month totals, recurring costs, category drill-down | Month totals equal the sum of entries | 🟡 en cours (fondation : base + moteur) |
| **P6** | Today | Hero profit, verdict card with the engine margin, tank card, three actions, 7-day strip, cash-in-pocket, pace projection | All three questions answered in 5 seconds | 🟡 construit (journée ouvrée/fermée, misuse, projection — à valider sur appareil) |
| **P7** | Reports | Week/Month/Year, trends, best/worst day, cost breakdown, CSV export, **printable month sheet** | Every number reconciles with Today and Money | 🟡 construit (P&L, tendance, extrêmes, CSV, partage — reste : impression PDF) |
| **P8** | Polish | Empty states, 60-second first run, receipts, reminders, big-font mode, accessibility, screenshot blocking | A non-technical driver uses it with no help | ⬜ prévu |
| **P9** | **Safety** ⭐ | 4-digit app lock, auto-mirror to app storage, mirror to a picked folder, `BACKUP` zip + share sheet, weekly integrity check, weekly backup-age reminder, **auto-detect restore on first launch** | Restore the backup on a wiped phone in under a minute, and the app shows him he still has his data | ⬜ prévu |
| **P10** | Field test | 3 real drivers, one week each. Measure: taps to log a fill, do they trust the break-even number, **did they actually send a backup**, what did they stop writing on paper | Fix the top 3 friction items, then ship | ⬜ prévu |

**On risk:** P2 is the risky one for *correctness* — if the fuel maths is wrong the app is a liar,
and the driver will find out on the road. P9 is the risky one for *trust* — a backup that exists
but is never sent is worth nothing, which is why P10 measures that explicitly rather than
assuming it.

---

## 9. Decisions — resolved

1. **Currency & units** → FBu, kilometres, litres. Metric only.
2. **Jerrycan fuel** → No. Tank only; schema left extensible.
3. **Daily payment to car owner** → No. Recurring costs kept for data, insurance, wash, dues.
4. **Platform** → Android only.
5. **Backend** → None. Safety comes from auto-mirroring the file, sending a sub-megabyte zip to
   himself with one tap, and a printed month sheet in the glovebox. Full reasoning in §6.
6. **Backup cadence** → Weekly nudge (amber at 7 days, red at 14). Auto-mirror runs on every write.
7. **Backup encryption** → None. A backup that always restores beats one gated by a passphrase.
8. **App lock** → 4-digit PIN, on by default, with no "forgot PIN" recovery path.

Nothing further is blocking. Recommended next step: **P0 + P2 together** — scaffold the project
and immediately build the fuel engine with its test suite, because that is where the risk lives.

---

## 10. Explicit non-goals for v1

No login · **no backend and no cloud sync in v1** — off-device backup is one manual tap by design
(§6.3 layer 4) · no remote wipe or remote lock, which are impossible without a server · no OBD or
Bluetooth car sensors · no receipt OCR · no multi-vehicle or fleet management · no driver handover ·
no budgets, goals, streaks or achievements · no ads · no in-app purchases · no onboarding carousel
(one setup screen, then straight to work).

---

*Next step on your go: I start P0 + P2.*





## Reste à faire (liste réécrite)

### 1. Écran Aujourd'hui (P6) — le gros morceau
- **Journée de travail** (nouveau) : bouton d'**ouverture** le matin (compteur de départ) et de **fermeture** le soir (compteur de retour) → km du jour, **heures travaillées**, niveau carburant au départ/retour
- **Détection de mauvais usage** : conso du jour vs ta moyenne — écart anormal = alerte visible
- **Le reste prévu** : profit du jour en héros, verdict + marge moteur, carte réservoir (niveau suivi), 3 boutons d'action (Trajet, Carburant, Coût), bandeau 7 jours, espèces en poche, projection sur la journée

### 2. Carburant — visuel animé
- La jauge **se remplit en direct dans la fiche** pendant la saisie des litres (au lieu de la seule phrase de prévisualisation)

### 3. P9 Sécurité — en entier
- Verrou PIN 4 chiffres (+ empreinte si dispo), anti-capture sur les écrans d'argent
- Miroir auto du `.db`, dossier choisi par l'utilisateur
- Bouton **SAUVEGARDE** : zip + partage (WhatsApp, mail, Drive…)
- Rappel hebdo discret, contrôle d'intégrité visible, restauration auto sur nouveau téléphone

### Explicitement reporté (sauf si tu redemandes)
Photo de reçu · comptant/crédit · heure de départ trajets · dates passées en argent · impression PDF · polish P8 · test terrain P10.

---

**Ordre proposé** : 1 (Aujourd'hui) → 2 (visuel animé, petit) → 3 (P9). Dis « vas-y » et je liste les fonctionnalités d'Aujourd'hui en détail avant de coder, comme d'habitude.