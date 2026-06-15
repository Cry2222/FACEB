require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const session = require('express-session');
const path = require('path');
const cron = require('node-cron');
const { router: postsRouter, publishPendingPosts } = require('./routes/posts');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.redirect('/login');
}

app.use('/auth', require('./routes/auth'));

app.get('/login', (req, res) => {
  if (req.session.authenticated) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.use('/api/posts', requireAuth, postsRouter);

// Check for scheduled posts every minute
cron.schedule('* * * * *', () => {
  publishPendingPosts().catch(err => console.error('[scheduler]', err.message));
});

app.listen(PORT, () => {
  console.log(`Facebook Publisher running → http://localhost:${PORT}`);
});
