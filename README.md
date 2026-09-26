# Imaq ᐃᒪᖅ · Household water

Imaq helps a household in Inukjuak, Nunavik, know three things about its trucked water:

- **Is it safe to drink?** The contamination level (free chlorine against the safe range) gives a clear result: *Safe to drink*, *Check your water* or *Don't drink*.
- **How long will it last?** The tank level is shown as *days of water left*, forecast from the household's own usage pattern.
- **How do we use it?** A daily usage chart, plus plain-language insights such as the busiest day, peak hours, a leak check and how often the tank ran low.

When the live Open-Meteo forecast shows a blizzard, the app works out how much water the household can use each day so the tank lasts until trucks can run again.

Home opens with a row of status pills: water quality, water level, water dispatch and weather. Each pill pairs colour (green, amber, red) with an icon shape and words, and tapping it opens the detail. Below the pills are two cards: current water level and contamination level (free chlorine against the safe range). On desktop, a sidebar holds the navigation and a **Request water tank** button. Weather is checked automatically (Open-Meteo, every 30 minutes) and shown only as a status.

## Deliveries and the water plant

- **Automatic requests:** when water drops below the household's alert level, a blizzard would outlast the tank, or the sewage tank is nearly full, the app asks the water plant for a truck by itself. Households can also request one with a single tap.
- **Request tracking:** each request shows its progress (Asked → Truck booked → On the way → Done). Optional phone notifications report each change.
- **Offline:** requests wait in an outbox and send when the connection returns. There's also a one-tap text-message fallback.
- **Water-plant view (`#plant`):** requests from all homes, sorted by a transparent priority score. The score counts days left, household size, priority needs (elder, baby, medical), a coming storm and waiting time, and every point shows its reason.
- **Council report:** the plant view can export an anonymised CSV of requests and wait times, as evidence for pipeline funding.
- **Sewage tank:** tracked alongside the water tank, because a full sewage tank stops all water use in the house.

To demo both sides, open Settings → **Open the water plant view**. The two tabs sync. Use **Skip ahead 12 hours** to watch the tank drain and the automatic request fire.

Built at Hack for Humanity Ottawa 2026 for the "Designing for the North" challenge.

**Live app:** https://imaq-sooty.vercel.app

## Accessibility

- **Languages:** English, French and Inuttitut syllabics. The Inuttitut is a draft; any string without a reviewed translation falls back to English, so there are no machine guesses.
- **Status is never colour alone:** each state has its own shape (circle = safe, triangle = check, octagon = stop) plus text.
- **Listen button:** reads the water status aloud in English and French. Inuttitut needs recorded voices.
- **Display:** three text sizes, a light theme, touch targets of at least 48 px, and a skip link.
- **Screen readers:** every control has a name, and each chart has a data-table view.
- **First run:** a two-step welcome with big language buttons, each showing the language in its own script.
- **Offline:** the app is an installable web app that works offline. It is about 100 KB gzipped.

## Run it

```bash
npm install
npm run dev
```

## What is simulated

- **Tank readings:** 30 days of hourly water and sewage readings are generated. A real home would use a level sensor on each tank.
- **Plant link:** the household and plant views sync through the browser. A real rollout would use an SMS gateway or a small server.
- **Other homes:** the other homes in the plant queue are sample data.
- **Demo controls:** Settings has switches to simulate a blizzard and a boil-water advisory.
- **To confirm locally:** chlorine limits (0.2–4 mg/L free chlorine) need confirmation by the Inukjuak water plant, and the tank sizes are placeholders.

## Design

UI follows the 2one Design Language System rules: tokens only, pill buttons, one brand accent, no colour-only state, and zero-based chart axes.

## License

MIT
