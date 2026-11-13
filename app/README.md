# Board Tracker app

The phone app (iPhone and Android), built with Expo and Supabase.

## Run it on your phone

1. Install **Node.js** (the LTS version) from nodejs.org on your computer.
2. Install **Expo Go** on your phone from the App Store or Google Play.
3. On your computer, open a terminal in this `app` folder and run:

   ```
   npm install
   npx expo start
   ```

4. A QR code appears in the terminal.
   - **iPhone:** open the Camera app and point it at the QR code.
   - **Android:** open Expo Go and tap **Scan QR code**.

Your phone and computer need to be on the same Wi-Fi. If they can't be, run `npx expo start --tunnel` instead.

## Where things are

- `src/app/` — screens (one file per screen)
- `src/components/` — the liquid bag, pegboard and shared buttons/fields
- `src/lib/board.tsx` — loading data, live sync and every action (hang, take, pay, undo, restock)
- `src/lib/supabase.ts` — Supabase project URL and publishable key
- `../supabase/schema.sql` — the database setup script
