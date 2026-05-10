/* =========================================================
   CSR เลี้ยงอุปการะหมี — XIONG Birthday 2026
   (โบนัสกระตุ้นยอด: ทุก 296 บาท = นมเด็ก 1 กล่อง)
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
 * รวมการโดเนททั้งหมดเป็น "feed" สำหรับ Wall of Love
 * - seed entries จาก config.seed.donations
 * - + entries ที่ผู้ใช้บันทึกผ่านหน้า donate
 * เรียงตามเวลาล่าสุด → เก่า
 */
function getCommunityFeed() {
  const seed = (APP_CONFIG.seed?.donations || []).map((d) => ({
    handle: d.handle,
    displayName: d.displayName || d.handle,
    amount: Number(d.amount || 0),
    ts: d.ts,
  }));

  const userEntries = [];
  const all = getAllDonations();
  for (const handle of Object.keys(all)) {
    for (const d of all[handle]) {
      userEntries.push({
        handle,
        displayName: d.displayName || d.name || handle,
        amount: Number(d.amount || 0),
        ts: d.ts,
      });
    }
  }

  const merged = seed.concat(userEntries);
  // เรียงล่าสุด → เก่า
  merged.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  return merged;
}

function getCommunityTotal() {
  const base = APP_CONFIG.seed?.baseTotal || 0;
  return base + getCommunityFeed().reduce((a, d) => a + d.amount, 0);
}

function getDonorCount() {
  const base = APP_CONFIG.seed?.baseDonors || 0;
  const handles = new Set(getCommunityFeed().map((d) => d.handle));
  return base + handles.size;
}

/* ---------- Bear-food helper (bonus motivator) ---------- */
function calcBearFood(amount) {
  const per = APP_CONFIG.donation.bahtPerFood || APP_CONFIG.donation.bahtPerMilk || 296;
  return Math.floor(amount / per);
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
}

