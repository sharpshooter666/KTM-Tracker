# KTM Tracker

A installable (PWA) live departure board for the KTM Komuter Tanjung Malim &ndash;
Pelabuhan Klang line, built with Next.js. Defaults to Kuang &rarr; Bank Negara but
lets you pick any of the 15 main-trunk stations as your origin/destination.

Features:
- Live countdown to your next train (split-flap departure-board style)
- Weekday vs weekend/public-holiday timetable, auto-detected by day of week (with a
  manual "Cuti Umum" override for public holidays, since those can't be auto-detected)
- Route picker — any origin/destination pair among the 15 main-trunk stations
- Shows the most recently departed train alongside upcoming ones
- Optional local notification 15 minutes before departure
- Installable to your phone's home screen as a standalone app (PWA)

## Getting started locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

1. Push this project to a GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new), import the repo, and click **Deploy**
   (no configuration needed — Vercel auto-detects Next.js)
3. Once deployed, open the Vercel URL on your iPhone in Safari, tap **Share &rarr; Add to
   Home Screen**, and you'll get a real app icon that launches full-screen

## Project structure

```
app/
  layout.tsx        Root layout + PWA metadata (manifest, icons, theme color)
  page.tsx           Renders the tracker
  globals.css        Global styles + fonts
components/
  KtmTracker.tsx      Main tracker component
  KtmTracker.module.css
  RegisterSW.tsx      Registers the service worker for offline support
lib/
  schedule.ts         Timetable data + scheduling helpers
public/
  manifest.json       PWA manifest
  sw.js               Service worker (offline app-shell caching)
  icons/              App icons (placeholders — swap these for your own artwork)
```

## Notes & limitations

- The station list is intentionally limited to the 15 stations between Tanjung Malim
  and Kuala Lumpur/KL Sentral, where every trip's timing lines up consistently in the
  official timetable. The Pelabuhan Klang branch beyond that is served by only some
  trips per day, so it's excluded to avoid showing a mismatched pairing.
- Public holidays aren't auto-detected (no holiday calendar wired in) — use the
  "Cuti Umum" toggle on those days to switch to the weekend timetable.
- The 15-minute reminder uses the browser Notification API. On iOS this only fires
  reliably while the app is open or was recently in the foreground — true background
  push would require a server-side push service, which isn't included here.
- Timetable data reflects the weekday schedule effective 6 Jul 2026 and the
  weekend/public-holiday schedule effective 4 Jul 2026. Update `lib/schedule.ts` if
  KTM publishes a new timetable.

## Replacing the app icons

Placeholder icons are in `public/icons/`. Swap in your own `icon-192.png`,
`icon-512.png`, `icon-maskable-512.png`, and `apple-touch-icon.png` (same filenames
and sizes) and they'll be picked up automatically.
