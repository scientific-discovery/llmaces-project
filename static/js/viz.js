/* ==========================================================================
   viz.js - a small chart kit for the project page, built on D3 v7.

   VIZ.hPanels    horizontal small multiples (dot / bar / box / multi-dot rows)
   VIZ.lineChart  multi-series lines with a snapping crosshair
   VIZ.scatter    labelled scatter with nearest-point hover
   VIZ.table      the data-table twin rendered under every chart
   VIZ.segmented  button-group control

   Every mark answers hover and keyboard focus with the same tooltip, and every
   chart re-renders when its container changes width.
   ========================================================================== */
(function () {
  'use strict';

  var VIZ = (window.VIZ = {});

  /* ---------- colors (mirrors the CSS custom properties) ---------- */
  VIZ.color = {
    ours: '#2a78d6',
    oursDark: '#1c5cab',
    s2: '#eb6834',
    s3: '#1baf7a',
    s4: '#eda100',
    baseMark: '#8190a5',
    baseBar: '#b4bdca',
    ink1: '#1e293b',
    ink2: '#475569',
    ink3: '#64748b',
    grid: '#edf0f4',
    axis: '#c5ccd6'
  };

  /* ---------- number formatting ---------- */
  var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

  function sup(s) {
    return String(s).replace(/[-0-9]/g, function (c) { return SUP[c]; });
  }
  VIZ.sup = sup;

  VIZ.pow10 = function (e) { return '10' + sup(e); };

  /* 1.33e-17 -> "1.33×10⁻¹⁷"; moderate magnitudes stay plain. */
  VIZ.sci = function (v, digits) {
    /* digits must be a number: formatters are also called as fmt(value, row) */
    if (typeof digits !== 'number') digits = 2;
    if (v === null || v === undefined || !isFinite(v)) return '—';
    if (v === 0) return '0';
    var e = Math.floor(Math.log10(Math.abs(v)));
    if (e >= -2 && e <= 3) {
      var p = Math.max(0, digits - e);
      return (+v.toFixed(Math.min(p, 4))).toString();
    }
    var m = v / Math.pow(10, e);
    var ms = m.toFixed(digits);
    if (parseFloat(ms) >= 10) { e += 1; ms = (m / 10).toFixed(digits); }
    return ms + '×10' + sup(e);
  };

  /* A value given as log10 -> formatted number. */
  VIZ.sciFromLog = function (lv, digits) { return VIZ.sci(Math.pow(10, lv), typeof digits === 'number' ? digits : 1); };

  /* Write a formatted number into an HTML element, turning unicode superscripts into <sup>
     (the web subset of Inter lacks superscript 4-9, which would fall back to another font). */
  var UNSUP = { '\u207b': '\u2212', '\u2070': '0', '\u00b9': '1', '\u00b2': '2', '\u00b3': '3', '\u2074': '4',
    '\u2075': '5', '\u2076': '6', '\u2077': '7', '\u2078': '8', '\u2079': '9' };
  VIZ.fillNum = function (el, str) {
    el.replaceChildren();
    String(str).split(/([\u207b\u2070\u00b9\u00b2\u00b3\u2074-\u2079]+)/).forEach(function (part, i) {
      if (!part) return;
      if (i % 2 === 1) {
        var sp = document.createElement('sup');
        sp.textContent = part.replace(/./g, function (c) { return UNSUP[c] || c; });
        el.appendChild(sp);
      } else {
        el.appendChild(document.createTextNode(part));
      }
    });
  };

  VIZ.pct = function (v, digits) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    return v.toFixed(digits === undefined ? 1 : digits) + '%';
  };

  /* ---------- tooltip (one per page) ---------- */
  var tipEl = null;

  function tipNode() {
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'viz-tip';
      tipEl.setAttribute('role', 'status');
      tipEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }

  /* rows: [{value, label, color, current}] - value leads, label follows. */
  VIZ.showTip = function (anchor, title, rows, note) {
    var t = tipNode();
    t.replaceChildren();
    if (title) {
      var h = document.createElement('div');
      h.className = 'viz-tip-title';
      h.textContent = title;
      t.appendChild(h);
    }
    (rows || []).forEach(function (r) {
      var line = document.createElement('div');
      line.className = 'viz-tip-row' + (r.current ? ' is-current' : '');
      if (r.color) {
        var k = document.createElement('span');
        k.className = 'viz-tip-key';
        k.style.color = r.color;
        line.appendChild(k);
      }
      var v = document.createElement('span');
      v.className = 'viz-tip-val';
      VIZ.fillNum(v, r.value);
      line.appendChild(v);
      if (r.label) {
        var l = document.createElement('span');
        l.className = 'viz-tip-lab';
        l.textContent = r.label;
        line.appendChild(l);
      }
      t.appendChild(line);
    });
    if (note) {
      var n = document.createElement('div');
      n.className = 'viz-tip-note';
      n.textContent = note;
      t.appendChild(n);
    }
    t.classList.add('is-on');
    tipAnchor = (anchor && anchor.clientX === undefined && anchor.getBoundingClientRect) ? anchor : null;
    placeTip(anchor);
  };

  var tipAnchor = null;

  function placeTip(anchor) {
    var t = tipNode();
    var x, y;
    if (anchor && anchor.clientX !== undefined) {
      x = anchor.clientX + 16;
      y = anchor.clientY + 16;
    } else if (anchor && anchor.getBoundingClientRect) {
      var r = anchor.getBoundingClientRect();
      x = r.left + Math.min(r.width, 60);
      y = r.bottom + 8;
    } else {
      x = 20; y = 20;
    }
    var tw = t.offsetWidth, th = t.offsetHeight;
    var vw = window.innerWidth, vh = window.innerHeight;
    if (x + tw > vw - 8) x = Math.max(8, (anchor && anchor.clientX !== undefined ? anchor.clientX - tw - 16 : vw - tw - 8));
    if (y + th > vh - 8) y = Math.max(8, (anchor && anchor.clientY !== undefined ? anchor.clientY - th - 16 : vh - th - 8));
    t.style.left = x + 'px';
    t.style.top = y + 'px';
  }

  VIZ.hideTip = function () {
    tipAnchor = null;
    if (tipEl) tipEl.classList.remove('is-on');
  };

  /* pointer tooltips close on scroll; keyboard-focus tooltips follow their element */
  window.addEventListener('scroll', function () {
    if (tipAnchor && document.activeElement === tipAnchor) placeTip(tipAnchor);
    else VIZ.hideTip();
  }, { passive: true });

  /* ---------- responsive mount ---------- */
  VIZ.mount = function (el, render) {
    var lastW = 0;
    function draw(force) {
      var w = Math.floor(el.clientWidth);
      if (!w || (!force && w === lastW)) return;
      lastW = w;
      el.replaceChildren();
      render(el, w);
    }
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { draw(false); });
      ro.observe(el);
    } else {
      window.addEventListener('resize', function () { draw(false); });
    }
    draw(true);
    /* text is measured while laying out; redraw once the web font has arrived */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(true); });
    return { redraw: function () { draw(true); } };
  };

  /* ---------- segmented control ---------- */
  VIZ.segmented = function (el, options, value, onChange) {
    el.classList.add('seg');
    el.setAttribute('role', 'group');
    var buttons = options.map(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.label;
      b.setAttribute('aria-pressed', String(o.value === value));
      b.addEventListener('click', function () {
        buttons.forEach(function (bb) { bb.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        onChange(o.value);
      });
      el.appendChild(b);
      return b;
    });
    return {
      set: function (v) {
        options.forEach(function (o, i) { buttons[i].setAttribute('aria-pressed', String(o.value === v)); });
      }
    };
  };

  /* ---------- legend ---------- */
  VIZ.legend = function (el, items) {
    el.classList.add('viz-legend');
    el.replaceChildren();
    items.forEach(function (it) {
      var s = document.createElement('span');
      var k = document.createElement('i');
      k.className = it.shape === 'dot' ? 'key-dot' : it.shape === 'rect' ? 'key-rect' : 'key-line';
      if (it.shape === 'dot' || it.shape === 'rect') k.style.background = it.color;
      else k.style.color = it.color;
      s.appendChild(k);
      s.appendChild(document.createTextNode(it.label));
      el.appendChild(s);
    });
  };

  /* ---------- log-axis ticks with superscripts ---------- */
  function logTicks(domain, maxTicks) {
    var lo = Math.ceil(Math.log10(domain[0]) - 1e-9);
    var hi = Math.floor(Math.log10(domain[1]) + 1e-9);
    var span = hi - lo;
    var step = Math.max(1, Math.ceil(span / Math.max(1, maxTicks - 1)));
    var cands = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
    for (var i = 0; i < cands.length; i++) { if (cands[i] >= step) { step = cands[i]; break; } }
    var out = [];
    var start = Math.ceil(lo / step) * step;
    for (var e = start; e <= hi; e += step) out.push(e);
    if (!out.length) out.push(lo);
    return out;
  }
  VIZ.logTicks = logTicks;

  function appendPowText(sel, e) {
    sel.text('');
    sel.append('tspan').text('10');
    sel.append('tspan').attr('dy', '-0.45em').attr('font-size', '0.78em').text(String(e).replace('-', '−'));
  }
  VIZ.appendPowText = appendPowText;

  function rounded(x0, x1, y, h, r) {
    /* bar with a rounded data-end (right side), square at the baseline */
    var w = x1 - x0;
    if (w <= 0) return '';
    r = Math.min(r, w, h / 2);
    return 'M' + x0 + ',' + y +
      'H' + (x1 - r) +
      'Q' + x1 + ',' + y + ' ' + x1 + ',' + (y + r) +
      'V' + (y + h - r) +
      'Q' + x1 + ',' + (y + h) + ' ' + (x1 - r) + ',' + (y + h) +
      'H' + x0 + 'Z';
  }

  function textWidth(str, font) {
    var c = textWidth.c || (textWidth.c = document.createElement('canvas').getContext('2d'));
    c.font = font || '12px Inter, sans-serif';
    return c.measureText(str).width;
  }
  VIZ.textWidth = textWidth;

  /* =====================================================================
     hPanels - rows of methods against one or more horizontal panels.
     cfg = {
       rows:   [{key, label, group, hl}],
       groups: {groupKey: 'Header text'}          (optional)
       panels: [{title, sub, scale:'log'|'linear', domain:[a,b], ticks, tickFormat,
                 mark:'dot'|'bar'|'box'|'multidot', get:row=>value, err:row=>number,
                 fmt:v=>string, axisTitle, annotate:(g, ctx)=>void}],
       series: [{key,label,color}]              (multidot only)
       labelWidth, rowHeight, minPanelWidth, tipTitle(row), tipNote(row, panel)
     }
     ===================================================================== */
  VIZ.hPanels = function (el, cfg) {
    return VIZ.mount(el, function (host, W) { renderHPanels(host, W, cfg); });
  };

  function renderHPanels(host, W, cfg) {
    var C = VIZ.color;
    var rows = cfg.rows;
    var panels = cfg.panels;
    var n = panels.length;
    var labelW = Math.min(cfg.labelWidth || 170, Math.max(110, W * (W < 520 ? 0.42 : 0.36)));
    var rowH = cfg.rowHeight || 26;
    var groupH = cfg.groups ? 24 : 0;
    var gap = 28;
    var minPW = cfg.minPanelWidth || 210;
    var sideBySide = n === 1 || (W - labelW - gap * (n - 1)) / n >= minPW;
    var titleH = panels.some(function (p) { return p.sub; }) ? 42 : (panels.some(function (p) { return p.title; }) ? 26 : 6);
    var axisH = panels.some(function (p) { return p.axisTitle; }) ? 44 : 26;
    var rightPad = cfg.rightPad !== undefined ? cfg.rightPad : 16;

    /* vertical layout of rows (with group headers) */
    var layout = [];
    var y = 0, lastGroup = null;
    rows.forEach(function (r) {
      if (cfg.groups && r.group !== lastGroup) {
        if (cfg.groups[r.group]) {
          layout.push({ header: cfg.groups[r.group], y: y + (lastGroup === null ? 4 : 10) });
          y += groupH + (lastGroup === null ? 0 : 6);
        }
        lastGroup = r.group;
      }
      layout.push({ row: r, y: y + rowH / 2 });
      y += rowH;
    });
    var bodyH = y;
    var yOf = {};
    layout.forEach(function (l) { if (l.row) yOf[l.row.key] = l.y; });

    var groupsToDraw = sideBySide ? [panels.map(function (p, i) { return i; })] : panels.map(function (p, i) { return [i]; });

    groupsToDraw.forEach(function (idxs, gi) {
      var pw = sideBySide ? (W - labelW - gap * (idxs.length - 1) - rightPad) / idxs.length : W - labelW - rightPad;
      var H = titleH + bodyH + axisH;
      var svg = d3.select(host).append('svg')
        .attr('width', W).attr('height', H)
        .attr('role', 'img')
        .attr('aria-label', cfg.ariaLabel || 'Chart');
      if (!sideBySide && gi > 0) svg.style('margin-top', '18px');

      var body = svg.append('g').attr('transform', 'translate(0,' + titleH + ')');
      var bands = body.append('g');

      /* row labels + group headers */
      var lab = body.append('g');
      layout.forEach(function (l) {
        if (l.header) {
          lab.append('text').attr('class', 'group-label').attr('x', 0).attr('y', l.y + 8).text(l.header);
          if (!sideBySide || true) {
            body.append('line').attr('class', 'gridline')
              .attr('x1', 0).attr('x2', W - rightPad)
              .attr('y1', l.y - 2).attr('y2', l.y - 2)
              .style('display', l.y < 6 ? 'none' : null);
          }
        } else {
          var t = lab.append('text')
            .attr('class', 'row-label' + (l.row.hl ? ' is-hl' : ''))
            .attr('x', labelW - 12).attr('y', l.y).attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .text(l.row.label);
          if (l.row.short && t.node().getComputedTextLength() > labelW - 16) t.text(l.row.short);
          fitText(t.node(), labelW - 16);
        }
      });

      idxs.forEach(function (pi, k) {
        var p = panels[pi];
        var x0 = labelW + k * (pw + gap);
        var x1 = x0 + pw;
        var xs = (p.scale === 'log' ? d3.scaleLog() : d3.scaleLinear()).domain(p.domain).range([x0, x1]).clamp(true);
        var g = body.append('g');

        /* title */
        if (p.title) {
          svg.append('text').attr('class', 'panel-title').attr('x', x0).attr('y', 14).text(p.title);
        }
        if (p.sub) {
          var st = svg.append('text').attr('class', 'panel-sub').attr('x', x0).attr('y', 31).text(p.sub);
          fitText(st.node(), pw);
        }

        /* gridlines + axis */
        var ticks = p.ticks || (p.scale === 'log'
          ? logTicks(p.domain, Math.max(3, Math.floor(pw / 58))).map(function (e) { return Math.pow(10, e); })
          : xs.ticks(Math.max(3, Math.floor(pw / 70))));
        ticks.forEach(function (tv) {
          var tx = xs(tv);
          g.append('line').attr('class', 'gridline').attr('x1', tx).attr('x2', tx).attr('y1', -4).attr('y2', bodyH + 2);
          var tt = g.append('text').attr('class', 'axis-text').attr('x', tx).attr('y', bodyH + 17).attr('text-anchor', 'middle');
          if (p.tickFormat) tt.text(p.tickFormat(tv));
          else if (p.scale === 'log') appendPowText(tt, Math.round(Math.log10(tv)));
          else tt.text(d3.format('~g')(tv));
        });
        g.append('line').attr('class', 'axisline').attr('x1', x0).attr('x2', x1).attr('y1', bodyH + 2).attr('y2', bodyH + 2);
        if (p.axisTitle) {
          g.append('text').attr('class', 'axis-title').attr('x', (x0 + x1) / 2).attr('y', bodyH + 36)
            .attr('text-anchor', 'middle').text(p.axisTitle);
        }
        if (p.refLine !== undefined) {
          var rx = xs(p.refLine.value);
          g.append('line').attr('x1', rx).attr('x2', rx).attr('y1', -6).attr('y2', bodyH + 2)
            .attr('stroke', p.refLine.color || C.ink3).attr('stroke-width', 1.25);
          if (p.refLine.label) {
            g.append('text').attr('class', 'annot-muted').attr('x', rx + 4).attr('y', -8).text(p.refLine.label);
          }
        }

        /* marks */
        var marks = g.append('g');
        layout.forEach(function (l) {
          if (!l.row) return;
          var r = l.row;
          var v = p.get(r);
          if (v === null || v === undefined) return;
          drawMark(marks, p, xs, r, l.y, v, rowH, x0, x1, cfg);
        });

        if (p.annotate) p.annotate(g, { x: xs, yOf: yOf, x0: x0, x1: x1, bodyH: bodyH, rowH: rowH });

        /* hit targets: a band per row per panel */
        layout.forEach(function (l) {
          if (!l.row) return;
          var r = l.row;
          var band = bands.append('rect').attr('class', 'row-band')
            .attr('x', sideBySide ? 0 : 0).attr('width', W - rightPad + 8)
            .attr('y', l.y - rowH / 2).attr('height', rowH);
          var hit = body.append('rect').attr('class', 'hit')
            .attr('x', k === 0 ? 0 : x0 - gap / 2).attr('width', (k === 0 ? x1 : pw + gap) + (k === idxs.length - 1 ? rightPad : 0))
            .attr('y', l.y - rowH / 2).attr('height', rowH)
            .attr('tabindex', k === 0 ? 0 : -1)
            .attr('aria-label', r.label);
          var show = function (ev) {
            bands.selectAll('.row-band').classed('is-hover', false);
            band.classed('is-hover', true);
            var tipRows;
            if (p.mark === 'multidot' && cfg.series) {
              var mv = p.get(r);
              tipRows = cfg.series.map(function (s) {
                return { value: p.fmt ? p.fmt(mv[s.key]) : String(mv[s.key]), label: s.label, color: s.color, v: mv[s.key] };
              }).sort(function (a, b) { return b.v - a.v; });
            } else {
              tipRows = panels.map(function (pp, j) {
                var vv = pp.get(r);
                return {
                  value: vv === null || vv === undefined ? '—' : pp.tipValue ? pp.tipValue(vv, r) : pp.fmt ? pp.fmt(vv, r) : String(vv),
                  label: pp.tipLabel || pp.title || '',
                  current: j === pi
                };
              });
            }
            var title = cfg.tipTitle ? cfg.tipTitle(r) : r.label;
            var note = cfg.tipNote ? cfg.tipNote(r, p) : null;
            VIZ.showTip(ev, title, tipRows, note);
          };
          hit.on('pointerenter pointermove', show)
            .on('pointerleave', function () { band.classed('is-hover', false); VIZ.hideTip(); })
            .on('focus', function () { show(this); })
            .on('blur', function () { band.classed('is-hover', false); VIZ.hideTip(); });
        });
      });
    });
  }

  function fitText(node, maxW) {
    if (!node || !node.getComputedTextLength) return;
    var txt = node.textContent;
    if (node.getComputedTextLength() <= maxW) return;
    var full = txt;
    while (txt.length > 3 && node.getComputedTextLength() > maxW) {
      txt = txt.slice(0, -1);
      node.textContent = txt + '…';
    }
    var title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = full;
    node.appendChild(title);
  }

  function drawMark(g, p, xs, r, cy, v, rowH, x0, x1, cfg) {
    var C = VIZ.color;
    var hl = !!r.hl;
    if (p.mark === 'dot') {
      if (p.guide !== false) {
        g.append('line').attr('x1', x0).attr('x2', x1).attr('y1', cy).attr('y2', cy)
          .attr('stroke', C.grid).attr('stroke-width', 1);
      }
      g.append('circle').attr('cx', xs(v)).attr('cy', cy).attr('r', hl ? 6.5 : 5)
        .attr('fill', hl ? (r.color || C.ours) : C.baseMark)
        .attr('stroke', '#fff').attr('stroke-width', 2);
      if (p.labelHl && hl) {
        g.append('text').attr('class', 'value-label is-hl').attr('x', xs(v) - 11).attr('y', cy)
          .attr('dy', '0.35em').attr('text-anchor', 'end').text(p.fmt ? p.fmt(v, r) : v);
      }
    } else if (p.mark === 'bar') {
      var bh = Math.min(16, rowH * 0.62);
      var base = p.scale === 'log' ? p.domain[0] : Math.max(0, p.domain[0]);
      var xb = xs(base), xv = xs(v);
      var path = rounded(xb, Math.max(xb + (v > base ? 1.5 : 0), xv), cy - bh / 2, bh, 4);
      if (path) {
        g.append('path').attr('d', path).attr('fill', hl ? (r.color || C.ours) : (r.barColor || C.baseBar));
      }
      var e = p.err ? p.err(r) : null;
      if (e) {
        var ea = xs(Math.max(p.domain[0], v - e)), eb = xs(Math.min(p.domain[1], v + e));
        g.append('line').attr('x1', ea).attr('x2', eb).attr('y1', cy).attr('y2', cy).attr('stroke', C.ink1).attr('stroke-width', 1.25);
        if (eb - ea >= 8) {
          /* caps only when the interval is wide enough to read as one */
          g.append('line').attr('x1', ea).attr('x2', ea).attr('y1', cy - 4).attr('y2', cy + 4).attr('stroke', C.ink1).attr('stroke-width', 1.25);
          g.append('line').attr('x1', eb).attr('x2', eb).attr('y1', cy - 4).attr('y2', cy + 4).attr('stroke', C.ink1).attr('stroke-width', 1.25);
        }
      }
      if (p.valueLabels !== false) {
        var lx = Math.max(xv, e ? xs(Math.min(p.domain[1], v + e)) : xv) + 6;
        var label = p.fmt ? p.fmt(v, r) : String(v);
        var room = x1 + (cfg.rightPad || 16) - lx;
        var tw = textWidth(label, (hl ? '700 ' : '') + '11.5px Inter, sans-serif');
        if (tw > room) {
          /* no room past the tip: set the label inside the bar when it fits, else leave it to the tooltip/table */
          if (xv - xb > tw + 12 && !e) {
            g.append('text').attr('class', 'value-label').attr('x', xv - 6).attr('y', cy).attr('dy', '0.35em')
              .attr('text-anchor', 'end').style('fill', hl ? '#fff' : C.ink1).text(label);
          }
        } else {
          g.append('text').attr('class', 'value-label' + (hl ? ' is-hl' : '')).attr('x', lx).attr('y', cy)
            .attr('dy', '0.35em').text(label);
        }
      }
    } else if (p.mark === 'box') {
      var col = hl ? C.ours : C.baseMark;
      var bh2 = Math.min(14, rowH * 0.56);
      g.append('line').attr('x1', xs(v.wlo)).attr('x2', xs(v.whi)).attr('y1', cy).attr('y2', cy).attr('stroke', col).attr('stroke-width', 1.25);
      [v.wlo, v.whi].forEach(function (w) {
        g.append('line').attr('x1', xs(w)).attr('x2', xs(w)).attr('y1', cy - 4).attr('y2', cy + 4).attr('stroke', col).attr('stroke-width', 1.25);
      });
      g.append('rect').attr('x', xs(v.q1)).attr('width', Math.max(2, xs(v.q3) - xs(v.q1)))
        .attr('y', cy - bh2 / 2).attr('height', bh2).attr('rx', 3)
        .attr('fill', hl ? 'rgba(42,120,214,0.30)' : 'rgba(129,144,165,0.28)');
      g.append('line').attr('x1', xs(v.med)).attr('x2', xs(v.med)).attr('y1', cy - bh2 / 2 - 2).attr('y2', cy + bh2 / 2 + 2)
        .attr('stroke', hl ? C.oursDark : C.ink1).attr('stroke-width', 2.5).attr('stroke-linecap', 'round');
      (v.fliers || []).forEach(function (f) {
        g.append('circle').attr('cx', xs(f)).attr('cy', cy).attr('r', 3)
          .attr('fill', '#fff').attr('stroke', col).attr('stroke-width', 1.25);
      });
    } else if (p.mark === 'multidot') {
      var vals = cfg.series.map(function (s) { return { s: s, v: v[s.key] }; }).filter(function (d) { return d.v !== null && d.v !== undefined; });
      var ext = d3.extent(vals, function (d) { return d.v; });
      g.append('line').attr('x1', x0).attr('x2', x1).attr('y1', cy).attr('y2', cy).attr('stroke', C.grid);
      g.append('line').attr('x1', xs(ext[0])).attr('x2', xs(ext[1])).attr('y1', cy).attr('y2', cy)
        .attr('stroke', '#cfd6df').attr('stroke-width', 3).attr('stroke-linecap', 'round');
      vals.forEach(function (d) {
        g.append('circle').attr('cx', xs(d.v)).attr('cy', cy).attr('r', 5.5)
          .attr('fill', d.s.color).attr('stroke', '#fff').attr('stroke-width', 2);
      });
    }
  }

  /* =====================================================================
     lineChart
     cfg = { series:[{key,label,color,values:[{x,y}]}],
             x:{scale,domain,ticks,tickFormat,label}, y:{scale,domain,ticks,tickFormat,label},
             height, fmtX, fmtY, refLines:[{axis:'x'|'y', value, label, color}],
             shade:{x0,x1,label}, endLabels:true, snap:[x...], tipTitle(x), tipNote(x) }
     ===================================================================== */
  VIZ.lineChart = function (el, cfg) {
    return VIZ.mount(el, function (host, W) { renderLine(host, W, cfg); });
  };

  function renderLine(host, W, cfg) {
    var C = VIZ.color;
    var endLabelW = cfg.endLabels ? Math.min(cfg.endLabelWidth || 110, W * 0.3) : 0;
    var m = { top: 14, right: 14 + endLabelW, bottom: cfg.x.label ? 46 : 28, left: cfg.y.label ? 64 : 48 };
    var H = cfg.height || 320;
    var iw = W - m.left - m.right, ih = H - m.top - m.bottom;
    var xs = (cfg.x.scale === 'log' ? d3.scaleLog() : d3.scaleLinear()).domain(cfg.x.domain).range([0, iw]);
    var ys = (cfg.y.scale === 'log' ? d3.scaleLog() : d3.scaleLinear()).domain(cfg.y.domain).range([ih, 0]);
    if (cfg.y.scale === 'log') ys.clamp(true);

    var svg = d3.select(host).append('svg').attr('width', W).attr('height', H)
      .attr('role', 'img').attr('aria-label', cfg.ariaLabel || 'Line chart');
    var g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');

    if (cfg.shade) {
      var sx0 = xs(Math.max(cfg.shade.x0, cfg.x.domain[0])), sx1 = xs(Math.min(cfg.shade.x1, cfg.x.domain[1]));
      g.append('rect').attr('x', sx0).attr('width', sx1 - sx0).attr('y', 0).attr('height', ih)
        .attr('fill', cfg.shade.color || 'rgba(42,120,214,0.07)');
      if (cfg.shade.label) {
        g.append('text').attr('class', 'annot-muted').attr('x', sx0 + 8).attr('y', 16).text(cfg.shade.label);
      }
    }

    /* y grid + ticks */
    var yt = cfg.y.ticks || (cfg.y.scale === 'log'
      ? logTicks(cfg.y.domain, Math.max(3, Math.floor(ih / 42))).map(function (e) { return Math.pow(10, e); })
      : ys.ticks(Math.max(3, Math.floor(ih / 48))));
    yt.forEach(function (tv) {
      var ty = ys(tv);
      g.append('line').attr('class', 'gridline').attr('x1', 0).attr('x2', iw).attr('y1', ty).attr('y2', ty);
      var tt = g.append('text').attr('class', 'axis-text').attr('x', -8).attr('y', ty).attr('dy', '0.35em').attr('text-anchor', 'end');
      if (cfg.y.tickFormat) tt.text(cfg.y.tickFormat(tv));
      else if (cfg.y.scale === 'log') appendPowText(tt, Math.round(Math.log10(tv)));
      else tt.text(d3.format('~g')(tv));
    });
    var xt = cfg.x.ticks || (cfg.x.scale === 'log'
      ? logTicks(cfg.x.domain, Math.max(3, Math.floor(iw / 70))).map(function (e) { return Math.pow(10, e); })
      : xs.ticks(Math.max(3, Math.floor(iw / 80))));
    xt.forEach(function (tv) {
      var tx = xs(tv);
      var tt = g.append('text').attr('class', 'axis-text').attr('x', tx).attr('y', ih + 18).attr('text-anchor', 'middle');
      if (cfg.x.tickFormat) tt.text(cfg.x.tickFormat(tv));
      else if (cfg.x.scale === 'log') appendPowText(tt, Math.round(Math.log10(tv)));
      else tt.text(d3.format('~g')(tv));
      g.append('line').attr('class', 'axisline').attr('x1', tx).attr('x2', tx).attr('y1', ih).attr('y2', ih + 4);
    });
    g.append('line').attr('class', 'axisline').attr('x1', 0).attr('x2', iw).attr('y1', ih).attr('y2', ih);
    if (cfg.x.label) g.append('text').attr('class', 'axis-title').attr('x', iw / 2).attr('y', ih + 40).attr('text-anchor', 'middle').text(cfg.x.label);
    if (cfg.y.label) {
      g.append('text').attr('class', 'axis-title').attr('transform', 'rotate(-90)')
        .attr('x', -ih / 2).attr('y', -m.left + 14).attr('text-anchor', 'middle').text(cfg.y.label);
    }

    /* reference lines */
    (cfg.refLines || []).forEach(function (rl) {
      if (rl.axis === 'y') {
        var ry = ys(rl.value);
        g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', ry).attr('y2', ry)
          .attr('stroke', rl.color || C.ours).attr('stroke-width', 1).attr('opacity', 0.9);
        if (rl.label && !(rl.minWidth && iw < rl.minWidth)) {
          g.append('text').attr('class', 'annot-muted').attr('x', rl.labelX !== undefined ? xs(rl.labelX) : 6)
            .attr('y', ry + (rl.below ? 14 : -6)).text(rl.label);
        }
      } else {
        var rx = xs(rl.value);
        g.append('line').attr('x1', rx).attr('x2', rx).attr('y1', 0).attr('y2', ih)
          .attr('stroke', rl.color || C.ink3).attr('stroke-width', 1);
        if (rl.label) g.append('text').attr('class', 'annot-muted').attr('x', rx + 5).attr('y', 12).text(rl.label);
      }
    });

    /* lines */
    var line = d3.line().x(function (d) { return xs(d.x); }).y(function (d) { return ys(d.y); })
      .curve(cfg.curve === 'step' ? d3.curveStepAfter : d3.curveLinear);
    cfg.series.forEach(function (s) {
      g.append('path').attr('d', line(s.values)).attr('fill', 'none')
        .attr('stroke', s.color).attr('stroke-width', s.width || 2)
        .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round')
        .attr('opacity', s.opacity || 1);
      if (s.markers) {
        s.values.forEach(function (d) {
          g.append('circle').attr('cx', xs(d.x)).attr('cy', ys(d.y)).attr('r', 4.5)
            .attr('fill', s.color).attr('stroke', '#fff').attr('stroke-width', 2);
        });
      }
    });

    /* end labels with leader lines when they collide */
    if (cfg.endLabels) {
      var ends = cfg.series.filter(function (s) { return !s.noEndLabel; }).map(function (s) {
        var last = s.values[s.values.length - 1];
        return { s: s, y0: ys(last.y), x: xs(last.x), y: ys(last.y) };
      }).sort(function (a, b) { return a.y0 - b.y0; });
      var minGap = 15;
      for (var i = 1; i < ends.length; i++) {
        if (ends[i].y - ends[i - 1].y < minGap) ends[i].y = ends[i - 1].y + minGap;
      }
      var overflow = ends.length ? ends[ends.length - 1].y - (ih - 4) : 0;
      if (overflow > 0) ends.forEach(function (e) { e.y -= overflow; });
      ends.forEach(function (e) {
        var lx = iw + 12;
        if (Math.abs(e.y - e.y0) > 2) {
          g.append('path').attr('d', 'M' + (e.x + 5) + ',' + e.y0 + 'L' + (lx - 3) + ',' + e.y)
            .attr('stroke', C.axis).attr('fill', 'none');
        }
        g.append('circle').attr('cx', lx + 2).attr('cy', e.y).attr('r', 3.5).attr('fill', e.s.color);
        var t = g.append('text').attr('class', 'value-label' + (e.s.hl ? ' is-hl' : '')).attr('x', lx + 10).attr('y', e.y).attr('dy', '0.35em').text(e.s.endLabel || e.s.label);
        fitText(t.node(), endLabelW - 14);
      });
    }

    /* crosshair */
    var snap = cfg.snap || Array.from(new Set([].concat.apply([], cfg.series.map(function (s) { return s.values.map(function (d) { return d.x; }); })))).sort(function (a, b) { return a - b; });
    var cross = g.append('line').attr('class', 'crosshair').attr('y1', 0).attr('y2', ih).style('display', 'none');
    var dots = g.append('g').style('display', 'none');
    function valueAt(s, x) {
      var vs = s.values;
      for (var i = 0; i < vs.length; i++) if (vs[i].x === x) return vs[i].y;
      if (x < vs[0].x || x > vs[vs.length - 1].x) return null;
      for (var j = 1; j < vs.length; j++) {
        if (vs[j].x >= x) {
          if (cfg.curve === 'step') return vs[j - 1].y;
          var a = vs[j - 1], b = vs[j];
          var t = (Math.log10 && cfg.x.scale === 'log') ? (Math.log10(x) - Math.log10(a.x)) / (Math.log10(b.x) - Math.log10(a.x)) : (x - a.x) / (b.x - a.x);
          if (cfg.y.scale === 'log') return Math.pow(10, Math.log10(a.y) + t * (Math.log10(b.y) - Math.log10(a.y)));
          return a.y + t * (b.y - a.y);
        }
      }
      return null;
    }
    function showAt(x, ev) {
      var px = xs(x);
      cross.attr('x1', px).attr('x2', px).style('display', null);
      dots.selectAll('*').remove();
      dots.style('display', null);
      var rowsT = cfg.series.map(function (s) {
        var v = s.valueAt ? s.valueAt(x) : valueAt(s, x);
        if (v !== null) {
          dots.append('circle').attr('cx', px).attr('cy', ys(v)).attr('r', 4.5)
            .attr('fill', s.color).attr('stroke', '#fff').attr('stroke-width', 2);
        }
        return { value: v === null ? '—' : (cfg.fmtY ? cfg.fmtY(v, s) : String(v)), label: s.label, color: s.color, v: v };
      });
      if (cfg.sortTip !== false) {
        rowsT.sort(function (a, b) {
          if (a.v === null) return 1;
          if (b.v === null) return -1;
          return cfg.sortTip === 'desc' ? b.v - a.v : a.v - b.v;
        });
      }
      VIZ.showTip(ev, cfg.tipTitle ? cfg.tipTitle(x) : String(x), rowsT, cfg.tipNote ? cfg.tipNote(x) : null);
    }
    var overlay = g.append('rect').attr('class', 'hit').attr('width', iw).attr('height', ih).attr('tabindex', 0)
      .attr('aria-label', (cfg.ariaLabel || 'Line chart') + '. Use left and right arrow keys to move between points.');
    var cur = -1;
    function nearest(px) {
      var best = 0, bd = Infinity;
      snap.forEach(function (x, i) { var d = Math.abs(xs(x) - px); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    overlay.on('pointermove', function (ev) {
      var p = d3.pointer(ev, this);
      cur = nearest(p[0]);
      showAt(snap[cur], ev);
    }).on('pointerleave', function () {
      cross.style('display', 'none'); dots.style('display', 'none'); VIZ.hideTip();
    }).on('focus', function () {
      if (cur < 0) cur = snap.length - 1;
      showAt(snap[cur], this);
    }).on('blur', function () {
      cross.style('display', 'none'); dots.style('display', 'none'); VIZ.hideTip();
    }).on('keydown', function (ev) {
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
        ev.preventDefault();
        cur = Math.max(0, Math.min(snap.length - 1, cur + (ev.key === 'ArrowRight' ? 1 : -1)));
        showAt(snap[cur], this);
      }
    });

    if (cfg.annotate) cfg.annotate(g, { x: xs, y: ys, iw: iw, ih: ih });
  }

  /* =====================================================================
     scatter
     cfg = { points:[{key,label,x,y,hl,showLabel,labelPos:{dx,dy,anchor}}],
             x:{domain,label,ticks,fmt}, y:{domain,label,ticks,fmt},
             refLines:[{axis,value,label}], diagonal:bool, height, tip(p) }
     ===================================================================== */
  VIZ.scatter = function (el, cfg) {
    return VIZ.mount(el, function (host, W) { renderScatter(host, W, cfg); });
  };

  function renderScatter(host, W, cfg) {
    var C = VIZ.color;
    var m = { top: 16, right: 18, bottom: 48, left: 58 };
    var H = cfg.height || 340;
    var iw = W - m.left - m.right, ih = H - m.top - m.bottom;
    var xs = d3.scaleLinear().domain(cfg.x.domain).range([0, iw]);
    var ys = d3.scaleLinear().domain(cfg.y.domain).range([ih, 0]);
    var svg = d3.select(host).append('svg').attr('width', W).attr('height', H)
      .attr('role', 'img').attr('aria-label', cfg.ariaLabel || 'Scatter plot');
    var g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');

    (cfg.y.ticks || ys.ticks(5)).forEach(function (tv) {
      g.append('line').attr('class', 'gridline').attr('x1', 0).attr('x2', iw).attr('y1', ys(tv)).attr('y2', ys(tv));
      g.append('text').attr('class', 'axis-text').attr('x', -8).attr('y', ys(tv)).attr('dy', '0.35em').attr('text-anchor', 'end')
        .text(cfg.y.fmt ? cfg.y.fmt(tv) : tv);
    });
    (cfg.x.ticks || xs.ticks(Math.max(3, Math.floor(iw / 80)))).forEach(function (tv) {
      g.append('line').attr('class', 'gridline').attr('x1', xs(tv)).attr('x2', xs(tv)).attr('y1', 0).attr('y2', ih);
      g.append('text').attr('class', 'axis-text').attr('x', xs(tv)).attr('y', ih + 18).attr('text-anchor', 'middle')
        .text(cfg.x.fmt ? cfg.x.fmt(tv) : tv);
    });
    g.append('line').attr('class', 'axisline').attr('x1', 0).attr('x2', iw).attr('y1', ih).attr('y2', ih);
    g.append('text').attr('class', 'axis-title').attr('x', iw / 2).attr('y', ih + 40).attr('text-anchor', 'middle').text(cfg.x.label);
    g.append('text').attr('class', 'axis-title').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -44)
      .attr('text-anchor', 'middle').text(cfg.y.label);

    if (cfg.diagonal) {
      var lo = Math.max(cfg.x.domain[0], cfg.y.domain[0]), hi = Math.min(cfg.x.domain[1], cfg.y.domain[1]);
      g.append('line').attr('x1', xs(lo)).attr('y1', ys(lo)).attr('x2', xs(hi)).attr('y2', ys(hi))
        .attr('stroke', C.axis).attr('stroke-width', 1);
      if (cfg.diagonalLabel) {
        var dlx = xs(hi) - 6, dly = ys(hi) + 4;
        g.append('text').attr('class', 'annot-muted').attr('x', dlx).attr('y', dly).attr('dy', '0.9em')
          .attr('text-anchor', 'end').text(cfg.diagonalLabel);
      }
    }
    (cfg.refLines || []).forEach(function (rl) {
      if (rl.axis === 'x') {
        var rx = xs(rl.value);
        g.append('line').attr('x1', rx).attr('x2', rx).attr('y1', 0).attr('y2', ih).attr('stroke', C.ink3).attr('stroke-width', 1.25);
        if (rl.label) {
          g.append('text').attr('class', 'annot-muted').attr('x', rx + 5).attr('y', 10).text(rl.label);
        }
      } else {
        var ry = ys(rl.value);
        g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', ry).attr('y2', ry).attr('stroke', C.ink3).attr('stroke-width', 1.25);
        if (rl.label) g.append('text').attr('class', 'annot-muted').attr('x', 4).attr('y', ry - 5).text(rl.label);
      }
    });

    var pts = cfg.points.slice().sort(function (a, b) { return (a.hl ? 1 : 0) - (b.hl ? 1 : 0); });
    var marks = g.append('g');
    pts.forEach(function (p) {
      p._c = marks.append('circle').attr('cx', xs(p.x)).attr('cy', ys(p.y)).attr('r', p.hl ? 7 : 5.5)
        .attr('fill', p.hl ? (p.color || C.ours) : C.baseMark).attr('stroke', '#fff').attr('stroke-width', 2);
      if (p.showLabel && (iw >= (cfg.labelMinWidth || 0) || p.hl || p.keepLabel)) {
        var lp = p.labelPos || {};
        var t = marks.append('text').attr('class', 'value-label' + (p.hl ? ' is-hl' : ''))
          .attr('x', xs(p.x) + (lp.dx !== undefined ? lp.dx : 9)).attr('y', ys(p.y) + (lp.dy !== undefined ? lp.dy : 0))
          .attr('dy', '0.35em').attr('text-anchor', lp.anchor || 'start').text(p.label);
        if (lp.anchor === 'end' && xs(p.x) + (lp.dx || 0) - VIZ.textWidth(p.label) < -m.left + 4) t.attr('text-anchor', 'start').attr('x', xs(p.x) + 9);
      }
    });

    /* nearest-point hover */
    var del = d3.Delaunay.from(cfg.points, function (p) { return xs(p.x); }, function (p) { return ys(p.y); });
    var ring = g.append('circle').attr('r', 10).attr('fill', 'none').attr('stroke', C.ink1).attr('stroke-width', 1.5).style('display', 'none');
    function show(p, ev) {
      ring.attr('cx', xs(p.x)).attr('cy', ys(p.y)).style('display', null);
      var t = cfg.tip ? cfg.tip(p) : { title: p.label, rows: [] };
      VIZ.showTip(ev, t.title, t.rows, t.note);
    }
    var overlay = g.append('rect').attr('class', 'hit').attr('width', iw).attr('height', ih).attr('tabindex', 0)
      .attr('aria-label', (cfg.ariaLabel || 'Scatter plot') + '. Use arrow keys to move between points.');
    var cur = -1;
    overlay.on('pointermove', function (ev) {
      var p = d3.pointer(ev, this);
      var i = del.find(p[0], p[1]);
      var pt = cfg.points[i];
      var dx = xs(pt.x) - p[0], dy = ys(pt.y) - p[1];
      if (Math.sqrt(dx * dx + dy * dy) < 40) { cur = i; show(pt, ev); }
      else { ring.style('display', 'none'); VIZ.hideTip(); }
    }).on('pointerleave', function () { ring.style('display', 'none'); VIZ.hideTip(); })
      .on('focus', function () { if (cur < 0) cur = 0; show(cfg.points[cur], this); })
      .on('blur', function () { ring.style('display', 'none'); VIZ.hideTip(); })
      .on('keydown', function (ev) {
        if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].indexOf(ev.key) >= 0) {
          ev.preventDefault();
          var step = (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') ? 1 : -1;
          cur = (cur + step + cfg.points.length) % cfg.points.length;
          show(cfg.points[cur], this);
        }
      });
  }

  /* =====================================================================
     table - the accessible twin of a chart
     cfg = { columns:[{key,label,num,better:'lower'|'higher',fmt, group}],
             rows:[{...values, _group, _ours}], colGroups:[{label, span}], caption }
     best/second-best are computed per column (ties share the mark).
     ===================================================================== */
  VIZ.table = function (el, cfg) {
    el.replaceChildren();
    var wrap = document.createElement('div');
    wrap.className = 'table-scroll';
    var table = document.createElement('table');
    table.className = 'data-table';
    if (cfg.caption) {
      var cap = document.createElement('caption');
      cap.textContent = cfg.caption;
      table.appendChild(cap);
    }
    var thead = document.createElement('thead');
    if (cfg.colGroups) {
      var trg = document.createElement('tr');
      trg.className = 'col-groups';
      cfg.colGroups.forEach(function (cg) {
        var th = document.createElement('th');
        th.colSpan = cg.span;
        th.textContent = cg.label || '';
        trg.appendChild(th);
      });
      thead.appendChild(trg);
    }
    var tr = document.createElement('tr');
    cfg.columns.forEach(function (c) {
      var th = document.createElement('th');
      th.scope = 'col';
      th.textContent = c.label + (c.better === 'lower' ? ' ↓' : c.better === 'higher' ? ' ↑' : '');
      if (c.num) th.className = 'num';
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);

    var data = cfg.rows.filter(function (r) { return !r._group; });
    var marks = {};
    cfg.columns.forEach(function (c) {
      if (!c.better) return;
      var vals = data.map(function (r) { return r[c.key]; }).filter(function (v) { return v !== null && v !== undefined && isFinite(v); });
      var uniq = Array.from(new Set(vals)).sort(function (a, b) { return c.better === 'lower' ? a - b : b - a; });
      var ties = vals.filter(function (v) { return v === uniq[1]; }).length;
      /* a "second best" shared by many rows (e.g. several zeros) marks nothing */
      marks[c.key] = { best: uniq[0], second: ties <= 2 ? uniq[1] : undefined };
    });

    var tbody = document.createElement('tbody');
    cfg.rows.forEach(function (r) {
      var row = document.createElement('tr');
      if (r._group) {
        row.className = 'group-row';
        var td = document.createElement('td');
        td.colSpan = cfg.columns.length;
        td.textContent = r._group;
        row.appendChild(td);
      } else {
        if (r._ours) row.className = 'is-ours';
        cfg.columns.forEach(function (c, i) {
          var cell = document.createElement(i === 0 ? 'th' : 'td');
          if (i === 0) { cell.scope = 'row'; cell.style.fontWeight = r._ours ? '700' : '500'; cell.style.textAlign = 'left'; }
          var v = r[c.key];
          VIZ.fillNum(cell, c.fmt ? c.fmt(v, r) : (v === null || v === undefined ? '—' : String(v)));
          if (c.num) cell.className = 'num';
          var mk = marks[c.key];
          if (mk && v !== null && v !== undefined) {
            if (v === mk.best) cell.className += ' is-best';
            else if (v === mk.second) cell.className += ' is-second';
          }
          row.appendChild(cell);
        });
      }
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    el.appendChild(wrap);
  };

  /* ---------- figure zoom (lightbox) ---------- */
  VIZ.initLightbox = function () {
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Enlarged figure');
    var img = document.createElement('img');
    var close = document.createElement('button');
    close.className = 'lightbox-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.textContent = '✕';
    box.appendChild(img);
    box.appendChild(close);
    document.body.appendChild(box);
    var opener = null;
    function hide() {
      box.classList.remove('is-open');
      document.body.style.overflow = '';
      if (opener) opener.focus();
    }
    box.addEventListener('click', hide);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('is-open')) hide(); });
    document.querySelectorAll('.zoomable').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var src = btn.getAttribute('data-full') || btn.querySelector('img').getAttribute('src');
        img.src = src;
        img.alt = btn.querySelector('img').alt;
        opener = btn;
        box.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        close.focus();
      });
    });
  };

  /* ---------- tabbed gallery ---------- */
  VIZ.initGallery = function (root) {
    var ctrl = root.querySelector('.gallery-tabs');
    var panels = Array.from(root.querySelectorAll('.gallery-panel'));
    if (!ctrl || !panels.length) return;
    var opts = panels.map(function (p) { return { value: p.id, label: p.getAttribute('data-tab') }; });
    VIZ.segmented(ctrl, opts, opts[0].value, function (v) {
      panels.forEach(function (p) { p.classList.toggle('is-active', p.id === v); });
    });
    panels[0].classList.add('is-active');
  };
})();
