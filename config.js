/**
 * ===========================================
 *  CSR เลี้ยงอุปการะหมี — XIONG Birthday 2026
 *  Configuration File
 * ===========================================
 *  ปรับค่าต่าง ๆ ได้ที่ไฟล์นี้ไฟล์เดียว
 *  - วันหมดเขตการโดเนท
 *  - ยอดเป้าหมาย
 *  - ข้อมูลศิลปิน / แคมเปญ / ช่องทางการโอน
 *  - โบนัสกระตุ้นยอด: ทุก 264 บาท = อาหารน้องหมี 1 กิโล (ประมาณการ)
 * ===========================================
 */

const APP_CONFIG = {
  // ----- ข้อมูลศิลปินและแคมเปญ -----
  artist: {
    name: "XIONG",
    group: "NexT1DE",
    birthday: "2026-06-29",
    // เพิ่ม/ลบ hashtag ได้ — จะถูก render เป็น chip หลายอันบนหน้า hero
    hashtags: ["#BearHugsForXIONG2026", "#ShenXiongTH"],
    hashtag: "#BearHugsForXIONG2026", // ★ legacy — ใช้สำหรับข้อความแชร์/social
  },

  campaign: {
    title: "CSR เลี้ยงอุปการะหมี",
    subtitle: "ฉลองวันเกิด XIONG วง NexT1DE",
    location: "สถานีเพาะเลี้ยงสัตว์ป่า บางละมุง",
    bearCount: 120, // จำนวนน้องหมีที่ดูแลอยู่
    description:
      "ร่วมโดเนทเลี้ยงอุปการะหมีในนามแฟนคลับ XIONG เพื่อมอบเป็นของขวัญวันเกิดให้น้องหมีได้รับการดูแลที่ดี — โบนัสพิเศษ: ทุก 264 บาทที่โดเนทเข้ามา จะถูกแปลงเป็นอาหารน้องหมี 1 กิโล (ประมาณการ)",
    coverEmoji: "🐻",
  },

  // ----- เป้าหมายและช่วงเวลาการโดเนท -----
  donation: {
    goal: 6290,                          // ยอดเป้าหมาย (บาท)
    deadline: "2026-06-16T23:59:59+07:00", // หมดเขตโดเนท
    deliveryDate: "2026-06-29T00:00:00+07:00", // วันที่นำอาหารส่งให้น้องหมี
    currency: "THB",
    currencySymbol: "฿",
    startedAt: "2026-05-01T00:00:00+07:00",
    bahtPerFood: 264,                    // 264 บาท = อาหารน้องหมี 1 กิโล (ประมาณการ - โบนัสกระตุ้นยอด)
    foodUnit: "กิโล",                    // หน่วยที่จะแสดงผล (กรัม/กิโล)
  },

  // ----- ช่องทางการโอน -----
  payment: {
    bank: {
      bankName: "ธนาคารกสิกรไทย",
      accountName: "น.ส. วาษิฬา ศรีเลอจันทร์",
      accountNumber: "231-1-16674-6",
    },
    qrImage: "assets/qr_promptpay.png",
  },

  // ----- Auth strategy -----
  //   "mock"     — สุ่ม handle ทดสอบ (offline dev)
  //   "firebase" — login จริงผ่าน Firebase Auth Twitter provider
  //
  // Firebase Auth Twitter provider ใช้ OAuth 1.0a:
  //   - Consumer Key/Secret ตั้งใน Firebase Console → Authentication → Twitter
  //
  // ส่วน OAuth 2.0 creds ด้านล่างนี้ "ไม่ได้ถูกใช้" ในโค้ดปัจจุบัน — เก็บไว้
  // เผื่ออนาคตอยากทำ OAuth 2.0 PKCE flow โดยไม่ผ่าน Firebase Auth
  auth: {
    provider: "x",
    mode: "firebase",
    oauth2: {
      clientId: "cS1iY0trZDB0S2pqVnVaclRtNGE6MTpjaQ",
      clientSecret: "VHsWl936xPG5ug6-ZEBuAF7Yl9V9irjC0FWO9RcK-TcTglkbQv",
    },
  },

  // ----- Slip OCR / verification (n8n webhook) -----
  // POST form-data { image: <file> } → { is_slip, date, bank_code, sender_name,
  //                                       sender_account, receiver_name, ref_number, amount, currency }
  slipOcr: {
    endpoint: "https://shenxiong-th.app.n8n.cloud/webhook/6e4a539b-5580-40f9-a85f-47a488a2e842",
  },

  // ----- Slip image upload to Google Drive (Apps Script web app) -----
  // POST application/json { imageBlob: "data:image/jpeg;base64,..." } → { success, fileUrl, fileId }
  slipUpload: {
    endpoint: "https://script.google.com/macros/s/AKfycbw2DPwpjAYUADzKGSt-K-LUPZl4x8l6LRBdhYviz1DMs1tSrScqzNTirac6PvQ5qiShDw/exec",
  },

  // ----- Backend API (Firebase Cloud Functions) -----
  //
  // env: "auto"        → เลือก localhost/production จาก window.location.hostname
  //      "localhost"   → บังคับใช้ Functions emulator
  //      "production"  → บังคับใช้ deployed Cloud Functions
  //
  // เพิ่มลิงก์ใน endpoints object ได้ตามต้องการ
  api: {
    env: "production",   // ★ ใช้ Functions emulator
    endpoints: {
      localhost: "http://127.0.0.1:5001/xiongbirthday2026/us-central1",
      production: "https://us-central1-xiongbirthday2026.cloudfunctions.net",
    },
  },

  // ----- Firebase config (จาก Firebase Console → Project settings) -----
  // ใช้สำหรับ Firebase Storage (อัปโหลดสลิป) และ services อื่น ๆ ในอนาคต
  // API 4 เส้นด้านบนเรียกผ่าน HTTP โดยตรง ไม่ต้องใช้ SDK
  firebase: {
    apiKey: "AIzaSyBXHqIQri4G0byXMULuMpYSsFVTHLM1-Sw",
    authDomain: "xiongbirthday2026.firebaseapp.com",
    databaseURL: "https://xiongbirthday2026-default-rtdb.firebaseio.com",
    projectId: "xiongbirthday2026",
    storageBucket: "xiongbirthday2026.firebasestorage.app",
    messagingSenderId: "955613591827",
    appId: "1:955613591827:web:20eeedc40793f358eec2e6",
    measurementId: "G-5CE9V6LMZH",
  },

  // ----- Social / Share -----
  social: {
    twitter: "https://x.com/intent/tweet?text=",
    shareText:
      "ร่วมโดเนทเลี้ยงอุปการะหมีเพื่อวันเกิด XIONG @ NexT1DE 🐻💖 #BearHugsForXIONG2026 #ShenXiongTH",
    siteUrl: "https://hbd-xiong-2026.example",
  },

  // ----- Organization / footer credit -----
  org: {
    name: "ShenXiongThailand",
    xUrl: "https://x.com/ShenXiong_TH_fc",
    xHandle: "@ShenXiong_TH_fc",
  },

  // ----- Wall of Love settings -----
  wallOfLove: {
    pageSize: 5,
  },
};

// ทำให้เรียกใช้ได้ทั้งใน browser และ module
if (typeof window !== "undefined") window.APP_CONFIG = APP_CONFIG;
if (typeof module !== "undefined") module.exports = APP_CONFIG;