const SAMPLE_USERS = [
  { handle: "honey_x",      name: "Honey",     emoji: "🍯" },
  { handle: "n1de_fan",     name: "Berry",     emoji: "🫐" },
  { handle: "blueberry_xx", name: "BCubcake",  emoji: "🐻" },
  { handle: "cubcube",      name: "Lulu",      emoji: "🐰" },
  { handle: "xiongbear",    name: "Sora",      emoji: "🐾" },
  { handle: "petitbear",    name: "Mochi",     emoji: "🌸" },
  { handle: "miniN1DE",     name: "Mintie",    emoji: "🌼" },
  { handle: "softpaw_x",    name: "Peach",     emoji: "🍑" },
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

/**
 * เลือก flow login ตามค่า config:
 *   - ถ้า window.X_AUTH_CONFIG มีและ mode === "real" และ APP_CONFIG.auth.mode === "real"
 *     → เด้งไปหน้า OAuth ของ X (ต้องมี backend สำหรับ callback)
 *   - ไม่งั้นใช้ mockXLogin()
 */
function loginWithX() {
  try {
    const xCfg = (typeof window !== "undefined" && window.X_AUTH_CONFIG) || null;
    const appMode = APP_CONFIG.auth?.mode || "mock";
    const xMode = xCfg?.mode || "mock";

    if (appMode === "real" && xMode === "real" && xCfg?.oauth2?.clientId) {
      const cb =
        xCfg.callbackUrls.local && location.hostname === "localhost"
          ? xCfg.callbackUrls.local
          : xCfg.callbackUrls.staging;
      const url =
        "https://x.com/i/oauth2/authorize?response_type=code" +
        "&client_id=" + encodeURIComponent(xCfg.oauth2.clientId) +
        "&redirect_uri=" + encodeURIComponent(cb) +
        "&scope=" + encodeURIComponent((xCfg.oauth2.scopes || []).join(" ")) +
        "&state=" + Math.random().toString(36).slice(2) +
        "&code_challenge=challenge&code_challenge_method=plain";
      window.location.href = url;
      return null;
    }
  } catch (err) {
    console.warn("loginWithX: real flow failed, falling back to mock", err);
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
      <div class="cd-cell"><div class="num">${String(h).padStart(2,"0")}</div><span class="lab">ชั่วโมง</span></div>
      <div class="cd-cell"><div class="num">${String(m).padStart(2,"0")}</div><span class="lab">นาที</span></div>
      <div class="cd-cell"><div class="num">${String(s).padStart(2,"0")}</div><span class="lab">วินาที</span></div>
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

  function render() {
    const feed = getCommunityFeed();
    const total = feed.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    page = Math.max(0, Math.min(page, totalPages - 1));

    const start = page * pageSize;
    const slice = feed.slice(start, start + pageSize);

    list.innerHTML = slice
      .map(
        (d) => `
        <li>
          <div class="donor-info">
            <span class="donor-name">${escapeHtml(d.displayName || d.handle)}</span>
            <span class="donor-handle">${escapeHtml(d.handle)}</span>
          </div>
          <div class="donor-meta">
            <span class="donor-amount">${fmtBaht(d.amount)}</span>
            <span class="donor-time">${fmtRelativeTime(d.ts)}</span>
          </div>
        </li>`
      )
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
  const hashtagChip = document.getElementById("hashtag-chip");
  if (hashtagChip) hashtagChip.textContent = APP_CONFIG.artist.hashtag;

  const locChip = document.getElementById("location-chip");
  if (locChip) locChip.textContent = "📍 " + APP_CONFIG.campaign.location;

  // Total + progress
  const total = getCommunityTotal();
  const goal = APP_CONFIG.donation.goal;
  const pct = Math.min(100, (total / goal) * 100);

  const totalEl = document.getElementById("total-amount");
  if (totalEl) totalEl.textContent = fmtBaht(total);

  const goalEl = document.getElementById("goal-amount");
  if (goalEl) goalEl.textContent = fmtBaht(goal);

  const pctEl = document.getElementById("progress-bar");
  if (pctEl) pctEl.style.width = pct.toFixed(1) + "%";

  const pctText = document.getElementById("progress-percent");
  if (pctText) pctText.textContent = pct.toFixed(1) + "%";

  // donor count อาจมี/ไม่มีในหน้า (ถูกตัดออกจาก progress section ฉบับใหม่)
  const donorsEl = document.getElementById("donor-count");
  if (donorsEl) donorsEl.textContent = fmt(getDonorCount());

  // Bear-food bonus impact
  const foodEl = document.getElementById("food-count");
  if (foodEl) foodEl.textContent = fmt(calcBearFood(total));

  // Wall of Love (with pagination)
  setupWallOfLove();

  // Countdown
  startCountdown(document.getElementById("countdown"));
}

/* ---------- Slip OCR (mock) ---------- */
async function readSlipWithOcr(file) {
  const cfg = APP_CONFIG.slipOcr || { mode: "mock" };

  if (cfg.mode === "real" && cfg.endpoint) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: cfg.apiKey ? { "x-api-key": cfg.apiKey } : {},
      body: fd,
    });
    if (!res.ok) throw new Error("OCR API error " + res.status);
    return await res.json();
  }

  // ----- Mock mode (จำลอง 3 วินาทีให้ feel เหมือนกำลังประมวลผลภาพจริง) -----
  await new Promise((r) => setTimeout(r, 3000));

  const isImage = (file.type || "").startsWith("image/");
  if (!isImage) {
    return {
      valid: false,
      reason: "ไม่สามารถอ่านสลิปได้ — กรุณาแนบรูปภาพสลิปที่ชัดเจน",
    };
  }

  const amounts = [50, 100, 129, 200, 250, 296, 329, 500, 590, 1000];
  const amount = amounts[Math.floor(Math.random() * amounts.length)];
  const refNo = "P" + Math.floor(Math.random() * 1e10).toString().padStart(10, "0");
  const senderBanks = ["KBANK", "SCB", "KTB", "BBL", "TTB"];
  const senderBank = senderBanks[Math.floor(Math.random() * senderBanks.length)];

  // Mock: ภาพถูกต้องตลอด (ไม่มี random failure แล้ว)

  return {
    valid: true,
    amount,
    refNo,
    senderBank,
    receiverName: APP_CONFIG.payment.bank.accountName,
    receiverAccount: APP_CONFIG.payment.bank.accountNumber,
    transferredAt: new Date().toISOString(),
  };
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

  // (Step 2 ไม่มีช่องกรอกยอดและ scoop game แล้ว — ผู้ใช้โอนตามใจ
  //  แล้วระบบ OCR ที่ Step 3 จะเป็นตัวยืนยันยอด)
  function resetStep2State() {
    /* placeholder for forward-compat */
  }

  // ---- Step 1: X login ----
  const loginBtn = document.getElementById("x-login-btn");

  function paintAllProfiles(user) {
    paintProfileEl(document.getElementById("x-profile-step2"), user);
    paintProfileEl(document.getElementById("x-profile-step3"), user);
  }

  function handleLogin() {
    let u;
    try {
      u = loginWithX();
    } catch (err) {
      console.error("Login failed:", err);
      showToast("ไม่สามารถเข้าสู่ระบบได้ — ลองใหม่อีกครั้ง");
      return;
    }
    if (!u) return; // real flow → redirect ไปแล้ว
    paintAllProfiles(u);
    paintPaymentInfo();
    showToast("เชื่อมต่อบัญชี X สำเร็จ");
    gotoStep(1);
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogin();
    });
  } else {
    console.warn("X login button not found");
  }

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

  document.getElementById("step2-continue")?.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) return gotoStep(0);
    paintAllProfiles(user);
    gotoStep(2);
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

  receiptInput?.addEventListener("change", async () => {
    const file = receiptInput.files[0];
    lastSlipResult = null;
    setSubmitEnabled(false);
    if (slipResultBox) {
      slipResultBox.classList.remove("show", "error");
      slipResultBox.innerHTML = "";
    }
    displayNameField?.classList.remove("show");

    if (!file) {
      if (receiptPreview) {
        receiptPreview.removeAttribute("src");
      }
      if (fileMeta) fileMeta.textContent = "รองรับ jpg, png, pdf";
      resultRow?.classList.remove("show");
      return;
    }

    // มีไฟล์แล้ว → แสดง result row และเริ่ม loading
    resultRow?.classList.add("show");

    if (fileMeta) fileMeta.textContent = file.name + " · " + Math.round(file.size / 1024) + " KB";
    if (receiptPreview) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          receiptPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        receiptPreview.removeAttribute("src");
      }
    }

    if (slipLoading) slipLoading.classList.add("show");
    try {
      const result = await readSlipWithOcr(file);
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
      console.error(err);
      lastSlipResult = { valid: false, reason: "เกิดข้อผิดพลาดในการอ่านสลิป กรุณาลองใหม่" };
      renderSlipResult(lastSlipResult);
      setSubmitEnabled(false);
    } finally {
      if (slipLoading) slipLoading.classList.remove("show");
    }
  });

  document.getElementById("step3-back")?.addEventListener("click", () => gotoStep(1));

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

  submitBtn?.addEventListener("click", () => {
    if (!lastSlipResult || !lastSlipResult.valid) {
      showToast("กรุณาแนบสลิปที่ระบบอ่านได้");
      return;
    }
    const user = getCurrentUser();
    if (!user) return gotoStep(0);

    const file = receiptInput?.files?.[0];
    const displayName = (displayNameInput?.value || "").trim() || user.name || user.handle;
    const pending = {
      handle: user.handle,
      name: user.name,
      displayName,
      avatarEmoji: user.avatarEmoji,
      amount: lastSlipResult.amount,
      receiptName: file?.name || "slip",
      ts: lastSlipResult.transferredAt || new Date().toISOString(),
      refNo: lastSlipResult.refNo,
      senderBank: lastSlipResult.senderBank,
    };
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
          <strong class="ty-mini-val">${fmt(cumulativeFood)} <span class="ty-mini-unit">กรัม</span></strong>
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
