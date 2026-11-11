function bindHeroWorkspace(root) {
  const pick = key => root.querySelector(`[data-hw="${key}"]`);
  const pickAll = key => [...root.querySelectorAll(`[data-hw="${key}"]`)];
  const el = {
    frame: root.querySelector('.hero-workspace-frame'),
    screen: root.querySelector('.hw-screen'),
    main: root.querySelector('.hw-main'),
    cursor: pick('cursor'),
    encounter: pick('encounter'),
    home: pick('home'),
    doc: pick('doc'),
    composer: pick('composer'),
    placeholder: pick('placeholder'),
    typed: pick('typed'),
    send: pick('send'),
    quick: pick('quick'),
    working: pick('working'),
    draft: pick('draft'),
    draftLines: pickAll('draft-line'),
    referral: pick('referral'),
    referralLines: pickAll('referral-line'),
    docBody: pick('doc-body'),
    docLines: pickAll('doc-line'),
    review: pick('review'),
    checks: pickAll('check'),
    status: pick('status'),
    statusSelect: pick('status-select')
  };
  const tabs = { ask: pick('tab-ask'), document: pick('tab-document'), plan: pick('tab-plan'), communicate: pick('tab-communicate') };
  const headlines = { ask: pick('headline-ask'), document: pick('headline-document'), plan: pick('headline-plan') };
  const chips = { ask: pick('chips-ask'), document: pick('chips-document'), plan: pick('chips-plan') };
  const chip = { ddx: pick('chip-ddx'), soap: pick('chip-soap'), referral: pick('chip-referral') };
  const docTabs = { document: pick('doctab-document'), review: pick('doctab-review') };
  const copy = {
    typedCase: el.typed.textContent,
    typedReferral: el.composer.dataset.referralText
  };

  return { el, tabs, headlines, chips, chip, docTabs, copy };
}
