/* File-protocol friendly: intentionally no imports, fetches, or dependencies. */
(function () {
  'use strict';
  const deck = document.querySelector('[data-deck]');
  if (!deck) return;
  const slides = Array.from(deck.querySelectorAll('.slide'));
  const frame = document.querySelector('.stage-frame');
  const viewport = document.querySelector('.stage-viewport');
  const previous = document.querySelector('[data-previous]');
  const next = document.querySelector('[data-next]');
  const tabs = document.querySelector('[data-progress-tabs]');
  const status = document.querySelector('[data-slide-status]');
  const dialog = document.querySelector('[data-help-dialog]');
  const fullscreenButton = document.querySelector('[data-fullscreen]');
  let current = 0;
  let touchStart = null;

  function fit() {
    const scale = Math.min(viewport.clientWidth / 1600, viewport.clientHeight / 900);
    if (!(scale > 0)) return;
    frame.style.width = (1600 * scale) + 'px';
    frame.style.height = (900 * scale) + 'px';
    deck.style.transform = 'scale(' + scale + ')';
  }

  slides.forEach(function (slide, index) {
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', '幻灯片');
    slide.setAttribute('aria-label', (index + 1) + ' / ' + slides.length + '：' + (slide.dataset.title || ''));
    const footerPage = slide.querySelector('.footer-page');
    if (footerPage) {
      const number = footerPage.querySelector('strong');
      if (number) number.textContent = String(index + 1).padStart(2, '0');
      if (footerPage.lastElementChild && footerPage.lastElementChild !== number) {
        footerPage.lastElementChild.textContent = '/ ' + String(slides.length).padStart(2, '0');
      }
    }
    if (!tabs) return;
    const tab = document.createElement('button');
    tab.className = 'progress-tab';
    tab.type = 'button';
    tab.title = (index + 1) + '. ' + slide.dataset.title;
    tab.setAttribute('aria-label', '跳转到第 ' + (index + 1) + ' 页：' + slide.dataset.title);
    tab.addEventListener('click', function () { show(index); });
    tabs.appendChild(tab);
  });

  function indexFromHash() {
    const match = window.location.hash.match(/^#slide-(\d+)$/);
    return match ? Math.max(0, Math.min(slides.length - 1, Number(match[1]) - 1)) : 0;
  }

  function show(index, updateHash) {
    current = Math.max(0, Math.min(slides.length - 1, index));
    slides.forEach(function (slide, i) {
      slide.hidden = i !== current;
      slide.classList.toggle('is-active', i === current);
      if (tabs && tabs.children[i]) {
        if (i === current) tabs.children[i].setAttribute('aria-current', 'step');
        else tabs.children[i].removeAttribute('aria-current');
      }
    });
    document.dispatchEvent(new CustomEvent('presentation:slidechange', { detail: { index: current, slide: slides[current] } }));
    if (previous) previous.disabled = current === 0;
    if (next) next.disabled = current === slides.length - 1;
    document.querySelectorAll('[data-current-page]').forEach(function (element) { element.textContent = String(current + 1).padStart(2, '0'); });
    document.querySelectorAll('[data-total-pages]').forEach(function (element) { element.textContent = String(slides.length).padStart(2, '0'); });
    if (status) status.textContent = '第 ' + (current + 1) + ' 页，共 ' + slides.length + ' 页：' + slides[current].dataset.title;
    if (updateHash !== false && window.location.hash !== '#slide-' + (current + 1)) {
      // location.hash works for a copied file:// presentation as well as HTTP.
      window.location.hash = 'slide-' + (current + 1);
    }
  }

  function setPresentation(enabled) {
    document.body.classList.toggle('is-presenting', enabled);
    if (fullscreenButton) fullscreenButton.setAttribute('aria-pressed', String(enabled));
    requestAnimationFrame(fit);
  }

  async function toggleFullscreen() {
    if (document.body.classList.contains('is-presenting')) {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
      setPresentation(false);
      return;
    }
    setPresentation(true);
    if (document.documentElement.requestFullscreen) {
      try { await document.documentElement.requestFullscreen(); }
      catch (_) { /* Embedded/file viewers can still use the distraction-free layout. */ }
    }
  }

  if (previous) previous.addEventListener('click', function () { show(current - 1); });
  if (next) next.addEventListener('click', function () { show(current + 1); });
  if (fullscreenButton) fullscreenButton.addEventListener('click', toggleFullscreen);
  document.querySelectorAll('[data-help]').forEach(function (button) {
    button.addEventListener('click', function () { if (dialog && dialog.showModal) dialog.showModal(); });
  });
  if (dialog) {
    const closeButton = dialog.querySelector('[data-close-help]');
    if (closeButton) closeButton.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) { if (event.target === dialog) dialog.close(); });
  }
  document.addEventListener('keydown', function (event) {
    const target = event.target;
    if (document.querySelector('dialog[open]')) return;
    if (target && (target.matches('input, textarea, select, video') || target.isContentEditable)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown' || (event.key === ' ' && !target.closest('button, a'))) {
      event.preventDefault(); show(current + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault(); show(current - 1);
    } else if (event.key === 'Home') { event.preventDefault(); show(0); }
    else if (event.key === 'End') { event.preventDefault(); show(slides.length - 1); }
    else if (event.key.toLowerCase() === 'f') { event.preventDefault(); toggleFullscreen(); }
    else if (event.key === 'Escape') { setPresentation(false); }
    else if (event.key === '?') { if (dialog && dialog.showModal) dialog.showModal(); }
  });
  deck.addEventListener('touchstart', function (event) {
    if (event.target.closest('button, input, a, video') || event.touches.length !== 1) return;
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  deck.addEventListener('touchend', function (event) {
    if (!touchStart || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  window.addEventListener('hashchange', function () { show(indexFromHash(), false); });
  window.addEventListener('resize', fit);
  document.addEventListener('fullscreenchange', function () { setPresentation(Boolean(document.fullscreenElement)); });
  if (window.ResizeObserver) new ResizeObserver(fit).observe(viewport);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  show(indexFromHash(), false);
  fit();
})();

/* Optional shared viewers; activated only when the corresponding data attributes exist. */
(function () {
  'use strict';
  const slides = Array.from(document.querySelectorAll('[data-deck] > .slide'));
  const outline = document.querySelector('[data-outline-dialog]');
  if (outline) {
    const chapters = new Map();
    const grid = outline.querySelector('[data-outline-grid]');
    slides.forEach(function (slide, index) {
      const name = slide.dataset.chapter || 'Contents';
      if (!chapters.has(name)) {
        const section = document.createElement('section');
        section.className = 'outline-chapter';
        const title = document.createElement('h3');
        title.textContent = name;
        section.appendChild(title);
        grid.appendChild(section);
        chapters.set(name, section);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'outline-item';
      button.dataset.outlineIndex = index;
      const number = document.createElement('span');
      number.textContent = String(index + 1).padStart(2, '0');
      button.append(number, document.createTextNode(slide.dataset.title || ''));
      button.addEventListener('click', function () { outline.close(); window.location.hash = 'slide-' + (index + 1); });
      chapters.get(name).appendChild(button);
    });
    function openOutline() {
      outline.querySelectorAll('[data-outline-index]').forEach(function (button) {
        if (!slides[Number(button.dataset.outlineIndex)].hidden) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
      if (!outline.open) outline.showModal();
    }
    document.querySelectorAll('[data-open-outline]').forEach(function (b) { b.addEventListener('click', openOutline); });
    outline.querySelector('[data-close-outline]').addEventListener('click', function () { outline.close(); });
    outline.addEventListener('click', function (event) { if (event.target === outline) outline.close(); });
    document.addEventListener('keydown', function (event) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,textarea,select,video') || event.target.isContentEditable) return;
      if (event.key.toLowerCase() === 'm' && !document.querySelector('dialog[open]')) { event.preventDefault(); openOutline(); }
    });
  }

  const figureDialog = document.querySelector('[data-figure-dialog]');
  if (figureDialog) {
    const viewport = figureDialog.querySelector('[data-figure-viewport]');
    const picture = viewport.querySelector('img');
    let scale = 1, x = 0, y = 0, drag = null;
    function applyTransform() { picture.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')'; }
    function reset() { scale = 1; x = 0; y = 0; drag = null; applyTransform(); }
    document.querySelectorAll('[data-figure-open]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        const label = link.dataset.figureTitle || (link.querySelector('img') && link.querySelector('img').alt) || '论文原图';
        figureDialog.querySelector('#figure-dialog-title').textContent = label;
        const description = figureDialog.querySelector('[data-figure-description]');
        if (description) {
          description.textContent = link.dataset.figureDescription || '';
          description.hidden = !description.textContent;
        }
        picture.removeAttribute('width'); picture.removeAttribute('height');
        picture.src = link.href; picture.alt = label;
        figureDialog.querySelector('[data-original-figure]').href = link.href;
        reset(); figureDialog.showModal();
      });
    });
    figureDialog.querySelector('[data-close-figure]').addEventListener('click', function () { figureDialog.close(); });
    figureDialog.querySelector('[data-figure-reset]').addEventListener('click', reset);
    figureDialog.addEventListener('click', function (event) { if (event.target === figureDialog) figureDialog.close(); });
    viewport.addEventListener('wheel', function (event) {
      event.preventDefault(); scale = Math.max(1, Math.min(6, scale * Math.exp(-event.deltaY * .0015)));
      if (scale === 1) { x = 0; y = 0; }
      applyTransform();
    }, { passive: false });
    viewport.addEventListener('pointerdown', function (event) {
      if (scale <= 1) return;
      drag = { px: event.clientX, py: event.clientY, x: x, y: y };
      viewport.setPointerCapture(event.pointerId); viewport.classList.add('is-dragging');
    });
    viewport.addEventListener('pointermove', function (event) {
      if (!drag) return;
      x = drag.x + event.clientX - drag.px; y = drag.y + event.clientY - drag.py; applyTransform();
    });
    function endDrag() { drag = null; viewport.classList.remove('is-dragging'); }
    viewport.addEventListener('pointerup', endDrag); viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('dblclick', reset);
    figureDialog.addEventListener('close', reset);
  }

  const demoDialogs = Array.from(document.querySelectorAll('[data-demo-dialog]'));
  function pauseVideos() { document.querySelectorAll('video').forEach(function (video) { video.pause(); }); }
  document.querySelectorAll('[data-open-demo]').forEach(function (button) {
    button.addEventListener('click', function () {
      const dialog = demoDialogs.find(function (item) { return item.dataset.demoDialog === button.dataset.openDemo; });
      if (dialog) dialog.showModal();
    });
  });
  demoDialogs.forEach(function (dialog) {
    dialog.querySelector('[data-close-demo]').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('close', pauseVideos);
    dialog.addEventListener('click', function (event) { if (event.target === dialog) dialog.close(); });
  });
  document.querySelectorAll('[data-play-group]').forEach(function (button) {
    button.addEventListener('click', function () {
      const container = button.closest('dialog') || button.closest('.slide');
      container.querySelectorAll('video').forEach(function (video) {
        video.currentTime = 0;
        const play = video.play();
        if (play && play.catch) play.catch(function () { /* Keep native play controls available. */ });
      });
    });
  });
  document.querySelectorAll('[data-pause-group]').forEach(function (button) { button.addEventListener('click', pauseVideos); });
  document.addEventListener('presentation:slidechange', pauseVideos);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseVideos(); });
})();
