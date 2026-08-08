# Oikonomia — Build Plan

*Written for the product owner. Plain language, no jargon assumed.*
*Companion to the Master Product Specification. Where they disagree, we discuss.*

---

## 1. What we are building

A mobile-first web app that a household installs on their phone like any other app, but which needs
no app store. It helps a household understand where their money goes, plan a budget grounded in
biblical stewardship, record what they actually spend, and improve month after month.

Audience for now: the owner's household, friends, family, and anyone from his congregation who finds
it useful. India only. Rupees. Designed for low-end Android phones on mobile data.

---

## 2. How the pieces fit together

```
   Household's phones                Your Cloudflare account            Outside services
   ─────────────────                 ──────────────────────            ────────────────

   The app itself                    Web hosting (Pages)
   Reads bank statements     ──────► Scrambled data store (D1)
   Does all the maths                Scrambled file store (R2)
   Holds the household key           Message relay (Workers)  ───────► AI provider
   Works offline                                              ───────► Google sign-in / Drive
```

Three ideas do most of the work:

**a. The maths happens on the phone, not on the server.**
Every authoritative number — totals, averages, budget vs actual, debt payoff — is calculated by
ordinary arithmetic on the household's own device. This is the specification's most important rule
(§13, §54): the financial engine establishes the truth, and the AI only interprets a truth it did
not invent. Running it on the phone also keeps hosting free and fast.

**b. What we store on the server is scrambled.**
Data syncs so that every household member sees the same dashboard from their own phone. But what
actually sits in the database is encrypted. The key never reaches the server. The owner, running
the service, cannot read anyone's finances — not as a promise, but because the information isn't
there in readable form.

What the server *can* see, and we should say so plainly in the privacy notice: which households
exist, how many records each has, and when they were last updated. Not what any of them say.

**c. Bank statements are read on the phone.**
The PDF never has to leave the device. This makes password-protected statements simple and safe
(§11 — the password is typed, used, and forgotten, all on the phone), and it means the most
sensitive document in the whole system never travels anywhere.

---

## 3. The key, and not losing it

Each household has one key. It is created on the head's phone when the household is created.

Where copies live:
- On each member's device, after they join
- In the head's Google Drive, in a private area only this app can see
- Written down by the household, as a recovery phrase

When a new member joins, the head's phone hands over a sealed copy that only the new member's phone
can open. Nothing is tied permanently to the first device.

**The recovery phrase screen** must be deliberate, not a flash of text:
- Shown once, at household creation
- States plainly that it is the only way back if every device and the Google account are lost
- States that nobody can recover it for them — not the app's owner, not Google
- Tells them to write it on paper and keep it somewhere private; not in phone notes, not in a
  WhatsApp message to themselves, not in email
- Requires an explicit tick — *"I have written this down and stored it safely"* — before continuing
- Can be viewed again later from settings, behind a re-authentication

---

## 4. Reading bank statements

Starting with the five banks that cover the most people in India: **SBI, HDFC Bank, ICICI Bank,
Punjab National Bank, Bank of Baroda.** Then Axis and Kotak. Built as one small, self-contained
reader per bank, so adding the sixth, tenth or fortieth bank later is an addition, never a rewrite.

Two things matter more than the length of the bank list:

- **UPI entries.** Most Indian statement lines are now UPI strings rather than clean merchant names.
  Getting good at pulling a real merchant out of those strings will do more for accuracy than any
  additional bank.
- **Wallet apps.** Some of the people this is most meant to help may barely use a bank statement at
  all — they live in PhonePe, Google Pay or Paytm. Those exports should be a first-class import
  path, not an afterthought.

**Proving we read it correctly.** Every statement carries a running balance. After extracting the
transactions we re-add them and check they arrive at the closing balance the bank printed. If they
don't, we say so and ask for help rather than importing quietly wrong data. This is the single most
important safeguard in the whole import process.

Scanned or photographed statements (images, no real text) come later — first with on-device text
recognition, and if that proves too slow on cheap phones, by sending page images with account
numbers blanked out to an AI that can read them.

---

## 5. Where the AI is used, and where it is not

**Not used for:** any number that matters. No totals, no balances, no projections. Ever.

**Used for:** sorting unfamiliar transactions into categories, explaining what the numbers mean,
conversation, coaching, and connecting a household's situation to stewardship principles.

Categorisation is deliberately cheap: a built-in dictionary of common Indian merchants handles most
transactions for free, the household's own past corrections handle most of the rest, and the AI is
asked only about genuine unknowns. A household's first import might involve a few thousand
transactions; we should be paying for AI on a small fraction of them.

Requests go through your Cloudflare account so the AI provider's key is never exposed, and only
summaries are sent — *"food ₹18,420 in June"*, not a list of shops. This is the one point where
information passes through your server in readable form. It is aggregate, and it is not stored.

