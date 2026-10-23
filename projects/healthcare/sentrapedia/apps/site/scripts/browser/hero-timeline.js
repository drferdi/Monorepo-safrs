function buildHeroTimeline({ gsap, el, tabs, headlines, chips, chip, docTabs, copy, mark, setPlaceholder }) {
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
    const at = (time, fn) => tl.call(fn, null, time);

    /* Pointer: positions resolve when each tween starts, so a resize only needs tl.invalidate(). */
    const point = (node, ax, ay) => () => {
      const screen = el.screen.getBoundingClientRect();
      const box = node.getBoundingClientRect();
      return { x: box.left - screen.left + box.width * ax, y: box.top - screen.top + box.height * ay };
    };
    const move = (time, node, duration = .6, ax = .5, ay = .55) => {
      const target = point(node, ax, ay);
      tl.to(el.cursor, { x: () => target().x, y: () => target().y, duration, ease: 'power2.inOut' }, time);
    };
    const park = (time, node, ax = .5, ay = .55) => {
      const target = point(node, ax, ay);
      tl.set(el.cursor, { x: () => target().x, y: () => target().y }, time);
    };
    const click = time => tl.fromTo(el.cursor, { scale: .8 }, { scale: 1, duration: .35, ease: 'back.out(3)' }, time);
    const pointer = (time, visible) => tl.to(el.cursor, { autoAlpha: visible ? 1 : 0, duration: .3 }, time);

    const press = (time, node) => at(time, () => node.classList.add('is-pressed'));
    const placeholder = (time, text) => {
      tl.to(el.placeholder, { autoAlpha: 0, duration: .18 }, time);
      at(time + .18, () => setPlaceholder(text));
      tl.to(el.placeholder, { autoAlpha: 1, duration: .25 }, time + .2);
    };
    const type = (time, text, duration) => {
      const proxy = { n: 0 };
      at(time, () => { el.composer.classList.add('is-typing'); el.typed.textContent = ''; });
      tl.to(el.placeholder, { autoAlpha: 0, duration: .15 }, time);
      tl.to(proxy, {
        n: text.length,
        duration,
        ease: 'none',
        onUpdate: () => { el.typed.textContent = text.slice(0, Math.round(proxy.n)); }
      }, time + .2);
    };
    const send = time => {
      at(time, () => el.composer.classList.remove('is-typing'));
      click(time);
      tl.fromTo(el.send, { scale: .84 }, { scale: 1, duration: .45, ease: 'back.out(2)' }, time);
    };
    const headline = (time, key) => {
      tl.to(Object.values(headlines).filter(node => node !== headlines[key]), { autoAlpha: 0, duration: .25 }, time);
      tl.fromTo(headlines[key], { autoAlpha: 0, y: 5 }, { autoAlpha: 1, y: 0, duration: .4 }, time + .15);
    };
    const reveal = (time, nodes, stagger) => tl.to(nodes, { autoAlpha: 1, y: 0, duration: .45, stagger }, time);
    const draft = (time, card, lines) => {
      tl.to(el.quick, { autoAlpha: 0, duration: .3 }, time);
      tl.to(el.working, { autoAlpha: 1, duration: .3 }, time + .2);
      tl.to(el.working, { autoAlpha: 0, duration: .25 }, time + 1.2);
      tl.fromTo(card, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .5 }, time + 1.4);
      reveal(time + 1.6, lines, .22);
    };

    /* Scene 1 — Analisis: the physician opens an encounter and sends a synthetic case to Diagnosis Banding (DDx). */
    tl.addLabel('mulai', 0);
    at(.01, () => {
      mark(tabs, 'ask', 'is-active');
      mark(chips, 'ask', 'is-current');
      mark(docTabs, 'document', 'is-active');
      el.encounter.classList.remove('is-active');
      el.composer.classList.remove('is-typing');
      el.typed.textContent = '';
      setPlaceholder(tabs.ask.dataset.placeholder);
      for (const node of Object.values(chip)) node.classList.remove('is-pressed');
      for (const node of el.checks) node.classList.remove('is-checked');
      el.status.textContent = 'Draf';
      el.statusSelect.classList.remove('is-updated');
    });
    tl.set([el.placeholder, el.typed, el.quick, el.home, el.docBody, headlines.ask], { autoAlpha: 1 }, .01);
    tl.set([el.draft, el.referral, el.working, el.doc, el.review, headlines.document, headlines.plan, el.cursor], { autoAlpha: 0 }, .01);
    tl.set([...el.draftLines, ...el.referralLines, ...el.docLines], { autoAlpha: 0, y: 6 }, .01);
    tl.set(el.cursor, { scale: 1 }, .01);
    park(.01, el.composer, .7, 1.4);
    tl.fromTo(el.main, { autoAlpha: 0 }, { autoAlpha: 1, duration: .5 }, .02);
    pointer(.6, true);
    move(.7, el.encounter, .6, .45, .5);
    click(1.35);
    at(1.4, () => el.encounter.classList.add('is-active'));
    move(1.7, chip.ddx, .6);
    click(2.35);
    press(2.4, chip.ddx);
    placeholder(2.4, chip.ddx.dataset.placeholder);
    move(2.7, el.composer, .5, .3, .35);
    click(3.25);
    type(3.3, copy.typedCase, 3.2);
    move(6.7, el.send, .5);
    send(7.3);
    draft(7.5, el.draft, el.draftLines);
    move(8.2, el.composer, .5, .92, 1.35);
    pointer(8.9, false);

    /* Scene 2 — Dokumentasi: the same encounter becomes a Catatan Klinis (SOAP) draft. */
    tl.addLabel('dokumentasi', 12.4);
    park(12.4, el.composer, .5, 1.3);
    pointer(12.4, true);
    move(12.5, tabs.document, .6);
    click(13.15);
    at(13.2, () => mark(tabs, 'document', 'is-active'));
    headline(13.2, 'document');
    tl.to([el.draft, el.typed], { autoAlpha: 0, duration: .3 }, 13.2);
    at(13.55, () => { el.typed.textContent = ''; mark(chips, 'document', 'is-current'); });
    tl.set(el.typed, { autoAlpha: 1 }, 13.6);
    placeholder(13.5, tabs.document.dataset.placeholder);
    tl.to(el.quick, { autoAlpha: 1, duration: .35 }, 13.6);
    move(14.2, chip.soap, .6);
    click(14.85);
    press(14.9, chip.soap);
    placeholder(14.9, chip.soap.dataset.placeholder);
    pointer(15.5, false);
    tl.to(el.home, { autoAlpha: 0, duration: .35 }, 15.7);
    tl.fromTo(el.doc, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: .45 }, 15.9);
    reveal(16.2, el.docLines, .3);

    /* Scene 3 — Peninjauan: the physician works through the review checklist before the status moves. */
    tl.addLabel('peninjauan', 19.2);
    park(19.2, el.docBody, .6, .6);
    pointer(19.2, true);
    move(19.3, docTabs.review, .6);
    click(19.95);
    at(20, () => mark(docTabs, 'review', 'is-active'));
    tl.to(el.docBody, { autoAlpha: 0, duration: .3 }, 20);
    tl.fromTo(el.review, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: .4 }, 20.2);
    el.checks.forEach((node, index) => {
      const time = 21 + index * .75;
      move(time - .45, node, .4, .06, .5);
      click(time);
      at(time + .05, () => node.classList.add('is-checked'));
    });
    move(24.1, el.statusSelect, .5);
    click(24.65);
    at(24.7, () => { el.status.textContent = 'Ditinjau'; el.statusSelect.classList.add('is-updated'); });
    at(25.7, () => el.statusSelect.classList.remove('is-updated'));
    pointer(25.6, false);

    /* Scene 4 — Rencana: a referral letter is drafted from the physician's own reason. */
    tl.addLabel('rencana', 26.4);
    tl.to(el.doc, { autoAlpha: 0, duration: .35 }, 26.4);
    at(26.6, () => {
      mark(tabs, 'plan', 'is-active');
      mark(chips, 'plan', 'is-current');
      mark(docTabs, 'document', 'is-active');
      for (const node of Object.values(chip)) node.classList.remove('is-pressed');
      el.typed.textContent = '';
      setPlaceholder(tabs.plan.dataset.placeholder);
    });
    tl.set([headlines.ask, headlines.document, el.draft, el.review], { autoAlpha: 0 }, 26.65);
    tl.set([headlines.plan, el.placeholder, el.typed, el.quick, el.docBody], { autoAlpha: 1 }, 26.65);
    park(26.65, tabs.plan, .5, .55);
    tl.fromTo(el.home, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: .45 }, 26.7);
    pointer(26.8, true);
    click(27.1);
    move(27.5, chip.referral, .6);
    click(28.15);
    press(28.2, chip.referral);
    placeholder(28.2, chip.referral.dataset.placeholder);
    move(28.5, el.composer, .5, .3, .35);
    click(29.05);
    type(29.1, copy.typedReferral, 2.6);
    move(31.9, el.send, .5);
    send(32.5);
    draft(32.7, el.referral, el.referralLines);
    move(33.4, el.composer, .5, .92, 1.35);
    pointer(34.1, false);
    tl.to(el.main, { autoAlpha: 0, duration: .6 }, 37.6);
    tl.addLabel('selesai', 38.3);
    return tl;
}
