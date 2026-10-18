(() => {
  'use strict';
  type ModeLabel = 'Free Roam' | 'Story Path';
  type Outcome = 'successful-dom-plus-two-animation-frames' | 'overlapping-input' | 'invalid-trusted-event-time-origin' | 'timeout';
  interface PendingSample {
    section: Element;
    from: ModeLabel;
    to: ModeLabel;
    start: number;
    trusted: boolean;
    timeout?: ReturnType<typeof setTimeout>;
    domObservedAt?: number;
  }
  interface CompletedSample {
    from: ModeLabel;
    to: ModeLabel;
    outcome: Outcome;
    trusted: boolean;
    eventTimeStamp: number;
    timeOrigin: number;
    domObservedAt: number | null;
    completedAt: number;
    elapsedMs: number;
    visibility: DocumentVisibilityState;
    successfulAnnouncement: string | null;
    pressed: { label: string | null; pressed: string | null }[];
  }
  const sourceRevision = '8a94130206815cf8905e7a48402a6e82a7c70f37';
  const samples: CompletedSample[] = [];
  let pending: PendingSample | null = null;
  const output = document.createElement('output');
  output.id = 'story-qa-mode-timings';
  output.hidden = true;
  document.body.append(output);
  function publish(): void {
    if (!output.isConnected) document.body.append(output);
    output.textContent = JSON.stringify({
      sourceRevision,
      method: 'Trusted click event to successful mode DOM, followed by two animation frames. Animation-frame callbacks precede paint; no actual paint or physical-phone timing is asserted.',
      origin: location.origin,
      pending: pending ? { from: pending.from, to: pending.to } : null,
      samples,
    });
  }
  function finish(outcome: Outcome): void {
    const sample = pending;
    if (!sample) return;
    pending = null;
    clearTimeout(sample.timeout);
    const completedAt = performance.now();
    samples.push({
      from: sample.from, to: sample.to, outcome,
      trusted: sample.trusted,
      eventTimeStamp: sample.start,
      timeOrigin: performance.timeOrigin,
      domObservedAt: sample.domObservedAt ?? null,
      completedAt,
      elapsedMs: completedAt - sample.start,
      visibility: document.visibilityState,
      successfulAnnouncement: sample.section.querySelector('[role="status"]')?.textContent?.trim() ?? null,
      pressed: [...sample.section.querySelectorAll('.story-mode-options button')].map(button => ({
        label: button.querySelector('b')?.textContent?.trim() ?? null,
        pressed: button.getAttribute('aria-pressed'),
      })),
    });
    publish();
  }
  function observe(): void {
    if (!output.isConnected) publish();
    const sample = pending;
    if (!sample || sample.domObservedAt !== undefined) return;
    const buttons = [...sample.section.querySelectorAll('.story-mode-options button')];
    const target = buttons.find(button => button.querySelector('b')?.textContent?.trim() === sample.to);
    const previous = buttons.find(button => button.querySelector('b')?.textContent?.trim() === sample.from);
    const announcement = sample.section.querySelector('[role="status"]')?.textContent?.trim();
    if (target?.getAttribute('aria-pressed') !== 'true' || previous?.getAttribute('aria-pressed') !== 'false' || announcement !== `${sample.to} is on.`) return;
    sample.domObservedAt = performance.now();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (pending === sample) finish('successful-dom-plus-two-animation-frames');
    }));
  }
  const observer = new MutationObserver(observe);
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-pressed'] });
  document.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('.story-mode-options button') : null;
    if (!button || button.getAttribute('aria-pressed') === 'true') return;
    if (pending) { finish('overlapping-input'); return; }
    const section = button.closest('.story-mode');
    const to = button.querySelector('b')?.textContent?.trim();
    const from = section?.querySelector('.story-mode-options button[aria-pressed="true"] b')?.textContent?.trim();
    const isModeLabel = (value: string | undefined): value is ModeLabel => value === 'Free Roam' || value === 'Story Path';
    if (!section || !isModeLabel(to) || !isModeLabel(from) || to === from) return;
    const sample: PendingSample = { section, from, to, start: event.timeStamp, trusted: event.isTrusted };
    pending = sample;
    if (!event.isTrusted || !Number.isFinite(event.timeStamp) || event.timeStamp <= 0 || event.timeStamp > performance.now()) {
      finish('invalid-trusted-event-time-origin');
      return;
    }
    sample.timeout = setTimeout(() => finish('timeout'), 3000);
    publish();
  }, true);
  publish();
})();
