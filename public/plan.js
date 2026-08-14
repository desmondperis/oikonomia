/* The plan screen.
 *
 * Two things live here. First, what Oikonomia understood from the household's
 * records — shown before any plan is made, and open to correction, because a
 * plan built on figures the household has not agreed with is worthless.
 *
 * Then the plan itself: what is set aside for what, how the month is going
 * against it, and what changing one figure would cost elsewhere.
 */

import { formatPaise, readRupees } from './money.js';
import { typicalMonth, financialState, monthName, recurringCosts } from './engine.js';
import { buildBudget, adjustLine, compare } from './budget.js';
import { allocate, SOURCE_ESTIMATE, howMuchIsKnown } from './allocate.js';
import { principlesFor, categoryInfo } from './framework.js';
import { startSurvey, loadProfile } from './survey.js';
import { readInstruction, readWithAssistant, amountAfter } from './intent.js';
import { t, categoryName, getLanguage } from './i18n.js';

const STORE = 'oikonomia.budget.v1';

const el = (id) => document.getElementById(id);

const ui = {
  body: el('plan-body')
};

let getEntries = () => [];
let onChanged = () => {};

/* True while the household is being asked about itself instead of shown a plan. */
let asking = false;

/** The month a fresh plan is for. */
/* The month the plan governs is the month you are living in.
 *
 * This used to say next month, left over from when a plan was built by reading
 * last month's statement. Under the survey it was simply wrong: `compare` has
 * always measured spending against the current month, so a plan finished in
 * August was labelled September while quietly governing August. It also meant
 * finishing the survey on the 1st bought you thirty days of nothing to do. */
function thisMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/* ---------- keeping the plan ---------- */

