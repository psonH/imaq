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
- **Water-plant view (`#plant`), Requests:** an Open/Delivered filter and a table of requests. Each row shows the house (app, phone or sample source icon), when it was requested, water left now, the deliver-by date (skipping no-service and high-risk days) and a status badge, with **Mark delivered** and **Cancel** (with confirmation). Tick several open requests (or all of them) to dispatch one truck to them together: the bar shows the water needed against the truck's size, and the homes see "Truck on the way". **Add a phone request** logs calls, and **CSV** exports an anonymised report for council and funding requests.
- **Water-plant view, Delivery plan:**
  - "What needs attention" recommendations, and a switch per truck (in service or maintenance).
  - Tabs for the next 7 days, each with its delivery risk from the Open-Meteo daily forecast. The forecast falls back to the last saved one, then to typical weather for the month, and says which is showing.
  - The homes the plan can't reach, and a card per truck with time used and stops grouped by load. Each stop has a "why" badge: requested, below reserve, before bad weather, or predicted.
  - **Confirm this day's plan** books a truck and time for each household with a request, and the household app shows "Plant booked truck W-n for <date>". **Print route sheets** prints one sheet per truck.

### How the planner works (`src/lib/planner.ts`, tested in `tests/planner.test.ts`)

- **Due day:** each home's due day is the last day trucks run (low risk = full shift, medium = 70 %, high or no service = none) on or before the day its tank reaches the 20 % reserve.
- **Who is served:** each day serves homes due today or tomorrow, plus open requests under 85 % full. Earliest due goes first, then requests, then the lowest tank.
- **Truck assignment:** each stop goes to the truck with the most shift time left. It costs 8 min per stop, plus 20 min fill and 10 min travel whenever a new load is needed.
- **Water cap:** deliveries are capped by plant storage plus that day's production.
- **Missed homes:** homes due that day but not reached are listed, and the truck time they needed becomes the extra-hours recommendation.
- **Tests:** run `npm test`. They check that trucks stay within shifts, the plant water cap holds, homes are pulled ahead of storms, deliver-by skips no-service days, and no home is served more than it needs.

**Plant sample data (badged in the UI):**
- **Homes:** 420 generated homes (household sizes 1–9, tanks 1,600–2,270 L, 4 routes) and 12 generated requests. Only House 214, the household app, is live.
- **Fleet:** trucks W-1 to W-5 on 10-hour shifts (W-4 carries 11,000 L, the rest 9,000 L), and W-6 in maintenance. Deliveries run Monday to Saturday.
- **Plant:** produces 240,000 L a day, with 600,000 L of storage (420,000 L now).
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
