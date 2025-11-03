# Repository Guidelines

## Project Structure & Module Organization
- `app/` is the Expo Router entry point; `_layout.tsx` wires the navigation shell while route groups like `(tabs)/`, `(onboarding)/`, and `(profile)/` collect feature-specific screens.
- Shared presentation lives in `components/` (UI primitives in `components/ui/`, interactions such as `haptic-tab.tsx` nearby) and theming helpers sit in `hooks/` plus `constants/theme.ts`.
- State and persistence helpers (for example `utils/habit-storage.ts`) encapsulate AsyncStorage access; add new storage modules here and surface them through typed hooks.
- Put images and fonts under `assets/`; environment metadata stays in `app.json`, Expo environment types in `expo-env.d.ts`, and maintenance scripts in `scripts/`.

## Build, Test, and Development Commands
- `npm install` syncs dependencies; re-run after pulling upstream changes.
- `npm run start` (or `npx expo start`) launches Metro and Expo Dev Tools; append `--android`, `--ios`, or `--web` to target a platform directly.
- `npm run android`, `npm run ios`, and `npm run web` open hot-reloading clients; confirm UI tweaks on at least one device per change.
- `npm run lint` runs ESLint with `expo lint`; use `npm run lint -- --fix` before raising a PR. `npm run reset-project` restores a pristine Expo scaffold if the sample state becomes corrupted.

## Coding Style & Naming Conventions
- Write TypeScript with 2-space indentation, functional React components, and hooks for side effects; avoid class components.
- Screens default-export a `PascalCase` component that matches the route segment (`HomeScreen`, `profile/settings` → `SettingsScreen`), while shared utilities stay camelCase.
- Use the `@/` path alias defined in `tsconfig.json` instead of relative chains, and respect the rules in `eslint.config.js`.

## Testing Guidelines
- Automated tests are not yet configured; pair `npm run lint` with manual verification on Android (`npm run android`) and iOS or web as appropriate.
- When adding Jest or React Native Testing Library, colocate specs as `*.test.tsx`, extend `tsconfig.json` includes, and ensure new suites run via a future `npm test` script.

## Commit & Pull Request Guidelines
- Follow the existing history by writing concise, imperative subjects under ~70 characters (e.g., `Add streak progress cards`) and group related changes into a single commit.
- PRs should describe scope, list manual verification steps, link relevant issues (`Fixes #123`), and attach screenshots or recordings for visual updates.
- Confirm linting (and any future tests) pass before requesting review and remove debugging artifacts prior to merge.
