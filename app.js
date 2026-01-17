// app.js (FULL UI + DMs + Group DMs + Friend Requests + Themes + Emoji + Commands + Reports)
// Works with your provided RTDB rules.
// IMPORTANT: This file assumes index.html has <div id="app"></div> and loads this as type="module".

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,
  onChildAdded,
  off,
  onDisconnect,
  query,
  orderByChild,
  limitToLast,
  equalTo,
  runTransaction
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";
import NAME_BLOCKLIST from "./name-blocklist.js";
import { createCommandHandler } from "./commands.js";
import { initMessaging } from "./text.js";

/* ---------------------------
   CONFIG
---------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyBbvtC2450zab3jUxv2xVY0_T7jM7Q3ihI",
  authDomain: "staticquasar931-chat.firebaseapp.com",
  databaseURL: "https://staticquasar931-chat-default-rtdb.firebaseio.com/",
  projectId: "staticquasar931-chat",
  storageBucket: "staticquasar931-chat.firebasestorage.app",
  messagingSenderId: "522887260780",
  appId: "1:522887260780:web:35bda4b6891ce9d5210649",
  measurementId: "G-LRMC3CXV9S"
};

const APP_NAME = "ChattyChatFace";
const APP_SECONDARY_NAME = "Static's Live Chatting 2.0";
const BRAND_NAME = "StaticQuasar931";
const BRAND_LINK = "https://sites.google.com/view/staticquasar931/gm3z";
const RESERVED_NAMES = ["staticquasar931", "static"];
const RESERVED_PARTS = ["static", "quasar", "quasar931"];
const PEOPLE_ROOT = "people";
const PEOPLE_DISPLAYNAMES = "peopleDisplayNames";

const THEMES = ["dark", "light", "ocean", "forest", "sunset", "lavender", "midnight", "rose", "neon", "sand", "icy"];
const DEFAULT_THEME = "dark";

const SEND_COOLDOWN_MS = 500;
const MAX_MESSAGE_CHARS = 4000; // must be <= 4000 (rules validate)
const LOAD_LAST_N = 80;

const DISPLAY_MIN = 3;
const DISPLAY_MAX = 20;
const DISPLAY_REGEX = /^[A-Za-z0-9._-]+$/; // no spaces

const BRAND_ICON = "https://cdn.jsdelivr.net/gh/StaticQuasar931/Images@main/icon.png";
const BRAND_BANNER = "https://cdn.jsdelivr.net/gh/StaticQuasar931/Images@main/StaticQuasar931_Banner_Media_Google_Sites_Neon_ChatGPT_Image.png";
const GOOGLE_SIGNIN_IMG = "https://cdn.jsdelivr.net/gh/StaticQuasar931/Images@main/Sign%20up%20with%20Google%20SQUARE%20TRANSPARENT.png";

const REACTION_EMOJIS = ["❤️", "👍", "😂", "🔥", "🎉", "😮"];
const QUICK_REACTION = "❤️";
const NAME_WORDS = [
  "starlit", "nebula", "lively", "forest", "crystal", "sunset",
  "ember", "prism", "shadow", "galaxy", "arcade", "silver",
  "lunar", "spark", "aurora", "comet", "planet", "nova",
  "breeze", "glimmer", "bright", "marble", "signal", "vertex",
  "tundra", "legend", "cobalt", "magnet", "spline", "rocket"
];

// Unicode emoji list for picker
const EMOJI_LIST = [
  "😀","😁","😂","🤣","😅","😊","😍","😘","😎","🤔","😳","😴","😭","😡","🤯","🥳",
  "👍","👎","👏","🙏","💪","🫡","🔥","💀","❤️","🧡","💛","💚","💙","💜",
  "🎉","🎲","🪙","✅","❌","⚠️","🧠","🫠","👀","🧩","🧃","🍕","🌙","⭐"
];

// Shortcodes -> unicode
const SHORTCODES = {
  ":rofl:": "🤣",
  ":joy:": "😂",
  ":smile:": "😊",
  ":heart:": "❤️",
  ":thumbsup:": "👍",
  ":fire:": "🔥",
  ":skull:": "💀",
  ":tada:": "🎉",
  ":dice:": "🎲",
  ":coin:": "🪙",
  ":eyes:": "👀"
};

const EMOJI_NAMES = {
  "😀": "Grinning Face",
  "😁": "Beaming Face",
  "😂": "Face with Tears of Joy",
  "🤣": "Rolling on the Floor Laughing",
  "😅": "Grinning Face with Sweat",
  "😊": "Smiling Face",
  "😍": "Smiling Face with Hearts",
  "😘": "Face Blowing a Kiss",
  "😎": "Smiling Face with Sunglasses",
  "🤔": "Thinking Face",
  "😳": "Flushed Face",
  "😴": "Sleeping Face",
  "😭": "Loudly Crying Face",
  "😡": "Pouting Face",
  "🤯": "Exploding Head",
  "🥳": "Partying Face",
  "👍": "Thumbs Up",
  "👎": "Thumbs Down",
  "👏": "Clapping Hands",
  "🙏": "Folded Hands",
  "💪": "Flexed Biceps",
  "🫡": "Saluting Face",
  "🔥": "Fire",
  "💀": "Skull",
  "❤️": "Red Heart",
  "🧡": "Orange Heart",
  "💛": "Yellow Heart",
  "💚": "Green Heart",
  "💙": "Blue Heart",
  "💜": "Purple Heart",
  "🎉": "Party Popper",
  "🎲": "Game Die",
  "🪙": "Coin",
  "✅": "Check Mark Button",
  "❌": "Cross Mark",
  "⚠️": "Warning",
  "🧠": "Brain",
  "🫠": "Melting Face",
  "👀": "Eyes",
  "🧩": "Puzzle Piece",
  "🧃": "Beverage Box",
  "🍕": "Pizza",
  "🌙": "Crescent Moon",
  "⭐": "Star"
};

const SHORTCODE_LOOKUP = Object.entries(SHORTCODES).reduce((acc, [code, emoji]) => {
  if (!acc[emoji]) acc[emoji] = [];
  acc[emoji].push(code);
  return acc;
}, {});

// Custom Static emoji (image)
const STATIC_EMOJI_URL = BRAND_ICON;
const MESSAGE_DING_URL = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";
const IDLE_TIMEOUT = 60000;

/* ---------------------------
   INIT
---------------------------- */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const root = document.getElementById("app");
injectVisualSeo();
document.title = `${APP_NAME} (${APP_SECONDARY_NAME}) | ${BRAND_NAME}`;

/* ---------------------------
   CSS (moved to styles/app.css)
---------------------------- */


