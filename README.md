# parallell

A social mobile app built around a daily **photo capsule**: everyone answers the same prompt with a photo during the day, and all photos are revealed together at 20:00 (Istanbul time). Two people who react to each other's photos in the same capsule become a *parallel connection* and can message each other.

> 🚧 **Work in progress.** This is a personal learning project for mobile development. It runs locally (phone + development server on the same network) and is not published to any app store. The interface is in Turkish.

<!-- Add screenshots here, e.g.:
<img src="docs/screenshots/home.png" width="250"> <img src="docs/screenshots/archive.png" width="250">
-->

## Features

**Capsules**
- A new capsule every day with a rotating prompt and a countdown to the reveal
- Join with a photo from the camera or the gallery; photos stay hidden until the capsule opens
- City-level location under each photo (coordinates are rounded on the server, exact location is never shared) and a world map view of a capsule
- Full-screen photo viewer, reactions (✦) and a personal "moments" archive

**Social**
- Parallel connections: mutual reactions in the same capsule unlock one-to-one messaging
- Public profiles with bio, achievements and equipped cosmetics
- Blocking users, reporting users and photos; a photo is hidden automatically after a configurable number of reports

**Progression**
- Points for joining a capsule (with an early-bird bonus)
- Achievements with an in-app celebration panel
- A shop for cosmetics (avatar frames, photo borders, themes, badges) paid with points

**App**
- Light / dark mode and a pastel visual theme
- Local reminder notifications (configurable in settings)
- Anonymous accounts: the server issues a random token on first launch, stored in `expo-secure-store`

## Tech Stack

| Part | Technologies |
|---|---|
| Mobile app | React Native, Expo (SDK 58), Expo Router, TypeScript, Reanimated, react-native-maps |
| Backend | Node.js, Express 5, Multer (photo uploads) |
| Database | MySQL (mysql2), plain SQL schema + numbered migrations |

## Project Structure

```
├── src/
│   ├── app/          # Screens (file-based routing): tabs, capsule, chat, user profile, settings
│   ├── api/          # API client for the Express server
│   ├── components/   # UI components (capsule card, map, photo viewer, achievements …)
│   ├── constants/    # Theme and cosmetics
│   ├── hooks/        # Theme / color / time hooks
│   └── utils/        # Location, notifications, formatting
├── server/
│   ├── index.js      # REST API
│   ├── capsules.js, points.js, achievements.js, social.js, prompts.js
│   ├── schema.sql + migrations/   # Database schema
│   ├── db-setup.js   # Creates the schema and runs migrations
│   └── seed-mock.js, seed-connect.js   # Development-only mock data
└── assets/
```

## Getting Started

**Requirements:** Node.js, MySQL, and the Expo Go app (or an emulator).

1. **Server**
   ```bash
   cd server
   npm install
   cp .env.example .env      # fill in your MySQL credentials
   npm run db:setup          # creates tables and runs migrations
   npm run dev               # starts the API on port 3000
   ```
   Optional, for testing with fake users: `npm run db:seed` (remove with `npm run db:unseed`).

2. **App** (in the project root)
   ```bash
   npm install
   npx expo start
   ```
   Open it in Expo Go. The phone and the computer must be on the same network; the app finds the server automatically from the Expo host address.

## Status and Known Limitations

- **Local development only.** The API runs over plain HTTP on the local network; there is no deployment, HTTPS or production configuration yet.
- **No real user accounts.** Identity is an anonymous device token: there is no sign-up, login or account recovery, so reinstalling the app creates a new user.
- **Point values are placeholders** (set in `.env`) and the economy is not balanced yet.
- **Development helpers are included:** mock users, mock auto-replies in chat (`MOCK_REPLIES`) and a free shop mode (`SHOP_FREE`). They are off by default.
- Notifications are local reminders scheduled on the device; there are no server push notifications.
- Capsule cover images come from a placeholder image service.
- No automated tests yet.

## Author

Mina Özcan – [GitHub](https://github.com/minaozcn)
