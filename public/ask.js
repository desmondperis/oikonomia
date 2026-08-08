/* Asking Oikonomia a question.
 *
 * Every figure in every answer is worked out here, from the household's own
 * records. The assistant is used only to put those figures into a sentence, and
 * it is given the sentence's facts rather than trusted to find them. So an
 * answer can be badly worded, but it cannot be wrong about the money.
 *
 * Without a key, the answers are still complete — plainer, but true.
 */

import { formatPaise } from './money.js';
import { typicalMonth, thisMonth, trend, financialState, monthName } from './engine.js';
import { compare } from './budget.js';
import { loadBudget } from './plan.js';
import { hasKey, getKey, chooseModel } from './ai.js';
import { principlesFor, CATEGORIES } from './framework.js';

const el = (id) => document.getElementById(id);

let getEntries = () => [];

const SUGGESTIONS = [
  'How are we doing this month?',
  'Where is our money going?',
  'What can I still spend?',
  'Can we afford ₹5,000 this week?'
];

/* ---------- working out the answer ---------- */

/** The facts an answer may be built from. Nothing else is available to it. */
function factsFor(entries, now = Date.now()) {
  const typical = typicalMonth(entries, now);
  const month = thisMonth(entries, now);
  const budget = loadBudget();
  const comparison = budget ? compare(budget, entries, now) : null;

  const biggest = [...month.byCategory.entries()]
    .filter(([id]) => id !== 'Income')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return { typical, month, budget, comparison, biggest, state: financialState(entries, now) };
}

function answerLocally(question, facts) {
  const text = String(question).toLowerCase();
  const { typical, month, comparison, biggest } = facts;

  if (typical.monthsUsed === 0 && month.spending === 0) {
    return 'There is nothing recorded yet, so there is nothing I can tell you honestly. ' +
      'Add a few expenses or upload a bank statement, and ask me again.';
  }

  // What is left
  if (/left|remain|still spend|can i spend|afford/.test(text)) {
    if (!comparison) {
      return `You have spent ${formatPaise(month.spending)} so far this month. ` +
        'Once you make a plan, I can tell you what is left rather than only what has gone.';
    }
    const left = comparison.remainingPaise;
    if (left < 0) {
      return `You are ${formatPaise(-left)} past your plan for this month, with ` +
        `${comparison.daysLeft} days still to go.`;
    }
    return `${formatPaise(left)} left of your plan, with ${comparison.daysLeft} days to go. ` +
      (comparison.projectedPaise > comparison.plannedPaise
        ? 'At the pace you are going, it will be tight.'
        : 'That is comfortable at the pace you are going.');
  }

  // Where it goes
  if (/where|going|spent on|biggest/.test(text)) {
    if (biggest.length === 0) return 'Nothing has been recorded this month yet.';
    const parts = biggest.map(([id, amount]) => `${id.toLowerCase()} ${formatPaise(amount)}`);
    return `This month so far: ${parts.join(', ')}. ` +
      `That is ${formatPaise(month.spending)} altogether.`;
  }

  // A category by name
  const named = CATEGORIES.find((category) => text.includes(category.id.toLowerCase()));
  if (named) {
    const spent = month.byCategory.get(named.id) || 0;
    const usual = typical.byCategory.get(named.id) || 0;
    const direction = trend(getEntries(), named.id);

    let answer = `${named.id}: ${formatPaise(spent)} this month`;
    if (usual > 0) answer += `, against ${formatPaise(usual)} in a usual month`;
    answer += '.';
    if (direction.direction === 'rising') {
      answer += ` It has gone up ${direction.run} months running.`;
    }
    return answer;
  }

  // How are we doing
  if (/how are we|how am i|doing|going/.test(text)) {
    const bits = [];
    if (typical.income > 0) bits.push(`about ${formatPaise(typical.income)} comes in`);
    bits.push(`${formatPaise(typical.essential)} goes on things you must pay`);
    if (typical.surplus >= 0) bits.push(`leaving roughly ${formatPaise(typical.surplus)} over`);
    else bits.push(`which is ${formatPaise(-typical.surplus)} more than comes in`);

    let answer = `In a usual month ${bits.join(', ')}.`;
    if (comparison) {
      answer += ` This month you have spent ${formatPaise(comparison.spentPaise)} of ` +
        `${formatPaise(comparison.plannedPaise)} planned.`;
    }
    return answer;
  }

  // Anything else: say what is known rather than guess.
  return `This month you have spent ${formatPaise(month.spending)}` +
    (comparison ? ` of ${formatPaise(comparison.plannedPaise)} planned` : '') +
    `. In a usual month your household spends about ${formatPaise(typical.spending)}. ` +
    'Ask me about a particular category, what is left, or where the money is going.';
}