/* ---------------------------
   GOOGLE ANALYTICS injection (not in index.html)
---------------------------- */
(function injectGtag() {
  try {
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=G-LRMC3CXV9S";
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(){ window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", "G-LRMC3CXV9S");
  } catch {}
})();

/* ---------------------------
   STATE
---------------------------- */
const S = {
  user: null,
  uid: null,
  profile: null,
  isAdmin: false,

  theme: DEFAULT_THEME,

  friendRequestsIn: {},
  friends: {},
  friendRequestsOut: {},
  chats: [],
  publicUsers: {},

  active: null,
  msgChildAddedUnsub: null,
  typingUnsub: null,
  presenceUnsubs: [],
  userDataUnsub: null,
  chatRefsUnsub: null,
  publicUsersUnsub: null,
  dmListUnsub: null,
  dmPreviewUnsubs: {},
  reactionUnsubs: [],

  lastSendAt: 0,

  chatState: {}, // { key: { lastReadAt, unread } }
  isTyping: false,
  typingTimer: null,
  presenceStatus: "online",
  idleTimer: null,
  dingAudio: null,
  autoOpenInProgress: false,
  sessionId: null,
  appReady: false,
  peopleWriteEnabled: true,

  ui: {},

  _nameCache: {},
  _seenMsgKeys: {}, // { scopeKey: Set(msgKey) }
  _reactionCache: {},

  isWindowFocused: true
};

/* ---------------------------
   UTIL
---------------------------- */
function nowMs() { return Date.now(); }
const THEME_STORAGE_KEY = "chat-theme";

function peoplePublicPath(uid) {
  return `${PEOPLE_ROOT}/${uid}/public`;
}

function peoplePrivatePath(uid) {
  return `${PEOPLE_ROOT}/${uid}/private`;
}

function peopleStatsPath(uid) {
  return `${PEOPLE_ROOT}/${uid}/stats`;
}

async function updatePeoplePublic(uid, data) {
  if (S.peopleWriteEnabled) {
    try {
      await update(ref(db, peoplePublicPath(uid)), data);
    } catch (err) {
      if (String(err?.code || "").includes("PERMISSION_DENIED")) {
        S.peopleWriteEnabled = false;
      }
    }
  }
  await update(ref(db, `publicUsers/${uid}`), data).catch(() => {});
}

async function updatePeoplePrivate(uid, data) {
  if (S.peopleWriteEnabled) {
    try {
      await update(ref(db, peoplePrivatePath(uid)), data);
    } catch (err) {
      if (String(err?.code || "").includes("PERMISSION_DENIED")) {
        S.peopleWriteEnabled = false;
      }
    }
  }
  await update(ref(db, `users/${uid}`), data).catch(() => {});
}

async function setPeoplePublic(uid, data) {
  if (S.peopleWriteEnabled) {
    try {
      await set(ref(db, peoplePublicPath(uid)), data);
    } catch (err) {
      if (String(err?.code || "").includes("PERMISSION_DENIED")) {
        S.peopleWriteEnabled = false;
      }
    }
  }
  await set(ref(db, `publicUsers/${uid}`), data).catch(() => {});
}

async function setPeoplePrivate(uid, data) {
  if (S.peopleWriteEnabled) {
    try {
      await set(ref(db, peoplePrivatePath(uid)), data);
    } catch (err) {
      if (String(err?.code || "").includes("PERMISSION_DENIED")) {
        S.peopleWriteEnabled = false;
      }
    }
  }
  await set(ref(db, `users/${uid}`), data).catch(() => {});
}

async function removePeoplePrivate(uid, childPath) {
  if (S.peopleWriteEnabled) {
    try {
      await remove(ref(db, `${peoplePrivatePath(uid)}/${childPath}`));
    } catch (err) {
      if (String(err?.code || "").includes("PERMISSION_DENIED")) {
        S.peopleWriteEnabled = false;
      }
    }
  }
  await remove(ref(db, `users/${uid}/${childPath}`)).catch(() => {});
}

async function safeGet(refPath) {
  try {
    return await get(refPath);
  } catch {
    return null;
  }
}

async function updateMyChatRef(key, obj) {
  if (S.peopleWriteEnabled) {
    try {
      await update(ref(db, `${peoplePrivatePath(S.uid)}/chatRefs/${key}`), obj);
    } catch (err) {
      if (String(err?.code || "").includes("PERMISSION_DENIED")) {
        S.peopleWriteEnabled = false;
      }
    }
  }
  await update(ref(db, `users/${S.uid}/chatRefs/${key}`), obj).catch(() => {});
}

async function updateMyChatState(key, obj) {
  if (S.peopleWriteEnabled) {
    try {
      await update(ref(db, `${peoplePrivatePath(S.uid)}/chatState/${key}`), obj);
    } catch (err) {
      if (String(err?.code || "").includes("PERMISSION_DENIED")) {
        S.peopleWriteEnabled = false;
      }
    }
  }
  await update(ref(db, `users/${S.uid}/chatState/${key}`), obj).catch(() => {});
}

async function logStatEvent(uid, type, data = {}) {
  if (!uid) return;
  const payload = { type, at: nowMs(), ...data };
  if (S.peopleWriteEnabled) {
    try {
      await push(ref(db, `${peopleStatsPath(uid)}/events`), payload);
    } catch (err) {
      if (String(err?.code || "").includes("PERMISSION_DENIED")) {
        S.peopleWriteEnabled = false;
      }
    }
  }
  await push(ref(db, `users/${uid}/stats/events`), payload).catch(() => {});
}

async function incrementStatCounter(uid, key, delta = 1) {
  if (!uid) return;
  const peopleRef = ref(db, `${peopleStatsPath(uid)}/counters/${key}`);
  const legacyRef = ref(db, `users/${uid}/stats/counters/${key}`);
  if (S.peopleWriteEnabled) {
    try {
      await runTransaction(peopleRef, (value) => (value || 0) + delta);
    } catch (err) {
      if (String(err?.code || "").includes("PERMISSION_DENIED")) {
        S.peopleWriteEnabled = false;
      }
    }
  }
  await runTransaction(legacyRef, (value) => (value || 0) + delta).catch(() => {});
}

function createSessionId() {
  return `sess_${nowMs()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function startSessionTracking() {
  if (!S.uid) return;
  const sessionId = createSessionId();
  S.sessionId = sessionId;
  const payload = { startedAt: nowMs(), endedAt: null };
  const peopleRef = ref(db, `${peopleStatsPath(S.uid)}/sessions/${sessionId}`);
  const legacyRef = ref(db, `users/${S.uid}/stats/sessions/${sessionId}`);
  if (S.peopleWriteEnabled) {
    try {
      await set(peopleRef, payload);
    } catch (err) {
      if (String(err?.code || "").includes("PERMISSION_DENIED")) {
        S.peopleWriteEnabled = false;
      }
    }
  }
  await set(legacyRef, payload).catch(() => {});
  if (S.peopleWriteEnabled) {
    onDisconnect(peopleRef).update({ endedAt: nowMs() }).catch(() => {});
  }
  onDisconnect(legacyRef).update({ endedAt: nowMs() }).catch(() => {});
}

function normalizeDisplayName(name) {
  return String(name || "").trim().toLowerCase();
}

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

function isReservedName(name) {
  const n = normalizeDisplayName(name);
  if (RESERVED_NAMES.includes(n)) return true;
  return RESERVED_PARTS.some((part) => n.includes(part));
}

function normalizeRepeatedChars(value) {
  return value.replace(/(.)\1+/g, "$1");
}

function findBlockedWord(name) {
  const raw = normalizeDisplayName(name);
  const squashed = normalizeRepeatedChars(raw);

  return NAME_BLOCKLIST.find((badRaw) => {
    const bad = String(badRaw || "").toLowerCase().trim();
    if (!bad) return false;
    const exact = bad.length <= 3 ? new RegExp(`\\b${bad}\\b`, "i") : null;
    if (exact && (exact.test(raw) || exact.test(squashed))) return true;
    return raw.includes(bad) || squashed.includes(bad);
  }) || null;
}

function containsBlockedName(name) {
  return !!findBlockedWord(name);
}

function validateDisplayName(name) {
  const raw = String(name || "").trim();
  if (raw.length < DISPLAY_MIN) return `Display name must be at least ${DISPLAY_MIN} characters.`;
  if (raw.length > DISPLAY_MAX) return `Display name must be at most ${DISPLAY_MAX} characters.`;
  if (!DISPLAY_REGEX.test(raw)) return "Display name can only use letters, numbers, and . _ - (no spaces).";
  if (!RESERVED_NAMES.includes(normalizeDisplayName(raw)) && isReservedName(raw)) {
    return "That display name is reserved.";
  }
  if (containsBlockedName(raw)) return "That display name is not allowed.";
  return null;
}

function randomDigits(count = 4) {
  let out = "";
  for (let i = 0; i < count; i += 1) out += Math.floor(Math.random() * 10);
  return out;
}

function buildRandomName() {
  const wordCount = Math.random() < 0.5 ? 1 : 2;
  const words = [];
  for (let i = 0; i < wordCount; i += 1) {
    const w = NAME_WORDS[Math.floor(Math.random() * NAME_WORDS.length)];
    words.push(w);
  }
  const base = words.join("").slice(0, 15);
  return `${base}${randomDigits(4)}`;
}

async function generateUniqueDisplayName() {
  for (let i = 0; i < 12; i += 1) {
    const candidate = buildRandomName();
    if (validateDisplayName(candidate)) continue;
    const taken = await isDisplayNameTaken(normalizeDisplayName(candidate), S.uid);
    if (!taken) return candidate;
  }
  return `user${randomDigits(4)}`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(ts) {
  try {
    const d = new Date(ts || 0);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDateShort(ts) {
  try {
    const d = new Date(ts || 0);
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function insertAtCursor(textarea, text) {
  if (!textarea) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  textarea.value = `${before}${text}${after}`;
  const next = start + text.length;
  textarea.setSelectionRange(next, next);
  textarea.focus();
}

function replaceShortcodesInInput(textarea) {
  if (!textarea) return;
  const value = textarea.value;
  if (!value.endsWith(" ")) return;
  const parts = value.split(/\s+/);
  const last = parts[parts.length - 2];
  if (!last || !last.startsWith(":") || !last.endsWith(":")) return;
  const key = last.toLowerCase();
  const replacement = key === ":static:" ? ":static:" : (SHORTCODES[key] || null);
  if (!replacement) return;
  const before = value.slice(0, value.lastIndexOf(last));
  const after = value.slice(value.lastIndexOf(last) + last.length);
  const next = `${before}${replacement}${after}`;
  textarea.value = next;
}
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, String(v));
  }
  for (const child of children) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function hideContextMenu() {
  const existing = document.getElementById("contextMenu");
  if (existing) existing.remove();
}

function showContextMenu(x, y, items = []) {
  hideContextMenu();
  const menu = el("div", { id: "contextMenu", class: "contextMenu" });
  items.forEach((item) => {
    const btn = el("button", {
      class: `contextItem${item.danger ? " danger" : ""}`,
      text: item.label
    });
    btn.addEventListener("click", () => {
      hideContextMenu();
      item.onClick?.();
    });
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 8;
  const maxY = window.innerHeight - rect.height - 8;
  menu.style.left = `${Math.max(8, Math.min(x, maxX))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, maxY))}px`;

  const onDocClick = (evt) => {
    if (!menu.contains(evt.target)) {
      hideContextMenu();
      document.removeEventListener("click", onDocClick);
    }
  };
  document.addEventListener("click", onDocClick);
}

function showToast(msg, kind = "info") {
  const wrap = S.ui?.toastWrap || document.getElementById("toastWrap") || el("div", { id: "toastWrap", class: "toastWrap" });
  if (!wrap.parentNode) document.body.appendChild(wrap);

  const klass =
    kind === "ok" ? "toast toast-ok" :
    kind === "error" ? "toast toast-error" :
    kind === "warn" ? "toast toast-warn" :
    "toast";

  const t = el("div", { class: klass }, [msg]);
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

function logFirebaseError(context, error) {
  const code = error?.code || "unknown";
  const message = error?.message || "Unknown Firebase error";
  console.error(`[Firebase] ${context}: ${code} - ${message}`, error);
  showToast(`Firebase error (${context}). Check console.`, "error");
}

function modalBase(titleText) {
  const backdrop = el("div", { class: "backdrop" });
  const modal = el("div", { class: "modal", role: "dialog", "aria-modal": "true" });
  const card = el("div", { class: "modalCard" });

  const header = el("div", { class: "modalHeader" }, [
    el("div", { class: "modalTitle", text: titleText }),
    el("button", { class: "btn modalClose", text: "✕", "aria-label": "Close" })
  ]);

  const body = el("div", { class: "modalBody" });
  const footer = el("div", { class: "modalFooter" });

  card.appendChild(header);
  card.appendChild(body);
  card.appendChild(footer);
  modal.appendChild(card);

  function close() {
    backdrop.remove();
    modal.remove();
    document.removeEventListener("keydown", onKeydown);
  }

  function onKeydown(ev) {
    const key = String(ev.key || "").toLowerCase();
    if (key === "escape" || (key === "x" && !(ev.target instanceof HTMLInputElement) && !(ev.target instanceof HTMLTextAreaElement))) {
      close();
    }
  }
  header.querySelector("button").addEventListener("click", close);
  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", onKeydown);

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  return { backdrop, modal, card, header, body, footer, close };
}

function toggleVisualSeo(force) {
  const ids = ["staticWrap", "staticMenu", "staticSlideMenu", "visualSeoHidden"];
  ids.forEach((id) => {
    const node = document.getElementById(id);
    if (!node) return;
    const isHidden = node.style.display === "none";
    const shouldShow = typeof force === "boolean" ? force : isHidden;
    const display = id === "staticMenu" || id === "staticWrap" ? "flex" : "block";
    node.style.display = shouldShow ? display : "none";
  });
}

function injectVisualSeo() {
  if (document.getElementById("staticMenu")) return;

  const style = document.createElement("style");
  style.textContent = `
    :root{
      --seo-brand:#5ee1ff;
      --seo-glow:0 0 12px rgba(94,225,255,.65), 0 0 32px rgba(155,255,183,.35);
      --seo-shadow:0 10px 30px rgba(0,0,0,.4);
    }
    #staticWrap{
      position:fixed; left:12px; bottom:12px; z-index:9999;
      display:flex; gap:10px; align-items:center;
    }
    body.auth-screen #staticWrap{
      left:auto; right:12px; bottom:12px;
    }
    .staticWrapInApp{
      position: static !important;
      margin-top:auto;
      padding: 0 12px 12px;
      width: 100%;
      display:flex;
      flex-direction:column;
      gap:8px;
      align-items:flex-start;
    }
    #staticMenu{
      display:flex; gap:10px; align-items:center; user-select:none;
      padding:10px 14px; border-radius:12px;
      background:linear-gradient(135deg, rgba(20,20,28,.9), rgba(20,20,28,.6));
      border:1px solid rgba(94,225,255,.35);
      color:#e8f3ff; box-shadow:var(--seo-glow), var(--seo-shadow);
      font-size:14px; animation:menuCorner 1.2s ease .2s both;
      max-width: calc(100vw - 24px);
    }
    .staticMenuInApp{
      position: static !important;
      width: 100%;
      flex: 1 1 auto;
      margin: 0;
      border: 1px solid var(--border);
      background: rgba(0,0,0,.12);
      box-shadow: var(--shadow);
    }
    #staticMenu a{ color:#5ee1ff; font-weight:800; text-decoration:none }
    #closeStaticMenu{
      color:#f55; cursor:pointer; padding:2px 6px; border-radius:6px;
      border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.06)
    }
    @keyframes menuCorner{
      from{opacity:0; transform:translateY(-160px)}
      to{opacity:1; transform:translateY(0)}
    }

    #staticSlideMenu{
      width:100px; height:100px; pointer-events:none; opacity:0;
      transform:translateX(-140px) scale(.96);
    }
    #staticSlideMenu a{ display:block; width:100%; height:100% }
    #staticSlideMenu img{
      width:100%; height:100%; object-fit:contain;
      border:0; border-radius:0; background:transparent; box-shadow:none;
      transition:opacity .25s ease;
    }
    .slide-in{ animation:slideIn 2s ease forwards }
    .slide-out{ animation:slideOut 2s ease forwards }
    @keyframes slideIn{ from{opacity:0; transform:translateX(-140px) scale(.96)} to{opacity:1; transform:translateX(0) scale(1)} }
    @keyframes slideOut{ from{opacity:1; transform:translateX(0) scale(1)} to{opacity:0; transform:translateX(-140px) scale(.96)} }
    @keyframes slideInAuth{ from{opacity:0; transform:translateY(140px) scale(.96)} to{opacity:1; transform:translateY(0) scale(1)} }
    @keyframes slideOutAuth{ from{opacity:1; transform:translateY(0) scale(1)} to{opacity:0; transform:translateY(140px) scale(.96)} }
    body.auth-screen #staticSlideMenu.slide-in{ animation:slideInAuth 2s ease forwards; }
    body.auth-screen #staticSlideMenu.slide-out{ animation:slideOutAuth 2s ease forwards; }

    .staticSlideInApp{
      position: static !important;
      margin: 0;
      width: 96px;
      height: 96px;
    }

    .seo-hidden{
      position:absolute; width:1px; height:1px; overflow:hidden;
      clip:rect(1px,1px,1px,1px); white-space:nowrap;
    }

    @media (max-width:600px){
      #staticMenu{ font-size:13px; padding:8px 12px }
      #staticSlideMenu{ width:88px; height:88px }
    }
  `;
  document.head.appendChild(style);

  const menu = el("div", { id: "staticMenu", role: "region", "aria-label": "StaticQuasar menu" }, [
    el("a", { href: BRAND_LINK, target: "_blank", rel: "noopener" }, ["More Unblocked Games by Static"]),
    el("span", { id: "closeStaticMenu", title: "Hide temporarily", text: "✕" })
  ]);

  const slideMenu = el("div", { id: "staticSlideMenu", "aria-live": "polite" }, [
    el("a", {
      id: "staticSlideLink",
      href: "https://sites.google.com/view/staticquasar931/google-form",
      target: "_blank",
      rel: "noopener",
      "aria-label": "Open Google Form"
    }, [
      el("img", {
        id: "staticSlideImg",
        src: "https://cdn.jsdelivr.net/gh/StaticQuasar931/Images@main/GoogleForm.png",
        alt: "StaticQuasar931 Google Form for feedback and requests"
      })
    ])
  ]);

  const hidden = el("div", { id: "visualSeoHidden", class: "seo-hidden", "aria-hidden": "true" }, [
    el("h1", { text: `${APP_NAME} (${APP_SECONDARY_NAME})` }),
    el("p", { text: "Static Visual SEO default. Static menu and rotating widget by StaticQuasar931." })
  ]);

  const wrap = el("div", { id: "staticWrap" });
  wrap.appendChild(slideMenu);
  wrap.appendChild(menu);
  document.body.appendChild(wrap);
  document.body.appendChild(hidden);

  const closeBtn = menu.querySelector("#closeStaticMenu");
  const key = "sq931_staticMenu_hidden_until";
  const showMenu = () => { if (menu) menu.style.display = "flex"; };
  const hideFor3m = () => {
    if (!menu) return;
    menu.style.display = "none";
    const until = Date.now() + 180000;
    localStorage.setItem(key, String(until));
    setTimeout(showMenu, 180000);
  };
  const until = parseInt(localStorage.getItem(key) || "0", 10);
  if (until && Date.now() < until) {
    menu.style.display = "none";
    setTimeout(showMenu, until - Date.now());
  } else {
    showMenu();
  }
  if (closeBtn) closeBtn.onclick = hideFor3m;

  const a = slideMenu.querySelector("#staticSlideLink");
  const img = slideMenu.querySelector("#staticSlideImg");
  const ROTATION = [
    {
      src: "https://cdn.jsdelivr.net/gh/StaticQuasar931/Images@main/GoogleForm.png",
      alt: "StaticQuasar931 Google Form for feedback and requests",
      link: "https://sites.google.com/view/staticquasar931/google-form"
    },
    {
      src: "https://cdn.jsdelivr.net/gh/StaticQuasar931/Images@main/Join_Our_DC_StaticQuassar931_lcplrf.png",
      alt: "Join the StaticQuasar931 Discord",
      link: "https://discord.gg/DP2hM7RRhR"
    },
    {
      src: "https://cdn.jsdelivr.net/gh/StaticQuasar931/Images@main/Follow-us--IG",
      alt: "StaticQuasar931 Instagram",
      link: "https://www.instagram.com/freeschoolgamepage/"
    }
  ];
  ROTATION.forEach((o) => {
    const preload = new Image();
    preload.src = o.src;
  });

  const T_IN = 2000;
  const T_SHOW = 5000;
  const T_OUT = 2000;
  const T_HIDDEN = 20000;
  let idx = 0;

  function apply(state) {
    if (!a || !img) return;
    a.href = state.link;
    img.alt = state.alt;
    img.style.opacity = "0";
    setTimeout(() => { img.src = state.src; }, 80);
    img.onload = () => { img.style.opacity = "1"; };
  }

  (async function cycle() {
    for (;;) {
      apply(ROTATION[idx]);
      slideMenu.style.pointerEvents = "auto";
      slideMenu.classList.remove("slide-out");
      slideMenu.classList.add("slide-in");
      await new Promise((r) => setTimeout(r, T_IN + T_SHOW));
      slideMenu.classList.remove("slide-in");
      slideMenu.classList.add("slide-out");
      await new Promise((r) => setTimeout(r, T_OUT));
      slideMenu.style.pointerEvents = "none";
      await new Promise((r) => setTimeout(r, T_HIDDEN));
      idx = (idx + 1) % ROTATION.length;
    }
  })();
}

function scopeKey(type, id) {
  return `${type}:${id}`;
}

function avatarUrlFor(userObj) {
  const useGoogle = S.profile?.settings?.useGoogleAvatar !== false;
  const p = userObj?.photoURL;
  if (useGoogle && p && String(p).trim()) return p;
  const dn = userObj?.displayNameDisplay || "User";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(dn)}&background=0D8ABC&color=fff&size=128&rounded=true`;
}

/* ---------------------------
   HOTKEY: y+u+i simultaneously OR sequentially
---------------------------- */
(function guiHideHotkey() {
  let seq = "";
  let lastKeyAt = 0;
  const seqTimeout = 1500;
  const down = new Set();

  function toggleGui() {
    document.body.classList.toggle("gui-hidden");
    showToast(document.body.classList.contains("gui-hidden") ? "GUI hidden" : "GUI shown", "info");
    toggleVisualSeo();
  }

  window.addEventListener("keydown", (e) => {
    const k = String(e.key || "").toLowerCase();
    down.add(k);

    if (down.has("y") && down.has("u") && down.has("i")) {
      toggleGui();
      down.clear();
      seq = "";
      return;
    }

    const now = Date.now();
    if (now - lastKeyAt > seqTimeout) seq = "";
    lastKeyAt = now;

    if (["y","u","i"].includes(k)) {
      seq += k;
      if (seq.endsWith("yui")) {
        toggleGui();
        seq = "";
      } else if (!"yui".startsWith(seq.slice(-3))) {
        seq = seq.slice(-3);
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    down.delete(String(e.key || "").toLowerCase());
  });
})();

/* ---------------------------
   LEAVE WARNING
---------------------------- */
window.onbeforeunload = function () {
  return "ChattyChatFace: changes may not be saved if you leave right now.";
};

/* ---------------------------
   Focus tracking for unread behavior
---------------------------- */
(function focusTracking() {
  const setFocus = (v) => { S.isWindowFocused = !!v; };
  window.addEventListener("focus", () => setFocus(true));
  window.addEventListener("blur", () => setFocus(false));
  document.addEventListener("visibilitychange", () => setFocus(!document.hidden));
})();

async function setPresenceStatus(status, { updateLastSeen = false } = {}) {
  if (!S.uid) return;
  if (S.presenceStatus === status && !updateLastSeen) return;
  S.presenceStatus = status;
  const payload = { status };
  if (updateLastSeen) payload.lastSeen = nowMs();
  await updatePeoplePrivate(S.uid, payload);
  await updatePeoplePublic(S.uid, payload);
  await update(ref(db, `presence/${S.uid}`), payload).catch(() => {});
}

function startPresenceTracking() {
  if (!S.uid) return;
  if (S.idleTimer) clearTimeout(S.idleTimer);

  const markIdle = () => { setPresenceStatus("idle", { updateLastSeen: true }).catch(() => {}); };
  const bump = () => {
    setPresenceStatus("online").catch(() => {});
    if (S.idleTimer) clearTimeout(S.idleTimer);
    S.idleTimer = setTimeout(markIdle, IDLE_TIMEOUT);
  };

  const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart"];
  activityEvents.forEach((evt) => window.addEventListener(evt, bump));
  window.addEventListener("focus", bump);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) markIdle();
    else bump();
  });

  bump();
}

