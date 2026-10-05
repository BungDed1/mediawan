/* =====================================================================
   MEDIAWAN - COMPONENTS (v3)
   ===================================================================== */

const MENU_ITEMS = [
  { label: "Beranda",   href: "index.html",                          slug: "beranda"   },
  { label: "Fakta",     href: "pages/category.html?slug=fakta",      slug: "fakta"     },
  { label: "Berita",    href: "pages/category.html?slug=berita",     slug: "berita"    },
  { label: "Teknologi", href: "pages/category.html?slug=teknologi",  slug: "teknologi" },
  { label: "Hiburan",   href: "pages/category.html?slug=hiburan",    slug: "hiburan"   },
  { label: "Olahraga",  href: "pages/category.html?slug=olahraga",   slug: "olahraga"  },
  { label: "Tentang",   href: "pages/about.html",                    slug: "tentang"   },
];

function getPathPrefix() {
  const path = window.location.pathname;
  if (path.includes("/pages/") || path.includes("/admin/")) return "../";
  return "";
}

const ICON_SEARCH = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="7"></circle>
    <line x1="16.5" y1="16.5" x2="21" y2="21"></line>
  </svg>
`;

const SOCIAL_ICONS = {
  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.7 14.1c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3.3-.9-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.4-1.1-2.7 0-1.3.7-1.9.9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.7-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.2.5.2.6.3.1.2.1.7-.1 1.4Z"/></svg>`,
  instagram:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`,
  x:        `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23 22h-6.6l-5.2-6.8L5.2 22H2l7.3-8.3L1.7 2h6.8l4.7 6.2L18.9 2Zm-1.1 18h1.7L6.3 3.8H4.5L17.8 20Z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.8 1.9-1.8H17V2.4c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6v2.6H7V13h2.8v9h3.7Z"/></svg>`,
  youtube:  `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12s0-3.3-.4-4.9c-.2-.9-.9-1.5-1.7-1.7C18.3 5 12 5 12 5s-6.3 0-7.9.4c-.9.2-1.5.9-1.7 1.7C2 8.7 2 12 2 12s0 3.3.4 4.9c.2.9.9 1.5 1.7 1.7C5.7 19 12 19 12 19s6.3 0 7.9-.4c.9-.2 1.5-.9 1.7-1.7.4-1.6.4-4.9.4-4.9ZM10 15V9l5.2 3L10 15Z"/></svg>`,
};

function logoTemplate({ size = "", light = false, href = null } = {}) {
  const cls = ["mw-logo", size ? `mw-logo--${size}` : "", light ? "mw-logo--light" : ""].filter(Boolean).join(" ");
  const inner = `<span class="mw-logo__media">media</span><span class="mw-logo__wan">wan</span><span class="mw-logo__dot">.</span>`;
  if (href !== null) return `<a href="${href}" class="${cls}" aria-label="Mediawan - Beranda">${inner}</a>`;
  return `<span class="${cls}">${inner}</span>`;
}

function renderHeader({ active = "" } = {}) {
  const mount = document.getElementById("mw-header");
  if (!mount) return;

  const prefix = getPathPrefix();
  const homeHref = `${prefix}index.html`;

  const navLinks = MENU_ITEMS.map((item) => {
    const href = `${prefix}${item.href}`;
    const isActive = item.slug === active;
    return `<a href="${href}" ${isActive ? 'aria-current="page"' : ""}>${item.label}</a>`;
  }).join("");

  const sideLinks = MENU_ITEMS.map((item) => {
    const href = `${prefix}${item.href}`;
    const isActive = item.slug === active;
    return `<a href="${href}" ${isActive ? 'aria-current="page"' : ""}>${item.label}</a>`;
  }).join("");

  mount.innerHTML = `
    <header class="mw-header">
      <div class="mw-container mw-header__inner">
        <button class="mw-header__burger" id="mw-burger"
                aria-label="Buka menu" aria-controls="mw-sidebar" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
        <div class="mw-header__logo">${logoTemplate({ href: homeHref })}</div>
        <nav class="mw-header__nav" aria-label="Menu utama">${navLinks}</nav>
        <form class="mw-header__search mw-search-mini" id="mw-search-form" role="search">
          <label class="mw-visually-hidden" for="mw-search-input">Cari artikel</label>
          <input id="mw-search-input" type="search" name="q" placeholder="Cari berita…" autocomplete="off">
          <button type="submit" aria-label="Cari">${ICON_SEARCH}</button>
        </form>
      </div>
    </header>
    <aside class="mw-sidebar" id="mw-sidebar" aria-hidden="true">
      <div class="mw-sidebar__head">
        ${logoTemplate({ size: "sm", href: homeHref })}
        <button class="mw-sidebar__close" id="mw-sidebar-close" aria-label="Tutup menu">×</button>
      </div>
      <nav class="mw-sidebar__nav" aria-label="Menu mobile">${sideLinks}</nav>
      <form class="mw-search-mini" id="mw-search-form-mobile" role="search">
        <label class="mw-visually-hidden" for="mw-search-input-mobile">Cari artikel</label>
        <input id="mw-search-input-mobile" type="search" name="q" placeholder="Cari berita…" autocomplete="off">
        <button type="submit" aria-label="Cari">${ICON_SEARCH}</button>
      </form>
    </aside>
    <div class="mw-backdrop" id="mw-backdrop"></div>
  `;

  bindHeaderEvents(prefix);
}

