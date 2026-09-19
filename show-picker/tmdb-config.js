// TMDB (The Movie Database) API key — public by design, same trust model
// as supabase-config.js: this app has no login, and TMDB's v3 key is
// meant to be usable straight from client-side code (search is a free,
// read-only endpoint; there's no billing or write access it could expose).
// Get your own at https://www.themoviedb.org/settings/api if this one
// ever needs rotating.
const TMDB_API_KEY = "c785711dc6609a6aeaabc6af138ea52b";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/";
