# Fodi

A money meter for a taxi driver in Burundi. Not an accounting app with a taxi skin.

It answers three questions in under five seconds:

1. **Did I make money today?**
2. **Am I running on fuel without making money right now?**
3. **How much of my own money is still sitting in the tank?**

The full design and build plan is in [`PLAN.md`](./PLAN.md).

---

## Typographie

**Product Sans** (400 / 500 / 700), embarquée localement dans `assets/fonts/`.
Ce n'est pas une police publiée dans `@expo-google-fonts`, d'où le téléchargement
direct des fichiers TTF depuis Google Fonts.

Seules les graisses 400, 500 et 700 existent. Tous les styles mappent donc sur une
gravité réelle plutôt que de laisser Android fabriquer un faux gras — sur de
grands nombres, un faux gras a l'air baveux.

> **À vérifier avant toute publication :** Product Sans est distribuée sous la
> licence Google Fonts « restreinte » (`googlerestricted`). L'usage courant est
> autorisé, mais la police ne doit pas être modifiée ni transformée en œuvre
> dérivée. Pour une vente commerciale hors Google, mieux vaut confirmer.

## Langue

L'interface est **entièrement en français**. Les phrases générées par le moteur
(verdict, seuil de rentabilité, récupération du plein) sont également en français :
ce sont elles qui expliquent l'application, pas seulement les libellés.

Convention numérique française : espace insécable pour les milliers (`12 500`),
virgule pour les décimales (`22,5 L`). La virgule n'est **jamais** un séparateur
de milliers en français, donc `22,5 L` ne peut pas être confondu avec `225 L` —
important pour le carburant.

## Code PIN par défaut

**5832**

The app lock is on by default. The PIN above is hardcoded in
[`src/core/lock.ts`](./src/core/lock.ts) as `DEFAULT_PIN` and is documented here so
it is never lost.

- Change it in settings, or turn the lock off there.
- **There is no "forgot PIN" recovery.** With no backend there is no account and
  no email to reset against. This is the one real cost of running without a
  server, and it is handled by telling him plainly at setup rather than showing a
  reset button that cannot work.
- The PIN is stored salted and SHA-256 hashed in `expo-secure-store`, never in
  plain text in the database.

---

## The idea the app is built on

Naive apps treat fuel as `litres × price`. That is wrong for this driver, because
he tops up (2 L, then +6 L, then fills up) and buys at different stations at
different prices. Fuel is a **stack of price layers**, burned **oldest first**.

```
Buy 2 L @ 3 600  →  tank 2 L,  7 200 FBu,  blended 3 600
Add 6 L @ 3 900  →  tank 8 L, 30 600 FBu,  blended 3 825
Burn 5 L         →  tank 3 L, 11 700 FBu,  blended 3 900   ← FIFO: 2@3600 + 3@3900
Fill 12 L @ 3 750 →  tank 15 L, 56 700 FBu, blended 3 780
```

After that drive the cheap fuel is gone and he is genuinely running on the 3 900
stuff. A naive app would say 3 825 forever.

**Break-even** is derived from that blended price, not from the last price paid:

```
fuel_break_even_kmL = blended_price_in_tank / revenue_per_km
true_break_even_kmL = blended_price_in_tank / (revenue_per_km − other_per_km)
```

Both come out in km/L because `(FBu/L) ÷ (FBu/km) = km/L`.

The number on the home screen is the **engine margin**: how much worse his fuel
economy can get before he starts losing money. Negative means he is already there.

---

## Commands

```bash
npm install --legacy-peer-deps   # SDK 57 peer resolution
npm start                        # Expo dev server
npm run android                  # run on a connected Android device
npm test                         # fuel engine unit tests
npm run test:coverage            # with coverage thresholds
npm run typecheck                # tsc --noEmit
```

### Build an installable APK

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

The APK lands in `android/app/build/outputs/apk/release/`. Sideload it to test
phones with `adb install -r <apk>`.

---

## Layout

```
src/
  app/                  expo-router: 5 tabs + one first-run route
    (tabs)/
      index.tsx         TODAY   — the three questions
      trips.tsx         TRIPS   — A→B log
      fuel.tsx          FUEL    — tank gauge, break-even, tank cycle
      money.tsx         MONEY   — other costs and extra income
      reports.tsx       REPORTS — week/month/year P&L
  core/                 ← pure. No React, no SQLite, no Expo runtime.
    fuel/
      engine.ts         FIFO layers, refill/consume, blend
      breakeven.ts      per-km, break-even km/L, margins, verdict + copy
      cycle.ts          tank-cycle recovery
      allocate.ts       split burned fuel across trips by km
    format.ts           FBu, km, L — grouped the French/Burundian way
    theme.ts            dark/light palettes and the system-follow rule
    levels.ts           the five tank-level buttons
    backup.ts           mirroring, share sheet, restore
    lock.ts             the PIN
  db/                   schema, queries, tank rebuild
  store/                zustand + one recompute
  ui/                   tokens, components, gauges, ThemeProvider, sheets
```

**The architecture rule:** all money and fuel logic is pure functions in
`src/core` with zero React and zero SQLite imports. The UI only renders their
output. That is what makes the risky part testable.

**Theming:** `tokens.ts` holds only typography, spacing and radii. Colour comes
from `useTheme()`. Each screen builds its stylesheet through `makeStyles(colors)`
and `useThemedStyles`, so switching theme rebuilds the styles instead of leaving
them stale.

---

## Data and backups

No backend. One SQLite file, about **1.3 MB a year** (gzipped ~300 KB), so the
backup strategy is just "copy the whole file" — no delta logic, no sync protocol.

| Layer | Protects against | Cost to the driver |
|---|---|---|
| Auto-mirror to app storage | app uninstall | nothing |
| Auto-mirror to a picked folder | factory reset | one permission, once |
| `BACKUP` button → share sheet | losing the phone | one tap, weekly |
| Printed month report | everything above failing | one sheet a month |

Nudge thresholds: grey under 7 days, amber at 7, red at 14. Backups are **not
encrypted** — a backup that always restores beats one gated by a passphrase, and
with no backend there is no safe way to lose one.

**Cannot be done without a backend:** remote wipe, remote lock, remote copy.

---

## Status

| Phase | State |
|---|---|
| P0 Scaffold | done — Expo SDK 57, router, 5 tabs, UI kit |
| P1 Data | done — schema, migrations, seeded categories, tank rebuild |
| **P2 Fuel engine** | **done — 99 tests, 95.9% coverage, thresholds enforced** |
| P3 Trips | partial — entry sheet works, list screen still a placeholder |
| P4 Fuel screen | partial — entry sheet works, fill history not built |
| P5 Money | planned |
| P6 Today | partial — cards render real data, entry sheets pending |
| P7 Reports | planned |
| P8 Polish | planned |
| P9 Safety | partial — mirror and lock written, restore UI pending |
| P10 Field test | planned |

Exit criteria for P2 were: 100% branch coverage on the fuel core and the
`2 L → 6 L → full` example asserting to the last franc. Both are met and enforced
in `vitest.config.ts`, so a regression fails the build rather than shipping a
driver an app that lies about his fuel cost.