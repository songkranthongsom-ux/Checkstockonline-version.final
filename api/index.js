import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

dotenv.config();

// Note: In Vercel serverless functions, import.meta.url may not work exactly as locally
// but it's fine for local fallback.
let __dirname = '';
try {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (e) {
  __dirname = process.cwd();
}

const app = express();

const allowedOrigins = (process.env.APP_ORIGIN || 'http://localhost:3000,http://localhost:5173')
  .split(',').map(origin => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!process.env.APP_ORIGIN || !origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Disable caching to prevent Vercel/Browser from remembering old Google Sheets data
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// --- Google Sheets Setup ---
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
let sheets;

try {
  let auth;
  // 1. Try reading from individual environment variables (Common in Vercel)
  if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        // Replace escaped newline characters from Vercel env variables
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    console.log('✅ Google Sheets Auth configured from individual env vars');
  } 
  // 2. Try reading from full JSON string
  else if (process.env.GOOGLE_CREDENTIALS) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    console.log('✅ Google Sheets Auth configured from GOOGLE_CREDENTIALS env var');
  } 
  // 3. Fallback to local file (Local development)
  else {
    const KEY_PATH = path.join(__dirname, '..', 'credentials.json');
    if (fs.existsSync(KEY_PATH)) {
      auth = new google.auth.GoogleAuth({
        keyFile: KEY_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      console.log('✅ Google Sheets Auth configured from local credentials.json');
    }
  }

  if (auth && SPREADSHEET_ID) {
    sheets = google.sheets({ version: 'v4', auth });
  } else {
    console.warn('⚠️ ขาด Environment Variables สำหรับการยืนยันตัวตน Google');
  }
} catch (error) {
  console.error('❌ Failed to initialize Google Auth:', error);
}

// --- Helper Functions ---
function getThaiTime() {
  const d = new Date();
  const tzOffset = 7 * 60; // +7 hours
  const localTime = new Date(d.getTime() + tzOffset * 60000);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${localTime.getUTCFullYear()}-${pad(localTime.getUTCMonth() + 1)}-${pad(localTime.getUTCDate())} ${pad(localTime.getUTCHours())}:${pad(localTime.getUTCMinutes())}:${pad(localTime.getUTCSeconds())}`;
}

function rowsToObjects(rows) {
  if (!rows || rows.length === 0) return [];
  const headers = rows[0];
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every(cell => !cell || cell.toString().trim() === '')) {
      continue;
    }
    const obj = {};
    headers.forEach((header, index) => {
      let val = row[index] || '';
      if (typeof val === 'string') {
        const lowerVal = val.toLowerCase();
        if (lowerVal === 'true') val = true;
        else if (lowerVal === 'false') val = false;
        else if (!isNaN(Number(val)) && val !== '' && !['employeeId', 'password', 'id', 'ticketId', 'batchId', 'itemId', 'userId'].includes(header)) val = Number(val);
      }
      obj[header] = val;
    });
    obj._rowIndex = i + 1;
    data.push(obj);
  }
  return data;
}

async function readSheet(tabName) {
  if (!sheets) throw new Error('Sheets API not configured');
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A:Z`,
  });
  return rowsToObjects(response.data.values);
}

async function appendToSheet(tabName, rowData) {
  if (!sheets) throw new Error('Sheets API not configured');
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [rowData] },
  });
}

async function updateRowInSheet(tabName, rowIndex, rowData) {
  if (!sheets) throw new Error('Sheets API not configured');
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [rowData] },
  });
}

async function deleteRowInSheet(tabName, rowIndex) {
  if (!sheets) throw new Error('Sheets API not configured');
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = spreadsheet.data.sheets.find(s => s.properties.title === tabName);
  if (!sheet) throw new Error(`Sheet ${tabName} not found`);
  
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          }
        }
      }]
    }
  });
}

