'use strict';

/* ---------- helpers ---------- */
const $ = (s) => document.querySelector(s);
const el = (cls, txt) => { const d = document.createElement('div'); if (cls) d.className = cls; if (txt != null) d.textContent = txt; return d; };

/* ---------- clock ---------- */
setInterval(() => {
  $('#clock').textContent = new Date().toISOString().slice(11, 19) + 'Z';
}, 1000);

/* ---------- tab switching ---------- */
document.querySelectorAll('.tab').forEach((t) => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.view').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    $('#view-' + t.dataset.view).classList.add('active');
  });
});

/* ---------- terminal ---------- */
const term = $('#terminal');
function printLine(text, cls) { const l = el('line ' + (cls || ''), text); term.appendChild(l); term.scrollTop = term.scrollHeight; }

const FS = { 'readme.txt': 'NULLSECTOR terminal. Type `help` to see commands.', 'about.txt': 'A safe, hacker-themed playground. No real systems are touched.' };

const COMMANDS = {
  help: () => printLine([
    'available commands:',
    '  help            this message',
    '  about           about this project',
    '  ls              list files',
    '  cat <file>      print a file',
    '  whoami          current user',
    '  date            current UTC time',
    '  echo <text>     print text',
    '  hash <text>     SHA-256 of text',
    '  b64 <text>      base64 encode text',
    '  uuid            generate a UUID v4',
    '  matrix          toggle digital rain',
    '  clear           clear the screen',
    '  ai <question>   ask the assistant'
  ].join('\n'), 'sys'),
  about: () => printLine('NULLSECTOR v1.0 — a safe terminal-themed toy with real, local utilities.', 'sys'),
  ls: () => printLine(Object.keys(FS).join('  ')),
  cat: (a) => printLine(FS[a[0]] ? FS[a[0]] : 'cat: ' + (a[0] || '') + ': no such file', FS[a[0]] ? '' : 'err'),
  whoami: () => printLine('root'),
  date: () => printLine(new Date().toUTCString()),
  echo: (a) => printLine(a.join(' ')),
  uuid: () => printLine(uuid()),
  clear: () => { term.innerHTML = ''; },
  matrix: () => toggleMatrix(),
  hash: async (a) => { if (!a.length) return printLine('usage: hash <text>', 'err'); printLine(await sha('SHA-256', a.join(' '))); },
  b64: (a) => { if (!a.length) return printLine('usage: b64 <text>', 'err'); printLine(b64encode(a.join(' '))); },
  ai: (a) => { const q = a.join(' '); printLine('routing to assistant...', 'sys'); aiReply(q); }
};

$('#cmd').addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return;
  const raw = e.target.value.trim();
  e.target.value = '';
  printLine('root@nullsector:~# ' + raw, 'cmd');
  if (!raw) return;
  const [name, ...args] = raw.split(/\s+/);
  const fn = COMMANDS[name.toLowerCase()];
  if (fn) { try { await fn(args); } catch (err) { printLine('error: ' + err.message, 'err'); } }
  else printLine(name + ': command not found. type `help`.', 'err');
});

/* boot sequence */
(function boot() {
  const lines = ['[ booting NULLSECTOR kernel ]', 'mounting /dev/local ... ok', 'loading crypto module ... ok', 'starting assistant daemon ... ok', 'all tools run locally in your browser. nothing leaves this page.', "type 'help' to begin."];
  let i = 0;
  (function next() { if (i < lines.length) { printLine(lines[i++], 'sys'); setTimeout(next, 220); } })();
})();

/* ---------- assistant (local, rule-based; pluggable) ---------- */
const chat = $('#chat');
function addMsg(who, text) {
  const m = el('msg ' + (who === 'you' ? 'user' : 'ai'));
  const w = el('who', who === 'you' ? 'you' : 'assistant'); m.appendChild(w);
  m.appendChild(document.createTextNode(text));
  chat.appendChild(m); chat.scrollTop = chat.scrollHeight;
  return m;
}

async function aiReply(q) {
  if (!q) return;
  const text = q.toLowerCase();
  let reply;
  if (/^(hi|hello|hey|yo)\b/.test(text)) reply = 'Hello. I am the local assistant. Ask me to hash, encode, generate a uuid/password, decode a jwt, or type "help".';
  else if (text.includes('help') || text.includes('what can you do')) reply = 'I can run local utilities: "hash <text>", "base64 <text>", "uuid", "password", "explain jwt". Switch to the Tools tab for full UIs.';
  else if (text.startsWith('hash ')) reply = 'SHA-256: ' + await sha('SHA-256', q.slice(5));
  else if (text.startsWith('base64 ') || text.startsWith('b64 ')) reply = 'base64: ' + b64encode(q.replace(/^b(ase)?64 /, ''));
  else if (text.includes('uuid')) reply = 'Here is a UUID v4: ' + uuid();
  else if (text.includes('password')) reply = 'Generated: ' + pwgen(20, true);
  else if (text.includes('jwt')) reply = 'A JWT has 3 base64url parts: header.payload.signature. Use the JWT decoder in Tools to inspect one (it is not verified).';
  else if (text.includes('hack') || text.includes('exploit') || text.includes('attack')) reply = 'I will not help attack, scan, or break into systems. I only offer safe, local developer utilities.';
  else reply = "I'm a local rule-based assistant, so I keep things safe and offline. Try: hash, base64, uuid, password, or jwt. To wire in a real LLM, replace aiReply() with a fetch() to your own API endpoint.";
  setTimeout(() => addMsg('ai', reply), 250);
}