/* ---------------------------
   AUTH UI
---------------------------- */
function openSignInModal() {
  const m = modalBase(`Sign in to ${APP_NAME}`);

  const info = el("div", { class: "hint" }, [
    "Hello, and welcome to ChattyChatFace, a free online unblocked chat service developed and made by ",
    el("a", { href: BRAND_LINK, target: "_blank", rel: "noopener" }, [BRAND_NAME]),
    ". This is currently a work in progress so feel free to report errors or give feedback!",
    el("div", { class: "hr" }),
    el("div", { class: "hint" }, [
      "Tips:",
      el("br"),
      "• Enter sends, ",
      el("span", { class: "kbd", text: "Shift" }), "+", el("span", { class: "kbd", text: "Enter" }), " for a new line.",
      el("br"),
      "• Use /help for commands.",
      el("br"),
      "• Display names have no spaces and are unique (case-insensitive).",
      el("br"),
      "• Privacy notice: We’re not responsible for user privacy or security. Please use at your own risk."
    ])
  ]);

  const btn = el("button", { class: "googleBtn", "aria-label": "Continue with Google" }, [
    el("img", { src: GOOGLE_SIGNIN_IMG, alt: "Continue with Google" })
  ]);
  const cancel = el("button", { class: "btn" }, ["Cancel"]);

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      await handleSignedInUser(auth.currentUser);
      m.close();
    } catch (e) {
      const message = String(e?.message || "");
      const code = String(e?.code || "");
      const shouldRedirect =
        message.includes("Cross-Origin-Opener-Policy") ||
        code.includes("popup-blocked") ||
        code.includes("popup-closed-by-user");
      if (shouldRedirect) {
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: "select_account" });
          await signInWithRedirect(auth, provider);
          return;
        } catch (err) {
          logFirebaseError("auth-redirect", err);
        }
      } else {
        logFirebaseError("auth-popup", e);
      }
      showToast(getFriendlyAuthError(e), "warn");
      btn.disabled = false;
    }
  });

  cancel.addEventListener("click", () => m.close());

  m.body.appendChild(info);
  m.footer.appendChild(el("div", { class: "row" }, [cancel, btn]));
}

function getFriendlyAuthError(e) {
  const code = e?.code || "";
  if (code.includes("popup-closed-by-user")) return "Sign-in popup was closed.";
  if (code.includes("cancelled-popup-request")) return "Sign-in popup was cancelled.";
  if (code.includes("popup-blocked")) return "Popup blocked. Allow popups for this site, then try again.";
  return "Sign-in failed. Try again.";
}

/* ---------------------------
   PROFILE / PRESENCE
---------------------------- */
async function ensureUserProfile(user) {
  const uid = user.uid;
  const privateRef = ref(db, peoplePrivatePath(uid));
  const snap = await safeGet(privateRef);
  const legacySnap = snap?.exists?.() ? null : await safeGet(ref(db, `users/${uid}`));
  const legacy = legacySnap?.exists?.() ? (legacySnap.val() || {}) : {};
  const existing = snap?.exists?.() ? (snap.val() || {}) : legacy;

  const basePrivate = {
    uid,
    email: user.email || legacy?.email || null,
    photoURL: user.photoURL || legacy?.photoURL || null,
    displayName: legacy?.displayNameDisplay || null,
    displayNameDisplay: legacy?.displayNameDisplay || null,
    displayNameNormalized: legacy?.displayNameNormalized || null,
    theme: legacy?.theme || DEFAULT_THEME,
    settings: {
      useGoogleAvatar: true,
      notifications: true,
      messageSounds: true
    },
    friendRequestsIn: {},
    friendRequestsOut: {},
    friends: {},
    blocks: {},
    reportsIn: {},
    reportsOut: {},
    chatRefs: {},
    chatState: {},
    nameHistory: legacy?.nameHistory || { current: null, previous: [] },
    createdAt: legacy?.createdAt || nowMs(),
    lastLogin: nowMs(),
    lastSeen: legacy?.lastSeen || nowMs(),
    status: legacy?.status || "online",
    typing: false,
    messagesSent: legacy?.messagesSent || 0
  };

  if (!snap?.exists?.()) {
    await setPeoplePrivate(uid, basePrivate);
    const baseStats = {
      counters: {
        logins: 0,
        friendRequestsSent: 0,
        friendRequestsAccepted: 0,
        friendRequestsDeclined: 0,
        usersBlocked: 0,
        messagesSent: 0
      },
      sessions: {}
    };
    if (S.peopleWriteEnabled) {
      await set(ref(db, peopleStatsPath(uid)), baseStats).catch((err) => {
        if (String(err?.code || "").includes("PERMISSION_DENIED")) {
          S.peopleWriteEnabled = false;
        }
      });
    }
    await set(ref(db, `users/${uid}/stats`), baseStats).catch(() => {});
  } else {
    await updatePeoplePrivate(uid, {
      email: user.email || null,
      photoURL: user.photoURL || null,
      lastLogin: nowMs(),
      lastSeen: nowMs(),
      status: "online",
      settings: {
        useGoogleAvatar: existing?.settings?.useGoogleAvatar !== false,
        notifications: existing?.settings?.notifications !== false,
        messageSounds: existing?.settings?.messageSounds !== false
      }
    });
  }

  const publicPayload = {
    uid,
    displayName: existing.displayNameDisplay || null,
    displayNameDisplay: existing.displayNameDisplay || null,
    displayNameNormalized: existing.displayNameNormalized || null,
    photoURL: user.photoURL || existing.photoURL || null,
    lastSeen: nowMs(),
    status: "online"
  };
  await updatePeoplePublic(uid, publicPayload);

  const presenceRef = ref(db, `presence/${uid}`);
  await update(presenceRef, { status: "online", lastSeen: nowMs() }).catch(() => {});
  onDisconnect(presenceRef).update({ status: "offline", lastSeen: nowMs() }).catch(() => {});
  onDisconnect(ref(db, peoplePrivatePath(uid))).update({ status: "offline", lastSeen: nowMs() }).catch(() => {});
  onDisconnect(ref(db, peoplePublicPath(uid))).update({ status: "offline", lastSeen: nowMs() }).catch(() => {});
  onDisconnect(ref(db, `users/${uid}`)).update({ status: "offline", lastSeen: nowMs() }).catch(() => {});
  onDisconnect(ref(db, `publicUsers/${uid}`)).update({ status: "offline", lastSeen: nowMs() }).catch(() => {});

  await incrementStatCounter(uid, "logins", 1);
  await logStatEvent(uid, "login", { provider: user.providerData?.[0]?.providerId || "unknown" });
  await startSessionTracking();
}

async function loadProfile(uid) {
  const peopleSnap = await safeGet(ref(db, peoplePrivatePath(uid)));
  if (peopleSnap?.exists?.()) return peopleSnap.val();
  const snap = await safeGet(ref(db, `users/${uid}`));
  return snap?.exists?.() ? snap.val() : null;
}

async function loadIsAdmin(uid) {
  try {
    const snap = await get(ref(db, `admins/${uid}`));
    return !!(snap.exists() && snap.val() === true);
  } catch {
    return false;
  }
}

/* ---------------------------
   DISPLAY NAME MODAL
---------------------------- */
async function isDisplayNameTaken(normalized, myUid) {
  const indexSnap = await safeGet(ref(db, PEOPLE_DISPLAYNAMES));
  if (indexSnap?.exists?.()) {
    const owner = indexSnap.val()?.[normalized] || null;
    if (owner && owner !== myUid) return true;
  }

  const legacyIndex = await safeGet(ref(db, "displayNames"));
  if (legacyIndex?.exists?.()) {
    const owner = legacyIndex.val()?.[normalized] || null;
    if (owner && owner !== myUid) return true;
  }

  const snap = await safeGet(ref(db, PEOPLE_ROOT));
  if (!snap?.exists?.()) {
    const legacyPublic = await safeGet(ref(db, "publicUsers"));
    if (!legacyPublic?.exists?.()) return false;
    const all = legacyPublic.val() || {};
    for (const [uid, u] of Object.entries(all)) {
      if (uid === myUid) continue;
      const dn = normalizeDisplayName(u?.displayNameDisplay || "");
      if (dn && dn === normalized) return true;
    }
    return false;
  }
  const all = snap.val() || {};
  for (const [uid, u] of Object.entries(all)) {
    if (uid === myUid) continue;
    const dn = normalizeDisplayName(u?.public?.displayNameDisplay || "");
    if (dn && dn === normalized) return true;
  }
  return false;
}

async function applyDisplayName(nextName, previousName, reason) {
  const raw = String(nextName || "").trim();
  const normalized = normalizeDisplayName(raw);
  const previousNormalized = normalizeDisplayName(previousName || "");
  const prev = String(previousName || "").trim();
  if (!raw || (prev && raw === prev && normalized === previousNormalized)) {
    return false;
  }
  const history = S.profile?.nameHistory || { current: null, previous: [] };
  const prevList = Array.isArray(history.previous) ? history.previous.slice(0) : [];
  if (prev && prev !== raw) prevList.unshift({ name: prev, at: nowMs() });

  const nameHistory = {
    current: raw,
    previous: prevList.slice(0, 12)
  };

  await updatePeoplePrivate(S.uid, {
    displayName: raw,
    displayNameDisplay: raw,
    displayNameNormalized: normalized,
    nameHistory,
    nameChangeLog: {
      from: prev || null,
      to: raw,
      reason: reason || "update",
      at: nowMs()
    }
  });

  await updatePeoplePublic(S.uid, {
    uid: S.uid,
    displayName: raw,
    displayNameDisplay: raw,
    displayNameNormalized: normalized,
    photoURL: S.user?.photoURL || null,
    lastSeen: nowMs(),
    status: S.presenceStatus || "online",
    nameHistory
  });
  S._nameCache[S.uid] = raw;

  if (previousNormalized && previousNormalized !== normalized) {
    await remove(ref(db, `displayNames/${previousNormalized}`)).catch(() => {});
    if (S.peopleWriteEnabled) {
      await remove(ref(db, `${PEOPLE_DISPLAYNAMES}/${previousNormalized}`)).catch((err) => {
        if (String(err?.code || "").includes("PERMISSION_DENIED")) {
          S.peopleWriteEnabled = false;
        }
      });
    }
  }
  try {
    await set(ref(db, `displayNames/${normalized}`), S.uid);
  } catch {
    // Legacy displayNames write failed; continue without blocking the UI.
  }
  if (S.peopleWriteEnabled) {
    await set(ref(db, `${PEOPLE_DISPLAYNAMES}/${normalized}`), S.uid).catch((err) => {
      if (String(err?.code || "").includes("PERMISSION_DENIED")) {
        S.peopleWriteEnabled = false;
      }
    });
  }
  return true;
}

function openDisplayNameModal(user) {
  const m = modalBase("Choose your display name");

  const warn = el("div", { class: "hint" }, [
    "No spaces. Not case sensitive for uniqueness. Your exact casing shows everywhere.",
    el("br"),
    "Example: ",
    el("span", { class: "kbd", text: "StaticQuasar931" }),
    " or ",
    el("span", { class: "kbd", text: "LovelyBricks23" }),
    "."
  ]);

  const input = el("input", {
    class: "input",
    placeholder: "Example: StaticQuasar931",
    autocomplete: "off",
    spellcheck: "false"
  });
  input.value = S.profile?.displayNameDisplay || "";

  const err = el("div", { class: "hint", id: "dnErr" });
  const reportWrap = el("div", { class: "row", style: "justify-content:flex-start;" });
  const reportBtn = el("button", { class: "btn", text: "Report mistake" });
  reportBtn.classList.add("hidden");
  reportWrap.appendChild(reportBtn);

  const avatarRow = el("label", { style: "display:flex; align-items:center; gap:8px;" }, [
    el("input", { type: "checkbox" }),
    el("span", { text: "Use Google profile photo as account avatar (default)" })
  ]);
  const avatarToggle = avatarRow.querySelector("input");
  avatarToggle.checked = S.profile?.settings?.useGoogleAvatar !== false;
  avatarToggle.addEventListener("change", async () => {
    await updatePeoplePrivate(S.uid, { settings: { ...S.profile?.settings, useGoogleAvatar: avatarToggle.checked } });
    await update(ref(db, `users/${S.uid}/settings`), { useGoogleAvatar: avatarToggle.checked }).catch((e) => logFirebaseError("update-avatar-setting", e));
  });

  const saveBtn = el("button", { class: "btn btnPrimary" }, ["Save"]);
  const randomBtn = el("button", { class: "btn" }, ["Random"]);
  const cancelBtn = el("button", { class: "btn" }, ["Cancel"]);

  async function doSave() {
    err.textContent = "";
    const raw = input.value || "";
    const v = validateDisplayName(raw);
    reportBtn.classList.add("hidden");
    if (!String(raw || "").trim()) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Picking...";
      const auto = await generateUniqueDisplayName();
      await applyDisplayName(auto, raw, "auto-generated");
      showToast("Name was empty. A safe default was picked.", "ok");
      m.close();
      await refreshAll();
      return;
    }
    if (v) {
      const blocked = findBlockedWord(raw);
      if (blocked) {
        err.textContent = "This username contains inappropriate content. If this is a mistake, report it.";
        reportBtn.classList.remove("hidden");
        reportBtn.onclick = () => reportNameIssue(raw, blocked);
        return;
      }
      err.textContent = v;
      return;
    }

    const normalized = normalizeDisplayName(raw);
    const current = S.profile?.displayNameDisplay || "";
    if (current && raw === current) {
      showToast("Display name unchanged.", "info");
      m.close();
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Checking...";

    try {
      const taken = await isDisplayNameTaken(normalized, user.uid);
      if (taken) {
        err.textContent = "That name is taken. Please choose another.";
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
        return;
      }

      saveBtn.textContent = "Saving...";
      const changed = await applyDisplayName(raw, S.profile?.displayNameDisplay || "", "user-update");

      if (changed) {
        m.close();
        showToast("Display name saved.", "ok");
        await refreshAll();
      } else {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
        showToast("Display name unchanged.", "info");
      }
    } catch (e) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
      err.textContent = "Failed to save display name. Try again.";
      logFirebaseError("save-display-name", e);
    }
  }

  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") doSave();
  });

  randomBtn.addEventListener("click", async () => {
    randomBtn.disabled = true;
    randomBtn.textContent = "Picking...";
    try {
      const auto = await generateUniqueDisplayName();
      input.value = auto;
      err.textContent = "Random name ready. Click Save to use it.";
    } catch {
      err.textContent = "Failed to generate a random name.";
    } finally {
      randomBtn.disabled = false;
      randomBtn.textContent = "Random";
    }
  });

  saveBtn.addEventListener("click", doSave);
  cancelBtn.addEventListener("click", () => m.close());

  m.body.appendChild(warn);
  m.body.appendChild(avatarRow);
  m.body.appendChild(input);
  m.body.appendChild(err);
  m.body.appendChild(reportWrap);
  m.footer.appendChild(el("div", { class: "row" }, [cancelBtn, randomBtn, saveBtn]));
}

async function reportNameIssue(attemptedName, flaggedWord) {
  try {
    const payload = {
      createdBy: S.uid,
      createdAt: nowMs(),
      type: "name",
      details: JSON.stringify({
        attemptedName,
        flaggedWord,
        reporterDisplay: S.profile?.displayNameDisplay || "User",
        reporterUid: S.uid
      }).slice(0, 7800)
    };
    const repRef = push(ref(db, "reports"));
    await set(repRef, payload);
    await logStatEvent(S.uid, "name-report-sent", { flaggedWord });
    showToast("Report sent.", "ok");
  } catch (e) {
    logFirebaseError("report-name", e);
  }
}

/* ---------------------------
   THEME
---------------------------- */
function applyTheme(theme) {
  const t = THEMES.includes(theme) ? theme : DEFAULT_THEME;
  document.body.classList.remove(
    "theme-dark",
    "theme-light",
    "theme-ocean",
    "theme-forest",
    "theme-sunset",
    "theme-lavender",
    "theme-midnight",
    "theme-rose"
  );
  document.body.classList.add(`theme-${t}`);
  S.theme = t;
  setStoredTheme(t);
}

async function saveThemeToCloud(theme) {
  if (!S.uid) return;
  try {
    await updatePeoplePrivate(S.uid, { theme });
    await update(ref(db, `users/${S.uid}`), { theme }).catch(() => {});
  } catch {}
}

