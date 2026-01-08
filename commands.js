export const TRUTH_PROMPTS = [
  "What is your favorite game of all time?",
  "What’s a secret talent you have?",
  "What’s the last song you played on repeat?",
  "If you could teleport anywhere, where would you go?",
  "What’s your favorite movie or show right now?"
];

export const DARE_PROMPTS = [
  "Send a message using only emojis.",
  "Type your next message in ALL CAPS.",
  "Share a fun fact about yourself.",
  "Say hello in three different languages.",
  "Post your favorite emoji three times."
];

const EIGHT_BALL = [
  "Yes.",
  "No.",
  "Maybe.",
  "Ask again later.",
  "Definitely.",
  "Not right now.",
  "It is certain.",
  "Very doubtful.",
  "Signs point to yes.",
  "Better not tell you now."
];

const JOKES = [
  "Why did the game developer go broke? Because they used up all their cache.",
  "Why was the math book sad? It had too many problems.",
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "Why did the chat message get promoted? It had great delivery.",
  "Why did the computer show up at work late? It had a hard drive."
];

const FORTUNES = [
  "A new friend will bring you good news.",
  "Today’s bug becomes tomorrow’s feature.",
  "You will discover a new favorite emoji.",
  "Small changes will bring big results.",
  "Your patience will be rewarded soon."
];

const ADVICE = [
  "Hydrate and take a stretch break.",
  "Keep your messages kind and clear.",
  "Try a new theme today.",
  "Double-check before you send.",
  "Remember to take screen breaks."
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function commandHelp() {
  return "Commands: /help, /coinflip (/cf), /roll [sides], /8ball <question>, /choose a|b|c, /joke, /fortune, /advice, /tod, /shrug, /time, /date, /hidechat, /unhidechat, /leave, /report <reason>";
}

export function createCommandHandler({
  postSystem,
  getActive,
  hideChatRef,
  unhideChatRef,
  leaveGroup,
  openReportModal,
  showToast,
  clearActiveChat
}) {
  return async function handleCommand(cmdRaw) {
    const parts = String(cmdRaw).trim().split(/\s+/g);
    const cmd = (parts[0] || "").toLowerCase();

    if (cmd === "/help") {
      await postSystem(commandHelp());
      return;
    }
    if (cmd === "/coinflip" || cmd === "/cf") {
      await postSystem(`🪙 Coin flip: ${Math.random() < 0.5 ? "Heads" : "Tails"}`);
      return;
    }
    if (cmd === "/roll") {
      const sides = Math.max(2, Math.min(1000, parseInt(parts[1] || "6", 10) || 6));
      await postSystem(`🎲 Rolled d${sides}: ${Math.floor(Math.random() * sides) + 1}`);
      return;
    }
    if (cmd === "/8ball") {
      const question = parts.slice(1).join(" ").trim();
      if (!question) {
        await postSystem("Usage: /8ball <question>");
        return;
      }
      await postSystem(`🎱 ${pick(EIGHT_BALL)}`);
      return;
    }
    if (cmd === "/choose") {
      const options = parts.slice(1).join(" ").split("|").map((o) => o.trim()).filter(Boolean);
      if (options.length < 2) {
        await postSystem("Usage: /choose option1 | option2 | option3");
        return;
      }
      await postSystem(`✅ I choose: ${pick(options)}`);
      return;
    }
    if (cmd === "/joke") {
      await postSystem(`😂 ${pick(JOKES)}`);
      return;
    }
    if (cmd === "/fortune") {
      await postSystem(`✨ ${pick(FORTUNES)}`);
      return;
    }
    if (cmd === "/advice") {
      await postSystem(`💡 ${pick(ADVICE)}`);
      return;
    }
    if (cmd === "/shrug") {
      await postSystem("¯\\_(ツ)_/¯");
      return;
    }
    if (cmd === "/time") {
      await postSystem(`🕒 ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      return;
    }
    if (cmd === "/date") {
      await postSystem(`📅 ${new Date().toLocaleDateString()}`);
      return;
    }
    if (cmd === "/tod") {
      const pickTruth = Math.random() < 0.5;
      const prompt = pickTruth ? pick(TRUTH_PROMPTS) : pick(DARE_PROMPTS);
      await postSystem(`${pickTruth ? "Truth" : "Dare"}: ${prompt}`);
      return;
    }
    if (cmd === "/hidechat") {
      const active = getActive();
      if (!active) return;
      await hideChatRef(active.type, active.id);
      showToast("Chat hidden.", "ok");
      await clearActiveChat();
      return;
    }
    if (cmd === "/unhidechat") {
      const active = getActive();
      if (!active) return;
      await unhideChatRef(active.type, active.id);
      showToast("Chat unhidden.", "ok");
      return;
    }
    if (cmd === "/leave") {
      const active = getActive();
      if (!active) return;
      if (active.type !== "group") {
        showToast("/leave only works in group DMs.", "warn");
        return;
      }
      await leaveGroup(active.id);
      return;
    }
    if (cmd === "/report") {
      const reason = parts.slice(1).join(" ").trim();
      if (!reason) { await postSystem("Usage: /report <reason>"); return; }
      await openReportModal(reason);
      return;
    }

    await postSystem(`Unknown command: ${cmd}. Use /help.`);
  };
}
