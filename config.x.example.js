/**
 * ===========================================================
 *  X (Twitter) OAuth — Example / Template
 * ===========================================================
 *  ใช้เป็นแม่แบบ คัดลอกเป็น config.x.staging.js หรือ
 *  config.x.production.js แล้วเติมค่าจริง
 *
 *  ไฟล์นี้ commit เข้า git ได้ (ไม่มี secret จริง)
 *  ส่วนไฟล์ที่มีค่าจริง (.staging / .production) ถูก gitignore ไว้
 * ===========================================================
 */

const X_AUTH_CONFIG = {
  env: "example",

  // OAuth 1.0a — จาก Developer Portal → Keys and tokens
  consumerKey:        "<YOUR_CONSUMER_KEY>",
  consumerKeySecret:  "<YOUR_CONSUMER_KEY_SECRET>",
  bearerToken:        "<YOUR_BEARER_TOKEN>",
  accessToken:        "<YOUR_ACCESS_TOKEN>",
  accessTokenSecret:  "<YOUR_ACCESS_TOKEN_SECRET>",

  // OAuth 2.0 — สร้างใหม่ใน User authentication settings
  oauth2: {
    clientId:     "<YOUR_OAUTH2_CLIENT_ID>",
    clientSecret: "<YOUR_OAUTH2_CLIENT_SECRET>",
    scopes:       ["users.read", "tweet.read", "offline.access"],
  },

  callbackUrls: {
    local:   "http://localhost:5173/auth/x/callback",
    staging: "https://<your-staging-domain>/auth/x/callback",
  },

  mode: "mock", // "mock" | "real"
};

if (typeof window !== "undefined") window.X_AUTH_CONFIG = X_AUTH_CONFIG;
if (typeof module !== "undefined") module.exports = X_AUTH_CONFIG;
