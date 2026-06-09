var state = {
  participantType: "",
  testerProfile: {},
  homeEmotion: "",
  postBreathingEmotion: "",
  trigger: "",
  body: "",
  scale: "",
  need: "",
  wish: "",
  action: "",
  feedback: ""
};

var researchSessionId = getOrCreateSessionId();
var researchStarted = false;

function getOrCreateSessionId() {
  var key = "sdg_research_session_id";
  var existing = "";

  try {
    existing = window.sessionStorage.getItem(key) || "";
  } catch (error) {
    existing = "";
  }

  if (existing) return existing;

  var id = "sdg_" + Date.now() + "_" + Math.random().toString(16).slice(2);

  try {
    window.sessionStorage.setItem(key, id);
  } catch (error) {
    // Browser storage can be unavailable in strict browser modes.
  }

  return id;
}

function sendResearch(action, data) {
  if (window.location.protocol === "file:" || typeof fetch !== "function") return;

  var payload = Object.assign({ action: action, sessionId: researchSessionId }, data || {});

  fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(function () {});
}

function startResearchSession() {
  if (researchStarted) return;
  researchStarted = true;
  sendResearch("start", {
    participantId: state.testerProfile.name || "",
    metadata: {
      appVersion: "entry-profile-v1",
      participantType: state.participantType || "student",
      testerProfile: state.testerProfile || {},
      startedFrom: window.location.pathname || "/"
    }
  });
}

function trackEvent(eventType, step, value, payload) {
  startResearchSession();
  sendResearch("event", {
    eventType: eventType,
    step: step || "",
    value: value || "",
    payload: Object.assign({
      participantType: state.participantType,
      testerProfile: state.testerProfile,
      homeEmotion: state.homeEmotion,
      postBreathingEmotion: state.postBreathingEmotion,
      trigger: state.trigger,
      body: state.body,
      scale: state.scale,
      need: state.need,
      wish: state.wish,
      action: state.action,
      feedback: state.feedback
    }, payload || {})
  });
}

function recordParticipantProfile(type, profile) {
  state.participantType = type;
  state.testerProfile = profile || {};
  startResearchSession();
  trackEvent("participant_profile", "entry", type, {
    participantType: state.participantType,
    testerProfile: state.testerProfile
  });
}

var themeMap = {
  intro: "neutral",
  home: "neutral",
  breathing: "neutral",
  emotion: "neutral",
  grounding: "neutral",
  chat1: "neutral",
  chat2: "neutral",
  scale: "neutral",
  need: "neutral",
  wish: "neutral",
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
  need: { index: "02", progress: ["warm", "gold"] },
  wish: { index: "02", progress: ["warm", "gold"] },
  action: { index: "03", progress: ["warm", "gold", "green"] },
  feedback: { index: "03", progress: ["warm", "gold", "green"] }
};

function byId(id) {
  return document.getElementById(id);
}

