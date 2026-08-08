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
import {
  getKey, setKey, hasKey, testConnection,
  categoriseLocally, categoriseWithAi, merchantOf
} from './ai.js';
import { setUpPlan, renderPlan, loadBudget, clearBudget } from './plan.js';
import { resetImport } from './import.js';
import { compare } from './budget.js';
import { setUpShell, showTab, loadSession, renderHousehold } from './shell.js';
import { setUpAsk, renderAsk } from './ask.js';
import { financialState } from './engine.js';
import { principlesFor } from './framework.js';

const STORE_KEY = 'oikonomia.entries.v1';

const el = (id) => document.getElementById(id);

const ui = {
  home: el('home'),
  greeting: el('greeting'),
  headlineLabel: el('headline-label'),
  headlineFigure: el('headline-figure'),
  headlineMeter: el('headline-meter'),
  headlineMeterFill: el('headline-meter-fill'),
  headlineMeterToday: el('headline-meter-today'),
  monthSpent: el('month-spent'),
  dashCategories: el('dash-categories'),
  categoryList: el('category-list'),
  dashInsight: el('dash-insight'),
  dashNext: el('dash-next'),
  nextBody: el('next-body'),
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
  welcome: el('welcome'),
  settingsLanguage: el('settings-language'),
  eraseAll: el('erase-all'),
  apiKey: el('api-key'),
  apiSave: el('api-save'),
  apiRemove: el('api-remove'),
  apiStatus: el('api-status')
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

/* ---------- the dashboard ---------- */

function greetingFor(date) {
  const hour = date.getHours();
  const when = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const month = date.toLocaleDateString('en-IN', { month: 'long' });
  return `${when} · ${month}`;
}

function makeNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Each part of the plan, as a bar rather than a table of figures. */
function renderCategories(comparison) {
  const rows = comparison.rows.filter((row) => row.plannedPaise > 0).slice(0, 6);
  ui.dashCategories.hidden = rows.length === 0;
  ui.categoryList.replaceChildren();

  if (rows.length === 0) return;

  for (const row of rows) {
    const item = makeNode('li', 'category-item');

    const top = makeNode('div', 'category-top');
    top.append(makeNode('span', 'category-name', row.id));
    top.append(makeNode(
      'span',
      `category-left ${row.standing === 'over' ? 'plan-over' : row.standing === 'quick' ? 'plan-quick' : ''}`.trim(),
      row.remainingPaise >= 0
        ? `${formatPaise(row.remainingPaise)} left`
        : `${formatPaise(-row.remainingPaise)} over`
    ));

    const bar = makeNode('div', 'meter meter-small');
    const fill = makeNode('div', 'meter-fill');
    const share = row.plannedPaise > 0
      ? Math.min(1, row.actualPaise / row.plannedPaise) : 0;
    fill.style.width = `${Math.round(share * 100)}%`;
    fill.dataset.state = row.standing === 'over' ? 'over' : row.standing === 'quick' ? 'quick' : 'fine';
    bar.append(fill);

    item.append(top, bar);
    ui.categoryList.append(item);
  }
}

/** One observation, where there is genuinely one worth making. */
function renderInsight(entries) {
  ui.dashInsight.replaceChildren();
  if (entries.length === 0) return;

  const state = financialState(entries);
  const [principle] = principlesFor(state);
  if (!principle) return;

  const card = makeNode('div', 'insight');
  card.append(makeNode('strong', null, principle.title));
  card.append(makeNode('p', null, principle.says));
  ui.dashInsight.append(card);
}

/** The single most useful thing this household could do next. */
function renderNextStep(entries, budget) {
  ui.nextBody.replaceChildren();

  const step = (text, label, action) => {
    ui.nextBody.append(makeNode('p', 'next-text', text));
    const button = makeNode('button', 'secondary-action full', label);
    button.type = 'button';
    button.addEventListener('click', action);
    ui.nextBody.append(button);
    ui.dashNext.hidden = false;
  };

  ui.dashNext.hidden = true;

  if (entries.length === 0) {
    step(
      'Oikonomia has nothing to go on yet. Upload a few months of bank statements ' +
      'and it will work out what a normal month looks like for your household.',
      'Add a bank statement',
      () => showTab('records')
    );
    return;
  }

  if (!budget) {
    step(
      'You have records but no plan yet. A plan turns "what did we spend" into ' +
      '"what have we still got".',
      'Make my plan',
      () => showTab('plan')
    );
    return;
  }

  if (!hasKey()) {
    step(
      'Adding an assistant key lets Oikonomia sort unfamiliar shops and answer ' +
      'questions in plain words. It is free, and takes about two minutes.',
      'Set up the assistant',
      () => showTab('more')
    );
  }
}

/* ---------- rendering ---------- */

function render() {
  const monthStart = startOfMonth();
  const thisMonth = entries.filter((entry) => entry.at >= monthStart);

  // Money coming in is not spending. Only what went out is counted here.
  const spent = thisMonth
    .filter((entry) => entry.direction !== 'credit')
    .reduce((sum, entry) => sum + entry.paise, 0);

  const budget = loadBudget();

  ui.monthSpent.textContent = formatPaise(spent);
  ui.greeting.textContent = greetingFor(new Date());

  /* What has gone sits beside the add button — but only once there is a plan,
     because until then the big figure above is already saying it, and the same
     number twice on one screen makes a person doubt both. */
  ui.monthSpent.parentElement.hidden = !budget;

  if (budget) {
    // Once there is a plan, what is left matters far more than what has gone.
    const comparison = compare(budget, entries);
    const left = comparison.remainingPaise;

    ui.headlineLabel.textContent = left >= 0 ? 'Left for this month' : 'Over your plan by';
    ui.headlineFigure.textContent = formatPaise(Math.abs(left));

    const overspent = comparison.rows.filter((row) => row.standing === 'over').length;
    ui.headlineNote.textContent = left < 0
      ? 'Worth a look at your plan.'
      : overspent > 0
        ? `${comparison.daysLeft} days left · ${overspent} ${overspent === 1 ? 'category is' : 'categories are'} over`
        : `${comparison.daysLeft} days left in the month`;

    // A bar with today marked on it, so being ahead or behind is obvious
    // without reading a single number.
    const used = comparison.plannedPaise > 0
      ? Math.min(1, comparison.spentPaise / comparison.plannedPaise) : 0;
    const throughMonth = comparison.dayOfMonth / (comparison.dayOfMonth + comparison.daysLeft);

    ui.headlineMeter.hidden = false;
    ui.headlineMeterFill.style.width = `${Math.round(used * 100)}%`;
    ui.headlineMeterFill.dataset.state = left < 0 ? 'over' : used > throughMonth + 0.15 ? 'quick' : 'fine';
    ui.headlineMeterToday.style.left = `${Math.round(throughMonth * 100)}%`;

    renderCategories(comparison);
  } else {
    ui.headlineLabel.textContent = 'Spent this month';
    ui.headlineFigure.textContent = formatPaise(spent);
    ui.headlineMeter.hidden = true;
    ui.dashCategories.hidden = true;

    if (thisMonth.length === 0) {
      ui.headlineNote.textContent = 'Nothing recorded yet.';
    } else {
      const count = thisMonth.length;
      ui.headlineNote.textContent =
        `${count} ${count === 1 ? 'entry' : 'entries'} so far this month.`;
    }
  }

  renderInsight(entries);
  renderNextStep(entries, budget);

  ui.list.replaceChildren();

  const recent = entries.slice(0, 20);
  ui.empty.hidden = recent.length > 0;

  for (const entry of recent) {
    const item = document.createElement('li');
    item.className = 'entry-row';

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

    if (entry.category) {
      const category = document.createElement('span');
      category.className = 'entry-category';
      category.textContent = entry.category;
      left.appendChild(category);
    }

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

    // A visible way out, right where the mistake is. One tap asks, the second
    // removes — no dialog, and nothing lost by a stray thumb.
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'entry-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${entry.note || 'this expense'}`);
    remove.addEventListener('click', (event) => {
      event.stopPropagation();

      if (remove.dataset.armed !== 'true') {
        for (const other of ui.list.querySelectorAll('.entry-remove')) {
          other.dataset.armed = 'false';
          other.textContent = '×';
        }
        remove.dataset.armed = 'true';
        remove.textContent = 'Remove?';
        return;
      }

      removeEntry(entry.id);
    });

    item.append(button, remove);
    ui.list.appendChild(item);
  }
}

/** Take an entry out, keeping it in hand long enough to put back on failure. */
function removeEntry(id) {
  const before = entries;
  entries = entries.filter((entry) => entry.id !== id);

  if (!saveEntries(entries)) {
    entries = before;
    showToast('Could not save on this device');
    return;
  }

  render();
  showToast('Removed');
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

function importTransactions(transactions) {
  const known = new Set(entries.map(fingerprint));

  const incoming = transactions.map((transaction) => ({
    id: newId(),
    paise: transaction.paise,
    note: transaction.description || 'Bank transaction',
    // Midday, so a time zone can never nudge a transaction into another day.
    at: Date.parse(`${transaction.date}T12:00:00`),
    direction: transaction.direction === 'credit' ? 'credit' : 'debit',
    source: 'statement',
    statement: transaction.ending
      ? `${transaction.bank} ending ${transaction.ending}`
      : transaction.bank
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

  categoriseEntries({ quiet: true });
}

/* ---------- sorting spending into categories ---------- */

let sorting = false;

/**
 * Give every entry a category.
 *
 * Ordinary rules first — they handle most Indian merchants for nothing. Only
 * what is left over, and only the merchant name with the amount and date
 * stripped away, is ever put to the assistant.
 */
async function categoriseEntries({ quiet = false } = {}) {
  if (sorting) return;
  sorting = true;

  try {
    let changed = false;

    for (const entry of entries) {
      if (entry.category) continue;
      const local = categoriseLocally(entry.note);
      if (local) { entry.category = local; changed = true; }
    }

    if (changed) { saveEntries(entries); render(); }

    const unknown = entries.filter((entry) => !entry.category);
    if (unknown.length === 0 || !hasKey()) return;

    if (!quiet) showToast(`Sorting ${unknown.length} more…`);

    // One question per distinct merchant, not per transaction.
    const byMerchant = new Map();
    for (const entry of unknown) {
      const merchant = merchantOf(entry.note);
      if (!merchant) continue;
      if (!byMerchant.has(merchant)) byMerchant.set(merchant, []);
      byMerchant.get(merchant).push(entry);
    }

    const merchants = [...byMerchant.keys()];
    let sorted = 0;

    for (let start = 0; start < merchants.length; start += 40) {
      const batch = merchants.slice(start, start + 40);
      let answers;

      try {
        answers = await categoriseWithAi(batch);
      } catch (error) {
        showToast(String(error.message).slice(0, 60));
        break;
      }

      for (const [merchant, category] of Object.entries(answers)) {
        for (const entry of byMerchant.get(merchant) || []) {
          entry.category = category;
          sorted++;
        }
      }

      saveEntries(entries);
      render();
    }

    if (!quiet) {
      showToast(sorted > 0 ? `Sorted ${sorted} transactions` : 'Nothing new to sort');
    }
  } finally {
    sorting = false;
  }
}

/* ---------- settings ---------- */

/** Called by the shell when the More tab is opened. */
function refreshSettings() {
  ui.settingsLanguage.value = language;
  ui.apiKey.value = '';
  showKeyStatus();
  renderHousehold();
}

function showKeyStatus(message = null, kind = null) {
  if (message) {
    ui.apiStatus.textContent = message;
  } else if (hasKey()) {
    ui.apiStatus.textContent = `Connected · key ending ${getKey().slice(-4)}`;
  } else {
    ui.apiStatus.textContent = 'Not set up yet';
  }

  // The row keeps its own styling; only the tone changes.
  ui.apiStatus.className = `row-note ${kind || ''}`.trim();
  ui.apiRemove.hidden = !hasKey();
}

async function saveAndTestKey() {
  const typed = ui.apiKey.value.trim();

  if (!typed && !hasKey()) {
    showKeyStatus('Paste your key above first.', 'status-bad');
    return;
  }

  if (typed) setKey(typed);

  ui.apiSave.disabled = true;
  showKeyStatus('Checking…');

  try {
    const { model, sample } = await testConnection();
    const shown = Object.entries(sample).map(([name, category]) => `${name} → ${category}`).join(', ');
    showKeyStatus(
      `Working. Using ${model.replace(':free', '')}${shown ? `. It read ${shown}.` : '.'}`,
      'status-good'
    );
    ui.apiKey.value = '';
    categoriseEntries({ quiet: true });
  } catch (error) {
    showKeyStatus(String(error.message).slice(0, 160), 'status-bad');
  } finally {
    ui.apiSave.disabled = false;
    ui.apiRemove.hidden = !hasKey();
  }
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

ui.apiSave.addEventListener('click', saveAndTestKey);

/* Erasing everything is deliberate and complete: records, plan, learned
   categories, the key. Two taps, and then it is genuinely gone. */
const eraseTitle = ui.eraseAll.querySelector('.row-title');
const eraseNote = ui.eraseAll.querySelector('.row-note');

ui.eraseAll.addEventListener('click', () => {
  if (ui.eraseAll.dataset.armed !== 'true') {
    ui.eraseAll.dataset.armed = 'true';
    eraseTitle.textContent = 'Tap again to erase everything';
    eraseNote.textContent = 'This cannot be undone';
    return;
  }

  entries = [];
  clearBudget();
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('oikonomia.')) localStorage.removeItem(key);
    }
  } catch { /* nothing more we can do */ }

  ui.eraseAll.dataset.armed = 'false';
  eraseTitle.textContent = 'Erase everything on this device';
  eraseNote.textContent = 'Records, plan, categories and key';
  render();
  showToast('Everything erased');
});

ui.apiRemove.addEventListener('click', () => {
  setKey(null);
  ui.apiKey.value = '';
  showKeyStatus('Key removed.', null);
});

ui.settingsLanguage.addEventListener('change', () => {
  rememberLanguage(ui.settingsLanguage.value);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !ui.sheet.hidden) closeSheet();
});

setUpImport(importTransactions);
setUpPlan({ entries: () => entries, changed: render });
setUpAsk({ entries: () => entries });

setUpShell({
  add: () => openSheet(),
  show: (tab) => {
    if (tab === 'plan') renderPlan();
    else if (tab === 'more') refreshSettings();
    else if (tab === 'ask') renderAsk();
    else if (tab === 'records') resetImport();
    else render();
  }
});

render();
askLanguageIfNeeded();
categoriseEntries({ quiet: true });
loadSession().then(renderHousehold);

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
