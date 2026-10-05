/* =====================================================================
   MEDIAWAN - CONFIG
   ===================================================================== */

const SUPABASE_URL  = "https://qbrbuhvhtlzmhitergew.supabase.co";
const SUPABASE_KEY  = "sb_publishable_shOMzlQbeQofjE3sl4v-sQ_T2PgNHhn";

const TABLES = Object.freeze({
  categories:  "mw_categories",
  articles:    "mw_articles",
  subscribers: "mw_subscribers",
  admins:      "mw_admins",
  settings:    "mw_settings",
});

const BUCKET   = "mw-article-images";
const RPC_VIEWS = "mw_increment_views";

const APP = Object.freeze({
  name:         "Mediawan",
  tagline:      "Media berita & fakta",
  pageSize:     9,
  homeLatest:   6,
  homePopular:  5,
  homeFacts:    8,
  relatedMax:   3,
  defaultImage: "../assets/images/placeholder.jpg",
});