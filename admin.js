var passwordKey = "sdg_admin_password";

function byId(id) {
  return document.getElementById(id);
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
        return { error: "Request failed" };
      }).then(function (body) {
        throw new Error(body.error || "Request failed");
      });
    }
    return response.json();
  });
}

function renderStats(stats) {
  var total = Number(stats.total_sessions || 0);
  var completed = Number(stats.completed_sessions || 0);
  var rate = total ? Math.round((completed / total) * 100) : 0;

  byId("totalSessions").textContent = total;
  byId("completedSessions").textContent = completed;
  byId("sessions7d").textContent = Number(stats.sessions_7d || 0);
  byId("completionRate").textContent = rate + "%";
}

function renderRecentSessions(rows) {
  var tbody = byId("recentSessions");
  tbody.innerHTML = "";

  rows.forEach(function (row) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + formatDate(row.started_at) + "</td>" +
      "<td>" + (row.participant_id || "匿名") + "</td>" +
      "<td>" + row.event_count + "</td>" +
      "<td><span class=\"badge " + (row.completed_at ? "" : "open") + "\">" +
      (row.completed_at ? "完成" : "進行中") +
      "</span></td>";

    tr.addEventListener("click", function () {
      loadSessionEvents(row.id);
    });

    tbody.appendChild(tr);
  });
}

function renderChoiceList(id, rows, emptyText) {
  var list = byId(id);
  list.innerHTML = "";

  if (!rows.length) {
    list.textContent = emptyText;
    return;
  }

  rows.forEach(function (row) {
    var div = document.createElement("div");
    div.className = "choice-row";
    div.innerHTML =
      "<div><span>" + (row.step || row.event_type || "-") + "</span><strong>" +
      (row.value || row.event_type || "-") +
      "</strong></div><strong>" + row.count + "</strong>";
    list.appendChild(div);
  });
}

function loadSummary() {
  byId("loginStatus").textContent = "載入後台資料中...";

  return apiGet("summary").then(function (response) {
    var data = response.data;
    setVisible(true);
    renderStats(data.stats || {});
    renderRecentSessions(data.recentSessions || []);
    renderChoiceList("choiceList", data.choices || [], "目前還沒有選項資料。");
    renderChoiceList("eventList", data.events || [], "目前還沒有事件資料。");
    byId("loginStatus").textContent = "已連線到研究後台。";
  }).catch(function (error) {
    setVisible(false);
    byId("loginStatus").textContent = error.message;
  });
}

function loadSessionEvents(sessionId) {
  apiGet("events", { sessionId: sessionId }).then(function (response) {
    var lines = response.data.map(function (event) {
      return [
        formatDate(event.created_at),
        event.event_type,
        event.step || "-",
        event.value || "",
        JSON.stringify(event.payload || {})
      ].join(" | ");
    });

    byId("sessionDetail").textContent = lines.join("\n") || "這個 session 還沒有事件。";
  }).catch(function (error) {
    byId("sessionDetail").textContent = error.message;
  });
}

function exportCsv() {
  var url = "/api/admin?view=export";

  fetch(url, {
    headers: {
      "x-admin-password": getPassword()
    }
  }).then(function (response) {
    if (!response.ok) throw new Error("匯出失敗");
    return response.blob();
  }).then(function (blob) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stop-decide-go-research.csv";
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