function buildAuthTopBar() {
  const bar = el("div", { class: "authTop" });
  const left = el("div", { class: "authTopLeft" });
  const right = el("div", { class: "authTopRight" });

  const toggle = el("div", { class: "authThemeToggle", role: "group", "aria-label": "Theme" });
  const darkBtn = el("button", { class: "authThemeBtn", text: "Dark", type: "button" });
  const lightBtn = el("button", { class: "authThemeBtn", text: "Light", type: "button" });

  const updateActive = () => {
    const mode = S.theme === "light" ? "light" : "dark";
    darkBtn.classList.toggle("active", mode === "dark");
    lightBtn.classList.toggle("active", mode === "light");
  };

  darkBtn.addEventListener("click", () => {
    applyTheme("dark");
    updateActive();
  });
  lightBtn.addEventListener("click", () => {
    applyTheme("light");
    updateActive();
  });

  updateActive();
  toggle.appendChild(darkBtn);
  toggle.appendChild(lightBtn);
  right.appendChild(toggle);
  bar.appendChild(left);
  bar.appendChild(right);
  return bar;
}

/* ---------------------------
   UI RENDER
---------------------------- */
function renderSignedOut() {
  clear(root);
  applyTheme(getStoredTheme() || DEFAULT_THEME);
  document.body.classList.add("auth-screen");
  const staticWrap = document.getElementById("staticWrap");
  const staticMenu = document.getElementById("staticMenu");
  const staticSlideMenu = document.getElementById("staticSlideMenu");
  if (staticWrap) staticWrap.classList.remove("staticWrapInApp");
  if (staticMenu) staticMenu.classList.remove("staticMenuInApp");
  if (staticSlideMenu) staticSlideMenu.classList.remove("staticSlideInApp");
  if (staticWrap) staticWrap.style.display = "block";
  if (staticWrap && !document.body.contains(staticWrap)) document.body.appendChild(staticWrap);

  const screen = el("div", { class: "authScreen" });
  screen.appendChild(buildAuthTopBar());
  const card = el("div", { class: "authCard authCardGlow" });
  const bannerLink = el("a", { href: BRAND_LINK, target: "_blank", rel: "noopener" }, [
    el("img", { class: "authBanner", src: BRAND_BANNER, alt: `${BRAND_NAME} banner` })
  ]);

  const brand = el("div", { class: "authBrand" }, [
    el("a", { class: "logoBtn", href: BRAND_LINK, target: "_blank", rel: "noopener" }, [
      el("img", { class: "authLogo", src: BRAND_ICON, alt: `${APP_NAME} logo` })
    ]),
    el("div", { class: "authTitle", text: APP_NAME }),
    el("div", { class: "small", text: APP_SECONDARY_NAME }),
    el("div", { class: "authSubtitle" }, [
      "Made by ",
      el("a", { href: BRAND_LINK, target: "_blank", rel: "noopener" }, [BRAND_NAME]),
      "."
    ])
  ]);

  const copy = el("div", { class: "hint" }, [
    "Sign in to chat with friends, create group DMs, and use simple commands.",
    el("br"),
    "This is a work in progress. Don’t share sensitive personal info.",
    el("br"),
    "Your Google profile picture is used as your account avatar by default. You can change this in Settings."
  ]);

  const signInBtn = el("button", { class: "googleBtn", onclick: openSignInModal, "aria-label": "Sign in with Google" }, [
    el("img", { src: GOOGLE_SIGNIN_IMG, alt: "Sign in with Google" })
  ]);
  const actions = el("div", { class: "authActions" }, [signInBtn]);

  const adSlot = el("div", { class: "adSlot" });

  card.appendChild(bannerLink);
  card.appendChild(brand);
  card.appendChild(copy);
  card.appendChild(actions);
  card.appendChild(adSlot);
  screen.appendChild(card);
  root.appendChild(screen);
}

function renderLoadingScreen() {
  clear(root);
  applyTheme(getStoredTheme() || DEFAULT_THEME);
  document.body.classList.add("auth-screen");
  const staticWrap = document.getElementById("staticWrap");
  const staticMenu = document.getElementById("staticMenu");
  const staticSlideMenu = document.getElementById("staticSlideMenu");
  if (staticWrap) staticWrap.classList.remove("staticWrapInApp");
  if (staticMenu) staticMenu.classList.remove("staticMenuInApp");
  if (staticSlideMenu) staticSlideMenu.classList.remove("staticSlideInApp");
  if (staticWrap) staticWrap.style.display = "block";
  if (staticWrap && !document.body.contains(staticWrap)) document.body.appendChild(staticWrap);

  const screen = el("div", { class: "authScreen" });
  screen.appendChild(buildAuthTopBar());
  const card = el("div", { class: "authCard authCardGlow" });
  const bannerLink = el("a", { href: BRAND_LINK, target: "_blank", rel: "noopener" }, [
    el("img", { class: "authBanner", src: BRAND_BANNER, alt: `${BRAND_NAME} banner` })
  ]);

  const brand = el("div", { class: "authBrandRow" }, [
    el("a", { class: "logoBtn", href: BRAND_LINK, target: "_blank", rel: "noopener" }, [
      el("img", { class: "authLogo", src: BRAND_ICON, alt: `${APP_NAME} logo` })
    ]),
    el("div", { class: "authBrandDetails" }, [
      el("div", { class: "authTitle", text: APP_NAME }),
      el("div", { class: "small", text: APP_SECONDARY_NAME }),
      el("div", { class: "authMetaLine" }, [
        el("span", { text: "Made by" }),
        el("a", { href: BRAND_LINK, target: "_blank", rel: "noopener" }, [BRAND_NAME]),
        el("span", { text: "• Loading your chat experience..." })
      ])
    ])
  ]);

  const adSlot = el("div", { class: "adSlot" });

  card.appendChild(bannerLink);
  card.appendChild(brand);
  card.appendChild(adSlot);
  screen.appendChild(card);
  root.appendChild(screen);
}

function renderShell() {
  clear(root);
  document.body.classList.remove("auth-screen");

  const shell = el("div", { class: "appShell" });

  // SIDEBAR
  const sidebar = el("div", { class: "panel sidebar" });

  const sideHeader = el("div", { class: "sideHeader" }, [
    el("div", { class: "brand" }, [
      el("div", { class: "brandTitle", text: APP_NAME }),
      el("div", { class: "brandSub" }, [
        "by ",
        el("a", { href: BRAND_LINK, target: "_blank", rel: "noopener" }, [BRAND_NAME])
      ])
    ]),
    el("div", { class: "sideTools" }, [
      el("button", { class: "iconBtn", title: "Friends", onclick: openFriendsModal }, [svgUsers()]),
      el("button", { class: "iconBtn", title: "New Chat", onclick: openNewChatModal }, [svgPlus()]),
      el("button", { class: "iconBtn", title: "Add Friend", onclick: openAddFriendModal }, [svgUserPlus()])
    ])
  ]);

  const searchRow = el("div", { class: "searchRow" }, [
    el("input", { class: "input", id: "searchChats", placeholder: "Search chats..." })
  ]);

  const reqTitle = el("div", { class: "sectionTitle", text: "Friend Requests" });
  const requestList = el("div", { class: "requestList", id: "requestList" });
  const outTitle = el("div", { class: "sectionTitle", text: "Outgoing Requests" });
  const outgoingList = el("div", { class: "requestList", id: "outgoingList" });

  const chatTitle = el("div", { class: "sectionTitle", text: "Recent Chats" });
  const chatList = el("div", { class: "chatList", id: "chatList" });

  sidebar.appendChild(sideHeader);
  sidebar.appendChild(searchRow);
  sidebar.appendChild(reqTitle);
  sidebar.appendChild(requestList);
  sidebar.appendChild(outTitle);
  sidebar.appendChild(outgoingList);
  sidebar.appendChild(chatTitle);
  sidebar.appendChild(chatList);

  const staticWrap = document.getElementById("staticWrap");
  const staticMenu = document.getElementById("staticMenu");
  const staticSlideMenu = document.getElementById("staticSlideMenu");
  if (staticWrap) {
    staticWrap.classList.remove("staticWrapInApp");
    if (staticSlideMenu) staticSlideMenu.classList.remove("staticSlideInApp");
    if (staticMenu) staticMenu.classList.remove("staticMenuInApp");
    staticWrap.style.display = "none";
  }

  // CHAT PANE
  const chatPane = el("div", { class: "panel chatPane" });

  const topBar = el("div", { class: "topBar" });
  const topLeft = el("div", { class: "topLeft" }, [
    el("div", { class: "chatTitle", id: "chatTitle", text: "Select a chat" }),
    el("div", { class: "chatSub", id: "chatSub", text: "Add a friend or create a group DM." })
  ]);
  const toastWrap = el("div", { id: "toastWrap", class: "toastWrap", "aria-live": "polite" });
  const topRight = el("div", { class: "topRight" }, [
    el("div", { class: "pill", id: "mePill" }, [
      el("span", { text: "You:" }),
      el("b", { id: "meName", text: S.profile?.displayNameDisplay || "User" })
    ]),
    el("button", { class: "iconBtn", title: "Group Info", onclick: openGroupInfoModal }, ["ℹ️"]),
    el("button", { class: "iconBtn", id: "themeBtn", title: "Theme", onclick: openThemeModal }, [svgPalette()]),
    el("button", { class: "iconBtn", title: "Settings", onclick: openSettingsModal }, [svgGear()]),
    toastWrap
  ]);
  topBar.appendChild(topLeft);
  topBar.appendChild(topRight);

  const messages = el("div", { class: "messages", id: "messages" });

  const composer = el("div", { class: "composer" });
  const composerRow = el("div", { class: "composerRow" }, [
    el("button", { class: "actionBtn", title: "Emoji", onclick: openEmojiModal }, ["😊"]),
    el("textarea", { class: "textarea", id: "msgBox", placeholder: "Message..." }),
    el("button", { class: "sendBtn", id: "sendBtn", onclick: onSendClicked }, ["Send"])
  ]);

  const typingLine = el("div", { class: "typingLine", id: "typingLine", text: "" });
  const countLine = el("div", { class: "countLine", id: "countLine", text: "0 / 4000" });
  const composerInfo = el("div", { class: "composerInfo" }, [typingLine, countLine]);

  composer.appendChild(composerRow);
  composer.appendChild(composerInfo);

  chatPane.appendChild(topBar);
  chatPane.appendChild(messages);
  chatPane.appendChild(composer);

  shell.appendChild(sidebar);
  shell.appendChild(chatPane);

  root.appendChild(shell);

  // store refs
  S.ui = {
    shell,
    requestList,
    outgoingList,
    chatList,
    searchChats: searchRow.querySelector("#searchChats"),
    chatTitle: topBar.querySelector("#chatTitle"),
    chatSub: topBar.querySelector("#chatSub"),
    chatCode: null,
    themeBtn: topBar.querySelector("#themeBtn"),
    meName: topBar.querySelector("#meName"),
    mePill: topBar.querySelector("#mePill"),
    toastWrap: topBar.querySelector("#toastWrap"),
    messages,
    msgBox: composer.querySelector("#msgBox"),
    sendBtn: composer.querySelector("#sendBtn"),
    typingLine,
    countLine
  };

  renderHomePanel();

  // behaviors
  S.ui.searchChats.addEventListener("input", () => renderChatList());
  S.ui.msgBox.addEventListener("keydown", onComposerKeyDown);
  S.ui.msgBox.addEventListener("input", onComposerInput);
  S.ui.mePill.addEventListener("click", () => openSettingsModal());
  S.ui.mePill.addEventListener("contextmenu", (ev) => {
    ev.preventDefault();
    showContextMenu(ev.clientX, ev.clientY, [
      {
        label: "Copy display name",
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(String(S.profile?.displayNameDisplay || ""));
            showToast("Display name copied.", "ok");
          } catch {
            showToast("Copy failed.", "error");
          }
        }
      }
    ]);
  });
  S.ui.themeBtn.addEventListener("contextmenu", (ev) => {
    ev.preventDefault();
    showContextMenu(ev.clientX, ev.clientY, [
      {
        label: "Random theme",
        onClick: async () => {
          const pick = THEMES[Math.floor(Math.random() * THEMES.length)];
          applyTheme(pick);
          await saveThemeToCloud(pick);
          showToast(`Theme set to ${pick}.`, "ok");
        }
      },
      {
        label: "Theme tips",
        onClick: () => showToast("Themes update all menus and panels instantly.", "info")
      }
    ]);
  });
  S.ui.chatSub.addEventListener("click", async () => {
    if (S.active?.type !== "group" || !S.active?.joinCode) return;
    try {
      await navigator.clipboard.writeText(String(S.active.joinCode));
      showToast("Join code copied.", "ok");
    } catch {
      showToast("Copy failed.", "error");
    }
  });
  S.ui.shell.addEventListener("contextmenu", (ev) => {
    if (!ev.target.closest(".chatItem")) return;
    ev.preventDefault();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") hideContextMenu();
  });

  renderSystemMessage(
    `Welcome to ${APP_NAME} (${APP_SECONDARY_NAME})! Use /help for commands. Made by ${BRAND_NAME}.`,
    true
  );
}

