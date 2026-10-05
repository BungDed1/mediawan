/* =====================================================================
   MEDIAWAN - SETTINGS STORE
   ===================================================================== */

const SETTINGS_CACHE = { data: null, loadedAt: 0 };

async function loadSettings(force = false) {
  const CACHE_MS = 30_000;
  if (!force && SETTINGS_CACHE.data && Date.now() - SETTINGS_CACHE.loadedAt < CACHE_MS) {
    return SETTINGS_CACHE.data;
  }
  try {
    const { data, error } = await supabaseClient.from(TABLES.settings).select("key, value");
    if (error) throw error;
    const map = {};
    (data || []).forEach((row) => { map[row.key] = row.value ?? ""; });
    SETTINGS_CACHE.data = map;
    SETTINGS_CACHE.loadedAt = Date.now();
    return map;
  } catch (err) {
    console.error("[settings] loadSettings error:", err);
    return SETTINGS_CACHE.data || {};
  }
}

async function getSetting(key, fallback = "") {
  const map = await loadSettings();
  return map[key] ?? fallback;
}

async function saveSettings(obj) {
  const rows = Object.entries(obj).map(([key, value]) => ({
    key, value: value ?? "", updated_at: new Date().toISOString(),
  }));
  const { error } = await supabaseClient.from(TABLES.settings).upsert(rows, { onConflict: "key" });
  if (error) throw error;
  if (SETTINGS_CACHE.data) rows.forEach((r) => { SETTINGS_CACHE.data[r.key] = r.value; });
}

function invalidateSettingsCache() {
  SETTINGS_CACHE.data = null;
  SETTINGS_CACHE.loadedAt = 0;
}