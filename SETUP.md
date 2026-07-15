# EstateFlow Mobile App (Expo)

React Native **Expo SDK 54** app wired to the **EstateFlow** backend (`EstateFlow-Service`). **Sign-in** uses the unified **portal OTP** API; **registration** uses public client/agent APIs. Brokerage and many list/dashboard screens use **versioned** paths under `src/lib/apiGlobalPaths.ts`. Some legacy demo screens still call unversioned `/api/...` routes and will not work until those endpoints exist on the Java services.

## Prerequisites

- **Node.js 18+**
- **EstateFlow** APIs reachable from the device/simulator (Docker Compose from repo root, or local Maven + nginx on port **80**)
- iOS Simulator (macOS) and/or Android Emulator, or **Expo Go** on a physical device

## Configuration

1. From this directory:

   ```bash
   cd EstateFlow-Mobile-App
   npm install
   ```

2. **`.env`** (optional): set **`EXPO_PUBLIC_API_URL`** only when the dev default is wrong.

   | Environment | Default (if `.env` unset) | When to set `.env` |
   |---------------|---------------------------|---------------------|
   | iOS Simulator | `http://localhost` | If nginx is not on port 80 (e.g. use `http://localhost:8082` for direct `estateflow-client-service`) |
   | Android Emulator | `http://10.0.2.2` | Same; or custom port `http://10.0.2.2:8082` |
   | Physical device | — | **Required:** `http://<your-computer-LAN-IP>` (phone and computer on same Wi‑Fi) |
   | Expo web | `http://localhost` | — |

3. **Expo / Metro port** — Expo’s bundler used to default to **8081**, which conflicts with **`estateflow-brokerage-agent-service`**. Scripts use **`--port 19001`** for `npm start` / `ios` / `android` / `web`. To pick another port: `npx expo start --port 9099`, or change the `--port` value in `package.json`.

4. **Android HTTP**: `app.json` sets `android.usesCleartextTraffic: true` so `http://` works for local development.

### `ERR_CONNECTION_REFUSED` on `http://localhost/...`

1. **Start the API** — From repo root, `docker compose up` so **nginx listens on port 80** (or point the app at whatever host:port actually serves `/api/client/...`).
2. **Android Emulator** — `localhost` is the emulator, not your PC. The app defaults to **`http://10.0.2.2`** in dev; if you still set `EXPO_PUBLIC_API_URL=http://localhost`, switch it to **`http://10.0.2.2`** or remove the line to use the default.
3. **Physical phone** — `localhost` is the phone. Set **`EXPO_PUBLIC_API_URL=http://192.168.x.x`** (your machine’s IP, `ipconfig` / `ifconfig`).
4. **Direct JVM (no nginx)** — Client service is **8082**; use e.g. `http://localhost:8082` (iOS sim) or `http://10.0.2.2:8082` (Android emulator).

## Run

Metro listens on **19001** (see Configuration above).

```bash
npm start
npm run ios      # Simulator (macOS)
npm run android  # Emulator
npm run web      # Optional web build
```

## EstateFlow API surface used today

| Flow | Method & path |
|------|----------------|
| Portal OTP send | `POST /api/portal/v1/public/session/otp/send` |
| Portal OTP verify (broker owner / agent / client) | `POST /api/portal/v1/public/session/otp/verify` → returns `principalType` + JWT |
| Client session | `GET /api/client/v1/client/me` (Bearer client JWT) |
| Agent session | `GET /api/agent/v1/agent/me` (Bearer agent JWT) |
| Broker owner session | `GET /api/broker/v1/broker/session/me` (Bearer broker-owner JWT) |
| Client register | `POST /api/client/v1/public/clients/register` |
| Agent self-register | `POST /api/agent/v1/public/agents/register` |
| Agent’s clients (JWT) | `GET /api/client/v1/agent/clients` (paged; client service, agent role) |
| Broker agents / per-agent clients | `GET /api/broker/v1/broker/agents`, `GET /api/broker/v1/broker/agents/{id}/clients` |

Path constants live in **`src/lib/apiGlobalPaths.ts`**; the app origin is **`EXPO_PUBLIC_API_URL`** (see the Configuration table).

**GKE dev:** use `http://api.<ingress-ip>.nip.io` after deploying **`estateflow-api-gateway`** + **`platform-ingress`** (base paths `/api/admin`, `/api/portal`, `/api/broker`, `/api/agent`, `/api/client`, `/api/properties`). Alternative: `http://app.<ip>.nip.io` (Admin UI nginx).

**Client registration** in the app requires **agent referral code** plus name/email (and optional E.164 phone). **Sign-in** is OTP via the portal; the signup form does not collect a password.

**Agent registration** requires **brokerage invite code**, **E.164 mobile** (e.g. `+15551234567`), and **date of birth** `YYYY-MM-DD`. After registration, agents sign in via the same **portal OTP** flow as other principals.

## EAS builds

Set **`EXPO_PUBLIC_API_URL`** in the [Expo dashboard](https://expo.dev) (project → Environment variables) or `eas secret:create` so preview/production builds embed your real API origin (**HTTPS** in production). Do not use `localhost` in store builds.

Set **`GOOGLE_MAPS_API_KEY`** for preview/production native builds so Route Details can load map tiles. Use a mobile Maps SDK key restricted to `com.showingtrail.app`; do not reuse the backend Routes API key. Rebuild the native app after adding or changing this value.

## Project layout (abbreviated)

```
EstateFlow-Mobile-App/
├── App.tsx
├── app.json
├── eas.json
├── src/
│   ├── components/
│   ├── contexts/       # AuthContext → EstateFlow auth
│   ├── lib/            # api.ts, apiGlobalPaths.ts, secureStore, …
│   ├── navigation/
│   └── screens/
└── assets/
```

## Legacy screens

Screens that call `/api/tours`, `/api/properties`, `/api/clients`, etc. expect the **previous** Node/Vercel-style API. They will **404** until equivalent routes are implemented on EstateFlow services. Prioritize migrating features against `estateflow-client-service` / `estateflow-brokerage-agent-service` contracts.