function all(selector) {
  return Array.prototype.slice.call(document.querySelectorAll(selector));
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

function setSurveyVisibility() {
  var card = byId("susSurveyCard");
  if (!card) return;
  card.hidden = state.participantType !== "tester";
}

function setDisabled(id, disabled) {
  var node = byId(id);
  if (node) node.disabled = disabled;
}

function resetSelected(selector) {
  all(selector).forEach(function (node) {
    node.classList.remove("is-selected");
  });
}

function includesText(text, keyword) {
  return normalize(text).indexOf(keyword) !== -1;
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
  var isHome = screenName === "intro" || screenName === "home" || screenName === "complete";
  var isChat = screenName === "chat1" || screenName === "chat2" || screenName === "need" || screenName === "wish";
  var shell = document.querySelector(".app-shell");
  var homeTopNav = byId("homeTopNav");
  var flowNav = byId("flowNav");
  var chatHeader = byId("chatHeader");

  if (homeTopNav) homeTopNav.hidden = !isHome;
  if (flowNav) flowNav.hidden = isHome;
  if (chatHeader) chatHeader.hidden = !isChat;
  if (shell) {
    shell.dataset.topNav = isHome ? "visible" : "hidden";
    shell.dataset.flowNav = isHome ? "hidden" : "visible";
    shell.dataset.chatHeader = isChat ? "visible" : "hidden";
  }

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

function triggerFallback(input) {
  if (includesText(input, "誤會")) {
    return {
      acknowledgement: "被誤會的時候，心裡常常會很委屈。",
      supportiveLine: "謝謝你願意把這件事說出來，我會陪你慢慢整理。",
      transition: "我想再知道，這件事讓你的身體哪裡最不舒服？",
      riskLevel: "low"
    };
  }

  if (includesText(input, "功課") || includesText(input, "做不到")) {
    return {
      acknowledgement: "功課太難的時候，真的會讓人很卡、很挫折。",
      supportiveLine: "先不用急著做到完美，我們先看見你現在的壓力。",
      transition: "這個壓力現在比較像出現在身體哪裡？",
      riskLevel: "low"
    };
  }

  if (includesText(input, "朋友") || includesText(input, "衝突")) {
    return {
      acknowledgement: "跟朋友發生衝突，常常會讓心裡又亂又難受。",
      supportiveLine: "你願意停下來說一說，這是很重要的一步。",
      transition: "我想陪你看看，你的身體現在哪裡最有感覺？",
      riskLevel: "low"
    };
  }

  if (includesText(input, "老師")) {
    return {
      acknowledgement: "聽到讓自己難受的話，心裡會縮起來或生氣都很可以理解。",
      supportiveLine: "我們先照顧你現在的感覺，不急著判斷對錯。",
      transition: "這種感覺現在比較卡在身體哪裡？",
      riskLevel: "low"
    };
  }

  return {
    acknowledgement: "有人說了讓你生氣的話，真的很容易一下子火起來。",
    supportiveLine: "謝謝你願意告訴我，我們先一起把感覺放慢。",
    transition: "我想再陪你看看，你的身體哪裡最不舒服？",
    riskLevel: "low"
  };
}

function bodyFallback(input) {
  if (includesText(input, "頭") || includesText(input, "腦")) {
    return {
      acknowledgement: "頭很痛、腦袋很脹的時候，通常代表你已經很用力撐著了。",
      supportiveLine: "你有注意到這個訊號，這很重要。",
      transition: "如果用 1 到 5 分來看，現在大概有幾分？",
      riskLevel: "low"
    };
  }

  if (includesText(input, "心跳") || includesText(input, "胸口")) {
    return {
      acknowledgement: "心跳很快、胸口很悶，身體可能正在提醒你它需要慢下來。",
      supportiveLine: "你說得很清楚，我們可以一起接住這個感覺。",
      transition: "現在這種不舒服大概有幾分？",
      riskLevel: "low"
    };
  }

  if (includesText(input, "手很緊") || includesText(input, "打東西")) {
    return {
      acknowledgement: "手很緊、很想用力，表示那股情緒真的很強。",
      supportiveLine: "先看到它就好，我們不需要被它推著走。",
      transition: "如果用 1 到 5 分來看，這股感覺現在有幾分？",
      riskLevel: "medium"
    };
  }

  if (includesText(input, "發抖") || includesText(input, "熱")) {
    return {
      acknowledgement: "臉熱熱、身體發抖的時候，真的會很不舒服。",
      supportiveLine: "謝謝你把身體的訊號告訴我。",
      transition: "我們用 1 到 5 分看看，現在有多強？",
      riskLevel: "low"
    };
  }

  return {
    acknowledgement: "整個人覺得空白的時候，可能是身體想先保護自己。",
    supportiveLine: "我們可以不用急，先用一個分數看見它。",
    transition: "現在如果用 1 到 5 分來看，大概是幾分？",
    riskLevel: "low"
  };
}

function scaleFallback(input) {
  var score = Number(input);
  if (score >= 4) {
    return {
      acknowledgement: score + " 分代表這個感覺現在真的滿強的。",
      supportiveLine: "你願意誠實說出來，已經是在幫自己了。",
      transition: "我們先選一件最容易開始的小行動，讓身體慢慢降下來。",
      riskLevel: "low"
    };
  }

  if (score === 3) {
    return {
      acknowledgement: "3 分代表這個感覺還在，但你已經能看見它了。",
      supportiveLine: "不用一次全部解決，先挑一個做得到的行動。",
      transition: "下面哪一件事現在最適合你？",
      riskLevel: "low"
    };
  }

  return {
    acknowledgement: score + " 分代表你已經比剛才穩一點了。",
    supportiveLine: "我們可以選一個小小的行動，把這份穩定留下來。",
    transition: "你想先做哪一件事？",
    riskLevel: "low"
  };
}

function needFallback(input) {
  if (includesText(input, "針對") || includesText(input, "不公平")) {
    return {
      acknowledgement: "你提到「" + input + "」，這聽起來真的會讓人很委屈或生氣。",
      supportiveLine: "當心裡覺得不公平時，情緒變強是很自然的。",
      transition: "我們再看看，這件事最讓你在意的是哪一個地方？",
      riskLevel: "low"
    };
  }

  if (includesText(input, "理解") || includesText(input, "沒有人")) {
    return {
      acknowledgement: "你說到「" + input + "」，這可能代表你很希望有人真的聽懂你。",
      supportiveLine: "想被理解不是任性，而是很重要的需要。",
      transition: "我們再找找，這件事真正卡住你的地方是什麼？",
      riskLevel: "low"
    };
  }

  return {
    acknowledgement: "你剛剛說「" + input + "」，AI 有聽見你在努力把心裡的想法說出來。",
    supportiveLine: "把想法說清楚，可以幫我們更了解情緒是從哪裡來的。",
    transition: "接下來我們再看看，這件事最讓你在意的是什麼？",
    riskLevel: "low"
  };
}

function wishFallback(input) {
  if (includesText(input, "尊重") || includesText(input, "看見")) {
    return {
      acknowledgement: "你提到「" + input + "」，這表示你很在意自己有沒有被好好對待。",
      supportiveLine: "這個原因很重要，因為它讓我們更懂你的情緒不是突然來的。",
      transition: "最後我們用 1 到 5 分看看，整理完後現在還有幾分？",
      riskLevel: "low"
    };
  }

  if (includesText(input, "責怪") || includesText(input, "說清楚")) {
    return {
      acknowledgement: "你說「" + input + "」，聽起來你很怕事情被誤會，或自己沒有機會說清楚。",
      supportiveLine: "能把這個原因說出來，已經是在幫自己整理了。",
      transition: "最後我們用 1 到 5 分看看，現在感覺還有多強？",
      riskLevel: "low"
    };
  }

  return {
    acknowledgement: "你剛剛說「" + input + "」，這讓 AI 更知道你真正卡住的地方。",
    supportiveLine: "原因被看見之後，我們就比較能選對下一步。",
    transition: "最後我們用 1 到 5 分看看，現在的感覺有幾分？",
    riskLevel: "low"
  };
}

function actionFallback(input) {
  if (includesText(input, "喝點水")) {
    return {
      acknowledgement: "喝點水、安靜一下，是很適合先讓身體慢下來的方法。",
      supportiveLine: "你不用一次處理全部，先照顧自己就很好。",
      transition: "做完後回來告訴我，感覺有沒有變化。",
      riskLevel: "low"
    };
  }

  if (includesText(input, "老師")) {
    return {
      acknowledgement: "找老師說說話，是一個很勇敢也很實際的選擇。",
      supportiveLine: "有人陪你一起面對，事情會比較不那麼重。",
      transition: "說完後再回來看看，你有沒有比較穩一點。",
      riskLevel: "low"
    };
  }

  if (includesText(input, "走走")) {
    return {
      acknowledgement: "出去走走、動一動，可以幫身體把卡住的感覺放掉一點。",
      supportiveLine: "先換個位置，也是在照顧自己。",
      transition: "走完回來，我們一起看看感覺有沒有變化。",
      riskLevel: "low"
    };
  }

  if (includesText(input, "歌")) {
    return {
      acknowledgement: "聽一首喜歡的歌，可以讓很緊的心慢慢鬆一點。",
      supportiveLine: "這是一個溫柔、也很容易開始的方法。",
      transition: "聽完後回來告訴我，現在感覺如何。",
      riskLevel: "low"
    };
  }

  return {
    acknowledgement: "畫畫或塗鴉可以把說不出來的感覺放到紙上。",
    supportiveLine: "不用畫得漂亮，只要讓感覺有地方出去就好。",
    transition: "畫完後再回來看看，你現在有沒有不同。",
    riskLevel: "low"
  };
}

function feedbackFallback(input) {
  if (includesText(input, "好很多")) {
    return {
      acknowledgement: "太好了，你有感覺到自己慢慢回來了。",
      supportiveLine: "這是你剛剛願意停下來、照顧自己的結果。",
      transition: "我們把這次有幫助的方法記下來。",
      riskLevel: "low"
    };
  }

  if (includesText(input, "平靜")) {
    return {
      acknowledgement: "有平靜一點就很值得，代表身體開始慢慢放鬆了。",
      supportiveLine: "不需要一下子變得完全沒事，比剛剛好一點就很重要。",
      transition: "我們一起完成今天這一步。",
      riskLevel: "low"
    };
  }

  return {
    acknowledgement: "做完後還是很煩，真的會讓人有點失望。",
    supportiveLine: "但你剛剛願意試試看，這本身就很勇敢。",
    transition: "我們先把這一步完成，下次可以再試別的方法。",
    riskLevel: "medium"
  };
}

function getFallbackReply(step, input) {
  if (step === "trigger") return triggerFallback(input);
  if (step === "body") return bodyFallback(input);
  if (step === "scale") return scaleFallback(input);
  if (step === "need") return needFallback(input);
  if (step === "wish") return wishFallback(input);
  if (step === "action") return actionFallback(input);
  return feedbackFallback(input);
}

function buildPayload(step, input) {
  return {
    step: step,
    selectedEmotion: state.postBreathingEmotion || state.homeEmotion,
    context: {
      trigger: state.trigger,
      body: state.body,
      scale: state.scale,
      need: state.need,
      wish: state.wish,
      action: state.action,
      feedback: state.feedback
    },
    input: { text: input }
  };
}

function getAiGuidance(step, input) {
  var value = normalize(input);

  if (!value || window.location.protocol === "file:" || typeof fetch !== "function") {
    return Promise.resolve(getFallbackReply(step, value));
  }

  return fetch("/api/decide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(step, value))
  })
    .then(function (response) {
      return response.json().catch(function () {
        return { error: "Invalid API response" };
      }).then(function (data) {
        if (!response.ok) {
          throw new Error(data.error || data.detail || "DECIDE API failed");
        }
        return data;
      });
    })
    .then(function (data) {
      if (data && data.result && data.result.acknowledgement) {
        data.result.source = "api";
        return data.result;
      }
      return getFallbackReply(step, value);
    })
    .catch(function (error) {
      var reply = getFallbackReply(step, value);
      reply.source = "fallback";
      reply.error = error && error.message ? error.message : "DECIDE API failed";
      return reply;
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

function renderThinking(id) {
  setHtml(id, '<div class="chat-bubble thinking">AI 夥伴正在幫你整理...</div>');
}

function renderConversation(id, userText, reply) {
  setHtml(
    id,
    '<div class="chat-bubble user">' + escapeHtml(userText) + "</div>" +
      '<div class="chat-bubble ai ai-response"><strong>AI 夥伴</strong>' +
      escapeHtml(reply.acknowledgement) +
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
    renderThinking("triggerResponseArea");
    trackEvent("decide_answered", "trigger", value, { source: source });
    getAiGuidance("trigger", value).then(function (reply) {
      trackEvent("ai_guidance", "trigger", reply.riskLevel || "low", {
        acknowledgement: reply.acknowledgement,
        supportiveLine: reply.supportiveLine,
        transition: reply.transition,
        source: reply.source || "fallback"
      });
      renderConversation("triggerResponseArea", value, reply);
      setDisabled("chat1ContinueButton", false);
      setHtml("triggerLeadMessage", '謝謝你願意說出來。先把事情放在這裡，我們一步一步來。<span>AI 會依照你剛剛的回答，陪你走到下一步。</span>');
      if (source !== "choice") resetSelected(".chat-option[data-trigger]");
      var inputNode = byId("triggerInput");
      if (inputNode) inputNode.value = "";
    });
    return;
  }

  if (step === "body") {
    state.body = value;
    setText("selectedBodyText", value);
    renderThinking("bodyResponseArea");
    trackEvent("decide_answered", "body", value, { source: source });
    getAiGuidance("body", value).then(function (reply) {
      trackEvent("ai_guidance", "body", reply.riskLevel || "low", {
        acknowledgement: reply.acknowledgement,
        supportiveLine: reply.supportiveLine,
        transition: reply.transition,
        source: reply.source || "fallback"
      });
      renderConversation("bodyResponseArea", value, reply);
      setDisabled("chat2ContinueButton", false);
      setText("bodyLeadMessage", "謝謝你把身體的感覺說出來，AI 會陪你把它整理成下一步。");
      if (source !== "choice") resetSelected(".chat-option[data-body]");
      var inputNode = byId("bodyInput");
      if (inputNode) inputNode.value = "";
    });
    return;
  }

  if (step === "need" || step === "wish") {
    var config = step === "need"
      ? {
          stateKey: "need",
          responseId: "needResponseArea",
          continueId: "needDoneButton",
          inputId: "needInput",
          selectedTextId: "selectedNeedText",
          nextLeadId: "needLeadMessage",
          nextLeadText: "謝謝你把心裡的想法說出來。AI 會陪你再找找更深一點的原因。",
          selector: ".chat-option[data-need]"
        }
      : {
          stateKey: "wish",
          responseId: "wishResponseArea",
          continueId: "wishDoneButton",
          inputId: "wishInput",
          selectedTextId: "",
          nextLeadId: "wishLeadMessage",
          nextLeadText: "你已經把真正卡住的地方說得更清楚了。最後我們幫現在的感覺評分。",
          selector: ".chat-option[data-wish]"
        };

    state[config.stateKey] = value;
    if (config.selectedTextId) setText(config.selectedTextId, value);
    renderThinking(config.responseId);
    trackEvent("decide_answered", step, value, { source: source });
    getAiGuidance(step, value).then(function (reply) {
      trackEvent("ai_guidance", step, reply.riskLevel || "low", {
        acknowledgement: reply.acknowledgement,
        supportiveLine: reply.supportiveLine,
        transition: reply.transition,
        source: reply.source || "fallback"
      });
      renderConversation(config.responseId, value, reply);
      setDisabled(config.continueId, false);
      setText(config.nextLeadId, config.nextLeadText);
      if (source !== "choice") resetSelected(config.selector);
      var inputNode = byId(config.inputId);
      if (inputNode) inputNode.value = "";
    });
  }
}

function getRadioValue(name) {
  var selected = document.querySelector('input[name="' + name + '"]:checked');
  return selected ? selected.value : "";
}

function bindEntry() {
  bindButton("studentEntryButton", function () {
    recordParticipantProfile("student", {});
    showScreen("home");
  });

  var form = byId("testerForm");
  if (!form) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var profile = {
      gender: byId("testerGender") ? byId("testerGender").value : "",
      ageGroup: byId("testerAge") ? byId("testerAge").value : "",
      occupation: byId("testerOccupation") ? byId("testerOccupation").value : "",
      nameConsent: getRadioValue("testerNameConsent"),
      name: byId("testerName") ? normalize(byId("testerName").value) : ""
    };

    if (profile.nameConsent !== "願意") {
      profile.name = "";
    }

    recordParticipantProfile("tester", profile);
    showScreen("home");
  });
}

function bindHome() {
  all("[data-emotion]").forEach(function (card) {
    card.addEventListener("click", function () {
      resetSelected("[data-emotion]");
      card.classList.add("is-selected");
      state.homeEmotion = card.dataset.emotion || "";
      setDisabled("startFlowButton", false);
      trackEvent("emotion_selected", "home", state.homeEmotion);
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
      trackEvent("emotion_selected", "post_breathing", state.postBreathingEmotion);
    });
  });
}

function bindChoiceList(selector, dataKey, nextStep, inputId, helperId) {
  all(selector).forEach(function (button) {
    button.addEventListener("click", function () {
      var value = button.dataset[dataKey] || "";
      var options = all(selector);

      resetSelected(selector);
      button.classList.add("is-selected");

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
      trackEvent("decide_answered", "scale", state.scale);
      getAiGuidance("scale", state.scale).then(function (reply) {
        trackEvent("ai_guidance", "scale", reply.riskLevel || "low", {
          acknowledgement: reply.acknowledgement,
          supportiveLine: reply.supportiveLine,
          transition: reply.transition,
          source: reply.source || "fallback"
        });
        renderAiNote("scaleAiNote", reply);
      });
    });
  });
}

function bindDecisionItems(selector, stateKey, step, noteId, doneButtonId) {
  all(selector).forEach(function (item) {
    item.addEventListener("click", function () {
      resetSelected(selector);
      item.classList.add("is-selected");
      state[stateKey] = item.dataset[stateKey] || "";
      setDisabled(doneButtonId, false);
      trackEvent("decide_answered", step, state[stateKey]);
      getAiGuidance(step, state[stateKey]).then(function (reply) {
        trackEvent("ai_guidance", step, reply.riskLevel || "low", {
          acknowledgement: reply.acknowledgement,
          supportiveLine: reply.supportiveLine,
          transition: reply.transition,
          source: reply.source || "fallback"
        });
        renderAiNote(noteId, reply);
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
      trackEvent("decide_answered", "action", state.action);
      getAiGuidance("action", state.action).then(function (reply) {
        trackEvent("ai_guidance", "action", reply.riskLevel || "low", {
          acknowledgement: reply.acknowledgement,
          supportiveLine: reply.supportiveLine,
          transition: reply.transition,
          source: reply.source || "fallback"
        });
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
      trackEvent("decide_answered", "feedback", state.feedback);
      getAiGuidance("feedback", state.feedback).then(function (reply) {
        trackEvent("ai_guidance", "feedback", reply.riskLevel || "low", {
          acknowledgement: reply.acknowledgement,
          supportiveLine: reply.supportiveLine,
          transition: reply.transition,
          source: reply.source || "fallback"
        });
        renderAiNote("feedbackAiNote", reply);
      });
    });
  });
}

function bindButton(id, handler) {
  var button = byId(id);
  if (button) button.addEventListener("click", handler);
}

function openArModule(path) {
  var url = new URL(path, window.location.href).href;
  var opened = null;

  try {
    opened = window.open(url, "_blank");
  } catch (error) {
    opened = null;
  }

  if (!opened) {
    window.location.href = url;
  }
}

function bindStaticFlow() {
  bindButton("startBreathingArButton", function () {
    openArModule("./modules/ar-ball/index.html");
    setText("startBreathingArButton", "已開啟 AR，完成後回來");
    setDisabled("breathingDoneButton", false);
    trackEvent("ar_started", "breathing", "ar-ball");
  });

  bindButton("breathingDoneButton", function () {
    trackEvent("step_completed", "breathing", "done");
    showScreen("emotion");
  });
  bindButton("emotionDoneButton", function () {
    trackEvent("step_completed", "emotion", state.postBreathingEmotion);
    showScreen("grounding");
  });

  bindButton("startGroundingArButton", function () {
    openArModule("./modules/ar-grounding/index.html");
    setText("startGroundingArButton", "已開啟 AR，完成後回來");
    setDisabled("groundingDoneButton", false);
    trackEvent("ar_started", "grounding", "ar-grounding");
  });

  bindButton("groundingDoneButton", function () {
    trackEvent("step_completed", "grounding", "done");
    showScreen("chat1");
  });
  bindButton("chat1ContinueButton", function () { showScreen("chat2"); });
  bindButton("chat2ContinueButton", function () { showScreen("need"); });
  bindButton("scaleDoneButton", function () {
    trackEvent("step_completed", "scale", state.scale);
    showScreen("action");
  });
  bindButton("needDoneButton", function () {
    trackEvent("step_completed", "need", state.need);
    showScreen("wish");
  });
  bindButton("wishDoneButton", function () {
    trackEvent("step_completed", "wish", state.wish);
    showScreen("scale");
  });
  bindButton("actionDoneButton", function () {
    trackEvent("step_completed", "action", state.action);
    showScreen("feedback");
  });
  bindButton("feedbackDoneButton", function () {
    setText("completionSummary", "你今天先選了「" + (state.action || "一個小行動") + "」，最後感覺是「" + (state.feedback || "完成練習") + "」。老師和爸媽將收到今天的練習摘要。");
    setSurveyVisibility();
    sendResearch("complete", {
      metadata: {
        participantType: state.participantType,
        testerProfile: state.testerProfile,
        homeEmotion: state.homeEmotion,
        postBreathingEmotion: state.postBreathingEmotion,
        trigger: state.trigger,
        body: state.body,
        scale: state.scale,
        need: state.need,
        wish: state.wish,
        action: state.action,
        feedback: state.feedback
      }
    });
    showScreen("complete");
  });
  bindButton("restartButton", function () {
    setSurveyVisibility();
    showScreen("home");
  });
  bindButton("closeFlowButton", function () { showScreen("home"); });
  bindButton("chat1SendButton", function () {
    var input = byId("triggerInput");
    submitDecideStep("trigger", input ? input.value : "", "typed");
  });
  bindButton("chat2SendButton", function () {
    var input = byId("bodyInput");
    submitDecideStep("body", input ? input.value : "", "typed");
  });
  bindButton("chat3SendButton", function () {
    var input = byId("needInput");
    submitDecideStep("need", input ? input.value : "", "typed");
  });
  bindButton("chat4SendButton", function () {
    var input = byId("wishInput");
    submitDecideStep("wish", input ? input.value : "", "typed");
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
  bindEntry();
  bindHome();
  bindEmotionCheck();
  bindChoiceList(".chat-option[data-trigger]", "trigger", "trigger", "triggerInput", "triggerVoiceStatus");
  bindChoiceList(".chat-option[data-body]", "body", "body", "bodyInput", "bodyVoiceStatus");
  bindChoiceList(".chat-option[data-need]", "need", "need", "needInput", "needVoiceStatus");
  bindChoiceList(".chat-option[data-wish]", "wish", "wish", "wishInput", "wishVoiceStatus");
  bindScale();
  bindActions();
  bindFeedback();
  bindStaticFlow();
  bindEnterSubmit("triggerInput", "trigger");
  bindEnterSubmit("bodyInput", "body");
  bindEnterSubmit("needInput", "need");
  bindEnterSubmit("wishInput", "wish");
  setupVoiceInput("triggerMicButton", "triggerInput", "triggerVoiceStatus", "也可以按左邊麥克風說出來。");
  setupVoiceInput("bodyMicButton", "bodyInput", "bodyVoiceStatus", "如果比較想用說的，也可以直接錄音輸入。");
  setupVoiceInput("needMicButton", "needInput", "needVoiceStatus", "也可以按左邊麥克風說出來。");
  setupVoiceInput("wishMicButton", "wishInput", "wishVoiceStatus", "如果比較想用說的，也可以直接錄音輸入。");
  showScreen("intro");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
