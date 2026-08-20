<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# ระบบเบิกและจัดการสต็อก

React/Vite frontend พร้อม Express API บน Vercel และ Google Sheets เป็นที่เก็บข้อมูล

## เริ่มใช้งานในเครื่อง

1. ติดตั้ง Node.js 20 ขึ้นไป แล้วรัน `npm install`
2. สร้างไฟล์ `.env` โดยกำหนด `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` และ `AUTH_SECRET` (สตริงสุ่มยาวอย่างน้อย 32 ตัวอักษร)
3. รัน `npm run dev`

## ตั้งค่า Vercel

กำหนด Environment Variables เดียวกันใน Production/Preview และตั้ง `APP_ORIGIN` เป็นโดเมนจริงของระบบ เช่น `https://your-app.vercel.app` หากมีหลายโดเมนคั่นด้วย comma ได้

`AUTH_SECRET` เป็นค่าบังคับใน Vercel และต้องไม่เปลี่ยนโดยไม่ตั้งใจ เพราะจะทำให้ token ที่กำลังใช้งานทั้งหมดหมดอายุ

## ความปลอดภัย

- API ต้องส่ง `Authorization: Bearer <token>` ยกเว้น health, login, register และรายชื่อแผนก
- รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร และถูกเก็บแบบ scrypt hash
- บัญชีเดิมที่เป็น plain text จะถูกแปลงเป็น hash อัตโนมัติเมื่อ login สำเร็จครั้งแรก