/* ---------------------------
   FRIEND REQUESTS + FRIENDS
---------------------------- */
function renderFriendRequests() {
  const list = S.ui.requestList;
  if (!list) return;
  clear(list);

  const entries = Object.values(S.friendRequestsIn || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (!entries.length) {
    list.appendChild(el("div", { class: "small", style: "padding: 0 12px 10px 12px;", text: "No incoming requests." }));
    return;
  }

  for (const req of entries) {
    const item = el("div", { class: "reqItem" });

    const nameBtn = el("button", {
      class: "reqName",
      text: req.fromDisplay || "Unknown",
      type: "button",
      title: "Open DM",
      "aria-label": `Open DM with ${req.fromDisplay || "Unknown"}`
    });
    nameBtn.addEventListener("click", async () => {
      if (!req.fromUid) return;
      const dmId = deterministicDmId(S.uid, req.fromUid);
      await upsertMyChatRef("dm", dmId, req.fromDisplay || "Friend", null, undefined, "DM", { preserveLastAt: true });
      await refreshChats();
      await openChat({ type: "dm", id: dmId, name: req.fromDisplay || "Friend" });
    });

    const avatar = el("img", {
      class: "reqAvatar",
      src: req.fromPhoto || BRAND_ICON,
      alt: `${req.fromDisplay || "User"} avatar`,
      loading: "lazy"
    });
    const left = el("div", { class: "reqLeft" }, [
      avatar,
      el("div", { class: "reqText" }, [
        nameBtn,
        el("div", { class: "reqMeta", text: `Request • ${formatDateShort(req.createdAt)} ${formatTime(req.createdAt)}` })
      ])
    ]);

    const btns = el("div", { class: "reqBtns" }, [
      el("button", { class: "btnTiny no", onclick: () => declineFriendRequest(req.fromUid) }, ["✕"]),
      el("button", { class: "btnTiny ok", onclick: () => acceptFriendRequest(req.fromUid) }, ["✓"])
    ]);

    item.appendChild(left);
    item.appendChild(btns);
    list.appendChild(item);
  }
}

function renderOutgoingRequests() {
  const list = S.ui.outgoingList;
  if (!list) return;
  clear(list);

  const entries = Object.values(S.friendRequestsOut || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (!entries.length) {
    list.appendChild(el("div", { class: "small", style: "padding: 0 12px 10px 12px;", text: "No outgoing requests." }));
    return;
  }

  for (const req of entries) {
    const item = el("div", { class: "reqItem" });
    const nameBtn = el("button", {
      class: "reqName",
      text: req.toDisplay || "Unknown",
      type: "button",
      title: "Open DM",
      "aria-label": `Open DM with ${req.toDisplay || "Unknown"}`
    });
    nameBtn.addEventListener("click", async () => {
      if (!req.toUid) return;
      const dmId = deterministicDmId(S.uid, req.toUid);
      await upsertMyChatRef("dm", dmId, req.toDisplay || "Friend", null, undefined, "DM", { preserveLastAt: true });
      await refreshChats();
      await openChat({ type: "dm", id: dmId, name: req.toDisplay || "Friend" });
    });

    const avatar = el("img", {
      class: "reqAvatar",
      src: req.toPhoto || BRAND_ICON,
      alt: `${req.toDisplay || "User"} avatar`,
      loading: "lazy"
    });
    const left = el("div", { class: "reqLeft" }, [
      avatar,
      el("div", { class: "reqText" }, [
        nameBtn,
        el("div", { class: "reqMeta", text: `Pending • ${formatDateShort(req.createdAt)} ${formatTime(req.createdAt)}` })
      ])
    ]);

    const btns = el("div", { class: "reqBtns" }, [
      el("button", { class: "btnTiny no", onclick: () => cancelOutgoingRequest(req.toUid) }, ["✕"])
    ]);

    item.appendChild(left);
    item.appendChild(btns);
    list.appendChild(item);
  }
}

async function sendFriendRequestByDisplayOrEmail(input) {
  const raw = String(input || "").trim();
  if (!raw) return;

  const normalized = normalizeDisplayName(raw);

  const peopleSnap = await safeGet(ref(db, PEOPLE_ROOT));
  const legacySnap = peopleSnap?.exists?.() ? null : await safeGet(ref(db, "publicUsers"));
  const all = peopleSnap?.exists?.() ? (peopleSnap.val() || {}) : (legacySnap?.val?.() || {});
  if (!Object.keys(all || {}).length) throw new Error("No users found yet.");

  let targetUid = null;
  let targetDisplay = null;
  for (const [uid, u] of Object.entries(all)) {
    const dn = normalizeDisplayName(peopleSnap?.exists?.() ? (u?.public?.displayNameDisplay || "") : (u?.displayNameDisplay || ""));
    if (dn && dn === normalized) {
      targetUid = uid;
      targetDisplay = peopleSnap?.exists?.() ? (u?.public?.displayNameDisplay || raw) : (u?.displayNameDisplay || raw);
      break;
    }
  }

  if (!targetUid) throw new Error("User not found (display name).");
  if (targetUid === S.uid) throw new Error("You can’t add yourself.");
  if (S.friends?.[targetUid]) throw new Error("You are already friends.");
  if (S.friendRequestsOut?.[targetUid]) throw new Error("Friend request already sent.");

  const fSnap = await safeGet(ref(db, `${peoplePrivatePath(S.uid)}/friends/${targetUid}`));
  const fLegacy = fSnap?.exists?.() ? null : await safeGet(ref(db, `users/${S.uid}/friends/${targetUid}`));
  if (fSnap?.exists?.() || fLegacy?.exists?.()) throw new Error("You are already friends.");

  const blockSnap = await safeGet(ref(db, `${peoplePrivatePath(S.uid)}/blocks/${targetUid}`));
  const blockLegacy = blockSnap?.exists?.() ? null : await safeGet(ref(db, `users/${S.uid}/blocks/${targetUid}`));
  if (blockSnap?.exists?.() || blockLegacy?.exists?.()) throw new Error("You blocked this user.");

  const fromPhoto = S.profile?.photoURL || S.user?.photoURL || null;
  const targetPhoto = peopleSnap?.exists?.() ? (all?.[targetUid]?.public?.photoURL || null) : (all?.[targetUid]?.photoURL || null);
  await update(ref(db, `users/${S.uid}/friendRequestsOut/${targetUid}`), {
    toUid: targetUid,
    toDisplay: targetDisplay,
    createdAt: nowMs(),
    toPhoto: targetPhoto
  }).catch(() => {});
  await update(ref(db, `users/${targetUid}/friendRequestsIn/${S.uid}`), {
    fromUid: S.uid,
    fromDisplay: S.profile.displayNameDisplay,
    fromPhoto,
    createdAt: nowMs()
  }).catch(() => {});

  await incrementStatCounter(S.uid, "friendRequestsSent", 1);
  await logStatEvent(S.uid, "friend-request-sent", { toUid: targetUid });
  showToast(`Friend request sent to ${targetDisplay}.`, "ok");
}

async function declineFriendRequest(fromUid) {
  try {
    await remove(ref(db, `users/${S.uid}/friendRequestsIn/${fromUid}`)).catch(() => {});
    await incrementStatCounter(S.uid, "friendRequestsDeclined", 1);
    await logStatEvent(S.uid, "friend-request-declined", { fromUid });
    showToast("Request declined.", "ok");
  } catch {
    showToast("Failed to decline.", "error");
  }
}

async function cancelOutgoingRequest(toUid, { silent = false } = {}) {
  if (!toUid) return;
  await remove(ref(db, `users/${S.uid}/friendRequestsOut/${toUid}`)).catch(() => {});
  await remove(ref(db, `users/${toUid}/friendRequestsIn/${S.uid}`)).catch(() => {});
  if (!silent) showToast("Request canceled.", "ok");
}

async function ensureFriendshipFromOutgoing(otherUid, displayName, photoURL) {
  if (!otherUid || S.friends?.[otherUid]) return;
  if (!S.friendRequestsOut?.[otherUid]) return;
  await update(ref(db, `users/${S.uid}/friends/${otherUid}`), {
    uid: otherUid,
    displayNameDisplay: displayName || "Friend",
    photoURL: photoURL || null,
    since: nowMs()
  }).catch(() => {});
  await remove(ref(db, `users/${S.uid}/friendRequestsOut/${otherUid}`)).catch(() => {});
  await remove(ref(db, `users/${otherUid}/friendRequestsIn/${S.uid}`)).catch(() => {});
}

async function pruneOutgoingRequests() {
  const outgoing = S.friendRequestsOut || {};
  const outgoingIds = Object.keys(outgoing);
  if (!outgoingIds.length) return;
  for (const uid of outgoingIds) {
    if (S.friends?.[uid]) {
      await cancelOutgoingRequest(uid, { silent: true });
      continue;
    }
    const hasDm = (S.chats || []).some((c) => c.type === "dm" && getOtherUidFromChat(c) === uid);
    if (hasDm) {
      await cancelOutgoingRequest(uid, { silent: true });
    }
  }
}

function deterministicDmId(a, b) {
  return [a, b].sort().join("_");
}

async function acceptFriendRequest(fromUid) {
  try {
    const pub = await safeGet(ref(db, peoplePublicPath(fromUid)));
    const legacyPub = pub?.exists?.() ? null : await safeGet(ref(db, `publicUsers/${fromUid}`));
    const pubData = pub?.exists?.() ? pub.val() : (legacyPub?.val?.() || {});
    const friendDisplay = pubData?.displayNameDisplay || "Friend";
    const friendPhoto = pubData?.photoURL || null;
    const myDisplay = S.profile?.displayNameDisplay || "Friend";
    const myPhoto = S.user?.photoURL || null;

    await update(ref(db, `users/${S.uid}/friends/${fromUid}`), {
      uid: fromUid,
      displayNameDisplay: friendDisplay,
      photoURL: friendPhoto,
      since: nowMs()
    });

    await remove(ref(db, `users/${S.uid}/friendRequestsIn/${fromUid}`)).catch(() => {});

    const dmId = deterministicDmId(S.uid, fromUid);

    await set(ref(db, `dms/${dmId}`), {
      createdAt: nowMs(),
      memberIds: { [S.uid]: true, [fromUid]: true }
    }).catch(() => {});

    await push(ref(db, `dmMessages/${dmId}`), {
      authorId: S.uid,
      content: `✅ You are now friends with ${friendDisplay}.`,
      createdAt: nowMs()
    }).catch(() => {});

    await upsertMyChatRef("dm", dmId, friendDisplay, friendPhoto, nowMs());
    await incrementStatCounter(S.uid, "friendRequestsAccepted", 1);
    await logStatEvent(S.uid, "friend-request-accepted", { fromUid });
    showToast(`Friends with ${friendDisplay}. DM created.`, "ok");
    await refreshChats();
    await openChat({ type: "dm", id: dmId, name: friendDisplay, photoURL: friendPhoto, members: [S.uid, fromUid] });
  } catch {
    showToast("Failed to accept request.", "error");
  }
}

/* ---------------------------
   CHATS (per-user refs + unread)
---------------------------- */
async function upsertMyChatRef(type, id, name, photoURL, lastAt, sub, options = {}) {
  const key = scopeKey(type, id);
  const existing = (S.chats || []).find((c) => c.type === type && c.id === id) || null;
  const obj = {
    type,
    id,
    name: name || existing?.name || "Chat",
    photoURL: photoURL || existing?.photoURL || null,
    sub: typeof sub === "string" ? sub : (existing?.sub || ""),
    hidden: existing?.hidden || false
  };

  if (options.preserveLastAt && existing?.lastAt) {
    obj.lastAt = existing.lastAt;
  } else if (typeof lastAt === "number") {
    obj.lastAt = lastAt;
  } else if (!options.preserveLastAt) {
    obj.lastAt = nowMs();
  } else if (!existing?.lastAt) {
    obj.lastAt = nowMs();
  }

  await updateMyChatRef(key, obj);
}

async function clearActiveChat() {
  S.active = null;
  clearChatListeners();
  renderHomePanel();
  renderChatList();
}

async function hideChatRef(type, id) {
  const key = scopeKey(type, id);
  await updateMyChatRef(key, { hidden: true });
}

async function unhideChatRef(type, id) {
  const key = scopeKey(type, id);
  await updateMyChatRef(key, { hidden: false });
}

async function setLastRead(type, id, ts) {
  const key = scopeKey(type, id);
  await updateMyChatState(key, { lastReadAt: ts || nowMs() });
}

async function loadMyChatState() {
  const snap = await safeGet(ref(db, `${peoplePrivatePath(S.uid)}/chatState`));
  if (snap?.exists?.()) {
    S.chatState = snap.val() || {};
  } else {
    const legacy = await safeGet(ref(db, `users/${S.uid}/chatState`));
    S.chatState = legacy?.exists?.() ? (legacy.val() || {}) : {};
  }
}

async function updateUnreadCounts() {
  if (!S.uid) return;

  let chatRefsSnap = await safeGet(ref(db, `${peoplePrivatePath(S.uid)}/chatRefs`));
  let refsObj = chatRefsSnap?.exists?.() ? (chatRefsSnap.val() || {}) : {};
  if (!chatRefsSnap?.exists?.()) {
    chatRefsSnap = await safeGet(ref(db, `users/${S.uid}/chatRefs`));
    refsObj = chatRefsSnap?.exists?.() ? (chatRefsSnap.val() || {}) : {};
  }
  const refs = Object.values(refsObj);

  for (const c of refs) {
    const key = scopeKey(c.type, c.id);
    const lastReadAt = S.chatState?.[key]?.lastReadAt || 0;
    const lastAt = c.lastAt || 0;

    let unread = 0;
    if (lastAt > lastReadAt) {
      // Unread badge is 1+ if newer than last read and window not focused on this chat.
      // This stays cheap and reliable under your rules.
      const isActive = S.active && S.active.type === c.type && S.active.id === c.id;
      unread = (isActive && S.isWindowFocused) ? 0 : 1;
    }

    if (!S.chatState[key]) S.chatState[key] = {};
    S.chatState[key].unread = unread;

    await updateMyChatState(key, { unread });
  }

  await refreshChats();
}

async function markActiveReadNow() {
  if (!S.active) return;
  await setLastRead(S.active.type, S.active.id, nowMs());
  await updateUnreadCounts();
}

/* ---------------------------
   GROUP DMs
---------------------------- */
function generateJoinCode6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function createGroupDm(groupName, memberUids) {
  const name = String(groupName || "").trim();
  if (!name) throw new Error("Group name required.");

  const ids = Array.from(new Set([S.uid, ...(memberUids || [])])).filter(Boolean);

  const groupRef = push(ref(db, "groupDms"));
  const groupId = groupRef.key;

  const code = generateJoinCode6();
  const memberIds = {};
  for (const uid of ids) memberIds[uid] = true;

  await set(ref(db, `groupDms/${groupId}`), {
    createdAt: nowMs(),
    createdBy: S.uid,
    ownerId: S.uid,
    name,
    code,
    memberIds
  });

  await push(ref(db, `groupDmMessages/${groupId}`), {
    authorId: S.uid,
    content: `✨ ${S.profile.displayNameDisplay} created the group. Join code: ${code}`,
    createdAt: nowMs()
  }).catch(() => {});

  await upsertMyChatRef("group", groupId, name, null, nowMs(), "Group created");
  return { groupId, name, code, memberIds };
}

async function inviteFriendToGroup(groupId, friendUid) {
  // Any current member can write (per your rules). This adds a friend to memberIds.
  await update(ref(db, `groupDms/${groupId}/memberIds`), { [friendUid]: true }).catch(() => {});
  await push(ref(db, `groupDmMessages/${groupId}`), {
    authorId: S.uid,
    content: `➕ ${S.profile.displayNameDisplay} added a member.`,
    createdAt: nowMs()
  }).catch(() => {});

  // You cannot write their chatRefs due to rules. They must open/join from a direct link or you implement a public invite index later.
  showToast("Member added. They can open it if they already have access.", "ok");
}

async function joinGroupByCode(codeRaw) {
  const code = String(codeRaw || "").trim();
  if (!code) throw new Error("Enter a join code.");

  const groupQuery = query(ref(db, "groupDms"), orderByChild("code"), equalTo(code));
  const snap = await get(groupQuery);
  if (!snap.exists()) throw new Error("No group found with that code.");

  const [groupId, data] = Object.entries(snap.val() || {})[0] || [];
  if (!groupId || !data) throw new Error("Group not found.");

  const memberIds = data.memberIds || {};
  if (!memberIds[S.uid]) {
    await update(ref(db, `groupDms/${groupId}/memberIds`), { [S.uid]: true });
    await push(ref(db, `groupDmMessages/${groupId}`), {
      authorId: S.uid,
      content: `👋 ${S.profile.displayNameDisplay} joined the group.`,
      createdAt: nowMs()
    }).catch(() => {});
  }

  await upsertMyChatRef("group", groupId, data.name || "Group DM", null, nowMs(), "Group DM");
  return { groupId, name: data.name || "Group DM" };
}

async function leaveGroup(groupId) {
  try {
    await push(ref(db, `groupDmMessages/${groupId}`), {
      authorId: S.uid,
      content: `👋 ${S.profile.displayNameDisplay} left the group.`,
      createdAt: nowMs()
    }).catch(() => {});
    await remove(ref(db, `groupDms/${groupId}/memberIds/${S.uid}`));
  } catch {}
  await hideChatRef("group", groupId);
  showToast("Left group (chat hidden).", "ok");
  await refreshChats();
  if (S.active?.type === "group" && S.active?.id === groupId) {
    S.active = null;
    clearChatListeners();
    renderSystemMessage("You left the group.", true);
    renderChatList();
  }
}

async function kickGroupMember(groupId, memberUid) {
  try {
    await remove(ref(db, `groupDms/${groupId}/memberIds/${memberUid}`));
    await push(ref(db, `groupDmMessages/${groupId}`), {
      authorId: S.uid,
      content: `🚪 ${S.profile.displayNameDisplay} removed a member.`,
      createdAt: nowMs()
    }).catch(() => {});
  } catch {
    showToast("Failed to remove member.", "error");
  }
}

async function getAuthorDisplay(uid) {
  if (!uid) return "User";
  if (uid === S.uid) return S.profile?.displayNameDisplay || "You";
  if (S._nameCache[uid]) return S._nameCache[uid];
  try {
    const cached = S.publicUsers?.[uid]?.displayNameDisplay;
    if (cached) {
      S._nameCache[uid] = cached;
      return cached;
    }
    const pub = await safeGet(ref(db, peoplePublicPath(uid)));
    if (pub?.exists?.()) {
      const dn = pub.val()?.displayNameDisplay || "User";
      S._nameCache[uid] = dn;
      return dn;
    }
    const legacy = await safeGet(ref(db, `publicUsers/${uid}`));
    const dn = legacy?.exists?.() ? (legacy.val()?.displayNameDisplay || "User") : "User";
    S._nameCache[uid] = dn;
    return dn;
  } catch {
    return "User";
  }
}

async function openChat(chat) {
  if (!chat?.type || !chat?.id) return;

  if (S.isTyping) {
    S.isTyping = false;
    await setMyTyping(false);
  }

  clearChatListeners();
  S.active = { type: chat.type, id: chat.id, name: chat.name || "Chat", members: chat.members || [] };
  clear(S.ui.messages);

  // reset seen msg keys for this scope
  const sk = scopeKey(chat.type, chat.id);
  if (!S._seenMsgKeys[sk]) S._seenMsgKeys[sk] = new Set();

  if (chat.type === "dm") {
    await ensureDmChatRefExists(chat);
    await subscribeMessagesDm(chat.id);
    subscribeTyping("dm", chat.id);
  } else {
    const groupSnap = await get(ref(db, `groupDms/${chat.id}`));
    if (!groupSnap.exists()) {
      renderSystemMessage("This group no longer exists or you no longer have access.", true);
      return;
    }
    const g = groupSnap.val();
    const memberIds = Object.keys(g.memberIds || {}).filter(uid => g.memberIds[uid] === true);
    S.active.members = memberIds;
    S.active.name = g.name || chat.name || "Group DM";
    S.active.joinCode = g.code || "";
    S.active.ownerId = g.ownerId || g.createdBy || "";

    await upsertMyChatRef("group", chat.id, S.active.name, null, undefined, "Group DM", { preserveLastAt: true });
    await subscribeMessagesGroup(chat.id);
    subscribeTyping("group", chat.id);
  }

  if (S.ui.chatTitle) S.ui.chatTitle.textContent = S.active.name;
  if (S.ui.chatSub) {
    if (S.active.type === "group") {
      const names = await Promise.all(S.active.members.slice(0, 4).map(getAuthorDisplay));
      const extra = S.active.members.length > names.length ? ` +${S.active.members.length - names.length}` : "";
      const memberLine = names.length ? ` • Members: ${names.join(", ")}${extra}` : "";
      S.ui.chatSub.textContent = `Group DM • Join code: ${S.active.joinCode || "—"}${memberLine}`;
      S.ui.chatSub.classList.add("copyable");
    } else {
      S.ui.chatSub.textContent = "DM";
      S.ui.chatSub.classList.remove("copyable");
    }
  }

  await markActiveReadNow();
  renderChatList();
}

async function ensureDmChatRefExists(chat) {
  const parts = String(chat.id).split("_");
  const other = parts.find(p => p !== S.uid) || null;

  if (!other) return;
  await ensureDmRecordExists(chat.id);

  const pub = await get(ref(db, peoplePublicPath(other)));
  const friendDisplay = pub.exists() ? (pub.val()?.displayNameDisplay || "Friend") : "Friend";
  const friendPhoto = pub.exists() ? (pub.val()?.photoURL || null) : null;

  S.active.name = friendDisplay;

  if (S.ui.chatTitle) S.ui.chatTitle.textContent = friendDisplay;
  if (S.ui.chatSub) S.ui.chatSub.textContent = "DM";

  await upsertMyChatRef("dm", chat.id, friendDisplay, friendPhoto, undefined, "DM", { preserveLastAt: true });
}

async function ensureDmChatRefForIncoming(dmId, lastAt, content) {
  const parts = String(dmId).split("_");
  const other = parts.find((p) => p !== S.uid) || null;
  if (!other) return;
  await ensureDmRecordExists(dmId);
  const pub = await get(ref(db, peoplePublicPath(other)));
  const friendDisplay = pub.exists() ? (pub.val()?.displayNameDisplay || "Friend") : "Friend";
  const friendPhoto = pub.exists() ? (pub.val()?.photoURL || null) : null;
  await upsertMyChatRef("dm", dmId, friendDisplay, friendPhoto, lastAt, (content || "").slice(0, 90));
}

async function ensureGroupChatRefForIncoming(groupId, lastAt, content) {
  const gSnap = await get(ref(db, `groupDms/${groupId}`));
  const g = gSnap.exists() ? gSnap.val() : null;
  const name = g?.name || "Group DM";
  await upsertMyChatRef("group", groupId, name, null, lastAt, (content || "").slice(0, 90));
}

/* ---------------------------
   COMMANDS + REPORTS (simple)
---------------------------- */
async function postSystemToActive(text) {
  if (!S.active) return;
  const msgObj = { authorId: S.uid, content: `🧩 ${text}`, createdAt: nowMs() };
  try {
    if (S.active.type === "dm") await push(ref(db, `dmMessages/${S.active.id}`), msgObj);
    else await push(ref(db, `groupDmMessages/${S.active.id}`), msgObj);
  } catch {}
}

const handleCommand = createCommandHandler({
  postSystem: postSystemToActive,
  getActive: () => S.active,
  hideChatRef,
  unhideChatRef,
  leaveGroup,
  openReportModal,
  showToast,
  clearActiveChat
});

const {
  renderSystemMessage,
  clearChatListeners,
  onComposerKeyDown,
  onComposerInput,
  onSendClicked,
  renderHomePanel,
  subscribeTyping,
  setMyTyping,
  subscribeMessagesDm,
  subscribeMessagesGroup,
  ensureDmRecordExists
} = initMessaging({
  APP_NAME,
  BRAND_LINK,
  MAX_MESSAGE_CHARS,
  SEND_COOLDOWN_MS,
  LOAD_LAST_N,
  STATIC_EMOJI_URL,
  SHORTCODES,
  MESSAGE_DING_URL,
  REACTION_EMOJIS,
  QUICK_REACTION,
  S,
  db,
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,
  onChildAdded,
  off,
  query,
  orderByChild,
  limitToLast,
  nowMs,
  escapeHtml,
  el,
  formatTime,
  showToast,
  handleCommand,
  logFirebaseError,
  updatePeoplePrivate,
  incrementStatCounter,
  logStatEvent,
  replaceShortcodesInInput,
  openChat,
  updateMyChatRef,
  ensureDmChatRefForIncoming,
  ensureGroupChatRefForIncoming,
  refreshChats,
  updateUnreadCounts,
  markActiveReadNow,
  getAuthorDisplay,
  scopeKey,
  safeGet,
  upsertMyChatRef,
  openFriendsModal,
  openSettingsModal,
  clear
});

async function openReportModal(prefillReason = "") {
  if (!S.active) return;

  const m = modalBase("Report");
  const hint = el("div", { class: "hint" }, ["Send a report to admins. Include what happened."]);

  const reason = el("textarea", { class: "textarea", placeholder: "Reason...", style: "max-height: 200px;" });
  reason.value = prefillReason || "";

  const details = el("textarea", { class: "textarea", placeholder: "Extra details (optional)...", style: "max-height: 200px;" });

  const send = el("button", { class: "btn btnPrimary" }, ["Send Report"]);
  const cancel = el("button", { class: "btn" }, ["Cancel"]);

  send.addEventListener("click", async () => {
    send.disabled = true;
    send.textContent = "Sending...";
    try {
      const category = categorySelect.value || "general";
      const payload = {
        createdBy: S.uid,
        createdAt: nowMs(),
        type: "chat",
        details: JSON.stringify({
          category,
          reason: reason.value.slice(0, 1500),
          extra: details.value.slice(0, 4000),
          chatType: S.active.type,
          chatId: S.active.id,
          reporterDisplay: S.profile?.displayNameDisplay || "User"
        }).slice(0, 7800)
      };
      const repRef = push(ref(db, "reports"));
      await set(repRef, payload);
      await logStatEvent(S.uid, "report-sent", { scope: payload.scope || "general" });
      showToast("Report sent.", "ok");
      m.close();
    } catch (e) {
      logFirebaseError("send-report", e);
      send.disabled = false;
      send.textContent = "Send Report";
    }
  });

  cancel.addEventListener("click", () => m.close());

  m.body.appendChild(hint);
  m.body.appendChild(el("div", { class: "hr" }));
  const categorySelect = el("select", { class: "input" }, [
    el("option", { value: "general", text: "General" }),
    el("option", { value: "harassment", text: "Harassment" }),
    el("option", { value: "spam", text: "Spam" }),
    el("option", { value: "safety", text: "Safety" }),
    el("option", { value: "other", text: "Other" })
  ]);
  m.body.appendChild(el("div", { class: "hint", text: "Category" }));
  m.body.appendChild(categorySelect);
  m.body.appendChild(el("div", { class: "hint", text: "Reason" }));
  m.body.appendChild(reason);
  m.body.appendChild(el("div", { class: "hint", text: "Extra" }));
  m.body.appendChild(details);
  m.footer.appendChild(el("div", { class: "row" }, [cancel, send]));
}

/* ---------------------------
   MODALS
---------------------------- */
function openAddFriendModal() {
  const m = modalBase("Add Friend");

  const hint = el("div", { class: "hint" }, [
    "Enter your friend's display name to send a request.",
    el("br"),
    "Display names are unique and have no spaces."
  ]);

  const input = el("input", { class: "input", placeholder: "Display name...", autocomplete: "off" });
  const err = el("div", { class: "hint" });

  const sendBtn = el("button", { class: "btn btnPrimary" }, ["Send Request"]);
  const cancelBtn = el("button", { class: "btn" }, ["Cancel"]);

  async function sendRequest() {
    err.textContent = "";
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";
    try {
      await sendFriendRequestByDisplayOrEmail(input.value);
      m.close();
    } catch (e) {
      err.textContent = e?.message || "Failed to send request.";
      logFirebaseError("send-friend-request", e);
      sendBtn.disabled = false;
      sendBtn.textContent = "Send Request";
    }
  }

  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") sendRequest();
  });

  sendBtn.addEventListener("click", sendRequest);
  cancelBtn.addEventListener("click", () => m.close());

  m.body.appendChild(hint);
  m.body.appendChild(input);
  m.body.appendChild(err);
  m.footer.appendChild(el("div", { class: "row" }, [cancelBtn, sendBtn]));
}

