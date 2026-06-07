const state = {
  homeEmotion: "",
  postBreathingEmotion: "",
  trigger: "",
  body: "",
  scale: "",
  action: "",
  feedback: "",
  breathingStarted: false,
  groundingStarted: false,
};

const themeMap = {
  home: "neutral",
  breathing: "neutral",
  emotion: "neutral",
  grounding: "neutral",
  chat1: "neutral",
  chat2: "neutral",
  scale: "neutral",
  action: "green",
  feedback: "green",
  complete: "green",
};

const stepMap = {
  breathing: { index: "01", progress: ["warm"] },
  emotion: { index: "01", progress: ["warm"] },
  grounding: { index: "01", progress: ["warm"] },
  chat1: { index: "02", progress: ["warm", "gold"] },
  chat2: { index: "02", progress: ["warm", "gold"] },
  scale: { index: "02", progress: ["warm", "gold"] },
  action: { index: "03", progress: ["warm", "gold", "green"] },
  feedback: { index: "03", progress: ["warm", "gold", "green"] },
};

const selectors = {
  emotion: "[data-emotion]",
  emotionCheck: "[data-emotion-check]",
  triggerOption: ".chat-option[data-trigger]",
  bodyOption: ".chat-option[data-body]",
  scaleCard: ".scale-card",
  actionItem: ".action-item",
  feedbackCard: ".feedback-card",
};

const appShell = document.querySelector(".app-shell");
const homeTopNav = document.getElementById("homeTopNav");
const homePoints = document.getElementById("homePoints");
const flowNav = document.getElementById("flowNav");
const chatHeader = document.getElementById("chatHeader");
const closeFlowButton = document.getElementById("closeFlowButton");
const progressPips = document.getElementById("progressPips");
const stepBadge = document.getElementById("stepBadge");
const selectedTriggerText = document.getElementById("selectedTriggerText");
const completionSummary = document.getElementById("completionSummary");

const startFlowButton = document.getElementById("startFlowButton");
const startBreathingArButton = document.getElementById("startBreathingArButton");
const breathingDoneButton = document.getElementById("breathingDoneButton");
const emotionDoneButton = document.getElementById("emotionDoneButton");
const startGroundingArButton = document.getElementById("startGroundingArButton");
const groundingDoneButton = document.getElementById("groundingDoneButton");
const scaleDoneButton = document.getElementById("scaleDoneButton");
const actionDoneButton = document.getElementById("actionDoneButton");
const feedbackDoneButton = document.getElementById("feedbackDoneButton");
const restartButton = document.getElementById("restartButton");

const triggerInput = document.getElementById("triggerInput");
const bodyInput = document.getElementById("bodyInput");
const triggerVoiceStatus = document.getElementById("triggerVoiceStatus");
const bodyVoiceStatus = document.getElementById("bodyVoiceStatus");
const triggerResponseArea = document.getElementById("triggerResponseArea");
const bodyResponseArea = document.getElementById("bodyResponseArea");
const chat1ContinueButton = document.getElementById("chat1ContinueButton");
const chat2ContinueButton = document.getElementById("chat2ContinueButton");
const scaleAiNote = document.getElementById("scaleAiNote");
const actionAiNote = document.getElementById("actionAiNote");
const feedbackAiNote = document.getElementById("feedbackAiNote");
const triggerLeadMessage = document.getElementById("triggerLeadMessage");
const bodyLeadMessage = document.getElementById("bodyLeadMessage");

const stepContent = {
  trigger: {
    transition: "我想再陪你看看，你的身體哪裡最不舒服？",
  },
  body: {
    transition: "如果現在用 1 到 5 分來看，你覺得大概有幾分？",
  },
};

function setTheme(screenName) {
  appShell.dataset.theme = themeMap[screenName] || "neutral";
}

function setTopChrome(screenName) {
  const isHome = screenName === "home" || screenName === "complete";
  const isChat = screenName === "chat1" || screenName === "chat2";

  homeTopNav.hidden = !isHome;
  flowNav.hidden = isHome;
  chatHeader.hidden = !isChat;

  if (!isHome) {
    const step = stepMap[screenName];
    if (step) {
      stepBadge.textContent = step.index;
      const accent = step.progress.at(-1) === "green" ? "#38956d" : step.progress.at(-1) === "gold" ? "#d08a00" : "#d15234";
      stepBadge.style.borderColor = accent;
      stepBadge.style.color = accent;
      progressPips.innerHTML = ["warm", "gold", "green"]
        .map((color) => `<span class="pip ${step.progress.includes(color) ? `${color === "warm" ? "active" : color}` : ""}"></span>`)
        .join("");
    }
  }
}

function showScreen(screenName) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === screenName);
  });
  setTheme(screenName);
  setTopChrome(screenName);
  homePoints.textContent = screenName === "complete" ? "17 pt" : "12 pt";
}

function resetSelections(selector, className) {
  document.querySelectorAll(selector).forEach((node) => node.classList.remove(className));
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setAiNote(container, reply) {
  container.innerHTML = `
    <label>AI 說</label>
    <p>${escapeHtml(reply.acknowledgement)} ${escapeHtml(reply.supportiveLine)} ${escapeHtml(reply.transition)}</p>
  `;
}

function appendConversation(container, userText, reply) {
  container.innerHTML = `
    <div class="chat-bubble user">${escapeHtml(userText)}</div>
    <div class="chat-bubble ai">${escapeHtml(reply.acknowledgement)}<span>${escapeHtml(reply.supportiveLine)}</span></div>
    <div class="chat-bubble ai compact">${escapeHtml(reply.transition)}</div>
  `;
}

function normalizeInput(value) {
  return value.trim().replace(/\s+/g, " ");
}

function buildTriggerReply(input) {
  const lower = input.toLowerCase();

  if (lower.includes("誤會")) {
    return {
      acknowledgement: "被誤會的時候，心裡常常會悶悶的，也會很委屈。",
      supportiveLine: "謝謝你願意說出來，我有在聽。",
      transition: stepContent.trigger.transition,
    };
  }

  if (lower.includes("功課") || lower.includes("做不到")) {
    return {
      acknowledgement: "當事情太難、一下子做不到的時候，真的很容易卡住。",
      supportiveLine: "你願意把壓力說出來，這很不簡單。",
      transition: stepContent.trigger.transition,
    };
  }

  if (lower.includes("朋友") || lower.includes("衝突")) {
    return {
      acknowledgement: "跟朋友卡住的時候，心裡常常會又氣又亂。",
      supportiveLine: "先不用急著解決，我們先照顧你現在的感覺。",
      transition: stepContent.trigger.transition,
    };
  }

  if (lower.includes("老師")) {
    return {
      acknowledgement: "被大人說到難受的時候，真的很容易一下子沉下去。",
      supportiveLine: "謝謝你告訴我，我們慢慢整理就好。",
      transition: stepContent.trigger.transition,
    };
  }

  return {
    acknowledgement: "被這樣對待，真的很容易一下子火起來或亂掉。",
    supportiveLine: "謝謝你願意告訴我，我會陪你慢慢整理。",
    transition: stepContent.trigger.transition,
  };
}

function buildBodyReply(input) {
  const lower = input.toLowerCase(
