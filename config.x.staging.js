/**
 * ===========================================================
 *  X (Twitter) OAuth credentials — STAGING
 * ===========================================================
 *  ⚠️  ห้าม commit ไฟล์นี้เข้า git
 *  ⚠️  ค่าทั้งหมดด้านล่างเป็น SECRETS — ห้ามนำขึ้น production
 *      โดยตรงในฝั่ง browser เพราะใครก็เปิด DevTools มาอ่านได้
 *
 *  ใช้สำหรับเทสเชื่อมต่อ X API ตอน dev/staging เท่านั้น
 *  เมื่อจะใช้งานจริง ต้องย้าย secret ทั้งหมดไปไว้ใน backend
 *  แล้วให้ frontend เรียก /api/auth/x/start, /api/auth/x/callback
 * ===========================================================
 */

const X_AUTH_CONFIG = {
  env: "staging",

  // ----- OAuth 1.0a (User Auth - 3-legged) -----
  // ค่าจาก Developer Portal → Keys and tokens → "Consumer Keys" และ "Authentication Tokens"
  consumerKey:        "qFNYsTWkGvqNRVHb5STl2udju",
  consumerKeySecret:  "ZzIEPeI2bBF9QhTdDdbP47bwjk93R3XUKb8dDX4uthfAuDdOZf",
  bearerToken:        "AAAAAAAAAAAAAAAAAAAAAE8J9gEAAAAAQrvkgbnvU9LtlKpX6kY93e%2BoNzg%3DUQi5Mgmpjn21S9339X03ZQrjRfgqG9Ij8Zo5MLpVjQbwNoAeOD",
  accessToken:        "1579481835620311040-HitfHL7ODyU1QN6mTmqZsZRkWhqIab",
  accessTokenSecret:  "4EnpsY4AsdT5TXzkR2Fkoec5gpFLiymp1TlUOOfA1pKly",

  // ----- OAuth 2.0 (User Context with PKCE) — สำหรับเว็บ frontend แนะนำใช้อันนี้ -----
  // ⚠️ ค่าด้านล่างยังว่าง ต้องไปสร้างใน Developer Portal เพิ่ม:
  //    Project → User authentication settings → Set up
  //    เลือก "OAuth 2.0" + "Web App" → จะได้ Client ID (และ Client Secret ถ้าเลือก Confidential)
  oauth2: {
    clientId:     "",   // เช่น "abcd1234EFGH-..."
    clientSecret: "",   // ใช้เฉพาะกรณี confidential client (มี backend)
    scopes:       ["users.read", "tweet.read", "offline.access"],
  },

  // ----- Callback / Redirect URI -----
  // ต้องตรงกับที่กรอกใน Developer Portal → User authentication settings → Callback URI
  // ใส่ได้หลายอันใน portal เพื่อรองรับ dev / staging / production
  callbackUrls: {
    local:   "http://localhost:5173/auth/x/callback",
    staging: "https://staging.hbd-xiong-2026.example/auth/x/callback",
    // production: "https://hbd-xiong-2026.example/auth/x/callback",
  },

  // ใช้ตอนสร้าง URL "Sign in with X"
  // โหมด mock → ปุ่มจะสุ่ม handle ทดสอบเหมือนเดิม (ยังไม่ยิง X API จริง)
  // โหมด real → ปุ่มจะเด้งไปหน้า authorize ของ X (ต้องมี backend handle callback)
  mode: "mock", // "mock" | "real"
};

if (typeof window !== "undefined") window.X_AUTH_CONFIG = X_AUTH_CONFIG;
if (typeof module !== "undefined") module.exports = X_AUTH_CONFIG;