function openNewChatModal() {
  const m = modalBase("New Chat");

  const friends = Object.values(S.friends || {});
  const hasFriends = friends.length > 0;

  const dmSection = el("div", { class: "hint" }, [
    el("div", { text: "Start a DM" }),
    el("div", { class: "small", text: hasFriends ? "Tap a friend to open or create a DM." : "No friends yet. Add one first." })
  ]);

  const dmList = el("div", { style: "display:flex; flex-direction:column; gap:8px;" });
  if (hasFriends) {
    friends
      .sort((a, b) => String(a.displayNameDisplay || "").localeCompare(String(b.displayNameDisplay || "")))
      .forEach((friend) => {
        const item = el("button", { class: "btn", style: "display:flex; justify-content:space-between; align-items:center;" }, [
          el("span", { text: friend.displayNameDisplay || "Friend" }),
          el("span", { class: "small", text: "Open" })
        ]);
        item.addEventListener("click", async () => {
          const dmId = deterministicDmId(S.uid, friend.uid);
          await upsertMyChatRef("dm", dmId, friend.displayNameDisplay || "Friend", friend.photoURL || null, undefined, "DM", { preserveLastAt: true });
          m.close();
          await refreshChats();
          await openChat({ type: "dm", id: dmId, name: friend.displayNameDisplay || "Friend", photoURL: friend.photoURL || null });
        });
        dmList.appendChild(item);
      });
  }

  const groupTitle = el("div", { class: "hint", text: "Create Group DM" });
  const groupName = el("input", { class: "input", placeholder: "Group name..." });
  const createBtn = el("button", { class: "btn btnPrimary" }, ["Create Group DM"]);

  const memberWrap = el("div", { style: "display:flex; flex-direction:column; gap:8px; max-height: 180px; overflow:auto;" });
  const preInviteTitle = el("div", { class: "hint", text: "Pre-invite" });
  const preInviteList = el("div", { class: "small", text: "No pre-invites selected." });
  const memberChecks = new Map();
  if (hasFriends) {
    friends.forEach((friend) => {
      const row = el("label", { style: "display:flex; align-items:center; gap:8px;" }, [
        el("input", { type: "checkbox" }),
        el("span", { text: friend.displayNameDisplay || "Friend" })
      ]);
      const checkbox = row.querySelector("input");
      memberChecks.set(friend.uid, checkbox);
      checkbox.addEventListener("change", () => updatePreInviteList());
      memberWrap.appendChild(row);
    });
  } else {
    memberWrap.appendChild(el("div", { class: "small", text: "Add friends to invite them to a group." }));
  }

  const createErr = el("div", { class: "hint" });

  createBtn.addEventListener("click", async () => {
    createErr.textContent = "";
    createBtn.disabled = true;
    createBtn.textContent = "Creating...";
    try {
      const members = [];
      for (const [uid, checkbox] of memberChecks.entries()) {
        if (checkbox.checked) members.push(uid);
      }
      const created = await createGroupDm(groupName.value, members);
      showToast(`Group created. Join code: ${created.code}`, "ok");
      m.close();
      await refreshChats();
      await openChat({ type: "group", id: created.groupId, name: created.name, members: Object.keys(created.memberIds) });
    } catch (e) {
      createErr.textContent = e?.message || "Failed to create group.";
      createBtn.disabled = false;
      createBtn.textContent = "Create Group";
    }
  });

  const joinTitle = el("div", { class: "hint", text: "Join Group by Code" });
  const joinRow = el("div", { style: "display:flex; gap:8px; align-items:center;" });
  const joinInput = el("input", { class: "input", placeholder: "6-digit code..." });
  const joinBtn = el("button", { class: "btn" }, ["Join by Code"]);
  const joinErr = el("div", { class: "hint" });

  joinBtn.addEventListener("click", async () => {
    joinErr.textContent = "";
    joinBtn.disabled = true;
    joinBtn.textContent = "Joining...";
    try {
      const joined = await joinGroupByCode(joinInput.value);
      showToast("Joined group.", "ok");
      m.close();
      await refreshChats();
      await openChat({ type: "group", id: joined.groupId, name: joined.name });
    } catch (e) {
      joinErr.textContent = e?.message || "Failed to join group.";
      joinBtn.disabled = false;
      joinBtn.textContent = "Join by Code";
    }
  });

  const cancelBtn = el("button", { class: "btn" }, ["Close"]);
  cancelBtn.addEventListener("click", () => m.close());

  m.body.appendChild(dmSection);
  m.body.appendChild(dmList);
  m.body.appendChild(el("div", { class: "hr" }));
  function updatePreInviteList() {
    const names = [];
    for (const [uid, checkbox] of memberChecks.entries()) {
      if (!checkbox.checked) continue;
      const friend = friends.find((f) => f.uid === uid);
      if (friend) names.push(friend.displayNameDisplay || "Friend");
    }
    preInviteList.textContent = names.length ? names.join(", ") : "No pre-invites selected.";
  }
  updatePreInviteList();

  m.body.appendChild(groupTitle);
  m.body.appendChild(el("div", { style: "display:flex; gap:8px; align-items:center;" }, [groupName, createBtn]));
  m.body.appendChild(preInviteTitle);
  m.body.appendChild(preInviteList);
  m.body.appendChild(memberWrap);
  m.body.appendChild(createErr);
  m.body.appendChild(el("div", { class: "hr" }));
  m.body.appendChild(joinTitle);
  joinRow.appendChild(joinInput);
  joinRow.appendChild(joinBtn);
  m.body.appendChild(joinRow);
  m.body.appendChild(joinErr);
  m.footer.appendChild(el("div", { class: "row" }, [cancelBtn]));
}

function openEmojiModal() {
  const m = modalBase("Emoji Picker");
  m.modal.classList.add("emojiModal");
  const grid = el("div", { class: "emojiGrid" });

  const staticBtn = el("button", { class: "emojiBtn", title: "Static :static:" }, [
    el("img", { src: STATIC_EMOJI_URL, alt: ":static:", style: "width:24px;height:24px;border-radius:8px;" })
  ]);
  staticBtn.addEventListener("click", () => {
    insertAtCursor(S.ui?.msgBox, ":static:");
    onComposerInput();
  });
  grid.appendChild(staticBtn);

  EMOJI_LIST.forEach((emoji) => {
    const name = EMOJI_NAMES[emoji] || "Emoji";
    const shortcodes = SHORTCODE_LOOKUP[emoji] || [];
    const tooltip = shortcodes.length ? `${name} ${shortcodes.join(" or ")}` : name;
    const btn = el("button", { class: "emojiBtn", title: tooltip }, [emoji]);
    btn.addEventListener("click", () => {
      insertAtCursor(S.ui?.msgBox, emoji);
      onComposerInput();
    });
    grid.appendChild(btn);
  });

  const hint = el("div", { class: "hint", text: "Click an emoji to insert it into your message. Shortcodes like :static: and :skull: auto-convert when you type a space." });
  const closeBtn = el("button", { class: "btn" }, ["Close"]);
  closeBtn.addEventListener("click", () => m.close());

  m.body.appendChild(hint);
  m.body.appendChild(grid);
  m.footer.appendChild(el("div", { class: "row" }, [closeBtn]));
}

