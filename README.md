# Studio Mirror

Smart-mirror kiosk for custom salon clients, built on the beauty_platform template. See `CLAUDE.md`.

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm install
npm run dev                  # http://localhost:3011 (1080×1920 MirrorFrame)
```

| Mockup step | Route |
|---|---|
| 1 Take a photo | `/` |
| 2 Profile & path | `/profile` |
| 3 AI analysis · Simple Service | `/analysis` · `/service` |
| 4 Results: skin, face, colour harmony, scalp | `/results/[tab]` |
| 5 Try & customise (stacked cut → colour → make-up/beard) | `/try/[kind]` |
| 6 Your look today (QR, e-mail, send to stylist) | `/look` |
| Public QR / e-mail page | `/l/[token]` |
| Stylist tablet | `/stylist` |
# MALETTI_PROJECT
