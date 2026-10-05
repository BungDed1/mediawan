/* =====================================================================
   MEDIAWAN - CONFIG
   Semua konstanta global: URL, key, nama tabel, bucket, RPC.
   JANGAN pernah taruh service_role / secret key di sini.
   ===================================================================== */

// Kredensial publik Supabase (aman dipakai di browser karena dilindungi RLS)
const SUPABASE_URL  = "https://qbrbuhvhtlzmhitergew.supabase.co";
const SUPABASE_KEY  = "sb_publishable_shOMzlQbeQofjE3sl4v-sQ_T2PgNHhn";

// Nama tabel (semua berawalan mw_ agar tidak bentrok dengan website lain)
const TABLES = Object.freeze({
  categories:  "mw_categories",
  articles:    "mw_articles",
  subscribers: "mw_subscribers",
  admins:      "mw_admins",
});

// Nama bucket Storage untuk gambar artikel
const BUCKET = "mw-article-images";

// Nama fungsi RPC untuk menambah views
const RPC_VIEWS = "mw_increment_views";

// Konfigurasi umum aplikasi
const APP = Object.freeze({
  name:         "Mediawan",
  tagline:      "Media berita & fakta",
  pageSize:     9,           // jumlah artikel per halaman (category & search)
  homeLatest:   6,           // jumlah artikel "Terbaru" di beranda
  homePopular:  5,           // jumlah artikel "Terpopuler"
  homeFacts:    8,           // jumlah kartu carousel "Fakta Cepat"
  relatedMax:   3,           // jumlah artikel terkait di halaman artikel
  defaultImage: "../assets/images/placeholder.jpg",
});