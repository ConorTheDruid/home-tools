const STORAGE_KEY = "dailyValues.state";

const MACROS = [
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "carbs_g", label: "Carbs", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
  { key: "fiber_g", label: "Fiber", unit: "g" },
  { key: "sugar_g", label: "Sugar", unit: "g" },
  { key: "sodium_mg", label: "Sodium", unit: "mg" },
];

const state = loadState();
const importedEntries = HISTORICAL_ENTRIES.map((e, i) => ({ ...e, id: `imported-${i}`, source: "imported" }));

let currentDate = mostRecentDate();

const dateReadout = document.getElementById("dateReadout");
const calorieValue = document.getElementById("calorieValue");
const macroRows = document.getElementById("macroRows");
const emptyDay = document.getElementById("emptyDay");
const entryList = document.getElementById("entryList");
const entryCount = document.getElementById("entryCount");
const prevDayBtn = document.getElementById("prevDay");
const nextDayBtn = document.getElementById("nextDay");
const addForm = document.getElementById("addForm");
const weekStrip = document.getElementById("weekStrip");

prevDayBtn.addEventListener("click", () => shiftDay(-1));
nextDayBtn.addEventListener("click", () => shiftDay(1));

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const description = document.getElementById("descInput").value.trim();
  const calories = Number(document.getElementById("calInput").value);
  if (!description || !Number.isFinite(calories)) return;

  const today = todayString();
  const entry = {
    id: `logged-${Date.now()}`,
    date: today,
    time: nowTime(),
    description,
    calories,
    protein_g: numOrZero("proteinInput"),
    carbs_g: numOrZero("carbsInput"),
    fat_g: numOrZero("fatInput"),
    fiber_g: numOrZero("fiberInput"),
    sugar_g: numOrZero("sugarInput"),
    sodium_mg: numOrZero("sodiumInput"),
    source: "logged",
  };

  state.entries.push(entry);
  saveState();
  addForm.reset();
  currentDate = today;
  render();
});

function numOrZero(id) {
  const v = Number(document.getElementById(id).value);
  return Number.isFinite(v) ? v : 0;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { entries: [], hiddenImportedIds: [] };
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function mostRecentDate() {
  const dates = [...importedEntries, ...state.entries].map((e) => e.date);
  if (dates.length === 0) return todayString();
  return dates.sort().at(-1);
}

function shiftDay(delta) {
  const d = new Date(`${currentDate}T00:00:00`);
  d.setDate(d.getDate() + delta);
  currentDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  render();
}

function hiddenSet() {
  return new Set(state.hiddenImportedIds);
}

function entriesForDate(date) {
  const hidden = hiddenSet();
  const imported = importedEntries.filter((e) => e.date === date && !hidden.has(e.id));
  const logged = state.entries.filter((e) => e.date === date);
  return [...imported, ...logged].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

function entriesForCurrentDate() {
  return entriesForDate(currentDate);
}

function addDays(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function removeEntry(entry) {
  if (entry.source === "logged") {
    state.entries = state.entries.filter((e) => e.id !== entry.id);
  } else {
    state.hiddenImportedIds.push(entry.id);
  }
  saveState();
  render();
}

function renderWeekStrip() {
  const today = todayString();
  weekStrip.innerHTML = "";
  for (let i = 6; i >= 0; i--) {
    const date = addDays(today, -i);
    const total = entriesForDate(date).reduce((sum, e) => sum + (e.calories || 0), 0);

    const tile = document.createElement("div");
    tile.className = "week-day" + (date === currentDate ? " selected" : "");
    tile.setAttribute("role", "button");
    tile.setAttribute("tabindex", "0");

    const label = document.createElement("span");
    label.className = "wd-label";
    label.textContent = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();

    const cal = document.createElement("span");
    cal.className = "wd-cal";
    cal.textContent = Math.round(total).toLocaleString();

    tile.appendChild(label);
    tile.appendChild(cal);
    tile.addEventListener("click", () => { currentDate = date; render(); });
    tile.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); currentDate = date; render(); }
    });
    weekStrip.appendChild(tile);
  }
}

function render() {
  renderWeekStrip();
  const entries = entriesForCurrentDate();

  const dateObj = new Date(`${currentDate}T00:00:00`);
  dateReadout.textContent = dateObj.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  const totals = entries.reduce((acc, e) => {
    acc.calories += e.calories || 0;
    MACROS.forEach((m) => { acc[m.key] += e[m.key] || 0; });
    return acc;
  }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 });

  calorieValue.textContent = Math.round(totals.calories).toLocaleString();

  macroRows.innerHTML = "";
  MACROS.forEach((m) => {
    const row = document.createElement("div");
    row.className = "macro-row";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = m.label;
    const value = document.createElement("span");
    value.className = "value";
    value.textContent = `${round1(totals[m.key])} ${m.unit}`;
    row.appendChild(name);
    row.appendChild(value);
    macroRows.appendChild(row);
  });

  emptyDay.classList.toggle("hidden", entries.length > 0);
  entryCount.textContent = entries.length;

  entryList.innerHTML = "";
  if (entries.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-list";
    li.textContent = "No entries for this day.";
    entryList.appendChild(li);
    return;
  }

  entries.forEach((entry) => {
    const li = document.createElement("li");

    const main = document.createElement("div");
    main.className = "entry-main";

    const desc = document.createElement("span");
    desc.className = "entry-desc";
    if (entry.source === "imported") {
      const tag = document.createElement("span");
      tag.className = "entry-tag";
      tag.textContent = "Imported";
      desc.appendChild(tag);
    }
    desc.appendChild(document.createTextNode(entry.description));
    main.appendChild(desc);

    const meta = document.createElement("span");
    meta.className = "entry-meta";
    meta.textContent = entry.time ? entry.time : "";
    main.appendChild(meta);

    const cals = document.createElement("span");
    cals.className = "entry-cals";
    cals.textContent = `${Math.round(entry.calories)} cal`;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("aria-label", `Remove ${entry.description}`);
    removeBtn.addEventListener("click", () => removeEntry(entry));

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "4px";
    right.appendChild(cals);
    right.appendChild(removeBtn);

    li.appendChild(main);
    li.appendChild(right);
    entryList.appendChild(li);
  });
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

render();
