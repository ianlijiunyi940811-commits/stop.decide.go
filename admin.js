var passwordKey = "sdg_admin_password";
var latestRows = [];

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getPassword() {
  return sessionStorage.getItem(passwordKey) || "";
}

function setVisible(loggedIn) {
  byId("toolbar").hidden = !loggedIn;
  byId("statsGrid").hidden = !loggedIn;
  byId("chartGrid").hidden = !loggedIn;
  byId("adminContent").hidden = !loggedIn;
}

function apiGet(view, params) {
  var query = new URLSearchParams(params || {});
  query.set("view", view);

  return fetch("/api/admin?" + query.toString(), {
    headers: {
      "x-admin-password": getPassword()
    }
  }).then(function (response) {
    if (!response.ok) {
      return response.json().catch(function () {
        return { error: "連線失敗" };
      }).then(function (body) {
        throw new Error(body.error || "連線失敗");
      });
    }
    return response.json();
  });
}

function renderStats(stats) {
  byId("totalSessions").textContent = Number(stats.total_sessions || 0);
  byId("completedSessions").textContent = Number(stats.completed_sessions || 0);
  byId("sessions7d").textContent = Number(stats.sessions_7d || 0);
  byId("completionRate").textContent = Number(stats.completion_rate || 0) + "%";
}

function renderBarChart(id, rows, emptyText) {
  var node = byId(id);
  node.innerHTML = "";

  if (!rows || !rows.length) {
    node.innerHTML = '<div class="empty-state">' + escapeHtml(emptyText) + "</div>";
    return;
  }

  var max = rows.reduce(function (largest, row) {
    return Math.max(largest, Number(row.count || 0));
  }, 1);

  rows.forEach(function (row) {
    var percent = Math.max(5, Math.round((Number(row.count || 0) / max) * 100));
    var item = document.createElement("div");
    item.className = "bar-row";
    item.innerHTML =
      '<div class="bar-label"><span>' + escapeHtml(row.label || "未填答") +
      "</span><strong>" + Number(row.count || 0) + "</strong></div>" +
      '<div class="bar-track"><i style="width: ' + percent + '%"></i></div>';
    node.appendChild(item);
  });
}

function renderPieChart(id, rows) {
  var node = byId(id);
  node.innerHTML = "";

  if (!rows || !rows.length) {
    node.innerHTML = '<div class="empty-state">目前還沒有情緒變化資料。</div>';
    return;
  }

  var colors = ["#38956d", "#d08a00", "#d15234", "#8f887f"];
  var total = rows.reduce(function (sum, row) {
    return sum + Number(row.count || 0);
  }, 0);
  var offset = 25;
  var circles = rows.map(function (row, index) {
    var value = total ? (Number(row.count || 0) / total) * 100 : 0;
    var circle =
      '<circle r="15.9" cx="18" cy="18" fill="transparent" stroke="' + colors[index % colors.length] +
      '" stroke-width="8" stroke-dasharray="' + value + ' ' + (100 - value) +
      '" stroke-dashoffset="' + offset + '"></circle>';
    offset -= value;
    return circle;
  }).join("");

  var legend = rows.map(function (row, index) {
    return '<div class="legend-row"><i style="background:' + colors[index % colors.length] +
      '"></i><span>' + escapeHtml(row.label || "未分類") +
      '</span><strong>' + Number(row.count || 0) + "</strong></div>";
  }).join("");

  node.innerHTML =
    '<svg viewBox="0 0 36 36" class="pie-chart">' + circles + "</svg>" +
    '<div class="pie-legend">' + legend + "</div>";
}

function renderCharts(charts) {
  renderBarChart("triggerChart", charts.triggers || [], "目前還沒有衝突原因資料。");
  renderPieChart("improvementChart", charts.emotionImprovement || []);
  renderBarChart("homeEmotionChart", charts.homeEmotions || [], "目前還沒有初始情緒資料。");
  renderBarChart("actionChart", charts.actions || [], "目前還沒有 GO 行動資料。");
}

function emotionPair(row) {
  var before = row.homeEmotion || "未填";
  var after = row.postBreathingEmotion || "未填";
  return before + " → " + after;
}

