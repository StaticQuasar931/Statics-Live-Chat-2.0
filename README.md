# Statics Live Chat 2.0

A lightweight, Firebase-powered chat app built for fast, simple conversations with DMs, group chats, emojis, and themes.
This repository contains the ChatGPT Codex iteration of the project.

## ✨ Highlights
- **Google sign-in** with profile avatar support and per-user settings.
- **Direct messages & group DMs** with reactions, typing indicators, and unread tracking.
- **Display-name safety** with normalization, reserved-name checks, and a blocklist.
- **Theme system** covering the full UI (panels, buttons, modals, loading screen).
- **Emoji shortcuts & picker** plus link/preview rendering for media URLs.

## 🔧 Tech Stack
- **Firebase Auth** (Google provider)
- **Firebase Realtime Database**
- **Vanilla HTML/CSS/JS**

## 🚀 Quick Start
1. Clone the repo.
2. Open `index.html` in a local server (recommended) or directly in a browser.
3. Sign in with Google and start chatting.

> Tip: Use a local server for consistent auth behavior.

## 📁 Project Structure
- `index.html` – App shell
- `app.js` – UI, state, and realtime chat logic
- `firebase.rules.json` – Realtime Database rules
- `name-blocklist.js` – Reserved/blocked display-name list

## ✅ Goals
- Simple, clean UI
- Safe display-name handling
- Straightforward data structure for chat + users

## 📣 Feedback
If you spot issues or have ideas, feel free to open an issue or reach out.