async function openGroupInfoModal() {
  if (!S.active || S.active.type !== "group") {
    showToast("Open a group chat first.", "warn");
    return;
  }

  const groupSnap = await get(ref(db, `groupDms/${S.active.id}`));
  if (!groupSnap.exists()) {
    showToast("Group info unavailable.", "error");
    return;
  }
  const g = groupSnap.val() || {};

  const m = modalBase("Group Info");
  const joinRow = el("div", { class: "row", style: "justify-content:space-between;" }, [
    el("div", { class: "hint", text: `Join code: ${g.code || "—"}` }),
    el("button", { class: "btn" }, ["Copy"])
  ]);
  joinRow.querySelector("button").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(String(g.code || ""));
      showToast("Join code copied.", "ok");
    } catch {
      showToast("Copy failed.", "error");
    }
  });

  const membersWrap = el("div", { style: "display:flex; flex-direction:column; gap:8px;" });
  const memberIds = Object.keys(g.memberIds || {}).filter((uid) => g.memberIds[uid] === true);
  const isOwner = g.ownerId === S.uid;

  for (const uid of memberIds) {
    const name = await getAuthorDisplay(uid);
    const row = el("div", { style: "display:flex; align-items:center; justify-content:space-between; gap:8px;" }, [
      el("span", { text: uid === g.ownerId ? `${name} (owner)` : name }),
      isOwner && uid !== g.ownerId
        ? el("button", { class: "btn" }, ["Kick"])
        : el("span", { class: "small", text: uid === g.ownerId ? "Owner" : "" })
    ]);
    const kickBtn = row.querySelector("button");
    if (kickBtn) {
      kickBtn.addEventListener("click", async () => {
        await kickGroupMember(S.active.id, uid);
        row.remove();
      });
    }
    membersWrap.appendChild(row);
  }

  const closeBtn = el("button", { class: "btn" }, ["Close"]);
  closeBtn.addEventListener("click", () => m.close());

  m.body.appendChild(el("div", { class: "hint", text: g.name || "Group DM" }));
  m.body.appendChild(joinRow);
  m.body.appendChild(el("div", { class: "hr" }));
  m.body.appendChild(el("div", { class: "hint", text: "Members" }));
  m.body.appendChild(membersWrap);
  m.footer.appendChild(el("div", { class: "row" }, [closeBtn]));
}

function openThemeModal() {
  const m = modalBase("Theme");
  const hint = el("div", { class: "hint", text: "Choose a theme. It syncs to your profile." });

  const row = el("div", { style: "display:flex; gap:10px; flex-wrap:wrap;" });
  THEMES.forEach((theme) => {
    const btn = el("button", { class: "btn" }, [theme]);
    if (theme === S.theme) btn.classList.add("btnPrimary");
    btn.addEventListener("click", async () => {
      applyTheme(theme);
      await saveThemeToCloud(theme);
      showToast(`Theme set to ${theme}.`, "ok");
      m.close();
    });
    row.appendChild(btn);
  });

  const closeBtn = el("button", { class: "btn" }, ["Close"]);
  closeBtn.addEventListener("click", () => m.close());

  m.body.appendChild(hint);
  m.body.appendChild(row);
  m.footer.appendChild(el("div", { class: "row" }, [closeBtn]));
}

function openSettingsModal() {
  const m = modalBase("Settings");

  const profileRow = el("div", { class: "hint" }, [
    `Signed in as ${S.profile?.displayNameDisplay || "User"}.`,
    el("br"),
    "Use the buttons below to manage your account or chats."
  ]);

  const nameBtn = el("button", { class: "btn" }, [`Change Display Name (${S.profile?.displayNameDisplay || "User"})`]);
  nameBtn.addEventListener("click", () => {
    m.close();
    openDisplayNameModal(S.user);
  });

  const signOutBtn = el("button", { class: "btn btnDanger" }, ["Sign Out"]);
  signOutBtn.addEventListener("click", async () => {
    signOutBtn.disabled = true;
    signOutBtn.textContent = "Signing out...";
    try {
      await signOut(auth);
      m.close();
    } catch {
      signOutBtn.disabled = false;
      signOutBtn.textContent = "Sign Out";
      showToast("Sign out failed.", "error");
    }
  });

  const avatarRow = el("label", { style: "display:flex; align-items:center; gap:8px;" }, [
    el("input", { type: "checkbox" }),
    el("span", { text: "Use Google profile photo as avatar (recommended)" })
  ]);
  const avatarToggle = avatarRow.querySelector("input");
  avatarToggle.checked = S.profile?.settings?.useGoogleAvatar !== false;
  avatarToggle.addEventListener("change", async () => {
    await updatePeoplePrivate(S.uid, { settings: { ...S.profile?.settings, useGoogleAvatar: avatarToggle.checked } });
    await update(ref(db, `users/${S.uid}/settings`), { useGoogleAvatar: avatarToggle.checked }).catch(() => {});
    showToast("Avatar setting updated.", "ok");
    await refreshChats();
  });

  const hiddenTitle = el("div", { class: "hint", text: "Hidden Chats" });
  const hiddenWrap = el("div", { style: "display:flex; flex-direction:column; gap:8px;" });
  const hidden = (S.chats || []).filter(c => c.hidden);
  if (!hidden.length) {
    hiddenWrap.appendChild(el("div", { class: "small", text: "No hidden chats." }));
  } else {
    hidden.forEach((chat) => {
      const row = el("div", { style: "display:flex; gap:8px; align-items:center; justify-content:space-between;" }, [
        el("span", { text: chat.name || "Chat" }),
        el("button", { class: "btn" }, ["Unhide"])
      ]);
      row.querySelector("button").addEventListener("click", async () => {
        await unhideChatRef(chat.type, chat.id);
        showToast("Chat unhidden.", "ok");
        await refreshChats();
        row.remove();
      });
      hiddenWrap.appendChild(row);
    });
  }

  const closeBtn = el("button", { class: "btn" }, ["Close"]);
  closeBtn.addEventListener("click", () => m.close());

  m.body.appendChild(profileRow);
  m.body.appendChild(el("div", { class: "hr" }));
  m.body.appendChild(nameBtn);
  m.body.appendChild(avatarRow);
  m.body.appendChild(notifyRow);
  m.body.appendChild(soundRow);
  m.body.appendChild(switchBtn);
  m.body.appendChild(signOutBtn);
  m.body.appendChild(el("div", { class: "hr" }));

  const blockedTitle = el("div", { class: "hint", text: "Blocked Users" });
  const blockedWrap = el("div", { style: "display:flex; flex-direction:column; gap:8px;" });
  const blocked = S.profile?.blocks ? Object.entries(S.profile.blocks) : [];
  if (!blocked.length) {
    blockedWrap.appendChild(el("div", { class: "small", text: "No blocked users." }));
  } else {
    blocked.forEach(([uid]) => {
      const row = el("div", { style: "display:flex; gap:8px; align-items:center; justify-content:space-between;" }, [
        el("span", { text: S._nameCache[uid] || uid }),
        el("button", { class: "btn" }, ["Unblock"])
      ]);
      row.querySelector("button").addEventListener("click", async () => {
        await removePeoplePrivate(S.uid, `blocks/${uid}`);
        await logStatEvent(S.uid, "user-unblocked", { targetUid: uid });
        showToast("User unblocked.", "ok");
        row.remove();
      });
      blockedWrap.appendChild(row);
    });
  }
  if (!hidden.length && !blocked.length) {
    const combined = el("div", { style: "display:flex; gap:12px; flex-wrap:wrap;" }, [
      el("div", { style: "flex:1; min-width:220px;" }, [hiddenTitle, hiddenWrap]),
      el("div", { style: "flex:1; min-width:220px;" }, [blockedTitle, blockedWrap])
    ]);
    m.body.appendChild(el("div", { class: "hr" }));
    m.body.appendChild(combined);
  } else {
    m.body.appendChild(el("div", { class: "hr" }));
    m.body.appendChild(hiddenTitle);
    m.body.appendChild(hiddenWrap);
    m.body.appendChild(el("div", { class: "hr" }));
    m.body.appendChild(blockedTitle);
    m.body.appendChild(blockedWrap);
  }
  m.footer.appendChild(el("div", { class: "row" }, [closeBtn]));
}

function openFriendsModal() {
  const m = modalBase("Friends");
  const hint = el("div", { class: "hint" }, ["View your friends and jump into a DM."]);

  const onlineTitle = el("div", { class: "sectionTitle", text: "Online Friends" });
  const onlineList = el("div", { class: "userList" });

  const allTitle = el("div", { class: "sectionTitle", text: "All Friends" });
  const allList = el("div", { class: "userList" });

  const closeBtn = el("button", { class: "btn" }, ["Close"]);
  closeBtn.addEventListener("click", () => m.close());

  m.body.appendChild(hint);
  m.body.appendChild(onlineTitle);
  m.body.appendChild(onlineList);
  m.body.appendChild(allTitle);
  m.body.appendChild(allList);
  m.footer.appendChild(el("div", { class: "row" }, [closeBtn]));

  S.ui.friendsModal = m;
  S.ui.friendsModalLists = { onlineList, allList };
  renderFriendsModalLists();

  const prevClose = m.close;
  m.close = () => {
    S.ui.friendsModalLists = null;
    S.ui.friendsModal = null;
    prevClose();
  };
}