async function getHeaders(tabName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!1:1`,
  });
  return response.data.values[0];
}

async function logAction(actionType, userId, details, status) {
  try {
    const headers = await getHeaders('Logs');
    const logObj = {
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      actionType,
      userId,
      details,
      status,
      createdAt: getThaiTime()
    };
    const rowData = headers.map(h => logObj[h] !== undefined ? logObj[h] : '');
    await appendToSheet('Logs', rowData);
  } catch (err) {
    console.error('Failed to write log:', err);
  }
}

const AUTH_SECRET = process.env.AUTH_SECRET;
if (process.env.VERCEL && !AUTH_SECRET) {
  throw new Error('AUTH_SECRET must be configured in Vercel environment variables');
}
const signingSecret = AUTH_SECRET || 'development-only-secret-change-me';
const base64url = value => Buffer.from(value).toString('base64url');
const sign = value => crypto.createHmac('sha256', signingSecret).update(value).digest('base64url');
const safeUser = user => {
  const { password, _rowIndex, ...safe } = user;
  safe.role = typeof safe.role === 'string' ? safe.role.split(',').map(r => r.trim().toUpperCase()) : safe.role;
  return safe;
};
const issueToken = user => {
  const payload = base64url(JSON.stringify({ sub: user.id, role: user.role, exp: Date.now() + 8 * 60 * 60 * 1000 }));
  return `${payload}.${sign(payload)}`;
};
const verifyToken = token => {
  const [payload, signature] = String(token || '').split('.');
  const expected = sign(payload);
  if (!payload || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return claims.exp > Date.now() ? claims : null;
  } catch { return null; }
};
const hashPassword = password => new Promise((resolve, reject) => {
  const salt = crypto.randomBytes(16).toString('hex');
  crypto.scrypt(password, salt, 64, (error, derivedKey) => error ? reject(error) : resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`));
});
const verifyPassword = (password, stored) => new Promise((resolve, reject) => {
  if (!String(stored || '').startsWith('scrypt$')) return resolve(password === stored);
  const [, salt, expected] = stored.split('$');
  crypto.scrypt(password, salt, 64, (error, key) => {
    if (error) return reject(error);
    const actual = Buffer.from(key.toString('hex'), 'hex');
    const wanted = Buffer.from(expected, 'hex');
    resolve(actual.length === wanted.length && crypto.timingSafeEqual(actual, wanted));
  });
});
const requireAuth = async (req, res, next) => {
  const claims = verifyToken(req.headers.authorization?.replace(/^Bearer\s+/i, ''));
  if (!claims) return res.status(401).json({ error: 'Authentication required' });
  try {
    const users = await readSheet('Users');
    const user = users.find(candidate => candidate.id === claims.sub);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.auth = safeUser(user);
    next();
  } catch (error) { next(error); }
};
const requireAdmin = (req, res, next) => req.auth?.role?.includes('ADMIN') ? next() : res.status(403).json({ error: 'Admin role required' });
const requireActor = req => req.auth.name || req.auth.employeeId;

// --- API Routes ---
app.get('/api/health', (req, res) => res.json({ status: 'ok', serverless: true }));

