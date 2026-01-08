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
  equalTo
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";
import NAME_BLOCKLIST from "./name-blocklist.js";
import { createCommandHandler } from "./commands.js";

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
   CSS injection (UI is fully in JS)
---------------------------- */
(function injectCss() {
  const css = `
  :root{
    --bg:#0c0f14;
    --panel:#121825;
    --panel2:#0f1520;
    --text:#e9eef9;
    --muted:#a8b1c7;
    --border: rgba(255,255,255,.10);
    --shadow: 0 12px 34px rgba(0,0,0,.35);
    --accent:#6aa7ff;
    --danger:#ff4d4d;
    --ok:#2fd18d;
    --warn:#ffcc66;
    --radius:16px;
  }

  body{ margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background:var(--bg); color:var(--text); }
  a{ color:var(--accent); text-decoration:none; }
  a:hover{ text-decoration:underline; }

  body.gui-hidden .appShell{ display:none !important; }
  body.gui-hidden #toastWrap{ display:none !important; }

  .authScreen{
    min-height: 100vh;
    display:flex;
    align-items:center;
    justify-content:center;
    padding: 24px;
  }
  .authCard{
    width: min(720px, 100%);
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 20px;
    box-shadow: var(--shadow);
    padding: 20px;
    display:flex;
    flex-direction:column;
    gap:16px;
    text-align:center;
  }
  .authCardGlow{
    position: relative;
    overflow: hidden;
  }
  .authCardGlow::before{
    content:"";
    position:absolute;
    inset:-120px -80px auto;
    height:240px;
    background: radial-gradient(circle, rgba(106,167,255,.2), transparent 60%);
    pointer-events:none;
  }
  .authBanner{
    width: 100%;
    border-radius: 18px;
    border: 1px solid var(--border);
    object-fit: cover;
    max-height: 220px;
  }
  .authBrand{
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:10px;
  }
  .authLogo{
    width: 72px;
    height: 72px;
    border-radius: 18px;
    border: 1px solid var(--border);
    background: rgba(255,255,255,.08);
  }
  .authTitle{
    font-weight: 950;
    font-size: 22px;
    letter-spacing: .2px;
  }
  .authSubtitle{
    color: var(--muted);
    font-size: 14px;
  }
  .googleBtn{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    border: 1px solid var(--border);
    background: rgba(255,255,255,.08);
    border-radius: 16px;
    padding: 0;
    cursor:pointer;
    box-shadow: 0 10px 20px rgba(0,0,0,.25);
    width: 100%;
    max-width: 320px;
    overflow: hidden;
  }
  .googleBtn:disabled{
    opacity: .6;
    cursor:not-allowed;
  }
  .googleBtn img{
    width: 100%;
    height: auto;
    display:block;
  }
  .authFooter{
    display:flex;
    align-items:center;
    justify-content:center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .adSlot{
    height: 90px;
    border-radius: 16px;
  }

  .appShell{
    display:grid;
    grid-template-columns: 340px 1fr;
    gap:12px;
    padding:12px;
    height: 100vh;
    box-sizing:border-box;
  }

  .panel{
    background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow:hidden;
  }

  .sidebar{ display:flex; flex-direction:column; min-width:0; }
  .chatPane{ display:flex; flex-direction:column; min-width:0; }

  .sideHeader{
    display:flex; justify-content:space-between; align-items:center;
    padding:12px; border-bottom: 1px solid var(--border);
    background: rgba(0,0,0,.12);
  }
  .brandTitle{ font-weight:950; font-size:16px; }
  .brandSub{ font-size:12px; color:var(--muted); }
  .sideTools{ display:flex; gap:8px; }

  .searchRow{ padding:10px 12px; border-bottom:1px solid var(--border); }
  .sectionTitle{ padding:10px 12px 6px 12px; font-size:12px; font-weight:800; letter-spacing:.4px; color:var(--muted); text-transform:uppercase; }
  .requestList{ padding:0 12px 10px 12px; display:flex; flex-direction:column; gap:8px; overflow:auto; max-height: 200px; }
  .chatList{ padding:0 12px 12px 12px; display:flex; flex-direction:column; gap:8px; overflow:auto; }
  .userList{ padding:0 12px 10px 12px; display:flex; flex-direction:column; gap:8px; overflow:auto; max-height: 170px; }

  .chatItem{
    display:flex; gap:10px; align-items:center;
    padding:10px;
    border:1px solid var(--border);
    border-radius:14px;
    background: rgba(0,0,0,.10);
    cursor:pointer;
    user-select:none;
    transition: transform .08s ease, background .12s ease;
  }
  .chatItem:hover{ background: rgba(255,255,255,.06); transform: translateY(-1px); }
  .chatItem.active{ outline: 2px solid rgba(106,167,255,.35); background: rgba(106,167,255,.10); }
  .avatar{ width:38px; height:38px; border-radius:14px; overflow:hidden; border:1px solid var(--border); flex: 0 0 auto; background: rgba(255,255,255,.06); position:relative; }
  .avatar img{ width:100%; height:100%; object-fit:cover; }
  .statusDot{
    position:absolute;
    right:-2px;
    bottom:-2px;
    width:12px;
    height:12px;
    border-radius:999px;
    border:2px solid var(--panel);
  }
  .userRow .statusDot{
    position: static;
    margin-left: 8px;
  }
  .status-online{ background:#2fd18d; }
  .status-idle{ background:#f6c453; }
  .status-offline{ background:#6c7387; }
  .chatMain{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
  .chatName{ font-weight:900; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .chatPreview{ font-size:12px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .chatStatus{ font-size:11px; color:var(--muted); }
  .badgeRow{ display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
  .badge{ background: rgba(255,77,77,.15); border:1px solid rgba(255,77,77,.35); color:#ffd7d7; padding:2px 8px; border-radius:999px; font-size:12px; font-weight:900; }
  .timeMini{ font-size:11px; color:var(--muted); }
  .userRow{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    padding:8px 10px;
    border:1px solid var(--border);
    border-radius:12px;
    background: rgba(0,0,0,.08);
    cursor:pointer;
    text-align:left;
  }
  .userInfo{ display:flex; flex-direction:column; gap:2px; min-width:0; }
  .userName{ font-weight:900; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .userUid{ font-size:11px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .userStatus{ font-size:11px; color:var(--muted); }

  .topBar{
    display:flex; justify-content:space-between; align-items:center;
    padding:12px; border-bottom: 1px solid var(--border);
    background: rgba(0,0,0,.12);
    gap:12px;
  }
  .topLeft{ min-width:0; }
  .topRight{ display:flex; align-items:center; gap:8px; flex:0 0 auto; }
  .chatTitle{ font-weight:950; font-size:16px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .chatSub{ font-size:12px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .copyable{ cursor:pointer; }

  .pill{
    display:flex; gap:8px; align-items:center;
    padding:6px 10px;
    border: 1px solid var(--border);
    border-radius:999px;
    background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
    font-size:12px;
    color:var(--muted);
    cursor:pointer;
  }
  .pill b{ color:var(--text); }

  .messages{
    flex:1;
    padding:12px;
    overflow:auto;
    display:flex;
    flex-direction:column;
    gap:10px;
    background: rgba(0,0,0,.06);
  }

  .msgRow{ display:flex; }
  .msgRow.me{ justify-content:flex-end; }
  .msgRow.system{ justify-content:center; }
  .msgBubble{
    max-width: min(720px, 92%);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding:10px 12px;
    background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.08));
    box-shadow: 0 10px 18px rgba(0,0,0,.2);
    transition: transform .12s ease, box-shadow .12s ease;
  }
  .msgBubble:hover{
    transform: translateY(-1px);
    box-shadow: 0 12px 22px rgba(0,0,0,.26);
  }
  .msgRow.me .msgBubble{
    background: rgba(106,167,255,.12);
    border-color: rgba(106,167,255,.28);
  }
  .msgRow.system .msgBubble{
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.14);
  }
  .msgContent{ line-height: 1.35; }
  .msgContent.emojiOnly{
    font-size: 32px;
    line-height: 1.1;
    letter-spacing: 1px;
  }
  .staticEmoji{
    width:20px;
    height:20px;
    vertical-align:-4px;
    border-radius:6px;
    border:1px solid var(--border);
    background:rgba(255,255,255,.06);
  }
  .msgContent.emojiOnly .staticEmoji{
    width:32px;
    height:32px;
    border-radius:8px;
  }
  .msgMeta{
    display:flex; justify-content:space-between; gap:10px;
    margin-top:8px;
    font-size:11px;
    color:var(--muted);
  }
  .msgAuthor{ font-weight:900; color: var(--muted); }
  .msgCode{ font-variant-numeric: tabular-nums; }
  .msgImg{
    margin-top:8px;
    max-width: 100%;
    border-radius:12px;
    border:1px solid var(--border);
  }
  .msgActions{
    display:flex;
    gap:6px;
    margin-top:8px;
    flex-wrap:wrap;
    opacity: 0;
    transition: opacity .15s ease;
  }
  .msgBubble:hover .msgActions{ opacity: 1; }
  .reactionBtn{
    border: 1px solid var(--border);
    background: rgba(0,0,0,.18);
    border-radius: 999px;
    padding: 4px 8px;
    font-size: 12px;
    cursor:pointer;
  }
  .reactionBtn.active{
    border-color: rgba(106,167,255,.5);
    background: rgba(106,167,255,.18);
  }
  .reactionSummary{
    display:flex;
    gap:6px;
    flex-wrap:wrap;
    margin-top:6px;
  }
  .reactionChip{
    display:inline-flex;
    align-items:center;
    gap:4px;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 12px;
    background: rgba(0,0,0,.18);
  }
  @media (hover: none){
    .msgActions{ opacity: 1; }
  }

  .composer{
    border-top:1px solid var(--border);
    padding:10px 12px;
    background: rgba(0,0,0,.12);
  }
  .composerRow{ display:flex; gap:10px; align-items:flex-end; }
  .composerInfo{ display:flex; justify-content:space-between; margin-top:8px; gap:12px; }
  .typingLine{ font-size:12px; color: var(--muted); min-height: 16px; }
  .countLine{ font-size:12px; color: var(--muted); font-variant-numeric: tabular-nums; }

  .input{
    width:100%;
    box-sizing:border-box;
    padding:10px 12px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: rgba(0,0,0,.18);
    color: var(--text);
    outline:none;
  }
  .input:focus{ border-color: rgba(106,167,255,.45); box-shadow: 0 0 0 3px rgba(106,167,255,.18); }

  .textarea{
    width:100%;
    min-height: 44px;
    max-height: 150px;
    resize:none;
    box-sizing:border-box;
    padding:10px 12px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: rgba(0,0,0,.18);
    color: var(--text);
    outline:none;
    line-height: 1.25;
  }
  .textarea:focus{ border-color: rgba(106,167,255,.45); box-shadow: 0 0 0 3px rgba(106,167,255,.18); }

  .btn{
    border: 1px solid var(--border);
    background: rgba(0,0,0,.10);
    color: var(--text);
    padding:10px 12px;
    border-radius: 14px;
    cursor:pointer;
    font-weight:900;
  }
  .btn:hover{ background: rgba(255,255,255,.06); }
  .btn:disabled{ opacity:.6; cursor:not-allowed; }

  .btnPrimary{
    background: rgba(106,167,255,.18);
    border-color: rgba(106,167,255,.45);
  }
  .btnPrimary:hover{ background: rgba(106,167,255,.24); }

  .btnDanger{
    background: rgba(255,77,77,.14);
    border-color: rgba(255,77,77,.45);
  }

  .sendBtn{
    border: 1px solid rgba(47,209,141,.45);
    background: rgba(47,209,141,.12);
    color: var(--text);
    padding:10px 14px;
    border-radius: 14px;
    cursor:pointer;
    font-weight:950;
    min-width: 92px;
  }
  .sendBtn:hover{ background: rgba(47,209,141,.18); }

  .actionBtn{
    width:44px; height:44px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: rgba(0,0,0,.10);
    cursor:pointer;
    font-size:18px;
  }
  .actionBtn:hover{ background: rgba(255,255,255,.06); }

  .iconBtn{
    width:38px; height:38px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: rgba(0,0,0,.10);
    color: var(--text);
    cursor:pointer;
    display:grid;
    place-items:center;
  }
  .iconBtn:hover{ background: rgba(255,255,255,.06); }

  .hint{ color: var(--muted); font-size: 13px; line-height: 1.35; }
  .small{ color: var(--muted); font-size: 12px; }
  .hr{ height:1px; background: var(--border); margin: 10px 0; }

  .backdrop{
    position:fixed; inset:0; background: rgba(0,0,0,.55); backdrop-filter: blur(6px);
    z-index: 9998;
  }
  .modal{
    position:fixed; inset:0; display:grid; place-items:center;
    z-index: 9999;
    padding: 16px;
  }
  .modalCard{
    width: min(620px, 100%);
    border-radius: 18px;
    border: 1px solid var(--border);
    background: rgba(15,21,32,.94);
    box-shadow: var(--shadow);
    overflow:hidden;
  }
  .modalHeader{
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
    background: rgba(0,0,0,.12);
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
  }
  .modalTitle{ font-weight: 950; }
  .modalClose{
    padding:6px 10px;
    border-radius: 12px;
  }
  .modalBody{ padding: 12px 14px; display:flex; flex-direction:column; gap:10px; }
  .modalFooter{ padding: 12px 14px; border-top: 1px solid var(--border); background: rgba(0,0,0,.12); }
  .row{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }
  .kbd{ display:inline-block; padding:2px 6px; border-radius:8px; border:1px solid var(--border); background: rgba(0,0,0,.18); font-weight:900; font-size:12px; color: var(--text); }

  .toastWrap{
    position: fixed;
    top: 14px;
    right: 14px;
    display:flex;
    flex-direction:column;
    gap:10px;
    z-index: 99999;
    pointer-events:none;
    align-items:flex-end;
  }
  .toast{
    pointer-events:none;
    padding:10px 12px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: rgba(0,0,0,.55);
    color: var(--text);
    box-shadow: var(--shadow);
    max-width: min(520px, calc(100vw - 28px));
  }
  .toast-ok{ border-color: rgba(47,209,141,.45); }
  .toast-warn{ border-color: rgba(255,204,102,.45); }
  .toast-error{ border-color: rgba(255,77,77,.45); }

  .contextMenu{
    position: fixed;
    z-index: 9999;
    min-width: 180px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: rgba(10,12,20,.95);
    box-shadow: var(--shadow);
    padding: 6px;
  }
  .contextItem{
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    color: var(--text);
    padding: 8px 10px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 13px;
  }
  .contextItem:hover{ background: rgba(255,255,255,.08); }
  .contextItem.danger{ color: var(--danger); }

  .reqItem{
    display:flex; align-items:center; justify-content:space-between; gap:10px;
    padding:10px;
    border:1px solid var(--border);
    border-radius: 14px;
    background: rgba(0,0,0,.10);
  }
  .reqLeft{ display:flex; flex-direction:column; gap:2px; min-width:0; }
  .reqName{
    font-weight: 950;
    font-size: 13px;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    border:none;
    background: transparent;
    color: var(--text);
    text-align:left;
    cursor:pointer;
    padding:0;
  }
  .reqMeta{ color: var(--muted); font-size: 12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .reqBtns{ display:flex; gap:8px; flex: 0 0 auto; }
  .btnTiny{
    width:34px; height:34px;
    border-radius: 14px;
    border:1px solid var(--border);
    background: rgba(0,0,0,.10);
    color: var(--text);
    cursor:pointer;
    font-weight: 950;
  }
  .btnTiny.ok{ border-color: rgba(47,209,141,.45); background: rgba(47,209,141,.12); }
  .btnTiny.no{ border-color: rgba(255,77,77,.45); background: rgba(255,77,77,.12); }

  .emojiGrid{
    display:grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 8px;
  }
  .emojiBtn{
    width: 44px;
    height: 44px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: rgba(0,0,0,.10);
    color: var(--text);
    cursor:pointer;
    font-size: 18px;
    display:grid;
    place-items:center;
  }
  .emojiBtn:hover{ background: rgba(255,255,255,.06); }
  .modal.emojiModal{
    align-items:flex-end;
    justify-content:flex-start;
  }
  .modal.emojiModal .modalCard{
    width: min(360px, 92vw);
  }

  @media (max-width: 920px){
    .appShell{ grid-template-columns: 1fr; grid-template-rows: 340px 1fr; }
    .sidebar{ max-height: 340px; }
  }

  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
})();

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
  chats: [],
  publicUsers: {},

  active: null,
  msgChildAddedUnsub: null,
  typingUnsub: null,
  presenceUnsubs: [],
  userDataUnsub: null,
  chatRefsUnsub: null,
  publicUsersUnsub: null,
  reactionUnsubs: [],

  lastSendAt: 0,

  chatState: {}, // { key: { lastReadAt, unread } }
  isTyping: false,
  typingTimer: null,
  presenceStatus: "online",
  idleTimer: null,
  dingAudio: null,
  autoOpenInProgress: false,

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

function normalizeDisplayName(name) {
  return String(name || "").trim().toLowerCase();
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
  const wrap = document.getElementById("toastWrap") || el("div", { id: "toastWrap", class: "toastWrap" });
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
  await update(ref(db, `users/${S.uid}`), payload).catch(() => {});
  await update(ref(db, `publicUsers/${S.uid}`), payload).catch(() => {});
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
      "• Display names have no spaces and are unique (case-insensitive)."
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
  const userRef = ref(db, `users/${uid}`);
  const snap = await get(userRef);

  const base = {
    uid,
    email: user.email || null,
    photoURL: user.photoURL || null,
    displayNameDisplay: null,
    displayNameNormalized: null,
    theme: DEFAULT_THEME,
    settings: {
      useGoogleAvatar: true,
      notifications: true,
      messageSounds: true
    },
    createdAt: nowMs(),
    lastLogin: nowMs(),
    lastSeen: nowMs(),
    status: "online",
    typing: false,
    messagesSent: 0
  };

  if (!snap.exists()) {
    await set(userRef, base);
  } else {
    await update(userRef, {
      email: user.email || null,
      photoURL: user.photoURL || null,
      lastLogin: nowMs(),
      lastSeen: nowMs(),
      status: "online",
      settings: {
        useGoogleAvatar: snap.val()?.settings?.useGoogleAvatar !== false,
        notifications: snap.val()?.settings?.notifications !== false,
        messageSounds: snap.val()?.settings?.messageSounds !== false
      }
    });
  }

  const pubRef = ref(db, `publicUsers/${uid}`);
  await update(pubRef, {
    uid,
    displayNameDisplay: snap.exists() ? (snap.val()?.displayNameDisplay || null) : null,
    displayNameNormalized: snap.exists() ? (snap.val()?.displayNameNormalized || null) : null,
    photoURL: user.photoURL || null,
    lastSeen: nowMs(),
    status: "online"
  }).catch(() => {});

  const presenceRef = ref(db, `presence/${uid}`);
  await update(presenceRef, { status: "online", lastSeen: nowMs() }).catch(() => {});
  onDisconnect(presenceRef).update({ status: "offline", lastSeen: nowMs() }).catch(() => {});
  onDisconnect(ref(db, `users/${uid}`)).update({ status: "offline", lastSeen: nowMs() }).catch(() => {});
  onDisconnect(ref(db, `publicUsers/${uid}`)).update({ status: "offline", lastSeen: nowMs() }).catch(() => {});
}

async function loadProfile(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
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
  const snap = await get(ref(db, "publicUsers"));
  if (!snap.exists()) return false;
  const all = snap.val() || {};
  for (const [uid, u] of Object.entries(all)) {
    if (uid === myUid) continue;
    const dn = normalizeDisplayName(u?.displayNameDisplay || "");
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

  await update(ref(db, `users/${S.uid}`), {
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

  await update(ref(db, `publicUsers/${S.uid}`), {
    uid: S.uid,
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
  }
  await set(ref(db, `displayNames/${normalized}`), S.uid);
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
}

async function saveThemeToCloud(theme) {
  if (!S.uid) return;
  try {
    await update(ref(db, `users/${S.uid}`), { theme });
  } catch {}
}

/* ---------------------------
   UI RENDER
---------------------------- */
function renderSignedOut() {
  clear(root);
  document.body.classList.add("auth-screen");
  const staticWrap = document.getElementById("staticWrap");
  const staticMenu = document.getElementById("staticMenu");
  const staticSlideMenu = document.getElementById("staticSlideMenu");
  if (staticWrap) staticWrap.classList.remove("staticWrapInApp");
  if (staticMenu) staticMenu.classList.remove("staticMenuInApp");
  if (staticSlideMenu) staticSlideMenu.classList.remove("staticSlideInApp");
  if (staticWrap && !document.body.contains(staticWrap)) document.body.appendChild(staticWrap);

  const screen = el("div", { class: "authScreen" });
  const card = el("div", { class: "authCard authCardGlow" });
  const bannerLink = el("a", { href: BRAND_LINK, target: "_blank", rel: "noopener" }, [
    el("img", { class: "authBanner", src: BRAND_BANNER, alt: `${BRAND_NAME} banner` })
  ]);

  const brand = el("div", { class: "authBrand" }, [
    el("a", { href: BRAND_LINK, target: "_blank", rel: "noopener" }, [
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

  const adSlot = el("div", { class: "adSlot" });

  card.appendChild(bannerLink);
  card.appendChild(brand);
  card.appendChild(copy);
  card.appendChild(signInBtn);
  card.appendChild(adSlot);
  screen.appendChild(card);
  root.appendChild(screen);
}

function renderLoadingScreen() {
  clear(root);
  document.body.classList.add("auth-screen");
  const staticWrap = document.getElementById("staticWrap");
  const staticMenu = document.getElementById("staticMenu");
  const staticSlideMenu = document.getElementById("staticSlideMenu");
  if (staticWrap) staticWrap.classList.remove("staticWrapInApp");
  if (staticMenu) staticMenu.classList.remove("staticMenuInApp");
  if (staticSlideMenu) staticSlideMenu.classList.remove("staticSlideInApp");
  if (staticWrap && !document.body.contains(staticWrap)) document.body.appendChild(staticWrap);

  const screen = el("div", { class: "authScreen" });
  const card = el("div", { class: "authCard authCardGlow" });
  const bannerLink = el("a", { href: BRAND_LINK, target: "_blank", rel: "noopener" }, [
    el("img", { class: "authBanner", src: BRAND_BANNER, alt: `${BRAND_NAME} banner` })
  ]);

  const brand = el("div", { class: "authBrand" }, [
    el("a", { href: BRAND_LINK, target: "_blank", rel: "noopener" }, [
      el("img", { class: "authLogo", src: BRAND_ICON, alt: `${APP_NAME} logo` })
    ]),
    el("div", { class: "authTitle", text: APP_NAME }),
    el("div", { class: "small", text: APP_SECONDARY_NAME }),
    el("div", { class: "authSubtitle", text: "Loading your chat experience..." })
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

  const chatTitle = el("div", { class: "sectionTitle", text: "Recent Chats" });
  const chatList = el("div", { class: "chatList", id: "chatList" });

  sidebar.appendChild(sideHeader);
  sidebar.appendChild(searchRow);
  sidebar.appendChild(reqTitle);
  sidebar.appendChild(requestList);
  sidebar.appendChild(chatTitle);
  sidebar.appendChild(chatList);

  const staticWrap = document.getElementById("staticWrap");
  const staticMenu = document.getElementById("staticMenu");
  const staticSlideMenu = document.getElementById("staticSlideMenu");
  if (staticWrap) {
    staticWrap.classList.add("staticWrapInApp");
    if (staticSlideMenu) staticSlideMenu.classList.add("staticSlideInApp");
    if (staticMenu) staticMenu.classList.add("staticMenuInApp");
    sidebar.appendChild(staticWrap);
  }

  // CHAT PANE
  const chatPane = el("div", { class: "panel chatPane" });

  const topBar = el("div", { class: "topBar" });
  const topLeft = el("div", { class: "topLeft" }, [
    el("div", { class: "chatTitle", id: "chatTitle", text: "Select a chat" }),
    el("div", { class: "chatSub", id: "chatSub", text: "Add a friend or create a group DM." })
  ]);
  const topRight = el("div", { class: "topRight" }, [
    el("div", { class: "pill", id: "mePill" }, [
      el("span", { text: "You:" }),
      el("b", { id: "meName", text: S.profile?.displayNameDisplay || "User" })
    ]),
    el("button", { class: "iconBtn", title: "Group Info", onclick: openGroupInfoModal }, ["ℹ️"]),
    el("button", { class: "iconBtn", id: "themeBtn", title: "Theme", onclick: openThemeModal }, [svgPalette()]),
    el("button", { class: "iconBtn", title: "Settings", onclick: openSettingsModal }, [svgGear()])
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
    chatList,
    searchChats: searchRow.querySelector("#searchChats"),
    chatTitle: topBar.querySelector("#chatTitle"),
    chatSub: topBar.querySelector("#chatSub"),
    chatCode: null,
    themeBtn: topBar.querySelector("#themeBtn"),
    meName: topBar.querySelector("#meName"),
    mePill: topBar.querySelector("#mePill"),
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

function renderSystemMessage(text, replaceAll = false) {
  if (!S.ui?.messages) return;
  if (replaceAll) clear(S.ui.messages);

  const row = el("div", { class: "msgRow system" });
  const bubble = el("div", { class: "msgBubble" }, [
    el("div", { html: linkifyAndEmoji(escapeHtml(text)) }),
    el("div", { class: "msgMeta" }, [
      el("span", { class: "msgAuthor", text: APP_NAME }),
      el("span", { class: "msgCode", text: formatTime(nowMs()) })
    ])
  ]);

  row.appendChild(bubble);
  S.ui.messages.appendChild(row);
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

    const left = el("div", { class: "reqLeft" }, [
      nameBtn,
      el("div", { class: "reqMeta", text: `Request • ${formatDateShort(req.createdAt)} ${formatTime(req.createdAt)}` })
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

async function sendFriendRequestByDisplayOrEmail(input) {
  const raw = String(input || "").trim();
  if (!raw) return;

  const normalized = normalizeDisplayName(raw);

  const pubSnap = await get(ref(db, "publicUsers"));
  if (!pubSnap.exists()) throw new Error("No users found yet.");
  const all = pubSnap.val() || {};

  let targetUid = null;
  let targetDisplay = null;
  for (const [uid, u] of Object.entries(all)) {
    const dn = normalizeDisplayName(u?.displayNameDisplay || "");
    if (dn && dn === normalized) {
      targetUid = uid;
      targetDisplay = u?.displayNameDisplay || raw;
      break;
    }
  }

  if (!targetUid) throw new Error("User not found (display name).");
  if (targetUid === S.uid) throw new Error("You can’t add yourself.");

  const fSnap = await get(ref(db, `users/${S.uid}/friends/${targetUid}`));
  if (fSnap.exists()) throw new Error("You are already friends.");

  const blockSnap = await get(ref(db, `users/${S.uid}/blocks/${targetUid}`));
  if (blockSnap.exists()) throw new Error("You blocked this user.");

  await update(ref(db, `users/${S.uid}/friendRequestsOut/${targetUid}`), {
    toUid: targetUid,
    toDisplay: targetDisplay,
    createdAt: nowMs()
  });

  await update(ref(db, `users/${targetUid}/friendRequestsIn/${S.uid}`), {
    fromUid: S.uid,
    fromDisplay: S.profile.displayNameDisplay,
    createdAt: nowMs()
  });

  showToast(`Friend request sent to ${targetDisplay}.`, "ok");
}

async function declineFriendRequest(fromUid) {
  try {
    await remove(ref(db, `users/${S.uid}/friendRequestsIn/${fromUid}`));
    showToast("Request declined.", "ok");
  } catch {
    showToast("Failed to decline.", "error");
  }
}

function deterministicDmId(a, b) {
  return [a, b].sort().join("_");
}

async function acceptFriendRequest(fromUid) {
  try {
    const pub = await get(ref(db, `publicUsers/${fromUid}`));
    const friendDisplay = pub.exists() ? (pub.val()?.displayNameDisplay || "Friend") : "Friend";
    const friendPhoto = pub.exists() ? (pub.val()?.photoURL || null) : null;
    const myDisplay = S.profile?.displayNameDisplay || "Friend";
    const myPhoto = S.user?.photoURL || null;

    await update(ref(db, `users/${S.uid}/friends/${fromUid}`), {
      uid: fromUid,
      displayNameDisplay: friendDisplay,
      photoURL: friendPhoto,
      since: nowMs()
    });

    await update(ref(db, `users/${fromUid}/friends/${S.uid}`), {
      uid: S.uid,
      displayNameDisplay: myDisplay,
      photoURL: myPhoto,
      since: nowMs()
    }).catch(() => {});

    await remove(ref(db, `users/${S.uid}/friendRequestsIn/${fromUid}`));
    await remove(ref(db, `users/${fromUid}/friendRequestsOut/${S.uid}`)).catch(() => {});

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
    await update(ref(db, `users/${fromUid}/chatRefs/${scopeKey("dm", dmId)}`), {
      type: "dm",
      id: dmId,
      name: myDisplay,
      photoURL: myPhoto,
      lastAt: nowMs(),
      sub: "",
      hidden: false
    }).catch(() => {});

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

  await update(ref(db, `users/${S.uid}/chatRefs/${key}`), obj).catch(() => {});
}

async function clearActiveChat() {
  S.active = null;
  clearChatListeners();
  renderHomePanel();
  renderChatList();
}

async function hideChatRef(type, id) {
  const key = scopeKey(type, id);
  await update(ref(db, `users/${S.uid}/chatRefs/${key}`), { hidden: true }).catch(() => {});
}

async function unhideChatRef(type, id) {
  const key = scopeKey(type, id);
  await update(ref(db, `users/${S.uid}/chatRefs/${key}`), { hidden: false }).catch(() => {});
}

async function setLastRead(type, id, ts) {
  const key = scopeKey(type, id);
  await update(ref(db, `users/${S.uid}/chatState/${key}`), { lastReadAt: ts || nowMs() }).catch(() => {});
}

async function loadMyChatState() {
  const snap = await get(ref(db, `users/${S.uid}/chatState`));
  S.chatState = snap.exists() ? (snap.val() || {}) : {};
}

async function updateUnreadCounts() {
  if (!S.uid) return;

  const chatRefsSnap = await get(ref(db, `users/${S.uid}/chatRefs`));
  const refsObj = chatRefsSnap.exists() ? (chatRefsSnap.val() || {}) : {};
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

    await update(ref(db, `users/${S.uid}/chatState/${key}`), { unread }).catch(() => {});
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

/* ---------------------------
   MESSAGES + LISTENERS
---------------------------- */
function clearChatListeners() {
  if (S.msgChildAddedUnsub) { try { S.msgChildAddedUnsub(); } catch {} S.msgChildAddedUnsub = null; }
  if (S.typingUnsub) { try { S.typingUnsub(); } catch {} S.typingUnsub = null; }
  for (const u of S.presenceUnsubs) { try { u(); } catch {} }
  S.presenceUnsubs = [];
  for (const u of S.reactionUnsubs) { try { u(); } catch {} }
  S.reactionUnsubs = [];
}

function linkifyAndEmoji(htmlAlreadyEscaped) {
  const urlRe = /(https?:\/\/[^\s<]+)/g;
  return htmlAlreadyEscaped.replace(urlRe, (u) => {
    const clean = u.replace(/["')\]]+$/g, "");
    const isImg = /\.(png|jpg|jpeg|gif|webp)$/i.test(clean);
    const link = `<a href="${clean}" target="_blank" rel="noopener">${clean}</a>`;
    if (isImg) return `${link}<br/><img class="msgImg" src="${clean}" alt="image" loading="lazy" />`;
    return link;
  });
}

function renderMessageContent(text) {
  let safe = escapeHtml(String(text || "").slice(0, MAX_MESSAGE_CHARS));

  safe = safe.replace(/:([a-z0-9_]+):/gi, (m, name) => {
    const key = `:${name.toLowerCase()}:`;
    if (key === ":static:") {
      return `<img src="${STATIC_EMOJI_URL}" alt=":static:" class="staticEmoji" />`;
    }
    return SHORTCODES[key] ? escapeHtml(SHORTCODES[key]) : m;
  });

  safe = safe.replace(/\bStatic\b/gi, (match, offset, full) => {
    const before = full[offset - 1];
    const after = full[offset + match.length];
    if (before === ":" || after === ":") return match;
    return `<a href="${BRAND_LINK}" target="_blank" rel="noopener">Static</a>`;
  });
  safe = safe.replace(/\bGTA\b/gi, (match, offset, full) => {
    const before = full[offset - 1];
    const after = full[offset + match.length];
    if (before === ":" || after === ":") return match;
    return `<a href="https://sites.google.com/view/staticquasar931/gm3z/vice-city-grand-theft-auto?utm_source=livechatting2" target="_blank" rel="noopener">GTA</a>`;
  });

  safe = linkifyAndEmoji(safe);
  safe = safe.replaceAll("\n", "<br/>");
  return safe;
}

function playMessageDing() {
  if (S.profile?.settings?.messageSounds === false) return;
  if (!S.dingAudio) {
    S.dingAudio = new Audio(MESSAGE_DING_URL);
    S.dingAudio.volume = 0.6;
  }
  S.dingAudio.currentTime = 0;
  S.dingAudio.play().catch(() => {});
}

function getEmojiOnlyState(text) {
  const raw = String(text || "").trim();
  if (!raw) return { emojiOnly: false, emojiCount: 0 };
  const normalized = raw.replace(/:([a-z0-9_]+):/gi, (m, name) => {
    const key = `:${name.toLowerCase()}:`;
    if (key === ":static:") return "🧩";
    return SHORTCODES[key] || "";
  });
  const compact = normalized.replace(/\s+/g, "");
  const matches = compact.match(/\p{Extended_Pictographic}/gu) || [];
  const nonEmoji = compact.replace(/\p{Extended_Pictographic}/gu, "");
  if (nonEmoji.length > 0) return { emojiOnly: false, emojiCount: matches.length };
  return { emojiOnly: matches.length > 0, emojiCount: matches.length };
}

function reactionBasePath(scopeType, scopeId, msgKey) {
  const base = scopeType === "dm" ? "dmMessages" : "groupDmMessages";
  return `${base}/${scopeId}/${msgKey}/reactions`;
}

async function toggleReaction(scopeType, scopeId, msgKey, emoji) {
  if (!S.uid) return;
  const reactionRef = ref(db, `${reactionBasePath(scopeType, scopeId, msgKey)}/${emoji}/${S.uid}`);
  try {
    const snap = await get(reactionRef);
    if (snap.exists()) await remove(reactionRef);
    else await set(reactionRef, true);
  } catch {}
}

function subscribeReactions(scopeType, scopeId, msgKey, summaryNode, buttonMap) {
  const rRef = ref(db, reactionBasePath(scopeType, scopeId, msgKey));
  const handler = onValue(rRef, (snap) => {
    const data = snap.val() || {};
    const totals = {};
    const myReactions = new Set();

    for (const [emoji, users] of Object.entries(data)) {
      const count = users ? Object.keys(users).length : 0;
      if (count > 0) totals[emoji] = count;
      if (users && users[S.uid]) myReactions.add(emoji);
    }

    summaryNode.innerHTML = "";
    Object.entries(totals).forEach(([emoji, count]) => {
      summaryNode.appendChild(el("div", { class: "reactionChip" }, [`${emoji} ${count}`]));
    });

    buttonMap.forEach((btn, emoji) => {
      btn.classList.toggle("active", myReactions.has(emoji));
    });
  });

  S.reactionUnsubs.push(() => off(rRef, "value", handler));
}

function addMessageToUI(msg) {
  const messages = S.ui.messages;
  if (!messages) return;

  const isMe = msg.authorId === S.uid;
  const isSystem = String(msg.content || "").startsWith("🧩");
  const isDm = msg.scopeType === "dm";
  const emojiState = getEmojiOnlyState(msg.content);
  const isSingleEmoji = emojiState.emojiOnly && emojiState.emojiCount === 1;
  const row = el("div", { class: `msgRow ${isSystem ? "system" : (isMe ? "me" : "")}` });

  const authorDisplay = msg.authorDisplay || "User";
  const timeText = formatTime(msg.createdAt || nowMs());
  const content = el("div", {
    class: `msgContent${isSingleEmoji ? " emojiOnly" : ""}`,
    html: renderMessageContent(msg.content || "")
  });
  const meta = el("div", { class: "msgMeta" }, isDm ? [
    el("span", { class: "msgCode", text: timeText })
  ] : [
    el("span", { class: "msgAuthor", text: authorDisplay }),
    el("span", { class: "msgCode", text: timeText })
  ]);

  const bubble = el("div", { class: "msgBubble" }, [content, meta]);
  bubble.title = `${authorDisplay} • ${timeText}`;

  if (msg.scopeType && msg.scopeId && msg.msgKey) {
    const actions = el("div", { class: "msgActions" });
    const summary = el("div", { class: "reactionSummary" });
    const btnMap = new Map();

    REACTION_EMOJIS.forEach((emoji) => {
      const btn = el("button", { class: "reactionBtn", text: emoji });
      btn.addEventListener("click", () => toggleReaction(msg.scopeType, msg.scopeId, msg.msgKey, emoji));
      btnMap.set(emoji, btn);
      actions.appendChild(btn);
    });

    let lastTap = 0;
    bubble.addEventListener("touchend", () => {
      const now = Date.now();
      if (now - lastTap < 300) {
        toggleReaction(msg.scopeType, msg.scopeId, msg.msgKey, QUICK_REACTION);
        lastTap = 0;
      } else {
        lastTap = now;
      }
    });
    bubble.addEventListener("dblclick", () => {
      toggleReaction(msg.scopeType, msg.scopeId, msg.msgKey, QUICK_REACTION);
    });

    bubble.appendChild(actions);
    bubble.appendChild(summary);
    subscribeReactions(msg.scopeType, msg.scopeId, msg.msgKey, summary, btnMap);
  }

  row.appendChild(bubble);
  messages.appendChild(row);

  messages.scrollTop = messages.scrollHeight;
}

async function getAuthorDisplay(uid) {
  if (!uid) return "User";
  if (uid === S.uid) return S.profile?.displayNameDisplay || "You";
  if (S._nameCache[uid]) return S._nameCache[uid];
  try {
    const pub = await get(ref(db, `publicUsers/${uid}`));
    const dn = pub.exists() ? (pub.val()?.displayNameDisplay || "User") : "User";
    S._nameCache[uid] = dn;
    return dn;
  } catch {
    return "User";
  }
}

function subscribeTyping(scopeType, scopeId) {
  const tRef = ref(db, `typing/${scopeType}/${scopeId}`);
  const handler = onValue(tRef, async (snap) => {
    const v = snap.val() || {};
    const typers = [];
    for (const [uid, info] of Object.entries(v)) {
      if (uid === S.uid) continue;
      if (info?.typing === true) typers.push(await getAuthorDisplay(uid));
    }
    if (!typers.length) S.ui.typingLine.textContent = "";
    else if (typers.length === 1) S.ui.typingLine.textContent = `${typers[0]} is typing...`;
    else S.ui.typingLine.textContent = `${typers.slice(0, 3).join(", ")} are typing...`;
  });
  S.typingUnsub = () => off(tRef, "value", handler);
}

async function setMyTyping(isTyping) {
  if (!S.active) return;
  const scopeType = S.active.type === "dm" ? "dm" : "group";
  const tRef = ref(db, `typing/${scopeType}/${S.active.id}/${S.uid}`);
  await set(tRef, { typing: !!isTyping, at: nowMs() }).catch(() => {});
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

  const pub = await get(ref(db, `publicUsers/${other}`));
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
  const pub = await get(ref(db, `publicUsers/${other}`));
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

async function subscribeMessagesDm(dmId) {
  const msgRef = ref(db, `dmMessages/${dmId}`);
  const q = query(msgRef, orderByChild("createdAt"), limitToLast(LOAD_LAST_N));

  const sk = scopeKey("dm", dmId);

  const handler = onChildAdded(q, async (snap) => {
    const msgKey = snap.key;
    if (!msgKey) return;
    if (S._seenMsgKeys[sk]?.has(msgKey)) return;
    S._seenMsgKeys[sk].add(msgKey);

    const v = snap.val();
    if (!v) return;

    const authorDisplay = await getAuthorDisplay(v.authorId);
    await ensureDmChatRefForIncoming(dmId, v.createdAt || nowMs(), v.content || "");
    addMessageToUI({
      authorId: v.authorId,
      authorDisplay,
      content: v.content || "",
      createdAt: v.createdAt || nowMs(),
      scopeType: "dm",
      scopeId: dmId,
      msgKey
    });
    if (v.authorId && v.authorId !== S.uid) {
      playMessageDing();
    }

    await update(ref(db, `users/${S.uid}/chatRefs/${sk}`), {
      lastAt: v.createdAt || nowMs(),
      sub: (v.content || "").slice(0, 90)
    }).catch(() => {});

    if (!(S.active?.type === "dm" && S.active?.id === dmId && S.isWindowFocused)) {
      await updateUnreadCounts();
    } else {
      await markActiveReadNow();
    }
  });

  S.msgChildAddedUnsub = () => off(q, "child_added", handler);
}

async function subscribeMessagesGroup(groupId) {
  const msgRef = ref(db, `groupDmMessages/${groupId}`);
  const q = query(msgRef, orderByChild("createdAt"), limitToLast(LOAD_LAST_N));

  const sk = scopeKey("group", groupId);

  const handler = onChildAdded(q, async (snap) => {
    const msgKey = snap.key;
    if (!msgKey) return;
    if (S._seenMsgKeys[sk]?.has(msgKey)) return;
    S._seenMsgKeys[sk].add(msgKey);

    const v = snap.val();
    if (!v) return;

    const authorDisplay = await getAuthorDisplay(v.authorId);
    await ensureGroupChatRefForIncoming(groupId, v.createdAt || nowMs(), v.content || "");
    addMessageToUI({
      authorId: v.authorId,
      authorDisplay,
      content: v.content || "",
      createdAt: v.createdAt || nowMs(),
      scopeType: "group",
      scopeId: groupId,
      msgKey
    });
    if (v.authorId && v.authorId !== S.uid) {
      playMessageDing();
    }

    await update(ref(db, `users/${S.uid}/chatRefs/${sk}`), {
      lastAt: v.createdAt || nowMs(),
      sub: (v.content || "").slice(0, 90)
    }).catch(() => {});

    if (!(S.active?.type === "group" && S.active?.id === groupId && S.isWindowFocused)) {
      await updateUnreadCounts();
    } else {
      await markActiveReadNow();
    }
  });

  S.msgChildAddedUnsub = () => off(q, "child_added", handler);
}

/* ---------------------------
   COMPOSER
---------------------------- */
function onComposerKeyDown(e) {
  if (!S.user || !S.active) return;
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    onSendClicked();
  }
}

function onComposerInput() {
  const t = String(S.ui.msgBox.value || "");
  S.ui.countLine.textContent = `${t.length} / ${MAX_MESSAGE_CHARS}`;
  replaceShortcodesInInput(S.ui.msgBox);

  if (!S.active) return;

  if (!S.isTyping && t.length > 0) {
    S.isTyping = true;
    setMyTyping(true);
  }
  if (S.isTyping && t.length === 0) {
    S.isTyping = false;
    setMyTyping(false);
  }

  if (S.typingTimer) clearTimeout(S.typingTimer);
  S.typingTimer = setTimeout(() => {
    S.isTyping = false;
    setMyTyping(false);
  }, 900);
}

function renderHomePanel() {
  if (!S.ui?.messages) return;
  if (S.active) return;
  clear(S.ui.messages);
  const wrap = el("div", { style: "display:flex; flex-direction:column; gap:12px; align-items:center; justify-content:center; height:100%;" });
  const title = el("div", { class: "chatTitle", text: "Welcome" });
  const subtitle = el("div", { class: "hint", text: "Pick a chat, open your friends list, or tweak your settings." });
  const actions = el("div", { class: "row", style: "justify-content:center;" }, [
    el("button", { class: "btn", onclick: openFriendsModal }, ["Friends"]),
    el("button", { class: "btn", onclick: openSettingsModal }, ["Settings"])
  ]);
  wrap.appendChild(title);
  wrap.appendChild(subtitle);
  wrap.appendChild(actions);
  S.ui.messages.appendChild(wrap);
}

async function onSendClicked() {
  if (!S.user || !S.active) { showToast("Select a chat first.", "warn"); return; }

  const raw = String(S.ui.msgBox.value || "");
  const contentTrim = raw.trim();
  if (!contentTrim) return;

  if (raw.length > MAX_MESSAGE_CHARS) {
    showToast("Message too long.", "warn");
    return;
  }

  const t = nowMs();
  if (t - S.lastSendAt < SEND_COOLDOWN_MS) {
    showToast("Slow down (cooldown).", "warn");
    return;
  }
  S.lastSendAt = t;

  if (contentTrim.startsWith("/")) {
    S.ui.msgBox.value = "";
    S.ui.countLine.textContent = `0 / ${MAX_MESSAGE_CHARS}`;
    await handleCommand(contentTrim);
    return;
  }

  try {
    S.ui.sendBtn.disabled = true;

    const msgObj = { authorId: S.uid, content: raw.slice(0, MAX_MESSAGE_CHARS), createdAt: nowMs() };

    if (S.active.type === "dm") {
      await push(ref(db, `dmMessages/${S.active.id}`), msgObj);
      await upsertMyChatRef("dm", S.active.id, S.active.name, null, msgObj.createdAt, msgObj.content.slice(0, 90));
    } else {
      await push(ref(db, `groupDmMessages/${S.active.id}`), msgObj);
      await upsertMyChatRef("group", S.active.id, S.active.name, null, msgObj.createdAt, msgObj.content.slice(0, 90));
    }

    await update(ref(db, `users/${S.uid}`), {
      messagesSent: (S.profile?.messagesSent || 0) + 1,
      lastSeen: nowMs()
    }).catch(() => {});

    S.ui.msgBox.value = "";
    S.ui.countLine.textContent = `0 / ${MAX_MESSAGE_CHARS}`;
    S.isTyping = false;
    await setMyTyping(false);

    await markActiveReadNow();
  } catch (e) {
    logFirebaseError("send-message", e);
  } finally {
    S.ui.sendBtn.disabled = false;
  }
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
        await remove(ref(db, `users/${S.uid}/blocks/${uid}`));
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
  const uSnap = await get(ref(db, `users/${S.uid}`));
  if (!uSnap.exists()) return;

  const u = uSnap.val() || {};
  S.profile = u;

  if (S.ui?.meName) S.ui.meName.textContent = S.profile?.displayNameDisplay || "User";

  const reqIn = u.friendRequestsIn || {};
  const friends = u.friends || {};
  S.friendRequestsIn = reqIn;
  S.friends = friends;

  syncFriendProfiles().catch(() => {});
  renderFriendRequests();
  renderFriendsModalLists();
}

async function syncFriendProfiles() {
  const reqs = Object.values(S.friendRequestsIn || {});
  const friends = Object.values(S.friends || {});

  for (const req of reqs) {
    if (!req?.fromUid) continue;
    const snap = await get(ref(db, `publicUsers/${req.fromUid}`));
    if (snap.exists()) {
      const u = snap.val() || {};
      req.fromDisplay = u.displayNameDisplay || req.fromDisplay;
    }
  }

  for (const friend of friends) {
    if (!friend?.uid) continue;
    const snap = await get(ref(db, `publicUsers/${friend.uid}`));
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
  const snap = await get(ref(db, `users/${S.uid}/chatRefs`));
  const refsObj = snap.exists() ? (snap.val() || {}) : {};
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
  await updateUnreadCounts().catch(() => {});
}

function subscribeUserData() {
  if (S.userDataUnsub) { try { S.userDataUnsub(); } catch {} }
  const userRef = ref(db, `users/${S.uid}`);
  const handler = onValue(userRef, (snap) => {
    if (!snap.exists()) return;
    const u = snap.val() || {};
    S.profile = u;
    if (S.ui?.meName) S.ui.meName.textContent = S.profile?.displayNameDisplay || "User";
    S.friendRequestsIn = u.friendRequestsIn || {};
    S.friends = u.friends || {};
    if (u.chatState) S.chatState = u.chatState;
    syncFriendProfiles().catch(() => {});
    renderFriendRequests();
  });
  S.userDataUnsub = () => off(userRef, "value", handler);
}

function subscribeChatRefs() {
  if (S.chatRefsUnsub) { try { S.chatRefsUnsub(); } catch {} }
  const refPath = ref(db, `users/${S.uid}/chatRefs`);
  const handler = onValue(refPath, (snap) => {
    const refsObj = snap.exists() ? (snap.val() || {}) : {};
    hydrateChatRefs(refsObj);
  });
  S.chatRefsUnsub = () => off(refPath, "value", handler);
}

function subscribePublicUsers() {
  if (S.publicUsersUnsub) { try { S.publicUsersUnsub(); } catch {} }
  const refPath = ref(db, "publicUsers");
  const handler = onValue(refPath, (snap) => {
    S.publicUsers = snap.exists() ? (snap.val() || {}) : {};
    renderFriendsModalLists();
    renderChatList();
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
  await set(ref(db, `users/${S.uid}/blocks/${uid}`), true).catch(() => {});
  await hideChatRef("dm", deterministicDmId(S.uid, uid)).catch(() => {});
  showToast("User blocked.", "ok");
  await refreshChats();
}

async function unfriendUser(uid) {
  if (!uid) return;
  await remove(ref(db, `users/${S.uid}/friends/${uid}`)).catch(() => {});
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
      clearChatListeners();
      if (S.userDataUnsub) { try { S.userDataUnsub(); } catch {} S.userDataUnsub = null; }
      if (S.chatRefsUnsub) { try { S.chatRefsUnsub(); } catch {} S.chatRefsUnsub = null; }
      applyTheme(DEFAULT_THEME);
      renderSignedOut();
      return;
    }

    S.user = user;
    S.uid = user.uid;

    await ensureUserProfile(user);
    S.profile = await loadProfile(S.uid);
    S.isAdmin = await loadIsAdmin(S.uid);

    if (!S.profile?.displayNameDisplay) {
      applyTheme(DEFAULT_THEME);
      renderShell();
      openDisplayNameModal(user);
      await refreshAll();
      return;
    }

    applyTheme(S.profile?.theme || DEFAULT_THEME);
    renderShell();

    subscribeUserData();
    subscribeChatRefs();
    subscribePublicUsers();
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
    await update(ref(db, `users/${S.uid}/settings`), { notifications: notifyToggle.checked }).catch((e) => logFirebaseError("update-notifications", e));
  });

  const soundRow = el("label", { style: "display:flex; align-items:center; gap:8px;" }, [
    el("input", { type: "checkbox" }),
    el("span", { text: "Play message sounds" })
  ]);
  const soundToggle = soundRow.querySelector("input");
  soundToggle.checked = S.profile?.settings?.messageSounds !== false;
  soundToggle.addEventListener("change", async () => {
    await update(ref(db, `users/${S.uid}/settings`), { messageSounds: soundToggle.checked }).catch((e) => logFirebaseError("update-message-sounds", e));
  });