/* ---------- letting the assistant put it in words ---------- */

/**
 * The assistant is handed the finished answer and asked only to say it more
 * naturally. It is told explicitly that the figures are settled, because a
 * model given numbers will otherwise try to do arithmetic with them.
 */
async function rephrase(question, answer) {
  const key = getKey();
  if (!key) return answer;

  try {
    const model = await chooseModel();

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': location.origin,
        'X-Title': 'Oikonomia'
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content:
              'You rewrite a financial answer so it sounds like a calm, kind friend speaking. ' +
              'Rules you must never break: keep every figure exactly as given; never add a ' +
              'figure that is not there; never calculate anything; never advise on ' +
              'investments; never shame anyone for debt or for having little. ' +
              'Two or three short sentences. Plain words, no financial jargon.'
          },
          { role: 'user', content: `Question: ${question}\n\nThe answer, with settled figures: ${answer}` }
        ]
      })
    });

    if (!response.ok) return answer;

    const body = await response.json();
    const said = body?.choices?.[0]?.message?.content?.trim();
    if (!said) return answer;

    // If the model has introduced a rupee figure that was not in our answer,
    // its version is discarded. A nicer sentence is not worth a wrong number.
    const ours = new Set((answer.match(/₹[\d,]+(\.\d+)?/g) || []));
    const theirs = (said.match(/₹[\d,]+(\.\d+)?/g) || []);
    if (theirs.some((figure) => !ours.has(figure))) return answer;

    return said;
  } catch {
    return answer;
  }
}

/* ---------- the screen ---------- */

function bubble(text, who) {
  const box = document.createElement('div');
  box.className = `bubble bubble-${who}`;
  box.textContent = text;
  return box;
}

function scrollDown() {
  const thread = el('ask-thread');
  thread.scrollTop = thread.scrollHeight;
}

async function ask(question) {
  const thread = el('ask-thread');
  thread.append(bubble(question, 'you'));
  scrollDown();

  const thinking = bubble('…', 'oik');
  thread.append(thinking);
  scrollDown();

  const facts = factsFor(getEntries());
  const plain = answerLocally(question, facts);
  const said = await rephrase(question, plain);

  thinking.textContent = said;

  // A principle, occasionally, where one genuinely fits.
  const [principle] = principlesFor(facts.state);
  if (principle && Math.random() < 0.4) {
    const note = document.createElement('div');
    note.className = 'bubble bubble-oik bubble-quiet';
    note.textContent = principle.says;
    thread.append(note);
  }

  scrollDown();
}

export function renderAsk() {
  const suggestions = el('ask-suggestions');
  if (!suggestions || suggestions.childElementCount > 0) return;

  for (const text of SUGGESTIONS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = text;
    chip.addEventListener('click', () => ask(text));
    suggestions.append(chip);
  }

  const thread = el('ask-thread');
  if (thread.childElementCount === 0) {
    thread.append(bubble(
      'Ask me anything about your household’s money. I answer from your own ' +
      'records — I never guess at a number.',
      'oik'
    ));
  }
}

export function setUpAsk({ entries }) {
  getEntries = entries;

  el('ask-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = el('ask-input');
    const question = input.value.trim();
    if (!question) return;
    input.value = '';
    ask(question);
  });
}
