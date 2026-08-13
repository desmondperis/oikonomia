/* Route the last of the hardcoded English through the phrase book.
 *
 * Run once. Written as a script rather than typed into a shell because a shell
 * on Windows mangles both quotes and UTF-8, and this file touches Hindi.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const WORK = {
  'survey.js': [
    ["body.append(node('h3', 'survey-ask', question.ask));\n  body.append(node('p', 'survey-help', question.help));",
     "body.append(node('h3', 'survey-ask', t(question.key)));\n  body.append(node('p', 'survey-help', t(question.key + '.help')));"],
    ["for (const [value, label] of question.options) {\n    const choice = node('button', 'welcome-choice', label);",
     "for (const [value, labelKey] of question.options) {\n    const choice = node('button', 'welcome-choice', t(labelKey));"],
    ["question.kind === 'yearly' ? 'Amount for the whole year' : 'Amount each month'));",
     "t(question.kind === 'yearly' ? 'survey.yearly' : 'survey.monthly')));"],
    ["field.append(node('span', 'field-label', 'How many'));",
     "field.append(node('span', 'field-label', t('survey.howMany')));"],
    ["problem.textContent = 'Oikonomia cannot plan without this one. A rough figure is fine.';",
     "problem.textContent = t('survey.needed');"],
    ["problem.textContent = 'Please enter an amount, like 5000.';",
     "problem.textContent = t('add.needAmount');"],
    ["problem.textContent = 'Please enter a number.';",
     "problem.textContent = t('survey.notANumber');"],
    ["const next = node('button', 'primary-action', step === QUESTIONS.length - 1 ? 'Finish' : 'Next');",
     "const next = node('button', 'primary-action', t(step === QUESTIONS.length - 1 ? 'survey.finish' : 'survey.next'));"],
    ["const skip = node('button', 'secondary-action full', 'I do not have this');",
     "const skip = node('button', 'secondary-action full', t('survey.dontHave'));"],
    ["const back = node('button', 'link-action', 'Back');",
     "const back = node('button', 'link-action', t('survey.back'));"],
    ["body.append(node('h3', 'survey-ask', 'That is all Oikonomia needs'));",
     "body.append(node('h3', 'survey-ask', t('survey.done')));"],
    ["row('Money coming in', formatPaise(profile.incomePaise || 0));",
     "row(t('plan.income'), formatPaise(profile.incomePaise || 0));"],
    ["row('Fixed commitments', formatPaise(known));",
     "row(t('survey.commitments'), formatPaise(known));"],
    ["row('Left to plan with', formatPaise(Math.max(0, (profile.incomePaise || 0) - known)));",
     "row(t('survey.leftToPlan'), formatPaise(Math.max(0, (profile.incomePaise || 0) - known)));"],
    ["const make = node('button', 'primary-action', 'Build my plan');",
     "const make = node('button', 'primary-action', t('survey.build'));"],
    ["const again = node('button', 'secondary-action full', 'Change my answers');",
     "const again = node('button', 'secondary-action full', t('survey.changeAnswers'));"],
    ['  void t;\n', '']
  ],

  'plan.js': [
    ["node('button', 'primary-action', 'Make my plan')", "node('button', 'primary-action', t('plan.makeMine'))"],
    ["redo.textContent = 'Tap again to rebuild it from your records';",
     "redo.textContent = t('plan.startOverSure');"],
    ["const redo = node('button', 'secondary-action full', 'Start the plan again');",
     "const redo = node('button', 'secondary-action full', t('plan.startAgain'));"],
    ["box.append(node('p', 'principle-source', 'A principle, not a rule about amounts. What you do with it is yours.'));",
     "box.append(node('p', 'principle-source', t('plan.principleNote')));"],
    ["node('span', 'plan-tag plan-guess', 'still a guess')",
     "node('span', 'plan-tag plan-guess', t('survey.stillGuess'))"],
    ["node('span', 'plan-tag', 'every month')", "node('span', 'plan-tag', t('plan.everyMonth'))"],
    ["ui.body.append(node('p', 'import-note', 'Tap any line to see why it is set there, and to change it.'));",
     "ui.body.append(node('p', 'import-note', t('plan.tapAny')));"],
    ["const apply = node('button', 'secondary-action', 'Change');",
     "const apply = node('button', 'secondary-action', t('plan.change'));"],
    ["consequence.textContent = 'Please enter an amount, like 5000.';",
     "consequence.textContent = t('add.needAmount');"],
    ["figureRow('Planned', formatPaise(budget.plannedPaise)),",
     "figureRow(t('plan.planned'), formatPaise(budget.plannedPaise)),"],
    ["figureRow('Spent so far', formatPaise(comparison.spentPaise)),",
     "figureRow(t('plan.spentSoFar'), formatPaise(comparison.spentPaise)),"],
    ["figureRow('Still to spend', formatPaise(comparison.remainingPaise))",
     "figureRow(t('plan.stillToSpend'), formatPaise(comparison.remainingPaise))"]
  ],

  'shell.js': [
    ["'Sign-in is not switched on yet, so Oikonomia is running on this device alone. ' +\n      'Everything works — it simply is not shared with anyone else yet.'",
     "t('house.deviceOnly')"],
    ["'Sign in to share this household with your family, so everyone sees the same plan.'",
     "t('house.signInFirst')"],
    ["const link = node('a', 'primary-action landing-action', 'Continue with Google');",
     "const link = node('a', 'primary-action landing-action', t('house.continueGoogle'));"],
    ["'Create a household, or join one that somebody has already made.'", "t('house.createOrJoin')"],
    ["nameField.append(node('span', 'field-label', 'What shall we call your household?'));",
     "nameField.append(node('span', 'field-label', t('house.nameAsk')));"],
    ["nameInput.placeholder = 'The Peris family';", "nameInput.placeholder = t('house.namePlaceholder');"],
    ["const create = node('button', 'primary-action', 'Create our household');",
     "const create = node('button', 'primary-action', t('house.create'));"],
    ["codeField.append(node('span', 'field-label', 'Or join with a code'));",
     "codeField.append(node('span', 'field-label', t('house.orJoin')));"],
    ["const join = node('button', 'secondary-action full', 'Join that household');",
     "const join = node('button', 'secondary-action full', t('house.join'));"],
    ["code.append(node('span', 'household-code-label', 'Your household code'));",
     "code.append(node('span', 'household-code-label', t('house.code')));"],
    ["code.append(node('span', 'household-code-note',\n    'Share this with your family so they can join. It says nothing about your money.'));",
     "code.append(node('span', 'household-code-note', t('house.codeNote')));"],
    ["member.role === 'HEAD' ? 'head of household'\n        : member.role === 'VIEW_ONLY' ? 'can look only' : 'can add and change'));",
     "member.role === 'HEAD' ? t('house.head')\n        : member.role === 'VIEW_ONLY' ? t('house.viewOnly') : t('house.member')));"]
  ],

  'app.js': [
    ["showToast('Could not save on this device');", "showToast(t('toast.cannotSave'));"],
    ["showToast('Those transactions are already recorded');", "showToast(t('toast.already'));"],
    ["      ? `${fresh.length} added, ${repeated} already recorded`\n      : `${fresh.length} transactions added`",
     "      ? t('toast.addedSome', { n: fresh.length, repeated })\n      : t('toast.added', { n: fresh.length })"],
    ["ui.paceLabel.textContent = 'recorded this month';", "ui.paceLabel.textContent = t('progress.recorded');"],
    ["ui.streakLabel.textContent = progress.streak === 1 ? 'day streak' : 'day streak';",
     "ui.streakLabel.textContent = t('progress.streak');"]
  ],

  'import.js': [
    ["title.textContent = 'One of these was a scan';", "title.textContent = t('st.wasScan');"],
    ["title.textContent = 'These figures add up';", "title.textContent = t('st.addsUp');"],
    ["title.textContent = 'Some rows did not add up';", "title.textContent = t('st.didNotAddUp');"],
    ["title.textContent = 'I could not check these';", "title.textContent = t('st.couldNotCheck');"]
  ],

  'progress.js': [
    ["? { kind: 'streak', text: `${streak} days in a row`, points: day.earned }\n        : { kind: 'day', text: 'Written down for today', points: day.earned });",
     "? { kind: 'streak', text: t('progress.streakDays', { n: streak }), points: day.earned }\n        : { kind: 'day', text: t('progress.day'), points: day.earned });"],
    ["          text: `You now know what ${line.id.toLowerCase()} really costs you`,",
     "          text: t('progress.discovery', { category: categoryName(line.id).toLowerCase() }),"]
  ]
};

/* Files that will now need the phrase book. */
const NEEDS_IMPORT = {
  'plan.js': null, // already imports t
  'shell.js': null,
  'app.js': null,
  'progress.js': "import { t, categoryName } from './i18n.js';",
  'import.js': "import { t } from './i18n.js';"
};

let replaced = 0;
const missed = [];

for (const [name, swaps] of Object.entries(WORK)) {
  const path = join(root, 'public', name);
  let source = readFileSync(path, 'utf8');

  for (const [from, to] of swaps) {
    if (source.includes(from)) { source = source.split(from).join(to); replaced++; }
    else missed.push(`${name}: ${from.trim().slice(0, 58)}`);
  }

  const needed = NEEDS_IMPORT[name];
  if (needed && !source.includes("from './i18n.js'")) {
    const firstImport = source.indexOf('import ');
    source = firstImport === -1
      ? `${needed}\n\n${source}`
      : source.slice(0, firstImport) + needed + '\n' + source.slice(firstImport);
  }

  writeFileSync(path, source, 'utf8');
}

console.log(`✓ ${replaced} phrases routed through the phrase book`);
if (missed.length > 0) {
  console.log('not found:');
  for (const line of missed) console.log('  ' + line);
}