export function loadBudget() {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveBudget(budget) {
  try {
    localStorage.setItem(STORE, JSON.stringify(budget));
    return true;
  } catch { return false; }
}

export function clearBudget() {
  try { localStorage.removeItem(STORE); } catch { /* fine */ }
}

/* ---------- small pieces ---------- */

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function figureRow(label, value, muted = false) {
  const row = node('div', 'figure-row');
  const term = node('dt', null, label);
  const detail = node('dd', muted ? 'muted' : null, value);
  row.append(term, detail);
  return row;
}

/* ---------- what we understood ---------- */

function understanding(entries) {
  const typical = typicalMonth(entries);
  const box = document.createDocumentFragment();

  box.append(node('h3', 'import-title', "Here's what I understood"));

  if (typical.monthsUsed === 0) {
    box.append(node('p', 'import-lead',
      'Nothing to go on yet. Oikonomia can learn your household from bank ' +
      'statements — or you can simply tell it, which takes about two minutes.'));
    return { fragment: box, typical, ready: false };
  }

  box.append(node('p', 'understood-source',
    typical.monthsComplete > 0
      ? `From ${typical.monthsUsed} complete month${typical.monthsUsed === 1 ? '' : 's'} of your records.`
      : 'From your records so far. This will settle as more months go by.'));

  const figures = node('dl', 'understood');
  figures.append(
    figureRow('Money coming in', typical.income > 0 ? formatPaise(typical.income) : 'not known yet'),
    figureRow('Things you must pay', formatPaise(typical.essential)),
    figureRow('Everything else', formatPaise(typical.flexible)),
    figureRow(
      typical.surplus >= 0 ? 'Left over' : 'Short by',
      formatPaise(Math.abs(typical.surplus))
    )
  );
  box.append(figures);

  box.append(node('p', 'import-note',
    'These are worked out from your own records, not estimated. If something ' +
    'looks wrong, correct the entries on the home screen and come back — the ' +
    'plan is built from these figures.'));

  return { fragment: box, typical, ready: typical.income > 0 || typical.essential > 0 };
}

/* ---------- a word worth saying ---------- */

function guidance(entries) {
  const state = financialState(entries);
  const [principle] = principlesFor(state);
  if (!principle) return null;

  const box = node('div', 'principle');
  box.append(node('strong', null, t(principle.key)));
  box.append(node('p', 'principle-says', t(`${principle.key}.says`)));

  const passage = principle.passages.find((item) => item.text);
  if (passage) {
    const quote = node('blockquote', 'principle-passage');

    /* The passage is quoted only in the language it was translated into. Putting
       Scripture into Hindi is a translator's work; an improvised rendering would
       be worse than none, so the reference is given and the household reads it in
       their own Bible. */
    if (getLanguage().startsWith('hi')) {
      quote.append(node('span', null, t('pr.readIt')));
    } else {
      quote.append(node('span', null, `“${passage.text}”`));
    }

    quote.append(node('cite', null, passage.ref));
    box.append(quote);
  }

  box.append(node('p', 'principle-source', t('plan.principleNote')));
  return box;
}

/* ---------- the plan ---------- */

function planLines(budget, entries) {
  const comparison = compare(budget, entries);
  const list = node('ul', 'plan-list');

  for (const line of budget.lines) {
    const row = comparison.rows.find((item) => item.id === line.id);
    const item = node('li', 'plan-item');

    const head = node('button', 'plan-row');
    head.type = 'button';

    const left = node('div', 'plan-name');
    left.append(node('span', null, categoryName(line.id)));

    // A household should always be able to see which figures are its own and
    // which are Oikonomia's guesses, without opening anything.
    if (line.source === SOURCE_ESTIMATE) {
      left.append(node('span', 'plan-tag plan-guess', t('survey.stillGuess')));
    } else if (line.fixed) {
      left.append(node('span', 'plan-tag', t('plan.everyMonth')));
    }

    const right = node('div', 'plan-amounts');
    right.append(node('span', 'plan-planned', formatPaise(line.plannedPaise)));

    if (row && row.actualPaise > 0) {
      const state = row.standing === 'over' ? 'plan-over'
        : row.standing === 'quick' ? 'plan-quick' : 'plan-fine';
      right.append(node('span', `plan-remaining ${state}`,
        row.remainingPaise >= 0
          ? `${formatPaise(row.remainingPaise)} left`
          : `${formatPaise(-row.remainingPaise)} over`));
    }

    head.append(left, right);

    const why = node('p', 'plan-why', line.basis);
    why.hidden = true;

    const editor = node('div', 'plan-editor');
    editor.hidden = true;

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.value = String(Math.round(line.plannedPaise / 100));
    input.className = 'plan-input';
    input.setAttribute('aria-label', `Planned amount for ${line.id}`);

    const apply = node('button', 'secondary-action', t('plan.change'));
    apply.type = 'button';

    const consequence = node('p', 'plan-consequence');
    consequence.hidden = true;

    apply.addEventListener('click', () => {
      const paise = readRupees(input.value);
      if (paise === null) {
        consequence.textContent = t('add.needAmount');
        consequence.hidden = false;
        return;
      }

      const { budget: next, consequence: told } = adjustLine(budget, line.id, paise);
      saveBudget(next);
      if (told) {
        consequence.textContent = told.text;
        consequence.hidden = false;
      }
      onChanged();
      render();
    });

    editor.append(input, apply);

    head.addEventListener('click', () => {
      const open = why.hidden;
      why.hidden = !open;
      editor.hidden = !open;
    });

    item.append(head, why, editor, consequence);
    list.appendChild(item);
  }

  return { list, comparison };
}

/* ---------- changing the plan by saying so ---------- */

/**
 * A box for telling Oikonomia what to change.
 *
 * The sentence is understood; the figures are not taken from it. What the change
 * comes to, and what it costs elsewhere, is worked out by the budget engine and
 * shown before it is kept.
 */
function askBox(budget, entries) {
  const box = node('div', 'plan-ask');

  const field = node('div', 'ask-form');
  const input = document.createElement('input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.placeholder = t('plan.tellPlaceholder');
  field.append(input);

  const go = node('button', 'primary-action ask-send', '→');
  go.type = 'button';
  go.setAttribute('aria-label', t('plan.tellAction'));
  field.append(go);

  const said = node('p', 'plan-consequence');
  said.hidden = true;

  const show = (message) => { said.textContent = message; said.hidden = false; };

  const apply = async () => {
    const sentence = input.value.trim();
    if (!sentence) return;

    go.disabled = true;
    show(t('plan.thinking'));

    // Ordinary rules first; the assistant only for a sentence they cannot read.
    let instruction = readInstruction(sentence);
    if (!instruction) instruction = await readWithAssistant(sentence);

    go.disabled = false;

    if (!instruction) {
      show(t('plan.notUnderstood'));
      return;
    }

    const line = budget.lines.find((entry) => entry.id === instruction.category);

    if (!line) {
      show(t('plan.noSuchLine', { category: categoryName(instruction.category) }));
      return;
    }

    const wanted = amountAfter(instruction, line.plannedPaise);
    const { budget: next, consequence } = adjustLine(budget, instruction.category, wanted);

    saveBudget(next);
    onChanged();
    render();

    // Say what was done and what it costs, in that order.
    const done = t('plan.changed', {
      category: categoryName(instruction.category),
      amount: formatPaise(wanted)
    });

    const body = ui.body.querySelector('.plan-consequence');
    if (body) {
      body.textContent = consequence ? `${done} ${consequence.text}` : done;
      body.hidden = false;
    }
  };

  go.addEventListener('click', apply);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); apply(); }
  });

  box.append(node('p', 'plan-ask-lead', t('plan.tellLead')), field, said);
  void entries;
  return box;
}

