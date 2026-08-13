/* The stewardship framework.
 *
 * This is a written, reviewed body of content — not something a model recalls.
 * A model can only cite what is written here, which is what makes "never invent
 * a Bible verse" a property of the system rather than a hope.
 *
 * Every claim carries where it came from. A modern financial rule must never be
 * dressed up as a biblical command, so the two are kept apart by construction.
 *
 * Passages are quoted from the World English Bible, which is public domain.
 */

export const SOURCE = {
  BIBLICAL: 'Biblical principle',
  PRACTICE: 'Financial best practice',
  DATA: 'Your household data',
  INFERENCE: 'Oikonomia’s reading',
  PREFERENCE: 'Your own choice'
};

/* ---------- what money is for ---------- */

/* The ordering in 3.2 of the specification: provision, obligations, stability,
   debt, savings, goals, generosity, investing. Deliberately not rigid — a
   household with school fees due next week reorders it themselves. */
export const PRIORITIES = [
  { id: 'essentials',  name: 'Keeping the household running', rank: 1 },
  { id: 'obligations', name: 'Bills and commitments already made', rank: 2 },
  { id: 'debt',        name: 'Payments on what is owed', rank: 3 },
  { id: 'buffer',      name: 'A cushion for surprises', rank: 4 },
  { id: 'goals',       name: 'What the household is saving towards', rank: 5 },
  { id: 'giving',      name: 'Giving', rank: 6 },
  { id: 'flexible',    name: 'Everything else', rank: 7 },
  { id: 'investing',   name: 'Investing for the long term', rank: 8 }
];

/* ---------- categories ---------- */

/* `need` follows 3.6: Need, Useful, Desired, Luxury. It is deliberately not
   shown to anyone as a label. It decides what gets protected when money is
   short, and nothing else. */
export const CATEGORIES = [
  { id: 'Rent',                  priority: 'essentials',  need: 'need',    fixed: true },
  { id: 'Groceries',             priority: 'essentials',  need: 'need',    fixed: false },
  { id: 'Bills',                 priority: 'obligations', need: 'need',    fixed: true },
  { id: 'Health',                priority: 'essentials',  need: 'need',    fixed: false },
  { id: 'Education',             priority: 'essentials',  need: 'need',    fixed: true },
  { id: 'Transport',             priority: 'essentials',  need: 'useful',  fixed: false },
  { id: 'Insurance',             priority: 'obligations', need: 'useful',  fixed: true },
  { id: 'Loan payment',          priority: 'debt',        need: 'need',    fixed: true },
  { id: 'Giving',                priority: 'giving',      need: 'useful',  fixed: false },
  { id: 'Savings and investing', priority: 'goals',       need: 'useful',  fixed: false },
  { id: 'Eating out',            priority: 'flexible',    need: 'desired', fixed: false },
  { id: 'Shopping',              priority: 'flexible',    need: 'desired', fixed: false },
  { id: 'Subscriptions',         priority: 'flexible',    need: 'desired', fixed: false },
  { id: 'Cash withdrawn',        priority: 'flexible',    need: 'useful',  fixed: false },
  { id: 'Other',                 priority: 'flexible',    need: 'useful',  fixed: false },
  { id: 'Income',                priority: null,          need: null,      fixed: false }
];

const BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]));

export function categoryInfo(id) {
  return BY_ID.get(id) || BY_ID.get('Other');
}

export function isSpending(id) {
  return id !== 'Income' && id !== 'Savings and investing';
}

/** Categories protected first when money is short. */
export function isEssential(id) {
  const info = categoryInfo(id);
  return info.priority === 'essentials' || info.priority === 'obligations' || info.priority === 'debt';
}

/* ---------- principles ---------- */

/* Each principle names its passages and, separately, what modern financial
   practice says. The two are never merged. `applies` decides when a principle
   is worth raising, so guidance is occasional and fitting rather than constant. */
