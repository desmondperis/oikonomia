/* The shape of the app: which screen is showing, and who is signed in.
 *
 * Five places to be, one of which is the plus button. Everything else is
 * reachable in one tap from wherever you are, because a household checking
 * whether they can afford a taxi should not be navigating menus.
 */

import { t } from './i18n.js';
import { isUnlocked, storedPhrase } from './sync.js';
import { showNewPhrase, askForPhrase, revealPhrase } from './phrase.js';

const el = (id) => document.getElementById(id);

const PANELS = ['home', 'plan', 'ask', 'records', 'more'];

let onShow = () => {};
let onAdd = () => {};

let current = 'home';

export function showTab(name) {
  if (name === 'add') { onAdd(); return; }
  if (!PANELS.includes(name)) return;

  current = name;

  for (const id of PANELS) {
    const panel = el(id);
    if (panel) panel.hidden = id !== name;
  }

  for (const tab of document.querySelectorAll('.tab')) {
    const active = tab.dataset.tab === name;
    tab.classList.toggle('tab-active', active);
    if (active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }

  window.scrollTo(0, 0);
  onShow(name);
}

export function currentTab() {
  return current;
}

/* ---------- who is signed in ---------- */

let session = { signedIn: false, configured: false, household: null, members: [] };

export function getSession() {
  return session;
}

export async function loadSession() {
  try {
    const response = await fetch('/api/auth/session');
    if (response.ok) session = await response.json();
  } catch {
    // Offline. The app runs perfectly well without knowing.
  }

  const badge = el('household-badge');
  if (badge) {
    if (session.household) {
      badge.textContent = session.household.code;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  const signOut = el('sign-out');
  if (signOut) signOut.hidden = !session.signedIn;

  return session;
}

/* ---------- the household panel ---------- */

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function renderHousehold() {
  const body = el('household-body');
  if (!body) return;

  body.replaceChildren();

  if (!session.configured) {
    body.append(node('p', 'import-note',
      t('house.deviceOnly')));
    return;
  }

  if (!session.signedIn) {
    body.append(node('p', 'import-lead',
      t('house.signInFirst')));
    const link = node('a', 'primary-action landing-action', t('house.continueGoogle'));
    link.href = '/api/auth/google/start';
    body.append(link);
    return;
  }

  if (!session.household) {
    body.append(node('p', 'import-lead',
      t('house.createOrJoin')));

    const nameField = node('label', 'field');
    nameField.append(node('span', 'field-label', t('house.nameAsk')));
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = t('house.namePlaceholder');
    nameField.append(nameInput);

    const create = node('button', 'primary-action', t('house.create'));
    create.type = 'button';

    const codeField = node('label', 'field');
    codeField.append(node('span', 'field-label', t('house.orJoin')));
    const codeInput = document.createElement('input');
    codeInput.type = 'text';
    codeInput.placeholder = 'PERIS19';
    codeInput.autocapitalize = 'characters';
    codeField.append(codeInput);

    const join = node('button', 'secondary-action full', t('house.join'));
    join.type = 'button';

    const problem = node('p', 'import-note');
    problem.hidden = true;

    const send = async (payload, button) => {
      button.disabled = true;
      problem.hidden = true;
      try {
        const response = await fetch('/api/households', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const answer = await response.json();
        if (!response.ok) throw new Error(answer.error || 'That did not work.');
        await loadSession();
        renderHousehold();
      } catch (error) {
        problem.textContent = String(error.message);
        problem.className = 'import-note status-bad';
        problem.hidden = false;
      } finally {
        button.disabled = false;
      }
    };

    create.addEventListener('click', () => send({ name: nameInput.value }, create));
    join.addEventListener('click', () => send({ action: 'join', code: codeInput.value }, join));

    body.append(nameField, create, codeField, join, problem);
    return;
  }

  const household = session.household;

  body.append(node('p', 'household-name', household.name));

  const code = node('div', 'household-code');
  code.append(node('span', 'household-code-label', t('house.code')));
  code.append(node('strong', null, household.code));
  code.append(node('span', 'household-code-note', t('house.codeNote')));
  body.append(code);

  const list = node('ul', 'file-list');
  for (const member of session.members || []) {
    const item = node('li', 'file-row');
    item.append(node('span', 'file-name', member.name || member.email));
    item.append(node('span', 'file-state',
      member.role === 'HEAD' ? t('house.head')
        : member.role === 'VIEW_ONLY' ? t('house.viewOnly') : t('house.member')));
    list.append(item);
  }
  body.append(list);

  renderSharing(body, household);
}

/**
 * Whether this phone is sharing with the rest of the household.
 *
 * Until the twelve words are on it, a phone in a household is still an island:
 * it has an account and a code, but nothing it records reaches anybody else.
 */
function renderSharing(body, household) {
  const status = node('div', 'row row-static');
  const main = node('span', 'row-main');
  main.append(node('span', 'row-title', t('sync.title')));
  main.append(node('span', 'row-note', isUnlocked() ? t('sync.status') : t('sync.notSharing')));
  status.append(main);
  body.append(status);

  const panel = node('div', 'phrase-panel');
  body.append(panel);

  if (isUnlocked()) {
    const show = node('button', 'secondary-action full', t('sync.showPhrase'));
    show.type = 'button';
    show.addEventListener('click', () => {
      if (!revealPhrase(panel)) return;
      show.hidden = true;
    });
    body.append(show);
    return;
  }

  const start = node('button', 'primary-action', t('sync.title'));
  start.type = 'button';
  start.addEventListener('click', () => {
    const setUp = () => {
      // The head sets the words; anybody else is given them by the head.
      const done = () => { renderHousehold(); onSharingChanged(); };
      if (household.role === 'HEAD' && !storedPhrase()) showNewPhrase(panel, household.code, done);
      else askForPhrase(panel, household.code, done);
    };
    start.hidden = true;
    setUp();
  });

  body.append(start);
}

let onSharingChanged = () => {};

export function whenSharingStarts(handler) {
  onSharingChanged = handler || (() => {});
}

/* ---------- wiring ---------- */

export function setUpShell({ show, add }) {
  onShow = show || (() => {});
  onAdd = add || (() => {});

  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => showTab(tab.dataset.tab));
  }

  const signOut = el('sign-out');
  if (signOut) {
    signOut.addEventListener('click', async () => {
      try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* offline */ }
      location.href = '/';
    });
  }

  showTab('home');
}
