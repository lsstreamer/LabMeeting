/* Paper-specific interactions: conceptual comparison and original-figure viewer. */
(function () {
  'use strict';
  const buttons = document.querySelectorAll('[data-plot-mode]');
  const layers = document.querySelectorAll('[data-plot-layer]');
  const caption = document.querySelector('[data-plot-caption]');
  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      const guided = button.dataset.plotMode === 'guided';
      buttons.forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); });
      layers.forEach(function (layer) {
        const visible = layer.dataset.plotLayer === button.dataset.plotMode;
        layer.toggleAttribute('hidden', !visible);
        layer.style.display = visible ? '' : 'none';
      });
      caption.classList.toggle('is-guided', guided);
      caption.replaceChildren();
      const label = document.createElement('strong');
      label.textContent = guided ? '视频引导：' : '直接优化：';
      caption.appendChild(label);
      caption.appendChild(document.createTextNode(guided
        ? '通过逐步变化的参考图像改变目标函数，跟随一系列移动的解，逐步接近最终目标。'
        : '始终匹配最终目标图，当前梯度可能把参数带到错误的局部最小值。'));
    });
  });
  const schedule = document.querySelector('[data-schedule]');
  if (schedule) {
    function updateSchedule() {
      const t = Number(schedule.value);
      const lambda = Math.min(t / 270, 1);
      document.querySelector('[data-schedule-value]').textContent = '迭代 ' + t + ' / 300';
      document.querySelector('[data-schedule-caption]').textContent = 'λ = ' + lambda.toFixed(2) + (lambda < 1 ? ' · 匹配视频中间帧' : ' · 固定真实目标，继续精修');
      const dot = document.querySelector('[data-schedule-dot]');
      dot.setAttribute('cx', String(60 + 695 * t / 300));
      dot.setAttribute('cy', String(140 - 105 * lambda));
    }
    schedule.addEventListener('input', updateSchedule);
    updateSchedule();
  }
})();
