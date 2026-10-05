/* =====================================================================
   MEDIAWAN - ADMIN AUTH (v2 - anti redirect loop)
   ===================================================================== */

/* ---------------- Helper: tunggu session benar-benar siap ---------------- */

/**
 * Tunggu sampai Supabase selesai restore session dari storage.
 * Mengembalikan user jika ada, atau null.
 */
async function waitForSession(timeoutMs = 3000) {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (user) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.unsubscribe?.();
      resolve(user || null);
    };

    // 1) Cek session yang sudah ada dulu (fast path)
    supabaseClient.auth.getSession().then(({ data }) => {
      if (data?.session?.user) finish(data.session.user);
    });

    // 2) Dengarkan event pertama dari auth
    const { data: sub } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) finish(session.user);
    });
    const subscription = sub?.subscription || sub;

    // 3) Timeout pengaman
    const timer = setTimeout(() => {
      supabaseClient.auth.getSession().then(({ data }) => finish(data?.session?.user || null));
    }, timeoutMs);
  });
}

/**
 * Cek apakah user terdaftar sebagai admin Mediawan.
 */
async function isAdminUser(userId) {
  if (!userId) return false;
  const { data, error } = await supabaseClient
    .from(TABLES.admins)
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[admin-auth] cek mw_admins gagal:", error);
    return false;
  }
  return !!data;
}

/* ---------------- LOGIN PAGE ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  // Hanya jalankan logika login kalau ada form login di halaman ini
  const loginForm = document.getElementById("mw-login-form");
  if (loginForm) {
    renderLoginLogo();
    bindLoginForm();
    autoRedirectIfAlreadyAdmin();
  }
});

function renderLoginLogo() {
  const mount = document.getElementById("mw-login-logo");
  if (!mount) return;
  mount.innerHTML = `
    <span class="mw-logo mw-logo--lg">
      <span class="mw-logo__media">media</span><span class="mw-logo__wan">wan</span><span class="mw-logo__dot">.</span>
    </span>
  `;
}

/**
 * Kalau user sudah login DAN admin, redirect ke dashboard.
 * Tidak loop karena requireAdmin() di dashboard juga pakai waitForSession.
 */
async function autoRedirectIfAlreadyAdmin() {
  try {
    const user = await waitForSession(1500);
    if (!user) return;

    const ok = await isAdminUser(user.id);
    if (ok) {
      window.location.replace("dashboard.html");
    } else {
      // Bukan admin -> bersihkan session agar tidak bikin loop
      await supabaseClient.auth.signOut();
    }
  } catch (err) {
    console.warn("[admin-auth] autoRedirect gagal:", err);
  }
}

function bindLoginForm() {
  const form = document.getElementById("mw-login-form");
  const btn  = document.getElementById("mw-login-submit");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const email    = form.email.value.trim().toLowerCase();
    const password = form.password.value;

    if (!email || !password) {
      showError("Email dan password wajib diisi.");
      return;
    }

    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.textContent = "Memproses…";

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const userId = data?.user?.id;
      if (!userId) throw new Error("Gagal mendapatkan data user.");

      const ok = await isAdminUser(userId);
      if (!ok) {
        await supabaseClient.auth.signOut();
        showError("Akses ditolak. Akunmu tidak terdaftar sebagai admin Mediawan.");
        return;
      }

      window.location.replace("dashboard.html");
    } catch (err) {
      console.error("[admin-auth] login error:", err);
      showError(friendlyError(err));
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });
}

/* ---------------- DASHBOARD PROTECTION ---------------- */

/**
 * Dipakai oleh dashboard.html. Mengembalikan {user, email} atau null.
 * Redirect ke login KALAU benar-benar belum login / bukan admin.
 */
async function requireAdmin() {
  try {
    const user = await waitForSession(3000);
    if (!user) {
      window.location.replace("index.html");
      return null;
    }

    const ok = await isAdminUser(user.id);
    if (!ok) {
      await supabaseClient.auth.signOut();
      window.location.replace("index.html?error=akses-ditolak");
      return null;
    }

    return { user, email: user.email || "" };
  } catch (err) {
    console.error("[admin-auth] requireAdmin error:", err);
    window.location.replace("index.html");
    return null;
  }
}

/* ---------------- Helpers ---------------- */

function showError(msg) {
  const el = document.getElementById("mw-login-error");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("is-visible");
}
function hideError() {
  const el = document.getElementById("mw-login-error");
  if (!el) return;
  el.textContent = "";
  el.classList.remove("is-visible");
}