/* Shared SVG layers for the Ink and wash terrain preview. Classic script for offline use. */
const InkAndWashTerrain = (() => {
  const svgNamespace = 'http://www.w3.org/2000/svg';

  function append(parent, tag, attributes = {}) {
    const element = document.createElementNS(svgNamespace, tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    parent.append(element);
    return element;
  }

  function drawImage(parent, href, attributes) {
    const image = append(parent, 'image', attributes);
    image.addEventListener('error', () => image.remove(), { once: true });
    image.setAttribute('href', href);
    return image;
  }

  function textureLayer(parent, bounds, color, texture, mask) {
    const group = append(parent, 'g', mask ? { mask } : {});
    append(group, 'rect', { ...bounds, fill: color });
    if (texture) {
      drawImage(group, texture, { ...bounds, preserveAspectRatio: 'xMidYMid slice' });
    }
  }

  function renderShoreline(svg, rows, {
    tileSize = 42,
    isLand = tile => tile !== '~',
    grassTexture,
    waterTexture,
  } = {}) {
    const prefix = svg.id;
    const columns = rows[0]?.length;
    if (!prefix || !columns || rows.some(row => row.length !== columns)) {
      throw new Error('Shoreline requires a named SVG and a nonempty rectangular tile grid.');
    }

    const width = columns * tileSize + tileSize / 2;
    const height = rows.length * tileSize;
    const bounds = { x: 0, y: 0, width, height };
    const tileOrigin = (column, row) => ({
      x: column * tileSize + (Math.abs(row) % 2) * tileSize / 2,
      y: row * tileSize,
    });

    const defs = append(svg, 'defs');
    const land = append(defs, 'g', { id: prefix + '-land-cells' });
    // The sample is a crop. Extend edge land behind the frame so the sand does not run along its border.
    for (let row = -1; row <= rows.length; row += 1) {
      const sourceRow = Math.max(0, Math.min(row, rows.length - 1));
      const source = rows[sourceRow];
      for (let column = 0; column < columns; column += 1) {
        if (!isLand(source[column])) continue;
        append(land, 'rect', {
          x: tileOrigin(column, sourceRow).x,
          y: row * tileSize,
          width: column === columns - 1 ? tileSize * 2 : tileSize,
          height: tileSize,
        });
      }
    }

    const padding = tileSize * 2;
    const filterBounds = { x: -padding, y: -padding, width: width + padding * 2, height: height + padding * 2 };
    function roundedMask(name, expansion) {
      const filterId = prefix + '-' + name + '-filter';
      const maskId = prefix + '-' + name;
      const filter = append(defs, 'filter', {
        ...filterBounds, id: filterId, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB',
      });
      if (expansion) append(filter, 'feMorphology', { in: 'SourceAlpha', operator: 'dilate', radius: expansion });
      append(filter, 'feGaussianBlur', { stdDeviation: tileSize / 6.5 });
      const transfer = append(filter, 'feComponentTransfer');
      append(transfer, 'feFuncA', { type: 'linear', slope: 7, intercept: -3 });
      const mask = append(defs, 'mask', {
        ...filterBounds, id: maskId, 'mask-type': 'alpha', maskUnits: 'userSpaceOnUse',
      });
      append(mask, 'use', { href: '#' + land.id, filter: 'url(#' + filterId + ')' });
      return 'url(#' + maskId + ')';
    }

    const shallowsMask = roundedMask('shallows', tileSize * .16);
    const sandMask = roundedMask('sand', tileSize * .075);
    const landMask = roundedMask('land', 0);
    textureLayer(svg, bounds, '#568392', waterTexture);
    textureLayer(svg, bounds, '#78a5a8', null, shallowsMask);
    textureLayer(svg, bounds, '#e4cea2', null, sandMask);
    textureLayer(svg, bounds, '#a6b282', grassTexture, landMask);
    return { bounds, defs, landMask, shallowsMask, tileOrigin };
  }

  function drawRiver(parent, path, landMask) {
    const river = append(parent, 'g', {
      fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      ...(landMask ? { mask: landMask } : {}),
    });
    append(river, 'path', { d: path, stroke: '#687d77', 'stroke-width': 7.5 });
    append(river, 'path', { d: path, stroke: '#88aeb2', 'stroke-width': 5.2 });
    append(river, 'path', { d: path, stroke: '#c2d0bf', 'stroke-width': 1.1 });
    return river;
  }

  return { append, drawImage, renderShoreline, drawRiver };
})();
