const express = require('express');
const router = express.Router();
const db = require('../db');

function slugify(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

function checkAdmin(req, res, next) {
  const password = process.env.BLOG_PASSWORD || 'leadvolver-admin';
  if (req.headers['x-admin-password'] !== password) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.get('/admin/posts', checkAdmin, (req, res) => {
  const posts = db.prepare(
    'SELECT id, title, slug, excerpt, author, published, created_at FROM blogs ORDER BY created_at DESC'
  ).all();
  res.json(posts);
});

router.get('/', (req, res) => {
  const posts = db.prepare(
    'SELECT id, title, slug, excerpt, author, created_at FROM blogs WHERE published = 1 ORDER BY created_at DESC'
  ).all();
  res.json(posts);
});

router.get('/:slug', (req, res) => {
  const post = db.prepare(
    'SELECT * FROM blogs WHERE slug = ? AND published = 1'
  ).get(req.params.slug);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});

router.post('/', checkAdmin, (req, res) => {
  const { title, content, excerpt, author } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  let slug = slugify(title);
  if (db.prepare('SELECT id FROM blogs WHERE slug = ?').get(slug)) {
    slug = slug + '-' + Date.now();
  }

  const result = db.prepare(
    'INSERT INTO blogs (title, slug, content, excerpt, author) VALUES (?, ?, ?, ?, ?)'
  ).run(title, slug, content, excerpt || '', author || 'LEADVOLVER');

  res.json({ id: result.lastInsertRowid, slug });
});

router.put('/:id', checkAdmin, (req, res) => {
  const post = db.prepare('SELECT * FROM blogs WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });

  const { title, content, excerpt, author, published } = req.body;
  db.prepare(
    'UPDATE blogs SET title = ?, content = ?, excerpt = ?, author = ?, published = ? WHERE id = ?'
  ).run(
    title ?? post.title,
    content ?? post.content,
    excerpt ?? post.excerpt,
    author ?? post.author,
    published ?? post.published,
    req.params.id
  );
  res.json({ success: true });
});

router.delete('/:id', checkAdmin, (req, res) => {
  db.prepare('DELETE FROM blogs WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
