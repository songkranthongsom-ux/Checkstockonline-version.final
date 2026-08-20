import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure you have credentials.json from Google Cloud Service Account in the project root
const KEY_PATH = path.join(__dirname, '..', 'credentials.json');

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

if (!fs.existsSync(KEY_PATH)) {
  console.error("❌ ไม่พบไฟล์ credentials.json กรุณานำไฟล์ Service Account Key มาวางไว้ที่โฟลเดอร์หลักของโปรเจกต์");
  process.exit(1);
}

if (!SPREADSHEET_ID) {
  console.error("❌ ไม่พบ GOOGLE_SHEETS_ID ในไฟล์ .env");
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const initialData = [
  {
    title: 'Users',
    headers: ['id', 'employeeId', 'name', 'role', 'departmentId', 'password', 'mustChangePassword'],
    mockRows: [
      ['user_1', 'EMP001', 'สมชาย ไอที', 'ADMIN', 'dept_it', 'password123', 'true'],
      ['user_2', 'EMP002', 'สมศรี ธุรการ', 'ADMIN', 'dept_admin', 'password123', 'true'],
      ['user_3', 'EMP003', 'พนักงาน ก', 'USER', 'dept_it', 'password123', 'true'],
    ]
  },
  {
    title: 'Departments',
    headers: ['id', 'name'],
    mockRows: [
      ['dept_it', 'แผนก IT'],
      ['dept_admin', 'แผนกธุรการ'],
    ]
  },
  {
    title: 'Items',
    headers: ['id', 'name', 'category', 'unit', 'defaultStock', 'currentStock', 'imageUrl'],
    mockRows: [
      ['item_1', 'กระดาษ A4', 'อุปกรณ์สำนักงาน', 'รีม', '100', '85', ''],
      ['item_2', 'ปากกาน้ำเงิน', 'อุปกรณ์เครื่องเขียน', 'ด้าม', '500', '420', ''],
      ['item_3', 'เมาส์ไร้สาย', 'อุปกรณ์ IT', 'อัน', '50', '32', ''],
      ['item_4', 'คีย์บอร์ด', 'อุปกรณ์ IT', 'อัน', '30', '15', ''],
    ]
  },
  {
    title: 'Requests',
    headers: ['id', 'userId', 'itemId', 'quantity', 'reason', 'status', 'createdAt', 'updatedAt', 'batchId', 'ticketId', 'rejectReason'],
    mockRows: []
  },
  {
    title: 'Batches',
    headers: ['id', 'departmentId', 'coordinatorId', 'status', 'createdAt', 'completedAt'],
    mockRows: []
  }
];

async function initializeDatabase() {
  try {
    console.log("กำลังเชื่อมต่อกับ Google Sheets...");
    
    // 1. Get existing sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });
    
    const existingTitles = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
    
    // 2. Create missing sheets
    const requests = [];
    for (const sheet of initialData) {
      if (!existingTitles.includes(sheet.title)) {
        requests.push({
          addSheet: {
            properties: { title: sheet.title }
          }
        });
      }
    }
    
    if (requests.length > 0) {
      console.log(`กำลังสร้างแผ่นงานใหม่ ${requests.length} แผ่น...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests }
      });
    }

    // 3. Add headers and mock data
    console.log("กำลังเขียนหัวตารางและข้อมูลจำลอง...");
    for (const sheet of initialData) {
      const values = [sheet.headers, ...sheet.mockRows];
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet.title}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values }
      });
    }

    console.log("✅ สร้าง Database บน Google Sheets สำเร็จ!");
    
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาด:", error.message);
  }
}

initializeDatabase();