function bindHeaderEvents(prefix) {
  const burger     = document.getElementById("mw-burger");
  const sidebar    = document.getElementById("mw-sidebar");
  const backdrop   = document.getElementById("mw-backdrop");
  const closeBtn   = document.getElementById("mw-sidebar-close");
  const searchForm = document.getElementById("mw-search-form");
  const searchFormMobile = document.getElementById("mw-search-form-mobile");

  const openSidebar = () => {
    sidebar.classList.add("is-open");
    backdrop.classList.add("is-open");
    sidebar.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  };
  const closeSidebar = () => {
    sidebar.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    sidebar.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  burger?.addEventListener("click", openSidebar);
  closeBtn?.addEventListener("click", closeSidebar);
  backdrop?.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSidebar(); });

  const goSearch = (value) => {
    const q = String(value || "").trim();
    if (!q) return;
    window.location.href = `${prefix}pages/search.html?q=${encodeURIComponent(q)}`;
  };
  searchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    goSearch(searchForm.querySelector("input[name=q]")?.value);
  });
  searchFormMobile?.addEventListener("submit", (e) => {
    e.preventDefault();
    goSearch(searchFormMobile.querySelector("input[name=q]")?.value);
  });
}

async function renderFooter() {
  const mount = document.getElementById("mw-footer");
  if (!mount) return;

  const prefix = getPathPrefix();
  const defaults = {
    footer_desc: "Mediawan adalah media berita & fakta independen. Kami menyajikan informasi yang terverifikasi, hangat, dan mudah dipahami.",
    footer_copyright: "Dibuat dengan ❤ di Indonesia.",
    social_whatsapp: "", social_instagram: "", social_x: "",
    social_facebook: "", social_youtube: "",
  };

  let s = defaults;
  try {
    const map = await loadSettings();
    s = { ...defaults, ...map };
  } catch (err) {
    console.warn("[footer] gagal load settings:", err);
  }

  const socialItems = [
    { key: "whatsapp",  url: s.social_whatsapp,  label: "WhatsApp" },
    { key: "instagram", url: s.social_instagram, label: "Instagram" },
    { key: "x",         url: s.social_x,         label: "X" },
    { key: "facebook",  url: s.social_facebook,  label: "Facebook" },
    { key: "youtube",   url: s.social_youtube,   label: "YouTube" },
  ].filter((x) => x.url && x.url.trim());

  const socialHTML = socialItems.length
    ? `<div class="mw-footer__social">
         ${socialItems.map((x) => `
           <a href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer"
              aria-label="${escapeHtml(x.label)}" title="${escapeHtml(x.label)}">
             ${SOCIAL_ICONS[x.key] || ""}
           </a>
         `).join("")}
       </div>`
    : "";

  mount.innerHTML = `
    <footer class="mw-footer">
      <div class="mw-container">
        <div class="mw-footer__grid">
          <div>
            ${logoTemplate({ light: true, size: "lg", href: `${prefix}index.html` })}
            <p style="color:#b9b4ab; margin-top:12px; max-width:360px; line-height:1.7;">
              ${escapeHtml(s.footer_desc)}
            </p>
            ${socialHTML}
          </div>
          <div>
            <h3 class="mw-footer__title">Kategori</h3>
            <ul class="mw-footer__list">
              <li><a href="${prefix}pages/category.html?slug=fakta">Fakta</a></li>
              <li><a href="${prefix}pages/category.html?slug=berita">Berita</a></li>
              <li><a href="${prefix}pages/category.html?slug=teknologi">Teknologi</a></li>
              <li><a href="${prefix}pages/category.html?slug=hiburan">Hiburan</a></li>
              <li><a href="${prefix}pages/category.html?slug=olahraga">Olahraga</a></li>
            </ul>
          </div>
          <div>
            <h3 class="mw-footer__title">Mediawan</h3>
            <ul class="mw-footer__list">
              <li><a href="${prefix}pages/about.html">Tentang Kami</a></li>
              <li><a href="${prefix}pages/search.html">Pencarian</a></li>
            </ul>
          </div>
        </div>
        <div class="mw-footer__bottom">
          <span>© ${new Date().getFullYear()} Mediawan. Semua hak dilindungi.</span>
          <span>${escapeHtml(s.footer_copyright)}</span>
        </div>
      </div>
    </footer>
  `;
}