function sendChat() {
  const inp = $('#chatInput'); const q = inp.value.trim();
  if (!q) return; inp.value = '';
  addMsg('you', q); aiReply(q);
}
$('#chatSend').addEventListener('click', sendChat);
$('#chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
addMsg('ai', 'Assistant online. I run entirely in your browser. Ask me anything or try the Tools tab.');

/* ---------- crypto + utility functions ---------- */
async function sha(algo, text) {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function b64encode(s) { return btoa(unescape(encodeURIComponent(s))); }
function b64decode(s) { return decodeURIComponent(escape(atob(s))); }
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}
function pwgen(len, syms) {
  const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const sym = '!@#$%^&*()-_=+[]{};:,.<>?';
  const chars = base + (syms ? sym : '');
  const out = crypto.getRandomValues(new Uint32Array(len));
  return [...out].map((n) => chars[n % chars.length]).join('');
}

/* ---------- tools wiring ---------- */
document.querySelectorAll('[data-act]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const act = btn.dataset.act;
    try {
      if (act === 'hash') $('#hashOut').textContent = await sha($('#hashAlgo').value, $('#hashIn').value);
      else if (act === 'b64enc') $('#b64Out').textContent = b64encode($('#b64In').value);
      else if (act === 'b64dec') $('#b64Out').textContent = b64decode($('#b64In').value);
      else if (act === 'urlenc') $('#urlOut').textContent = encodeURIComponent($('#urlIn').value);
      else if (act === 'urldec') $('#urlOut').textContent = decodeURIComponent($('#urlIn').value);
      else if (act === 'pwgen') $('#pwOut').textContent = pwgen(Math.max(6, Math.min(128, +$('#pwLen').value || 20)), $('#pwSym').checked);
      else if (act === 'uuid') $('#uuidOut').textContent = uuid();
      else if (act === 'jwt') $('#jwtOut').textContent = decodeJwt($('#jwtIn').value);
      else if (act === 'json') $('#jsonOut').textContent = JSON.stringify(JSON.parse($('#jsonIn').value), null, 2);
    } catch (err) {
      const map = { hash: '#hashOut', b64enc: '#b64Out', b64dec: '#b64Out', urlenc: '#urlOut', urldec: '#urlOut', jwt: '#jwtOut', json: '#jsonOut' };
      if (map[act]) $(map[act]).textContent = 'error: ' + err.message;
    }
  });
});

function decodeJwt(token) {
  const parts = token.trim().split('.');
  if (parts.length < 2) throw new Error('not a valid JWT');
  const dec = (p) => JSON.stringify(JSON.parse(b64decode(p.replace(/-/g, '+').replace(/_/g, '/'))), null, 2);
  return 'HEADER:\n' + dec(parts[0]) + '\n\nPAYLOAD:\n' + dec(parts[1]) + '\n\n(signature not verified)';
}

/* ---------- matrix rain ---------- */
let matrixCanvas = null, matrixTimer = null;
function toggleMatrix() {
  if (matrixCanvas) { clearInterval(matrixTimer); matrixCanvas.remove(); matrixCanvas = null; printLine('matrix: off', 'sys'); return; }
  printLine('matrix: on (run `matrix` again to stop)', 'sys');
  const c = document.createElement('canvas');
  Object.assign(c.style, { position: 'fixed', inset: '0', zIndex: '5', pointerEvents: 'none', opacity: '0.35' });
  document.body.appendChild(c); matrixCanvas = c;
  const ctx = c.getContext('2d');
  function size() { c.width = innerWidth; c.height = innerHeight; }
  size(); addEventListener('resize', size);
  const cols = Math.floor(c.width / 14); const drops = Array(cols).fill(0);
  const glyphs = 'アイウエオカキ0123456789ABCDEF';
  matrixTimer = setInterval(() => {
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#33ff66'; ctx.font = '14px monospace';
    drops.forEach((y, i) => {
      ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * 14, y * 14);
      drops[i] = y * 14 > c.height && Math.random() > 0.975 ? 0 : y + 1;
    });
  }, 50);
}
