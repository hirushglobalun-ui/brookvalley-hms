# Testing Strategy

The Brookvalley HMS ensures code reliability and prevents regressions using a dual-testing strategy: **Vitest** for unit and integration testing, and **Playwright** for End-to-End (E2E) browser testing.

---

## 🧪 1. Unit & Integration Testing (Vitest)

We use [Vitest](https://vitest.dev/) to test our Service Layer, utility functions, and React components in isolation.

### Running Vitest
To run the test suite once:
```bash
npm run test
```

To run the test suite in watch mode (ideal for development):
```bash
npm run test:watch
```

### Test Structure
Unit tests are located in the `tests/` directory (or alongside components/services using the `.test.ts` extension).
- **Service Tests:** We mock the Supabase client to ensure database queries aren't executed during unit testing. This ensures fast, deterministic results.
- **Component Tests:** We use `@testing-library/react` to mount components in a JSDOM environment, simulate user interactions (clicks, typing), and assert DOM states.

---

## 🌐 2. End-to-End Testing (Playwright)

We use [Playwright](https://playwright.dev/) to test complete user journeys in real headless browsers (Chromium, Firefox, WebKit).

### Running Playwright
To run E2E tests headlessly:
```bash
npx playwright test
```

To run E2E tests with the UI visualizer:
```bash
npx playwright test --ui
```

### Playwright Configuration
The configuration is located at `playwright.config.ts`.
E2E tests are located in the `tests/e2e/` directory.

### Common E2E Scenarios Covered:
1. **Authentication Flow:** User logs in, middleware validates the token, and redirects to the dashboard.
2. **Role-Based Access:** A receptionist attempts to access the Settings tab and is denied.
3. **Booking Creation Flow:** A user navigates to Bookings, fills out the modal form, and a new record appears in the table.

---

## 🛠️ Continuous Integration (CI)

When submitting a Pull Request, the CI pipeline will automatically execute:
1. `npm run lint` (Oxlint/ESLint checks)
2. `tsc --noEmit` (TypeScript strict type checking)
3. `npm run test` (Vitest unit tests)
4. `npx playwright test` (E2E browser tests)

A PR cannot be merged unless all tests pass.