function svgPalette() { return el("span", { html: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3a9 9 0 0 0 0 18h1a3 3 0 0 0 0-6h-1a3 3 0 0 1 0-6h1a3 3 0 0 0 0-6h-1Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.5 10.5h.01M9 7.8h.01M15 7.8h.01M16.5 10.5h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` }); }
function svgGear() { return el("span", { html: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a8.2 8.2 0 0 0 .1-1l2-1.2-2-3.5-2.3.6a7.7 7.7 0 0 0-1.7-1l-.3-2.4h-4l-.3 2.4a7.7 7.7 0 0 0-1.7 1l-2.3-.6-2 3.5 2 1.2a8.2 8.2 0 0 0 0 2l-2 1.2 2 3.5 2.3-.6a7.7 7.7 0 0 0 1.7 1l.3 2.4h4l.3-2.4a7.7 7.7 0 0 0 1.7-1l2.3.6 2-3.5-2-1.2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` }); }
function svgUsers() { return el("span", { html: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 19a4 4 0 0 0-8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" stroke-width="2"/><path d="M22 19a4 4 0 0 0-6-3.46" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18 11a3 3 0 1 0 0-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` }); }
function svgPlus() { return el("span", { html: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` }); }
function svgUserPlus() { return el("span", { html: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 19a4 4 0 0 0-8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M11 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" stroke-width="2"/>
<path d="M19 8v6M16 11h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` }); }

/* ---------------------------
   REFRESH (friends/requests/chats) + AUTH BOOT
---------------------------- */
async function refreshFriendsAndRequests() {
  const uSnap = await safeGet(ref(db, `${peoplePrivatePath(S.uid)}`));
  if (!uSnap?.exists?.()) {
    const legacy = await safeGet(ref(db, `users/${S.uid}`));
    if (!legacy?.exists?.()) return;
    S.profile = legacy.val() || {};
  } else {
    S.profile = uSnap.val() || {};
  }

  if (S.ui?.meName) S.ui.meName.textContent = S.profile?.displayNameDisplay || "User";

  const reqIn = S.profile.friendRequestsIn || {};
  const friends = S.profile.friends || {};
  const reqOut = S.profile.friendRequestsOut || {};
  S.friendRequestsIn = reqIn;
  S.friends = friends;
  S.friendRequestsOut = reqOut;

  syncFriendProfiles().catch(() => {});
  renderFriendRequests();
  renderOutgoingRequests();
  renderFriendsModalLists();
  await pruneOutgoingRequests().catch(() => {});
}

async function syncFriendProfiles() {
  const reqs = Object.values(S.friendRequestsIn || {});
  const friends = Object.values(S.friends || {});

  for (const req of reqs) {
    if (!req?.fromUid) continue;
    const snap = await get(ref(db, peoplePublicPath(req.fromUid)));
    if (snap.exists()) {
      const u = snap.val() || {};
      req.fromDisplay = u.displayNameDisplay || req.fromDisplay;
      req.fromPhoto = u.photoURL || req.fromPhoto || null;
    }
  }

  for (const friend of friends) {
    if (!friend?.uid) continue;
    const snap = await get(ref(db, peoplePublicPath(friend.uid)));
    if (snap.exists()) {
      const u = snap.val() || {};
      friend.displayNameDisplay = u.displayNameDisplay || friend.displayNameDisplay;
      friend.photoURL = u.photoURL || friend.photoURL;
    }
  }
}

function hydrateChatRefs(refsObj = {}) {
  const out = [];
  for (const v of Object.values(refsObj)) {
    if (!v) continue;
    const key = scopeKey(v.type, v.id);
    const st = S.chatState?.[key] || {};
    out.push({
      type: v.type,
      id: v.id,
      name: v.name || "Chat",
      sub: v.sub || "",
      photoURL: v.photoURL || null,
      lastAt: v.lastAt || 0,
      hidden: !!v.hidden,
      unread: st.unread || 0
    });
  }
  S.chats = out;
  renderChatList();
}

async function refreshChats() {
  let snap = await safeGet(ref(db, `${peoplePrivatePath(S.uid)}/chatRefs`));
  let refsObj = snap?.exists?.() ? (snap.val() || {}) : {};
  if (!snap?.exists?.() || Object.keys(refsObj).length === 0) {
    const legacy = await safeGet(ref(db, `users/${S.uid}/chatRefs`));
    const legacyRefs = legacy?.exists?.() ? (legacy.val() || {}) : {};
    if (!snap?.exists?.() || Object.keys(refsObj).length === 0) {
      refsObj = Object.keys(legacyRefs).length ? legacyRefs : refsObj;
    }
  }
  hydrateChatRefs(refsObj);
  if (!S.active && S.chats.length === 0) {
    renderHomePanel();
  } else if (!S.active && S.chats.length > 0 && !S.autoOpenInProgress) {
    const next = [...S.chats].sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0))[0];
    if (next) {
      S.autoOpenInProgress = true;
      await openChat(next).catch(() => {});
      S.autoOpenInProgress = false;
    }
  }
}

async function refreshAll() {
  if (!S.uid) return;
  await loadMyChatState();
  await refreshFriendsAndRequests();
  await refreshChats();
  await pruneOutgoingRequests().catch(() => {});
  await updateUnreadCounts().catch(() => {});
}

function subscribeUserData() {
  if (S.userDataUnsub) { try { S.userDataUnsub(); } catch {} }
  const userRef = ref(db, peoplePrivatePath(S.uid));
  const handler = onValue(userRef, (snap) => {
    if (snap.exists()) {
      const u = snap.val() || {};
      S.profile = u;
      if (S.ui?.meName) S.ui.meName.textContent = S.profile?.displayNameDisplay || "User";
      S.friendRequestsIn = u.friendRequestsIn || {};
      S.friendRequestsOut = u.friendRequestsOut || {};
      S.friends = u.friends || {};
      if (u.chatState) S.chatState = u.chatState;
      syncFriendProfiles().catch(() => {});
      renderFriendRequests();
      renderOutgoingRequests();
      renderFriendsModalLists();
      return;
    }
    get(ref(db, `users/${S.uid}`)).then((legacy) => {
      if (!legacy.exists()) return;
      const u = legacy.val() || {};
      S.profile = u;
      if (S.ui?.meName) S.ui.meName.textContent = S.profile?.displayNameDisplay || "User";
      S.friendRequestsIn = u.friendRequestsIn || {};
      S.friendRequestsOut = u.friendRequestsOut || {};
      S.friends = u.friends || {};
      if (u.chatState) S.chatState = u.chatState;
      syncFriendProfiles().catch(() => {});
      renderFriendRequests();
      renderOutgoingRequests();
      renderFriendsModalLists();
    }).catch(() => {});
  }, () => {
    const legacyRef = ref(db, `users/${S.uid}`);
    const legacyHandler = onValue(legacyRef, (legacySnap) => {
      if (!legacySnap.exists()) return;
      const u = legacySnap.val() || {};
      S.profile = u;
      if (S.ui?.meName) S.ui.meName.textContent = S.profile?.displayNameDisplay || "User";
      S.friendRequestsIn = u.friendRequestsIn || {};
      S.friendRequestsOut = u.friendRequestsOut || {};
      S.friends = u.friends || {};
      if (u.chatState) S.chatState = u.chatState;
      syncFriendProfiles().catch(() => {});
      renderFriendRequests();
      renderOutgoingRequests();
      renderFriendsModalLists();
    });
    S.userDataUnsub = () => off(legacyRef, "value", legacyHandler);
  });
  S.userDataUnsub = () => off(userRef, "value", handler);
}

function subscribeChatRefs() {
  if (S.chatRefsUnsub) { try { S.chatRefsUnsub(); } catch {} }
  const refPath = ref(db, `${peoplePrivatePath(S.uid)}/chatRefs`);
  const handler = onValue(refPath, (snap) => {
    const refsObj = snap.exists() ? (snap.val() || {}) : {};
    if (snap.exists() && Object.keys(refsObj).length > 0) {
      hydrateChatRefs(refsObj);
    } else {
      get(ref(db, `users/${S.uid}/chatRefs`)).then((legacy) => {
        const legacyRefs = legacy.exists() ? (legacy.val() || {}) : {};
        if (Object.keys(legacyRefs).length > 0) {
          hydrateChatRefs(legacyRefs);
        } else {
          hydrateChatRefs(refsObj);
        }
      }).catch(() => {});
    }
  }, () => {
    const legacyRef = ref(db, `users/${S.uid}/chatRefs`);
    const legacyHandler = onValue(legacyRef, (legacySnap) => {
      const legacyRefs = legacySnap.exists() ? (legacySnap.val() || {}) : {};
      hydrateChatRefs(legacyRefs);
    });
    S.chatRefsUnsub = () => off(legacyRef, "value", legacyHandler);
  });
  S.chatRefsUnsub = () => off(refPath, "value", handler);
}

function subscribeMyDms() {
  if (S.dmListUnsub) { try { S.dmListUnsub(); } catch {} }
  const dmRef = ref(db, "dms");
  const dmQuery = query(dmRef, orderByChild(`memberIds/${S.uid}`), equalTo(true));
  const handler = onChildAdded(dmQuery, (snap) => {
    const dmId = snap.key;
    if (!dmId) return;
    subscribeDmPreview(dmId);
  });
  S.dmListUnsub = () => off(dmQuery, "child_added", handler);
}

function subscribeDmPreview(dmId) {
  if (S.dmPreviewUnsubs[dmId]) return;
  const msgRef = ref(db, `dmMessages/${dmId}`);
  const msgQuery = query(msgRef, orderByChild("createdAt"), limitToLast(1));
  const handler = onChildAdded(msgQuery, async (snap) => {
    const v = snap.val();
    if (!v) return;
    await ensureDmChatRefForIncoming(dmId, v.createdAt || nowMs(), v.content || "");
    const hadChat = (S.chats || []).some((c) => c.type === "dm" && c.id === dmId);
    if (!hadChat && v.authorId && v.authorId !== S.uid) {
      await refreshChats();
      const authorDisplay = await getAuthorDisplay(v.authorId);
      await openChat({ type: "dm", id: dmId, name: authorDisplay });
    }
    const otherUid = getOtherUidFromChat({ type: "dm", id: dmId });
    if (otherUid && otherUid !== S.uid) {
      const pub = S.publicUsers?.[otherUid];
      await ensureFriendshipFromOutgoing(otherUid, pub?.displayNameDisplay, pub?.photoURL);
    }
  });
  S.dmPreviewUnsubs[dmId] = () => off(msgQuery, "child_added", handler);
}

function subscribePublicUsers() {
  if (S.publicUsersUnsub) { try { S.publicUsersUnsub(); } catch {} }
  const refPath = ref(db, PEOPLE_ROOT);
  const handler = onValue(refPath, (snap) => {
    const raw = snap.exists() ? (snap.val() || {}) : {};
    const map = {};
    for (const [uid, node] of Object.entries(raw)) {
      if (node?.public) map[uid] = node.public;
    }
    if (Object.keys(map).length) {
      S.publicUsers = map;
    } else {
      S.publicUsers = {};
      get(ref(db, "publicUsers")).then((legacy) => {
        if (legacy.exists()) S.publicUsers = legacy.val() || {};
        renderFriendsModalLists();
        renderChatList();
      }).catch(() => {});
    }
    renderFriendsModalLists();
    renderChatList();
  }, () => {
    get(ref(db, "publicUsers")).then((legacy) => {
      S.publicUsers = legacy.exists() ? (legacy.val() || {}) : {};
      renderFriendsModalLists();
      renderChatList();
    }).catch(() => {});
  });
  S.publicUsersUnsub = () => off(refPath, "value", handler);
}

function renderFriendsModalLists() {
  if (!S.ui.friendsModalLists) return;
  const { onlineList, allList } = S.ui.friendsModalLists;
  clear(onlineList);
  clear(allList);

  const entries = Object.values(S.friends || {}).map((friend) => {
    const uid = friend.uid;
    const pub = S.publicUsers?.[uid];
    return {
      uid,
      displayName: pub?.displayNameDisplay || friend.displayNameDisplay || "Friend",
      status: pub?.status || "offline",
      photoURL: pub?.photoURL || friend.photoURL || null
    };
  });

  const byName = (a, b) => String(a.displayName).localeCompare(String(b.displayName));

  const onlineEntries = entries
    .filter((u) => u.status === "online" || u.status === "idle")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "online" ? -1 : 1;
      return byName(a, b);
    });

  const allEntries = entries.slice().sort(byName);

  const buildRow = (u) => {
    const statusLabel =
      u.status === "online" ? "Online" :
      u.status === "idle" ? "Idle 🌙" :
      "Offline";
    const row = el("button", { class: "userRow", type: "button" }, [
      el("div", { class: "userInfo" }, [
        el("div", { class: "userName", text: u.displayName }),
        el("div", { class: "userUid", text: u.uid }),
        el("div", { class: "userStatus", text: statusLabel })
      ]),
      el("span", { class: `statusDot status-${u.status}`, title: statusLabel })
    ]);
    row.addEventListener("click", async () => {
      const dmId = deterministicDmId(S.uid, u.uid);
      await upsertMyChatRef("dm", dmId, u.displayName, u.photoURL, undefined, "DM", { preserveLastAt: true });
      if (S.ui.friendsModal?.close) S.ui.friendsModal.close();
      await refreshChats();
      await openChat({ type: "dm", id: dmId, name: u.displayName, photoURL: u.photoURL });
    });
    return row;
  };

  if (!onlineEntries.length) {
    onlineList.appendChild(el("div", { class: "small", text: "No friends online yet." }));
  } else {
    onlineEntries.forEach((u) => onlineList.appendChild(buildRow(u)));
  }

  if (!allEntries.length) {
    allList.appendChild(el("div", { class: "small", text: "No friends yet." }));
  } else {
    allEntries.forEach((u) => allList.appendChild(buildRow(u)));
  }
}

function renderChatList() {
  const list = S.ui.chatList;
  if (!list) return;
  clear(list);

  const filter = normalizeDisplayName(S.ui.searchChats.value || "");
  const visible = (S.chats || [])
    .filter(c => !(S.profile?.blocks && S.profile.blocks[getOtherUidFromChat(c)]))
    .filter(c => !c.hidden)
    .filter(c => !filter || normalizeDisplayName(c.name).includes(filter))
    .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));

  if (!visible.length) {
    list.appendChild(el("div", { class: "small", style: "padding: 0 12px 10px 12px;", text: "No chats yet. Add a friend or create a group." }));
    return;
  }

  for (const c of visible) {
    const active = S.active && S.active.type === c.type && S.active.id === c.id;
    const item = el("div", { class: `chatItem ${active ? "active" : ""}`, onclick: () => openChat(c) });
    item.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      openChatContextMenu(ev.clientX, ev.clientY, c);
    });

    const otherUid = c.type === "dm" ? getOtherUidFromChat(c) : null;
    const status = otherUid ? (S.publicUsers?.[otherUid]?.status || "offline") : null;

    const av = el("div", { class: "avatar" }, [
      el("img", { src: c.photoURL || avatarUrlFor({ displayNameDisplay: c.name }), alt: "" })
    ]);
    if (status) {
      av.appendChild(el("span", { class: `statusDot status-${status}` }));
    }

    const main = el("div", { class: "chatMain" }, [
      el("div", { class: "chatName", text: c.name }),
      el("div", { class: "chatPreview", text: c.sub || (c.type === "group" ? "Group DM" : "DM") }),
      status ? el("div", { class: "chatStatus", text: status === "idle" ? "Idle 🌙" : (status === "online" ? "Online" : "Offline") }) : null
    ]);

    const right = el("div", { class: "badgeRow" }, [
      c.unread > 0 ? el("div", { class: "badge", text: `+${c.unread}` }) : el("div", { style: "height:22px" }),
      el("div", { class: "timeMini", text: c.lastAt ? formatTime(c.lastAt) : "" })
    ]);

    item.appendChild(av);
    item.appendChild(main);
    item.appendChild(right);

    list.appendChild(item);
  }
}

function getOtherUidFromChat(chat) {
  if (!chat || chat.type !== "dm") return null;
  const parts = String(chat.id || "").split("_");
  return parts.find((p) => p && p !== S.uid) || null;
}

async function blockUser(uid) {
  if (!uid) return;
  await set(ref(db, `${peoplePrivatePath(S.uid)}/blocks/${uid}`), true).catch(() => {});
  await set(ref(db, `users/${S.uid}/blocks/${uid}`), true).catch(() => {});
  await incrementStatCounter(S.uid, "usersBlocked", 1);
  await logStatEvent(S.uid, "user-blocked", { targetUid: uid });
  await hideChatRef("dm", deterministicDmId(S.uid, uid)).catch(() => {});
  showToast("User blocked.", "ok");
  await refreshChats();
}

async function unfriendUser(uid) {
  if (!uid) return;
  await remove(ref(db, `${peoplePrivatePath(S.uid)}/friends/${uid}`)).catch(() => {});
  await remove(ref(db, `users/${S.uid}/friends/${uid}`)).catch(() => {});
  await logStatEvent(S.uid, "friend-removed", { targetUid: uid });
  await hideChatRef("dm", deterministicDmId(S.uid, uid)).catch(() => {});
  showToast("Friend removed.", "ok");
  await refreshChats();
}

function openChatContextMenu(x, y, chat) {
  const items = [];
  if (chat.type === "dm") {
    const otherUid = getOtherUidFromChat(chat);
    items.push({
      label: "Unfriend",
      danger: true,
      onClick: () => unfriendUser(otherUid)
    });
    items.push({
      label: "Block user",
      danger: true,
      onClick: () => blockUser(otherUid)
    });
  } else {
    items.push({
      label: "Group info",
      onClick: () => openGroupInfoModal()
    });
    items.push({
      label: "Leave group",
      danger: true,
      onClick: () => leaveGroup(chat.id)
    });
  }
  items.push({
    label: "Hide chat",
    onClick: () => hideChatRef(chat.type, chat.id)
  });
  items.push({
    label: "Report",
    onClick: () => openReportModal("Report reason...")
  });

  showContextMenu(x, y, items);
}

/* ---------------------------
   AUTH BOOTSTRAP
---------------------------- */
renderLoadingScreen();

async function handleRedirectResult() {
  try {
    await getRedirectResult(auth);
  } catch {
    showToast("Sign-in redirect failed. Try again.", "error");
  }
}

handleRedirectResult().catch(() => {});

async function handleSignedInUser(user) {
  if (!user) return;
  if (S.appReady && S.uid === user.uid) return;
  S.user = user;
  S.uid = user.uid;

  await ensureUserProfile(user);
  S.profile = await loadProfile(S.uid);
  S.isAdmin = await loadIsAdmin(S.uid);

  if (!S.profile?.displayNameDisplay) {
    applyTheme(getStoredTheme() || DEFAULT_THEME);
    renderShell();
    openDisplayNameModal(user);
    await refreshAll();
    S.appReady = true;
    return;
  }

  applyTheme(S.profile?.theme || getStoredTheme() || DEFAULT_THEME);
  renderShell();

  subscribeUserData();
  subscribeChatRefs();
  subscribePublicUsers();
  subscribeMyDms();
  await refreshAll();

  // Keep lastSeen updated sometimes
  setInterval(() => {
    if (!S.uid) return;
    setPresenceStatus(S.presenceStatus || "online", { updateLastSeen: true }).catch(() => {});
  }, 25000);

  startPresenceTracking();

  // when window returns focus, mark active as read
  window.addEventListener("focus", () => { markActiveReadNow().catch(() => {}); });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) markActiveReadNow().catch(() => {});
  });

  S.appReady = true;
}

onAuthStateChanged(auth, async (user) => {
  try {
    if (!user) {
      S.user = null;
      S.uid = null;
      S.profile = null;
      S.isAdmin = false;
      S.friendRequestsIn = {};
      S.friends = {};
      S.chats = [];
      S.active = null;
      S.chatState = {};
      S._nameCache = {};
      S._seenMsgKeys = {};
      S.sessionId = null;
      clearChatListeners();
      if (S.userDataUnsub) { try { S.userDataUnsub(); } catch {} S.userDataUnsub = null; }
      if (S.chatRefsUnsub) { try { S.chatRefsUnsub(); } catch {} S.chatRefsUnsub = null; }
      if (S.dmListUnsub) { try { S.dmListUnsub(); } catch {} S.dmListUnsub = null; }
      Object.values(S.dmPreviewUnsubs || {}).forEach((unsub) => { try { unsub(); } catch {} });
      S.dmPreviewUnsubs = {};
      S.appReady = false;
      applyTheme(getStoredTheme() || DEFAULT_THEME);
      renderSignedOut();
      return;
    }

    await handleSignedInUser(user);
  } catch {
    showToast("App init failed.", "error");
    renderSignedOut();
  }
});
  const switchBtn = el("button", { class: "btn" }, ["Switch Account"]);
  switchBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      openSignInModal();
    } catch (e) {
      logFirebaseError("switch-account", e);
    }
  });

  const notifyRow = el("label", { style: "display:flex; align-items:center; gap:8px;" }, [
    el("input", { type: "checkbox" }),
    el("span", { text: "Enable in-app notifications" })
  ]);
  const notifyToggle = notifyRow.querySelector("input");
  notifyToggle.checked = S.profile?.settings?.notifications !== false;
  notifyToggle.addEventListener("change", async () => {
    await updatePeoplePrivate(S.uid, { settings: { ...S.profile?.settings, notifications: notifyToggle.checked } });
    await update(ref(db, `users/${S.uid}/settings`), { notifications: notifyToggle.checked }).catch((e) => logFirebaseError("update-notifications", e));
  });

  const soundRow = el("label", { style: "display:flex; align-items:center; gap:8px;" }, [
    el("input", { type: "checkbox" }),
    el("span", { text: "Play message sounds" })
  ]);
  const soundToggle = soundRow.querySelector("input");
  soundToggle.checked = S.profile?.settings?.messageSounds !== false;
  soundToggle.addEventListener("change", async () => {
    await updatePeoplePrivate(S.uid, { settings: { ...S.profile?.settings, messageSounds: soundToggle.checked } });
    await update(ref(db, `users/${S.uid}/settings`), { messageSounds: soundToggle.checked }).catch((e) => logFirebaseError("update-message-sounds", e));
  });
