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
      const currentProgress = step.progress[step.progress.length - 1];
      const accent = currentProgress === "green" ? "#38956d" : currentProgress === "gold" ? "#d08a00" : "#d15234";
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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  const lower = input.toLowerCase();

  if (lower.includes("頭") || lower.includes("腦")) {
    return {
      acknowledgement: "頭很痛、腦袋很脹的時候，通常表示你已經撐很久了。",
      supportiveLine: "你有注意到自己的身體，這很重要。",
      transition: stepContent.body.transition,
    };
  }

  if (lower.includes("胸") || lower.includes("心跳")) {
    return {
      acknowledgement: "胸口悶悶、心跳快快的時候，身體常常是在提醒你它需要幫忙。",
      supportiveLine: "你說得很清楚，我們已經更接近現在的感覺了。",
      transition: stepContent.body.transition,
    };
  }

  if (lower.includes("手很緊") || lower.includes("打東西")) {
    return {
      acknowledgement: "手很緊、很想用力的時候，通常代表那股情緒真的很強。",
      supportiveLine: "你願意注意到這個訊號，已經很棒了。",
      transition: stepContent.body.transition,
    };
  }

  if (lower.includes("發抖") || lower.includes("熱")) {
    return {
      acknowledgement: "臉熱熱、身體發抖的時候，真的會讓人很不舒服。",
      supportiveLine: "謝謝你把感覺告訴我，我會陪你把它說清楚。",
      transition: stepContent.body.transition,
    };
  }

  return {
    acknowledgement: "原來你的身體也一起在反應，這真的會讓人很累。",
    supportiveLine: "你有把這個感覺說出來，對我們很有幫助。",
    transition: stepContent.body.transition,
  };
}

function buildScaleReply(scale) {
  const score = Number(scale);

  if (score <= 2) {
    return {
      acknowledgement: `${scale} 分代表你已經比剛才穩一點了。`,
      supportiveLine: "謝謝你把感覺說清楚，這會幫助我們選更適合的下一步。",
      transition: "你想先做哪一件小事，讓自己再舒服一點？",
    };
  }

  if (score === 3) {
    return {
      acknowledgement: "3 分代表這個感覺還在，但你已經開始抓到它了。",
      supportiveLine: "不用一次全部解決，我們先挑一件做得到的事。",
      transition: "看看下面哪一個行動最適合你現在。",
    };
  }

  return {
    acknowledgement: `${scale} 分代表這個感覺現在還滿強的。`,
    supportiveLine: "謝謝你很誠實地告訴我，這會幫助我們更好地照顧你。",
    transition: "我們先選一件最容易開始的小事，幫身體慢慢降下來。",
  };
}

function buildActionReply(action) {
  if (action.includes("喝點水")) {
    return {
      acknowledgement: "先喝點水、安靜一下，是一個很好的開始。",
      supportiveLine: "你不需要一次把所有事情都處理完，先照顧自己就很好。",
      transition: "做完回來告訴我，你現在感覺怎麼樣。",
    };
  }

  if (action.includes("老師")) {
    return {
      acknowledgement: "願意找一位大人說說話，是很勇敢的選擇。",
      supportiveLine: "有人陪你一起面對，會讓事情更不那麼重。",
      transition: "做完回來看看，你有沒有比較穩一點。",
    };
  }

  if (action.includes("走走")) {
    return {
      acknowledgement: "動一動可以幫身體把卡住的感覺慢慢放掉。",
      supportiveLine: "先讓自己換個位置，也是一種照顧自己的方法。",
      transition: "做完回來跟我說，你的感覺有沒有變化。",
    };
  }

  if (action.includes("歌")) {
    return {
      acknowledgement: "聽喜歡的歌，可以幫大腦從很緊的狀態慢慢鬆下來。",
      supportiveLine: "這是一個溫柔又適合現在的做法。",
      transition: "做完回來看看，你現在感覺如何。",
    };
  }

  return {
    acknowledgement: "畫一畫、塗一塗，能把說不出來的感覺放出去一點。",
    supportiveLine: "你挑了一個很有自己味道的方法。",
    transition: "做完後再回來，我們一起看有沒有變化。",
  };
}

function buildFeedbackReply(feedback) {
  if (feedback.includes("好很多")) {
    return {
      acknowledgement: "太好了，你已經有感覺到自己慢慢回來了。",
      supportiveLine: "是你剛剛願意停下來、再做一個小行動，才有這個變化。",
      transition: "我們把這次做成功的小方法記下來吧。",
    };
  }

  if (feedback.includes("平靜")) {
    return {
      acknowledgement: "有平靜一點就很棒，代表這個方法對你有幫助。",
      supportiveLine: "不需要一下子變得超好，只要比剛才好一點就很值得。",
      transition: "我們一起把今天的進步收好。",
    };
  }

  return {
    acknowledgement: "我知道，現在還是很煩，真的會讓人有點失望。",
    supportiveLine: "但你剛剛願意試一次，這本身就很勇敢。",
    transition: "我們先把這一步完成，下次也能再一起找別的方法。",
  };
}

