/* =====================================================================
   MEDIAWAN - UTILS
   Kumpulan fungsi bantu: escape XSS, format tanggal, slug, debounce,
   toast, parsing query string, dsb.
   ===================================================================== */

/* -------------------- ESCAPE / SANITASI (cegah XSS) -------------------- */

/**
 * Escape HTML entities dari string apa pun sebelum dimasukkan ke innerHTML.
 * Selalu pakai ini untuk data dari database.
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Untuk konten artikel (multi-baris). Anggap sebagai teks biasa,
 * ubah newline menjadi paragraf <p>. Aman dari XSS.
 */
function renderArticleContent(rawContent) {
  if (!rawContent) return "";
  const safe = escapeHtml(rawContent).trim();
  if (!safe) return "";
  return safe
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/* -------------------- STRING -------------------- */

/** Buat slug dari judul: huruf kecil, ganti non-alfanumerik jadi "-". */
function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Potong teks dengan elipsis. */
function truncate(text, max = 140) {
  const str = String(text || "");
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trimEnd() + "…";
}

/* -------------------- TANGGAL -------------------- */

const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Format tanggal ke "12 Januari 2025". */
function formatDateId(input) {
  if (!input) return "-";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format tanggal relatif: "2 hari lalu", "3 jam lalu", dsb. */
function formatRelativeId(input) {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";

  const diff = Math.floor((Date.now() - d.getTime()) / 1000); // detik
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return formatDateId(input);
}

/* -------------------- URL / QUERY -------------------- */

/** Ambil query string dari URL saat ini. */
function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

/** Bangun URL absolut ke halaman artikel. */
function articleUrl(slug) {
  return `article.html?slug=${encodeURIComponent(slug)}`;
}

/* -------------------- DEBOUNCE -------------------- */

/** Debounce sederhana (untuk pencarian). */
function debounce(fn, wait = 300) {
  let timer = null;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/* -------------------- TOAST -------------------- */

let toastEl = null;
let toastTimer = null;

/** Tampilkan toast di bawah layar. Type: "info" | "success" | "error". */
function showToast(message, type = "info", duration = 2600) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "mw-toast";
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.remove("mw-toast--error", "mw-toast--success");
  if (type === "error") toastEl.classList.add("mw-toast--error");
  if (type === "success") toastEl.classList.add("mw-toast--success");

  toastEl.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("is-visible");
  }, duration);
}

/* -------------------- DOM HELPERS -------------------- */

/** Query selector pendek. */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Set konten elemen dengan aman (plain text). */
function setText(el, text) {
  if (el) el.textContent = text ?? "";
}

/* -------------------- ERROR HANDLING -------------------- */

/** Ubah error Supabase/JS jadi pesan user-friendly Bahasa Indonesia. */
function friendlyError(error) {
  if (!error) return "Terjadi kesalahan tidak diketahui.";
  const msg = String(error.message || error.error_description || error);
  if (/duplicate key/i.test(msg)) return "Data sudah ada (duplikat).";
  if (/invalid login/i.test(msg)) return "Email atau password salah.";
  if (/email not confirmed/i.test(msg)) return "Email belum dikonfirmasi.";
  if (/row-level security/i.test(msg)) return "Anda tidak punya izin untuk aksi ini.";
  if (/network|fetch/i.test(msg)) return "Koneksi bermasalah. Coba lagi.";
  return msg;
}

/* -------------------- STRIP HTML (untuk meta description) -------------------- */

/** Hilangkan tag HTML dari string (untuk description meta). */
function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
}