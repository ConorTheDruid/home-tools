const COLORS = ["#f4b400", "#3ecac2", "#e2574c", "#8b7fd6", "#f2a154", "#5fb3e0", "#d1c65c", "#c77dd1"];
const DEFAULT_WEIGHT = 1;

// A show's color has to come from its title, not its position in the
// current wheel array — a finished or removed show has no wheel position
// at all, but still needs a consistent color in the timeline and calendar.
function colorForTitle(title) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = { movies: [], tv: [], history: [] };
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
const byShowPanel = document.getElementById("byShowPanel");
const timelinePanel = document.getElementById("timelinePanel");
const calendarPanel = document.getElementById("calendarPanel");
const timelineList = document.getElementById("timelineList");
const calPrev = document.getElementById("calPrev");
const calNext = document.getElementById("calNext");
const calMonthLabel = document.getElementById("calMonthLabel");
const calGrid = document.getElementById("calGrid");
const calLegend = document.getElementById("calLegend");
const connBanner = document.getElementById("connBanner");
const versionFooter = document.getElementById("versionFooter");

let historySubView = "byShow";
let calendarMonth = null; // Date on the 1st of the shown month; set lazily from history

connBanner.addEventListener("click", () => connBanner.classList.add("hidden"));

function showConnError(message, err) {
  if (err) console.error(message, err);
  connBanner.textContent = `⚠ ${message} (tap to dismiss)`;
  connBanner.classList.remove("hidden");
}

// Shows exactly what's actually deployed, pulled live from GitHub rather
// than a string that has to be remembered and bumped by hand — so "is
// this a sync issue or a real bug" is answerable at a glance.
async function loadVersionFooter() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/ConorTheDruid/home-tools/commits?path=show-picker&per_page=1"
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const [commit] = await res.json();
    const sha = commit.sha.slice(0, 7);
    const when = new Date(commit.commit.committer.date).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
    versionFooter.innerHTML =
      `<a href="https://github.com/ConorTheDruid/home-tools/commit/${commit.sha}" target="_blank" rel="noopener">v${sha}</a> · ${when}`;
  } catch (err) {
    console.error("Couldn't load version footer", err);
    versionFooter.textContent = "version unavailable";
  }
}

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

document.querySelectorAll(".subnav-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".subnav-pill").forEach((p) => {
      p.classList.remove("active");
      p.setAttribute("aria-selected", "false");
    });
    pill.classList.add("active");
    pill.setAttribute("aria-selected", "true");
    historySubView = pill.dataset.subview;
    byShowPanel.classList.toggle("hidden", historySubView !== "byShow");
    timelinePanel.classList.toggle("hidden", historySubView !== "timeline");
    calendarPanel.classList.toggle("hidden", historySubView !== "calendar");
  });
});

calPrev.addEventListener("click", () => {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
  renderCalendar(state.history || []);
});

calNext.addEventListener("click", () => {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
  renderCalendar(state.history || []);
});

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const value = addInput.value.trim();
  if (!value) return;
  addInput.value = "";

  // Newcomer bonus (TV only): a new show starts at double the category's
  // average weight, so it gets a real shot early on against established
  // shows — and even after its first pick halves it, it lands back
  // around average instead of starting out behind. Movies skip this
  // entirely: a movie is normally confirmed once and immediately
  // finished, so it would never actually lose the "newcomer" glow —
  // every movie would just look new forever.
  const items = currentItems();
  const isTv = activeCategory === "tv";
  const avgWeight = items.length
    ? items.reduce((sum, it) => sum + it.weight, 0) / items.length
    : DEFAULT_WEIGHT;
  const weight = isTv && items.length ? 2 * avgWeight : avgWeight;

  try {
    const { data, error } = await sb
      .from("hometools_shows")
      .insert({ category: activeCategory, title: value, weight, is_newcomer: isTv })
      .select()
      .single();
    if (error) throw error;
    upsertShow(data);
    render();
  } catch (err) {
    showConnError("Couldn't add that — is the Supabase table set up?", err);
  }
});

spinBtn.addEventListener("click", () => spin());

function currentItems() {
  return state[activeCategory];
}

function upsertShow(row) {
  const list = row.category === "movies" ? state.movies : state.tv;
  const idx = list.findIndex((it) => it.id === row.id);
  if (idx >= 0) list[idx] = row;
  else list.push(row);
}

function removeShowLocal(id) {
  state.movies = state.movies.filter((it) => it.id !== id);
  state.tv = state.tv.filter((it) => it.id !== id);
}

function upsertHistory(row) {
  if (!state.history.some((h) => h.id === row.id)) state.history.push(row);
}

// Halves the winner's weight and splits what it lost equally across
// everything else, so a show that just got picked is less likely to
// come up again right away, and shows that haven't been picked in a
// while gradually become more likely. Runs as one atomic database
// function (see supabase-setup.sql) so two people confirming picks at
// the same moment can't interleave and corrupt the weights.
async function applyStreakDecay(category, winnerId) {
  const { error } = await sb.rpc("confirm_pick", { winner_id: winnerId });
  if (error) throw error;
  const { data, error: fetchError } = await sb
    .from("hometools_shows")
    .select("*")
    .eq("category", category)
    .order("created_at", { ascending: true });
  if (fetchError) throw fetchError;
  if (category === "movies") state.movies = data || [];
  else state.tv = data || [];
}

