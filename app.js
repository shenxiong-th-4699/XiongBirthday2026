/* =========================================================
   CSR เลี้ยงอุปการะหมี — XIONG Birthday 2026
   (โบนัสกระตุ้นยอด: ทุก 269 บาท = อาหารน้องหมี 1 กิโล)
   - localStorage เก็บผู้ใช้ X + ประวัติการโดเนทต่อ handle
   ========================================================= */

const STORAGE_KEYS = {
  user: "hbd_xiong_user",
  donations: "hbd_xiong_donations", // { "@handle": [{...}, ...] }
};

/* ---------- Helpers ---------- */
const fmt = (n) =>
  new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);

const fmtBaht = (n) => `${APP_CONFIG.donation.currencySymbol}${fmt(n)}`;

function fmtRelativeTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000; // seconds
  if (diff < 60) return "เมื่อสักครู่";
  if (diff < 3600) return Math.floor(diff / 60) + " นาทีก่อน";
  if (diff < 86400) return Math.floor(diff / 3600) + " ชั่วโมงก่อน";
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + " วันก่อน";
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function showToast(msg) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2000);
}

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

/* ---------- Donations store ---------- */
function getAllDonations() {
  return readJSON(STORAGE_KEYS.donations, {});
}
function getUserDonations(handle) {
  const all = getAllDonations();
  return all[handle] || [];
}
function addDonation(handle, entry) {
  const all = getAllDonations();
  if (!all[handle]) all[handle] = [];
  all[handle].push(entry);
  writeJSON(STORAGE_KEYS.donations, all);
}
function getUserCumulative(handle) {
  return getUserDonations(handle).reduce((a, d) => a + Number(d.amount || 0), 0);
}

/**
 * Wall of Love feed — มาจาก API /getDonationAll เท่านั้น
 * เรียงล่าสุด → เก่า ตาม created_at
 * กรอง status === "rejected" ออก (ไม่แสดงรายการที่ไม่ผ่าน)
 * ถ้ายังไม่ได้โหลด → []
 */
function getCommunityFeed() {
  if (!window.__apiDonations || !Array.isArray(window.__apiDonations.data)) return [];
  return window.__apiDonations.data
    .filter((d) => (d.status || "pending") !== "rejected")
    .map((d) => ({
      id: d.id,
      handle: d.user_id || "",
      displayName: d.donator_name || "ผู้ใจดี",
      amount: Number(d.amount || 0),
      status: d.status || "pending",
      ts: d.created_at
        ? new Date(Number(d.created_at)).toISOString()
        : (d.transferred_date || new Date().toISOString()),
      bank: d.bank,
      refCode: d.ref_code,
    }))
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}

/** ยอดสะสมรวม — จาก API เท่านั้น (ถ้ายังไม่โหลด → 0) */
function getCommunityTotal() {
  if (window.__apiDonations && typeof window.__apiDonations.grand_total === "number") {
    return window.__apiDonations.grand_total;
  }
  return 0;
}

/** จำนวนบัญชีที่ร่วมโดเนท — นับจาก unique user_id ใน API */
function getDonorCount() {
  if (!window.__apiDonations || !Array.isArray(window.__apiDonations.data)) return 0;
  const ids = new Set(window.__apiDonations.data.map((d) => d.user_id).filter(Boolean));
  return ids.size;
}

/** ข้อมูลโหลดเสร็จแล้วหรือยัง */
function isCommunityLoaded() {
  return !!window.__apiDonations;
}

/* ---------- Bear-food helper (bonus motivator) ---------- */
function calcBearFood(amount) {
  const per = APP_CONFIG.donation.bahtPerFood || APP_CONFIG.donation.bahtPerMilk || 269;
  return Math.floor(amount / per);
}

/* ---------- Firebase init (one-shot) ---------- */
function ensureFirebase() {
  if (typeof firebase === "undefined") return null;
  if (!firebase.apps || !firebase.apps.length) {
    if (APP_CONFIG.firebase) firebase.initializeApp(APP_CONFIG.firebase);
  }
  return firebase;
}

/* ---------- X (Twitter) auth ---------- */
function getCurrentUser() {
  return readJSON(STORAGE_KEYS.user, null);
}
function setCurrentUser(u) {
  writeJSON(STORAGE_KEYS.user, u);
}
function clearCurrentUser() {
  localStorage.removeItem(STORAGE_KEYS.user);
  // ออกจาก Firebase Auth ด้วย (best effort)
  try {
    const fb = ensureFirebase();
    if (fb && fb.auth) fb.auth().signOut();
  } catch { }
}

const SAMPLE_USERS = [
  { handle: "honey_x", name: "Honey", emoji: "🍯" },
  { handle: "n1de_fan", name: "Berry", emoji: "🫐" },
  { handle: "blueberry_xx", name: "BCubcake", emoji: "🐻" },
  { handle: "cubcube", name: "Lulu", emoji: "🐰" },
  { handle: "xiongbear", name: "Sora", emoji: "🐾" },
  { handle: "petitbear", name: "Mochi", emoji: "🌸" },
  { handle: "miniN1DE", name: "Mintie", emoji: "🌼" },
  { handle: "softpaw_x", name: "Peach", emoji: "🍑" },
];

function mockXLogin() {
  const i = Math.floor(Math.random() * SAMPLE_USERS.length);
  const s = SAMPLE_USERS[i];
  const user = {
    handle: "@" + s.handle,
    name: s.name + " " + s.emoji,
    avatarEmoji: s.emoji,
  };
  setCurrentUser(user);
  return user;
}

/** map Firebase auth result → user object ภายใน */
function mapFirebaseAuthResult(result) {
  const info = result.additionalUserInfo || {};
  const profile = info.profile || {};
  const u = result.user;
  const photoUrl = (u.photoURL || profile.profile_image_url_https || "")
    .replace(/_normal\./, ".");
  return {
    handle: "@" + (info.username || profile.screen_name || ""),
    name: u.displayName || profile.name || "",
    avatarUrl: photoUrl,
    avatarEmoji: "",
    twitterId: profile.id_str || (profile.id != null ? String(profile.id) : "") || u.uid,
  };
}

function describeAuthError(err) {
  if (!err || !err.code) return "เข้าสู่ระบบ X ไม่สำเร็จ";
  switch (err.code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "ยกเลิกการเข้าสู่ระบบ";
    case "auth/popup-blocked":
      return "เบราว์เซอร์บล็อก popup — โปรดอนุญาตแล้วลองใหม่";
    case "auth/operation-not-allowed":
      return "Twitter provider ยังไม่ได้เปิดใน Firebase Console";
    case "auth/unauthorized-domain":
      return "โดเมนนี้ไม่ได้อยู่ใน Firebase Authorized domains";
    case "auth/network-request-failed":
      return "เครือข่ายมีปัญหา — ลองใหม่อีกครั้ง";
    default:
      return "เข้าสู่ระบบ X ไม่สำเร็จ (" + err.code + ")";
  }
}