function getFallbackGuidance(step, input) {
  const normalized = normalizeInput(input);

  if (!normalized) {
    return null;
  }

  if (step === "trigger") return buildTriggerReply(normalized);
  if (step === "body") return buildBodyReply(normalized);
  if (step === "scale") return buildScaleReply(normalized);
  if (step === "action") return buildActionReply(normalized);
  return buildFeedbackReply(normalized);
}

function buildDecidePayload(step, input) {
  return {
    step,
    selectedEmotion: state.postBreathingEmotion || state.homeEmotion,
    context: {
      trigger: state.trigger,
      body: state.body,
      scale: state.scale,
      action: state.action,
      feedback: state.feedback,
    },
    input: {
      text: input,
    },
  };
}

async function getAiGuidance(step, input) {
  const normalized = normalizeInput(input);

  if (!normalized) {
    return null;
  }

  if (window.location.protocol === "file:") {
    return getFallbackGuidance(step, normalized);
  }

  try {
    const response = await fetch("/api/decide", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildDecidePayload(step, normalized)),
    });

    if (!response.ok) {
      throw new Error(`decide api failed: ${response.status}`);
    }

    const data = await response.json();
    if (
      data &&
      data.result &&
      data.result.acknowledgement &&
      data.result.supportiveLine &&
      data.result.transition
    ) {
      return data.result;
    }
  } catch (error) {
    console.warn("DECIDE API unavailable, using fallback guidance.", error);
  }

  return getFallbackGuidance(step, normalized);
}

async function submitDecideStep(step, input, source = "manual") {
  const value = normalizeInput(input);

  if (!value) {
    return;
  }

  if (step === "trigger") {
    state.trigger = value;
    selectedTriggerText.textContent = value;
    const reply = await getAiGuidance("trigger", value);
    appendConversation(triggerResponseArea, value, reply);
    triggerInput.value = "";
    chat1ContinueButton.disabled = false;
    triggerLeadMessage.innerHTML = "謝謝你願意說出來。先把事情放在這裡，我們一步一步來。<span>你可以選項，也可以自己補充。</span>";
    if (source === "choice") {
      document.querySelectorAll(selectors.triggerOption).forEach((button) => {
        button.classList.toggle("is-selected", button.dataset.trigger === value);
      });
    } else {
      resetSelections(selectors.triggerOption, "is-selected");
    }
    return;
  }

  if (step === "body") {
    state.body = value;
    const reply = await getAiGuidance("body", value);
    appendConversation(bodyResponseArea, value, reply);
    bodyInput.value = "";
    chat2ContinueButton.disabled = false;
    bodyLeadMessage.textContent = "謝謝你把身體的感覺說出來，這會幫助我們更照顧你。";
    if (source === "choice") {
      document.querySelectorAll(selectors.bodyOption).forEach((button) => {
        button.classList.toggle("is-selected", button.dataset.body === value);
      });
    } else {
      resetSelections(selectors.bodyOption, "is-selected");
    }
  }
}

function buildCompletionSummary() {
  const actionText = state.action || "做一個讓自己舒服一點的小行動";
  const feedbackText = state.feedback || "還需要一點時間";
  completionSummary.textContent = `你今天先選了「${actionText}」，最後感覺是「${feedbackText}」。老師和爸媽將收到今天的練習摘要。`;
}

function setupVoiceInput(buttonId, inputEl, statusEl, idleMessage) {
  const button = document.getElementById(buttonId);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Recognition) {
    statusEl.textContent = "目前瀏覽器不支援語音輸入，可以直接打字。";
    button.disabled = true;
    return;
  }

  const recognition = new Recognition();
  recognition.lang = "zh-TW";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  button.addEventListener("click", () => {
    statusEl.textContent = "正在聽你說話...";
    recognition.start();
  });

  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript;
    inputEl.value = transcript;
    statusEl.textContent = "已幫你填入語音內容，按送出就可以了。";
  });

  recognition.addEventListener("error", () => {
    statusEl.textContent = "剛剛沒有成功收到語音，沒關係，也可以直接打字。";
  });

  recognition.addEventListener("end", () => {
    if (!inputEl.value) {
      statusEl.textContent = idleMessage;
    }
  });
}