### Which model sees what

Free models are generally free because the provider may keep and learn from what is sent to them. So
we sort every AI task by how identifying its input is, which is exactly the `sensitivity` field the
specification already imagines in §58:

| Sensitivity | What is actually sent | Model |
|---|---|---|
| None | A merchant name on its own — `SWIGGY`, `APOLLO PHARMACY`. No amount, no date, no household. | Free |
| High | Anything carrying household context: budgets, analysis, coaching, the household's own figures. | Paid, no-logging |

Most of the *volume* is categorisation, which sits in the first row and costs nothing. The
second row is low-volume, so the bill stays small. Account numbers, names and addresses are stripped
before any request, whichever row it falls in.

Stripping identifiers is necessary but not sufficient, and we should be clear-eyed about why:
`APOLLO PHARMACY ₹4,200` every month, alongside a rent figure and a salary figure, is still a
portrait of a family even with the name removed. That is the reasoning behind the second row.

Encrypting data before sending it to an AI is not an option — a model has to read the actual words
to reason about them.

**On the household-supplied API key (§38):** required, by the owner's decision — the AI is the
backbone of the product and this is a one-time setup. The obligation that follows is that the setup
must be genuinely guided: numbered steps, one screen at a time, a direct link to the right page, and
a reassuring tone. If this step loses people, the product loses them at the very first door.

---

## 6. The biblical layer

Built as a written, reviewed body of content — principles, passages, and the circumstances in which
each applies — not something the AI recalls from memory. This is what makes the guardrail against
invented verses (§40, guardrail 7) structural rather than hopeful: the AI can only cite from what we
have actually written down.

Bible text will use a public-domain translation (World English Bible), since most modern
translations are copyrighted.

Every recommendation carries its source internally (§41): biblical principle, financial best
practice, household data, AI inference, or the household's own preference. The app must never let a
modern financial rule wear biblical clothing.

---

## 7. Build order

Each stage produces something real you can hold and react to.

**Stage 1 — Something to look at.** *(days)*
The app shell, live on the web, installable on your phone. Dashboard, add-expense screen, month
view. Data stays on the one device — this is a prototype for judging the feel, not for real use yet.
The point is that you react to the design before we build machinery underneath it.

**Stage 2 — Real, shared, private.**
Google sign-in. Create or join a household, with a human-readable ID (§5). Roles. The encryption
key, the recovery phrase, and encrypted sync. At the end of this stage you and your wife can both
add expenses from your own phones and see the same numbers, and nobody else can read them.

**Stage 3 — Understanding the household.**
Statement import for the five banks. The verification screen — *"here's what I understood, please
correct me"* (§17) — which is the heart of the product. Then the first tentative budget, and editing
it in plain language.

**Stage 4 — The living budget.**
Month-end statement upload, matching manual entries against bank entries, confirming possible
duplicates without ever deleting anything silently (§24, §25), budget-vs-actual, and the monthly
review.

**Stage 5 — The coach.** Conversation, household memory, personalised guidance.

**Stage 6 — The document vault.** Google Drive, holding the household's own statements and exports.

**Stage 7 onward —** debt strategies, goals, stewardship points, investing education.

Stages 1 to 4 are the product. Everything after that is enrichment that doesn't work without them.

---

## 8. What you'll need to set up, and when

| When | What | Effort |
|---|---|---|
| Done | GitHub, Node.js, GitHub connection | Complete |
| Stage 1 | Connect the repository to Cloudflare | ~5 clicks, I'll guide you |
| Stage 2 | A Google Cloud project for sign-in | Fiddly. I'll walk you through it screen by screen |
| Stage 5 | An AI provider account and payment method | ~10 minutes |

---

## 9. What it will cost

Cloudflare hosting, database and file storage: **free** at this scale, and the on-device design is
what keeps it there. Google sign-in and Drive: free. The only real cost is AI, which starts at
Stage 5 and should be a few hundred rupees a month across a handful of households — call it under
₹50 per household per month, less once each household's own corrections take over the work.

---

## 10. Deliberately not doing yet

Scanned statement reading, banks beyond the first five, any currency but rupees, notifications,
investment guidance, and the whole gamification layer. Each is a real part of the vision; none of
them matter if the understand-plan-record-review loop isn't right first.

---

## 11. Decisions taken

**Household head sees everything.** No per-member privacy from the head for now. Simplest starting
point, and the owner expects to revisit it once households are actually using the app.

**Head succession is deferred.** What happens when a head leaves or dies is a real gap, and it
matters most at Stage 6, when the head's Google Drive starts holding the household key. To be
answered before then, not now.

**Signing up mid-month.** Whatever the household has given us is used to build a budget for the
*coming* month. The remainder of the current month is observed and recorded but not judged against a
plan — no household should be shown a budget it was never given the chance to follow.
