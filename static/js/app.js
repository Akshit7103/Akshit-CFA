// ── State ────────────────────────────────────────────────────────────
let TOPICS = [];
let PROGRESS = {};
let SCORES = [];
let PLANNER = [];
let activeChecklistCat = "videos";

// ── Init ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await loadAll();
  setupNav();
  showSection("dashboard");
  startCountdown();
});

async function loadAll() {
  const [topicsRes, progressRes, scoresRes, plannerRes] = await Promise.all([
    fetch("/api/topics").then(r => r.json()),
    fetch("/api/progress").then(r => r.json()),
    fetch("/api/scores").then(r => r.json()),
    fetch("/api/planner").then(r => r.json()),
  ]);
  TOPICS = topicsRes;
  PROGRESS = progressRes;
  SCORES = scoresRes;
  PLANNER = plannerRes;
}

// ── Navigation ───────────────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll(".nav-links button").forEach(btn => {
    btn.addEventListener("click", () => {
      showSection(btn.dataset.section);
    });
  });
}

function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll(".nav-links button").forEach(b => b.classList.remove("active"));
  document.querySelector(`.nav-links button[data-section="${id}"]`)?.classList.add("active");

  if (id === "dashboard") renderDashboard();
  else if (id === "planner") renderPlanner();
  else if (id === "checklists") renderChecklists();
  else if (id === "scores") renderScores();
}

// ── Dashboard ────────────────────────────────────────────────────────
function renderDashboard() {
  const totalReadings = TOPICS.reduce((s, t) => s + t.readings.length, 0);
  const cl = PROGRESS.checklists || {};

  let doneVideos = 0, doneKaplan = 0, doneCfai = 0;
  for (const key of Object.keys(cl)) {
    if (cl[key].videos) doneVideos++;
    if (cl[key].kaplan) doneKaplan++;
    if (cl[key].cfai) doneCfai++;
  }
  const totalDone = doneVideos + doneKaplan + doneCfai;
  const totalAll = totalReadings * 3;
  const overallPct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

  // Ring
  const circumference = 2 * Math.PI * 85;
  const offset = circumference - (overallPct / 100) * circumference;
  const ring = document.getElementById("progress-ring");
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = offset;
  document.getElementById("ring-pct").textContent = overallPct + "%";
  document.getElementById("ring-sub").textContent = `${totalDone} / ${totalAll} items`;

  // Legend
  document.getElementById("legend-videos").textContent = `${doneVideos} / ${totalReadings}`;
  document.getElementById("legend-kaplan").textContent = `${doneKaplan} / ${totalReadings}`;
  document.getElementById("legend-cfai").textContent = `${doneCfai} / ${totalReadings}`;

  // Topic progress
  const topicList = document.getElementById("topic-progress-list");
  topicList.innerHTML = "";
  let globalIdx = 0;
  TOPICS.forEach((topic, ti) => {
    let tDone = 0;
    const tTotal = topic.readings.length * 3;
    topic.readings.forEach((_, ri) => {
      const key = `${ti}_${ri}`;
      const c = cl[key] || {};
      if (c.videos) tDone++;
      if (c.kaplan) tDone++;
      if (c.cfai) tDone++;
    });
    const pct = tTotal > 0 ? Math.round((tDone / tTotal) * 100) : 0;
    let statusClass, statusText;
    if (pct === 0) { statusClass = "status-not-started"; statusText = "Not Started"; }
    else if (pct < 100) { statusClass = "status-in-progress"; statusText = "In Progress"; }
    else { statusClass = "status-complete"; statusText = "Complete"; }

    const row = document.createElement("div");
    row.className = "topic-row fade-up";
    row.style.animationDelay = `${globalIdx * 0.06}s`;
    row.innerHTML = `
      <div class="topic-name" title="${topic.name}">${topic.name}</div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
      <div class="topic-pct">${pct}%</div>
      <div class="topic-status ${statusClass}">${statusText}</div>
    `;
    topicList.appendChild(row);
    globalIdx++;
  });
}

// ── Planner ──────────────────────────────────────────────────────────
function getTopicProgress(topicIdx) {
  if (topicIdx === null || topicIdx === undefined) return null;
  const cl = PROGRESS.checklists || {};
  const topic = TOPICS[topicIdx];
  if (!topic) return null;
  const total = topic.readings.length;
  let videos = 0, kaplan = 0, cfai = 0;
  topic.readings.forEach((_, ri) => {
    const key = `${topicIdx}_${ri}`;
    const c = cl[key] || {};
    if (c.videos) videos++;
    if (c.kaplan) kaplan++;
    if (c.cfai) cfai++;
  });
  return { total, videos, kaplan, cfai };
}