app.get('/api/departments', async (req, res) => {
  try {
    res.json(await readSheet('Departments'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const employeeId = String(req.body.employeeId || '').trim();
    const password = String(req.body.password || '');
    if (!employeeId || !password) return res.status(400).json({ error: 'Employee ID and password are required' });
    const users = await readSheet('Users');
    const user = users.find(candidate => String(candidate.employeeId).trim() === employeeId);
    if (!user || !(await verifyPassword(password, String(user.password || '')))) return res.status(401).json({ error: 'Invalid credentials' });

    // Seamlessly migrate existing plaintext passwords after a successful login.
    if (!String(user.password).startsWith('scrypt$')) {
      user.password = await hashPassword(password);
      const headers = await getHeaders('Users');
      await updateRowInSheet('Users', user._rowIndex, headers.map(header => user[header] ?? ''));
    }
    const publicUser = safeUser(user);
    res.json({ token: issueToken(publicUser), user: publicUser });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const employeeId = String(req.body.employeeId || '').trim();
    const name = String(req.body.name || '').trim();
    const password = String(req.body.password || '');
    const departmentId = String(req.body.departmentId || '').trim();
    if (!employeeId || !name || !password || !departmentId) return res.status(400).json({ error: 'Required fields are missing' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const [users, departments] = await Promise.all([readSheet('Users'), readSheet('Departments')]);
    if (users.some(user => String(user.employeeId).trim() === employeeId)) return res.status(409).json({ error: 'Employee ID already exists' });
    if (!departments.some(department => department.id === departmentId)) return res.status(400).json({ error: 'Invalid department' });
    const user = { id: `u_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`, employeeId, name, role: 'USER', departmentId, password: await hashPassword(password), mustChangePassword: false };
    const headers = await getHeaders('Users');
    await appendToSheet('Users', headers.map(header => user[header] ?? ''));
    const publicUser = safeUser(user);
    res.status(201).json({ token: issueToken(publicUser), user: publicUser });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use('/api', requireAuth);

app.patch('/api/auth/password', async (req, res) => {
  try {
    const password = String(req.body.password || '');
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const users = await readSheet('Users');
    const user = users.find(candidate => candidate.id === req.auth.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    user.password = await hashPassword(password);
    user.mustChangePassword = false;
    const headers = await getHeaders('Users');
    await updateRowInSheet('Users', user._rowIndex, headers.map(header => user[header] ?? ''));
    res.json({ user: safeUser(user), token: issueToken(safeUser(user)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/sync', async (req, res) => {
  try {
    if (!sheets) throw new Error('Sheets API not configured');
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges: ['Users!A:Z', 'Departments!A:Z', 'Items!A:Z', 'Requests!A:Z', 'Batches!A:Z', 'Categories!A:Z']
    });
    
    const valueRanges = response.data.valueRanges || [];
    
    const users = rowsToObjects(valueRanges[0]?.values);
    const departments = rowsToObjects(valueRanges[1]?.values);
    const items = rowsToObjects(valueRanges[2]?.values);
    const requests = rowsToObjects(valueRanges[3]?.values);
    const batches = rowsToObjects(valueRanges[4]?.values);
    const categories = rowsToObjects(valueRanges[5]?.values);

    // Format roles for users
    const isAdmin = req.auth.role.includes('ADMIN');
    const formattedUsers = isAdmin ? users.map(safeUser) : [safeUser(req.auth)];

    res.json({
      users: formattedUsers,
      departments,
      items,
      requests: isAdmin ? requests : requests.filter(request => request.userId === req.auth.id),
      batches: isAdmin ? batches : [],
      categories
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs', requireAdmin, async (req, res) => {
  try {
    const logs = await readSheet('Logs');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const users = await readSheet('Users');
    res.json(users.map(safeUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const user = req.body;
    if (!user.employeeId || !user.name || !user.departmentId || !Array.isArray(user.role) || user.role.length === 0) return res.status(400).json({ error: 'Required user fields are missing' });
    const existingUsers = await readSheet('Users');
    if (existingUsers.some(existing => String(existing.employeeId).trim() === String(user.employeeId).trim())) return res.status(409).json({ error: 'Employee ID already exists' });
    const headers = await getHeaders('Users');
    user.id = `u_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    user.password = await hashPassword(String(user.password || '1234'));
    if (Array.isArray(user.role)) {
      user.role = user.role.join(',');
    }
    const rowData = headers.map(h => user[h] !== undefined ? user[h] : '');
    await appendToSheet('Users', rowData);
    res.status(201).json(safeUser(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const users = await readSheet('Users');
    const target = users.find(u => u.id === id);
    
    if (!target) return res.status(404).json({ error: 'Not found' });
    
    if (updates.password !== undefined) updates.password = await hashPassword(String(updates.password));
    Object.assign(target, updates);
    if (Array.isArray(target.role)) {
      target.role = target.role.join(',');
    }
    
    const headers = await getHeaders('Users');
    const rowData = headers.map(h => target[h] !== undefined ? target[h] : '');
    await updateRowInSheet('Users', target._rowIndex, rowData);
    res.json(safeUser(target));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const users = await readSheet('Users');
    const target = users.find(user => user.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Not found' });
    await deleteRowInSheet('Users', target._rowIndex);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Categories Routes ---
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await readSheet('Categories');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', requireAdmin, async (req, res) => {
  try {
    const category = req.body;
    let headers;
    try {
      headers = await getHeaders('Categories');
    } catch (e) {
      // If tab doesn't exist or is empty, we should ideally handle it, 
      // but assuming it has at least 'id', 'name'
      headers = ['id', 'name'];
    }
    category.id = `cat_${Date.now()}`;
    const rowData = headers.map(h => category[h] !== undefined ? category[h] : '');
    await appendToSheet('Categories', rowData);
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', requireAdmin, async (req, res) => {
  try {
    const categories = await readSheet('Categories');
    const target = categories.find(c => c.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Not found' });
    await deleteRowInSheet('Categories', target._rowIndex);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/departments', async (req, res) => {
  try {
    const data = await readSheet('Departments');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items', async (req, res) => {
  try {
    const items = await readSheet('Items');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/items', requireAdmin, async (req, res) => {
  try {
    const item = req.body;
    const headers = await getHeaders('Items');
    item.id = item.id || `item_${Date.now()}`;
    const rowData = headers.map(h => item[h] !== undefined ? item[h] : '');
    await appendToSheet('Items', rowData);
    
    const actorName = requireActor(req);
    await logAction('เพิ่มข้อมูล', actorName, `เพิ่มสินค้าใหม่: ${item.name} (${item.id})`, 'สำเร็จ');
    
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/items/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const items = await readSheet('Items');
    const target = items.find(i => i.id === id);
    
    if (!target) return res.status(404).json({ error: 'Not found' });
    
    Object.assign(target, updates);
    const headers = await getHeaders('Items');
    const rowData = headers.map(h => target[h] !== undefined ? target[h] : '');
    await updateRowInSheet('Items', target._rowIndex, rowData);

    const actorName = requireActor(req);
    const detailParts = [];
    if (updates.name) detailParts.push(`ชื่อเป็น ${updates.name}`);
    if (updates.currentStock !== undefined) detailParts.push(`สต็อกเป็น ${updates.currentStock}`);
    const details = detailParts.length > 0 ? `แก้ไขสินค้า: ${target.name} (${detailParts.join(', ')})` : `แก้ไขสินค้า: ${target.name} (${target.id})`;
    await logAction('แก้ไขข้อมูล/Stock', actorName, details, 'สำเร็จ');

    res.json(target);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/items/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const items = await readSheet('Items');
    const target = items.find(i => i.id === id);
    
    if (!target) return res.status(404).json({ error: 'Not found' });
    
    await deleteRowInSheet('Items', target._rowIndex);

    const actorName = requireActor(req);
    await logAction('ลบข้อมูล', actorName, `ลบสินค้า: ${target.name} (${target.id})`, 'สำเร็จ');

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/requests', async (req, res) => {
  try {
    const requests = await readSheet('Requests');
    res.json(req.auth.role.includes('ADMIN') ? requests : requests.filter(request => request.userId === req.auth.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/requests', async (req, res) => {
  try {
    const requestsData = req.body;
    if (!Array.isArray(requestsData) || requestsData.length === 0 || requestsData.length > 50) return res.status(400).json({ error: 'Invalid request list' });
    const headers = await getHeaders('Requests');
    const existingRequests = await readSheet('Requests');
    const currentYear = new Date().getUTCFullYear().toString();
    const prefix = `INV. ${currentYear}`;
    let maxNumber = 0;
    existingRequests.forEach(r => {
      if (r.ticketId && r.ticketId.startsWith(prefix)) {
        const numPart = parseInt(r.ticketId.substring(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNumber) {
          maxNumber = numPart;
        }
      }
    });
    const nextSeq = String(maxNumber + 1).padStart(4, '0');
    const ticketId = `${prefix}${nextSeq}`;
    const now = getThaiTime();
    const items = await readSheet('Items');
    const itemHeaders = await getHeaders('Items');

    const rowsToAppend = [];
    for (let index = 0; index < requestsData.length; index++) {
      const reqItem = requestsData[index];
      reqItem.id = `req_${Date.now()}_${index}`;
      const isRestock = req.auth.role.includes('ADMIN') && reqItem.userId === 'system-restock';
      if (!isRestock) {
        reqItem.userId = req.auth.id;
        reqItem.employeeId = req.auth.employeeId;
        reqItem.name = req.auth.name;
      }
      if (!isRestock) {
        reqItem.ticketId = ticketId;
      }
      
      reqItem.createdAt = now;
      reqItem.updatedAt = now;

      const item = items.find(i => i.id === reqItem.itemId);
      const reqQty = Number(reqItem.quantity || 0);
      if (!item || !Number.isSafeInteger(reqQty) || reqQty < 1) return res.status(400).json({ error: `Invalid item or quantity at position ${index + 1}` });
      const currentStock = item ? Number(item.currentStock || 0) : 0;

      if (isRestock) {
        // Restock request: don't subtract stock, just leave it PENDING
        reqItem.status = 'PENDING';
        rowsToAppend.push(headers.map(h => reqItem[h] !== undefined ? reqItem[h] : ''));
      } else if (item && reqQty > 0) {
        if (currentStock >= reqQty) {
          reqItem.status = 'COLLECTED';
          item.currentStock = currentStock - reqQty;
          const itemRowData = itemHeaders.map(h => item[h] !== undefined ? item[h] : '');
          await updateRowInSheet('Items', item._rowIndex, itemRowData);
          rowsToAppend.push(headers.map(h => reqItem[h] !== undefined ? reqItem[h] : ''));
        } else if (currentStock > 0) {
          const reqItemCollected = { ...reqItem, id: `${reqItem.id}_C`, quantity: currentStock, status: 'COLLECTED' };
          rowsToAppend.push(headers.map(h => reqItemCollected[h] !== undefined ? reqItemCollected[h] : ''));

          const reqItemPending = { ...reqItem, id: `${reqItem.id}_P`, quantity: reqQty - currentStock, status: 'PENDING' };
          rowsToAppend.push(headers.map(h => reqItemPending[h] !== undefined ? reqItemPending[h] : ''));

          item.currentStock = 0;
          const itemRowData = itemHeaders.map(h => item[h] !== undefined ? item[h] : '');
          await updateRowInSheet('Items', item._rowIndex, itemRowData);
        } else {
          reqItem.status = 'PENDING';
          rowsToAppend.push(headers.map(h => reqItem[h] !== undefined ? reqItem[h] : ''));
        }
      } else {
        reqItem.status = 'PENDING';
        rowsToAppend.push(headers.map(h => reqItem[h] !== undefined ? reqItem[h] : ''));
      }
    }

    if (!sheets) throw new Error('Sheets API not configured');
    if (rowsToAppend.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Requests!A:A',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rowsToAppend },
      });
    }
    
    const actorName = requireActor(req);
    await logAction('เบิกอุปกรณ์', actorName, `สร้างคำขอเบิก ${requestsData.length} รายการ (Ticket ID: ${ticketId})`, 'สำเร็จ');

    res.status(201).json({ message: 'Requests created', ticketId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const requests = await readSheet('Requests');
    const target = requests.find(r => r.id === id);
    
    if (!target) return res.status(404).json({ error: 'Not found' });
    
    const isAdmin = req.auth.role.includes('ADMIN');
    if (!isAdmin) {
      if (target.userId !== req.auth.id || target.status !== 'PENDING' || updates.status !== 'CANCELLED') return res.status(403).json({ error: 'You may only cancel your pending requests' });
    }
    if (!['PENDING', 'APPROVED', 'READY', 'COLLECTED', 'STOCKED', 'REJECTED', 'CANCELLED'].includes(updates.status || target.status)) return res.status(400).json({ error: 'Invalid request status' });
    Object.assign(target, updates);
    target.updatedAt = getThaiTime();
    
    const headers = await getHeaders('Requests');
    const rowData = headers.map(h => target[h] !== undefined ? target[h] : '');
    await updateRowInSheet('Requests', target._rowIndex, rowData);

    const actorName = requireActor(req);
    let actionType = 'อัปเดตคำขอเบิก';
    if (updates.status === 'CANCELLED') actionType = 'ยกเลิกคำขอเบิก';
    if (updates.status === 'REJECTED') actionType = 'ปฏิเสธคำขอเบิก';
    await logAction(actionType, actorName, `อัปเดตคำขอเบิก ${target.itemName || target.id} เป็นสถานะ ${updates.status || target.status}`, 'สำเร็จ');

    res.json(target);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/batches', requireAdmin, async (req, res) => {
  try {
    const batches = await readSheet('Batches');
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/batches', requireAdmin, async (req, res) => {
  try {
    const { departmentId, coordinatorId, requestIds, isRestock } = req.body;
    const batches = await readSheet('Batches');
    const nowStr = getThaiTime();
    const currentMonthPrefix = nowStr.substring(0, 7); // e.g. "2026-08"
    
    let targetBatch;
    let batchId;
    let isNewBatch = false;

    if (isRestock) {
      // For restock, create a separate batch or group by month?
      // Since restock is directly added to stock upon receiving, we can use one restock batch per month
      targetBatch = batches.find(b => b.status === 'PENDING' && b.id.startsWith('RESTOCK_') && b.createdAt?.startsWith(currentMonthPrefix));
      
      if (!targetBatch) {
        batchId = `RESTOCK_BATCH_${Date.now()}`;
        isNewBatch = true;
      } else {
        batchId = targetBatch.id;
      }
    } else {
      targetBatch = batches.find(b => b.status === 'PENDING' && !b.id.startsWith('RESTOCK_') && b.createdAt?.startsWith(currentMonthPrefix));
      
      if (!targetBatch) {
        batchId = `batch_${Date.now()}`;
        isNewBatch = true;
      } else {
        batchId = targetBatch.id;
      }
    }

    if (isNewBatch) {
      const headers = await getHeaders('Batches');
      const newBatch = {
        id: batchId,
        departmentId,
        coordinatorId,
        status: 'PENDING',
        createdAt: nowStr,
      };
      const rowData = headers.map(h => newBatch[h] !== undefined ? newBatch[h] : '');
      await appendToSheet('Batches', rowData);
    }
    
    const requests = await readSheet('Requests');
    const requestsHeaders = await getHeaders('Requests');
    
    for (const reqId of requestIds) {
      const targetReq = requests.find(r => r.id === reqId);
      if (targetReq && targetReq.status === 'PENDING' && !targetReq.batchId) {
        targetReq.status = 'APPROVED';
        targetReq.batchId = batchId;
        targetReq.updatedAt = nowStr;
        const rowData = requestsHeaders.map(h => targetReq[h] !== undefined ? targetReq[h] : '');
        await updateRowInSheet('Requests', targetReq._rowIndex, rowData);
      }
    }

    const actorName = requireActor(req);
    await logAction('รวมใบเบิก', actorName, `นำคำขอเบิก ${requestIds.length} รายการ เข้ารวมศูนย์ (${batchId})`, 'สำเร็จ');
    
    res.status(201).json({ batchId, isNewBatch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/batches/restock', requireAdmin, async (req, res) => {
  try {
    const { departmentId, coordinatorId, items } = req.body;
    const nowStr = getThaiTime();
    const batchId = `RESTOCK_${Date.now()}`;
    
    const batchHeaders = await getHeaders('Batches');
    const newBatch = {
      id: batchId,
      departmentId,
      coordinatorId,
      status: 'PENDING',
      createdAt: nowStr,
    };
    const batchRowData = batchHeaders.map(h => newBatch[h] !== undefined ? newBatch[h] : '');
    await appendToSheet('Batches', batchRowData);
    
    const reqHeaders = await getHeaders('Requests');
    for (const item of items) {
      const newReq = {
        id: `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        userId: 'system-restock',
        itemId: item.itemId,
        quantity: item.quantity,
        reason: 'สั่งเติมสต็อกแผนก',
        status: 'PENDING',
        createdAt: nowStr,
        updatedAt: nowStr,
        batchId: batchId,
      };
      const reqRowData = reqHeaders.map(h => newReq[h] !== undefined ? newReq[h] : '');
      await appendToSheet('Requests', reqRowData);
    }
    
    const actorName = requireActor(req);
    await logAction('สั่งเติมสต็อก', actorName, `สร้างใบสั่งเติมสต็อก (${batchId}) จำนวน ${items.length} รายการ`, 'สำเร็จ');
    
    res.status(201).json({ batchId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/batches/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const batches = await readSheet('Batches');
    const targetBatch = batches.find(b => b.id === id);
    if (!targetBatch) return res.status(404).json({ error: 'Not found' });
    const wasCompleted = targetBatch.status === 'COMPLETED';
    
    targetBatch.status = status;
    if (status === 'COMPLETED') targetBatch.completedAt = getThaiTime();
    
    const batchHeaders = await getHeaders('Batches');
    const rowData = batchHeaders.map(h => targetBatch[h] !== undefined ? targetBatch[h] : '');
    await updateRowInSheet('Batches', targetBatch._rowIndex, rowData);
    
    if (status === 'COMPLETED' && !wasCompleted) {
      const requests = await readSheet('Requests');
      const requestsHeaders = await getHeaders('Requests');
      
      for (const targetReq of requests) {
        if (targetReq.batchId === id) {
          targetReq.status = id.startsWith('RESTOCK_') ? 'STOCKED' : 'READY';
          targetReq.updatedAt = getThaiTime();
          const reqRowData = requestsHeaders.map(h => targetReq[h] !== undefined ? targetReq[h] : '');
          await updateRowInSheet('Requests', targetReq._rowIndex, reqRowData);
        }
      }

      const items = await readSheet('Items');
      const itemHeaders = await getHeaders('Items');
      const quantitiesReceived = {};
      requests.filter(request => request.batchId === id).forEach(request => {
        quantitiesReceived[request.itemId] = (quantitiesReceived[request.itemId] || 0) + Number(request.quantity || 0);
      });
      for (const item of items) {
        if (!quantitiesReceived[item.id]) continue;
        // Receiving from central stock must first increase local inventory.  The
        // later distribute endpoint decreases it only after items are handed over.
        item.currentStock = Number(item.currentStock || 0) + quantitiesReceived[item.id];
        const itemRowData = itemHeaders.map(header => item[header] !== undefined ? item[header] : '');
        await updateRowInSheet('Items', item._rowIndex, itemRowData);
      }
    }
    
    const actorName = requireActor(req);
    await logAction('อัปเดต Batch', actorName, `เปลี่ยนสถานะ Batch ${id} เป็น ${status}`, 'สำเร็จ');

    res.json(targetBatch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/batches/:id/distribute', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const batches = await readSheet('Batches');
    const targetBatch = batches.find(b => b.id === id);
    if (!targetBatch) return res.status(404).json({ error: 'Not found' });
    
    const requests = await readSheet('Requests');
    const requestsHeaders = await getHeaders('Requests');
    
    const items = await readSheet('Items');
    const itemHeaders = await getHeaders('Items');
    
    const quantitiesDistributed = {};
    let hasChanges = false;
    
    for (const targetReq of requests) {
      if (targetReq.batchId === id && targetReq.status === 'READY') {
        quantitiesDistributed[targetReq.itemId] = (quantitiesDistributed[targetReq.itemId] || 0) + Number(targetReq.quantity || 0);
      }
    }
    for (const item of items) {
      if ((quantitiesDistributed[item.id] || 0) > Number(item.currentStock || 0)) {
        return res.status(409).json({ error: `Insufficient stock for ${item.name}` });
      }
    }
    for (const targetReq of requests) {
      if (targetReq.batchId === id && targetReq.status === 'READY') {
        targetReq.status = 'COLLECTED';
        targetReq.updatedAt = getThaiTime();
        const reqRowData = requestsHeaders.map(h => targetReq[h] !== undefined ? targetReq[h] : '');
        await updateRowInSheet('Requests', targetReq._rowIndex, reqRowData);
        
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      for (const item of items) {
        if (!quantitiesDistributed[item.id]) continue;
        item.currentStock = Math.max(0, Number(item.currentStock || 0) - quantitiesDistributed[item.id]);
        const itemRowData = itemHeaders.map(header => item[header] !== undefined ? item[header] : '');
        await updateRowInSheet('Items', item._rowIndex, itemRowData);
      }
      
      const actorName = requireActor(req);
      await logAction('แจกจ่ายสินค้า', actorName, `แจกจ่ายสินค้าและตัดสต็อกสำหรับ Batch ${id}`, 'สำเร็จ');
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// For Vercel Serverless Functions, we export the Express App instead of listening on a port
export default app;

// Local Development Server
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`API running locally on port ${PORT}`));
}
