// Storage backend for the web version: the shared Supabase project, with
// realtime so every open browser sees changes live. The iOS app swaps
// this file for marquee-app/src/store-local.js — both expose the same
// `store` interface, which is all app.js talks to.
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

const store = {
  isShared: true,

  async loadAll() {
    const [shows, history, rankings] = await Promise.all([
      sb.from("hometools_shows").select("*").order("created_at", { ascending: true }).then(unwrap),
      sb.from("hometools_show_history").select("*").order("at", { ascending: true }).then(unwrap),
      sb.from("hometools_rankings").select("*").then(unwrap),
    ]);
    return { shows: shows || [], history: history || [], rankings: rankings || [] };
  },

  async addShow(fields) {
    return unwrap(await sb.from("hometools_shows").insert(fields).select().single());
  },

  async updateShow(id, patch) {
    return unwrap(await sb.from("hometools_shows").update(patch).eq("id", id).select().single());
  },

  async deleteShow(id) {
    unwrap(await sb.from("hometools_shows").delete().eq("id", id));
  },

  // Runs as one atomic database function (defined on the Supabase
  // project) so two people confirming picks at the same moment can't
  // interleave and corrupt the weights. Returns the category's shows
  // with their new weights.
  async confirmPick(category, winnerId) {
    unwrap(await sb.rpc("confirm_pick", { winner_id: winnerId }));
    const rows = unwrap(await sb
      .from("hometools_shows")
      .select("*")
      .eq("category", category)
      .order("created_at", { ascending: true }));
    return rows || [];
  },

  async addHistory(fields) {
    return unwrap(await sb.from("hometools_show_history").insert(fields).select().single());
  },

  async upsertRanking({ category, title, rating }) {
    return unwrap(await sb
      .from("hometools_rankings")
      .upsert({ category, title, rating, updated_at: new Date().toISOString() }, { onConflict: "category,title" })
      .select()
      .single());
  },

  async deleteRanking(category, title) {
    unwrap(await sb.from("hometools_rankings").delete().eq("category", category).eq("title", title));
  },

  subscribe({ onShow, onShowDelete, onHistory, onRanking, onRankingDelete, onDisconnect }) {
    sb.channel("hometools_shows_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "hometools_shows" }, (payload) => {
        if (payload.eventType === "DELETE") onShowDelete(payload.old.id);
        else onShow(payload.new);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "hometools_show_history" }, (payload) => {
        if (payload.eventType === "INSERT") onHistory(payload.new);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "hometools_rankings" }, (payload) => {
        if (payload.eventType === "DELETE") onRankingDelete(payload.old.id);
        else onRanking(payload.new);
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") onDisconnect();
      });
  },
};
