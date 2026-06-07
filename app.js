var state = {
  homeEmotion: "",
  postBreathingEmotion: "",
  trigger: "",
  body: "",
  scale: "",
  action: "",
  feedback: ""
};

var themeMap = {
  home: "neutral",
  breathing: "neutral",
  emotion: "neutral",
  grounding: "neutral",
  chat1: "neutral",
  chat2: "neutral",
  scale: "neutral",
  action: "green",
  feedback: "green",
  complete: "green"
};

var stepMap = {
  breathing: { index: "01", progress: ["warm"] },
  emotion: { index: "01", progress: ["warm"] },
  grounding: { index: "01", progress: ["warm"] },
  chat1: { index: "02", progress: ["warm", "gold"] },
  chat2: { index: "02", progress: ["warm", "gold"] },
  scale: { index: "02", progress: ["warm", "gold"] },
  action: { index: "03", progress: ["warm", "gold", "green"] },
  feedback: { index: "03", progress: ["warm", "gold", "green"] }
};

var fallbackReplies = {
  trigger: {
    acknowledgement: "謝謝你願意說出來。",
    supportiveLine: "我們先不用急著解決，先一起把感覺看清楚。",
    transition: "我想再陪你看看，你的身體哪裡最不舒服？"
  },
  body: {
    acknowledgement: "你有注意到身體的感覺，這很重要。",
    supportiveLine: "身體也會幫我們知道現在有多不舒服。",
    transition: "如果現在用 1 到 5 分來看，你覺得大概有幾分？"
  },
  scale: {
    acknowledgement: "謝謝你把現在的分數說清楚。",
    supportiveLine: "不用一次變得很好，我們先做一個小步驟。",
    transition: "你想先做哪一件事，讓自己舒服一點？"
  },
  action: {
    acknowledgement: "這是一個可以開始的小行動。",
    supportiveLine: "先做這一步就很好，不需要一次處理全部。",
    transition: "做完後再回來告訴我，你現在感覺怎麼樣。"
  },
  feedback: {
    acknowledgement: "謝謝你回來告訴我。",
    supportiveLine: "不管有沒有立刻變好，你剛剛願意試試看已經很棒。",
    transition: "我們先把今天完成的這一步記下來。"
  }
};

function byId(id) {
  return document.getElementById(id);
}

function all(selector) {
  return Array.prototype.slice.call(document.querySelectorAll(selector));
}

function setDisabled(id, disabled) {
  var node = byId(id);
  if (node) node.disabled = disabled;
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setText(id, text) {
  var node = byId(id);
  if (node) node.textContent = text;
}

function setHtml(id, html) {
  var node = byId(id);
  if (node) node.innerHTML = html;
}

function resetSelected(selector) {
  all(selector).forEach(function (node) {
    node.classList.remove("is-selected");
  });
}

function buildProgressPips(progress) {
  var colors = ["warm", "gold", "green"];
  return colors.map(function (color) {
    var activeClass = "";
    if (progress.indexOf(color) !== -1) {
      activeClass = color === "warm" ? "active" : color;
    }
    return '<span class="pip ' + activeClass + '"></span>';
  }).join("");
}

function setTopChrome(screenName) {
  var isHome = screenName === "home" || screenName === "complete";
  var isChat = screenName === "chat1" || screenName === "chat2";
  var homeTopNav = byId("homeTopNav");
  var flowNav = byId("flowNav");
  var chatHeader = byId("chatHeader");

  if (homeTopNav) homeTopNav.hidden = !isHome;
  if (flowNav) flowNav.hidden = isHome;
  if (chatHeader) chatHeader.hidden = !isChat;

  if (!isHome && stepMap[screenName]) {
    var step = stepMap[screenName];
    var current = step.progress[step.progress.length - 1];
    var accent = current === "green" ? "#38956d" : current === "gold" ? "#d08a00" : "#d15234";
    var badge = byId("stepBadge");
    var pips = byId("progressPips");

    if (badge) {
      badge.textContent = step.index;
      badge.style.borderColor = accent;
      badge.style.color = accent;
    }
    if (pips) pips.innerHTML = buildProgressPips(step.progress);
  }
}

function showScreen(screenName) {
  all(".screen").forEach(function (screen) {
    screen.classList.toggle("active", screen.dataset.screen === screenName);
  });

  var shell = document.querySelector(".app-shell");
  if (shell) shell.dataset.theme = themeMap[screenName] || "neutral";

  setTopChrome(screenName);
  setText("homePoints", screenName === "complete" ? "17 pt" : "12 pt");
}

function getFallbackReply(step) {
  return fallbackReplies[step] || fallbackReplies.feedback;
}

function buildPayload(step, input) {
  return {
    step: step,
    selectedEmotion: state.postBreathingEmotion || state.homeEmotion,
    context: {
      trigger: state.trigger,
      body: state.body,
      scale: state.scale,
      action: state.action,
      feedback: state.feedback
    },
    input: { text: input }
  };
}

function getAiGuidance(step, input) {
  var value = normalize(input);

  if (!value || window.location.protocol === "file:" || typeof fetch !== "function") {
    return Promise.resolve(getFallbackReply(step));
  }

  return fetch("/api/decide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(step, value))
  })
    .then(function (response) {
      if (!response.ok) throw new Error("DECIDE API failed");
      return response.json();
    })
    .then(function (data) {
      if (data && data.result && data.result.acknowledgement) return data.result;
      return getFallbackReply(step);
    })
    .catch(function () {
      return getFallbackReply(step);
    });
}

