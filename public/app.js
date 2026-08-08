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

import { parseExpense } from './nlp.js';
import { formatPaise, readRupees } from './money.js';
import { setUpImport } from './import.js';

const STORE_KEY = 'oikonomia.entries.v1';

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
  toast: el('toast'),
  voiceButton: el('voice-button'),
  voiceLabel: el('voice-label'),
  voiceHeard: el('voice-heard'),
  voiceDivider: el('voice-divider'),
  voiceLanguage: el('voice-language'),
  language: el('language'),
  sheetTitle: el('sheet-title'),
  saveButton: el('save-button'),
  deleteButton: el('delete-button'),
  welcome: el('welcome')
};

/* ---------- spoken language ---------- */

const LANGUAGE_KEY = 'oikonomia.language.v1';
const LANGUAGES = ['en-IN', 'hi-IN'];

/** What the phone itself is set to — the best guess before anyone is asked. */
function deviceLanguage() {
  const tags = [navigator.language, ...(navigator.languages || [])];
  for (const tag of tags) {
    if (String(tag).toLowerCase().startsWith('hi')) return 'hi-IN';
  }
  return 'en-IN';
}

function savedLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved && LANGUAGES.includes(saved)) return saved;
  } catch { /* storage unavailable */ }
  return null;
}

function rememberLanguage(value) {
  language = LANGUAGES.includes(value) ? value : 'en-IN';
  try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* fine */ }
}

let language = savedLanguage() || deviceLanguage();

/** Asked once, on first opening. Everything else waits behind it. */
function askLanguageIfNeeded() {
  if (savedLanguage()) return;

  ui.welcome.hidden = false;

  for (const choice of ui.welcome.querySelectorAll('[data-language]')) {
    // Nudge towards the phone's own language without deciding for anyone.
    if (choice.dataset.language === deviceLanguage()) {
      choice.style.borderColor = 'var(--accent)';
    }
    choice.addEventListener('click', () => {
      rememberLanguage(choice.dataset.language);
      ui.welcome.hidden = true;
      ui.addButton.focus();
    });
  }
}

/* ---------- storage ---------- */

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Entries written before money could come in as well as go out.
    return parsed.map((entry) => ({
      direction: 'debit',
      source: 'manual',
      ...entry
    }));
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

function newId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

  // Money coming in is not spending. Only what went out is counted here.
  const spent = thisMonth
    .filter((entry) => entry.direction !== 'credit')
    .reduce((sum, entry) => sum + entry.paise, 0);

  ui.headlineFigure.textContent = formatPaise(spent);

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

    // The whole row is tappable, so a mistake can always be corrected.
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'entry';
    button.dataset.id = entry.id;
    button.setAttribute(
      'aria-label',
      `Edit ${entry.note || 'expense'}, ${formatPaise(entry.paise)}`
    );

    const left = document.createElement('div');
    left.className = 'entry-note';
    left.textContent = entry.note || 'Expense';

    const when = document.createElement('span');
    when.className = 'entry-when';
    when.textContent = describeWhen(entry.at);
    left.appendChild(when);

    const amount = document.createElement('div');
    amount.className = 'entry-amount';
    if (entry.direction === 'credit') {
      amount.textContent = `+ ${formatPaise(entry.paise)}`;
      amount.style.color = 'var(--accent)';
    } else {
      amount.textContent = formatPaise(entry.paise);
    }

    button.append(left, amount);
    button.addEventListener('click', () => openSheet(entry.id));

    item.appendChild(button);
    ui.list.appendChild(item);
  }
}

/* ---------- speaking an expense ---------- */

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

let recognition = null;
let listening = false;
let listenGuard = null;

function voiceSupported() {
  return SpeechRecognition !== null;
}

function setVoiceState(state, label) {
  ui.voiceButton.dataset.state = state;
  ui.voiceLabel.textContent = label;
}

function showHeard(html) {
  ui.voiceHeard.innerHTML = html;
  ui.voiceHeard.hidden = false;
}

function stopListening() {
  listening = false;
  clearTimeout(listenGuard);
  setVoiceState('idle', 'Say it instead');
  if (recognition) {
    try { recognition.stop(); } catch { /* already stopped */ }
  }
}

