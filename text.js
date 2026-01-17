let ctx = null;

export function initMessaging(deps) {
  ctx = deps;
  return {
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
  };
}

function renderSystemMessage(text, replaceAll = false) {
  if (!ctx.S.ui?.messages) return;
  if (replaceAll) clear(ctx.S.ui.messages);

  const row = ctx.el("div", { class: "msgRow system" });
  const bubble = ctx.el("div", { class: "msgBubble" }, [
    ctx.el("div", { html: linkifyAndEmoji(ctx.escapeHtml(text)) }),
    ctx.el("div", { class: "msgMeta" }, [
      ctx.el("span", { class: "msgAuthor", text: ctx.APP_NAME }),
      ctx.el("span", { class: "msgCode", text: ctx.formatTime(ctx.nowMs()) })
    ])
  ]);

  row.appendChild(bubble);
  ctx.S.ui.messages.appendChild(row);
}

function clearChatListeners() {
  if (ctx.S.msgChildAddedUnsub) { try { ctx.S.msgChildAddedUnsub(); } catch {} ctx.S.msgChildAddedUnsub = null; }
  if (ctx.S.typingUnsub) { try { ctx.S.typingUnsub(); } catch {} ctx.S.typingUnsub = null; }
  for (const u of ctx.S.presenceUnsubs) { try { u(); } catch {} }
  ctx.S.presenceUnsubs = [];
  for (const u of ctx.S.reactionUnsubs) { try { u(); } catch {} }
  ctx.S.reactionUnsubs = [];
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
  let safe = ctx.escapeHtml(String(text || "").slice(0, ctx.MAX_MESSAGE_CHARS));

  safe = safe.replace(/:([a-z0-9_]+):/gi, (m, name) => {
    const key = `:${name.toLowerCase()}:`;
    if (key === ":static:") {
      return `<img src="${ctx.STATIC_EMOJI_URL}" alt=":static:" class="staticEmoji" />`;
    }
    return ctx.SHORTCODES[key] ? ctx.escapeHtml(ctx.SHORTCODES[key]) : m;
  });

  safe = safe.replace(/\bStatic\b/gi, (match, offset, full) => {
    const before = full[offset - 1];
    const after = full[offset + match.length];
    if (before === ":" || after === ":") return match;
    return `<a href="${ctx.BRAND_LINK}" target="_blank" rel="noopener">Static</a>`;
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
  if (ctx.S.profile?.settings?.messageSounds === false) return;
  if (!ctx.S.dingAudio) {
    ctx.S.dingAudio = new Audio(ctx.MESSAGE_DING_URL);
    ctx.S.dingAudio.volume = 0.6;
  }
  ctx.S.dingAudio.currentTime = 0;
  ctx.S.dingAudio.play().catch(() => {});
}

function getEmojiOnlyState(text) {
  const raw = String(text || "").trim();
  if (!raw) return { emojiOnly: false, emojiCount: 0 };
  const normalized = raw.replace(/:([a-z0-9_]+):/gi, (m, name) => {
    const key = `:${name.toLowerCase()}:`;
    if (key === ":static:") return "🧩";
    return ctx.SHORTCODES[key] || "";
  });
  const compact = normalized.replace(/\s+/g, "");
  const matches = compact.match(/\p{Extended_Pictographic}/gu) || [];
  return {
    emojiOnly: matches.length > 0 && matches.join("") === compact,
    emojiCount: matches.length
  };
}

function reactionBasePath(scopeType, scopeId, msgKey) {
  const base = scopeType === "dm" ? "dmMessages" : "groupDmMessages";
  return `${base}/${scopeId}/${msgKey}/reactions`;
}

async function toggleReaction(scopeType, scopeId, msgKey, emoji) {
  if (!ctx.S.uid) return;
  const reactionRef = ctx.ref(ctx.db, `${reactionBasePath(scopeType, scopeId, msgKey)}/${emoji}/${ctx.S.uid}`);
  try {
    const snap = await ctx.get(reactionRef);
    if (snap.exists()) await ctx.remove(reactionRef);
    else await ctx.set(reactionRef, true);
  } catch {}
}

function subscribeReactions(scopeType, scopeId, msgKey, summaryNode, buttonMap) {
  const rRef = ctx.ref(ctx.db, reactionBasePath(scopeType, scopeId, msgKey));
  const handler = ctx.onValue(rRef, (snap) => {
    const data = snap.val() || {};
    const totals = {};
    const myReactions = new Set();

    for (const [emoji, users] of Object.entries(data)) {
      const count = users ? Object.keys(users).length : 0;
      if (count > 0) totals[emoji] = count;
      if (users && users[ctx.S.uid]) myReactions.add(emoji);
    }

    summaryNode.innerHTML = "";
    Object.entries(totals).forEach(([emoji, count]) => {
      summaryNode.appendChild(ctx.el("div", { class: "reactionChip" }, [`${emoji} ${count}`]));
    });

    buttonMap.forEach((btn, emoji) => {
      btn.classList.toggle("active", myReactions.has(emoji));
    });
  });

  ctx.S.reactionUnsubs.push(() => ctx.off(rRef, "value", handler));
}

function addMessageToUI(msg) {
  const messages = ctx.S.ui.messages;
  if (!messages) return;

  const isMe = msg.authorId === ctx.S.uid;
  const isSystem = String(msg.content || "").startsWith("🧩");
  const isDm = msg.scopeType === "dm";
  const emojiState = getEmojiOnlyState(msg.content);
  const isSingleEmoji = emojiState.emojiOnly && emojiState.emojiCount === 1;
  const row = ctx.el("div", { class: `msgRow ${isSystem ? "system" : (isMe ? "me" : "")}` });

  const authorDisplay = msg.authorDisplay || "User";
  const timeText = ctx.formatTime(msg.createdAt || ctx.nowMs());
  const content = ctx.el("div", {
    class: `msgContent${isSingleEmoji ? " emojiOnly" : ""}`,
    html: renderMessageContent(msg.content || "")
  });
  const meta = ctx.el("div", { class: "msgMeta" }, isDm ? [
    ctx.el("span", { class: "msgCode", text: timeText })
  ] : [
    ctx.el("span", { class: "msgAuthor", text: authorDisplay }),
    ctx.el("span", { class: "msgCode", text: timeText })
  ]);

  const bubble = ctx.el("div", { class: "msgBubble" }, [content, meta]);
  bubble.title = `${authorDisplay} • ${timeText}`;

  if (msg.scopeType && msg.scopeId && msg.msgKey) {
    const actions = ctx.el("div", { class: "msgActions" });
    const summary = ctx.el("div", { class: "reactionSummary" });
    const btnMap = new Map();

    ctx.REACTION_EMOJIS.forEach((emoji) => {
      const btn = ctx.el("button", { class: "reactionBtn", text: emoji });
      btn.addEventListener("click", () => toggleReaction(msg.scopeType, msg.scopeId, msg.msgKey, emoji));
      btnMap.set(emoji, btn);
      actions.appendChild(btn);
    });

    let lastTap = 0;
    bubble.addEventListener("touchend", () => {
      const now = Date.now();
      if (now - lastTap < 300) {
        toggleReaction(msg.scopeType, msg.scopeId, msg.msgKey, ctx.QUICK_REACTION);
        lastTap = 0;
      } else {
        lastTap = now;
      }
    });
    bubble.addEventListener("dblclick", () => {
      toggleReaction(msg.scopeType, msg.scopeId, msg.msgKey, ctx.QUICK_REACTION);
    });

    bubble.appendChild(actions);
    bubble.appendChild(summary);
    subscribeReactions(msg.scopeType, msg.scopeId, msg.msgKey, summary, btnMap);
  }

  row.appendChild(bubble);
  messages.appendChild(row);

  messages.scrollTop = messages.scrollHeight;
}

function subscribeTyping(scopeType, scopeId) {
  const tRef = ctx.ref(ctx.db, `typing/${scopeType}/${scopeId}`);
  const handler = ctx.onValue(tRef, async (snap) => {
    const v = snap.val() || {};
    const typers = [];
    for (const [uid, info] of Object.entries(v)) {
      if (uid === ctx.S.uid) continue;
      if (info?.typing === true) typers.push(await ctx.getAuthorDisplay(uid));
    }
    if (!typers.length) ctx.S.ui.typingLine.textContent = "";
    else if (typers.length === 1) ctx.S.ui.typingLine.textContent = `${typers[0]} is typing...`;
    else ctx.S.ui.typingLine.textContent = `${typers.slice(0, 3).join(", ")} are typing...`;
  });
  ctx.S.typingUnsub = () => ctx.off(tRef, "value", handler);
}

async function setMyTyping(isTyping) {
  if (!ctx.S.active) return;
  const scopeType = ctx.S.active.type === "dm" ? "dm" : "group";
  const tRef = ctx.ref(ctx.db, `typing/${scopeType}/${ctx.S.active.id}/${ctx.S.uid}`);
  await ctx.set(tRef, { typing: !!isTyping, at: ctx.nowMs() }).catch(() => {});
}

async function ensureDmRecordExists(dmId) {
  if (!dmId) return;
  const parts = String(dmId).split("_");
  const other = parts.find((p) => p && p !== ctx.S.uid) || null;
  if (!other) return;
  const dmRef = ctx.ref(ctx.db, `dms/${dmId}`);
  const dmSnap = await ctx.safeGet(dmRef);
  if (!dmSnap?.exists?.()) {
    await ctx.set(dmRef, {
      createdAt: ctx.nowMs(),
      memberIds: { [ctx.S.uid]: true, [other]: true }
    }).catch(() => {});
    return;
  }
  const dmData = dmSnap.val() || {};
  if (!dmData.memberIds || !dmData.memberIds[ctx.S.uid] || !dmData.memberIds[other]) {
    await ctx.update(dmRef, {
      memberIds: { ...(dmData.memberIds || {}), [ctx.S.uid]: true, [other]: true }
    }).catch(() => {});
  }
}

async function subscribeMessagesDm(dmId) {
  const msgRef = ctx.ref(ctx.db, `dmMessages/${dmId}`);
  const q = ctx.query(msgRef, ctx.orderByChild("createdAt"), ctx.limitToLast(ctx.LOAD_LAST_N));

  const sk = ctx.scopeKey("dm", dmId);

  const handler = ctx.onChildAdded(q, async (snap) => {
    const msgKey = snap.key;
    if (!msgKey) return;
    if (ctx.S._seenMsgKeys[sk]?.has(msgKey)) return;
    ctx.S._seenMsgKeys[sk].add(msgKey);

    const v = snap.val();
    if (!v) return;

    const authorDisplay = await ctx.getAuthorDisplay(v.authorId);
    const hadChat = (ctx.S.chats || []).some((c) => c.type === "dm" && c.id === dmId);
    await ctx.ensureDmChatRefForIncoming(dmId, v.createdAt || ctx.nowMs(), v.content || "");
    addMessageToUI({
      authorId: v.authorId,
      authorDisplay,
      content: v.content || "",
      createdAt: v.createdAt || ctx.nowMs(),
      scopeType: "dm",
      scopeId: dmId,
      msgKey
    });
    if (v.authorId && v.authorId !== ctx.S.uid) {
      playMessageDing();
    }

    await ctx.updateMyChatRef(sk, {
      lastAt: v.createdAt || ctx.nowMs(),
      sub: (v.content || "").slice(0, 90)
    });

    if (!hadChat && v.authorId && v.authorId !== ctx.S.uid) {
      await ctx.refreshChats();
      const otherDisplay = v.authorId === ctx.S.uid ? ctx.S.profile?.displayNameDisplay : authorDisplay;
      await ctx.openChat({ type: "dm", id: dmId, name: otherDisplay });
    }

    if (!(ctx.S.active?.type === "dm" && ctx.S.active?.id === dmId && ctx.S.isWindowFocused)) {
      await ctx.updateUnreadCounts();
    } else {
      await ctx.markActiveReadNow();
    }
  });

  ctx.S.msgChildAddedUnsub = () => ctx.off(q, "child_added", handler);
}

async function subscribeMessagesGroup(groupId) {
  const msgRef = ctx.ref(ctx.db, `groupDmMessages/${groupId}`);
  const q = ctx.query(msgRef, ctx.orderByChild("createdAt"), ctx.limitToLast(ctx.LOAD_LAST_N));

  const sk = ctx.scopeKey("group", groupId);

  const handler = ctx.onChildAdded(q, async (snap) => {
    const msgKey = snap.key;
    if (!msgKey) return;
    if (ctx.S._seenMsgKeys[sk]?.has(msgKey)) return;
    ctx.S._seenMsgKeys[sk].add(msgKey);

    const v = snap.val();
    if (!v) return;

    const authorDisplay = await ctx.getAuthorDisplay(v.authorId);
    await ctx.ensureGroupChatRefForIncoming(groupId, v.createdAt || ctx.nowMs(), v.content || "");
    addMessageToUI({
      authorId: v.authorId,
      authorDisplay,
      content: v.content || "",
      createdAt: v.createdAt || ctx.nowMs(),
      scopeType: "group",
      scopeId: groupId,
      msgKey
    });
    if (v.authorId && v.authorId !== ctx.S.uid) {
      playMessageDing();
    }

    await ctx.updateMyChatRef(sk, {
      lastAt: v.createdAt || ctx.nowMs(),
      sub: (v.content || "").slice(0, 90)
    });

    if (!(ctx.S.active?.type === "group" && ctx.S.active?.id === groupId && ctx.S.isWindowFocused)) {
      await ctx.updateUnreadCounts();
    } else {
      await ctx.markActiveReadNow();
    }
  });

  ctx.S.msgChildAddedUnsub = () => ctx.off(q, "child_added", handler);
}

function onComposerKeyDown(e) {
  if (!ctx.S.user || !ctx.S.active) return;
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    onSendClicked();
  }
}

function onComposerInput() {
  const t = String(ctx.S.ui.msgBox.value || "");
  ctx.S.ui.countLine.textContent = `${t.length} / ${ctx.MAX_MESSAGE_CHARS}`;
  ctx.replaceShortcodesInInput(ctx.S.ui.msgBox);

  if (!ctx.S.active) return;

  if (!ctx.S.isTyping && t.length > 0) {
    ctx.S.isTyping = true;
    setMyTyping(true);
  }
  if (ctx.S.isTyping && t.length === 0) {
    ctx.S.isTyping = false;
    setMyTyping(false);
  }

  if (ctx.S.typingTimer) clearTimeout(ctx.S.typingTimer);
  ctx.S.typingTimer = setTimeout(() => {
    ctx.S.isTyping = false;
    setMyTyping(false);
  }, 900);
}

function renderHomePanel() {
  if (!ctx.S.ui?.messages) return;
  if (ctx.S.active) return;
  clear(ctx.S.ui.messages);
  const wrap = ctx.el("div", { style: "display:flex; flex-direction:column; gap:12px; align-items:center; justify-content:center; height:100%;" });
  const title = ctx.el("div", { class: "chatTitle", text: "Welcome" });
  const subtitle = ctx.el("div", { class: "hint", text: "Pick a chat, open your friends list, or tweak your settings." });
  const actions = ctx.el("div", { class: "row", style: "justify-content:center;" }, [
    ctx.el("button", { class: "btn", onclick: ctx.openFriendsModal }, ["Friends"]),
    ctx.el("button", { class: "btn", onclick: ctx.openSettingsModal }, ["Settings"])
  ]);
  wrap.appendChild(title);
  wrap.appendChild(subtitle);
  wrap.appendChild(actions);
  ctx.S.ui.messages.appendChild(wrap);
}

async function onSendClicked() {
  if (!ctx.S.user || !ctx.S.active) { ctx.showToast("Select a chat first.", "warn"); return; }

  const raw = String(ctx.S.ui.msgBox.value || "");
  const contentTrim = raw.trim();
  if (!contentTrim) return;

  if (raw.length > ctx.MAX_MESSAGE_CHARS) {
    ctx.showToast("Message too long.", "warn");
    return;
  }

  const t = ctx.nowMs();
  if (t - ctx.S.lastSendAt < ctx.SEND_COOLDOWN_MS) {
    ctx.showToast("Slow down (cooldown).", "warn");
    return;
  }
  ctx.S.lastSendAt = t;

  if (contentTrim.startsWith("/")) {
    ctx.S.ui.msgBox.value = "";
    ctx.S.ui.countLine.textContent = `0 / ${ctx.MAX_MESSAGE_CHARS}`;
    await ctx.handleCommand(contentTrim);
    return;
  }

  try {
    ctx.S.ui.sendBtn.disabled = true;

    const msgObj = { authorId: ctx.S.uid, content: raw.slice(0, ctx.MAX_MESSAGE_CHARS), createdAt: ctx.nowMs() };

    if (ctx.S.active.type === "dm") {
      await ensureDmRecordExists(ctx.S.active.id);
      await ctx.push(ctx.ref(ctx.db, `dmMessages/${ctx.S.active.id}`), msgObj);
      await ctx.upsertMyChatRef("dm", ctx.S.active.id, ctx.S.active.name, null, msgObj.createdAt, msgObj.content.slice(0, 90));
    } else {
      await ctx.push(ctx.ref(ctx.db, `groupDmMessages/${ctx.S.active.id}`), msgObj);
      await ctx.upsertMyChatRef("group", ctx.S.active.id, ctx.S.active.name, null, msgObj.createdAt, msgObj.content.slice(0, 90));
    }

    await ctx.updatePeoplePrivate(ctx.S.uid, {
      messagesSent: (ctx.S.profile?.messagesSent || 0) + 1,
      lastSeen: ctx.nowMs()
    });
    await ctx.incrementStatCounter(ctx.S.uid, "messagesSent", 1);
    await ctx.logStatEvent(ctx.S.uid, "message-sent", { scopeType: ctx.S.active.type, scopeId: ctx.S.active.id });

    ctx.S.ui.msgBox.value = "";
    ctx.S.ui.countLine.textContent = `0 / ${ctx.MAX_MESSAGE_CHARS}`;
    ctx.S.isTyping = false;
    await setMyTyping(false);

    await ctx.markActiveReadNow();
  } catch (e) {
    ctx.logFirebaseError("send-message", e);
  } finally {
    ctx.S.ui.sendBtn.disabled = false;
  }
}