async function logHistory(title, category, event) {
  const { data, error } = await sb
    .from("hometools_show_history")
    .insert({ title, category, event })
    .select()
    .single();
  if (error) throw error;
  upsertHistory(data);
}

function render() {
  renderList();
  drawWheel(currentAngle);
  const hasItems = currentItems().length > 0;
  emptyMsg.classList.toggle("hidden", hasItems);
  canvas.classList.toggle("hidden", !hasItems);
  spinBtn.disabled = !hasItems || spinning;
  startNewcomerAnim();
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
  items.forEach((item) => {
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
    removeBtn.addEventListener("click", async () => {
      removeShowLocal(item.id);
      render();
      try {
        const { error } = await sb.from("hometools_shows").delete().eq("id", item.id);
        if (error) throw error;
      } catch (err) {
        showConnError("Couldn't remove that from the shared list", err);
      }
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

// sparkleTime: pass a timestamp to draw the newcomer glow/particle
// effect (idle at-rest redraws); leave it out during the spin animation
// so the effect doesn't fly around distractingly mid-spin.
function drawWheel(angleDeg, sparkleTime) {
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
    ctx.fillStyle = colorForTitle(item.title);
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

  if (sparkleTime != null) {
    drawNewcomerEffects(items, layout, radius, sparkleTime);
  }

  ctx.restore();
}

// Glowing perimeter + drifting particles along a newcomer's wedge —
// disappears the moment it's actually been picked (is_newcomer flips to
// false server-side inside confirm_pick()). Called from inside drawWheel's
// already-rotated/translated context, so positions are plain polar coords.
function drawNewcomerEffects(items, layout, radius, t) {
  items.forEach((item, i) => {
    if (!item.is_newcomer) return;
    const { start, end } = layout[i];

    const pulse = 0.5 + 0.5 * Math.sin(t / 450);
    ctx.save();
    ctx.strokeStyle = "rgba(255, 240, 190, 0.95)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(255, 205, 80, 0.95)";
    ctx.shadowBlur = 12 + pulse * 14;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 2, start, end);
    ctx.stroke();
    ctx.restore();

    const particleCount = 5;
    for (let p = 0; p < particleCount; p++) {
      const phase = (p / particleCount) * Math.PI * 2;
      const angle = start + (end - start) * ((p + 0.5) / particleCount);
      const wobble = Math.sin(t / 600 + phase) * 8;
      const r = radius - 18 + wobble;
      const alpha = 0.35 + 0.35 * Math.sin(t / 500 + phase * 2);
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 236, 179, ${Math.max(0, alpha)})`;
      ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

let newcomerAnimId = null;

function startNewcomerAnim() {
  if (newcomerAnimId || spinning) return;
  const startTime = performance.now();
  function frame(now) {
    if (spinning) { newcomerAnimId = null; return; }
    if (!currentItems().some((it) => it.is_newcomer)) { newcomerAnimId = null; return; }
    drawWheel(currentAngle, now - startTime);
    newcomerAnimId = requestAnimationFrame(frame);
  }
  newcomerAnimId = requestAnimationFrame(frame);
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
      startNewcomerAnim();
      showResult(items[winnerIndex]);
    }
  }

  requestAnimationFrame(frame);
}

function showResult(item) {
  resultName.textContent = item.title;
  buildModalActions(item);
  resultModal.classList.remove("hidden");
}

function buildModalActions(item) {
  modalActions.innerHTML = "";
  const category = activeCategory;

  modalActions.appendChild(makeButton("✓ Confirm — log it for tonight", "btn-confirm", async () => {
    closeModal();
    try {
      await logHistory(item.title, category, "watched");
      await applyStreakDecay(category, item.id);
      render();
    } catch (err) {
      showConnError("Couldn't save that pick to the shared list", err);
    }
  }));

  modalActions.appendChild(makeButton("↻ Not tonight — reroll", "btn-reject", () => {
    closeModal();
    spin(item.title);
  }));

  modalActions.appendChild(makeButton("🏁 Finished — remove it", "btn-finished", async () => {
    closeModal();
    removeShowLocal(item.id);
    render();
    try {
      await logHistory(item.title, category, "finished");
      const { error } = await sb.from("hometools_shows").delete().eq("id", item.id);
      if (error) throw error;
    } catch (err) {
      showConnError("Couldn't save that to the shared list", err);
    }
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
  historyEmpty.classList.toggle("hidden", history.length > 0);
  renderByShow(history);
  renderTimeline(history);
  renderCalendar(history);
}

function renderByShow(history) {
  const tvEntries = history.filter((h) => h.category === "tv");
  const movieEntries = history.filter((h) => h.category === "movies");

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

// Flat, chronological log of every watch/finish event — unlike the By Show
// cards, the same title can (and often will) appear as several rows in a
// row, since that's literally what happened.
function renderTimeline(history) {
  const entries = history.slice().sort((a, b) => new Date(b.at) - new Date(a.at));
  timelineList.innerHTML = "";
  entries.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "timeline-row";

    const swatch = document.createElement("span");
    swatch.className = "timeline-swatch";
    swatch.style.background = colorForTitle(entry.title);

    const info = document.createElement("div");
    info.className = "timeline-info";
    const title = document.createElement("span");
    title.className = "timeline-title";
    title.textContent = entry.title;
    const meta = document.createElement("span");
    meta.className = "timeline-meta";
    meta.textContent = `${entry.category === "tv" ? "TV" : "Movie"} · ${formatDate(entry.at)}`;
    info.appendChild(title);
    info.appendChild(meta);

    const badge = document.createElement("span");
    badge.className = "timeline-badge" + (entry.event === "finished" ? " finished" : "");
    badge.textContent = entry.event === "finished" ? "Finished" : "Watched";

    li.appendChild(swatch);
    li.appendChild(info);
    li.appendChild(badge);
    timelineList.appendChild(li);
  });
}

// Month grid with each day's watch/finish events shown as small colored
// dots (one per distinct title that day), plus a legend below mapping
// title → color — there's rarely room to spell out titles inside a phone-
// width day cell, but plenty of vertical space for a legend underneath.
function renderCalendar(history) {
  if (!calendarMonth) {
    const latest = history.slice().sort((a, b) => new Date(b.at) - new Date(a.at))[0];
    const base = latest ? new Date(latest.at) : new Date();
    calendarMonth = new Date(base.getFullYear(), base.getMonth(), 1);
  }

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  calMonthLabel.textContent = calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const byDay = new Map();
  history.forEach((entry) => {
    const d = new Date(entry.at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(entry);
  });

  calGrid.innerHTML = "";
  ["S", "M", "T", "W", "T", "F", "S"].forEach((label) => {
    const dow = document.createElement("div");
    dow.className = "cal-dow";
    dow.textContent = label;
    calGrid.appendChild(dow);
  });

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < firstDow; i++) {
    const filler = document.createElement("div");
    filler.className = "cal-cell cal-filler";
    calGrid.appendChild(filler);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "cal-cell";
    if (isCurrentMonth && today.getDate() === day) cell.classList.add("cal-today");

    const num = document.createElement("span");
    num.className = "cal-day-num";
    num.textContent = day;
    cell.appendChild(num);

    const dayEntries = byDay.get(`${year}-${month}-${day}`);
    if (dayEntries && dayEntries.length) {
      const titles = [...new Set(dayEntries.map((e) => e.title))];
      const dots = document.createElement("div");
      dots.className = "cal-dots";
      const shown = titles.slice(0, 4);
      shown.forEach((title) => {
        const dot = document.createElement("span");
        dot.className = "cal-dot";
        dot.style.background = colorForTitle(title);
        dots.appendChild(dot);
      });
      if (titles.length > shown.length) {
        const more = document.createElement("span");
        more.className = "cal-dot-more";
        more.textContent = `+${titles.length - shown.length}`;
        dots.appendChild(more);
      }
      cell.appendChild(dots);
    }
    calGrid.appendChild(cell);
  }

  const legendTitles = [...new Set(history.map((e) => e.title))].sort((a, b) => a.localeCompare(b));
  calLegend.innerHTML = "";
  legendTitles.forEach((title) => {
    const item = document.createElement("div");
    item.className = "cal-legend-item";
    const swatch = document.createElement("span");
    swatch.className = "cal-legend-swatch";
    swatch.style.background = colorForTitle(title);
    const label = document.createElement("span");
    label.className = "cal-legend-label";
    label.textContent = title;
    item.appendChild(swatch);
    item.appendChild(label);
    calLegend.appendChild(item);
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

function subscribeRealtime() {
  sb.channel("hometools_shows_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "hometools_shows" }, (payload) => {
      if (payload.eventType === "DELETE") removeShowLocal(payload.old.id);
      else upsertShow(payload.new);
      render();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "hometools_show_history" }, (payload) => {
      if (payload.eventType === "INSERT") upsertHistory(payload.new);
      if (!historyView.classList.contains("hidden")) renderHistory();
    })
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        showConnError("Live sync dropped — reload to catch up on the other person's changes");
      }
    });
}

async function init() {
  try {
    const [{ data: shows, error: showsErr }, { data: history, error: historyErr }] = await Promise.all([
      sb.from("hometools_shows").select("*").order("created_at", { ascending: true }),
      sb.from("hometools_show_history").select("*").order("at", { ascending: true }),
    ]);
    if (showsErr) throw showsErr;
    if (historyErr) throw historyErr;
    state.movies = (shows || []).filter((s) => s.category === "movies");
    state.tv = (shows || []).filter((s) => s.category === "tv");
    state.history = history || [];
  } catch (err) {
    showConnError("Couldn't load the shared list — check the Supabase setup", err);
  }
  render();
  subscribeRealtime();
  loadVersionFooter();
}

init();
