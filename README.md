# Imaq ᐃᒪᖅ · Household water

Imaq helps a household in Inukjuak, Nunavik, know three things about its trucked water:

- **Is it safe to drink?** A 3-step chlorine test-strip check gives a clear result: *Safe to drink*, *Check your water* or *Don't drink*.
- **How long will it last?** The tank level is shown as *days of water left*, forecast from the household's own usage pattern.
- **How do we use it?** Daily, weekday and hour-of-day trends, plus plain-language insights such as the busiest day, peak hours, a leak check and how often the tank ran low.

When the live Open-Meteo forecast shows a blizzard, the app works out how much water the household can use each day so the tank lasts until trucks can run again.

Built at Hack for Humanity Ottawa 2026 for the "Designing for the North" challenge.

## Accessibility

- **Languages:** English, French and Inuttitut syllabics. The Inuttitut is a draft; any string without a reviewed translation falls back to English, so there are no machine guesses.
- **Status is never colour alone:** each state has its own shape (circle = safe, triangle = check, octagon = stop) plus text.
- **Listen button:** reads the water status aloud in English and French. Inuttitut needs recorded voices.
- **Display:** three text sizes, light and dark themes, touch targets of at least 48 px, and a skip link.
- **Screen readers:** every control has a name, and each chart has a data-table view.
- **Offline:** the app is an installable web app that works offline. It is 89 KB gzipped.

## Run it

```bash
npm install
npm run dev
```

## What is simulated

- **Tank readings:** 30 days of hourly readings are generated. A real home would use a level sensor on the tank.
- **Demo controls:** Settings has switches to simulate a blizzard and a boil-water advisory.
- **To confirm locally:** chlorine limits (0.2–4 mg/L free chlorine) need confirmation by the Inukjuak water plant, and the tank sizes are placeholders.

## Design

UI follows the 2one Design Language System rules: tokens only, pill buttons, one brand accent, no colour-only state, and zero-based chart axes.

## License

MIT
