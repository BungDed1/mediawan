/* =====================================================================
   MEDIAWAN - ADMIN AUTH
   Login via Supabase Auth, cek keanggotaan mw_admins.
   Menolak user yang tidak terdaftar sebagai admin Mediawan.
   ===================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  renderLoginLogo();
  bindLoginForm();

  // Kalau sudah login dan merupakan admin, langsung ke dashboard
  const ok = await checkAdminAndRedirect();
  if (ok) return;
});

/* -------------------- LOGO -------------------- */

function renderLoginLogo() {
  const mount = document.getElementById("mw-login-logo");
  if (!mount) return;
  // logoTemplate didefinisikan di components.js (belum dimuat di halaman ini),
  // jadi kita definisikan versi minimal khusus admin.
  mount.innerHTML = `
    <span class="mw-logo mw-logo--lg">
      <span class="mw-logo__media">media</span><span class="mw-logo__wan">wan</span><span class="mw-logo__dot">.</span>
    </span>
  `;
}

/* -------------------- FORM LOGIN -------------------- */

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

      // Cek apakah user terdaftar di mw_admins
      const { data: adminRow, error: adminErr } = await supabaseClient
        .from(TABLES.admins)
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (adminErr) throw adminErr;

      if (!adminRow) {
        // Bukan admin Mediawan -> logout & tolak
        await supabaseClient.auth.signOut();
        showError("Akses ditolak. Akunmu tidak terdaftar sebagai admin Mediawan.");
        return;
      }

      // Sukses
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("[admin-auth] login error:", err);
      showError(friendlyError(err));
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });
}

/* -------------------- CEK SESI + ADMIN (REDIRECT) -------------------- */

/**
 * Kalau user sudah login dan terdaftar sebagai admin, redirect ke dashboard.
 * Dipakai saat halaman login dibuka kembali.
 * @returns {Promise<boolean>} true kalau user langsung di-redirect.
 */
async function checkAdminAndRedirect() {
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return false;

    const { data: adminRow, error } = await supabaseClient
      .from(TABLES.admins)
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (!adminRow) {
      // Sesi ada, tapi bukan admin -> logout untuk bersihkan
      await supabaseClient.auth.signOut();
      return false;
    }

    window.location.href = "dashboard.html";
    return true;
  } catch (err) {
    console.warn("[admin-auth] cek sesi gagal:", err);
    return false;
  }
}

/* -------------------- PROTEKSI UNTUK DASHBOARD -------------------- */

/**
 * Dipakai oleh dashboard.html: memastikan user login dan admin.
 * Kalau tidak, redirect ke halaman login.
 * @returns {Promise<{user: object, email: string} | null>}
 */
async function requireAdmin() {
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) {
      window.location.replace("index.html");
      return null;
    }

    const { data: adminRow, error } = await supabaseClient
      .from(TABLES.admins)
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (!adminRow) {
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

/* -------------------- HELPERS -------------------- */

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