# Store screenshots (draft)

Generated from the **dev web build** (`https://dev.karma-community.pages.dev`) signed in as fake seed user A
(`user1@seed.kc.test`), Hebrew UI. No real people or accounts: all names/content come from the kc-dev fake seed.
The red DEV strip is hidden and automated-test rows (`[e2e …]`) are filtered client-side.

| Folder | Pixels | Store slot |
|---|---|---|
| `iphone-6.9/` | 1320 × 2868 | App Store iPhone 6.9" (required) |
| `iphone-6.5/` | 1242 × 2688 | App Store iPhone 6.5" |
| `android-phone/` | 1080 × 1920 | Google Play phone |

Screens: 01 feed · 02 donations hub · 03 marketplace · 04 money / verified nonprofits · 05 search · 06 profile.

Regenerate: `cd tests/e2e && npx tsx scripts/store-screenshots.mts ../../docs/store/screenshots`

Caveats before submitting:
- These are **web** renders in a phone viewport (no iOS status bar / home indicator). Apple accepts this, but
  native captures from a simulator look more authentic.
- `04-nonprofits` shows the dev **[DEMO]** nonprofits and the sandbox-payments notice. Replace or drop it for
  the iOS listing (donations open in Safari there, `ios_in_app_donations` off).
- Consider marketing frames / captions (Canva) on top of the raw captures.
