const STORAGE_KEY = "marqueeNight.state";

const COLORS = ["#f4b400", "#3ecac2", "#e2574c", "#8b7fd6", "#f2a154", "#5fb3e0", "#d1c65c", "#c77dd1"];

const state = loadState();
let activeCategory = "movies";
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
const markWatchedBtn = document.getElementById("markWatched");
const keepItBtn = document.getElementById("keepIt");

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

markWatchedBtn.addEventListener("click", () => {
  const { index } = resultModal.dataset;
  state[activeCategory].splice(Number(index), 1);
  saveState();
  closeModal();
  render();
});

keepItBtn.addEventListener("click", closeModal);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* corrupt or unavailable storage, fall back to defaults */
  }
  return { movies: [], tv: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentItems() {
  return state[activeCategory];
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

function spin() {
  const items = currentItems();
  if (items.length === 0 || spinning) return;

  spinning = true;
  spinBtn.disabled = true;

  const winnerIndex = Math.floor(Math.random() * items.length);
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

function showResult(name, index) {
  resultName.textContent = name;
  resultModal.dataset.index = index;
  resultModal.classList.remove("hidden");
}

function closeModal() {
  resultModal.classList.add("hidden");
}

render();
