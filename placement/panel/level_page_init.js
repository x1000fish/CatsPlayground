(function loadGameClickSfx() {
  if (window.__meowtopiaClickSfxReady || window.__meowtopiaClickSfxLoading) {
    return;
  }

  window.__meowtopiaClickSfxLoading = true;
  const script = document.createElement('script');
  script.src = './panel/game_click_sfx.js';
  script.defer = true;
  document.head.appendChild(script);
})();

(function loadBackgroundMusic() {
  if (window.__meowtopiaBackgroundMusicReady || window.__meowtopiaBackgroundMusicLoading) {
    return;
  }

  window.__meowtopiaBackgroundMusicLoading = true;
  const script = document.createElement('script');
  script.src = './panel/background_music.js';
  script.defer = true;
  document.head.appendChild(script);
})();

(function loadMeowtopiaAccount() {
  if (window.MeowtopiaAccount || window.__meowtopiaAccountLoading) {
    return;
  }

  window.__meowtopiaAccountLoading = true;
  const script = document.createElement('script');
  script.src = './panel/meowtopia_account.js';
  script.defer = true;
  document.head.appendChild(script);
})();

document.addEventListener('DOMContentLoaded', function () {
  const solution = document.body.dataset.solution;
  const solutionSelect = document.getElementById('solution');

  if (solutionSelect && solution) {
    solutionSelect.value = solution;
    solutionSelect.dispatchEvent(new Event('change'));
  }
});