/** Fill the form from what was heard, and say plainly what was understood. */
function applyHeard(transcript) {
  const result = parseExpense(transcript, { spoken: true });
  const spoken = result.heard || transcript;

  ui.note.value = result.note;

  if (result.paise === null) {
    ui.amount.value = '';
    showHeard(
      `Heard “${escapeHtml(spoken)}”. I didn't catch an amount — please type it.`
    );
    ui.amount.focus();
    return;
  }

  ui.amount.value = String(result.paise / 100);

  const amountText = `<strong>${formatPaise(result.paise)}</strong>`;
  const noteText = result.note ? ` for <strong>${escapeHtml(result.note)}</strong>` : '';

  if (result.confidence === 'high') {
    showHeard(`Heard “${escapeHtml(spoken)}” — ${amountText}${noteText}. Check it, then save.`);
  } else {
    showHeard(`Heard “${escapeHtml(spoken)}”. I think that's ${amountText}${noteText} — please check before saving.`);
  }
}

function escapeHtml(text) {
  const box = document.createElement('span');
  box.textContent = text;
  return box.innerHTML;
}

function startListening() {
  if (listening) { stopListening(); return; }

  recognition = new SpeechRecognition();
  recognition.lang = language;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript ?? '';
    stopListening();
    if (transcript.trim()) applyHeard(transcript);
    else showHeard("I didn't hear anything. Try again, or type it below.");
  };

  recognition.onerror = (event) => {
    stopListening();
    const message = {
      'not-allowed': 'Your phone blocked the microphone. Allow it in your browser settings, or type it below.',
      'service-not-allowed': 'Your phone blocked the microphone. Allow it in your browser settings, or type it below.',
      'no-speech': "I didn't hear anything. Try again, or type it below.",
      'audio-capture': "I couldn't reach the microphone. Type it below instead.",
      'network': 'Speaking needs a connection. Type it below instead.'
    }[event.error] || "That didn't work. Type it below instead.";
    showHeard(message);
  };

  recognition.onend = () => { if (listening) stopListening(); };

  try {
    recognition.start();
    listening = true;
    setVoiceState('listening', 'Listening… tap to stop');
    ui.voiceHeard.hidden = true;

    // Some Android builds never fire onend. Never leave it listening forever.
    listenGuard = setTimeout(stopListening, 12000);
  } catch {
    stopListening();
    showHeard("Couldn't start listening. Type it below instead.");
  }
}

/* ---------- the add sheet ---------- */

let lastFocused = null;
let editingId = null;

/** Opens blank to add, or filled in to correct something already recorded. */
function openSheet(id = null) {
  lastFocused = document.activeElement;
  editingId = id;

  ui.error.hidden = true;
  ui.voiceHeard.hidden = true;
  ui.form.reset();
  resetDeleteButton();

  const existing = id ? entries.find((entry) => entry.id === id) : null;

  if (existing) {
    ui.sheetTitle.textContent = 'Edit expense';
    ui.saveButton.textContent = 'Save changes';
    ui.amount.value = String(existing.paise / 100);
    ui.note.value = existing.note;
    ui.deleteButton.hidden = false;
  } else {
    ui.sheetTitle.textContent = 'Add expense';
    ui.saveButton.textContent = 'Save';
    ui.deleteButton.hidden = true;
  }

  ui.backdrop.hidden = false;
  ui.sheet.hidden = false;

  // Correcting something is a typing job, so the microphone stays out of it.
  const offerVoice = voiceSupported() && !existing;
  ui.voiceButton.hidden = !offerVoice;
  ui.voiceDivider.hidden = !offerVoice;
  ui.voiceLanguage.hidden = !offerVoice;

  if (offerVoice) {
    ui.language.value = language;
    setVoiceState('idle', 'Say it instead');
  } else {
    ui.amount.focus();
  }
}

function closeSheet() {
  stopListening();
  editingId = null;
  ui.sheet.hidden = true;
  ui.backdrop.hidden = true;
  resetDeleteButton();
  if (lastFocused instanceof HTMLElement) lastFocused.focus();
}

/* ---------- removing an entry ---------- */

let deleteArmed = false;

function resetDeleteButton() {
  deleteArmed = false;
  ui.deleteButton.dataset.confirming = 'false';
  ui.deleteButton.textContent = 'Remove this expense';
}

