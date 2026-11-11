function createCapabilityViewport(root, viewport, items, getSelected, settled) {
  const offsets = () => items.map(item => item.offsetLeft - items[0].offsetLeft);
  function fitNativeViewport() {
    const height = capabilityViewportHeight(root.dataset.layout, items[Math.max(0, getSelected())].getBoundingClientRect().height, viewport.offsetHeight - viewport.clientHeight);
    const previousHeight = viewport.style.height;
    if (height === null) viewport.style.removeProperty('height');
    else viewport.style.height = height + 'px';
    if (viewport.style.height !== previousHeight) settled.queue();
  }

  function nearest(position) {
    let winner = 0;
    let distance = Infinity;
    offsets().forEach((offset, index) => {
      const delta = Math.abs(position - offset);
      if (delta < distance) { winner = index; distance = delta; }
    });
    return winner;
  }

  return { fitNativeViewport, offsets, nearest };
}
