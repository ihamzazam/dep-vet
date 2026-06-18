// Pendo (Novus) client init.
//
// IMPORTANT: this runs during client bootstrap, before the Pendo agent stub is
// guaranteed to exist. A bare `pendo.initialize(...)` throws "pendo is not
// defined", which aborts React hydration and makes the WHOLE app non-clickable.
// So we reference it safely and retry until the agent has loaded, then init once.
// (Novus owns this file — if it regenerates an unguarded version, re-apply this.)
type Pendo = { initialize?: (opts: unknown) => void };

let tries = 0;
function initPendo(): void {
  const p = (globalThis as { pendo?: Pendo }).pendo;
  if (p && typeof p.initialize === "function") {
    p.initialize({ visitor: { id: "" } });
    return;
  }
  if (tries++ < 50) setTimeout(initPendo, 100);
}

initPendo();