function renderRecentSessions(rows) {
  latestRows = rows || [];
  var tbody = byId("recentSessions");
  tbody.innerHTML = "";

  if (!latestRows.length) {
    tbody.innerHTML = '<tr><td colspan="6">目前還沒有受試者資料。請先完成一次前台流程。</td></tr>';
    return;
  }

  latestRows.forEach(function (row) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td><strong>" + escapeHtml(row.participantLabel) + "</strong></td>" +
      "<td>" + formatDate(row.startedAt) + "</td>" +
      "<td>" + escapeHtml(emotionPair(row)) + '<br><span class="mini">' + escapeHtml(row.emotionImproved) + "</span></td>" +
      "<td>" + escapeHtml(row.trigger || "未填答") + "</td>" +
      "<td>" + escapeHtml(row.action || "未填答") + "</td>" +
      '<td><span class="badge ' + (row.completed ? "" : "open") + '">' +
      (row.completed ? "完成" : "進行中") +
      "</span></td>";

    tr.addEventListener("click", function () {
      renderSessionDetail(row);
    });

    tbody.appendChild(tr);
  });
}

function renderFlowSection(row) {
  var items = [
    ["初始情緒", row.homeEmotion],
    ["STOP 呼吸後情緒", row.postBreathingEmotion],
    ["情緒是否改善", row.emotionImproved],
    ["DECIDE 衝突原因", row.trigger],
    ["DECIDE 身體感受", row.body],
    ["DECIDE 強度分數", row.scale ? row.scale + " 分" : ""],
    ["DECIDE 情緒背後想法", row.need],
    ["DECIDE 深層在意原因", row.wish],
    ["GO 行動選擇", row.action],
    ["完成後感覺", row.feedback]
  ];

  return '<div class="flow-grid">' + items.map(function (item) {
    return '<div class="flow-card"><span>' + escapeHtml(item[0]) +
      '</span><strong>' + escapeHtml(item[1] || "未填答") + "</strong></div>";
  }).join("") + "</div>";
}

function renderAiSection(row) {
  if (!row.aiConversation || !row.aiConversation.length) {
    return '<div class="empty-state">這位受試者目前沒有 AI 回覆紀錄。</div>';
  }

  return '<div class="ai-log">' + row.aiConversation.map(function (item) {
    return '<article>' +
      '<div><strong>' + escapeHtml(item.step) + '</strong><span>' + formatDate(item.time) + '</span></div>' +
      '<p>' + escapeHtml(item.acknowledgement) + '</p>' +
      '<p>' + escapeHtml(item.supportiveLine) + '</p>' +
      '<small>風險：' + escapeHtml(item.risk || "low") + "｜來源：" + escapeHtml(item.source || "unknown") + "</small>" +
      "</article>";
  }).join("") + "</div>";
}

function renderTimeline(row) {
  if (!row.timeline || !row.timeline.length) return "";

  return '<details class="timeline"><summary>查看原始流程事件</summary>' +
    row.timeline.map(function (item) {
      return '<div><span>' + formatDate(item.time) + '</span><strong>' +
        escapeHtml(item.step || item.type) + '</strong><em>' +
        escapeHtml(item.value || item.rawValue || "") + "</em></div>";
    }).join("") +
    "</details>";
}

function renderSessionDetail(row) {
  byId("detailSubtitle").textContent =
    row.participantLabel + "｜" + formatDate(row.startedAt) + "｜AI 回覆 " + row.aiReplyCount + " 次";

  byId("sessionDetail").innerHTML =
    renderFlowSection(row) +
    '<h3>AI 陪伴 DECIDE 紀錄</h3>' +
    renderAiSection(row) +
    renderTimeline(row);
}

function loadSummary() {
  byId("loginStatus").textContent = "正在讀取研究資料...";

  return apiGet("summary").then(function (response) {
    var data = response.data || {};
    setVisible(true);
    renderStats(data.stats || {});
    renderCharts(data.charts || {});
    renderRecentSessions(data.recentSessions || []);
    byId("loginStatus").textContent = "已連線到研究後台。";
    if ((data.recentSessions || []).length) renderSessionDetail(data.recentSessions[0]);
  }).catch(function (error) {
    setVisible(false);
    byId("loginStatus").textContent = error.message;
  });
}

function exportCsv() {
  fetch("/api/admin?view=export", {
    headers: {
      "x-admin-password": getPassword()
    }
  }).then(function (response) {
    if (!response.ok) throw new Error("匯出失敗");
    return response.blob();
  }).then(function (blob) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stop-decide-go-flow-records.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }).catch(function (error) {
    byId("loginStatus").textContent = error.message;
  });
}

byId("loginForm").addEventListener("submit", function (event) {
  event.preventDefault();
  sessionStorage.setItem(passwordKey, byId("adminPassword").value);
  loadSummary();
});

byId("refreshButton").addEventListener("click", loadSummary);
byId("exportButton").addEventListener("click", exportCsv);
byId("logoutButton").addEventListener("click", function () {
  sessionStorage.removeItem(passwordKey);
  byId("adminPassword").value = "";
  setVisible(false);
  byId("loginStatus").textContent = "已登出。";
});

if (getPassword()) {
  byId("adminPassword").value = getPassword();
  loadSummary();
}
