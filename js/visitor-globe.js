(function () {
  'use strict';

  const canvas = document.getElementById('visitor-globe');
  const panel = document.getElementById('visitor-globe-panel');
  const tooltip = document.getElementById('visitor-globe-tooltip');
  const totalLabel = document.getElementById('visitor-total');
  const countryLabel = document.getElementById('visitor-country-total');
  const visitorWordLabel = document.getElementById('visitor-label');
  const countryWordLabel = document.getElementById('visitor-country-label');

  if (!canvas || !panel) return;

  const context = canvas.getContext('2d');
  const toRadians = Math.PI / 180;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const landmasses = [
    [[-168, 72], [-148, 68], [-137, 59], [-128, 52], [-124, 43], [-117, 33], [-106, 25], [-97, 19], [-88, 20], [-81, 27], [-78, 35], [-72, 43], [-61, 51], [-59, 59], [-75, 67], [-96, 72], [-125, 74], [-150, 72]],
    [[-74, 60], [-58, 59], [-44, 66], [-30, 75], [-42, 82], [-61, 82], [-72, 73]],
    [[-81, 12], [-72, 8], [-64, -2], [-59, -14], [-55, -25], [-60, -39], [-68, -54], [-75, -47], [-77, -30], [-80, -12]],
    [[-10, 36], [-9, 45], [3, 52], [18, 56], [31, 62], [48, 68], [72, 72], [98, 69], [122, 63], [147, 60], [171, 52], [179, 45], [165, 40], [147, 41], [132, 34], [122, 27], [113, 20], [105, 9], [95, 8], [87, 21], [76, 24], [68, 22], [59, 27], [48, 30], [39, 36], [28, 39], [17, 38], [7, 36]],
    [[-17, 35], [-4, 37], [11, 33], [25, 31], [35, 22], [43, 11], [48, -3], [41, -15], [33, -28], [23, -35], [12, -34], [3, -25], [-5, -10], [-11, 5], [-16, 20]],
    [[65, 24], [76, 8], [82, 7], [88, 22], [80, 29]],
    [[96, 20], [108, 18], [118, 8], [128, 2], [137, -5], [127, -10], [115, -5], [105, 2]],
    [[113, -22], [124, -14], [139, -18], [153, -28], [149, -39], [133, -43], [117, -35]],
    [[130, 33], [136, 36], [142, 43], [146, 44], [143, 34], [137, 31]],
    [[166, -35], [174, -39], [178, -45], [170, -47], [165, -42]]
  ];

  let markers = [];
  let markerPositions = [];
  let colors = {};
  let size = 460;
  let radius = 190;
  let center = 230;
  let centerLongitude = -25 * toRadians;
  let centerLatitude = 12 * toRadians;
  let dragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let lastFrame = performance.now();
  let globeVisible = true;

  function readColors() {
    const style = getComputedStyle(document.documentElement);
    colors = {
      panel: style.getPropertyValue('--bg-soft').trim(),
      ocean: style.getPropertyValue('--surface-strong').trim(),
      grid: style.getPropertyValue('--line-strong').trim(),
      land: style.getPropertyValue('--link').trim(),
      outline: style.getPropertyValue('--ink-soft').trim(),
      marker: style.getPropertyValue('--accent').trim(),
      markerRing: style.getPropertyValue('--surface-strong').trim()
    };
  }

  function resizeCanvas() {
    size = Math.max(260, Math.round(panel.getBoundingClientRect().width));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * pixelRatio);
    canvas.height = Math.round(size * pixelRatio);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    center = size / 2;
    radius = size * 0.405;
    drawGlobe(performance.now());
  }

  function project(longitude, latitude) {
    const lambda = longitude * toRadians - centerLongitude;
    const phi = latitude * toRadians;
    const cosinePhi = Math.cos(phi);
    const cosineLatitude = Math.cos(centerLatitude);
    const sineLatitude = Math.sin(centerLatitude);
    const cosineLambda = Math.cos(lambda);
    const depth = sineLatitude * Math.sin(phi) + cosineLatitude * cosinePhi * cosineLambda;

    return {
      x: center + radius * cosinePhi * Math.sin(lambda),
      y: center - radius * (cosineLatitude * Math.sin(phi) - sineLatitude * cosinePhi * cosineLambda),
      depth
    };
  }

  function drawLine(points) {
    let drawing = false;
    context.beginPath();
    points.forEach(([longitude, latitude]) => {
      const point = project(longitude, latitude);
      if (point.depth > 0.005) {
        if (drawing) context.lineTo(point.x, point.y);
        else context.moveTo(point.x, point.y);
        drawing = true;
      } else {
        drawing = false;
      }
    });
    context.stroke();
  }

  function drawGrid() {
    context.strokeStyle = colors.grid;
    context.lineWidth = 0.8;
    context.globalAlpha = 0.72;

    for (let latitude = -60; latitude <= 60; latitude += 30) {
      const points = [];
      for (let longitude = -180; longitude <= 180; longitude += 4) {
        points.push([longitude, latitude]);
      }
      drawLine(points);
    }

    for (let longitude = -150; longitude <= 180; longitude += 30) {
      const points = [];
      for (let latitude = -90; latitude <= 90; latitude += 3) {
        points.push([longitude, latitude]);
      }
      drawLine(points);
    }
  }

  function drawLand() {
    context.fillStyle = colors.land;
    context.strokeStyle = colors.land;
    context.lineWidth = 1.15;

    landmasses.forEach((landmass) => {
      const visiblePoints = landmass
        .map(([longitude, latitude]) => project(longitude, latitude))
        .filter((point) => point.depth > 0.015);

      if (visiblePoints.length < 3) return;
      context.beginPath();
      context.moveTo(visiblePoints[0].x, visiblePoints[0].y);
      visiblePoints.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.closePath();
      context.globalAlpha = 0.17;
      context.fill();
      context.globalAlpha = 0.78;
      context.stroke();
    });
  }

  function drawMarkers(timestamp) {
    markerPositions = [];
    const pulse = reducedMotion ? 0.5 : (Math.sin(timestamp / 520) + 1) / 2;

    markers.forEach((marker) => {
      const point = project(marker.longitude, marker.latitude);
      if (point.depth <= 0.04) return;

      const markerRadius = 3.3 + Math.min(4.5, Math.log2(marker.visitors + 1));
      context.globalAlpha = 0.3 * point.depth * (0.7 + pulse * 0.3);
      context.beginPath();
      context.arc(point.x, point.y, markerRadius + 4 + pulse * 2, 0, Math.PI * 2);
      context.fillStyle = colors.marker;
      context.fill();

      context.globalAlpha = 1;
      context.beginPath();
      context.arc(point.x, point.y, markerRadius, 0, Math.PI * 2);
      context.fillStyle = colors.marker;
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = colors.markerRing;
      context.stroke();

      markerPositions.push({ ...marker, x: point.x, y: point.y, radius: markerRadius + 8 });
    });
  }

  function drawGlobe(timestamp) {
    context.clearRect(0, 0, size, size);
    context.fillStyle = colors.panel;
    context.fillRect(0, 0, size, size);

    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.fillStyle = colors.ocean;
    context.fill();

    context.save();
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.clip();
    drawGrid();
    drawLand();
    drawMarkers(timestamp);
    context.restore();

    context.globalAlpha = 1;
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.strokeStyle = colors.outline;
    context.lineWidth = 1.7;
    context.stroke();
  }

  function animate(timestamp) {
    const elapsed = Math.min(40, timestamp - lastFrame);
    lastFrame = timestamp;
    if (globeVisible) {
      if (!dragging && !reducedMotion) centerLongitude += elapsed * 0.000025;
      drawGlobe(timestamp);
    }
    window.requestAnimationFrame(animate);
  }

  function hideTooltip() {
    if (tooltip) tooltip.hidden = true;
  }

  function updateTooltip(event) {
    if (!tooltip || dragging) return;
    const bounds = canvas.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;
    const pointerY = event.clientY - bounds.top;
    let closest = null;
    let closestDistance = Infinity;

    markerPositions.forEach((marker) => {
      const distance = Math.hypot(marker.x - pointerX, marker.y - pointerY);
      if (distance < marker.radius && distance < closestDistance) {
        closest = marker;
        closestDistance = distance;
      }
    });

    if (!closest) {
      hideTooltip();
      return;
    }

    const visitorWord = closest.visitors === 1 ? 'visitor' : 'visitors';
    tooltip.textContent = `${closest.name} · ${closest.visitors.toLocaleString()} ${visitorWord}`;
    tooltip.style.left = `${Math.min(size - 200, Math.max(8, pointerX + 12))}px`;
    tooltip.style.top = `${Math.max(8, pointerY - 36)}px`;
    tooltip.hidden = false;
  }

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    hideTooltip();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) {
      updateTooltip(event);
      return;
    }

    const deltaX = event.clientX - lastPointerX;
    const deltaY = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    centerLongitude -= deltaX * 0.008;
    centerLatitude = Math.max(-1.15, Math.min(1.15, centerLatitude + deltaY * 0.006));
  });

  canvas.addEventListener('pointerup', (event) => {
    dragging = false;
    canvas.releasePointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointercancel', () => {
    dragging = false;
  });

  canvas.addEventListener('pointerleave', hideTooltip);

  canvas.addEventListener('keydown', (event) => {
    const rotationStep = 10 * toRadians;
    if (event.key === 'ArrowLeft') centerLongitude -= rotationStep;
    else if (event.key === 'ArrowRight') centerLongitude += rotationStep;
    else if (event.key === 'ArrowUp') centerLatitude = Math.min(1.15, centerLatitude + rotationStep);
    else if (event.key === 'ArrowDown') centerLatitude = Math.max(-1.15, centerLatitude - rotationStep);
    else return;
    event.preventDefault();
    drawGlobe(performance.now());
  });

  fetch('data/visitor-map.json', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error('Visitor data is unavailable.');
      return response.json();
    })
    .then((data) => {
      markers = Array.isArray(data.countries)
        ? data.countries.filter((country) => Number.isFinite(country.latitude) && Number.isFinite(country.longitude))
        : [];
      const totalVisitors = Number(data.totalVisitors) || markers.reduce((sum, country) => sum + (Number(country.visitors) || 0), 0);
      if (totalLabel) totalLabel.textContent = totalVisitors.toLocaleString();
      if (countryLabel) countryLabel.textContent = markers.length.toLocaleString();
      if (visitorWordLabel) visitorWordLabel.textContent = totalVisitors === 1 ? 'visitor' : 'visitors';
      if (countryWordLabel) countryWordLabel.textContent = markers.length === 1 ? 'country' : 'countries';
      canvas.setAttribute('aria-label', `Interactive globe showing ${totalVisitors} visitors from ${markers.length} countries. Drag or use the arrow keys to rotate.`);
      drawGlobe(performance.now());
    })
    .catch(() => {
      if (totalLabel) totalLabel.textContent = '—';
      if (countryLabel) countryLabel.textContent = '—';
    });

  readColors();
  resizeCanvas();

  new ResizeObserver(resizeCanvas).observe(panel);
  new MutationObserver(() => {
    readColors();
    drawGlobe(performance.now());
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      globeVisible = entries[0].isIntersecting;
    }, { rootMargin: '120px' }).observe(panel);
  }

  window.requestAnimationFrame(animate);
}());
