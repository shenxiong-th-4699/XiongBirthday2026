/* =========================================================
   Admin page — list / search / approve / reject donations
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);

  /* ---------- Helpers ---------- */
  const fmt = (n) => new Intl.NumberFormat("th-TH").format(Number(n) || 0);
  const fmtBaht = (n) => "฿" + fmt(n);

  function fmtDateTime(ts) {
    if (!ts) return "—";
    const d = typeof ts === "number"
      ? new Date(ts)
      : new Date(/^\d+$/.test(ts) ? Number(ts) : ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function statusOf(d) {
    return (d && d.status) || "pending";
  }

  function statusLabel(s) {
    if (s === "approved") return "✓ อนุมัติแล้ว";
    if (s === "rejected") return "✗ ปฏิเสธ";
    return "⏳ รออนุมัติ";
  }

  function avatarLetter(name) {
    const s = (name || "?").trim();
    return s ? s[0].toUpperCase() : "?";
  }

  function shortId(id) {
    if (!id) return "";
    return id.length <= 12 ? id : id.slice(0, 8) + "…" + id.slice(-3);
  }

  /**
   * Convert Google Drive view URL → embeddable thumbnail URL
   * ใช้ host lh3.googleusercontent.com ซึ่ง embed ได้สเถียรกว่า drive.google.com/thumbnail
   * ต้องการให้ file ถูก share แบบ "Anyone with the link" ใน Apps Script
   */
  function driveImg(slipUrl, w = 400) {
    if (!slipUrl) return null;
    let m = String(slipUrl).match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) m = String(slipUrl).match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w${w}`;
    return slipUrl;
  }

  // Global helper สำหรับ <img onerror> — ปลอดภัยกว่า remove() แล้วเข้าถึง parent
  window.adminImgFallback = function (img) {
    const p = img && img.parentElement;
    if (!p) return;
    p.classList.add("no-image");
    p.textContent = "📎";  // replace children (รวม img ที่ fail) ด้วย text node
  };

  /* ---------- State ---------- */
  let allDonations = [];

  /* ---------- Load ---------- */
  async function loadAll() {
    const list = $("admin-list");
    list.innerHTML = '<div class="admin-loading">⏳ กำลังโหลด...</div>';
    try {
      if (!window.Api || !window.Api.isConfigured()) {
        throw new Error("API endpoint ไม่ได้ตั้งค่า");
      }
      const r = await window.Api.getDonationAll();
      allDonations = (r && Array.isArray(r.data)) ? r.data : [];
      renderStats();
      renderList();
    } catch (err) {
      console.error("loadAll failed:", err);
      list.innerHTML = `<div class="admin-empty">โหลดข้อมูลไม่สำเร็จ — ${escapeHtml(err.message || String(err))}</div>`;
    }
  }

  /* ---------- Stats ---------- */
  function renderStats() {
    const approved = allDonations.filter((d) => statusOf(d) === "approved");
    const totalApproved = approved.reduce((a, d) => a + Number(d.amount || 0), 0);
    const users = new Set(allDonations.map((d) => d.user_id || d.donator_name)).size;
    const items = allDonations.length;

    $("stat-total").textContent = fmtBaht(totalApproved);
    $("stat-users").textContent = fmt(users);
    $("stat-items").textContent = fmt(items);
  }

  /* ---------- Group by user ---------- */
  function groupByUser(items) {
    const map = new Map();
    for (const d of items) {
      const key = d.user_id || ("name:" + (d.donator_name || "anon"));
      if (!map.has(key)) {
        map.set(key, {
          key,
          userId: d.user_id || "",
          name: d.donator_name || "(ไม่ระบุชื่อ)",
          profileUrl: d.profile_url || d.donator_profile_url || "",
          donations: [],
          total: 0,
          approvedTotal: 0,
          latestTs: 0,
        });
      }
      const g = map.get(key);
      g.donations.push(d);
      g.total += Number(d.amount || 0);
      if (statusOf(d) === "approved") g.approvedTotal += Number(d.amount || 0);

      // เก็บ timestamp ล่าสุดของ user นี้ ไว้ใช้ sort
      const ts = Number(d.created_at || 0);
      if (ts > g.latestTs) g.latestTs = ts;

      // อัพเดต profile_url ถ้า record อื่นมี (เผื่อ rec แรกไม่มี)
      if (!g.profileUrl && (d.profile_url || d.donator_profile_url)) {
        g.profileUrl = d.profile_url || d.donator_profile_url;
      }
    }
    // sort donations within group: latest first
    for (const g of map.values()) {
      g.donations.sort((a, b) => Number(b.created_at || 0) - Number(a.created_at || 0));
    }
    // sort groups: latest donation first (recent activity → top)
    return [...map.values()].sort((a, b) => b.latestTs - a.latestTs);
  }

  /* ---------- Render ---------- */
  function renderList() {
    const groups = groupByUser(allDonations);
    const list = $("admin-list");
    if (groups.length === 0) {
      list.innerHTML = '<div class="admin-empty">ยังไม่มีข้อมูลโดเนท</div>';
      return;
    }
    list.innerHTML = groups.map(renderUserCard).join("");
  }

  function renderAvatar(g) {
    const letter = escapeHtml(avatarLetter(g.name));
    if (g.profileUrl) {
      // Twitter รูปโปรไฟล์ขนาดเต็ม (ตัด _normal ออก ถ้ามี)
      const url = String(g.profileUrl).replace(/_normal\./, ".");
      return `<div class="admin-avatar has-img">
                <img src="${escapeHtml(url)}" alt=""
                     onerror="this.parentElement.classList.remove('has-img');this.parentElement.textContent='${letter}';" />
              </div>`;
    }
    return `<div class="admin-avatar">${letter}</div>`;
  }

  function renderUserCard(g) {
    const rows = g.donations.map(renderDonationRow).join("");
    return `
      <article class="admin-user-card">
        <header class="admin-user-head">
          ${renderAvatar(g)}
          <div class="admin-user-name">
            <strong>${escapeHtml(g.name)}</strong>
            ${g.userId ? `<span class="admin-user-id" title="${escapeHtml(g.userId)}">${escapeHtml(shortId(g.userId))}</span>` : ""}
          </div>
          <div class="admin-user-totals">
            <span class="admin-user-total">${fmtBaht(g.total)}</span>
            <span class="admin-user-count">${g.donations.length} รายการ</span>
          </div>
        </header>
        <div class="admin-donation-list">${rows}</div>
      </article>
    `;
  }

  function renderDonationRow(d) {
    const status = statusOf(d);
    const dateStr = d.created_at
      ? fmtDateTime(Number(d.created_at))
      : (d.transferred_date ? fmtDateTime(d.transferred_date) : "—");

    const thumbUrl  = driveImg(d.slip_image, 600);
    const fullUrl   = driveImg(d.slip_image, 2400);
    const slipBlock = thumbUrl
      ? `<a class="dn-slip" href="${escapeHtml(d.slip_image)}"
            data-slip-full="${escapeHtml(fullUrl)}"
            title="คลิกเพื่อดูภาพเต็ม">
           <img src="${escapeHtml(thumbUrl)}" alt="slip"
                referrerpolicy="no-referrer"
                onerror="adminImgFallback(this)" />
         </a>`
      : `<div class="dn-slip no-image">📎</div>`;

    // ✓ ปุ่ม Approve/Reject แสดงเฉพาะตอน "pending"
    //   ถ้า approved/rejected แล้ว → ไม่ขึ้นปุ่ม (ให้ขึ้นแค่ status badge)
    const isPending = status === "pending";
    const actionsBlock = isPending
      ? `<div class="dn-actions">
           <button class="btn-mini btn-mini-approve" data-action="approve" data-id="${escapeHtml(d.id || "")}">✓ Approve</button>
           <button class="btn-mini btn-mini-reject" data-action="reject" data-id="${escapeHtml(d.id || "")}">✗ Reject</button>
         </div>`
      : "";

    return `
      <div class="admin-donation status-${status}" data-id="${escapeHtml(d.id || "")}">
        <span class="status-badge status-${status}">${statusLabel(status)}</span>
        ${slipBlock}
        <div class="dn-main">
          <div class="dn-amount">${fmtBaht(d.amount)}</div>
          <div class="dn-meta">
            ${d.bank ? `<span class="bank-tag">${escapeHtml(d.bank)}</span>` : ""}
            ${d.ref_code ? `<span>#${escapeHtml(d.ref_code)}</span>` : ""}
            <span>${escapeHtml(dateStr)}</span>
          </div>
          ${d.sender_name ? `<div class="dn-sender">โดย ${escapeHtml(d.sender_name)}</div>` : ""}
        </div>
        ${actionsBlock}
      </div>
    `;
  }

  /* ---------- Update status ---------- */
  async function updateStatus(donateID, newStatus) {
    if (!donateID) return;
    if (newStatus === "rejected") {
      if (!confirm("ยืนยันการ Reject รายการนี้?")) return;
    }
    // disable all buttons of this item
    document
      .querySelectorAll(`.admin-donation[data-id="${donateID}"] [data-action]`)
      .forEach((b) => (b.disabled = true));
    try {
      const r = await window.Api.updateDonateStatus(donateID, newStatus);
      if (!r || !r.success) throw new Error((r && r.message) || "update failed");
      // อัปเดต local + re-render
      const d = allDonations.find((x) => x.id === donateID);
      if (d) d.status = r.new_status || newStatus;
      renderStats();
      renderList();
    } catch (err) {
      console.error("updateStatus failed:", err);
      alert("อัปเดตไม่สำเร็จ: " + (err.message || String(err)));
      // คืนสภาพปุ่ม
      renderList();
    }
  }

  /* ---------- Image lightbox modal ---------- */
  const imgModal = $("image-modal");
  const imgEl    = $("image-modal-img");

  function openImageModal(url) {
    if (!imgModal || !imgEl || !url) return;
    imgEl.src = url;
    imgModal.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
  }
  function closeImageModal() {
    if (!imgModal) return;
    // ★ blur focus ที่อยู่ใน modal ก่อนซ่อน เพื่อกัน aria-hidden warning ของ Chrome
    if (document.activeElement && imgModal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    imgModal.setAttribute("hidden", "");
    document.body.style.overflow = "";
    if (imgEl) imgEl.removeAttribute("src");
  }

  // ปิด modal เมื่อกดที่พื้นหลัง / ปุ่ม X / Esc
  imgModal?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeImageModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && imgModal && !imgModal.hasAttribute("hidden")) {
      closeImageModal();
    }
  });

  /* ---------- Bind events ---------- */
  document.addEventListener("click", (e) => {
    // Slip thumbnail → open lightbox (intercept link)
    const slipLink = e.target.closest(".dn-slip[data-slip-full]");
    if (slipLink && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      openImageModal(slipLink.dataset.slipFull);
      return;
    }
    // Approve / Reject buttons
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!id) return;
    if (action === "approve") updateStatus(id, "approved");
    else if (action === "reject") updateStatus(id, "rejected");
  });

  $("admin-refresh")?.addEventListener("click", loadAll);

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", loadAll);
  if (document.readyState !== "loading") loadAll();
})();
