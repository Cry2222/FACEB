const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'posts.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  }
});

function readPosts() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

function writePosts(posts) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
}

async function publishToFacebook(post) {
  const { FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN } = process.env;
  if (!FB_PAGE_ID || !FB_PAGE_ACCESS_TOKEN) {
    throw new Error('FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN must be set in .env');
  }
  const base = `https://graph.facebook.com/v19.0/${FB_PAGE_ID}`;

  if (post.type === 'image') {
    const form = new FormData();
    form.append('message', post.message);
    form.append('access_token', FB_PAGE_ACCESS_TOKEN);
    if (post.imageUrl) {
      form.append('url', post.imageUrl);
    } else if (post.imagePath && fs.existsSync(post.imagePath)) {
      form.append('source', fs.createReadStream(post.imagePath));
    }
    const res = await axios.post(`${base}/photos`, form, { headers: form.getHeaders() });
    return res.data.post_id || res.data.id;
  }

  const res = await axios.post(`${base}/feed`, {
    message: post.message,
    access_token: FB_PAGE_ACCESS_TOKEN
  });
  return res.data.id;
}

async function publishPendingPosts() {
  const posts = readPosts();
  const now = new Date();
  let changed = false;

  for (const post of posts) {
    if (post.status !== 'pending') continue;
    if (new Date(post.scheduledAt) > now) continue;

    try {
      post.fbPostId = await publishToFacebook(post);
      post.status = 'published';
      post.publishedAt = new Date().toISOString();
      if (post.imagePath && fs.existsSync(post.imagePath)) {
        fs.unlinkSync(post.imagePath);
        post.imagePath = null;
      }
    } catch (err) {
      post.status = 'failed';
      post.error = err.response?.data?.error?.message || err.message;
    }
    changed = true;
  }

  if (changed) writePosts(posts);
}

// GET /api/posts
router.get('/', (req, res) => {
  res.json(readPosts().reverse());
});

// POST /api/posts  (create / schedule)
router.post('/', upload.single('image'), (req, res) => {
  const { message, scheduledAt, imageUrl } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
  if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt is required' });

  const post = {
    id: crypto.randomUUID(),
    type: (req.file || imageUrl) ? 'image' : 'text',
    message: message.trim(),
    imageUrl: imageUrl || null,
    imagePath: req.file ? req.file.path : null,
    scheduledAt,
    status: 'pending',
    fbPostId: null,
    createdAt: new Date().toISOString(),
    publishedAt: null,
    error: null
  };

  const posts = readPosts();
  posts.push(post);
  writePosts(posts);
  res.json(post);
});

// POST /api/posts/:id/publish  (force-publish now)
router.post('/:id/publish', async (req, res) => {
  const posts = readPosts();
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.status !== 'pending') return res.status(400).json({ error: 'Post is not pending' });

  try {
    post.fbPostId = await publishToFacebook(post);
    post.status = 'published';
    post.publishedAt = new Date().toISOString();
    if (post.imagePath && fs.existsSync(post.imagePath)) {
      fs.unlinkSync(post.imagePath);
      post.imagePath = null;
    }
    writePosts(posts);
    res.json(post);
  } catch (err) {
    post.status = 'failed';
    post.error = err.response?.data?.error?.message || err.message;
    writePosts(posts);
    res.status(502).json({ error: post.error });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', (req, res) => {
  const posts = readPosts();
  const idx = posts.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Post not found' });
  const [removed] = posts.splice(idx, 1);
  if (removed.imagePath && fs.existsSync(removed.imagePath)) {
    fs.unlinkSync(removed.imagePath);
  }
  writePosts(posts);
  res.json({ ok: true });
});

module.exports = { router, publishPendingPosts };
