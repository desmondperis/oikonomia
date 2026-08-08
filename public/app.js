/* Oikonomia — Stage 1.
 *
 * Everything here runs on the device and stays on the device. There is no
 * account, no server and no sync yet; this stage exists so the feel of the app
 * can be judged before any machinery is built underneath it.
 *
 * Money is held in paise (whole numbers) rather than rupees, so that arithmetic
 * is always exact. 0.1 + 0.2 is not 0.3 in a computer, and a budgeting app can
 * never afford that.
 */

'use strict';

const STORE_KEY = 'oikonomia.entries.v1';

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const rupeesExact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2
});

const el = (id) => document.getElementById(id);

const ui = {
  headlineFigure: el('headline-figure'),
  headlineNote: el('headline-note'),
  list: el('entry-list'),
  empty: el('entries-empty'),
  addButton: el('add-button'),
  sheet: el('sheet'),
  backdrop: el('sheet-backdrop'),
  form: el('entry-form'),
  amount: el('amount'),
  note: el('note'),
  error: el('form-error'),
  cancel: el('cancel-button'),
  toast: el('toast')
};

/* ---------- storage ---------- */

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A corrupt store must never lose the app. Start empty and carry on.
    return [];
  }
}

function saveEntries(entries) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

let entries = loadEntries();

/* ---------- money ---------- */

/** Parse what a person actually types. Returns paise, or null if unusable. */
function parseAmount(input) {
  const cleaned = String(input).replace(/[\s,₹]/g, '');
  if (!cleaned) return null;
  if (!/^\d*\.?\d*$/.test(cleaned)) return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value > 10_000_000) return null;

  return Math.round(value * 100);
}

function formatPaise(paise) {
  const hasPaise = paise % 100 !== 0;
  const formatter = hasPaise ? rupeesExact : rupees;
  return formatter.format(paise / 100).replace(/^₹\s?/, '₹');
}

/* ---------- dates ---------- */

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function describeWhen(timestamp) {
  const then = new Date(timestamp);
  const now = new Date();

  const sameDay = then.toDateString() === now.toDateString();
  if (sameDay) {
    return 'Today, ' + then.toLocaleTimeString('en-IN', {
      hour: 'numeric', minute: '2-digit'
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* ---------- rendering ---------- */

function render() {
  const monthStart = startOfMonth();
  const thisMonth = entries.filter((entry) => entry.at >= monthStart);
  const total = thisMonth.reduce((sum, entry) => sum + entry.paise, 0);

  ui.headlineFigure.textContent = formatPaise(total);

  if (thisMonth.length === 0) {
    ui.headlineNote.textContent = 'Nothing recorded yet.';
  } else {
    const count = thisMonth.length;
    ui.headlineNote.textContent =
      `${count} ${count === 1 ? 'entry' : 'entries'} so far this month.`;
  }

  ui.list.replaceChildren();

  const recent = entries.slice(0, 20);
  ui.empty.hidden = recent.length > 0;

  for (const entry of recent) {
    const item = document.createElement('li');
    item.className = 'entry';

    const left = document.createElement('div');
    left.className = 'entry-note';
    left.textContent = entry.note || 'Expense';

    const when = document.createElement('span');
    when.className = 'entry-when';
    when.textContent = describeWhen(entry.at);
    left.appendChild(when);

    const amount = document.createElement('div');
    amount.className = 'entry-amount';
    amount.textContent = formatPaise(entry.paise);

    item.append(left, amount);
    ui.list.appendChild(item);
  }
}

/* ---------- the add sheet ---------- */

let lastFocused = null;

function openSheet() {
  lastFocused = document.activeElement;
  ui.error.hidden = true;
  ui.form.reset();
  ui.backdrop.hidden = false;
  ui.sheet.hidden = false;
  ui.amount.focus();
}

function closeSheet() {
  ui.sheet.hidden = true;
  ui.backdrop.hidden = true;
  if (lastFocused instanceof HTMLElement) lastFocused.focus();
}

let toastTimer = null;

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast.hidden = true; }, 2600);
}

function handleSubmit(event) {
  event.preventDefault();

  const paise = parseAmount(ui.amount.value);
  if (paise === null) {
    ui.error.textContent = 'Please enter an amount, like 250.';
    ui.error.hidden = false;
    ui.amount.focus();
    return;
  }

  const entry = {
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    paise,
    note: ui.note.value.trim(),
    at: Date.now()
  };

  entries.unshift(entry);

  if (!saveEntries(entries)) {
    entries.shift();
    ui.error.textContent = 'Could not save on this device. Please try again.';
    ui.error.hidden = false;
    return;
  }

  closeSheet();
  render();
  showToast(`${formatPaise(paise)} added`);
}

/* ---------- wiring ---------- */

ui.addButton.addEventListener('click', openSheet);
ui.cancel.addEventListener('click', closeSheet);
ui.backdrop.addEventListener('click', closeSheet);
ui.form.addEventListener('submit', handleSubmit);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !ui.sheet.hidden) closeSheet();
});

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // Offline support is a bonus here, never a requirement.
    });
  });
}