function renderPlanner() {
  const container = document.getElementById("planner-cards");
  container.innerHTML = "";
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  PLANNER.forEach((item, i) => {
    const startDate = new Date(item.start + "T00:00:00");
    const endDate = new Date(item.end + "T23:59:59");
    const endDateClean = new Date(item.end + "T00:00:00");
    const isReview = item.topic_idx === null;
    const isCurrent = now >= startDate && now <= endDate;
    const isCompleted = now > endDate;

    // Days remaining
    let daysRemaining = 0;
    if (isCompleted) daysRemaining = 0;
    else if (isCurrent) daysRemaining = Math.ceil((endDateClean - now) / 86400000);
    else daysRemaining = item.days;

    // Time progress within the period
    let timePct = 0;
    if (isCompleted) timePct = 100;
    else if (isCurrent) {
      const total = endDate - startDate;
      const elapsed = now - startDate;
      timePct = Math.min(100, Math.round((elapsed / total) * 100));
    }

    let statusClass = "upcoming";
    let statusText = "Upcoming";
    if (isCurrent) { statusClass = "active"; statusText = "In Progress"; }
    else if (isCompleted) { statusClass = "done"; statusText = "Completed"; }

    const cardClass = isReview ? "review-card" : "topic-card";
    const highlightClass = isCurrent ? "current-topic" : (isCompleted ? "completed-topic" : "");

    // Days remaining display
    let daysRemainingHTML = "";
    if (isCompleted) {
      daysRemainingHTML = `<span style="color:var(--green);font-weight:700;">Done</span>`;
    } else if (isCurrent) {
      daysRemainingHTML = `<span class="planner-days-remaining">${daysRemaining} days left</span>`;
    } else {
      daysRemainingHTML = `<span style="color:var(--text3);">${item.days} days</span>`;
    }

    // Checklist progress
    const prog = getTopicProgress(item.topic_idx);
    let progressHTML = "";
    if (prog) {
      const vPct = prog.total > 0 ? Math.round((prog.videos / prog.total) * 100) : 0;
      const kPct = prog.total > 0 ? Math.round((prog.kaplan / prog.total) * 100) : 0;
      const cPct = prog.total > 0 ? Math.round((prog.cfai / prog.total) * 100) : 0;
      progressHTML = `
        <div class="planner-checklist-progress">
          <div class="planner-prog-row">
            <div class="planner-prog-label">MM Videos</div>
            <div class="planner-prog-track"><div class="planner-prog-fill videos" style="width:${vPct}%"></div></div>
            <div class="planner-prog-count">${prog.videos}/${prog.total}</div>
          </div>
          <div class="planner-prog-row">
            <div class="planner-prog-label">Kaplan Read</div>
            <div class="planner-prog-track"><div class="planner-prog-fill kaplan" style="width:${kPct}%"></div></div>
            <div class="planner-prog-count">${prog.kaplan}/${prog.total}</div>
          </div>
          <div class="planner-prog-row">
            <div class="planner-prog-label">CFAI Questions</div>
            <div class="planner-prog-track"><div class="planner-prog-fill cfai" style="width:${cPct}%"></div></div>
            <div class="planner-prog-count">${prog.cfai}/${prog.total}</div>
          </div>
        </div>
      `;
    }

    // Reorder buttons
    const upBtn = i > 0 ? `<button class="planner-reorder-btn" onclick="reorderPlanner(${item.id},'up')" title="Move up">&#9650;</button>` : `<span class="planner-reorder-btn disabled"></span>`;
    const downBtn = i < PLANNER.length - 1 ? `<button class="planner-reorder-btn" onclick="reorderPlanner(${item.id},'down')" title="Move down">&#9660;</button>` : `<span class="planner-reorder-btn disabled"></span>`;

    const card = document.createElement("div");
    card.className = `planner-card ${cardClass} ${highlightClass} fade-up`;
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <div class="planner-card-header">
        <div class="planner-card-title">${item.name}</div>
        <div class="planner-header-controls">
          <div class="planner-reorder-group">${upBtn}${downBtn}</div>
          <div class="planner-card-badge">${item.topic_idx !== null ? i + 1 : "R"}</div>
        </div>
      </div>
      <div class="planner-card-body">
        <div>
          <div class="planner-label">Start</div>
          <div class="planner-value">
            ${i === 0
              ? `<input type="date" class="planner-date-input" value="${item.start}" onchange="updatePlannerStart(${item.id}, this.value)">`
              : formatPlanDate(item.start)
            }
          </div>
        </div>
        <div>
          <div class="planner-label">Study Days</div>
          <div class="planner-value">
            <input type="number" class="planner-days-input" value="${item.days}" min="1" max="120"
                   onchange="updatePlannerDays(${item.id}, this.value)">
          </div>
        </div>
        <div>
          <div class="planner-label">End</div>
          <div class="planner-value">${formatPlanDate(item.end)}</div>
        </div>
        <div>
          <div class="planner-label">Days Remaining</div>
          <div class="planner-value">${daysRemainingHTML}</div>
        </div>
      </div>
      <div class="planner-time-bar">
        <div class="planner-time-fill" style="width:${timePct}%"></div>
      </div>
      ${progressHTML}
    `;
    container.appendChild(card);
  });
}

async function updatePlannerDays(id, value) {
  const days = parseInt(value);
  if (!days || days < 1) return;
  const res = await fetch("/api/planner/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, days }),
  });
  PLANNER = await res.json();
  renderPlanner();
  showToast("Schedule updated!");
}

async function updatePlannerStart(id, value) {
  if (!value) return;
  const res = await fetch("/api/planner/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, start: value }),
  });
  PLANNER = await res.json();
  renderPlanner();
  showToast("Start date updated!");
}

async function reorderPlanner(id, direction) {
  const res = await fetch("/api/planner/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, direction }),
  });
  PLANNER = await res.json();
  renderPlanner();
  showToast("Order updated!");
}

function formatPlanDate(isoStr) {
  const d = new Date(isoStr + "T00:00:00");
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${String(d.getDate()).padStart(2,"0")} ${d.getFullYear()}`;
}

// ── Countdown ────────────────────────────────────────────────────────
function startCountdown() {
  const examDate = new Date("2026-08-24T00:00:00");
  const now = new Date();
  const diff = examDate - now;
  const days = Math.max(0, Math.ceil(diff / 86400000));
  const weeks = Math.floor(days / 7);
  document.getElementById("cd-days").textContent = days;
  document.getElementById("cd-weeks").textContent = weeks;
}

// ── Checklists ───────────────────────────────────────────────────────
function renderChecklists() {
  document.querySelectorAll(".checklist-tabs button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cat === activeChecklistCat);
    btn.onclick = () => {
      activeChecklistCat = btn.dataset.cat;
      renderChecklists();
    };
  });

  const container = document.getElementById("checklist-content");
  container.innerHTML = "";
  const cl = PROGRESS.checklists || {};
  let globalNum = 0;

  TOPICS.forEach((topic, ti) => {
    const section = document.createElement("div");
    section.className = "topic-checklist";

    const prereqs = (activeChecklistCat === "videos" && topic.mm_prereqs) ? topic.mm_prereqs : [];
    const totalItems = prereqs.length + topic.readings.length;

    let topicDone = 0;
    prereqs.forEach((_, pi) => {
      const key = `${ti}_prereq_${pi}`;
      if ((cl[key] || {})[activeChecklistCat]) topicDone++;
    });
    topic.readings.forEach((_, ri) => {
      const key = `${ti}_${ri}`;
      if ((cl[key] || {})[activeChecklistCat]) topicDone++;
    });

    section.innerHTML = `
      <div class="topic-checklist-header">
        <span>${topic.name}</span>
        <span class="t-count">${topicDone} / ${totalItems}</span>
      </div>
    `;

    prereqs.forEach((prereq, pi) => {
      globalNum++;
      const key = `${ti}_prereq_${pi}`;
      const isDone = (cl[key] || {})[activeChecklistCat] || false;
      const item = document.createElement("div");
      item.className = `check-item ${isDone ? "done" : ""}`;
      item.innerHTML = `
        <div class="check-num">${globalNum}</div>
        <div class="check-name" style="color:var(--amber);font-weight:600;">${prereq}</div>
        <div class="check-box ${isDone ? "checked" : ""}" data-key="${key}" data-cat="${activeChecklistCat}"></div>
      `;
      item.querySelector(".check-box").addEventListener("click", handleCheckClick(key));
      section.appendChild(item);
    });

    topic.readings.forEach((reading, ri) => {
      globalNum++;
      const key = `${ti}_${ri}`;
      const isDone = (cl[key] || {})[activeChecklistCat] || false;
      const item = document.createElement("div");
      item.className = `check-item ${isDone ? "done" : ""}`;
      item.innerHTML = `
        <div class="check-num">${globalNum}</div>
        <div class="check-name">${reading}</div>
        <div class="check-box ${isDone ? "checked" : ""}" data-key="${key}" data-cat="${activeChecklistCat}"></div>
      `;
      item.querySelector(".check-box").addEventListener("click", handleCheckClick(key));
      section.appendChild(item);
    });

    container.appendChild(section);
  });
}

function handleCheckClick(key) {
  return async (e) => {
    e.stopPropagation();
    const box = e.currentTarget;
    box.classList.add("check-pop");
    const res = await fetch("/api/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: box.dataset.key, cat: box.dataset.cat }),
    });
    const data = await res.json();
    if (!PROGRESS.checklists) PROGRESS.checklists = {};
    if (!PROGRESS.checklists[key]) PROGRESS.checklists[key] = { videos: false, kaplan: false, cfai: false };
    PROGRESS.checklists[key][activeChecklistCat] = data.value;
    renderChecklists();
    showToast(data.value ? "Marked complete!" : "Unmarked");
  };
}

