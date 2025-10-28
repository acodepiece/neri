# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains Expo Router screens; `_layout.tsx` defines navigation frames, and `(tabs)/` hosts bottom-tab scenes like `index.tsx` and `explore.tsx`.
- `components/` holds reusable UI (for example `haptic-tab.tsx`, `parallax-scroll-view.tsx`) plus platform-specific widgets under `components/ui/`.
- `hooks/` stores theme utilities (`use-theme-color.ts`), while shared palette config lives in `constants/theme.ts`.
- Static assets (icons, illustrations, fonts) sit in `assets/`. Runtime configuration is managed through `app.json` and `expo-env.d.ts`.
- Utility scripts reside in `scripts/`, with `reset-project.js` resetting the example boilerplate.

## Build, Test, and Development Commands
- `npm install` – install dependencies after cloning.
- `npm start` or `npx expo start` – launch Expo Dev Tools with QR preview; append `--android`, `--ios`, or `--web` for platform targets.
- `npm run android` / `npm run ios` – open the native emulator directly.
- `npm run lint` – run ESLint (`eslint-config-expo`) to catch style and type issues before pushing.
- `npm run reset-project` – archive the starter app into `app-example/` and create a fresh `app/` scaffold if you need a clean slate.

## Coding Style & Naming Conventions
- TypeScript across the app; keep screens and components in `.tsx`.
- Prefer function components with hooks over classes; export components as default when representing a route.
- Use PascalCase for React components (`HabitCard.tsx`), camelCase for hooks (`useColorScheme.ts`), and kebab-case for asset filenames.
- Follow 2-space indentation and align with ESLint autofix (`npx expo lint --fix`).

## Testing Guidelines
- Automated tests are not yet configured; rely on `npm run lint` and device smoke tests (`expo start --android` or `--ios`).
- When adding tests, place co-located `*.test.tsx` files beside the component and adopt Jest with `@testing-library/react-native` for rendering checks.
- Document manual test steps in the PR description until continuous testing is added.

## Commit & Pull Request Guidelines
- Write imperative commit messages (`Add streak badge component`) and keep the subject under 70 characters; the history currently follows the Expo scaffold convention.
- Each PR should explain scope, link any GitHub issues (`Fixes #12`), and attach before/after screenshots for UI changes.
- Request at least one reviewer, note any platform-specific considerations, and confirm linting/tests ran locally before requesting merge.
