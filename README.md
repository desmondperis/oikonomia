# Oikonomia

*οἰκονομία — household management, administration, stewardship.*

An AI-assisted household budgeting and financial stewardship app, built for households in India.

> Money is a resource entrusted to us; the goal is faithful stewardship, not the accumulation of
> wealth for its own sake.

## What it does

Helps a household understand where its money actually goes, plan a budget grounded in biblical
stewardship principles, record what it really spends, and improve month after month.

It is not a wealth-maximisation tool, and it is not a lecture. It aims to be a wise steward sitting
beside the household — calm, practical, and never judgmental about poverty or debt.

## How it is built

Three principles shape the architecture:

**The financial engine establishes the truth; the AI only interprets it.** Every authoritative
number — totals, balances, budget-vs-actual, debt projections — is calculated by ordinary
arithmetic on the household's own device. The AI is never asked to do sums.

**The household's data is encrypted with a key the server never sees.** Data syncs so every member
of a household sees the same dashboard from their own phone, but what sits in the database is
unreadable to whoever operates the service.

**Bank statements are read on the phone.** The PDF never has to leave the device, and passwords for
protected statements are used and forgotten locally.

Runs as an installable mobile web app (PWA) on Cloudflare Pages, Workers, D1 and R2.

## Status

Early development. See [PLAN.md](PLAN.md) for the architecture and build order.

## License

MIT
