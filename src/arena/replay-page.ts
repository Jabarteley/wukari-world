/**
 * OWNER: games (real-time)
 * The replay page's entry (replay.html). It only fetches the page itself (./replay-app.ts), with a dynamic import on purpose: a
 * second build entry that imported the game's rules statically would change the order of the modules in the startup engine chunk
 * the game's own page loads, and that order is what its compressed size depends on (src/budgets.ts).
 */
void import('./replay-app.ts').then((page) => page.start())
