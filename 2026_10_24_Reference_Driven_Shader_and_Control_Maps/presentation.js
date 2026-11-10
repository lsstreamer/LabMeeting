(() => {
  'use strict';
  const slides = Array.from(document.querySelectorAll('.slide'));
  const chapters = Array.from(document.querySelectorAll('[data-chapter]'));
  const deck = document.getElementById('deck');
  const notes = document.getElementById('speaker-notes');
  const notesToggle = document.getElementById('notes-toggle');
  const dialog = document.getElementById('image-dialog');
  const catalog = document.getElementById('catalog-dialog');
  const catalogList = document.getElementById('catalog-list');
  let current = 0;

  slides.forEach((slide, index) => {
    const button = document.createElement('button');
    button.className = 'catalog-entry';
    button.dataset.slide = String(index);
    const number = document.createElement('span');
    number.textContent = String(index + 1).padStart(2, '0');
    button.append(number, document.createTextNode(slide.dataset.title));
    button.addEventListener('click', () => {
      catalog.close();
      showSlide(index);
    });
    catalogList.appendChild(button);
  });
  const nav = Array.from(catalogList.querySelectorAll('[data-slide]'));
  document.getElementById('total-pages').textContent = String(slides.length);

  function fit() {
    if (window.innerWidth <= 760) {
      deck.style.transform = 'none';
      return;
    }
    const scale = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    deck.style.transform = `scale(${scale})`;
  }

  function showSlide(index, updateHash = true) {
    const next = Math.max(0, Math.min(slides.length - 1, index));
    const changed = next !== current;
    current = next;
    if (next !== 16) stopStagePlayback();
    if (next !== 18 && modelCompareDialog.open) modelCompareDialog.close();
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === current);
      slide.setAttribute('aria-hidden', String(i !== current));
      slide.inert = i !== current;
    });
    if (next === 16) {
      if (changed) selectStage(0);
      else ensureStageImages();
    }
    nav.forEach((button, i) => {
      button.classList.toggle('active', i === current);
      if (i === current) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    const activeChapter = current < 2 ? 0 : current < 16 ? 1 : current < 20 ? 2 : 3;
    chapters.forEach((button, i) => {
      button.classList.toggle('active', i === activeChapter);
      if (i === activeChapter) button.setAttribute('aria-current', 'location');
      else button.removeAttribute('aria-current');
    });
    slides.forEach((slide, i) => {
      if (i !== current) slide.querySelectorAll('video').forEach(video => video.pause());
    });
    document.getElementById('current-section').textContent = slides[current].dataset.title;
    document.getElementById('page-number').textContent = String(current + 1).padStart(2, '0');
    document.getElementById('progress').style.width = `${(current + 1) / slides.length * 100}%`;
    document.getElementById('prev').disabled = current === 0;
    document.getElementById('next').disabled = current === slides.length - 1;
    document.getElementById('notes-content').textContent = slides[current].dataset.notes;
    document.title = `${current + 1} / ${slides.length} · ${slides[current].dataset.title} · ShaderNPR 中期报告`;
    if (updateHash && location.hash !== `#${current + 1}`) {
      // Hash navigation also works when opened directly with file://.
      location.hash = String(current + 1);
    }
    if (changed) {
      document.getElementById('announcement').textContent = `第 ${current + 1} 页，共 ${slides.length} 页：${slides[current].dataset.title}`;
      if (window.innerWidth <= 760) window.scrollTo({ top: 0, behavior: 'instant' });
      const focused = document.activeElement;
      if (focused && focused.closest('.slide:not(.active)')) focused.blur();
    }
  }

  function readHash() {
    const number = Number(location.hash.slice(1));
    return Number.isInteger(number) && number >= 1 && number <= slides.length ? number - 1 : 0;
  }

  function toggleNotes(force) {
    const visible = typeof force === 'boolean' ? force : notes.hidden;
    notes.hidden = !visible;
    notesToggle.setAttribute('aria-expanded', String(visible));
  }

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else document.getElementById('announcement').textContent = '此浏览器不支持网页全屏，请使用浏览器的全屏功能。';
    } catch (_) {
      document.getElementById('announcement').textContent = '请使用浏览器的全屏功能，例如 F11。';
    }
  }

  document.getElementById('prev').addEventListener('click', () => showSlide(current - 1));
  document.getElementById('next').addEventListener('click', () => showSlide(current + 1));
  chapters.forEach(button => button.addEventListener('click', () => showSlide(Number(button.dataset.chapter))));
  document.getElementById('catalog-toggle').addEventListener('click', () => catalog.showModal());
  document.getElementById('close-catalog').addEventListener('click', () => catalog.close());
  notesToggle.addEventListener('click', () => toggleNotes());
  document.getElementById('close-notes').addEventListener('click', () => toggleNotes(false));
  document.getElementById('fullscreen').addEventListener('click', fullscreen);

  const range = document.getElementById('compare-range');
  if (range) range.addEventListener('input', () => {
    document.getElementById('comparison').style.setProperty('--split', `${range.value}%`);
    range.setAttribute('aria-valuetext', `左侧原始外观 ${range.value}%，右侧生成结果 ${100 - Number(range.value)}%`);
  });

  document.querySelectorAll('.flow-node').forEach(button => {
    button.setAttribute('aria-pressed', String(button.classList.contains('selected')));
    button.addEventListener('click', () => {
      document.querySelectorAll('.flow-node').forEach(node => {
        node.classList.toggle('selected', node === button);
        node.setAttribute('aria-pressed', String(node === button));
      });
      document.getElementById('pipeline-detail').textContent = button.dataset.detail;
    });
  });

  const stageSlide = document.getElementById('slide-17');
  const stageChoices = Array.from(stageSlide.querySelectorAll('.stage-choice'));
  const stageImage = document.getElementById('stage-image');
  const stageBaseImage = document.getElementById('stage-compare-image');
  const stageReferenceSource = stageBaseImage.getAttribute('src');
  const stageCanvas = document.getElementById('stage-canvas');
  const stageRange = document.getElementById('stage-compare-range');
  const stageDivider = document.getElementById('stage-swipe-divider');
  const stagePlay = document.getElementById('stage-play');
  const stageReferenceButton = document.getElementById('stage-compare-reference');
  const stagePreviousButton = document.getElementById('stage-compare-previous');
  const stageViewToggle = document.getElementById('stage-view-toggle');
  let stageIndex = 0;
  let stageComparePrevious = false;
  let stageTimer = null;
  let stagePlaying = false;
  let stageRenderRevision = 0;
  const stageImageRequests = new WeakMap();

  function loadStagePicture(image, source) {
    // Hidden slides cannot rely on the browser's lazy-loading visibility check.
    image.loading = 'eager';
    if (stageImageRequests.get(image)?.source !== source) {
      stageImageRequests.set(image, { source, retried: false });
    }
    if (image.getAttribute('src') !== source || (image.complete && !image.naturalWidth)) {
      image.src = source;
    }
  }

  [stageImage, stageBaseImage].forEach(image => image.addEventListener('error', () => {
    const request = stageImageRequests.get(image);
    if (!request || request.retried || image.getAttribute('src') !== request.source) return;
    request.retried = true;
    image.src = request.source;
  }));

  function ensureStageImages() {
    loadStagePicture(stageImage, `assets/${stageChoices[stageIndex].dataset.stage}`);
    updateStageComparison();
  }

  function stopStagePlayback() {
    clearTimeout(stageTimer);
    stageTimer = null;
    stagePlaying = false;
    stageSlide.classList.remove('is-playing');
    stagePlay.setAttribute('aria-pressed', 'false');
    stagePlay.querySelector('span').textContent = '自动演示';
  }

  function updateStageZoom(kind, src, caption) {
    stageSlide.querySelectorAll(`[data-stage-zoom="${kind}"]`).forEach(button => {
      button.dataset.image = src;
      button.dataset.caption = caption;
      button.setAttribute('aria-label', `查看完整图片：${caption}`);
    });
  }

  function updateStageComparison() {
    const hasPrevious = stageIndex > 0;
    stagePreviousButton.disabled = !hasPrevious;
    const usePrevious = stageComparePrevious && hasPrevious;
    const source = usePrevious ? `assets/${stageChoices[stageIndex - 1].dataset.stage}` : stageReferenceSource;
    const caption = usePrevious ? stageChoices[stageIndex - 1].dataset.stageTitle : '参考图（Ref）';
    loadStagePicture(stageBaseImage, source);
    stageBaseImage.alt = caption;
    document.getElementById('stage-compare-label').textContent = caption;
    stageReferenceButton.setAttribute('aria-pressed', String(!usePrevious));
    stagePreviousButton.setAttribute('aria-pressed', String(usePrevious));
    updateStageZoom('base', source, caption);
    const split = Number(stageRange.value);
    stageRange.setAttribute('aria-valuetext', `${caption} ${split}%，${stageChoices[stageIndex].dataset.stageTitle} ${100 - split}%`);
  }

  function selectStage(index, automatic = false) {
    if (!automatic) stopStagePlayback();
    stageIndex = index;
    const selected = stageChoices[index];
    stageChoices.forEach((choice, i) => {
      choice.classList.toggle('active', i === index);
      choice.classList.toggle('is-past', i < index);
      choice.setAttribute('aria-pressed', String(i === index));
    });
    const source = `assets/${selected.dataset.stage}`;
    loadStagePicture(stageImage, source);
    stageImage.alt = selected.dataset.stageTitle;
    document.getElementById('stage-image-title').textContent = selected.dataset.stageTitle;
    document.getElementById('stage-current-label').textContent = selected.dataset.stageTitle;
    document.getElementById('stage-step-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(stageChoices.length).padStart(2, '0')}`;
    document.getElementById('stage-current-time').textContent = index ? Number(selected.dataset.seconds).toFixed(1) : '输入';
    document.getElementById('stage-current-unit').textContent = index ? 's' : '';
    document.getElementById('stage-current-time-label').textContent = index ? '阶段均值' : '起始外观';
    document.getElementById('stage-focus').textContent = selected.dataset.stageFocus;
    updateStageZoom('current', source, selected.dataset.stageTitle);
    updateStageComparison();
    const revision = ++stageRenderRevision;
    stageImage.getAnimations().forEach(animation => animation.cancel());
    stageImage.decode().then(() => {
      if (revision !== stageRenderRevision || !stageSlide.classList.contains('active') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      stageImage.animate([{ opacity: .2, transform: 'translateX(6px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 280, easing: 'ease-out' });
    }).catch(() => {});
  }

  function scheduleStagePlayback() {
    stageTimer = setTimeout(() => {
      if (!stageSlide.classList.contains('active') || document.hidden || stageIndex === stageChoices.length - 1) {
        stopStagePlayback();
        return;
      }
      selectStage(stageIndex + 1, true);
      scheduleStagePlayback();
    }, 2200);
  }

  stageChoices.forEach((button, index) => button.addEventListener('click', () => selectStage(index)));
  stageReferenceButton.addEventListener('click', () => {
    stageComparePrevious = false;
    updateStageComparison();
  });
  stagePreviousButton.addEventListener('click', () => {
    stageComparePrevious = true;
    updateStageComparison();
  });
  stageViewToggle.addEventListener('click', () => {
    const wipe = stageCanvas.dataset.view !== 'wipe';
    stageCanvas.dataset.view = wipe ? 'wipe' : 'side';
    stageViewToggle.setAttribute('aria-pressed', String(wipe));
    stageViewToggle.firstChild.textContent = wipe ? '并排对比 ' : '滑动对比 ';
    stageRange.hidden = !wipe;
    stageDivider.hidden = !wipe;
  });
  stageRange.addEventListener('input', () => {
    stopStagePlayback();
    stageCanvas.style.setProperty('--stage-split', `${stageRange.value}%`);
    updateStageComparison();
  });
  stagePlay.addEventListener('click', () => {
    if (stagePlaying) { stopStagePlayback(); return; }
    if (stageIndex === stageChoices.length - 1) selectStage(0, true);
    stagePlaying = true;
    stageSlide.classList.add('is-playing');
    stagePlay.setAttribute('aria-pressed', 'true');
    stagePlay.querySelector('span').textContent = '暂停演示';
    scheduleStagePlayback();
  });
  stageSlide.querySelectorAll('.zoom-button').forEach(button => button.addEventListener('click', stopStagePlayback));
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopStagePlayback(); });
  document.getElementById('catalog-toggle').addEventListener('click', stopStagePlayback);
  selectStage(stageIndex);

  const videoSlide = document.getElementById('slide-18');
  const comparisonVideos = Array.from(videoSlide.querySelectorAll('video'));
  const playBothVideos = document.getElementById('video-play-both');
  const resetBothVideos = document.getElementById('video-reset-both');
  function updateVideoPlaybackControls() {
    const allPlaying = comparisonVideos.every(video => !video.paused && !video.ended);
    videoSlide.classList.toggle('videos-playing', allPlaying);
    playBothVideos.setAttribute('aria-pressed', String(allPlaying));
    playBothVideos.querySelector('span').textContent = allPlaying ? '暂停播放' : '同时播放';
  }
  playBothVideos.addEventListener('click', async () => {
    if (comparisonVideos.every(video => !video.paused && !video.ended)) {
      comparisonVideos.forEach(video => video.pause());
    } else {
      const start = Math.min(...comparisonVideos.map(video => video.currentTime));
      comparisonVideos.forEach(video => {
        if (video.readyState > 0) video.currentTime = start;
      });
      await Promise.allSettled(comparisonVideos.map(video => video.play()));
    }
    updateVideoPlaybackControls();
  });
  resetBothVideos.addEventListener('click', () => {
    comparisonVideos.forEach(video => { if (video.readyState > 0) video.currentTime = 0; });
  });
  comparisonVideos.forEach(video => ['play', 'pause', 'ended', 'error'].forEach(event => video.addEventListener(event, updateVideoPlaybackControls)));

  const modelCompareDialog = document.getElementById('model-compare-dialog');
  const modelButtons = Array.from(document.querySelectorAll('#slide-19 .model-compare-button'));
  const modelCompareCanvas = document.getElementById('model-compare-canvas');
  const modelCompareRange = document.getElementById('model-compare-range');
  const modelCompareBefore = document.getElementById('model-compare-before');
  const modelCompareAfter = document.getElementById('model-compare-after');
  const modelCompareLoading = document.getElementById('model-compare-loading');
  const modelComparePrev = document.getElementById('model-compare-prev');
  const modelCompareNext = document.getElementById('model-compare-next');
  let modelCompareIndex = 0;
  let modelCompareRevision = 0;

  function setModelCompareSplit(value) {
    modelCompareRange.value = String(value);
    modelCompareCanvas.style.setProperty('--model-split', `${value}%`);
    modelCompareRange.setAttribute('aria-valuetext', `左侧原始外观 ${value}%，右侧生成结果 ${100 - Number(value)}%`);
  }

  async function selectComparisonModel(index) {
    modelCompareIndex = index;
    const button = modelButtons[index];
    const model = button.dataset.model;
    const revision = ++modelCompareRevision;
    modelCompareDialog.classList.add('is-loading');
    modelCompareLoading.textContent = '正在加载对比图…';
    modelCompareLoading.hidden = false;
    modelCompareRange.disabled = true;
    setModelCompareSplit(50);
    document.getElementById('model-compare-title').textContent = `${model} · 前后对比`;
    document.getElementById('model-compare-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(modelButtons.length).padStart(2, '0')}`;
    modelComparePrev.disabled = index === 0;
    modelCompareNext.disabled = index === modelButtons.length - 1;
    modelCompareBefore.src = button.dataset.before;
    modelCompareAfter.src = button.dataset.after;
    modelCompareBefore.alt = `${model} 原始 BaseColor 外观`;
    modelCompareAfter.alt = `${model} 最新透明最终渲染`;
    [['model-compare-original', button.dataset.before, modelCompareBefore.alt], ['model-compare-result', button.dataset.after, modelCompareAfter.alt]].forEach(([id, source, caption]) => {
      const target = document.getElementById(id);
      target.dataset.image = source;
      target.dataset.caption = caption;
      target.setAttribute('aria-label', `查看完整图片：${caption}`);
    });
    try {
      await Promise.all([modelCompareBefore.decode(), modelCompareAfter.decode()]);
      if (revision !== modelCompareRevision) return;
      modelCompareDialog.classList.remove('is-loading');
      modelCompareLoading.hidden = true;
      modelCompareRange.disabled = false;
    } catch (_) {
      if (revision === modelCompareRevision) modelCompareLoading.textContent = '图片未能加载，请重新打开。';
    }
  }

  modelButtons.forEach((button, index) => button.addEventListener('click', async () => {
    const loading = selectComparisonModel(index);
    if (!modelCompareDialog.open) modelCompareDialog.showModal();
    await loading;
    if (modelCompareDialog.open && !modelCompareRange.disabled) modelCompareRange.focus({ preventScroll: true });
  }));
  modelCompareRange.addEventListener('input', () => setModelCompareSplit(modelCompareRange.value));
  document.getElementById('model-compare-reset').addEventListener('click', () => setModelCompareSplit(50));
  modelComparePrev.addEventListener('click', () => selectComparisonModel(modelCompareIndex - 1));
  modelCompareNext.addEventListener('click', () => selectComparisonModel(modelCompareIndex + 1));
  document.getElementById('model-compare-close').addEventListener('click', () => modelCompareDialog.close());
  modelCompareDialog.addEventListener('click', event => {
    if (event.target !== modelCompareDialog) return;
    const bounds = modelCompareDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) modelCompareDialog.close();
  });
  modelCompareDialog.addEventListener('keydown', event => {
    if (dialog.open || event.target.matches('input')) return;
    if (event.key === 'ArrowLeft' && modelCompareIndex > 0) {
      event.preventDefault();
      selectComparisonModel(modelCompareIndex - 1);
    } else if (event.key === 'ArrowRight' && modelCompareIndex < modelButtons.length - 1) {
      event.preventDefault();
      selectComparisonModel(modelCompareIndex + 1);
    }
  });
  modelCompareDialog.addEventListener('close', () => { ++modelCompareRevision; });

  const viewerImage = document.getElementById('zoomed-image');
  const viewerStage = document.getElementById('image-viewer-stage');
  const zoomLevel = document.getElementById('image-zoom-level');
  const zoomOut = document.getElementById('image-zoom-out');
  const zoomIn = document.getElementById('image-zoom-in');
  const pointers = new Map();
  const view = { scale: 1, x: 0, y: 0, width: 0, height: 0 };
  const minZoom = 0.25;
  const maxZoom = 12;

  function renderImageView() {
    const limitX = Math.max(0, (view.width * view.scale - viewerStage.clientWidth) / 2);
    const limitY = Math.max(0, (view.height * view.scale - viewerStage.clientHeight) / 2);
    view.x = Math.max(-limitX, Math.min(limitX, view.x));
    view.y = Math.max(-limitY, Math.min(limitY, view.y));
    viewerImage.style.transform = `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    zoomLevel.value = `${Math.round(view.scale * 100)}%`;
    zoomOut.disabled = view.scale <= minZoom;
    zoomIn.disabled = view.scale >= maxZoom;
    viewerStage.classList.toggle('can-pan', limitX > 0 || limitY > 0);
  }

  function fitImageView(reset = false) {
    if (!dialog.open || !viewerImage.naturalWidth || !viewerStage.clientWidth) return;
    const fitScale = Math.min(viewerStage.clientWidth / viewerImage.naturalWidth,
      viewerStage.clientHeight / viewerImage.naturalHeight);
    view.width = viewerImage.naturalWidth * fitScale;
    view.height = viewerImage.naturalHeight * fitScale;
    viewerImage.style.width = `${view.width}px`;
    viewerImage.style.height = `${view.height}px`;
    if (reset) Object.assign(view, { scale: 1, x: 0, y: 0 });
    renderImageView();
  }

  function zoomImageAt(scale, clientX, clientY) {
    if (viewerImage.hidden || !view.width) return;
    const next = Math.max(minZoom, Math.min(maxZoom, scale));
    const rect = viewerStage.getBoundingClientRect();
    const x = clientX == null ? 0 : clientX - rect.left - rect.width / 2;
    const y = clientY == null ? 0 : clientY - rect.top - rect.height / 2;
    const ratio = next / view.scale;
    view.x = x - (x - view.x) * ratio;
    view.y = y - (y - view.y) * ratio;
    view.scale = next;
    renderImageView();
  }

  function openImage(src, caption) {
    pointers.clear();
    viewerStage.classList.remove('is-dragging');
    Object.assign(view, { scale: 1, x: 0, y: 0, width: 0, height: 0 });
    viewerImage.hidden = true;
    viewerImage.alt = caption;
    document.getElementById('image-caption').textContent = caption;
    viewerImage.src = src;
    if (!dialog.open) dialog.showModal();
    if (viewerImage.complete && viewerImage.naturalWidth) {
      viewerImage.hidden = false;
      fitImageView(true);
    }
  }

  viewerImage.addEventListener('load', () => {
    viewerImage.hidden = false;
    fitImageView(true);
  });
  zoomOut.addEventListener('click', () => zoomImageAt(view.scale / 1.25));
  zoomIn.addEventListener('click', () => zoomImageAt(view.scale * 1.25));
  document.getElementById('image-zoom-reset').addEventListener('click', () => fitImageView(true));
  viewerStage.addEventListener('wheel', event => {
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewerStage.clientHeight : 1);
    zoomImageAt(view.scale * Math.exp(-Math.max(-300, Math.min(300, delta)) * 0.002), event.clientX, event.clientY);
  }, { passive: false });
  viewerStage.addEventListener('dblclick', event => {
    event.preventDefault();
    if (view.scale > 1.01) fitImageView(true);
    else zoomImageAt(2.5, event.clientX, event.clientY);
  });
  viewerStage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    viewerStage.setPointerCapture(event.pointerId);
    viewerStage.classList.add('is-dragging');
  });
  viewerStage.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    const before = Array.from(pointers.values());
    const previous = pointers.get(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const after = Array.from(pointers.values());
    if (before.length === 1) {
      view.x += event.clientX - previous.x;
      view.y += event.clientY - previous.y;
    } else {
      const midpoint = points => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
      const distance = points => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const oldMid = midpoint(before);
      const newMid = midpoint(after);
      const oldDistance = distance(before);
      if (oldDistance > 0) zoomImageAt(view.scale * distance(after) / oldDistance, oldMid.x, oldMid.y);
      view.x += newMid.x - oldMid.x;
      view.y += newMid.y - oldMid.y;
    }
    renderImageView();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => viewerStage.addEventListener(type, event => {
    pointers.delete(event.pointerId);
    if (!pointers.size) viewerStage.classList.remove('is-dragging');
  }));
  dialog.addEventListener('close', () => {
    pointers.clear();
    viewerStage.classList.remove('is-dragging');
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === '+' || event.key === '=') zoomImageAt(view.scale * 1.25);
    else if (event.key === '-' || event.key === '_') zoomImageAt(view.scale / 1.25);
    else if (event.key === '0') fitImageView(true);
    else if (event.key.startsWith('Arrow')) {
      const movement = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] }[event.key];
      if (!movement) return;
      view.x += movement[0]; view.y += movement[1]; renderImageView();
    } else return;
    event.preventDefault();
  });
  window.addEventListener('resize', () => fitImageView());

  document.querySelectorAll('.zoom-button').forEach(button => button.addEventListener('click', () => {
    openImage(button.dataset.image, button.dataset.caption);
  }));
  // Include figures without an existing zoom button, including the active stage image.
  document.querySelectorAll('.slide img').forEach(image => {
    if (image.closest('button, a, .comparison-layer')) return;
    image.classList.add('inspectable-image');
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', `查看图片：${image.alt}`);
    image.addEventListener('click', () => openImage(image.getAttribute('src'), image.alt));
    image.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault(); event.stopPropagation();
      openImage(image.getAttribute('src'), image.alt);
    });
  });
  document.getElementById('close-image').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  catalog.addEventListener('click', event => {
    const rect = catalog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) catalog.close();
  });

  document.addEventListener('keydown', event => {
    if (dialog.open || catalog.open || modelCompareDialog.open || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.matches('input,textarea,select,video,[contenteditable="true"]')) return;
    const onButton = event.target.closest('button,a');
    if (event.key === ' ' && onButton) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) {
      event.preventDefault(); showSlide(current + 1);
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
      event.preventDefault(); showSlide(current - 1);
    } else if (event.key === 'Home') {
      event.preventDefault(); showSlide(0);
    } else if (event.key === 'End') {
      event.preventDefault(); showSlide(slides.length - 1);
    } else if (event.key.toLowerCase() === 'n') {
      toggleNotes();
    } else if (event.key.toLowerCase() === 'f') {
      fullscreen();
    } else if (event.key.toLowerCase() === 'm') {
      catalog.showModal();
    } else if (event.key === 'Escape') {
      toggleNotes(false);
    }
  });

  let touchStart = null;
  deck.addEventListener('touchstart', event => {
    if (event.target.closest('input,button,dialog,.speaker-notes')) { touchStart = null; return; }
    const touch = event.changedTouches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  deck.addEventListener('touchend', event => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) showSlide(current + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });

  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', () => showSlide(readHash(), false));
  fit();
  showSlide(readHash(), false);
})();