/* ---------- putting the screen together ---------- */

function render() {
  const entries = getEntries();
  const budget = loadBudget();

  ui.body.replaceChildren();

  if (asking) {
    startSurvey(ui.body, (profile) => {
      asking = false;
      const fresh = allocate(profile);
      fresh.month = thisMonthKey();
      saveBudget(fresh);
      onChanged();
      render();
    });
    return;
  }

  if (!budget) {
    const { fragment, ready } = understanding(entries);
    ui.body.append(fragment);

    const word = guidance(entries);
    if (word) ui.body.append(word);

    if (ready) {
      const make = node('button', 'primary-action', t('plan.makeMine'));
      make.type = 'button';
      make.addEventListener('click', () => {
        const fresh = buildBudget(entries);
        if (fresh.lines.length === 0) return;
        saveBudget(fresh);
        onChanged();
        render();
      });
      ui.body.append(make);
    }

    // Statements are one way in, not the only one. A household with none is
    // not turned away.
    const tell = node(
      'button',
      ready ? 'secondary-action full' : 'primary-action',
      loadProfile() ? 'Tell Oikonomia about your household again' : 'Tell Oikonomia about your household'
    );
    tell.type = 'button';
    tell.addEventListener('click', () => { asking = true; render(); });
    ui.body.append(tell);

    if (!ready) {
      ui.body.append(node('p', 'import-note',
        'Eleven short questions about what comes in and what must go out. Skip any that ' +
        'do not apply. Nothing is estimated for you.'));
    }
    return;
  }

  const { list, comparison } = planLines(budget, entries);

  /* The month alone — the tab is already titled "Your plan" directly above, and
     a heading that repeats the title it sits under is a heading doing nothing.
     The month named is the one `compare` actually measured against, not the
     label stored when the plan was made. They are the same for any plan made
     from now on, but a plan saved under the old behaviour carries next month's
     name, and a screen should never claim to cover a month it does not. */
  ui.body.append(node('p', 'screen-subtitle',
    monthName(comparison.month, getLanguage())));

  if (budget.fromProfile) {
    const known = howMuchIsKnown(budget);

    ui.body.append(node('p', 'understood-source',
      known.estimated > 0
        ? t('plan.builtFrom', { known: known.known, estimated: known.estimated })
        : t('plan.allReal')));

    if (known.estimated > 0) {
      const bar = node('div', 'known-meter');
      const fill = node('div', 'known-fill');
      fill.style.width = `${Math.round(known.share * 100)}%`;
      bar.append(fill);

      ui.body.append(bar);
      ui.body.append(node('p', 'known-note',
        t('survey.knownNote', { percent: Math.round(known.share * 100) })));
    }
  }

  const totals = node('dl', 'understood');
  totals.append(
    figureRow(t('plan.planned'), formatPaise(budget.plannedPaise)),
    figureRow(t('plan.spentSoFar'), formatPaise(comparison.spentPaise)),
    figureRow(t('plan.stillToSpend'), formatPaise(comparison.remainingPaise))
  );
  ui.body.append(totals);

  /* Only a plan that genuinely will not balance gets a box like this. It is the
     one thing on the screen a household must not scroll past. */
  for (const note of budget.notes || []) {
    if (note.kind !== 'shortfall') continue;

    const box = node('div', 'verdict verdict-warn');
    const wrapper = node('div');
    wrapper.append(node('strong', null, t('plan.doesNotBalance')));
    wrapper.append(node('span', null, t('plan.shortfallNote')));
    box.append(wrapper);
    ui.body.append(box);
  }

  /* The plan itself, then the box that offers to change it. It used to be the
     other way round, which asked a household what they wanted different before
     showing them what they had. */
  ui.body.append(node('p', 'import-note', t('plan.tapAny')));
  ui.body.append(list);

  ui.body.append(askBox(budget, entries));

  const word = guidance(entries);
  if (word) ui.body.append(word);

  const redo = node('button', 'secondary-action full', t('plan.startAgain'));
  redo.type = 'button';
  redo.addEventListener('click', () => {
    if (redo.dataset.armed !== 'true') {
      redo.dataset.armed = 'true';
      redo.textContent = t('plan.startOverSure');
      return;
    }
    clearBudget();
    onChanged();
    render();
  });
  ui.body.append(redo);
}

/* ---------- wiring ---------- */

export function setUpPlan({ entries, changed }) {
  getEntries = entries;
  onChanged = changed || (() => {});
}

/** Called by the shell each time the plan tab is opened. */
export const renderPlan = render;
