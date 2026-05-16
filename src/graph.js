import * as d3 from 'd3';
import { distributions, relationships } from './distributions.js';

export function renderGraph(container, onNodeClick) {
  const width = container.clientWidth;
  const height = container.clientHeight || 600;

  container.innerHTML = '';

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const g = svg.append('g');

  const zoom = d3.zoom()
    .scaleExtent([0.3, 3])
    .on('zoom', (event) => g.attr('transform', event.transform));
  svg.call(zoom);

  const nodes = distributions.map((d) => ({ ...d, id: d.id }));
  const links = relationships.map((r) => ({ source: r.from, target: r.to, label: r.label }));

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d) => d.id).distance(120))
    .force('charge', d3.forceManyBody().strength(-400))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide(40))
    .force('x', d3.forceX(width / 2).strength(0.05))
    .force('y', d3.forceY(height / 2).strength(0.05));

  svg.append('defs').append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 28)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#667');

  const link = g.append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('class', 'graph-link')
    .attr('marker-end', 'url(#arrowhead)');

  const linkLabel = g.append('g')
    .selectAll('text')
    .data(links)
    .join('text')
    .attr('class', 'graph-link-label')
    .text((d) => d.label);

  const node = g.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', 'graph-node')
    .call(drag(simulation));

  node.append('circle')
    .attr('r', 18)
    .attr('class', (d) => `node-circle ${d.type}`);

  node.append('text')
    .attr('dy', 30)
    .attr('text-anchor', 'middle')
    .attr('class', 'node-label')
    .text((d) => d.name);

  node.on('click', (event, d) => {
    event.stopPropagation();
    onNodeClick(d.id);
  });

  const tooltip = d3.select(container)
    .append('div')
    .attr('class', 'graph-tooltip')
    .style('opacity', 0);

  node.on('mouseenter', (event, d) => {
    tooltip.transition().duration(150).style('opacity', 1);
    tooltip.html(`<strong>${d.name}</strong><br/><em>${d.type}</em><br/>${d.description}`)
      .style('left', `${event.offsetX + 15}px`)
      .style('top', `${event.offsetY - 10}px`);

    link.classed('highlighted', (l) => l.source.id === d.id || l.target.id === d.id);
    linkLabel.classed('highlighted', (l) => l.source.id === d.id || l.target.id === d.id);
    node.classed('dimmed', (n) => {
      if (n.id === d.id) return false;
      return !links.some((l) =>
        (l.source.id === d.id && l.target.id === n.id) ||
        (l.target.id === d.id && l.source.id === n.id)
      );
    });
  });

  node.on('mouseleave', () => {
    tooltip.transition().duration(150).style('opacity', 0);
    link.classed('highlighted', false);
    linkLabel.classed('highlighted', false);
    node.classed('dimmed', false);
  });

  simulation.on('tick', () => {
    link
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y);
    linkLabel
      .attr('x', (d) => (d.source.x + d.target.x) / 2)
      .attr('y', (d) => (d.source.y + d.target.y) / 2);
    node.attr('transform', (d) => `translate(${d.x},${d.y})`);
  });

  svg.on('click', () => {
    link.classed('highlighted', false);
    node.classed('dimmed', false);
  });

  return { svg, simulation };
}

function drag(simulation) {
  return d3.drag()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on('drag', (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });
}
