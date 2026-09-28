// Storage backend for the iOS app: everything lives on the device, no
// account or network needed (TMDB poster search aside). Swapped in for
// show-picker/store-supabase.js by scripts/build-web.mjs and exposes the
// same `store` interface, returning rows shaped like the Supabase ones so
// app.js can't tell the difference.
//
// The whole dataset is one small JSON blob. In the app it goes through
// Capacitor Preferences (iOS UserDefaults), which the OS won't evict the
// way it can clear a web view's localStorage under storage pressure; in a
// plain browser (handy for testing) it falls back to localStorage.
const STORAGE_KEY = "pickforme.db.v1";

const persistence = (() => {
  const prefs = window.Capacitor?.Plugins?.Preferences;
  if (window.Capacitor?.isNativePlatform?.() && prefs) {
    return {
      async read() {
        return (await prefs.get({ key: STORAGE_KEY })).value;
      },
      async write(json) {
        await prefs.set({ key: STORAGE_KEY, value: json });
      },
    };
  }
  return {
    async read() {
      return localStorage.getItem(STORAGE_KEY);
    },
    async write(json) {
      localStorage.setItem(STORAGE_KEY, json);
    },
  };
})();

let db = { shows: [], history: [], rankings: [] };

// Writes are chained so a slow save can never land after a newer one.
let saving = Promise.resolve();
function save() {
  const json = JSON.stringify(db);
  saving = saving.then(() => persistence.write(json));
  return saving;
}

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const byCreated = (a, b) => a.created_at.localeCompare(b.created_at);

function findShow(id) {
  const show = db.shows.find((s) => s.id === id);
  if (!show) throw new Error(`No show with id ${id}`);
  return show;
}

const store = {
  isShared: false,

  async loadAll() {
    const json = await persistence.read();
    if (json) {
      const saved = JSON.parse(json);
      db = { shows: saved.shows || [], history: saved.history || [], rankings: saved.rankings || [] };
    }
    return {
      shows: [...db.shows].sort(byCreated).map((s) => ({ ...s })),
      history: [...db.history].sort((a, b) => a.at.localeCompare(b.at)).map((h) => ({ ...h })),
      rankings: db.rankings.map((r) => ({ ...r })),
    };
  },

  async addShow(fields) {
    const row = {
      id: newId(),
      weight: 1,
      is_newcomer: true,
      tmdb_id: null,
      poster_path: null,
      ...fields,
      created_at: new Date().toISOString(),
    };
    db.shows.push(row);
    await save();
    return { ...row };
  },

  async updateShow(id, patch) {
    const show = findShow(id);
    Object.assign(show, patch);
    await save();
    return { ...show };
  },

  async deleteShow(id) {
    db.shows = db.shows.filter((s) => s.id !== id);
    await save();
  },

  // Same math as the web version's confirm_pick database function: the
  // winner stops being a newcomer and, if anything else is in its
  // category, gives up half its weight, split evenly across the rest.
  async confirmPick(category, winnerId) {
    const winner = db.shows.find((s) => s.id === winnerId);
    if (winner) {
      winner.is_newcomer = false;
      const others = db.shows.filter((s) => s.category === winner.category && s.id !== winnerId);
      if (others.length) {
        const share = winner.weight / 2 / others.length;
        winner.weight /= 2;
        others.forEach((s) => { s.weight += share; });
      }
      await save();
    }
    return db.shows.filter((s) => s.category === category).sort(byCreated).map((s) => ({ ...s }));
  },

  async addHistory(fields) {
    const row = { id: newId(), ...fields, at: new Date().toISOString() };
    db.history.push(row);
    await save();
    return { ...row };
  },

  async upsertRanking({ category, title, rating }) {
    const now = new Date().toISOString();
    let row = db.rankings.find((r) => r.category === category && r.title === title);
    if (row) {
      Object.assign(row, { rating, updated_at: now });
    } else {
      row = { id: newId(), category, title, rating, updated_at: now, created_at: now };
      db.rankings.push(row);
    }
    await save();
    return { ...row };
  },

  async deleteRanking(category, title) {
    db.rankings = db.rankings.filter((r) => !(r.category === category && r.title === title));
    await save();
  },

  // Nothing else can change this device's data, so there's nothing to
  // listen for.
  subscribe() {},
};