document.querySelectorAll(selectors.emotion).forEach((button) => {
  button.addEventListener("click", () => {
    resetSelections(selectors.emotion, "is-selected");
    button.classList.add("is-selected");
    state.homeEmotion = button.dataset.emotion;
    startFlowButton.disabled = false;
  });
});

document.querySelectorAll(selectors.emotionCheck).forEach((button) => {
  button.addEventListener("click", () => {
    resetSelections(selectors.emotionCheck, "is-selected");
    button.classList.add("is-selected");
    state.postBreathingEmotion = button.dataset.emotionCheck;
    emotionDoneButton.disabled = false;
  });
});

document.querySelectorAll(selectors.triggerOption).forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.trigger.includes("自己說")) {
      resetSelections(selectors.triggerOption, "is-selected");
      button.classList.add("is-selected");
      triggerInput.focus();
      triggerVoiceStatus.textContent = "你可以直接打字，或按麥克風說給我聽。";
      return;
    }
    submitDecideStep("trigger", button.dataset.trigger, "choice");
  });
});

document.querySelectorAll(selectors.bodyOption).forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.body.includes("自己說")) {
      resetSelections(selectors.bodyOption, "is-selected");
      button.classList.add("is-selected");
      bodyInput.focus();
      bodyVoiceStatus.textContent = "可以打字補充，也可以用語音說出來。";
      return;
    }
    submitDecideStep("body", button.dataset.body, "choice");
  });
});

document.querySelectorAll(selectors.scaleCard).forEach((button) => {
  button.addEventListener("click", async () => {
    resetSelections(selectors.scaleCard, "is-selected");
    button.classList.add("is-selected");
    state.scale = button.dataset.scale;
    scaleDoneButton.disabled = false;
    const reply = await getAiGuidance("scale", state.scale);
    setAiNote(scaleAiNote, reply);
  });
});

document.querySelectorAll(selectors.actionItem).forEach((button) => {
  button.addEventListener("click", async () => {
    resetSelections(selectors.actionItem, "is-selected");
    button.classList.add("is-selected");
    state.action = button.dataset.action;
    actionDoneButton.disabled = false;
    const reply = await getAiGuidance("action", state.action);
    setAiNote(actionAiNote, reply);
  });
});

document.querySelectorAll(selectors.feedbackCard).forEach((button) => {
  button.addEventListener("click", async () => {
    resetSelections(selectors.feedbackCard, "is-selected");
    button.classList.add("is-selected");
    state.feedback = button.dataset.feedback;
    feedbackDoneButton.disabled = false;
    const reply = await getAiGuidance("feedback", state.feedback);
    setAiNote(feedbackAiNote, reply);
  });
});

startFlowButton.addEventListener("click", () => showScreen("breathing"));

startBreathingArButton.addEventListener("click", () => {
  window.open("./modules/ar-ball/index.html", "_blank", "noopener,noreferrer");
  state.breathingStarted = true;
  startBreathingArButton.textContent = "已開啟 AR，完成後回來";
  breathingDoneButton.disabled = false;
});

breathingDoneButton.addEventListener("click", () => showScreen("emotion"));
emotionDoneButton.addEventListener("click", () => showScreen("grounding"));

startGroundingArButton.addEventListener("click", () => {
  window.open("./modules/ar-grounding/index.html", "_blank", "noopener,noreferrer");
  state.groundingStarted = true;
  startGroundingArButton.textContent = "已開啟 AR，完成後回來";
  groundingDoneButton.disabled = false;
});

groundingDoneButton.addEventListener("click", () => showScreen("chat1"));

document.getElementById("chat1SendButton").addEventListener("click", () => {
  submitDecideStep("trigger", triggerInput.value, "typed");
});

document.getElementById("chat2SendButton").addEventListener("click", () => {
  submitDecideStep("body", bodyInput.value, "typed");
});

triggerInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    submitDecideStep("trigger", triggerInput.value, "typed");
  }
});

bodyInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    submitDecideStep("body", bodyInput.value, "typed");
  }
});

chat1ContinueButton.addEventListener("click", () => showScreen("chat2"));
chat2ContinueButton.addEventListener("click", () => showScreen("scale"));
scaleDoneButton.addEventListener("click", () => showScreen("action"));
actionDoneButton.addEventListener("click", () => showScreen("feedback"));
feedbackDoneButton.addEventListener("click", () => {
  buildCompletionSummary();
  showScreen("complete");
});

restartButton.addEventListener("click", () => window.location.reload());
closeFlowButton.addEventListener("click", () => showScreen("home"));

setupVoiceInput("triggerMicButton", triggerInput, triggerVoiceStatus, "也可以按左邊麥克風說出來。");
setupVoiceInput("bodyMicButton", bodyInput, bodyVoiceStatus, "如果比較想用說的，也可以直接錄音輸入。");
showScreen("home");