function renderAiNote(id, reply) {
  setHtml(
    id,
    "<label>AI 說</label><p>" +
      escapeHtml(reply.acknowledgement) + " " +
      escapeHtml(reply.supportiveLine) + " " +
      escapeHtml(reply.transition) +
      "</p>"
  );
}

function renderConversation(id, userText, reply) {
  setHtml(
    id,
    '<div class="chat-bubble user">' + escapeHtml(userText) + "</div>" +
      '<div class="chat-bubble ai">' + escapeHtml(reply.acknowledgement) +
      "<span>" + escapeHtml(reply.supportiveLine) + "</span></div>" +
      '<div class="chat-bubble ai compact">' + escapeHtml(reply.transition) + "</div>"
  );
}

function submitDecideStep(step, input, source) {
  var value = normalize(input);
  if (!value) return;

  if (step === "trigger") {
    state.trigger = value;
    setText("selectedTriggerText", value);
    getAiGuidance("trigger", value).then(function (reply) {
      renderConversation("triggerResponseArea", value, reply);
      setDisabled("chat1ContinueButton", false);
      setHtml("triggerLeadMessage", '謝謝你願意說出來。先把事情放在這裡，我們一步一步來。<span>你可以選項，也可以自己補充。</span>');
      if (source !== "choice") resetSelected(".chat-option[data-trigger]");
      var inputNode = byId("triggerInput");
      if (inputNode) inputNode.value = "";
    });
    return;
  }

  if (step === "body") {
    state.body = value;
    getAiGuidance("body", value).then(function (reply) {
      renderConversation("bodyResponseArea", value, reply);
      setDisabled("chat2ContinueButton", false);
      setText("bodyLeadMessage", "謝謝你把身體的感覺說出來，這會幫助我們更照顧你。");
      if (source !== "choice") resetSelected(".chat-option[data-body]");
      var inputNode = byId("bodyInput");
      if (inputNode) inputNode.value = "";
    });
  }
}

function bindHome() {
  all("[data-emotion]").forEach(function (card) {
    card.addEventListener("click", function () {
      resetSelected("[data-emotion]");
      card.classList.add("is-selected");
      state.homeEmotion = card.dataset.emotion || "";
      setDisabled("startFlowButton", false);
    });
  });

  var start = byId("startFlowButton");
  if (start) {
    start.addEventListener("click", function () {
      if (!start.disabled) showScreen("breathing");
    });
  }
}

function bindEmotionCheck() {
  all("[data-emotion-check]").forEach(function (card) {
    card.addEventListener("click", function () {
      resetSelected("[data-emotion-check]");
      card.classList.add("is-selected");
      state.postBreathingEmotion = card.dataset.emotionCheck || "";
      setDisabled("emotionDoneButton", false);
    });
  });
}

function bindChoiceList(selector, dataKey, nextStep, inputId, helperId) {
  all(selector).forEach(function (button) {
    button.addEventListener("click", function () {
      var value = button.dataset[dataKey] || "";

      resetSelected(selector);
      button.classList.add("is-selected");

      var options = all(selector);
      if (button === options[options.length - 1]) {
        var input = byId(inputId);
        if (input) input.focus();
        setText(helperId, "你可以直接打字，或按麥克風說給我聽。");
        return;
      }

      submitDecideStep(nextStep, value, "choice");
    });
  });
}

function bindScale() {
  all(".scale-card").forEach(function (card) {
    card.addEventListener("click", function () {
      resetSelected(".scale-card");
      card.classList.add("is-selected");
      state.scale = card.dataset.scale || "";
      setDisabled("scaleDoneButton", false);
      getAiGuidance("scale", state.scale).then(function (reply) {
        renderAiNote("scaleAiNote", reply);
      });
    });
  });
}

