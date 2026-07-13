(() => {
  'use strict';

  const MIN_FONT_SIZE = 14;
  const MAX_FONT_SIZE = 20;
  let currentFontSize = 16;

  function updateFontSize(nextSize) {
    currentFontSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, nextSize));
    document.documentElement.style.setProperty('--base-font-size', `${currentFontSize}px`);
  }

  function togglePanel(button) {
    const panelId = button.getAttribute('aria-controls');
    const panel = document.getElementById(panelId);
    if (!panel) return;

    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    button.setAttribute('aria-expanded', String(willOpen));

    if (willOpen) {
      panel.querySelector('button')?.focus();
    }
  }

  function toggleContrast(button) {
    const isActive = document.body.classList.toggle('high-contrast');
    button.setAttribute('aria-pressed', String(isActive));
    button.textContent = isActive ? 'Desativar alto contraste' : 'Alto contraste';
  }

  function initializeAccessibility() {
    document.querySelectorAll('.accessibility-toggle').forEach((button) => {
      button.addEventListener('click', () => togglePanel(button));
    });

    document.querySelectorAll('[data-font-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const direction = button.dataset.fontAction === 'increase' ? 1 : -1;
        updateFontSize(currentFontSize + direction);
      });
    });

    document.querySelectorAll('[data-contrast-action]').forEach((button) => {
      button.addEventListener('click', () => toggleContrast(button));
    });
  }

  document.addEventListener('DOMContentLoaded', initializeAccessibility);
})();
