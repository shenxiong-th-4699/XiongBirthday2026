/* =========================================================
   API client — Firebase Cloud Functions endpoints
   - getDonationAll       (GET)
   - getUserInfoByXid     (GET ?x_id=...)
   - saveUser             (POST)
   - saveDonate           (POST)

   ตั้งค่า base URL ที่ APP_CONFIG.api.endpoint ใน config.js
   ถ้าเว้นว่างไว้ ฟังก์ชัน apiFetch จะ throw → caller จะ fallback ไปใช้ mock
   ========================================================= */

(function () {
  const Api = {};

  /* ---------- Helpers ---------- */
  function isLocalHost() {
    const h = (typeof window !== "undefined" && window.location && window.location.hostname) || "";
    return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || /^192\.168\./.test(h) || /\.local$/.test(h);
  }

  /**
   * คืน base URL ตามค่า config.api:
   *  - api.endpoint           — URL เดียวตายตัว (legacy support)
   *  - api.endpoints + api.env — env: "auto" / "localhost" / "production"
   */
  function getBase() {
    const cfg = (window.APP_CONFIG && window.APP_CONFIG.api) || {};
    if (cfg.endpoint) return cfg.endpoint;     // backward compat
    const eps = cfg.endpoints || {};
    let env = cfg.env || "auto";
    if (env === "auto") env = isLocalHost() ? "localhost" : "production";
    return eps[env] || eps.production || eps.localhost || "";
  }
  function isConfigured() {
    return !!getBase();
  }
  Api.isConfigured = isConfigured;
  Api.getBase = getBase;

  async function apiFetch(path, opts = {}) {
    const base = getBase();
    if (!base) throw new Error("API endpoint not configured");
    const url = base.replace(/\/$/, "") + path;
    const headers = {
      "Accept": "application/json",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(opts.headers || {}),
    };

    let res;
    try {
      res = await fetch(url, { ...opts, headers });
    } catch (err) {
      console.error("[api] network/CORS error:", path, err);
      throw err;
    }

    let data = null;
    try { data = await res.json(); } catch { /* not json */ }

    // ★ ถ้า body เป็น structured response (มี success / error_code) →
    //   ถือเป็น "business response" คืนไปให้ caller ตัดสินใจ
    //   (เผื่อ API ตอบ 4xx + error_code USER_NOT_FOUND ฯลฯ)
    if (data && typeof data === "object" &&
        ("success" in data || "error_code" in data)) {
      if (!res.ok) {
        console.warn("[api] " + res.status + " " + path + " (structured):", data);
      }
      return data;
    }

    if (!res.ok) {
      const err = new Error("API " + res.status + " on " + path);
      err.status = res.status;
      err.body = data;
      console.error("[api] HTTP error:", path, res.status, data);
      throw err;
    }
    return data;
  }

  /* ---------- Endpoints ---------- */

  /**
   * GET /getDonationAll
   * Response: { grand_total, data: [ {id, user_id, donator_name, amount, transferred_date, bank, sender_account, sender_name, ref_code, slip_image, created_at}, ... ] }
   */
  Api.getDonationAll = async function () {
    return apiFetch("/getDonationAll");
  };

  /**
   * GET /getUserInfoByXid?x_id=...
   * Response (found):
   *   { success:true, data:{ user_info:{user_id, x_id, username, account, profile_url, last_login, created_at},
   *                          total_donate_amount, donations:[...] } }
   * Response (not found):
   *   { success:false, error_code:"USER_NOT_FOUND", message:"..." }
   */
  Api.getUserInfoByXid = async function (xId) {
    if (!xId) throw new Error("x_id required");
    const path = "/getUserInfoByXid?x_id=" + encodeURIComponent(xId);
    return apiFetch(path);
  };

  /**
   * POST /saveUser
   * Body: { x_id, username, account, profile_url }
   * Response: { success:true, data:{user_id, ...} }
   */
  Api.saveUser = async function (payload) {
    return apiFetch("/saveUser", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  };

  /**
   * POST /saveDonate
   * Body: { user_id, donator_name, amount, transferred_date, bank, sender_account, sender_name, ref_code, slip_image }
   * Response: { success:true, message:"..." }
   */
  Api.saveDonate = async function (payload) {
    return apiFetch("/saveDonate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  };

  /**
   * POST /updateDonateStatus
   * Body: { donateID, status }    // status: "pending" | "approved" | "rejected"
   * Response: { success:true, message:"...", donateID, new_status }
   */
  Api.updateDonateStatus = async function (donateID, status) {
    return apiFetch("/updateDonateStatus", {
      method: "POST",
      body: JSON.stringify({ donateID, status }),
    });
  };

  /* ---------- External APIs (different endpoints) ---------- */

  /**
   * POST n8n webhook (form-data with file)
   * Response: { is_slip, date, bank_code, sender_name, sender_account, receiver_name, ref_number, amount, currency }
   */
  Api.checkSlip = async function (file, opts = {}) {
    const url = (window.APP_CONFIG && window.APP_CONFIG.slipOcr && window.APP_CONFIG.slipOcr.endpoint) || "";
    if (!url) throw new Error("slipOcr endpoint not configured");
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch(url, { method: "POST", body: fd, signal: opts.signal });
    if (!res.ok) {
      const err = new Error("checkSlip " + res.status);
      err.status = res.status;
      throw err;
    }
    return res.json();
  };

  /** อ่านไฟล์เป็น dataURL (base64) สำหรับ Drive upload */
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  /**
   * POST Google Apps Script (raw JSON, base64 image)
   * Response: { success, fileUrl, fileId }
   */
  Api.uploadSlipImage = async function (file, opts = {}) {
    const url = (window.APP_CONFIG && window.APP_CONFIG.slipUpload && window.APP_CONFIG.slipUpload.endpoint) || "";
    if (!url) throw new Error("slipUpload endpoint not configured");
    const dataUrl = await fileToDataUrl(file);
    const res = await fetch(url, {
      method: "POST",
      // Apps Script ตอบ CORS แค่ "application/x-www-form-urlencoded" / "text/plain"
      // ส่งเป็น text/plain ที่มี JSON body ก็ใช้ได้และไม่ต้อง preflight
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ imageBlob: dataUrl }),
      signal: opts.signal,
    });
    if (!res.ok) {
      const err = new Error("uploadSlip " + res.status);
      err.status = res.status;
      throw err;
    }
    return res.json();
  };

  // expose
  if (typeof window !== "undefined") window.Api = Api;
  if (typeof module !== "undefined") module.exports = Api;
})();