function handleDelete() {
  // One tap arms it, a second confirms. No dialog to dismiss, no accidents.
  if (!deleteArmed) {
    deleteArmed = true;
    ui.deleteButton.dataset.confirming = 'true';
    ui.deleteButton.textContent = 'Tap again to remove it';
    return;
  }

  const removed = entries.find((entry) => entry.id === editingId);
  entries = entries.filter((entry) => entry.id !== editingId);

  if (!saveEntries(entries)) {
    if (removed) entries.unshift(removed);
    ui.error.textContent = 'Could not save on this device. Please try again.';
    ui.error.hidden = false;
    resetDeleteButton();
    return;
  }

  closeSheet();
  render();
  showToast('Removed');
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

  let paise = readRupees(ui.amount.value);
  let note = ui.note.value.trim();

  // Someone may type the whole thing into the description — "burger 250".
  if (paise === null && note) {
    const read = parseExpense(note);
    if (read.paise !== null) {
      paise = read.paise;
      note = read.note;
    }
  }

  if (paise === null) {
    ui.error.textContent = 'Please enter an amount, like 250.';
    ui.error.hidden = false;
    ui.amount.focus();
    return;
  }

  const before = entries;

  if (editingId) {
    entries = entries.map((entry) =>
      entry.id === editingId ? { ...entry, paise, note } : entry
    );
  } else {
    entries = [
      {
        id: newId(),
        paise,
        note,
        at: Date.now(),
        direction: 'debit',
        source: 'manual'
      },
      ...entries
    ];
  }

  if (!saveEntries(entries)) {
    entries = before;
    ui.error.textContent = 'Could not save on this device. Please try again.';
    ui.error.hidden = false;
    return;
  }

  const wasEditing = Boolean(editingId);
  closeSheet();
  render();
  showToast(wasEditing ? 'Updated' : `${formatPaise(paise)} added`);
}

/* ---------- taking in a statement ---------- */

/** What makes two records the same purchase, for the purpose of not repeating it. */
function fingerprint(entry) {
  const note = String(entry.note || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const day = new Date(entry.at).toDateString();
  return `${day}|${entry.paise}|${entry.direction}|${note}`;
}

function importTransactions(transactions, source) {
  const known = new Set(entries.map(fingerprint));

  const incoming = transactions.map((transaction) => ({
    id: newId(),
    paise: transaction.paise,
    note: transaction.description || 'Bank transaction',
    // Midday, so a time zone can never nudge a transaction into another day.
    at: Date.parse(`${transaction.date}T12:00:00`),
    direction: transaction.direction === 'credit' ? 'credit' : 'debit',
    source: 'statement',
    statement: source.ending ? `${source.bank} ending ${source.ending}` : source.bank
  }));

  // Re-uploading the same statement must not double the household's spending.
  const fresh = incoming.filter((entry) => !known.has(fingerprint(entry)));
  const repeated = incoming.length - fresh.length;

  if (fresh.length === 0) {
    showToast('Those transactions are already recorded');
    return;
  }

  const before = entries;
  entries = [...fresh, ...entries].sort((a, b) => b.at - a.at);

  if (!saveEntries(entries)) {
    entries = before;
    showToast('Could not save on this device');
    return;
  }

  render();
  showToast(
    repeated > 0
      ? `${fresh.length} added, ${repeated} already recorded`
      : `${fresh.length} transactions added`
  );
}

/* ---------- wiring ---------- */

ui.addButton.addEventListener('click', () => openSheet());
ui.cancel.addEventListener('click', closeSheet);
ui.deleteButton.addEventListener('click', handleDelete);
ui.backdrop.addEventListener('click', closeSheet);
ui.form.addEventListener('submit', handleSubmit);
ui.voiceButton.addEventListener('click', startListening);

ui.language.addEventListener('change', () => {
  rememberLanguage(ui.language.value);
  stopListening();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !ui.sheet.hidden) closeSheet();
});

setUpImport(importTransactions);

render();
askLanguageIfNeeded();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // Offline support is a bonus here, never a requirement.
    });
  });
}

// Exposed only so the checks in scripts/ and the browser console can exercise
// the same code paths a person would.
window.__oikonomia = { parseExpense, applyHeard, voiceSupported };
