# Swing Shift: Suchindra's portfolio, Spider-Man edition

A dark, night-city portfolio for Suchindra, a full-stack developer in Hyderabad. Move over the mask in the hero and his face shows through.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3200.

Built with Next.js 16, React 19 and Tailwind CSS 4.

## What's here

- **Home:** the hero reveal with its 3D web, the work as a connected atlas of six projects (one stage, one frame per project, each opening its case study), a short About and Contact.
- **`/work/<project>`:** one page per project: what it is, what he did, the hard part, how it works, stack, links and credits.
- **`/about`:** experience, education, skills and recognition.

Every claim carries a label: implemented, reported, upstream, simulation, concept or screenshot. A concept is never shown as built.

## The hero reveal

The hero uses two image files supplied by Suchindra, exactly as supplied (`public/portrait/`). The face layer sits on top and is masked to a soft circle that follows the cursor. On touch screens, tap or press and hold. A keyboard toggle is also available, and reduced-motion settings are respected.

The layer underneath is his professional portrait, `public/portrait/suit-portrait.webp`, served exactly as supplied (in both dimensions) and fitted to the box without stretching. Wherever the circle goes it uncovers the whole portrait: face, hair, suit, shirt and tie. The earlier face file and its head-only `reveal-region.png` (from `tools/reveal-region/region.py`) are kept but no longer used.

## Credits and rights

- RAYA is a fork of [MARK XLIX](https://www.youtube.com/@FatihMakes) by FatihMakes (CC BY-NC 4.0).
- INFINOS screenshots and models © INFINOS Tech.
- The Spider-Man suit and emblem belong to Marvel / Sony. This is a non-commercial fan edition, not affiliated with or endorsed by them.
