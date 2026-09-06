const STORAGE_KEY = "marqueeNight.state";

const COLORS = ["#f4b400", "#3ecac2", "#e2574c", "#8b7fd6", "#f2a154", "#5fb3e0", "#d1c65c", "#c77dd1"];

const state = loadState();
let activeCategory = "tv";
let currentAngle = 0;
let spinning = false;

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const emptyMsg = document.getElementById("emptyMsg");
const itemList = document.getElementById("itemList");
const addForm = document.getElementById("addForm");
const addInput = document.getElementById("addInput");
const resultModal = document.getElementById("resultModal");
const resultName = document.getElementById("resultName");
const modalActions = document.getElementById("modalActions");
const wheelView = document.getElementById("wheelView");
const historyView = document.getElementById("historyView");
const tvHistory = document.getElementById("tvHistory");
const movieHistory = document.getElementById("movieHistory");
const historyEmpty = document.getElementById("historyEmpty");

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    activeCategory = tab.dataset.cat;
    currentAngle = 0;
    render();
  });
});

document.querySelectorAll(".view-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".view-tab").forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    const view = tab.dataset.view;
    wheelView.classList.toggle("hidden", view !== "wheel");
    historyView.classList.toggle("hidden", view !== "history");
    if (view === "history") renderHistory();
  });
});

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = addInput.value.trim();
  if (!value) return;
  state[activeCategory].push(value);
  saveState();
  addInput.value = "";
  render();
});

spinBtn.addEventListener("click", spin);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* corrupt or unavailable storage, fall back to defaults */
  }
  return { movies: [], tv: [], history: [] };
}

function saveState() {
  if (!state.history) state.history = [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentItems() {
  return state[activeCategory];
}

function logHistory(title, category, event) {
  state.history.push({ title, category, event, at: new Date().toISOString() });
  saveState();
}

function render() {
  renderList();
  drawWheel(currentAngle);
  const hasItems = currentItems().length > 0;
  emptyMsg.classList.toggle("hidden", hasItems);
  canvas.classList.toggle("hidden", !hasItems);
  spinBtn.disabled = !hasItems || spinning;
}

function renderList() {
  const items = currentItems();
  itemList.innerHTML = "";
  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-list";
    li.textContent = "Nothing here yet — add a title above.";
    itemList.appendChild(li);
    return;
  }
  items.forEach((item, index) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = item;
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("aria-label", `Remove ${item}`);
    removeBtn.addEventListener("click", () => {
      state[activeCategory].splice(index, 1);
      saveState();
      render();
    });
    li.appendChild(label);
    li.appendChild(removeBtn);
    itemList.appendChild(li);
  });
}

function drawWheel(angleDeg) {
  const items = currentItems();
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 6;
  ctx.clearRect(0, 0, size, size);
  if (items.length === 0) return;

  const sliceAngle = (2 * Math.PI) / items.length;
  const rotation = (angleDeg * Math.PI) / 180;

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(rotation);

  items.forEach((item, i) => {
    const start = i * sliceAngle;
    const end = start + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();

    ctx.save();
    ctx.rotate(start + sliceAngle / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#1a1220";
    ctx.font = "700 15px Manrope, sans-serif";
    const label = truncate(item, 20);
    ctx.fillText(label, radius - 14, 0);
    ctx.restore();
  });

  ctx.restore();
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function spin(excludeTitle) {
  const items = currentItems();
  if (items.length === 0 || spinning) return;

  spinning = true;
  spinBtn.disabled = true;

  let eligible = items.map((_, i) => i);
  if (excludeTitle && items.length > 1) {
    eligible = eligible.filter((i) => items[i] !== excludeTitle);
  }
  const winnerIndex = eligible[Math.floor(Math.random() * eligible.length)];
  const sliceAngle = 360 / items.length;
  const winnerMidAngle = sliceAngle * winnerIndex + sliceAngle / 2;
  const pointerAngle = 270; // top of the wheel, in canvas-angle terms

  let delta = ((pointerAngle - winnerMidAngle) % 360 + 360) % 360;
  const extraSpins = 6;
  const startAngle = currentAngle;
  const targetAngle = startAngle - (startAngle % 360) + 360 * extraSpins + delta;

  const duration = 4200;
  const startTime = performance.now();

  function frame(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - t, 4);
    currentAngle = startAngle + (targetAngle - startAngle) * eased;
    drawWheel(currentAngle);

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      currentAngle = targetAngle % 360;
      spinning = false;
      spinBtn.disabled = false;
      showResult(items[winnerIndex], winnerIndex);
    }
  }

  requestAnimationFrame(frame);
}

