import * as d3 from 'd3';

const CHART_W = 460;
const CHART_H = 280;
const MARGIN = { top: 20, right: 20, bottom: 40, left: 50 };
const W = CHART_W - MARGIN.left - MARGIN.right;
const H = CHART_H - MARGIN.top - MARGIN.bottom;

export function drawPDF(container, dist, params) {
  container.innerHTML = '';
  const isDiscrete = dist.type === 'discrete';
  const svg = makeSVG(container);
  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  let data, xScale, yScale;

  if (isDiscrete) {
    const [lo, hi] = dist.domain(params);
    data = [];
    for (let k = lo; k <= hi; k++) {
      const v = dist.pmf(k, params);
      if (isFinite(v)) data.push({ x: k, y: v });
    }
    xScale = d3.scaleBand().domain(data.map((d) => d.x)).range([0, W]).padding(0.3);
    yScale = d3.scaleLinear().domain([0, d3.max(data, (d) => d.y) * 1.1]).range([H, 0]);

    g.selectAll('rect')
      .data(data)
      .join('rect')
      .attr('x', (d) => xScale(d.x))
      .attr('y', (d) => yScale(d.y))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => H - yScale(d.y))
      .attr('class', 'bar discrete');
  } else {
    const [lo, hi] = dist.range(params);
    const n = 300;
    const step = (hi - lo) / n;
    data = [];
    for (let i = 0; i <= n; i++) {
      const x = lo + i * step;
      const y = dist.pdf(x, params);
      if (isFinite(y) && y >= 0) data.push({ x, y });
    }
    xScale = d3.scaleLinear().domain([lo, hi]).range([0, W]);
    yScale = d3.scaleLinear().domain([0, d3.max(data, (d) => d.y) * 1.1 || 1]).range([H, 0]);

    const area = d3.area()
      .x((d) => xScale(d.x))
      .y0(H)
      .y1((d) => yScale(d.y))
      .curve(d3.curveMonotoneX);
    const line = d3.line()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(d3.curveMonotoneX);

    g.append('path').datum(data).attr('class', 'area continuous').attr('d', area);
    g.append('path').datum(data).attr('class', 'line continuous').attr('d', line);
  }

  drawAxes(g, xScale, yScale, isDiscrete);
}

export function drawCDF(container, dist, params) {
  container.innerHTML = '';
  const isDiscrete = dist.type === 'discrete';
  const svg = makeSVG(container);
  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  let data, xScale;

  if (isDiscrete) {
    const [lo, hi] = dist.domain(params);
    data = [];
    for (let k = lo; k <= hi; k++) {
      const v = dist.cdf(k, params);
      if (isFinite(v)) data.push({ x: k, y: Math.min(v, 1) });
    }
    xScale = d3.scaleLinear().domain([lo - 0.5, hi + 0.5]).range([0, W]);
    const yScale = d3.scaleLinear().domain([0, 1.05]).range([H, 0]);

    for (let i = 0; i < data.length; i++) {
      const x1 = xScale(data[i].x);
      const x2 = i < data.length - 1 ? xScale(data[i + 1].x) : xScale(hi + 0.5);
      g.append('line')
        .attr('x1', x1).attr('y1', yScale(data[i].y))
        .attr('x2', x2).attr('y2', yScale(data[i].y))
        .attr('class', 'step-line discrete');
      g.append('circle')
        .attr('cx', x1).attr('cy', yScale(data[i].y)).attr('r', 3)
        .attr('class', 'step-dot discrete');
    }
    drawAxes(g, xScale, yScale, false);
  } else {
    const [lo, hi] = dist.range(params);
    const n = 300;
    const step = (hi - lo) / n;
    data = [];
    for (let i = 0; i <= n; i++) {
      const x = lo + i * step;
      const y = dist.cdf(x, params);
      if (isFinite(y)) data.push({ x, y: Math.min(y, 1) });
    }
    xScale = d3.scaleLinear().domain([lo, hi]).range([0, W]);
    const yScale = d3.scaleLinear().domain([0, 1.05]).range([H, 0]);

    const line = d3.line()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(d3.curveMonotoneX);

    g.append('path').datum(data).attr('class', 'line continuous').attr('d', line);
    drawAxes(g, xScale, yScale, false);
  }
}

function makeSVG(container) {
  return d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${CHART_W} ${CHART_H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('class', 'chart-svg');
}

function drawAxes(g, xScale, yScale, isBand) {
  const xAxis = isBand ? d3.axisBottom(xScale).tickValues(
    xScale.domain().filter((_, i, arr) => {
      if (arr.length <= 20) return true;
      const step = Math.ceil(arr.length / 15);
      return i % step === 0;
    })
  ) : d3.axisBottom(xScale).ticks(8);

  g.append('g')
    .attr('transform', `translate(0,${H})`)
    .attr('class', 'axis')
    .call(xAxis);

  g.append('g')
    .attr('class', 'axis')
    .call(d3.axisLeft(yScale).ticks(6));
}
