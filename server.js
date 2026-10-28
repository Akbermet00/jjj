require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');

const db = require('./src/db');
const { generateOutfits } = require('./src/styling');
const { searchTrends, searchShop } = require('./src/trends');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'];
const SEASONS = ['all', 'spring', 'summer', 'autumn', 'winter'];
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) =>
      cb(null, crypto.randomBytes(12).toString('hex') + (EXT[file.mimetype] || '.jpg')),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new Error('Допустимы только JPG, PNG и WebP')),
});

app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function readFields(body) {
  const name = String(body.name || '').trim();
  const category = String(body.category || '');
  const season = String(body.season || 'all');
  if (!name) return { error: 'Укажите название вещи' };
  if (!CATEGORIES.includes(category)) return { error: 'Неверная категория' };
  if (!SEASONS.includes(season)) return { error: 'Неверный сезон' };
  return {
    value: {
      name: name.slice(0, 120),
      category,
      season,
      color: String(body.color || '').trim().toLowerCase().slice(0, 40),
      brand: String(body.brand || '').trim().slice(0, 80),
      notes: String(body.notes || '').trim().slice(0, 500),
    },
  };
}

// ---------- API ----------

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/items', (req, res) => {
  const { category, q } = req.query;
  let sql = 'SELECT * FROM items WHERE 1=1';
  const args = [];
  if (category && CATEGORIES.includes(category)) {
    sql += ' AND category = ?';
    args.push(category);
  }
  if (q) {
    sql += ' AND (name LIKE ? OR brand LIKE ? OR color LIKE ?)';
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY id DESC';
  res.json(db.prepare(sql).all(...args));
});

app.get('/api/items/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Вещь не найдена' });
  res.json(item);
});

app.post('/api/items', upload.single('photo'), (req, res) => {
  const { value, error } = readFields(req.body);
  if (error || !req.file) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: error || 'Добавьте фото вещи' });
  }
  const info = db
    .prepare(
      `INSERT INTO items (name, category, color, season, brand, notes, image)
       VALUES (@name, @category, @color, @season, @brand, @notes, @image)`
    )
    .run({ ...value, image: `/uploads/${req.file.filename}` });
  res.status(201).json(db.prepare('SELECT * FROM items WHERE id = ?').get(info.lastInsertRowid));
});

app.put('/api/items/:id', (req, res) => {
  const exists = db.prepare('SELECT id FROM items WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Вещь не найдена' });
  const { value, error } = readFields(req.body);
  if (error) return res.status(400).json({ error });
  db.prepare(
    `UPDATE items SET name=@name, category=@category, color=@color, season=@season,
     brand=@brand, notes=@notes WHERE id=@id`
  ).run({ ...value, id: req.params.id });
  res.json(db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id));
});

app.delete('/api/items/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Вещь не найдена' });
  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  fs.unlink(path.join(__dirname, item.image), () => {});
  res.json({ ok: true });
});

app.get('/api/outfits', (req, res) => {
  const season = SEASONS.includes(req.query.season) ? req.query.season : 'all';
  const items = db.prepare('SELECT * FROM items').all();
  res.json(generateOutfits(items, { season }));
});

app.get('/api/trends', wrap(async (req, res) => res.json(await searchTrends(req.query.q))));
app.get('/api/shop', wrap(async (req, res) => res.json(await searchShop(req.query.q))));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Неизвестный адрес API' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err instanceof multer.MulterError || /Допустимы/.test(err.message) ? 400 : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Ошибка сервера: ' + err.message : err.message });
});

app.listen(PORT, () => console.log(`Гардероб запущен: http://localhost:${PORT}`));
