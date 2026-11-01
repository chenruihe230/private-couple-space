const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'shared-state.json');

let localConfig = {};
try {
  localConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'private-config.json'), 'utf8'));
} catch {
  localConfig = {};
}

const ACCESS_CODE = process.env.ROOM_ACCESS_CODE || localConfig.accessCode;
const SESSION_SECRET = process.env.SESSION_SECRET || localConfig.sessionSecret;
const SESSION_COOKIE = 'couple_room_session';
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30;

if (!ACCESS_CODE || !SESSION_SECRET) {
  throw new Error('缺少 ROOM_ACCESS_CODE 或 SESSION_SECRET 配置。');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const loginAttempts = new Map();

const RELATIONSHIP_START = '2026-10-22';

function defaultState() {
  return {
    revision: 0,
    users: [],
    migratedPre1022: true,
    settings: {
      // 关键配置：真正开始在一起的纪念日
      startDate: RELATIONSHIP_START,
      coupleName: '我们的小世界',
      girlName: '她',
      sundayClassEndTime: '17:00'
    },
    completedWishes: [],
    moods: {},
    notes: [
      {
        id: crypto.randomUUID(),
        text: '今天也有在认真想你，希望你下班的路一路顺利。',
        tag: '想念',
        author: '小信箱',
        time: Date.now()
      }
    ],
    memories: [],
    datePicks: {},
    vents: [],
    coupons: [],
    closedDays: 0
  };
}

function migrateState(state) {
  const next = { ...defaultState(), ...state };
  next.settings = { ...defaultState().settings, ...(state.settings || {}) };

  // 一次性迁移：删除 10 月 22 日之前的旧纪念册内容，并把 10 月 22 日设为纪念日
  if (!state.migratedPre1022) {
    next.settings.startDate = RELATIONSHIP_START;
    next.memories = [];
    next.migratedPre1022 = true;
  }

  next.completedWishes = Array.isArray(next.completedWishes) ? next.completedWishes : [];
  next.moods = next.moods || {};
  next.notes = Array.isArray(next.notes) ? next.notes : [];
  next.memories = Array.isArray(next.memories) ? next.memories : [];
  next.datePicks = next.datePicks || {};
  next.vents = Array.isArray(next.vents) ? next.vents : [];
  next.coupons = Array.isArray(next.coupons) ? next.coupons : [];
  next.users = Array.isArray(next.users) ? next.users : [];
  return next;
}

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultState(), null, 2));
  }
}

function readState() {
  ensureData();
  try {
    return migrateState(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
  } catch {
    return defaultState();
  }
}

function writeState(state) {
  ensureData();
  const temp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(state, null, 2));
  fs.renameSync(temp, DATA_FILE);
}

