// Wiring only. Visibility thresholds, manual pause and autoplay policy belong to each caller.
function listenForPlaybackChanges(preference, sync) {
  document.addEventListener('visibilitychange', sync);
  preference.addEventListener('change', sync);
}