function showResult(title, index) {
  resultName.textContent = title;
  resultModal.dataset.index = index;
  resultModal.dataset.title = title;
  buildModalActions(title, index);
  resultModal.classList.remove("hidden");
}

function buildModalActions(title, index) {
  modalActions.innerHTML = "";
  const category = activeCategory;

  modalActions.appendChild(makeButton("✓ Confirm — log it for tonight", "btn-confirm", () => {
    logHistory(title, category, "watched");
    closeModal();
    render();
  }));

  modalActions.appendChild(makeButton("↻ Not tonight — reroll", "btn-reject", () => {
    closeModal();
    spin(title);
  }));

  modalActions.appendChild(makeButton("🏁 Finished — remove it", "btn-finished", () => {
    logHistory(title, category, "finished");
    state[category].splice(index, 1);
    saveState();
    closeModal();
    render();
  }));
}

function makeButton(label, className, onClick) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.className = className;
  btn.addEventListener("click", onClick);
  return btn;
}

function closeModal() {
  resultModal.classList.add("hidden");
}

function renderHistory() {
  const history = state.history || [];
  const tvEntries = history.filter((h) => h.category === "tv");
  const movieEntries = history.filter((h) => h.category === "movies");

  historyEmpty.classList.toggle("hidden", history.length > 0);
  tvHistory.parentElement.classList.toggle("hidden", tvEntries.length === 0);
  movieHistory.parentElement.classList.toggle("hidden", movieEntries.length === 0);

  tvHistory.innerHTML = "";
  groupByTitle(tvEntries).forEach(({ title, entries }) => {
    tvHistory.appendChild(renderHistoryCard(title, entries, state.tv.includes(title)));
  });

  movieHistory.innerHTML = "";
  groupByTitle(movieEntries).forEach(({ title, entries }) => {
    movieHistory.appendChild(renderHistoryCard(title, entries, state.movies.includes(title)));
  });
}

function groupByTitle(entries) {
  const map = new Map();
  entries.forEach((e) => {
    if (!map.has(e.title)) map.set(e.title, []);
    map.get(e.title).push(e);
  });
  return [...map.entries()]
    .map(([title, entries]) => ({
      title,
      entries: entries.slice().sort((a, b) => new Date(b.at) - new Date(a.at)),
    }))
    .sort((a, b) => new Date(b.entries[0].at) - new Date(a.entries[0].at));
}

function renderHistoryCard(title, entries, stillInRotation) {
  const card = document.createElement("div");
  card.className = "history-card";

  const head = document.createElement("div");
  head.className = "history-card-head";

  const name = document.createElement("span");
  name.className = "history-title";
  name.textContent = title;

  const status = document.createElement("span");
  const finished = entries.some((e) => e.event === "finished");
  let statusText, statusClass;
  if (finished) {
    statusText = "Finished";
    statusClass = " finished";
  } else if (stillInRotation) {
    statusText = "In rotation";
    statusClass = " active";
  } else {
    statusText = "Removed";
    statusClass = "";
  }
  status.className = "history-status" + statusClass;
  status.textContent = statusText;

  head.appendChild(name);
  head.appendChild(status);

  const count = document.createElement("span");
  count.className = "history-count";
  count.textContent = entries.length === 1 ? "Watched once" : `Watched ${entries.length} times`;

  const dates = document.createElement("ul");
  dates.className = "history-dates";
  entries.forEach((e) => {
    const li = document.createElement("li");
    li.textContent = formatDate(e.at);
    dates.appendChild(li);
  });

  card.appendChild(head);
  card.appendChild(count);
  card.appendChild(dates);
  return card;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

render();