function json(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders
  });
  res.end(body);
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > limit) {
        reject(new Error('请求内容过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new Error('请求内容不是有效 JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sign(payload) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

function createSession(name) {
  const payload = Buffer.from(JSON.stringify({
    name,
    exp: Date.now() + SESSION_TTL
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function parseCookies(req) {
  const cookies = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index > -1) {
      cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return cookies;
}

function getSession(req) {
  const raw = parseCookies(req)[SESSION_COOKIE];
  if (!raw) return null;
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const provided = Buffer.from(signature);
  const valid = Buffer.from(expected);
  if (provided.length !== valid.length || !crypto.timingSafeEqual(provided, valid)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

function sessionCookie(name) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(createSession(name))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL / 1000)}${secure}`;
}

function clearCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function safeEqual(actual, expected) {
  const a = Buffer.from(String(actual || ''));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function rateLimited(req) {
  const ip = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const attempts = (loginAttempts.get(ip) || []).filter((time) => now - time < 60_000);
  if (attempts.length >= 8) {
    loginAttempts.set(ip, attempts);
    return true;
  }
  attempts.push(now);
  loginAttempts.set(ip, attempts);
  return false;
}

function sanitizeText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

async function handleApi(req, res, pathname) {
  const session = getSession(req);

  if (pathname === '/api/health' && req.method === 'GET') {
    return json(res, 200, { ok: true });
  }

  if (pathname === '/api/session' && req.method === 'GET') {
    if (!session) return json(res, 401, { error: '请先登录' });
    const state = readState();
    return json(res, 200, { user: session.name, users: state.users, state });
  }

  if (pathname === '/api/login' && req.method === 'POST') {
    if (rateLimited(req)) return json(res, 429, { error: '尝试太频繁，请一分钟后再试' });
    const body = await readBody(req);
    const name = sanitizeText(body.name, 12);
    const code = sanitizeText(body.code, 80);

    if (!name || !safeEqual(code, ACCESS_CODE)) {
      return json(res, 401, { error: '暗号不正确或昵称为空' });
    }

    const state = readState();
    if (!state.users.includes(name) && state.users.length >= 2) {
      return json(res, 409, { error: '这个小世界已经有两位成员了' });
    }
    if (!state.users.includes(name)) {
      state.users.push(name);
      state.revision += 1;
      writeState(state);
    }

    return json(res, 200, {
      user: name,
      users: state.users,
      state
    }, { 'Set-Cookie': sessionCookie(name) });
  }

  if (pathname === '/api/logout' && req.method === 'POST') {
    return json(res, 200, { ok: true }, { 'Set-Cookie': clearCookie() });
  }

  if (!session) return json(res, 401, { error: '登录已过期' });

  if (pathname === '/api/state' && req.method === 'GET') {
    return json(res, 200, { user: session.name, state: readState() });
  }

  if (pathname === '/api/export' && req.method === 'GET') {
    const state = readState();
    const exportData = {
      project: '两个人的小世界',
      exportedAt: new Date().toISOString(),
      exportedBy: session.name,
      backupTip: '请将该文件保存到两个可靠的位置，避免 JSON 数据损坏或丢失。',
      data: state
    };
    const body = JSON.stringify(exportData, null, 2);
    const filename = `couple-space-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'Content-Length': Buffer.byteLength(body)
    });
    return res.end(body);
  }

  if (pathname === '/api/update' && req.method === 'POST') {
    const body = await readBody(req);
    const state = readState();
    const action = String(body.action || '');

    if (action === 'settings') {
      const startDate = sanitizeText(body.startDate, 20);
      const coupleName = sanitizeText(body.coupleName, 20);
      const girlName = sanitizeText(body.girlName, 12);
      const sundayClassEndTime = sanitizeText(body.sundayClassEndTime, 5);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return json(res, 400, { error: '日期格式不正确' });
      }
      if (sundayClassEndTime && !/^\d{2}:\d{2}$/.test(sundayClassEndTime)) {
        return json(res, 400, { error: '下课时间格式不正确' });
      }
      state.settings = {
        ...state.settings,
        startDate,
        coupleName: coupleName || '我们的小世界',
        girlName: girlName || '她',
        sundayClassEndTime: sundayClassEndTime || '17:00'
      };
    } else if (action === 'wishes') {
      const completed = Array.isArray(body.completed) ? body.completed : [];
      state.completedWishes = [...new Set(completed.filter((n) => Number.isInteger(n) && n >= 0 && n < 5))].sort();
    } else if (action === 'mood') {
      const mood = sanitizeText(body.mood, 20);
      if (!mood) return json(res, 400, { error: '心情不能为空' });
      state.moods = { ...state.moods, [session.name]: mood };
    } else if (action === 'note') {
      const text = sanitizeText(body.text, 120);
      const tag = sanitizeText(body.tag, 12);
      if (!text) return json(res, 400, { error: '悄悄话不能为空' });
      state.notes.unshift({
        id: crypto.randomUUID(),
        text,
        tag: tag || '想念',
        author: session.name,
        time: Date.now()
      });
      state.notes = state.notes.slice(0, 60);
    } else if (action === 'memory') {
      const title = sanitizeText(body.title, 30);
      const caption = sanitizeText(body.caption, 40);
      const image = sanitizeText(body.image, 2000);
      if (!title || !caption) return json(res, 400, { error: '记忆内容不能为空' });
      if (image && !/^https?:\/\//i.test(image)) {
        return json(res, 400, { error: '图片地址必须以 http:// 或 https:// 开头' });
      }
      state.memories.push({
        id: crypto.randomUUID(),
        title,
        caption,
        image,
        author: session.name,
        time: Date.now()
      });
    } else if (action === 'vent') {
      const text = sanitizeText(body.text, 80);
      if (!text) return json(res, 400, { error: '碎碎念不能为空' });
      state.vents.unshift({
        id: crypto.randomUUID(),
        text,
        author: session.name,
        time: Date.now()
      });
      state.vents = state.vents.slice(0, 40);
    } else if (action === 'couponCreate') {
      const title = sanitizeText(body.title, 24);
      const note = sanitizeText(body.note, 60);
      if (!title) return json(res, 400, { error: '兑换券名称不能为空' });
      state.coupons.unshift({
        id: crypto.randomUUID(),
        title,
        note,
        issuer: session.name,
        createdAt: Date.now(),
        active: true,
        uses: []
      });
      state.coupons = state.coupons.slice(0, 30);
    } else if (action === 'couponRedeem') {
      const id = sanitizeText(body.id, 60);
      const coupon = state.coupons.find((item) => item.id === id);
      if (!coupon) return json(res, 400, { error: '找不到这张兑换券' });
      if (coupon.active === false) return json(res, 400, { error: '这张兑换券已经核销过了' });
      coupon.uses = Array.isArray(coupon.uses) ? coupon.uses : [];
      coupon.uses.push({
        id: crypto.randomUUID(),
        by: session.name,
        time: Date.now()
      });
      coupon.active = false;
    } else if (action === 'couponReset') {
      const id = sanitizeText(body.id, 60);
      const coupon = state.coupons.find((item) => item.id === id);
      if (!coupon) return json(res, 400, { error: '找不到这张兑换券' });
      coupon.active = true;
    } else if (action === 'datePick') {
      const titles = Array.isArray(body.titles) ? body.titles : [];
      state.datePicks = {
        ...state.datePicks,
        [session.name]: titles.map((title) => sanitizeText(title, 30)).slice(0, 6)
      };
    } else if (action === 'closeDay') {
      state.closedDays = Number(state.closedDays || 0) + 1;
    } else {
      return json(res, 400, { error: '未知操作' });
    }

    state.revision += 1;
    writeState(state);
    return json(res, 200, { ok: true, revision: state.revision, state });
  }

  return json(res, 404, { error: '接口不存在' });
}

function serveStatic(req, res, pathname) {
  const decoded = decodeURIComponent(pathname);
  const requested = decoded === '/' ? '/index.html' : decoded;
  const filePath = path.resolve(ROOT, `.${requested}`);

  if (!filePath.startsWith(`${path.resolve(ROOT)}${path.sep}`)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }

    const extension = path.extname(filePath).toLowerCase();
    const headers = {
      'Content-Type': MIME[extension] || 'application/octet-stream',
      'Content-Length': stats.size,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600'
    };

    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname.startsWith('/api/')) {
      return await handleApi(req, res, pathname);
    }

    return serveStatic(req, res, pathname);
  } catch (error) {
    return json(res, 400, { error: error.message || '请求处理失败' });
  }
});

ensureData();
server.listen(PORT, () => {
  console.log(`Couple room running at http://127.0.0.1:${PORT}`);
});