/**
 * Login จริงผ่าน Firebase Auth Twitter provider
 *  1) ลอง signInWithPopup ก่อน (เร็ว ไม่ออกจากหน้า)
 *  2) ถ้า popup ถูกบล็อก/หาย → fallback เป็น signInWithRedirect
 */
async function loginWithFirebaseTwitter() {
  const fb = ensureFirebase();
  if (!fb || !fb.auth) {
    console.warn("Firebase SDK not loaded");
    showToast("ระบบยังโหลดไม่เสร็จ — ลองใหม่อีกครั้ง");
    return null;
  }
  const provider = new fb.auth.TwitterAuthProvider();

  try {
    const result = await fb.auth().signInWithPopup(provider);
    return mapFirebaseAuthResult(result);
  } catch (err) {
    console.error("Twitter sign-in (popup) failed:", err);
    const popupBroken =
      err && (err.code === "auth/popup-blocked" ||
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/web-storage-unsupported" ||
        err.code === "auth/operation-not-supported-in-this-environment");
    if (popupBroken) {
      // ใช้ redirect แทน — หน้าจะหายไป login ที่ X แล้วกลับมาที่ donate.html
      try {
        showToast("กำลังพาไปยังหน้า X...");
        sessionStorage.setItem("hbd_xiong_pending_login", "1");
        await fb.auth().signInWithRedirect(provider);
        return null; // หน้าจะหาย ไม่ return ทัน
      } catch (e) {
        console.error("Twitter sign-in (redirect) failed:", e);
        showToast(describeAuthError(e));
        return null;
      }
    }
    showToast(describeAuthError(err));
    return null;
  }
}

/**
 * เช็คว่ามี redirect result กลับมาจาก X หรือไม่ (เรียกตอนหน้าโหลด)
 * คืน user object ถ้าเจอ, null ถ้าไม่
 */
async function consumeRedirectResultIfAny() {
  const fb = ensureFirebase();
  if (!fb || !fb.auth) return null;
  try {
    const result = await fb.auth().getRedirectResult();
    if (!result || !result.user) return null;
    sessionStorage.removeItem("hbd_xiong_pending_login");
    const u = mapFirebaseAuthResult(result);
    setCurrentUser(u);
    return u;
  } catch (err) {
    console.error("getRedirectResult failed:", err);
    sessionStorage.removeItem("hbd_xiong_pending_login");
    showToast(describeAuthError(err));
    return null;
  }
}

/**
 * เลือก flow login ตามค่า config:
 *   - mode "firebase" → Firebase Auth Twitter provider (จริง)
 *   - อื่น ๆ           → mockXLogin (ทดสอบ)
 */
async function loginWithX() {
  const mode = APP_CONFIG.auth?.mode || "mock";
  if (mode === "firebase") {
    const u = await loginWithFirebaseTwitter();
    if (u) setCurrentUser(u);
    return u;
  }
  return mockXLogin();
}

/* ---------- Countdown ---------- */
function startCountdown(targetEl) {
  if (!targetEl) return;
  const deadline = new Date(APP_CONFIG.donation.deadline).getTime();

  // เซ็ต chip "หมดเขต …" ขวาบน
  const chip = document.getElementById("deadline-chip");
  if (chip) {
    const dl = new Date(APP_CONFIG.donation.deadline);
    const short = dl.toLocaleString("th-TH", {
      day: "numeric", month: "short",
    });
    chip.textContent = "⏰ หมดเขต " + short;
  }

  function tick() {
    const now = Date.now();
    let diff = deadline - now;
    const ended = diff <= 0;
    if (ended) diff = 0;

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    targetEl.innerHTML = `
      <div class="cd-cell"><div class="num">${d}</div><span class="lab">วัน</span></div>
      <div class="cd-cell"><div class="num">${String(h).padStart(2, "0")}</div><span class="lab">ชั่วโมง</span></div>
      <div class="cd-cell"><div class="num">${String(m).padStart(2, "0")}</div><span class="lab">นาที</span></div>
      <div class="cd-cell"><div class="num">${String(s).padStart(2, "0")}</div><span class="lab">วินาที</span></div>
    `;
  }

  tick();
  setInterval(tick, 1000);
}

/* ---------- Profile painting (used in step 2/3 + login card) ---------- */
function paintProfileEl(el, user) {
  if (!el) return;
  const nameEl = el.querySelector(".name");
  const handleEl = el.querySelector(".handle");
  const avatarEl = el.querySelector(".avatar");
  if (!user) {
    if (nameEl) nameEl.textContent = "—";
    if (handleEl) handleEl.textContent = "—";
    if (avatarEl) avatarEl.textContent = "X";
    return;
  }
  if (nameEl) nameEl.textContent = user.name || "—";
  if (handleEl) handleEl.textContent = user.handle || "—";
  if (avatarEl) {
    avatarEl.innerHTML = "";
    if (user.avatarUrl) {
      const img = document.createElement("img");
      img.src = user.avatarUrl;
      img.alt = "";
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = user.avatarEmoji || (user.handle || "X")[1]?.toUpperCase() || "X";
    }
  }
}

