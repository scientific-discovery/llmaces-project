/* ==========================================================================
   LLM-ACES project page - results data and chart wiring.

   Sources (arXiv 2606.25039):
   - Tables 2 and 3: median NMSE, complexity and symbolic accuracy.
   - Figure 2 (ablation), Figure 4 (memorization) and Figure 5 (sample
     efficiency): values recovered from the paper's vector figures.
   - Figure 11 (identifiability gap): equations listed in the paper.
   ========================================================================== */
(function () {
  'use strict';

  var C = VIZ.color;

  /* ---------------- Tables 2 & 3 ---------------- */
  var GROUPS = {
    passive: 'Passive symbolic discovery',
    llm: 'LLM-guided symbolic discovery',
    active: 'Active symbolic discovery',
    ours: 'Ours'
  };

  var METHODS = [
    { key: 'sindy', label: 'SINDy', group: 'passive' },
    { key: 'operon', label: 'Operon', group: 'passive' },
    { key: 'pysr', label: 'PySR', group: 'passive' },
    { key: 'e2e', label: 'E2E', group: 'passive' },
    { key: 'odeformer', label: 'ODEFormer', group: 'passive' },
    { key: 'llmonly', label: 'LLM-only', group: 'llm' },
    { key: 'llmode', label: 'LLM-ODE', group: 'llm' },
    { key: 'qbc', label: 'Query-by-Committee', short: 'QBC', group: 'active' },
    { key: 'bo', label: 'Bayesian Optimization', short: 'BO', group: 'active' },
    { key: 'apps', label: 'APPS-ODE', group: 'active' },
    { key: 'aces_gpt', label: 'LLM-ACES (GPT-4o-mini)', short: 'LLM-ACES (GPT)', group: 'ours', hl: true },
    { key: 'aces_qwen', label: 'LLM-ACES (Qwen3-32B)', short: 'LLM-ACES (Qwen)', group: 'ours', hl: true }
  ];

  /* [recon, gen, ood, complexity, symbolic accuracy %] */
  var RESULTS = {
    odebench: {
      name: 'ODEBench', n: 63, gt: 19.3,
      v: {
        sindy: [5.07e-4, 5.09e-1, 1.41e0, 11.7, 18.5],
        operon: [7.95e-5, 2.57e-1, 1.84e0, 14.0, 2.4],
        pysr: [2.84e-3, 8.82e-1, 1.43e0, 6.6, 18.1],
        e2e: [3.69e-1, 1.49e0, 2.19e0, 52.6, 0.0],
        odeformer: [4.61e-3, 3.83e-1, 2.04e0, 15.9, 16.5],
        llmonly: [2.20e-8, 3.45e0, 1.79e0, 38.9, 0.0],
        llmode: [4.12e-5, 4.72e-3, 2.43e-2, 25.2, 5.9],
        qbc: [1.81e-9, 5.07e-9, 5.69e-8, 33.7, 15.6],
        bo: [1.06e-14, 9.35e-13, 3.47e-10, 22.6, 41.2],
        apps: [7.52e-1, 8.13e-1, 1.02e0, 13.4, 2.6],
        aces_gpt: [1.33e-17, 8.28e-17, 2.46e-16, 17.1, 46.2],
        aces_qwen: [6.30e-16, 4.18e-15, 1.89e-15, 18.2, 45.6]
      },
      labels: {
        aces_gpt: { dx: -10, dy: -2, anchor: 'end' },
        aces_qwen: { dx: 10, dy: 2, anchor: 'start' },
        bo: { dx: 10, dy: 4, anchor: 'start' }
      },
      xmax: 60
    },
    odebase: {
      name: 'ODEBase', n: 59, gt: 35.2,
      v: {
        sindy: [1.06e-3, 1.12e0, 3.47e-1, 12.5, 5.9],
        operon: [1.49e-5, 1.46e0, 1.41e0, 19.0, 5.4],
        pysr: [1.37e-3, 1.08e0, 1.35e0, 8.8, 5.9],
        e2e: [1.04e0, 1.19e1, 1.98e1, 83.6, 0.0],
        odeformer: [1.64e-2, 1.15e1, 4.09e0, 18.5, 4.8],
        llmonly: [4.52e-8, 1.06e1, 1.11e0, 54.9, 0.0],
        llmode: [7.46e-5, 8.51e-1, 6.59e-4, 32.1, 0.1],
        qbc: [4.97e-9, 7.47e-6, 6.38e-6, 45.2, 14.1],
        bo: [8.55e-10, 4.61e-10, 5.43e-8, 31.3, 49.3],
        apps: [5.56e-1, 9.12e-1, 1.01e0, 10.9, 15.2],
        aces_gpt: [2.54e-14, 8.50e-10, 3.05e-12, 33.1, 50.0],
        aces_qwen: [3.70e-15, 4.18e-15, 3.44e-13, 31.2, 52.4]
      },
      labels: {
        aces_qwen: { dx: -10, dy: -8, anchor: 'end' },
        aces_gpt: { dx: 10, dy: -4, anchor: 'start' },
        bo: { dx: 10, dy: 10, anchor: 'start' }
      },
      xmax: 90
    }
  };

  var SETTINGS = [
    { i: 0, title: 'Reconstruction', short: 'Recon.', sub: 'training initial condition, t ∈ [0, 1]' },
    { i: 1, title: 'Generalization', short: 'Gen.', sub: 'held-out initial condition, t ∈ [0, 1]' },
    { i: 2, title: 'Out-of-distribution', short: 'OOD', sub: 'extrapolation, t ∈ (1, 10]' }
  ];

  var state = { bench: 'odebench' };

  function rowsFor() {
    return METHODS.map(function (m) { return { key: m.key, label: m.label, short: m.short, group: m.group, hl: !!m.hl }; });
  }

  /* bracket from the best baseline to the best LLM-ACES variant */
  function gapAnnotation(bench, si) {
    return function (g, ctx) {
      var v = RESULTS[bench].v;
      var base = METHODS.filter(function (m) { return !m.hl; });
      var ours = METHODS.filter(function (m) { return m.hl; });
      var bb = base.reduce(function (a, m) { return v[m.key][si] < v[a.key][si] ? m : a; });
      var bo = ours.reduce(function (a, m) { return v[m.key][si] < v[a.key][si] ? m : a; });
      var dec = Math.log10(v[bb.key][si] / v[bo.key][si]);
      if (!(dec > 0)) return;
      var xa = ctx.x(v[bo.key][si]), xb = ctx.x(v[bb.key][si]);
      var yy = ctx.yOf[ours[0].key] - ctx.rowH / 2 - 9;
      g.append('line').attr('x1', xa).attr('x2', xb).attr('y1', yy).attr('y2', yy).attr('stroke', C.ours).attr('stroke-width', 1.5);
      [xa, xb].forEach(function (xx) {
        g.append('line').attr('x1', xx).attr('x2', xx).attr('y1', yy - 4).attr('y2', yy + 4).attr('stroke', C.ours).attr('stroke-width', 1.5);
      });
      var label = dec.toFixed(1) + ' orders lower than ' + (bb.key === 'bo' ? 'BO' : bb.key === 'qbc' ? 'QBC' : bb.label);
      var tw = VIZ.textWidth(label, '600 11.5px Inter, sans-serif');
      var tx = Math.min(Math.max((xa + xb) / 2, ctx.x0 + tw / 2), ctx.x1 - tw / 2 + 12);
      g.append('text').attr('class', 'annot').attr('x', tx).attr('y', yy - 7).attr('text-anchor', 'middle').text(label);
    };
  }

  function renderMain() {
    var R = RESULTS[state.bench];
    var el = document.getElementById('chart-main');
    if (el._viz) { el._viz = null; }
    el.replaceChildren();
    el._viz = VIZ.hPanels(el, {
      ariaLabel: 'Median NMSE of 12 methods on ' + R.name + ' for reconstruction, generalization and out-of-distribution evaluation',
      rows: rowsFor(),
      groups: GROUPS,
      labelWidth: 188,
      rowHeight: 25,
      minPanelWidth: 230,
      panels: SETTINGS.map(function (s) {
        return {
          title: s.title, sub: s.sub, scale: 'log', domain: [1e-18, 1e2], mark: 'dot', ticks: [1e-15, 1e-10, 1e-5, 1e0],
          get: function (r) { return R.v[r.key][s.i]; },
          fmt: function (v) { return VIZ.sci(v); },
          tipLabel: s.title,
          annotate: gapAnnotation(state.bench, s.i)
        };
      }),
      tipTitle: function (r) { return r.label + ' · ' + R.name; },
      tipNote: function () { return 'Median NMSE across ' + R.n + ' systems (lower is better).'; }
    });

    VIZ.table(document.getElementById('table-main'), {
      caption: 'Median NMSE (lower is better), mean expression complexity (ground-truth mean ' + R.gt +
        '), and mean symbolic accuracy on ' + R.name + ' (' + R.n + ' systems). Bold = best, underline = second best.',
      columns: [
        { key: 'label', label: 'Method' },
        { key: 'r', label: 'Recon. NMSE', num: true, better: 'lower', fmt: VIZ.sci },
        { key: 'g', label: 'Gen. NMSE', num: true, better: 'lower', fmt: VIZ.sci },
        { key: 'o', label: 'OOD NMSE', num: true, better: 'lower', fmt: VIZ.sci },
        { key: 'c', label: 'Complexity', num: true, fmt: function (v) { return v.toFixed(1); } },
        { key: 's', label: 'Sym. Acc. (%)', num: true, better: 'higher', fmt: function (v) { return v.toFixed(1); } }
      ],
      rows: tableRows(R)
    });
    renderScatter();
  }

  function tableRows(R) {
    var out = [], last = null;
    METHODS.forEach(function (m) {
      if (m.group !== last) { out.push({ _group: GROUPS[m.group] }); last = m.group; }
      var v = R.v[m.key];
      out.push({ label: m.label, r: v[0], g: v[1], o: v[2], c: v[3], s: v[4], _ours: !!m.hl });
    });
    return out;
  }

  function renderScatter() {
    var R = RESULTS[state.bench];
    var el = document.getElementById('chart-scatter');
    el.replaceChildren();
    VIZ.scatter(el, {
      ariaLabel: 'Symbolic accuracy against mean expression complexity on ' + R.name,
      height: 360,
      x: { domain: [0, R.xmax], label: 'Mean expression complexity (tree nodes)' },
      y: { domain: [0, 60], label: 'Symbolic accuracy (%)', ticks: [0, 10, 20, 30, 40, 50, 60] },
      refLines: [{ axis: 'x', value: R.gt, label: 'Ground-truth mean ' + R.gt }],
      points: METHODS.map(function (m) {
        var v = R.v[m.key];
        var lp = R.labels[m.key];
        return {
          key: m.key, label: m.label.replace('LLM-ACES (GPT-4o-mini)', 'LLM-ACES (GPT)').replace('LLM-ACES (Qwen3-32B)', 'LLM-ACES (Qwen)').replace('Bayesian Optimization', 'BO'),
          full: m.label, x: v[3], y: v[4], hl: !!m.hl, showLabel: !!lp, labelPos: lp
        };
      }),
      tip: function (p) {
        return {
          title: p.full,
          rows: [
            { value: p.y.toFixed(1) + '%', label: 'symbolic accuracy' },
            { value: p.x.toFixed(1), label: 'mean complexity (ground truth ' + R.gt + ')' }
          ]
        };
      }
    });
  }

  /* ---------------- Figure 2: ablation (15 ODEBench systems) ---------------- */
  /* log10 NMSE: [q1, median, q3, whisker low, whisker high, fliers] */
  var ABLATION = {
    variants: [
      { key: 'div', label: 'w/o diversity', short: 'w/o diversity' },
      { key: 'pd', label: 'w/o predictive divergence', short: 'w/o pred. div.' },
      { key: 'prior', label: 'w/o LLM priors', short: 'w/o LLM priors' },
      { key: 'full', label: 'LLM-ACES (full)', short: 'LLM-ACES', hl: true }
    ],
    settings: [
      { title: 'Reconstruction', data: {
        div: [-33.64, -18.11, -13.96, -35.0, -13.89, [-11.98, -13.04, -13.37]],
        pd: [-35.0, -18.05, -12.97, -35.0, -12.74, [-11.04, -11.97, -12.31]],
        prior: [-35.0, -31.09, -10.77, -35.0, -10.69, [-6.98, -8.03, -8.24]],
        full: [-35.0, -31.85, -15.09, -35.0, -14.81, [-12.19, -13.89, -14.43]] } },
      { title: 'Generalization', data: {
        div: [-32.54, -18.31, -13.97, -35.0, -13.73, [-2.76, -6.67, -12.09]],
        pd: [-35.0, -18.44, -11.24, -35.0, -10.94, [-1.80, -2.70, -6.66]],
        prior: [-32.37, -16.92, -1.71, -35.0, -1.42, [3.66, 0.11, -0.73]],
        full: [-35.0, -31.23, -15.89, -35.0, -15.80, [-8.08, -12.38, -14.48]] } },
      { title: 'Out-of-distribution', data: {
        div: [-30.97, -18.19, -14.07, -35.0, -14.00, [-4.21, -8.43, -9.78]],
        pd: [-35.0, -16.38, -8.26, -35.0, -7.97, [0.14, -4.68, -7.06]],
        prior: [-32.58, -16.51, -2.00, -35.0, -1.70, [-0.32, -0.62, -1.07]],
        full: [-35.0, -30.28, -14.27, -35.0, -14.25, [-5.57, -9.99, -13.14]] } }
    ]
  };

  function renderAblation() {
    var p10 = function (e) { return Math.pow(10, e); };
    VIZ.hPanels(document.getElementById('chart-ablation'), {
      ariaLabel: 'Ablation study: NMSE distributions of four LLM-ACES variants on 15 ODEBench systems',
      rows: ABLATION.variants.map(function (v) { return { key: v.key, label: v.label, short: v.short, hl: !!v.hl }; }),
      labelWidth: 178,
      rowHeight: 34,
      minPanelWidth: 220,
      panels: ABLATION.settings.map(function (s) {
        return {
          title: s.title, scale: 'log', domain: [1e-36, 1e5], mark: 'box', ticks: [1e-30, 1e-20, 1e-10, 1e0],
          get: function (r) {
            var d = s.data[r.key];
            return { q1: p10(d[0]), med: p10(d[1]), q3: p10(d[2]), wlo: p10(d[3]), whi: p10(d[4]), fliers: d[5].map(p10) };
          },
          tipLabel: s.title,
          tipValue: function (b) { return VIZ.sci(b.med, 1); }
        };
      }),
      tipTitle: function (r) { return r.label + ' · median NMSE'; },
      tipNote: function (r, p) {
        var b = p.get(r);
        return p.title + ': interquartile range ' + VIZ.sci(b.q1, 1) + ' to ' + VIZ.sci(b.q3, 1) +
          '; ' + b.fliers.length + ' outlying systems up to ' + VIZ.sci(Math.max.apply(null, b.fliers), 1) + '.';
      }
    });
    var rows = [];
    ABLATION.variants.forEach(function (v) {
      var r = { label: v.label, _ours: !!v.hl };
      ABLATION.settings.forEach(function (s, i) {
        r['m' + i] = Math.pow(10, s.data[v.key][1]);
        r['q' + i] = s.data[v.key];
      });
      rows.push(r);
    });
    var iqr = function (i) { return function (v, r) { return VIZ.sci(Math.pow(10, r['q' + i][0]), 1) + ' – ' + VIZ.sci(Math.pow(10, r['q' + i][2]), 1); }; };
    VIZ.table(document.getElementById('table-ablation'), {
      caption: 'Median NMSE and interquartile range across 15 stratified ODEBench systems (5 each of 1D, 2D, 3D). Exact fits sit at the 10⁻³⁵ floor.',
      columns: [
        { key: 'label', label: 'Variant' },
        { key: 'm0', label: 'Recon. median', num: true, better: 'lower', fmt: function (v) { return VIZ.sci(v, 1); } },
        { key: 'x0', label: 'Recon. IQR', num: true, fmt: iqr(0) },
        { key: 'm1', label: 'Gen. median', num: true, better: 'lower', fmt: function (v) { return VIZ.sci(v, 1); } },
        { key: 'x1', label: 'Gen. IQR', num: true, fmt: iqr(1) },
        { key: 'm2', label: 'OOD median', num: true, better: 'lower', fmt: function (v) { return VIZ.sci(v, 1); } },
        { key: 'x2', label: 'OOD IQR', num: true, fmt: iqr(2) }
      ],
      rows: rows
    });
  }

  /* ---------------- Figure 5: sample efficiency ---------------- */
  var EFF = [
    { key: 'aces', label: 'LLM-ACES', color: C.ours, hl: true, v: [1.04e-24, 5.92e-24, 1.70e-25, 4.77e-26] },
    { key: 'bo', label: 'BO (PySR)', color: C.s2, v: [5.64e-16, 2.71e-22, 1.33e-23, 2.01e-22] },
    { key: 'pysr', label: 'PySR', color: C.s3, v: [2.37e-3, 2.33e-15, 1.36e-14, 7.79e-15] },
    { key: 'llmode', label: 'LLM-ODE', color: C.s4, v: [3.89e-5, 8.92e-5, 4.33e-5, 2.83e-5] }
  ];
  var N_OBS = [100, 200, 500, 1000];

  function renderEfficiency() {
    VIZ.legend(document.getElementById('legend-eff'), EFF.map(function (s) { return { label: s.label, color: s.color }; }));
    VIZ.lineChart(document.getElementById('chart-eff'), {
      ariaLabel: 'Reconstruction NMSE against number of training samples for four methods',
      height: 330,
      series: EFF.map(function (s) {
        return { key: s.key, label: s.label, color: s.color, hl: s.hl, markers: true,
          values: N_OBS.map(function (n, i) { return { x: n, y: s.v[i] }; }) };
      }),
      x: { scale: 'log', domain: [85, 1180], ticks: N_OBS, tickFormat: function (v) { return d3.format(',')(v); }, label: 'Training samples' },
      y: { scale: 'log', domain: [1e-28, 1e0], label: 'Reconstruction NMSE (geometric mean)', ticks: [1e0, 1e-6, 1e-12, 1e-18, 1e-24] },
      endLabels: true,
      endLabelWidth: 92,
      refLines: [{ axis: 'y', value: 1.04e-24, label: 'LLM-ACES at n = 100', color: C.ours, labelX: 104, below: true, minWidth: 330 }],
      fmtY: function (v) { return VIZ.sci(v); },
      tipTitle: function (x) { return d3.format(',')(x) + ' training samples'; },
      tipNote: function () { return 'Geometric mean over 15 ODEBench systems (5 each of 1D, 2D, 3D).'; }
    });
    VIZ.table(document.getElementById('table-eff'), {
      caption: 'Geometric-mean reconstruction NMSE over 15 ODEBench systems. Values read from the paper’s Figure 5.',
      columns: [{ key: 'label', label: 'Method' }].concat(N_OBS.map(function (n, i) {
        return { key: 'n' + i, label: d3.format(',')(n) + ' samples', num: true, better: 'lower', fmt: VIZ.sci };
      })),
      rows: EFF.map(function (s) {
        var r = { label: s.label, _ours: !!s.hl };
        s.v.forEach(function (v, i) { r['n' + i] = v; });
        return r;
      })
    });
  }

  /* ---------------- Figure 4: memorization ---------------- */
  var MEM = {
    ODEBench: [0, -12.562, -13.761, -13.761, -13.762, -13.769, -14.325, -15.099, -15.1, -15.102, -15.102, -15.102, -15.102, -15.102, -15.102, -15.104, -15.104, -15.104, -15.104, -15.105, -15.641, -15.642, -15.642, -15.643, -15.645, -15.645, -15.658, -15.658, -15.658, -15.658, -15.658, -15.659, -15.659, -15.659, -15.659, -15.659, -15.659, -15.659, -15.659, -15.659, -15.659, -15.659, -15.659, -15.659, -15.659, -15.659, -15.659, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.66, -15.661, -15.661, -15.661, -15.661, -15.661, -15.661, -15.661, -15.661, -15.662, -15.662, -15.662, -15.662, -15.664, -15.665, -15.665, -15.665, -15.665, -15.665, -15.665, -15.665, -15.665, -15.665, -15.665, -15.665, -15.665, -15.665, -15.665, -15.665, -15.665],
    Anonymized: [0, -3.322, -3.385, -3.393, -3.396, -4.022, -4.025, -4.025, -4.025, -4.025, -4.026, -4.026, -4.026, -4.026, -4.027, -4.027, -4.027, -4.03, -4.031, -4.031, -4.036, -4.036, -4.036, -4.039, -4.039, -4.043, -4.05, -4.05, -4.052, -4.052, -4.052, -4.058, -4.06, -4.072, -4.074, -4.074, -4.074, -4.074, -4.074, -4.075, -4.075, -4.075, -4.075, -4.075, -4.075, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.085, -4.086, -4.086, -4.086, -4.086, -4.086, -4.086, -4.086, -4.086, -4.086, -4.086, -4.086, -4.086, -4.086],
    Feynman: [0, -8.109, -9.114, -9.757, -10.048, -10.335, -10.943, -12.01, -12.012, -12.012, -12.017, -12.017, -12.018, -12.021, -12.022, -12.026, -12.027, -12.027, -12.031, -12.031, -12.034, -12.035, -12.035, -12.036, -12.036, -12.038, -12.044, -12.048, -12.051, -12.34, -12.342, -12.343, -12.351, -12.352, -12.353, -12.353, -12.355, -12.359, -12.359, -12.359, -12.359, -12.359, -12.371, -12.372, -12.373, -12.373, -12.373, -12.373, -12.374, -12.374, -12.375, -12.375, -12.375, -12.375, -12.375, -12.378, -12.379, -12.38, -12.38, -12.381, -12.381, -12.382, -12.402, -12.41, -12.411, -12.411, -12.411, -12.412, -12.413, -12.413, -12.413, -12.416, -12.416, -12.416, -12.416, -12.416, -12.416, -12.418, -12.418, -12.418, -12.418, -12.418, -12.418, -12.418, -12.418, -12.418, -12.418, -12.418, -12.418, -12.776, -12.776, -12.776, -12.776, -12.776, -12.776, -12.776, -12.78, -12.78, -12.78, -12.78, -12.78]
  };
  var MEM_SERIES = [
    { key: 'ODEBench', label: 'ODEBench (named)', endLabel: 'Named', color: C.s2, exact: 17, total: 63 },
    { key: 'Feynman', label: 'Feynman', endLabel: 'Feynman', color: C.s4, exact: 31, total: 120 },
    { key: 'Anonymized', label: 'ODEBench (anonymized)', endLabel: 'Anonymized', color: C.s3, exact: 2, total: 63 }
  ];

  function renderMemorization() {
    VIZ.legend(document.getElementById('legend-mem'), MEM_SERIES.map(function (s) { return { label: s.label, color: s.color }; }));
    var iters = [];
    for (var i = 0; i <= 100; i++) iters.push(i);
    VIZ.lineChart(document.getElementById('chart-mem'), {
      ariaLabel: 'Best NMSE so far over 100 refinement iterations for Feynman, ODEBench and anonymized ODEBench',
      height: 250,
      series: MEM_SERIES.map(function (s) {
        return { key: s.key, label: s.label, endLabel: s.endLabel, color: s.color,
          values: MEM[s.key].map(function (lv, i) { return { x: i, y: Math.pow(10, lv) }; }) };
      }),
      x: { scale: 'linear', domain: [0, 100], label: 'Iteration', ticks: [0, 20, 40, 60, 80, 100] },
      y: { scale: 'log', domain: [1e-16, 2], label: 'Best NMSE (geometric mean)', ticks: [1e0, 1e-4, 1e-8, 1e-12, 1e-16] },
      endLabels: true,
      endLabelWidth: 96,
      snap: iters,
      fmtY: function (v) { return VIZ.sci(v); },
      tipTitle: function (x) { return 'Iteration ' + x; },
      tipNote: function () { return 'Qwen3-32B refining its best equation for 100 iterations.'; }
    });
    VIZ.hPanels(document.getElementById('chart-mem-exact'), {
      ariaLabel: 'Share of equations recovered exactly',
      rows: MEM_SERIES.map(function (s) { return { key: s.key, label: s.label, short: s.endLabel, barColor: s.color, total: s.total, exact: s.exact }; })
        .sort(function (a, b) { return b.exact / b.total - a.exact / a.total; }),
      labelWidth: 190,
      rowHeight: 28,
      rightPad: 70,
      panels: [{
        scale: 'linear', domain: [0, 30], mark: 'bar', ticks: [0, 10, 20, 30],
        tickFormat: function (v) { return v + '%'; },
        get: function (r) { return 100 * r.exact / r.total; },
        fmt: function (v, r) { return r.exact + '/' + r.total + ' (' + v.toFixed(1) + '%)'; },
        tipLabel: 'recovered exactly'
      }],
      tipTitle: function (r) { return r.label; }
    });
    VIZ.table(document.getElementById('table-mem'), {
      caption: 'Final best NMSE after 100 iterations and exact recoveries (Section 4.3).',
      columns: [
        { key: 'label', label: 'Benchmark' },
        { key: 'final', label: 'Final NMSE', num: true, fmt: VIZ.sci },
        { key: 'exact', label: 'Recovered exactly', num: true, fmt: function (v, r) { return v + ' / ' + r.total + ' (' + (100 * v / r.total).toFixed(1) + '%)'; } }
      ],
      rows: MEM_SERIES.map(function (s) {
        return { label: s.label, final: Math.pow(10, MEM[s.key][100]), exact: s.exact, total: s.total };
      })
    });
  }

  /* ---------------- Figure 11: identifiability gap ---------------- */
  function renderIdentifiability() {
    var xs = [];
    for (var e = -2; e <= 2.0001; e += 0.025) xs.push(Math.pow(10, e));
    var truth = function (x) { return x + 0.1 * x * x * x; };
    var fits = [
      { label: 'PySR', f: function (x) { return x; } },
      { label: 'SINDy / E-SINDy', f: function (x) { return 1.0096 * x; } },
      { label: 'ODEFormer', f: function (x) { return 1.0053 * x; } },
      { label: 'Operon', f: function (x) { return 1.023 * x + 0.0038; } }
    ];
    var series = [
      { key: 'truth', label: 'Ground truth', color: '#cbd5e1', width: 7, noEndLabel: true, values: xs.map(function (x) { return { x: x, y: truth(x) }; }) }
    ];
    fits.forEach(function (f, i) {
      series.push({ key: 'fit' + i, label: f.label, color: C.s2, width: 2, noEndLabel: i > 0,
        values: xs.map(function (x) { return { x: x, y: f.f(x) }; }) });
    });
    series[1].endLabel = 'Passive fits';
    series.push({ key: 'aces', label: 'LLM-ACES', color: C.ours, width: 2.25, hl: true, values: xs.map(function (x) { return { x: x, y: truth(x) }; }) });

    VIZ.legend(document.getElementById('legend-ident'), [
      { label: 'Ground truth  x + 0.1x³', color: '#cbd5e1' },
      { label: 'LLM-ACES', color: C.ours },
      { label: 'Passive fits (PySR, SINDy, ODEFormer, Operon)', color: C.s2 }
    ]);

    VIZ.lineChart(document.getElementById('chart-ident'), {
      ariaLabel: 'Vector field f(x) of the ground truth, LLM-ACES and passive fits on log-log axes',
      height: 340,
      series: series,
      x: { scale: 'log', domain: [1e-2, 1e2], label: 'State x' },
      y: { scale: 'log', domain: [1e-2, 2e5], label: 'f(x) = dx/dt' },
      shade: { x0: 1e-2, x1: 1.1, label: 'Observed region', color: 'rgba(42,120,214,0.08)' },
      endLabels: true,
      endLabelWidth: 96,
      snap: xs,
      sortTip: false,
      fmtY: function (v) { return v >= 1000 ? d3.format(',.0f')(v) : v >= 10 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(3) : v.toFixed(4); },
      tipTitle: function (x) { return 'x = ' + (x >= 10 ? x.toFixed(1) : x >= 1 ? x.toFixed(2) : x.toPrecision(2)); },
      tipNote: function (x) {
        var r = truth(x) / x;
        if (r < 1.05) return 'Inside the observed range the fits agree with the truth to within ' + ((r - 1) * 100).toFixed(1) + '% — the data cannot tell them apart.';
        return 'Here the passive fits under-predict the true dynamics by ' + (r >= 100 ? d3.format(',.0f')(r) : r.toFixed(1)) + '×.';
      }
    });
  }

  /* ---------------- wiring ---------------- */
  function init() {
    VIZ.segmented(document.getElementById('ctl-bench'), [
      { value: 'odebench', label: 'ODEBench (63 systems)' },
      { value: 'odebase', label: 'ODEBase (59 systems)' }
    ], state.bench, function (v) { state.bench = v; renderMain(); });

    renderIdentifiability();
    renderMain();
    renderAblation();
    renderEfficiency();
    renderMemorization();
    VIZ.initLightbox();
    document.querySelectorAll('.gallery').forEach(VIZ.initGallery);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
