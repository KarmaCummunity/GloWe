# Vendored `@supabase/supabase-js` (Wave 2.5)

Pinned UMD build loaded by `backend-config.js` instead of jsDelivr.

| File | Version | Upstream |
|------|---------|----------|
| `supabase-js-2.105.3.js` | **2.105.3** | `@supabase/supabase-js` `dist/umd/supabase.js` |

Refresh:

```bash
# from app/
pnpm why @supabase/supabase-js   # confirm resolved version
cp node_modules/.pnpm/@supabase+supabase-js@VERSION/node_modules/@supabase/supabase-js/dist/umd/supabase.js \
  apps/glowe-web/js/vendor/supabase-js-VERSION.js
# then update SUPABASE_JS_VENDOR in js/backend-config.js
```

Deploy builds content-hash this file via `web-postbuild` → `glowe-minify-hash.mjs`.
