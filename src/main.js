import { distributions, getDistribution, getRelated } from './distributions.js';
import { renderGraph } from './graph.js';
import { drawPDF, drawCDF } from './charts.js';

// ----- Sidebar lists -----

const discreteList = document.getElementById('discrete-list');
const continuousList = document.getElementById('continuous-list');
const searchInput = document.getElementById('search');

function populateSidebar(filter = '') {
  const lf = filter.toLowerCase();
  discreteList.innerHTML = '';
  continuousList.innerHTML = '';

  for (const d of distributions) {
    if (lf && !d.name.toLowerCase().includes(lf)) continue;
    const li = document.createElement('li');
    li.textContent = d.name;
    li.dataset.id = d.id;
    li.addEventListener('click', () => showDetail(d.id));
    if (d.type === 'discrete') discreteList.appendChild(li);
    else continuousList.appendChild(li);
  }
}

searchInput.addEventListener('input', () => populateSidebar(searchInput.value));
populateSidebar();

// ----- Graph -----

const graphContainer = document.getElementById('graph-container');
renderGraph(graphContainer, showDetail);

// ----- Navigation -----

const graphSection = document.getElementById('graph-section');
const detailSection = document.getElementById('detail-section');
const backBtn = document.getElementById('back-btn');

backBtn.addEventListener('click', showOverview);

function showOverview() {
  detailSection.classList.add('hidden');
  graphSection.classList.remove('hidden');
}

function showDetail(id) {
  const dist = getDistribution(id);
  if (!dist) return;

  graphSection.classList.add('hidden');
  detailSection.classList.remove('hidden');

  document.getElementById('detail-name').textContent = dist.name;
  const badge = document.getElementById('detail-type-badge');
  badge.textContent = dist.type;
  badge.className = `badge ${dist.type}`;
  document.getElementById('detail-description').textContent = dist.description;
  document.getElementById('pdf-title').textContent = dist.type === 'discrete' ? 'PMF' : 'PDF';

  const params = {};
  for (const p of dist.params) params[p.name] = p.default;

  buildParamControls(dist, params);
  updateCharts(dist, params);
  buildRelated(id);
}

function buildParamControls(dist, params) {
  const container = document.getElementById('params-controls');
  container.innerHTML = '';

  for (const p of dist.params) {
    const row = document.createElement('div');
    row.className = 'param-row';

    const label = document.createElement('label');
    label.textContent = p.label;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = p.min;
    slider.max = p.max;
    slider.step = p.step;
    slider.value = p.default;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'param-value';
    valueSpan.textContent = p.default;

    slider.addEventListener('input', () => {
      const v = Number(slider.value);
      params[p.name] = v;
      valueSpan.textContent = Number.isInteger(p.step) ? v : v.toFixed(2);
      updateCharts(dist, params);
    });

    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(valueSpan);
    container.appendChild(row);
  }
}

function updateCharts(dist, params) {
  drawPDF(document.getElementById('pdf-chart'), dist, params);
  drawCDF(document.getElementById('cdf-chart'), dist, params);
}

function buildRelated(id) {
  const container = document.getElementById('related-list');
  container.innerHTML = '';
  const related = getRelated(id);

  if (related.length === 0) {
    container.innerHTML = '<p class="no-related">No known relationships.</p>';
    return;
  }

  for (const r of related) {
    const dist = getDistribution(r.id);
    if (!dist) continue;
    const card = document.createElement('div');
    card.className = 'related-card';
    card.innerHTML = `
      <span class="related-name">${dist.name}</span>
      <span class="related-arrow">${r.direction === 'to' ? '→' : '←'}</span>
      <span class="related-label">${r.label}</span>
    `;
    card.addEventListener('click', () => showDetail(r.id));
    container.appendChild(card);
  }
}