function articleCardHTML(a, { compact = false, prefix = "" } = {}) {
  const url = `${prefix}${articleUrl(a.slug)}`;
  const img = a.cover_image_url || `${prefix}${APP.defaultImage}`;
  const category = a.mw_categories?.name || "";
  const date = formatRelativeId(a.published_at || a.created_at);
  return `
    <article class="mw-card ${compact ? "mw-card--compact" : ""}">
      <a href="${url}" class="mw-card__media" aria-label="${escapeHtml(a.title)}">
        <img src="${escapeHtml(img)}" alt="${escapeHtml(a.title)}" loading="lazy">
      </a>
      <div class="mw-card__body">
        <div class="mw-card__meta">
          ${category ? `<span class="mw-badge">${escapeHtml(category)}</span>` : ""}
          <span>${escapeHtml(date)}</span>
        </div>
        <h3 class="mw-card__title"><a href="${url}">${escapeHtml(a.title)}</a></h3>
        ${a.excerpt ? `<p class="mw-card__excerpt">${escapeHtml(a.excerpt)}</p>` : ""}
      </div>
    </article>
  `;
}

function popularItemHTML(a, index, prefix = "") {
  const url = `${prefix}${articleUrl(a.slug)}`;
  return `
    <li class="mw-list__item">
      <span class="mw-list__num">${String(index + 1).padStart(2, "0")}</span>
      <div>
        <h4 class="mw-list__title"><a href="${url}">${escapeHtml(a.title)}</a></h4>
        <div class="mw-list__meta">
          ${a.mw_categories?.name ? escapeHtml(a.mw_categories.name) + " · " : ""}
          ${a.views ?? 0} kali dibaca
        </div>
      </div>
    </li>
  `;
}

function skeletonCards(count = 6) {
  return Array.from({ length: count }).map(() => `<div class="mw-skeleton mw-skeleton--card"></div>`).join("");
}

function skeletonList(count = 5) {
  return Array.from({ length: count }).map(() => `
    <div style="display:flex; gap:12px; align-items:flex-start;">
      <div class="mw-skeleton" style="width:32px;height:32px;border-radius:8px;"></div>
      <div style="flex:1;">
        <div class="mw-skeleton mw-skeleton--title"></div>
        <div class="mw-skeleton mw-skeleton--text"></div>
      </div>
    </div>
  `).join("");
}

function emptyStateHTML(title = "Belum ada artikel", message = "Nantikan konten terbaru dari Mediawan.") {
  return `<div class="mw-state"><div class="mw-state__title">${escapeHtml(title)}</div><p>${escapeHtml(message)}</p></div>`;
}

function errorStateHTML(message = "Gagal memuat data. Coba lagi sebentar lagi.") {
  return `<div class="mw-state mw-state--error"><div class="mw-state__title">Terjadi kesalahan</div><p>${escapeHtml(message)}</p></div>`;
}

function initPageChrome({ active = "", footer = true } = {}) {
  renderHeader({ active });
  if (footer) renderFooter();
}