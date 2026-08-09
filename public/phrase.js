/* The twelve words.
 *
 * This is the one screen in Oikonomia that must not be skimmed. The words are
 * the household's only key: everything is locked with them before it leaves the
 * phone, which is what stops whoever runs the server reading a family's money —
 * and what makes losing them final.
 *
 * So it is deliberately slow. The words are shown once, plainly, with what they
 * are and what happens if they are lost, and nothing continues until somebody
 * has said they have written them down.
 */

import { t } from './i18n.js';
import { makePhrase, unlock, storedPhrase, resyncFromScratch } from './sync.js';
import { phraseLooksRight, unknownWords, tidyPhrase } from './crypto.js';

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/**
 * Show a household its new words.
 *
 * `onDone` runs only after the confirmation is ticked, because a household that
 * has not written these down is one bad day from losing everything.
 */
export function showNewPhrase(body, code, onDone) {
  const phrase = makePhrase();
  body.replaceChildren();

  body.append(node('h3', 'survey-ask', t('sync.phraseTitle')));
  body.append(node('p', 'phrase-why', t('sync.phraseWhy')));

  const grid = node('ol', 'phrase-grid');
  phrase.split(' ').forEach((word) => grid.append(node('li', 'phrase-word', word)));
  body.append(grid);

  body.append(node('p', 'survey-help', t('sync.phraseHow')));

  const agree = node('label', 'phrase-agree');
  const box = document.createElement('input');
  box.type = 'checkbox';
  agree.append(box, node('span', null, t('sync.phraseConfirm')));
  body.append(agree);

  const done = node('button', 'primary-action', t('sync.phraseDone'));
  done.type = 'button';
  done.disabled = true;
  box.addEventListener('change', () => { done.disabled = !box.checked; });

  const problem = node('p', 'form-error');
  problem.hidden = true;

  done.addEventListener('click', async () => {
    done.disabled = true;
    const outcome = await unlock(phrase, code);

    if (outcome === 'wrong') {
      // Somebody else in the household set the words first.
      problem.textContent = t('sync.wrongPhrase');
      problem.hidden = false;
      done.disabled = false;
      return;
    }

    resyncFromScratch();
    onDone(outcome);
  });

  body.append(problem, done);
}

/** Ask for the words a household already has. */
export function askForPhrase(body, code, onDone) {
  body.replaceChildren();

  body.append(node('h3', 'survey-ask', t('sync.enterTitle')));
  body.append(node('p', 'survey-help', t('sync.enterWhy')));

  const field = node('label', 'field');
  const input = document.createElement('textarea');
  input.className = 'phrase-input';
  input.rows = 3;
  input.autocapitalize = 'none';
  input.autocomplete = 'off';
  input.spellcheck = false;
  field.append(input);
  body.append(field);

  const problem = node('p', 'form-error');
  problem.hidden = true;

  const go = node('button', 'primary-action', t('sync.enterAction'));
  go.type = 'button';

  go.addEventListener('click', async () => {
    const typed = tidyPhrase(input.value);
    const strangers = unknownWords(typed);

    // Say which word is wrong rather than only that something is.
    if (strangers.length > 0) {
      problem.textContent = t('sync.badWords', { words: strangers.join(', ') });
      problem.hidden = false;
      return;
    }

    if (!phraseLooksRight(typed)) {
      problem.textContent = t('sync.needTwelve');
      problem.hidden = false;
      return;
    }

    go.disabled = true;
    problem.hidden = true;

    const outcome = await unlock(typed, code);

    if (outcome === 'wrong') {
      problem.textContent = t('sync.wrongPhrase');
      problem.hidden = false;
      go.disabled = false;
      return;
    }

    resyncFromScratch();
    onDone(outcome);
  });

  body.append(problem, go);
}

/** Show the words again, to somebody who already has them on this phone. */
export function revealPhrase(body) {
  const phrase = storedPhrase();
  if (!phrase) return false;

  body.replaceChildren();
  body.append(node('h3', 'survey-ask', t('sync.phraseTitle')));
  body.append(node('p', 'phrase-why', t('sync.phraseWhy')));

  const grid = node('ol', 'phrase-grid');
  phrase.split(' ').forEach((word) => grid.append(node('li', 'phrase-word', word)));
  body.append(grid);

  body.append(node('p', 'survey-help', t('sync.phraseHow')));
  return true;
}