// ── Score Tracker ────────────────────────────────────────────────────
let scoreChart = null;

function renderScores() {
  renderScoreTable();
  renderScoreChart();
}

function renderScoreTable() {
  const tbody = document.getElementById("score-tbody");
  tbody.innerHTML = "";
  SCORES.forEach((s, i) => {
    const pass = s.score >= 70;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${s.name}</td>
      <td>${s.date}</td>
      <td class="${pass ? "score-pass" : "score-fail"}">${s.score}%</td>
      <td>70%</td>
      <td class="${pass ? "score-pass" : "score-fail"}">${pass ? "Pass" : "Fail"}</td>
      <td>${s.notes || ""}</td>
      <td><button class="btn btn-danger" onclick="deleteScore(${i})">Del</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderScoreChart() {
  if (SCORES.length === 0) {
    const ctx = document.getElementById("scoreChart");
    if (ctx) {
      ctx.parentElement.innerHTML = '<div style="text-align:center;color:var(--text3);padding:60px 0;">Add mock exam scores to see your progress chart</div>';
    }
    return;
  }

  const canvas = document.getElementById("scoreChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (scoreChart) scoreChart.destroy();

  scoreChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: SCORES.map((s, i) => s.name || `Mock ${i + 1}`),
      datasets: [
        {
          label: "Score %",
          data: SCORES.map(s => s.score),
          borderColor: "#6366f1",
          backgroundColor: "rgba(99,102,241,.15)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#6366f1",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
        {
          label: "Target 70%",
          data: SCORES.map(() => 70),
          borderColor: "rgba(52,211,153,.5)",
          borderDash: [8, 4],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#94a3b8", font: { size: 12 } } },
      },
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { color: "#64748b", stepSize: 10 },
          grid: { color: "rgba(99,102,241,.08)" },
        },
        x: {
          ticks: { color: "#64748b" },
          grid: { color: "rgba(99,102,241,.08)" },
        },
      },
    },
  });
}

async function addScore() {
  const name = document.getElementById("score-name").value.trim();
  const date = document.getElementById("score-date").value;
  const score = parseFloat(document.getElementById("score-value").value);
  const notes = document.getElementById("score-notes").value.trim();

  if (!name || !score) {
    showToast("Please fill in exam name and score");
    return;
  }

  await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, date, score, notes }),
  });
  SCORES.push({ name, date, score, notes });
  document.getElementById("score-name").value = "";
  document.getElementById("score-date").value = "";
  document.getElementById("score-value").value = "";
  document.getElementById("score-notes").value = "";
  renderScores();
  showToast("Score added!");
}

async function deleteScore(idx) {
  await fetch("/api/scores/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index: idx }),
  });
  SCORES.splice(idx, 1);
  renderScores();
  showToast("Score removed");
}

// ── Utilities ────────────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}
