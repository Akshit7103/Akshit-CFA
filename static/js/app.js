// ── State ────────────────────────────────────────────────────────────
let TOPICS = [];
let PROGRESS = {};
let SCORES = [];
let activeChecklistCat = "videos";

// ── Init ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await loadAll();
  setupNav();
  showSection("dashboard");
  startCountdown();
});

async function loadAll() {
  const [topicsRes, progressRes, scoresRes] = await Promise.all([
    fetch("/api/topics").then(r => r.json()),
    fetch("/api/progress").then(r => r.json()),
    fetch("/api/scores").then(r => r.json()),
  ]);
  TOPICS = topicsRes;
  PROGRESS = progressRes;
  SCORES = scoresRes;
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
const PLAN_SCHEDULE = [
  { num: 1,  name: "Quantitative Methods",         start: "2026-02-08", end: "2026-02-23", days: 16 },
  { num: 2,  name: "Economics",                     start: "2026-02-24", end: "2026-03-10", days: 15 },
  { num: 3,  name: "Corporate Issuers",             start: "2026-03-11", end: "2026-03-22", days: 12 },
  { num: 4,  name: "Financial Statement Analysis",  start: "2026-03-23", end: "2026-04-16", days: 25 },
  { num: 5,  name: "Equity Investments",            start: "2026-04-17", end: "2026-05-05", days: 19 },
  { num: 6,  name: "Fixed Income",                  start: "2026-05-06", end: "2026-06-01", days: 27 },
  { num: 7,  name: "Derivatives",                   start: "2026-06-02", end: "2026-06-12", days: 11 },
  { num: 8,  name: "Alternative Investments",       start: "2026-06-13", end: "2026-06-23", days: 11 },
  { num: 9,  name: "Portfolio Management",          start: "2026-06-24", end: "2026-07-07", days: 14 },
  { num: 10, name: "Ethics",                        start: "2026-07-08", end: "2026-07-22", days: 15 },
  { num: null, name: "Review",                      start: "2026-07-23", end: "2026-08-22", days: 30 },
];

function renderPlanner() {
  const container = document.getElementById("planner-cards");
  container.innerHTML = "";
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  PLAN_SCHEDULE.forEach((item, i) => {
    const startDate = new Date(item.start + "T00:00:00");
    const endDate = new Date(item.end + "T23:59:59");
    const isReview = item.num === null;
    const isCurrent = now >= startDate && now <= endDate;
    const isCompleted = now > endDate;

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

    const card = document.createElement("div");
    card.className = `planner-card ${cardClass} ${highlightClass} fade-up`;
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <div class="planner-card-header">
        <div class="planner-card-title">${item.name}</div>
        ${item.num !== null ? `<div class="planner-card-badge">${item.num}</div>` : `<div class="planner-card-badge">R</div>`}
      </div>
      <div class="planner-card-body">
        <div>
          <div class="planner-label">Start</div>
          <div class="planner-value">${formatPlanDate(item.start)}</div>
        </div>
        <div>
          <div class="planner-label">Study Length</div>
          <div class="planner-value">${item.days} days</div>
        </div>
        <div>
          <div class="planner-label">End</div>
          <div class="planner-value">${formatPlanDate(item.end)}</div>
        </div>
        <div>
          <div class="planner-label">Status</div>
          <div class="planner-status-label ${statusClass}">${statusText}</div>
        </div>
      </div>
      <div class="planner-time-bar">
        <div class="planner-time-fill" style="width:${timePct}%"></div>
      </div>
    `;
    container.appendChild(card);
  });
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

// ── Weekly Planner ───────────────────────────────────────────────────
function renderWeekly() {
  const container = document.getElementById("weekly-cards");
  container.innerHTML = "";
  const now = new Date();

  WEEKLY.forEach(w => {
    const weekDate = parseWeekDate(w.week_of);
    const weekEnd = new Date(weekDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const isCurrent = now >= weekDate && now <= weekEnd;

    const saved = (PROGRESS.weekly || {})[String(w.wk)] || {};
    const card = document.createElement("div");
    card.className = `week-card card ${isCurrent ? "current-week" : ""}`;
    card.innerHTML = `
      <div class="wk-num">W${w.wk}</div>
      <div class="wk-date">${w.week_of}</div>
      <div class="wk-topic">${w.topic}</div>
      <div class="wk-target">${w.videos}</div>
      <div class="wk-target">${w.reading}</div>
      <div class="wk-target">${w.questions}</div>
      <input class="wk-hours-input" type="number" min="0" max="100"
             value="${saved.hours_actual || ''}"
             placeholder="0"
             data-wk="${w.wk}" data-field="hours_actual">
      <input class="wk-notes-input" type="text"
             value="${saved.notes || ''}"
             placeholder="Notes..."
             data-wk="${w.wk}" data-field="notes">
      <div></div>
    `;
    container.appendChild(card);

    if (isCurrent) {
      setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  });

  // Debounced save
  container.addEventListener("input", debounce(async (e) => {
    const input = e.target;
    if (!input.dataset.wk) return;
    const body = { wk: parseInt(input.dataset.wk) };
    if (input.dataset.field === "hours_actual") {
      body.hours_actual = parseFloat(input.value) || 0;
    } else {
      body.notes = input.value;
    }
    await fetch("/api/weekly/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // Update local state
    const wk = String(body.wk);
    if (!PROGRESS.weekly) PROGRESS.weekly = {};
    if (!PROGRESS.weekly[wk]) PROGRESS.weekly[wk] = { hours_actual: 0, notes: "" };
    if (body.hours_actual !== undefined) PROGRESS.weekly[wk].hours_actual = body.hours_actual;
    if (body.notes !== undefined) PROGRESS.weekly[wk].notes = body.notes;
    showToast("Saved!");
  }, 600));
}

function parseWeekDate(str) {
  // "09 Feb 2026"
  return new Date(str);
}

// ── Checklists ───────────────────────────────────────────────────────
function renderChecklists() {
  // Tab buttons
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

    // Build list of items: prereqs (MM only) + readings
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

    // Render prereqs first (MM Videos only)
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
      item.querySelector(".check-box").addEventListener("click", async (e) => {
        e.stopPropagation();
        const box = e.currentTarget;
        box.classList.add("check-pop");
        const res = await fetch("/api/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: box.dataset.key, cat: box.dataset.cat }),
        });
        const data = await res.json();
        if (!PROGRESS.checklists[key]) PROGRESS.checklists[key] = { videos: false, kaplan: false, cfai: false };
        PROGRESS.checklists[key][activeChecklistCat] = data.value;
        renderChecklists();
        showToast(data.value ? "Marked complete!" : "Unmarked");
      });
      section.appendChild(item);
    });

    // Render regular readings
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
      item.querySelector(".check-box").addEventListener("click", async (e) => {
        e.stopPropagation();
        const box = e.currentTarget;
        box.classList.add("check-pop");
        const res = await fetch("/api/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: box.dataset.key, cat: box.dataset.cat }),
        });
        const data = await res.json();
        if (!PROGRESS.checklists[key]) PROGRESS.checklists[key] = { videos: false, kaplan: false, cfai: false };
        PROGRESS.checklists[key][activeChecklistCat] = data.value;
        renderChecklists();
        showToast(data.value ? "Marked complete!" : "Unmarked");
      });
      section.appendChild(item);
    });

    container.appendChild(section);
  });
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
      <td>${pass ? "70%" : "70%"}</td>
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
  // Clear form
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

// ── Quotes ───────────────────────────────────────────────────────────
const QUOTES = [
  { text: "The best investment you can make is in yourself.", author: "Warren Buffett" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Risk comes from not knowing what you are doing.", author: "Warren Buffett" },
  { text: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
  { text: "In investing, what is comfortable is rarely profitable.", author: "Robert Arnott" },
  { text: "The four most dangerous words in investing are: This time it's different.", author: "Sir John Templeton" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "It's not whether you're right or wrong, but how much money you make when you're right.", author: "George Soros" },
  { text: "The individual investor should act consistently as an investor and not as a speculator.", author: "Ben Graham" },
  { text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
];

function renderQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const el = document.getElementById("quote-text");
  const cite = document.getElementById("quote-author");
  if (el) el.textContent = `"${q.text}"`;
  if (cite) cite.textContent = `\u2014 ${q.author}`;
}

// ── Utilities ────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}