function bindActions() {
  all(".action-item").forEach(function (item) {
    item.addEventListener("click", function () {
      resetSelected(".action-item");
      item.classList.add("is-selected");
      state.action = item.dataset.action || "";
      setDisabled("actionDoneButton", false);
      getAiGuidance("action", state.action).then(function (reply) {
        renderAiNote("actionAiNote", reply);
      });
    });
  });
}

function bindFeedback() {
  all(".feedback-card").forEach(function (card) {
    card.addEventListener("click", function () {
      resetSelected(".feedback-card");
      card.classList.add("is-selected");
      state.feedback = card.dataset.feedback || "";
      setDisabled("feedbackDoneButton", false);
      getAiGuidance("feedback", state.feedback).then(function (reply) {
        renderAiNote("feedbackAiNote", reply);
      });
    });
  });
}

function bindButton(id, handler) {
  var button = byId(id);
  if (button) button.addEventListener("click", handler);
}

function bindStaticFlow() {
  bindButton("startBreathingArButton", function () {
    window.open("./modules/ar-ball/index.html", "_blank", "noopener,noreferrer");
    setText("startBreathingArButton", "已開啟 AR，完成後回來");
    setDisabled("breathingDoneButton", false);
  });

  bindButton("breathingDoneButton", function () { showScreen("emotion"); });
  bindButton("emotionDoneButton", function () { showScreen("grounding"); });

  bindButton("startGroundingArButton", function () {
    window.open("./modules/ar-grounding/index.html", "_blank", "noopener,noreferrer");
    setText("startGroundingArButton", "已開啟 AR，完成後回來");
    setDisabled("groundingDoneButton", false);
  });

  bindButton("groundingDoneButton", function () { showScreen("chat1"); });
  bindButton("chat1ContinueButton", function () { showScreen("chat2"); });
  bindButton("chat2ContinueButton", function () { showScreen("scale"); });
  bindButton("scaleDoneButton", function () { showScreen("action"); });
  bindButton("actionDoneButton", function () { showScreen("feedback"); });
  bindButton("feedbackDoneButton", function () {
    setText("completionSummary", "你今天先選了「" + (state.action || "一個小行動") + "」，最後感覺是「" + (state.feedback || "完成練習") + "」。老師和爸媽將收到今天的練習摘要。");
    showScreen("complete");
  });
  bindButton("restartButton", function () { showScreen("home"); });
  bindButton("closeFlowButton", function () { showScreen("home"); });
  bindButton("chat1SendButton", function () {
    var input = byId("triggerInput");
    submitDecideStep("trigger", input ? input.value : "", "typed");
  });
  bindButton("chat2SendButton", function () {
    var input = byId("bodyInput");
    submitDecideStep("body", input ? input.value : "", "typed");
  });
}

function bindEnterSubmit(inputId, step) {
  var input = byId(inputId);
  if (!input) return;

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitDecideStep(step, input.value, "typed");
    }
  });
}

function setupVoiceInput(buttonId, inputId, statusId, idleMessage) {
  var button = byId(buttonId);
  var input = byId(inputId);
  var status = byId(statusId);
  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!button || !input || !status) return;

  if (!Recognition) {
    status.textContent = "目前瀏覽器不支援語音輸入，可以直接打字。";
    button.disabled = true;
    return;
  }

  var recognition = new Recognition();
  recognition.lang = "zh-TW";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  button.addEventListener("click", function () {
    status.textContent = "正在聽你說話...";
    recognition.start();
  });

  recognition.addEventListener("result", function (event) {
    input.value = event.results[0][0].transcript;
    status.textContent = "已幫你填入語音內容，按送出就可以了。";
  });

  recognition.addEventListener("error", function () {
    status.textContent = "剛剛沒有成功收到語音，沒關係，也可以直接打字。";
  });

  recognition.addEventListener("end", function () {
    if (!input.value) status.textContent = idleMessage;
  });
}

function init() {
  bindHome();
  bindEmotionCheck();
  bindChoiceList(".chat-option[data-trigger]", "trigger", "trigger", "triggerInput", "triggerVoiceStatus");
  bindChoiceList(".chat-option[data-body]", "body", "body", "bodyInput", "bodyVoiceStatus");
  bindScale();
  bindActions();
  bindFeedback();
  bindStaticFlow();
  bindEnterSubmit("triggerInput", "trigger");
  bindEnterSubmit("bodyInput", "body");
  setupVoiceInput("triggerMicButton", "triggerInput", "triggerVoiceStatus", "也可以按左邊麥克風說出來。");
  setupVoiceInput("bodyMicButton", "bodyInput", "bodyVoiceStatus", "如果比較想用說的，也可以直接錄音輸入。");
  showScreen("home");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
