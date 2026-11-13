# Board Tracker – App Plan

A shared, mobile inventory tracker (Android + iPhone). The main screen is a pegboard with bags hanging on it, and each bag is filled with liquid that shows how many grams it holds.

## Core concepts

| Concept | Meaning |
|---|---|
| **Inventory pool** | Total grams on hand. Starts from a number you enter. |
| **Bag** | A portion of grams with a price. It hangs on the board until someone takes it. |
| **Taken** | Someone grabbed the bag. **Its grams are subtracted from the pool at this moment.** |
| **Paid / Not paid** | Simple flag per bag. If not paid, it has an optional due date. |
| **History** | A bag that is taken **and** paid leaves the board and moves to History. |

## Decisions so far

- **Units:** grams.
- **Bag presets:** 2 g = $20, 4 g = $40, 6 g = $60, 7 g = $70, 14 g = $100, 28 g = $150. Each preset has an editable default price, and every bag's price can still be typed by hand. Custom gram amounts are allowed.
- **Liquid fill:** scaled so 28 g = a full bag (14 g = half, 2 g ≈ 7%).
- **Payments:** paid or not paid, with no partial payments.
- **Due dates:** push notification on the due date.
- **People:** a saved name list. Each person has a total owed and a history.
- **Restocking:** a log of restock entries (grams, date, optional cost) plus a manual adjust for corrections and losses.
- **Users:** several people sync the same board, all with equal permissions. Others join with an invite code.
- **Security:** a Face ID, fingerprint or PIN lock every time the app opens.

## Inventory math

```
on_hand_grams    = Σ restocks + Σ adjustments − Σ grams of taken bags
on_board_grams   = Σ grams of bags hanging (not yet taken)
available_to_bag = on_hand_grams − on_board_grams   (warn if a new bag exceeds this)
money_owed       = Σ price of taken, unpaid bags
money_collected  = Σ price of paid bags
```

## Screens

1. **Lock screen:** biometric or PIN.
2. **Sign in / Join board:** create a board, or enter an invite code.
3. **Pegboard (home):** bags on pegs with animated liquid. A header shows on hand, owed and collected. A "+" button adds a bag.
4. **New bag:** preset chips (2/4/6/7/14/28) or custom grams, with the price auto-filled from the preset and editable.
5. **Bag detail:** who took it (pick or add a person), price, paid toggle, due date if unpaid, and notes.
6. **Owed:** taken but unpaid bags, sorted by due date and grouped by person.
7. **People:** the saved list, each with total owed and history.
8. **Inventory:** the current pool, the restock log and adjustments.
9. **History:** finished bags, searchable.
10. **Settings:** preset prices, invite code, lock settings.

## Data model (draft)

- `boards` (id, name, invite_code)
- `board_members` (board_id, user_id)
- `presets` (board_id, grams, default_price)
- `people` (id, board_id, name, notes)
- `bags` (id, board_id, grams, price, status: `on_board` | `taken` | `paid`, person_id, taken_at, due_date, paid_at, notes, created_by)
- `stock_entries` (id, board_id, kind: `restock` | `adjust`, grams, cost, note, created_at, created_by)

## Proposed tech

- **App:** React Native with Expo, so one codebase builds for both iOS and Android. Skia or Reanimated draws the liquid animation.
- **Backend:** Supabase, which provides a Postgres database, sign-in, realtime sync between phones and row-level security so each board's data is visible only to its members.
- **Notifications:** Expo push notifications. A scheduled server function sends due-date reminders.
- **Lock:** `expo-local-authentication`.

## Build phases

1. Project setup, auth, create or join a board with an invite code.
2. Inventory pool, restock and adjust log.
3. Pegboard UI with liquid bags, plus presets and new-bag flow.
4. Bag detail: take, person, price, paid, due date.
5. Owed, People and History screens.
6. Push notifications, app lock, polish.

## Resolved

- **Due-date notifications** go to **every board member**.
- **Undo take:** a bag marked as taken can be undone. It returns to the board and its grams go back to the pool.
- **Currency:** USD only.
- **Over-bagging:** if a new bag needs more grams than `available_to_bag`, the app shows a warning but lets you continue.
- **Many bags:** the board scrolls down.
- **Taken but unpaid bags** leave the board and move to the Owed page. Once paid, they move to History.

## Open questions

- None right now.
