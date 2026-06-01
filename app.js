const state = {
  homeEmotion: "",
  postBreathingEmotion: "",
  trigger: "",
  body: "",
  scale: "",
  action: "",
  feedback: "",
};

const screenOrder = [
  "home",
  "breathing",
  "emotion",
  "grounding",
  "chat1",
  "chat2",
  "scale",
  "action",
  "feedback",
  "complete",
];

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

const appShell = document.querySelector(".app-shell");
const homeTopNav = document.getElementById("homeTopNav");
const flowNav = document.getElementById("flowNav");
const chatHeader = document.getElementById("chatHeader");
const closeFlowButton = document.getElementById("closeFlowButton");
const progressPips = document.getElementById("progressPips");
const stepBadge = document.getElementById("stepBadge");
const selectedTriggerText = document.getElementById("selectedTriggerText");
const startBreathingArButton = document.getElementById("startBreathingArButton");
const startGroundingArButton = document.getElementById("startGroundingArButton");
const breathingDoneButton = document.getElementById("breathingDoneButton");
const groundingDoneButton = document.getElementById("groundingDoneButton");

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
      stepBadge.style.borderColor = step.progress.at(-1) === "green" ? "#38956d" : step.progress.at(-1) === "gold" ? "#d08a00" : "#d15234";
      stepBadge.style.color = step.progress.at(-1) === "green" ? "#38956d" : step.progress.at(-1) === "gold" ? "#d08a00" : "#d15234";
      progressPips.innerHTML = ["warm", "gold", "green"].map((color) => `<span class="pip ${step.progress.includes(color) ? `${color === "warm" ? "active" : color}` : ""}"></span>`).join("");
    }
  }
}

function showScreen(screenName) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === screenName);
  });
  setTheme(screenName);
  setTopChrome(screenName);
}

function resetSelections(selector, className) {
  document.querySelectorAll(selector).forEach((node) => node.classList.remove(className));
}

document.querySelectorAll("[data-emotion]").forEach((button) => {
  button.addEventListener("click", () => {
    resetSelections("[data-emotion]", "is-selected");
    button.classList.add("is-selected");
    state.homeEmotion = button.dataset.emotion;
    document.getElementById("startFlowButton").disabled = false;
  });
});

document.querySelectorAll("[data-emotion-check]").forEach((button) => {
  button.addEventListener("click", () => {
    resetSelections("[data-emotion-check]", "is-selected");
    button.classList.add("is-selected");
    state.postBreathingEmotion = button.dataset.emotionCheck;
    document.getElementById("emotionDoneButton").disabled = false;
  });
});

document.querySelectorAll(".chat-option[data-trigger]").forEach((button) => {
  button.addEventListener("click", () => {
    resetSelections(".chat-option[data-trigger]", "is-selected");
    button.classList.add("is-selected");
    state.trigger = button.dataset.trigger;
    selectedTriggerText.textContent = state.trigger;
    setTimeout(() => showScreen("chat2"), 220);
  });
});

document.querySelectorAll(".chat-option[data-body]").forEach((button) => {
  button.addEventListener("click", () => {
    resetSelections(".chat-option[data-body]", "is-selected");
    button.classList.add("is-selected");
    state.body = button.dataset.body;
    setTimeout(() => showScreen("scale"), 220);
  });
});

document.querySelectorAll(".scale-card").forEach((button) => {
  button.addEventListener("click", () => {
    resetSelections(".scale-card", "is-selected");
    button.classList.add("is-selected");
    state.scale = button.dataset.scale;
    document.getElementById("scaleDoneButton").disabled = false;
  });
});

document.querySelectorAll(".action-item").forEach((button) => {
  button.addEventListener("click", () => {
    resetSelections(".action-item", "is-selected");
    button.classList.add("is-selected");
    state.action = button.dataset.action;
    document.getElementById("actionDoneButton").disabled = false;
  });
});

document.querySelectorAll(".feedback-card").forEach((button) => {
  button.addEventListener("click", () => {
    resetSelections(".feedback-card", "is-selected");
    button.classList.add("is-selected");
    state.feedback = button.dataset.feedback;
    document.getElementById("feedbackDoneButton").disabled = false;
  });
});

document.getElementById("startFlowButton").addEventListener("click", () => showScreen("breathing"));
startBreathingArButton.addEventListener("click", () => {
  window.open("./modules/ar-ball/index.html", "_blank", "noopener,noreferrer");
  breathingDoneButton.disabled = false;
});
breathingDoneButton.addEventListener("click", () => showScreen("emotion"));
document.getElementById("emotionDoneButton").addEventListener("click", () => showScreen("grounding"));
startGroundingArButton.addEventListener("click", () => {
  window.open("./modules/ar-grounding/index.html", "_blank", "noopener,noreferrer");
  groundingDoneButton.disabled = false;
});
groundingDoneButton.addEventListener("click", () => showScreen("chat1"));
document.getElementById("chat1SendButton").addEventListener("click", () => showScreen("chat2"));
document.getElementById("chat2SendButton").addEventListener("click", () => showScreen("scale"));
document.getElementById("scaleDoneButton").addEventListener("click", () => showScreen("action"));
document.getElementById("actionDoneButton").addEventListener("click", () => showScreen("feedback"));
document.getElementById("feedbackDoneButton").addEventListener("click", () => showScreen("complete"));
document.getElementById("restartButton").addEventListener("click", () => window.location.reload());
closeFlowButton.addEventListener("click", () => showScreen("home"));

showScreen("home");
