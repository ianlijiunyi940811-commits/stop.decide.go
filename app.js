const state = {
  emotion: "",
  breathingDone: false,
  groundingDone: false,
  intensity: 3,
  action: "",
  note: "",
};

const screens = Array.from(document.querySelectorAll("[data-screen]"));
const stepIndicators = Array.from(document.querySelectorAll("[data-step-indicator]"));
const emotionCards = Array.from(document.querySelectorAll(".emotion-card"));
const actionChips = Array.from(document.querySelectorAll(".choice-chip"));

const screenStepMap = {
  checkin: "checkin",
  breathing: "breathing",
  grounding: "grounding",
  reflect: "reflect",
  complete: "complete",
};

const labels = {
  angry: "生氣",
  sad: "難過",
  confused: "混亂",
  ok: "還可以",
  rest: "先休息 3 分鐘",
  talk: "找人聊一下",
  water: "喝水走動",
  task: "回到一個小任務",
};

const startFlowButton = document.getElementById("startFlowButton");
const breathingDoneButton = document.getElementById("breathingDoneButton");
const groundingDoneButton = document.getElementById("groundingDoneButton");
const completeFlowButton = document.getElementById("completeFlowButton");
const restartButton = document.getElementById("restartButton");
const resetFlowButton = document.getElementById("resetFlowButton");
const intensityRange = document.getElementById("intensityRange");
const intensityValue = document.getElementById("intensityValue");
const reflectionNote = document.getElementById("reflectionNote");

function showScreen(screenName) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === screenName);
  });

  const activeStep = screenStepMap[screenName];
  stepIndicators.forEach((step) => {
    step.classList.toggle("active", step.dataset.stepIndicator === activeStep);
  });
}

function updateStatePanel() {
  document.getElementById("stateEmotion").textContent = state.emotion ? labels[state.emotion] : "尚未選擇";
  document.getElementById("stateBreathing").textContent = state.breathingDone ? "已完成" : "未完成";
  document.getElementById("stateGrounding").textContent = state.groundingDone ? "已完成" : "未完成";
  document.getElementById("stateIntensity").textContent = String(state.intensity);
  document.getElementById("stateAction").textContent = state.action ? labels[state.action] : "尚未選擇";
}

function updateButtons() {
  startFlowButton.disabled = !state.emotion;
  completeFlowButton.disabled = !(state.breathingDone && state.groundingDone && state.action);
}

function renderSummary() {
  const summaryCard = document.getElementById("summaryCard");
  const note = state.note || "這一輪還沒有填寫文字紀錄。";
  summaryCard.innerHTML = `
    <strong>情緒：</strong>${state.emotion ? labels[state.emotion] : "未選擇"}<br>
    <strong>呼吸安定：</strong>${state.breathingDone ? "已完成" : "未完成"}<br>
    <strong>Grounding：</strong>${state.groundingDone ? "已完成" : "未完成"}<br>
    <strong>情緒強度：</strong>${state.intensity} / 5<br>
    <strong>下一步：</strong>${state.action ? labels[state.action] : "未選擇"}<br>
    <strong>紀錄：</strong>${note}
  `;
}

function resetState() {
  state.emotion = "";
  state.breathingDone = false;
  state.groundingDone = false;
  state.intensity = 3;
  state.action = "";
  state.note = "";

  emotionCards.forEach((card) => card.classList.remove("is-selected"));
  actionChips.forEach((chip) => chip.classList.remove("is-selected"));
  intensityRange.value = "3";
  intensityValue.textContent = "3";
  reflectionNote.value = "";

  updateStatePanel();
  updateButtons();
  showScreen("checkin");
}

emotionCards.forEach((card) => {
  card.addEventListener("click", () => {
    emotionCards.forEach((item) => item.classList.remove("is-selected"));
    card.classList.add("is-selected");
    state.emotion = card.dataset.emotion;
    updateStatePanel();
    updateButtons();
  });
});

actionChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    actionChips.forEach((item) => item.classList.remove("is-selected"));
    chip.classList.add("is-selected");
    state.action = chip.dataset.action;
    updateStatePanel();
    updateButtons();
  });
});

startFlowButton.addEventListener("click", () => {
  showScreen("breathing");
});

breathingDoneButton.addEventListener("click", () => {
  state.breathingDone = true;
  updateStatePanel();
  updateButtons();
  showScreen("grounding");
});

groundingDoneButton.addEventListener("click", () => {
  state.groundingDone = true;
  updateStatePanel();
  updateButtons();
  showScreen("reflect");
});

intensityRange.addEventListener("input", (event) => {
  state.intensity = Number(event.target.value);
  intensityValue.textContent = String(state.intensity);
  updateStatePanel();
});

reflectionNote.addEventListener("input", (event) => {
  state.note = event.target.value.trim();
});

completeFlowButton.addEventListener("click", () => {
  renderSummary();
  showScreen("complete");
});

restartButton.addEventListener("click", resetState);
resetFlowButton.addEventListener("click", resetState);

updateStatePanel();
updateButtons();
