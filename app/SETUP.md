# Karma Community — Setup Guide

## Prerequisites

```bash
# 1. Install pnpm (if not already installed)
npm install -g pnpm@9

# 2. Install Expo CLI (if not already installed)
npm install -g expo-cli@latest
```

## First-time setup

```bash
# From the repo root
cd app

# Install all dependencies
pnpm install

# Verify TypeScript compiles
pnpm typecheck
```

## Run on iOS Simulator

```bash
# From the monorepo root
pnpm ios

# OR navigate into the mobile app directly:
cd apps/mobile
npx expo start --ios
```

## Run on Android Emulator

```bash
pnpm android
# OR:
cd apps/mobile && npx expo start --android
```

## Run on Web

```bash
pnpm --filter @kc/mobile web
# OR:
cd apps/mobile && npx expo start --web
```

## Environment variables

Copy `.env.example` to `apps/mobile/.env` and fill in your own Supabase project credentials
(URL + anon key). Do NOT commit this file to git (it's in `.gitignore`).

## Project structure

```
app/
├── packages/
│   ├── domain/              ← Pure domain types & invariants (no deps)
│   ├── application/         ← Use case interfaces & repository ports
│   ├── infrastructure-supabase/  ← Supabase client & adapters
│   └── ui/                  ← Design system tokens (colors, spacing, etc.)
└── apps/
    └── mobile/              ← Expo app (iOS + Android + Web)
        └── app/             ← Expo Router screens
            ├── (auth)/      ← Auth flow (splash, sign-in, sign-up)
            ├── (tabs)/      ← Main tabs (home feed, create post, profile)
            ├── chat/        ← Chat list + conversation
            ├── post/        ← Post detail
            ├── user/        ← User profile
            └── settings.tsx ← Settings
```

## Troubleshooting

**Metro can't find packages:**
```bash
cd apps/mobile && npx expo start --clear
```

**Type errors after install:**
```bash
pnpm install  # re-run to ensure workspace symlinks
pnpm typecheck
```

**iOS Simulator doesn't appear:**
- Open Xcode → Simulator → choose a device (e.g. iPhone 15)
- Run `npx expo start --ios` again

## Next steps

1. Connect Supabase auth (sign-in flow)
2. Set up Supabase database schema + RLS
3. Replace mock data with real Supabase queries
4. Implement real-time chat via Supabase Realtime