export const PRINCIPLES = [
  {
    id: 'ownership',
    key: 'pr.ownership',
    title: 'What we hold, we hold in trust',
    passages: [
      { ref: 'Psalm 24:1', text: 'The earth is Yahweh’s, with its fullness; the world, and those who dwell therein.' },
      { ref: '1 Chronicles 29:14' }
    ],
    principle: 'Everything ultimately belongs to God; we manage rather than own outright.',
    says: 'Money is something to handle faithfully, not a measure of who you are.',
    applies: () => false // Foundational. Stated in the app's own voice, not quoted at people.
  },
  {
    id: 'provision',
    key: 'pr.provision',
    title: 'Providing for your household comes first',
    passages: [
      { ref: '1 Timothy 5:8' },
      { ref: 'Proverbs 27:23', text: 'Know well the state of your flocks, and pay attention to your herds.' }
    ],
    principle: 'A household has real responsibilities to those in its care.',
    says: 'Food, a roof, power, medicine and getting to work are protected before anything else.',
    applies: (state) => state.essentialsAtRisk
  },
  {
    id: 'planning',
    key: 'pr.planning',
    title: 'Counting the cost before you begin',
    passages: [
      { ref: 'Proverbs 21:5', text: 'The plans of the diligent surely lead to profit; and everyone who is hasty surely rushes to poverty.' },
      { ref: 'Luke 14:28' }
    ],
    principle: 'Planning and steady diligence are commended; haste is not.',
    says: 'Knowing what is coming — school fees, an insurance premium, a festival — is most of the work.',
    applies: (state) => state.hasIrregularCosts
  },
  {
    id: 'debt',
    key: 'pr.debt',
    title: 'Debt narrows what you can choose',
    passages: [
      { ref: 'Proverbs 22:7', text: 'The rich rule over the poor. The borrower is servant to the lender.' },
      { ref: 'Romans 13:8' }
    ],
    principle: 'Debt is treated as a burden on freedom, not as a moral failing.',
    says: 'Not all debt is alike. A high-interest loan costs your household far more than a home loan does.',
    applies: (state) => state.hasDebt
  },
  {
    id: 'preparedness',
    key: 'pr.preparedness',
    title: 'Setting something aside before it is needed',
    passages: [
      { ref: 'Proverbs 6:6-8', text: 'Go to the ant, you sluggard. Consider her ways, and be wise; which having no chief, overseer, or ruler, provides her bread in the summer, and gathers her food in the harvest.' },
      { ref: 'Proverbs 21:20' },
      { ref: 'Genesis 41' }
    ],
    principle: 'Storing up in good seasons against lean ones is commended as wisdom.',
    says: 'A cushion of even a few thousand rupees changes what a broken phone or a fever means.',
    applies: (state) => state.bufferMonths < 3
  },
  {
    id: 'contentment',
    key: 'pr.contentment',
    title: 'Enough is a real place',
    passages: [
      { ref: 'Philippians 4:11', text: 'Not that I speak because of lack, for I have learned in whatever state I am, to be content in it.' },
      { ref: '1 Timothy 6:6' },
      { ref: 'Hebrews 13:5' }
    ],
    principle: 'Contentment is presented as something learned, not as something owed to you.',
    says: 'Spending tends to rise quietly with income. Noticing it is not the same as denying yourself.',
    applies: (state) => state.lifestyleRising
  },
  {
    id: 'generosity',
    key: 'pr.generosity',
    title: 'Giving belongs in the plan',
    passages: [
      { ref: 'Proverbs 11:25', text: 'The liberal soul shall be made fat. He who waters shall be watered also himself.' },
      { ref: '2 Corinthians 9:7' },
      { ref: 'Matthew 6:3' }
    ],
    principle: 'Giving is commended as willing and unforced. No fixed share is imposed here.',
    says: 'What you give, and to whom, is yours to decide. Oikonomia only makes room for it.',
    applies: (state) => state.givesRegularly
  },
  {
    id: 'work',
    key: 'pr.work',
    title: 'Budgeting is not only about spending less',
    passages: [
      { ref: 'Proverbs 14:23', text: 'In all hard work there is profit; but the talk of the lips leads only to poverty.' },
      { ref: 'Ephesians 4:28' }
    ],
    principle: 'Honest work and its fruit are treated as good.',
    says: 'When a budget will not balance however carefully it is cut, the constraint is income, not discipline.',
    applies: (state) => state.incomeTooLow
  }
];

/**
 * Which principles fit this household right now.
 *
 * At most two, so guidance stays occasional. A household is not preached at
 * every time it opens the app.
 */
export function principlesFor(state) {
  return PRINCIPLES.filter((principle) => {
    try { return principle.applies(state); } catch { return false; }
  }).slice(0, 2);
}

/* ---------- what must never be said ---------- */

/* 40 and 68 of the specification, in a form the code can check. */
export const NEVER = [
  'guarantee any investment return',
  'claim God approves or disapproves of a financial decision',
  'treat wealth as evidence of faithfulness, or hardship as evidence of weak faith',
  'shame a household for poverty or for debt',
  'present a modern financial rule as a biblical command',
  'quote a passage that is not in this file',
  'invent a transaction, an income or a debt',
  'require a fixed share of income to be given away'
];
