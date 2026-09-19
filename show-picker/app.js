const STORAGE_KEY = "marqueeNight.state";

const COLORS = ["#f4b400", "#3ecac2", "#e2574c", "#8b7fd6", "#f2a154", "#5fb3e0", "#d1c65c", "#c77dd1"];
const DEFAULT_WEIGHT = 1;

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
  const items = currentItems();
  const weight = items.length
    ? items.reduce((sum, it) => sum + it.weight, 0) / items.length
    : DEFAULT_WEIGHT;
  items.push({ title: value, weight });
  saveState();
  addInput.value = "";
  render();
});

spinBtn.addEventListener("click", () => spin());

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) {
    /* corrupt or unavailable storage, fall back to defaults */
  }
  return { movies: [], tv: [], history: [] };
}

function migrate(saved) {
  const toWeighted = (list) => (list || []).map((it) =>
    typeof it === "string" ? { title: it, weight: DEFAULT_WEIGHT } : it
  );
  return {
    movies: toWeighted(saved.movies),
    tv: toWeighted(saved.tv),
    history: saved.history || [],
  };
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

// Halves the winner's weight and splits what it lost equally across
// everything else, so a show that just got picked is less likely to
// come up again right away, and shows that haven't been picked in a
// while gradually become more likely.
function applyStreakDecay(items, index) {
  const others = items.filter((_, i) => i !== index);
  if (others.length === 0) return;
  const lost = items[index].weight / 2;
  items[index].weight -= lost;
  const share = lost / others.length;
  others.forEach((it) => { it.weight += share; });
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
  const totalWeight = items.reduce((sum, it) => sum + it.weight, 0);
  items.forEach((item, index) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.className = "item-label";
    label.textContent = item.title;

    const chance = document.createElement("span");
    chance.className = "item-chance";
    chance.textContent = `${Math.round((item.weight / totalWeight) * 100)}%`;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("aria-label", `Remove ${item.title}`);
    removeBtn.addEventListener("click", () => {
      state[activeCategory].splice(index, 1);
      saveState();
      render();
    });
    li.appendChild(label);
    li.appendChild(chance);
    li.appendChild(removeBtn);
    itemList.appendChild(li);
  });
}

// Slice layout proportional to weight, as {start, end} in radians, plus
// the total weight — shared by drawWheel (visuals) and spin (odds) so
// the wheel always looks like what it actually does.
function sliceLayout(items) {
  const totalWeight = items.reduce((sum, it) => sum + it.weight, 0);
  let cursor = 0;
  return items.map((item) => {
    const span = (item.weight / totalWeight) * 2 * Math.PI;
    const slice = { start: cursor, end: cursor + span };
    cursor += span;
    return slice;
  });
}

function drawWheel(angleDeg) {
  const items = currentItems();
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 6;
  ctx.clearRect(0, 0, size, size);
  if (items.length === 0) return;

  const layout = sliceLayout(items);
  const rotation = (angleDeg * Math.PI) / 180;

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(rotation);

  items.forEach((item, i) => {
    const { start, end } = layout[i];

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();

    ctx.save();
    ctx.rotate((start + end) / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#1a1220";
    ctx.font = "700 15px Manrope, sans-serif";
    const label = truncate(item.title, 20);
    ctx.fillText(label, radius - 14, 0);
    ctx.restore();
  });

  ctx.restore();
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function weightedPick(items, excludeTitle) {
  let eligible = items.map((_, i) => i);
  if (excludeTitle && items.length > 1) {
    eligible = eligible.filter((i) => items[i].title !== excludeTitle);
  }
  const totalWeight = eligible.reduce((sum, i) => sum + items[i].weight, 0);
  let r = Math.random() * totalWeight;
  for (const i of eligible) {
    r -= items[i].weight;
    if (r <= 0) return i;
  }
  return eligible[eligible.length - 1];
}

function spin(excludeTitle) {
  const items = currentItems();
  if (items.length === 0 || spinning) return;

  spinning = true;
  spinBtn.disabled = true;

  const winnerIndex = weightedPick(items, excludeTitle);
  const layout = sliceLayout(items);
  const winnerMidAngle = ((layout[winnerIndex].start + layout[winnerIndex].end) / 2) * (180 / Math.PI);
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
      showResult(items[winnerIndex].title, winnerIndex);
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
    applyStreakDecay(state[category], index);
    saveState();
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
    tvHistory.appendChild(renderHistoryCard(title, entries, state.tv.some((it) => it.title === title)));
  });

  movieHistory.innerHTML = "";
  groupByTitle(movieEntries).forEach(({ title, entries }) => {
    movieHistory.appendChild(renderHistoryCard(title, entries, state.movies.some((it) => it.title === title)));
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