/* ---------- Wall of Love (with pagination) ---------- */
function setupWallOfLove() {
  const list = document.getElementById("donor-list");
  if (!list) return;

  const prevBtn = document.getElementById("wall-prev");
  const nextBtn = document.getElementById("wall-next");
  const info = document.getElementById("wall-info");
  const countChip = document.getElementById("wall-count");

  const pageSize = APP_CONFIG.wallOfLove?.pageSize || 5;
  let page = 0;

  const pager = document.getElementById("wall-pager");

  function render() {
    const loaded = isCommunityLoaded();
    const feed = getCommunityFeed();
    const total = feed.length;

    // Loading state — กำลังดึงข้อมูลจาก API
    if (!loaded) {
      list.innerHTML = `
        <li class="donor-empty donor-loading">
          <div class="donor-empty-icon">⏳</div>
          <div class="donor-empty-text">
            <span>กำลังโหลดข้อมูล...</span>
          </div>
        </li>
      `;
      if (countChip) countChip.textContent = "—";
      if (pager) pager.style.display = "none";
      return;
    }

    // Empty state — โหลดแล้วแต่ยังไม่มีข้อมูล
    if (total === 0) {
      list.innerHTML = `
        <li class="donor-empty">
          <div class="donor-empty-icon">🐻💌</div>
          <div class="donor-empty-text">
            <strong>ยังไม่มีการโดเนท</strong>
            <span>เป็นคนแรกที่ป้อนอาหารน้องหมีกันมั้ย</span>
          </div>
          <a class="btn btn-primary btn-sm donor-empty-cta" href="donate.html">
            แจ้งโดเนท 💌
          </a>
        </li>
      `;
      if (countChip) countChip.textContent = "0 รายการ";
      if (pager) pager.style.display = "none";
      return;
    }

    if (pager) pager.style.display = "";
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    page = Math.max(0, Math.min(page, totalPages - 1));

    const start = page * pageSize;
    const slice = feed.slice(start, start + pageSize);

    list.innerHTML = slice
      .map((d) => {
        const status = d.status === "approved" ? "approved" : "pending";
        const statusText = status === "approved" ? "ตรวจสอบแล้ว" : "รอตรวจสอบ";
        return `
          <li>
            <div class="donor-info">
              <span class="donor-name">${escapeHtml(d.displayName || d.handle)}</span>
              <span class="donor-time">${escapeHtml(fmtRelativeTime(d.ts))}</span>
            </div>
            <div class="donor-meta">
              <span class="donor-amount">${fmtBaht(d.amount)}</span>
              <span class="donor-status status-${status}">${statusText}</span>
            </div>
          </li>`;
      })
      .join("");

    if (info) info.textContent = `${page + 1}/${totalPages}`;
    if (countChip) countChip.textContent = `${fmt(total)} รายการ`;
    if (prevBtn) prevBtn.disabled = page <= 0;
    if (nextBtn) nextBtn.disabled = page >= totalPages - 1;
  }

  prevBtn?.addEventListener("click", () => { page--; render(); });
  nextBtn?.addEventListener("click", () => { page++; render(); });

  render();
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- Render: Home page ---------- */
function renderHome() {
  // hashtags — รองรับทั้ง array (hashtags) และ string เดี่ยว (hashtag) แบบ legacy
  const metaEl = document.getElementById("hashtag-meta");
  if (metaEl) {
    const tags = Array.isArray(APP_CONFIG.artist.hashtags)
      ? APP_CONFIG.artist.hashtags
      : APP_CONFIG.artist.hashtag ? [APP_CONFIG.artist.hashtag] : [];
    // ล้าง chip hashtag เก่า (ถ้ามี) ก่อนเติมใหม่ที่หัว
    metaEl.querySelectorAll(".chip.hashtag").forEach((el) => el.remove());
    tags.slice().reverse().forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "chip hashtag";
      chip.textContent = tag;
      metaEl.insertBefore(chip, metaEl.firstChild);
    });
  }

  const locChip = document.getElementById("location-chip");
  if (locChip) locChip.textContent = "📍 " + APP_CONFIG.campaign.location;

  const bearEl = document.getElementById("bear-count");
  if (bearEl && APP_CONFIG.campaign.bearCount) {
    bearEl.textContent = fmt(APP_CONFIG.campaign.bearCount);
  }

  function paintTotals() {
    const loaded = isCommunityLoaded();
    const total = getCommunityTotal();
    const goal = APP_CONFIG.donation.goal;
    const pct = Math.min(100, (total / goal) * 100);

    const totalEl = document.getElementById("total-amount");
    if (totalEl) totalEl.textContent = loaded ? fmtBaht(total) : "—";

    const goalEl = document.getElementById("goal-amount");
    if (goalEl) goalEl.textContent = fmtBaht(goal);

    const pctEl = document.getElementById("progress-bar");
    if (pctEl) pctEl.style.width = (loaded ? pct.toFixed(1) : 0) + "%";

    const pctText = document.getElementById("progress-percent");
    if (pctText) pctText.textContent = loaded ? pct.toFixed(1) + "%" : "—";

    const donorsEl = document.getElementById("donor-count");
    if (donorsEl) donorsEl.textContent = loaded ? fmt(getDonorCount()) : "—";

    const foodEl = document.getElementById("food-count");
    if (foodEl) foodEl.textContent = loaded ? fmt(calcBearFood(total)) : "—";
  }

  // ขณะรอ API → แสดงเส้นประ "—"
  paintTotals();
  setupWallOfLove();
  startCountdown(document.getElementById("countdown"));

  // ดึงของจริงจาก API
  if (window.Api && window.Api.isConfigured()) {
    window.Api.getDonationAll()
      .then((data) => {
        window.__apiDonations = data || { grand_total: 0, data: [] };
        paintTotals();
        setupWallOfLove();
      })
      .catch((err) => {
        console.warn("getDonationAll failed:", err);
        // ถือว่าโหลดเสร็จแต่ว่างเปล่า เพื่อให้ UI ไม่ค้างที่ "—"
        window.__apiDonations = { grand_total: 0, data: [] };
        paintTotals();
        setupWallOfLove();
      });
  } else {
    // API ยังไม่ตั้งค่า → ถือว่าว่าง
    window.__apiDonations = { grand_total: 0, data: [] };
    paintTotals();
    setupWallOfLove();
  }
}

/* ---------- Slip OCR (n8n webhook) ---------- */

/**
 * แปลง "23/04/2026 20:10:00" → ISO string (สมมุติเป็นเวลา Bangkok)
 * ถ้า year > 2400 → ถือว่าเป็น พ.ศ. ลบ 543
 */
function parseSlipDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  const m = String(dateStr).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (!m) return new Date().toISOString();
  const [, dd, mm, yyyy, hh = "00", mi = "00", ss = "00"] = m;
  let year = Number(yyyy);
  if (year > 2400) year -= 543;
  const iso =
    `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}` +
    `T${hh.padStart(2, "0")}:${mi.padStart(2, "0")}:${ss.padStart(2, "0")}+07:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * เรียก n8n CheckSlip API → ตอบเป็น internal shape ที่ renderSlipResult ใช้
 */
async function readSlipWithOcr(file) {
  if (!window.Api || !window.Api.checkSlip) {
    return { valid: false, reason: "ระบบยังโหลดไม่เสร็จ — ลองใหม่อีกครั้ง" };
  }
  try {
    const r = await window.Api.checkSlip(file);
    if (!r || r.is_slip === false) {
      return {
        valid: false,
        reason: "ภาพที่แนบไม่ใช่สลิปการโอนเงิน — กรุณาแนบสลิปจริง",
      };
    }
    return {
      valid: true,
      amount: Number(r.amount || 0),
      refNo: r.ref_number || "",
      senderBank: r.bank_code || "",
      senderName: r.sender_name || "",
      senderAccount: r.sender_account || "",
      receiverName: r.receiver_name || APP_CONFIG.payment.bank.accountName,
      receiverAccount: APP_CONFIG.payment.bank.accountNumber,
      transferredAt: parseSlipDate(r.date),
      currency: r.currency || "THB",
    };
  } catch (err) {
    console.error("checkSlip API error:", err);
    return { valid: false, reason: "เกิดข้อผิดพลาดในการตรวจสอบสลิป กรุณาลองใหม่" };
  }
}

function renderSlipResult(result) {
  const box = document.getElementById("slip-result");
  if (!box) return;
  box.classList.remove("show", "error", "manual");

  if (!result || !result.valid) {
    box.classList.add("show", "error");
    box.innerHTML = `
      <h4>⚠️ แนบไฟล์ไม่ถูกต้อง</h4>
      <p>${escapeHtml((result && result.reason) || "ไม่สามารถอ่านสลิปได้"
    )}</p>
      <button id="slip-manual-btn" type="button" class="slip-manual-btn">
        ✏️ ยืนยันว่าถูกต้อง · กรอกยอดเอง
      </button>
    `;
    return;
  }

  const dateStr = new Date(result.transferredAt).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  box.classList.add("show");
  box.innerHTML = `
    <h4>✅ ตรวจพบข้อมูลสลิป — กรุณายืนยัน</h4>
    <div class="slip-row">
      <span class="k">ยอดที่โอน</span>
      <span class="v amount">${fmtBaht(result.amount)}</span>
    </div>
    <div class="slip-row">
      <span class="k">ผู้รับ</span>
      <span class="v">${escapeHtml(result.receiverName || "—")}</span>
    </div>
    <div class="slip-row">
      <span class="k">บัญชีปลายทาง</span>
      <span class="v">${escapeHtml(result.receiverAccount || "—")}</span>
    </div>
    <div class="slip-row">
      <span class="k">ธนาคารผู้โอน</span>
      <span class="v">${escapeHtml(result.senderBank || "—")}</span>
    </div>
    <div class="slip-row">
      <span class="k">เลขที่อ้างอิง</span>
      <span class="v">${escapeHtml(result.refNo || "—")}</span>
    </div>
    <div class="slip-row">
      <span class="k">เวลาโอน</span>
      <span class="v">${dateStr}</span>
    </div>
  `;
}

/* ---------- Render: Donate page ---------- */
function setupDonatePage() {
  const stepEls = [...document.querySelectorAll(".step")];
  const panels = [...document.querySelectorAll(".panel")];
  const wizardProgress = document.getElementById("wizard-progress");

  function gotoStep(idx) {
    stepEls.forEach((s, i) => {
      s.classList.toggle("active", i === idx);
      s.classList.toggle("done", i < idx);
    });
    panels.forEach((p, i) => p.classList.toggle("active", i === idx));

    // อัปเดตเส้นความคืบหน้าใน wizard stepper
    // Track ครอบจากกลางวงกลมแรก (1/6 ของ width) ถึงกลางวงกลมสุดท้าย (5/6)
    // → ความกว้าง track = 100% - (2 * 1/6) = 4/6 ≈ 66.667%
    if (wizardProgress && stepEls.length > 1) {
      const N = stepEls.length;
      const insetPct = 100 / (N * 2); // จาก stepper ที่มี flex children เท่า ๆ กัน
      const trackWidthPct = 100 - insetPct * 2;
      const fraction = idx / (N - 1);
      wizardProgress.style.width = (fraction * trackWidthPct).toFixed(3) + "%";
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // รีเซ็ต state ของ scoop game (เรียกตอน logout)
  function resetStep2State() {
    scoopCount = 0;
    customAmount = 0;
    useCustom = false;
    const ci = document.getElementById("custom-amount-input");
    if (ci) ci.value = "";
    // reset tabs → game mode
    const cs = document.getElementById("custom-section");
    if (cs) cs.hidden = true;
    const gp = document.getElementById("game-panel");
    if (gp) gp.hidden = false;
    const tabGame = document.getElementById("tab-game");
    if (tabGame) tabGame.classList.add("active");
    const tabCustom = document.getElementById("tab-custom");
    if (tabCustom) tabCustom.classList.remove("active");
    // ซ่อน suggested-amount-box ในหน้า payment
    const sb = document.getElementById("suggested-amount-box");
    if (sb) sb.hidden = true;
    // repaint
    if (typeof resetBearBowl === "function") resetBearBowl();
    if (typeof paintScoop === "function") paintScoop();
  }

  // ---- Step 1: X login ----
  const loginBtn = document.getElementById("x-login-btn");

  function paintAllProfiles(user) {
    paintProfileEl(document.getElementById("x-profile-step-scoop"), user);
    paintProfileEl(document.getElementById("x-profile-step2"), user);
    paintProfileEl(document.getElementById("x-profile-step3"), user);
  }

  /**
   * Flow ร่วมหลังจากได้ user object แล้ว — ใช้ทั้งกับ login ผ่าน X จริง
   * และ manual @handle fallback
   */
  async function processUserAfterLogin(u, opts = {}) {
    if (!u) return;

    if (window.Api && window.Api.isConfigured()) {
      const xId = u.twitterId || (u.handle || "").replace(/^@/, "");
      const handleNoAt = (u.handle || "").replace(/^@/, "");
      console.log("[login] checking user x_id =", xId);
      try {
        const r = await window.Api.getUserInfoByXid(xId);
        console.log("[login] getUserInfoByXid →", r);

        const isFound = r && r.success === true && r.data && r.data.user_info;
        if (isFound) {
          u.userId = r.data.user_info.user_id;
          u.cumulativeAmount = Number(r.data.total_donate_amount || 0);
          console.log("[login] existing user, user_id =", u.userId);
        } else {
          // ทุกกรณีที่ไม่ใช่ "found" → ลองสร้าง user ใหม่
          console.log("[login] user not found → calling saveUser");
          const saved = await window.Api.saveUser({
            x_id: xId,
            username: handleNoAt,
            account: u.name || handleNoAt,
            profile_url: u.avatarUrl || "",
          });
          console.log("[login] saveUser →", saved);
          if (saved && saved.success && saved.data) {
            u.userId = saved.data.user_id;
            u.cumulativeAmount = 0;
            console.log("[login] new user created, user_id =", u.userId);
          } else {
            console.warn("[login] saveUser returned non-success:", saved);
          }
        }
        setCurrentUser(u);
      } catch (err) {
        console.error("[login] user info / save failed:", err);
        showToast("เชื่อมต่อ backend ไม่ได้ — โดเนทอาจไม่ถูกบันทึก");
      }
    }

    paintAllProfiles(u);
    paintPaymentInfo();
    showToast(opts.toastText || "เชื่อมต่อบัญชี X สำเร็จ");
    gotoStep(1);
  }

  async function handleLogin() {
    let u;
    try {
      u = await loginWithX();
    } catch (err) {
      console.error("Login failed:", err);
      showToast("ไม่สามารถเข้าสู่ระบบได้ — ลองใหม่อีกครั้ง");
      return false;
    }
    if (!u) return false; // user cancelled / popup closed / fallback redirect
    await processUserAfterLogin(u);
    return true;
  }

  /* ---------- Manual @handle fallback ---------- */
  function cleanHandle(input) {
    return String(input || "").trim().replace(/^@+/, "").replace(/\s+/g, "");
  }
  function isValidHandle(handle) {
    // X handle rules: 1–15 chars, [A-Za-z0-9_]
    return /^[A-Za-z0-9_]{1,15}$/.test(handle);
  }
  async function handleManualLogin(rawValue) {
    const handle = cleanHandle(rawValue);
    if (!isValidHandle(handle)) {
      showToast("กรอก @account ให้ถูกต้อง (เช่น xiongbear, ห้ามมีช่องว่าง)");
      return;
    }
    const u = {
      handle: "@" + handle,
      name: handle,
      avatarUrl: "",
      avatarEmoji: "🐻",
      twitterId: handle,    // ใช้ handle เป็น x_id (ไม่มี Twitter numeric id ตอน manual)
      isManual: true,
    };
    setCurrentUser(u);
    await processUserAfterLogin(u, { toastText: "ใช้ @" + handle + " เรียบร้อย" });
  }

  // Toggle collapsible manual section
  const manualToggleBtn = document.getElementById("manual-toggle-btn");
  const manualSection = document.getElementById("manual-section");
  function setManualOpen(open) {
    if (!manualSection || !manualToggleBtn) return;
    if (open) {
      manualSection.removeAttribute("hidden");
      manualToggleBtn.setAttribute("aria-expanded", "true");
      // focus input หลัง animation เล็กน้อย
      setTimeout(() => document.getElementById("manual-handle")?.focus(), 200);
    } else {
      manualSection.setAttribute("hidden", "");
      manualToggleBtn.setAttribute("aria-expanded", "false");
    }
  }
  manualToggleBtn?.addEventListener("click", () => {
    const isOpen = manualToggleBtn.getAttribute("aria-expanded") === "true";
    setManualOpen(!isOpen);
  });

  if (loginBtn) {
    loginBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      loginBtn.disabled = true;
      try {
        const ok = await handleLogin();
        // ถ้า login ไม่สำเร็จ (user cancel / popup เพี้ยน / etc) → auto-expand manual
        if (!ok && !getCurrentUser()) setManualOpen(true);
      }
      finally { loginBtn.disabled = false; }
    });
  } else {
    console.warn("X login button not found");
  }

  // Manual @handle form — submit by Enter หรือกดปุ่ม
  const manualForm = document.getElementById("manual-handle-form");
  const manualInput = document.getElementById("manual-handle");
  manualForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("manual-handle-btn");
    if (btn) btn.disabled = true;
    try { await handleManualLogin(manualInput?.value); }
    finally { if (btn) btn.disabled = false; }
  });

  // ---- Step 2: Payment info ----
  function paintPaymentInfo() {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? "—";
    };
    set("bank-name", APP_CONFIG.payment.bank.bankName);
    set("bank-account-name", APP_CONFIG.payment.bank.accountName);
    set("bank-account-number", APP_CONFIG.payment.bank.accountNumber);

    const qr = document.getElementById("qr-img");
    if (qr) qr.src = APP_CONFIG.payment.qrImage;
  }

  // เช็ค redirect-result จาก Firebase (กรณี fallback ใช้ signInWithRedirect)
  // ทำแบบ async แต่ไม่ block UI
  (async () => {
    const pending = sessionStorage.getItem("hbd_xiong_pending_login");
    if (pending) {
      const u = await consumeRedirectResultIfAny();
      if (u) {
        // ทำต่อให้เหมือนกด login สำเร็จปกติ
        if (window.Api && window.Api.isConfigured()) {
          const xId = u.twitterId || (u.handle || "").replace(/^@/, "");
          const handleNoAt = (u.handle || "").replace(/^@/, "");
          try {
            const r = await window.Api.getUserInfoByXid(xId);
            if (r && r.success && r.data && r.data.user_info) {
              u.userId = r.data.user_info.user_id;
              u.cumulativeAmount = Number(r.data.total_donate_amount || 0);
            } else if (r && r.error_code === "USER_NOT_FOUND") {
              const saved = await window.Api.saveUser({
                x_id: xId,
                username: handleNoAt,
                account: u.name || handleNoAt,
                profile_url: u.avatarUrl || "",
              });
              if (saved && saved.success && saved.data) u.userId = saved.data.user_id;
            }
            setCurrentUser(u);
          } catch (e) { console.warn(e); }
        }
        paintAllProfiles(u);
        paintPaymentInfo();
        showToast("เชื่อมต่อบัญชี X สำเร็จ");
        gotoStep(1);
      }
    }
  })();

  // ถ้าเข้าหน้านี้แล้วมี user อยู่แล้ว → กระโดดไป step 2
  const existingUser = getCurrentUser();
  if (existingUser) {
    paintAllProfiles(existingUser);
    paintPaymentInfo();
    gotoStep(1);
  }

  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.copyTarget;
      const targetEl = targetId ? document.getElementById(targetId) : null;
      const value = (targetEl?.textContent || "").trim();
      if (!value) return;
      navigator.clipboard?.writeText(value).then(
        () => showToast("คัดลอกแล้ว: " + value),
        () => showToast("คัดลอกไม่สำเร็จ")
      );
    });
  });

  function logoutAndReset() {
    clearCurrentUser();
    paintAllProfiles(null);
    resetStep2State();
  }

  document.getElementById("logout-step-scoop")?.addEventListener("click", () => {
    logoutAndReset();
    showToast("ออกจากระบบแล้ว");
    gotoStep(0);
  });
  document.getElementById("logout-step2")?.addEventListener("click", () => {
    logoutAndReset();
    showToast("ออกจากระบบแล้ว");
    gotoStep(0);
  });
  document.getElementById("logout-step3")?.addEventListener("click", () => {
    logoutAndReset();
    showToast("ออกจากระบบแล้ว");
    gotoStep(0);
  });

  // ===== Step 2: Scoop game (feed the bear) =====
  // State (อยู่ใน closure ของ setupDonatePage ดังนั้น reset เมื่อ reload หน้าเท่านั้น)
  const PER_SCOOP = 46; // 1 ตัก = ฿46 เสมอ
  let scoopCount = 0;
  let customAmount = 0;
  let useCustom = false;

  // อาหารที่แสดงในถ้วย (หมุนเวียนตามลำดับ)
  const BOWL_FOODS = ["🍯", "🍎", "🫐", "🍓", "🍖", "🐟", "🥕", "🌽", "🍗", "🥜"];
  const BOWL_MAX_DISPLAY = 20; // สูงสุดที่แสดงในถ้วย

  const elBtnScoop = document.getElementById("btn-scoop");
  const elBtnReset = document.getElementById("btn-reset-scoop");
  const elTotalAmt = document.getElementById("total-amount-game");
  const elSpoon = document.getElementById("game-spoon");
  const elBear = document.getElementById("game-bear");
  const elFloats = document.getElementById("game-floats");
  const elTabGame = document.getElementById("tab-game");
  const elTabCustom = document.getElementById("tab-custom");
  const elGamePanel = document.getElementById("game-panel");
  const elCustomSection = document.getElementById("custom-section");
  const elCustomInput = document.getElementById("custom-amount-input");
  const elScoopContinue = document.getElementById("step-scoop-continue");
  const elBearBowlFood = document.getElementById("bear-bowl-food");
  const elBearBowlLabel = document.getElementById("bear-bowl-label");

  // คำนวณยอดโดเนท: 1 ตัก = ฿46 เสมอ
  function currentAmount() {
    if (useCustom) {
      const typed = Math.max(0, Math.floor(customAmount || 0));
      return typed > 0 ? typed : PER_SCOOP;
    }
    return scoopCount * PER_SCOOP;
  }

  // เพิ่มอาหาร 1 ชิ้นเข้าถ้วย (เรียกทุกครั้งที่กดตัก — append เท่านั้น ไม่ rebuild)
  function addFoodToBowl() {
    if (!elBearBowlFood) return;

    if (scoopCount <= BOWL_MAX_DISPLAY) {
      // ลบ overflow badge เก่าก่อน (ถ้ามี) แล้ว append food item ใหม่
      const overflow = elBearBowlFood.querySelector(".bear-bowl-overflow");
      if (overflow) overflow.remove();

      const span = document.createElement("span");
      span.className = "bear-bowl-food-item";
      span.textContent = BOWL_FOODS[(scoopCount - 1) % BOWL_FOODS.length];
      elBearBowlFood.appendChild(span);

      // ถ้าเกิน MAX ให้ใส่ badge กลับ
      if (scoopCount === BOWL_MAX_DISPLAY) {
        // เต็มพอดี ไม่ต้องมี badge
      }
    } else {
      // เกิน max → อัปเดต overflow badge
      let badge = elBearBowlFood.querySelector(".bear-bowl-overflow");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "bear-bowl-overflow";
        elBearBowlFood.appendChild(badge);
      }
      badge.textContent = `+${scoopCount - BOWL_MAX_DISPLAY}`;
    }

    // label
    if (elBearBowlLabel) {
      if (scoopCount <= 3) {
        elBearBowlLabel.textContent = `🥣 มีอาหารแล้ว ${scoopCount} ตัก 💕`;
      } else if (scoopCount <= 10) {
        elBearBowlLabel.textContent = `🥣 อาหารกำลังเยอะขึ้น ${scoopCount} ตัก 🎉`;
      } else {
        elBearBowlLabel.textContent = `🥣 โอ้โห ${scoopCount} ตัก! หมีแฮปปี้มาก 💖`;
      }
    }
  }

  // ล้างถ้วย (เรียกตอน reset)
  function resetBearBowl() {
    if (elBearBowlFood) elBearBowlFood.innerHTML = "";
    if (elBearBowlLabel) elBearBowlLabel.textContent = "";
  }

  // เก็บค่าก่อนหน้าไว้เทียบ → ใช้กับ pulse animation
  let prevAmount = 0;

  function paintScoop(opts = {}) {
    const amt = currentAmount();

    if (elTotalAmt) elTotalAmt.textContent = fmt(amt);

    // อัปเดต caption ตามสถานะ
    const cap = document.getElementById("dth-cap");
    if (cap) {
      cap.textContent = amt > 0
        ? (useCustom ? "💰 ยอดโดเนทของคุณ" : "💖 ยอดโดเนทสะสมจากการตัก")
        : "🐻 รอตักอาหารให้หมี";
    }

    // Pulse animation เมื่อยอดเปลี่ยน
    const hero = document.getElementById("donate-total-hero");
    if (hero && amt !== prevAmount) {
      hero.classList.remove("pulse");
      void hero.offsetWidth; // restart animation
      hero.classList.add("pulse");
      setTimeout(() => hero.classList.remove("pulse"), 1300);
    }
    prevAmount = amt;

    if (elScoopContinue) {
      elScoopContinue.textContent = amt > 0
        ? `ดำเนินการต่อ → (${fmtBaht(amt)})`
        : "ดำเนินการต่อ →";
    }
  }

  function spawnFloat(content, cls) {
    if (!elFloats) return;
    const el = document.createElement("div");
    el.className = "game-float " + (cls || "");
    el.textContent = content;
    // เพิ่ม horizontal jitter เล็กน้อยเพื่อความน่ารัก
    el.style.left = (45 + Math.random() * 10) + "%";
    elFloats.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  elBtnScoop?.addEventListener("click", () => {
    scoopCount += 1;

    // restart animations
    elSpoon?.classList.remove("scoop");
    void elSpoon?.offsetWidth;
    elSpoon?.classList.add("scoop");
    elBear?.classList.remove("chew");
    void elBear?.offsetWidth;
    elBear?.classList.add("chew");

    // float แสดง +฿46 (fixed เสมอ)
    spawnFloat("+฿46", "gain");

    addFoodToBowl();
    paintScoop();
  });

  elBtnReset?.addEventListener("click", () => {
    scoopCount = 0;
    if (elCustomInput) elCustomInput.value = "";
    customAmount = 0;
    resetBearBowl();
    paintScoop();
    showToast("รีเซ็ตแล้ว เริ่มตักใหม่ได้เลย!");
  });

  function switchToGame() {
    useCustom = false;
    if (elGamePanel) elGamePanel.hidden = false;
    if (elCustomSection) elCustomSection.hidden = true;
    elTabGame?.classList.add("active");
    elTabCustom?.classList.remove("active");
    paintScoop();
  }
  function switchToCustom() {
    useCustom = true;
    if (elGamePanel) elGamePanel.hidden = true;
    if (elCustomSection) elCustomSection.hidden = false;
    elTabGame?.classList.remove("active");
    elTabCustom?.classList.add("active");
    paintScoop();
    setTimeout(() => elCustomInput?.focus(), 100);
  }
  elTabGame?.addEventListener("click", switchToGame);
  elTabCustom?.addEventListener("click", switchToCustom);

  elCustomInput?.addEventListener("input", () => {
    customAmount = Number(elCustomInput.value || 0);
    paintScoop();
  });

  elScoopContinue?.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) return gotoStep(0);

    const amt = currentAmount();
    window.__suggestedAmount = amt;

    // อัปเดต suggested amount บนหน้า QR
    const box = document.getElementById("suggested-amount-box");
    const valEl = document.getElementById("suggested-amount-val");
    if (amt > 0) {
      if (valEl) valEl.textContent = fmtBaht(amt);
      if (box) box.hidden = false;
    } else {
      if (box) box.hidden = true;
    }

    gotoStep(2); // ไปหน้า QR/ช่องทางโอน
  });

  // initial paint
  resetBearBowl();
  paintScoop();

  document.getElementById("step3-payment-back")?.addEventListener("click", () => gotoStep(1));

  document.getElementById("step2-continue")?.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) return gotoStep(0);
    paintAllProfiles(user);
    gotoStep(3); // ★ เพิ่มจาก 2 → 3 เพราะมี scoop step คั่นแล้ว
    const dn = document.getElementById("display-name");
    if (dn && !dn.value) dn.value = user.name || user.handle || "";
  });

  // ---- Step 3: Slip upload + OCR ----
  const receiptInput = document.getElementById("receipt");
  const receiptPreview = document.getElementById("receipt-preview");
  const fileMeta = document.getElementById("file-meta");
  const submitBtn = document.getElementById("step3-continue");
  const slipLoading = document.getElementById("slip-loading");
  const slipResultBox = document.getElementById("slip-result");
  const displayNameField = document.getElementById("displayname-field");
  const displayNameInput = document.getElementById("display-name");

  let lastSlipResult = null;

  function setSubmitEnabled(ok) {
    if (!submitBtn) return;
    submitBtn.disabled = !ok;
  }
  setSubmitEnabled(false);

  const resultRow = document.getElementById("step3-result-row");

  // เก็บ Promise ของการอัปโหลดไป Google Drive ที่กำลังทำงาน
  // — ยิงคู่ขนานกับ checkSlip ตอนที่ user เลือกไฟล์ → กดยืนยันแล้วใช้ผลได้ทันที
  let driveUploadPromise = null;
  let currentChangeId = 0;

  receiptInput?.addEventListener("change", async () => {
    const myId = ++currentChangeId;
    const file = receiptInput.files[0];
    lastSlipResult = null;
    setSubmitEnabled(false);
    if (slipResultBox) {
      slipResultBox.classList.remove("show", "error");
      slipResultBox.innerHTML = "";
    }
    displayNameField?.classList.remove("show");

    if (!file) {
      if (receiptPreview) receiptPreview.removeAttribute("src");
      if (fileMeta) fileMeta.textContent = "รองรับ jpg, png, pdf";
      resultRow?.classList.remove("show");
      driveUploadPromise = null;
      return;
    }

    // มีไฟล์แล้ว → เริ่มทั้งสอง API พร้อมกัน
    resultRow?.classList.add("show");
    if (fileMeta) fileMeta.textContent = file.name + " · " + Math.round(file.size / 1024) + " KB";

    if (receiptPreview) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (myId === currentChangeId) receiptPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        receiptPreview.removeAttribute("src");
      }
    }

    // ★ ยิง Drive upload ทันทีแบบ background — ไม่ await
    //   ใช้ผลตอน user กด "ยืนยันการโดเนท"
    driveUploadPromise = (window.Api && window.Api.uploadSlipImage)
      ? window.Api.uploadSlipImage(file).catch((err) => {
        console.warn("Drive upload failed (best-effort):", err);
        return null;
      })
      : Promise.resolve(null);

    // ขณะเดียวกัน ยิง checkSlip + แสดง loading
    if (slipLoading) slipLoading.classList.add("show");
    try {
      const result = await readSlipWithOcr(file);
      if (myId !== currentChangeId) return;   // user เปลี่ยนไฟล์ระหว่างรอ
      lastSlipResult = result;
      renderSlipResult(result);
      const ok = !!(result && result.valid);
      setSubmitEnabled(ok);
      if (ok) {
        const u = getCurrentUser();
        if (displayNameInput && !displayNameInput.value) {
          displayNameInput.value = u?.name || u?.handle || "";
        }
        displayNameField?.classList.add("show");
      }
    } catch (err) {
      if (myId !== currentChangeId) return;
      console.error(err);
      lastSlipResult = { valid: false, reason: "เกิดข้อผิดพลาดในการอ่านสลิป กรุณาลองใหม่" };
      renderSlipResult(lastSlipResult);
      setSubmitEnabled(false);
    } finally {
      if (myId === currentChangeId && slipLoading) slipLoading.classList.remove("show");
    }
  });

  document.getElementById("step3-back")?.addEventListener("click", () => gotoStep(2)); // ★ ย้อนกลับไป payment (idx 2 ใหม่ เพราะมี scoop step คั่น)

  // Event delegation: เมื่อกดปุ่ม "ยืนยันว่าถูกต้อง / กรอกยอดเอง" → เข้าโหมด manual
  slipResultBox?.addEventListener("click", (e) => {
    const btn = e.target.closest("#slip-manual-btn");
    if (btn) enterManualMode();
  });

  function enterManualMode(prefill) {
    if (!slipResultBox) return;
    slipResultBox.classList.remove("error");
    slipResultBox.classList.add("show", "manual");
    slipResultBox.innerHTML = `
      <h4>✏️ กรอกยอดที่โอนเอง</h4>
      <div class="amount-input-wrap">
        <span class="baht-cap">฿</span>
        <input id="manual-amount" type="number" min="1" step="1" inputmode="numeric" placeholder="0" />
        <span class="baht-cap">บาท</span>
      </div>
      <p class="manual-help">ระบบจะใช้ยอดนี้บันทึกเป็นการโดเนทของคุณ</p>
    `;
    setSubmitEnabled(false);
    const input = slipResultBox.querySelector("#manual-amount");
    if (input) {
      if (prefill) input.value = prefill;
      input.focus();
      input.addEventListener("input", () => {
        const v = Number(input.value || 0);
        if (v > 0) {
          lastSlipResult = {
            valid: true,
            manual: true,
            amount: v,
            receiverName: APP_CONFIG.payment.bank.accountName,
            receiverAccount: APP_CONFIG.payment.bank.accountNumber,
            transferredAt: new Date().toISOString(),
          };
          setSubmitEnabled(true);
          // เปิดช่อง displayName ให้ผู้ใช้แก้ก่อนยืนยัน (ถ้ายังไม่เปิด)
          const u = getCurrentUser();
          if (displayNameInput && !displayNameInput.value) {
            displayNameInput.value = u?.name || u?.handle || "";
          }
          displayNameField?.classList.add("show");
        } else {
          lastSlipResult = null;
          setSubmitEnabled(false);
        }
      });
    }
  }

  submitBtn?.addEventListener("click", async () => {
    if (!lastSlipResult || !lastSlipResult.valid) {
      showToast("กรุณาแนบสลิปที่ระบบอ่านได้");
      return;
    }
    const user = getCurrentUser();
    if (!user) return gotoStep(0);

    const file = receiptInput?.files?.[0];
    const displayName = (displayNameInput?.value || "").trim() || user.name || user.handle;
    const transferredAt = lastSlipResult.transferredAt || new Date().toISOString();

    submitBtn.disabled = true;
    const oldText = submitBtn.textContent;

    // ★ รอ Drive upload (ที่ยิงคู่ขนานไปแล้ว) — ส่วนใหญ่จะเสร็จก่อน checkSlip นานแล้ว
    let slipImageUrl = "";
    if (driveUploadPromise) {
      submitBtn.textContent = "กำลังอัปโหลดสลิป...";
      try {
        const dr = await driveUploadPromise;
        if (dr && dr.success) slipImageUrl = dr.fileUrl || dr.fileId || "";
      } catch (err) {
        console.warn("Drive upload error (continue without):", err);
      }
    }

    const pending = {
      handle: user.handle,
      name: user.name,
      displayName,
      avatarUrl: user.avatarUrl || "",
      avatarEmoji: user.avatarEmoji,
      amount: lastSlipResult.amount,
      receiptName: file?.name || "slip",
      ts: transferredAt,
      refNo: lastSlipResult.refNo,
      senderBank: lastSlipResult.senderBank,
      senderName: lastSlipResult.senderName,
      senderAccount: lastSlipResult.senderAccount,
      slipImage: slipImageUrl,
    };

    // ★ บันทึกโดเนทผ่าน Cloud Function /saveDonate
    if (window.Api && window.Api.isConfigured()) {
      if (!user.userId) {
        console.warn("[donate] user.userId missing — saveDonate may fail");
      }
      submitBtn.textContent = "กำลังบันทึก...";
      const payload = {
        user_id: user.userId || (user.twitterId || user.handle || "").replace(/^@/, ""),
        donator_name: displayName,
        amount: lastSlipResult.amount,
        transferred_date: transferredAt,
        bank: lastSlipResult.senderBank || "",
        sender_account: lastSlipResult.senderAccount || "",
        sender_name: lastSlipResult.senderName || "",
        ref_code: lastSlipResult.refNo || "",
        slip_image: slipImageUrl,
      };
      console.log("[donate] saveDonate payload:", payload);
      try {
        const r = await window.Api.saveDonate(payload);
        console.log("[donate] saveDonate →", r);
        if (!r || !r.success) {
          throw new Error((r && r.message) || "saveDonate failed");
        }
      } catch (err) {
        console.error("[donate] saveDonate failed:", err);
        showToast("บันทึกไม่สำเร็จ — ลองใหม่อีกครั้ง");
        submitBtn.disabled = false;
        submitBtn.textContent = oldText;
        return;
      }
    }

    addDonation(user.handle, pending);
    sessionStorage.setItem("hbd_xiong_last", JSON.stringify(pending));
    window.location.href = "thank-you.html";
  });
}

/* ---------- Render: Thank you page ---------- */
function renderThankYou() {
  const last = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("hbd_xiong_last")) || null;
    } catch {
      return null;
    }
  })();

  const card = document.getElementById("ty-card");
  if (!card) return;

  // share URL
  const shareText = encodeURIComponent(APP_CONFIG.social.shareText);
  const shareUrl = encodeURIComponent(APP_CONFIG.social.siteUrl);
  const shareHref = `${APP_CONFIG.social.twitter}${shareText}&url=${shareUrl}`;

  if (!last) {
    card.innerHTML = `
      <h2 style="text-align:center;margin:0 0 8px">ยังไม่มีข้อมูลการโดเนท</h2>
      <p class="muted" style="text-align:center;margin:0 0 18px">เริ่มร่วมโดเนทได้เลย 🐻</p>
      <div class="actions ty-actions">
        <a class="btn btn-primary" href="donate.html">ไปหน้าโดเนท</a>
        <a class="btn btn-ghost" href="index.html">กลับหน้าหลัก</a>
      </div>
    `;
    return;
  }

  const cumulative = getUserCumulative(last.handle);
  const foodGrams = calcBearFood(last.amount);
  const cumulativeFood = calcBearFood(cumulative);
  const dispName = last.displayName || last.name || last.handle;
  const avatarInner = last.avatarUrl
    ? `<img src="${escapeHtml(last.avatarUrl)}" alt="" />`
    : escapeHtml(last.avatarEmoji || (last.handle || "X")[1]?.toUpperCase() || "X");

  card.innerHTML = `
    <!-- Bear-feeding animation (top, prominent) -->
    <div class="ty-feeding" aria-hidden="true">
      <div class="ty-feeder">
        <div class="ty-feeder-avatar">${avatarInner}</div>
        <div class="ty-feeder-bowl">🥣</div>
        <div class="ty-feeder-name">${escapeHtml(dispName)}</div>
      </div>
      <div class="ty-food-flight">
        <span class="ty-food-bit" style="--d:0s">🍯</span>
        <span class="ty-food-bit" style="--d:.6s">🍓</span>
        <span class="ty-food-bit" style="--d:1.2s">🍎</span>
        <span class="ty-food-bit" style="--d:1.8s">🐟</span>
      </div>
      <div class="ty-hearts">
        <span class="ty-heart" style="--d:.8s">💖</span>
        <span class="ty-heart" style="left:14px;--d:1.6s">💕</span>
        <span class="ty-heart" style="left:-12px;--d:2.4s">💗</span>
      </div>
      <div class="ty-bear">🐻</div>
    </div>

    <!-- Brief thank you -->
    <h1 class="ty-title-compact">ขอบคุณนะ 💖</h1>
    <p class="ty-sub-compact">เงินโดเนทของคุณจะถูกนำไปเป็นอาหารให้น้องหมี ในวันที่ 29 มิถุนายน นี้ 🐻</p>

    <!-- Unified summary card: hero this-donation + 2 secondary stats -->
    <div class="ty-summary-card">
      <div class="ty-hero-stat">
        <div class="ty-hero-cap">โดเนทครั้งนี้</div>
        <div class="ty-hero-val">${fmtBaht(last.amount)}</div>
      </div>
      <div class="ty-secondary">
        <div class="ty-mini-stat">
          <span class="ty-mini-cap">ยอดสะสมรวม</span>
          <strong class="ty-mini-val">${fmtBaht(cumulative)}</strong>
        </div>
        <div class="ty-mini-divider"></div>
        <div class="ty-mini-stat">
          <span class="ty-mini-cap">อาหารน้องหมีสะสม</span>
          <strong class="ty-mini-val">${fmt(cumulativeFood)} <span class="ty-mini-unit">${APP_CONFIG.donation.foodUnit || "กิโล"}</span></strong>
        </div>
      </div>
    </div>

    <!-- Single-row buttons -->
    <div class="actions ty-actions">
      <a class="btn btn-x" href="${shareHref}" target="_blank" rel="noopener">
        <span style="font-size:18px">𝕏</span> แชร์บน X
      </a>
      <a class="btn btn-primary" href="index.html">กลับหน้าหลัก</a>
      <a class="btn btn-ghost" href="donate.html">โดเนทเพิ่ม</a>
    </div>
  `;
}

/* ---------- Page bootstrap ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  try {
    if (page === "home") renderHome();
    else if (page === "donate") setupDonatePage();
    else if (page === "thanks") renderThankYou();
  } catch (err) {
    console.error("Page bootstrap error:", err);
  }
});
