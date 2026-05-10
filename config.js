/**
 * ===========================================
 *  CSR เลี้ยงอุปการะหมี — XIONG Birthday 2026
 *  Configuration File
 * ===========================================
 *  ปรับค่าต่าง ๆ ได้ที่ไฟล์นี้ไฟล์เดียว
 *  - วันหมดเขตการโดเนท
 *  - ยอดเป้าหมาย
 *  - ข้อมูลศิลปิน / แคมเปญ / ช่องทางการโอน
 *  - โบนัสกระตุ้นยอด: ทุก 29 บาท = อาหารน้องหมี 1 กรัม
 * ===========================================
 */

const APP_CONFIG = {
  // ----- ข้อมูลศิลปินและแคมเปญ -----
  artist: {
    name: "XIONG",
    group: "NexT1DE",
    birthday: "2026-06-29",
    hashtag: "#HBDXIONG2026",
  },

  campaign: {
    title: "CSR เลี้ยงอุปการะหมี",
    subtitle: "ฉลองวันเกิด XIONG วง NexT1DE",
    location: "สวนสัตว์เปิดเขาเขียว อ.บางละมุง จ.ชลบุรี",
    description:
      "ร่วมโดเนทเลี้ยงอุปการะหมีในนามแฟนคลับ XIONG เพื่อมอบเป็นของขวัญวันเกิดให้น้องหมีได้รับการดูแลที่ดี — โบนัสพิเศษ: ทุก 29 บาทที่โดเนทเข้ามา จะถูกแปลงเป็นอาหารน้องหมี 1 กรัม",
    coverEmoji: "🐻",
  },

  // ----- เป้าหมายและช่วงเวลาการโดเนท -----
  donation: {
    goal: 6290,                          // ยอดเป้าหมาย (บาท)
    deadline: "2026-06-20T23:59:59+07:00", // หมดเขตโดเนท
    deliveryDate: "2026-06-29T00:00:00+07:00", // วันที่นำอาหารส่งให้น้องหมี
    currency: "THB",
    currencySymbol: "฿",
    startedAt: "2026-05-01T00:00:00+07:00",
    bahtPerFood: 29,                     // 29 บาท = อาหารน้องหมี 1 กรัม (โบนัสกระตุ้นยอด)
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
  // โหมดที่ใช้สำหรับ "เข้าสู่ระบบด้วย X"
  //   "mock"  — สุ่ม handle ทดสอบสำหรับ dev (default)
  //   "real"  — ใช้ค่าจาก window.X_AUTH_CONFIG (โหลด config.x.<env>.js)
  auth: {
    provider: "x",
    mode: "mock",
  },

  // ----- Slip OCR API -----
  // โหมด mock จะสุ่มข้อมูลให้ — เปลี่ยน mode เป็น "real" + ใส่ endpoint เพื่อใช้งานจริง
  slipOcr: {
    mode: "mock",
    endpoint: "",
    apiKey: "",
  },

  // ----- Social / Share -----
  social: {
    twitter: "https://x.com/intent/tweet?text=",
    shareText:
      "ร่วมโดเนทเลี้ยงอุปการะหมีเพื่อวันเกิด XIONG @ NexT1DE 🐻💖 #HBDXIONG2026",
    siteUrl: "https://hbd-xiong-2026.example",
  },

  // ----- Organization / footer credit -----
  org: {
    name: "ShenXiongThailand",
    xUrl:    "https://x.com/ShenXiongThailand",
    xHandle: "@ShenXiongThailand",
    lineOpenChat: "https://line.me/ti/g2/EDITME",   // ใส่ลิงก์ OpenChat จริงตรงนี้
  },

  // ----- Wall of Love settings -----
  wallOfLove: {
    pageSize: 5,
  },

  // ----- ข้อมูลเริ่มต้น (จะรวมเข้ากับยอดที่กำลังเข้ามาเรื่อย ๆ) -----
  seed: {
    // ยอดเริ่มต้นรวม (ก่อนรวมกับ entries ด้านล่าง)
    baseTotal: 0,
    baseDonors: 0,
    // รายการการโดเนทที่บันทึกไว้แล้ว (ใช้แสดงบน Wall of Love)
    donations: [
      { handle: "@xiongbear",   displayName: "Xiong Bear 🐻",     amount: 590, ts: "2026-05-09T20:14:00+07:00" },
      { handle: "@n1dehoney",   displayName: "Honey 🍯",          amount: 329, ts: "2026-05-09T18:42:00+07:00" },
      { handle: "@bearbiscuit", displayName: "Bear Biscuit 🍪",   amount: 290, ts: "2026-05-09T15:08:00+07:00" },
      { handle: "@miniXiong",   displayName: "miniXiong",         amount: 250, ts: "2026-05-09T11:35:00+07:00" },
      { handle: "@blueberry_xx",displayName: "BCubcake 🐻",       amount: 296, ts: "2026-05-09T09:21:00+07:00" },
      { handle: "@n1de_fan",    displayName: "Berry 🫐",          amount: 200, ts: "2026-05-08T22:50:00+07:00" },
      { handle: "@cubcube",     displayName: "Lulu 🐰",           amount: 129, ts: "2026-05-08T20:02:00+07:00" },
      { handle: "@petitbear",   displayName: "Mochi 🌸",          amount: 500, ts: "2026-05-08T16:18:00+07:00" },
      { handle: "@miniN1DE",    displayName: "Mintie 🌼",         amount: 296, ts: "2026-05-08T13:44:00+07:00" },
      { handle: "@softpaw_x",   displayName: "Peach 🍑",          amount: 100, ts: "2026-05-08T10:12:00+07:00" },
      { handle: "@honey_x",     displayName: "Honey x",           amount: 320, ts: "2026-05-07T21:39:00+07:00" },
      { handle: "@chocobear",   displayName: "Choco Bear 🍫",     amount: 150, ts: "2026-05-07T18:55:00+07:00" },
      { handle: "@_pearbear",   displayName: "Pear 🍐",           amount: 50,  ts: "2026-05-07T15:21:00+07:00" },
      { handle: "@strawbear",   displayName: "Straw 🍓",          amount: 80,  ts: "2026-05-07T11:48:00+07:00" },
      { handle: "@nexbear",     displayName: "NexBear",           amount: 200, ts: "2026-05-06T22:05:00+07:00" },
      { handle: "@xiong_oppa",  displayName: "ป้าตือ ปฐพีXIONG",   amount: 600, ts: "2026-05-06T19:33:00+07:00" },
      { handle: "@bbcubz",      displayName: "BB Cubz",           amount: 100, ts: "2026-05-06T14:20:00+07:00" },
      { handle: "@deerbear_x",  displayName: "Deer 🦌",           amount: 200, ts: "2026-05-05T23:02:00+07:00" },
    ],
  },
};

// ทำให้เรียกใช้ได้ทั้งใน browser และ module
if (typeof window !== "undefined") window.APP_CONFIG = APP_CONFIG;
if (typeof module !== "undefined") module.exports = APP_CONFIG;
