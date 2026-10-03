// Chapter 09 — decoherence channels on the Bloch sphere, and the repetition code threshold.
(function () {
  "use strict";
  var M = window.MOA, Q = window.Q, h = M.h, s = M.s, t = M.t;

  // ------------------------------------------------------------------ decoherence

  // A ring of initial states plus the poles, to show how the whole ball is deformed.
  var CLOUD = [];
  for (var i = 0; i < 6; i++) {
    var th = Math.PI * (i + 0.5) / 6;
    for (var j = 0; j < 12; j++) CLOUD.push(Q.blochVector(th, 2 * Math.PI * j / 12));
  }
  CLOUD.push([0, 0, 1], [0, 0, -1]);

  var CHANNELS = {
    dephasing: function (r, tt) { var f = Math.exp(-tt); return [f * r[0], f * r[1], r[2]]; },
    damping: function (r, tt) { var g = 1 - Math.exp(-tt), f = Math.sqrt(1 - g); return [f * r[0], f * r[1], g + (1 - g) * r[2]]; },
    depolarizing: function (r, tt) { var f = Math.exp(-tt); return [f * r[0], f * r[1], f * r[2]]; },
  };
  var STARTS = { plus: [1, 0, 0], one: [0, 0, -1], plusI: [0, 1, 0], mixed: Q.blochVector(1, 0.8) };

  M.register("error-correction/decoherence", function (stage) {
    var channel = "dephasing", tt = 0.6, start = "plus";
    var holder = h("div", { class: "bloch-holder" });
    var stR = M.stat(t("deco.length"), "accent"), stPur = M.stat(t("deco.purity"));

    stage.appendChild(M.controls(
      M.segmented({ label: t("deco.channel"), value: channel,
        options: Object.keys(CHANNELS).map(function (k) { return { value: k, label: t("deco.channels." + k) }; }),
        onChange: function (v) { channel = v; draw(); } }).el,
      M.select({ label: t("deco.state"), value: start, options: Object.keys(STARTS).map(function (k) { return { value: k, label: t("deco.starts." + k) }; }),
        onChange: function (v) { start = v; draw(); } }).el));
    stage.appendChild(M.controls(M.slider({ label: t("deco.time") + " t / T", min: 0, max: 3, step: 0.01, value: tt, wide: true,
      format: function (v) { return M.fmt(v, 2); }, onInput: function (v) { tt = v; draw(); } }).el));
    stage.appendChild(h("div", { class: "bloch-center" }, holder));
    stage.appendChild(h("div", { class: "stats" }, stR.el, stPur.el));

    var cv = Q.bloch(holder, {
      label: t("deco.title"), aspect: 1.25,
      vectors: function () {
        var f = CHANNELS[channel], faint = M.color("--faint");
        var out = CLOUD.map(function (v) { return { v: f(v, tt), dot: true, color: faint }; });
        out.push({ v: f(STARTS[start], tt), label: "ρ" });
        return out;
      },
    });

    function draw() {
      var r = CHANNELS[channel](STARTS[start], tt), len = Math.hypot(r[0], r[1], r[2]);
      stR.set(M.fmt(len, 3));
      stPur.set(M.fmt((1 + len * len) / 2, 3));
      cv.redraw();
    }

    draw();
  });

  // ------------------------------------------------------------------ repetition code

  function binom(n, k) { var r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }
  function logical(p, d) {
    var s0 = 0;
    for (var k = Math.floor(d / 2) + 1; k <= d; k++) s0 += binom(d, k) * Math.pow(p, k) * Math.pow(1 - p, d - k);
    return s0;
  }

  M.register("error-correction/repetition", function (stage) {
    var p = 0.1, d = 5, trials = null, sampleRow = null;
    var rand = M.rng(Date.now() % 1e6);
    var svg = M.svgBox(h("div"), 640, 260, t("rep.title"));
    var row = h("div", { class: "rep-row", "aria-live": "polite" });
    var stL = M.stat(t("rep.theory"), "accent"), stE = M.stat(t("rep.empirical")), stG = M.stat(t("rep.gain"));

    stage.appendChild(M.controls(
      M.slider({ label: t("rep.p") + " p", min: 0.001, max: 0.6, log: true, value: p, format: function (v) { return M.fmt(v, 3); },
        onInput: function (v) { p = v; trials = null; draw(); } }).el,
      M.segmented({ label: t("rep.d") + " d", value: String(d), options: [1, 3, 5, 7, 9].map(function (v) { return { value: String(v), label: String(v) }; }),
        onChange: function (v) { d = +v; trials = null; draw(); } }).el,
      h("div", { class: "btn-row" }, M.button(t("rep.run"), function () { run(); }, "primary"))));
    stage.appendChild(svg.parentNode);
    stage.appendChild(row);
    stage.appendChild(h("div", { class: "stats" }, stL.el, stE.el, stG.el));

    function run() {
      var fails = 0, n = 10000;
      for (var i = 0; i < n; i++) {
        var errs = 0;
        for (var j = 0; j < d; j++) if (rand() < p) errs++;
        if (errs > d / 2) fails++;
      }
      var example = [];
      for (var k = 0; k < d; k++) example.push(rand() < p ? 1 : 0);
      trials = fails / n;
      sampleRow = example;
      draw();
    }

    function draw() {
      M.clear(svg);
      var X = M.linear(Math.log10(0.001), Math.log10(0.6), 50, 625), Y = M.linear(-8, 0, 235, 12);
      svg.appendChild(M.axes({ x: X, y: Y, x0: 50, x1: 625, y0: 235, y1: 12, xTicks: [-3, -2, -1, Math.log10(0.5)], yTicks: [-8, -6, -4, -2, 0],
        xFmt: function (v) { return M.fmt(Math.pow(10, v), 3, 0); },
        yFmt: function (v) { return v === 0 ? "1" : "10" + "⁻" + "⁰¹²³⁴⁵⁶⁷⁸⁹"[-v]; }, xLabel: t("rep.xLabel"), yLabel: t("rep.yLabel") }));
      svg.appendChild(s("line", { x1: X(Math.log10(0.5)), x2: X(Math.log10(0.5)), y1: 12, y2: 235, class: "period-line" }));
      [1, 3, 5, 7, 9].forEach(function (dd) {
        var pts = [];
        for (var q = 0; q <= 160; q++) {
          var lp = Math.log10(0.001) + (Math.log10(0.6) - Math.log10(0.001)) * q / 160;
          pts.push([X(lp), Y(Math.max(-8, Math.log10(Math.max(1e-12, logical(Math.pow(10, lp), dd)))))]);
        }
        svg.appendChild(s("path", { d: M.path(pts), class: dd === d ? "curve" : "curve-muted" }));
        var last = pts[Math.round(160 * 0.25)];
        svg.appendChild(s("text", { x: last[0] + 4, y: last[1] - 4, class: dd === d ? "label-strong" : "" }, "d=" + dd));
      });
      var pl = logical(p, d);
      svg.appendChild(s("circle", { cx: X(Math.log10(p)), cy: Y(Math.max(-8, Math.log10(Math.max(1e-12, pl)))), r: 6, class: "pt-dot" }));

      M.clear(row);
      if (sampleRow) {
        var errs = sampleRow.reduce(function (a, b) { return a + b; }, 0);
        sampleRow.forEach(function (e) { row.appendChild(h("span", { class: "rep-bit" + (e ? " err" : "") }, e ? "1" : "0")); });
        row.appendChild(h("span", { class: "rep-verdict" + (errs > d / 2 ? " bad" : "") }, errs > d / 2 ? t("rep.fail") : t("rep.ok")));
      }
      stL.set(pl < 1e-4 ? pl.toExponential(1) : M.fmt(pl, 4));
      stE.set(trials === null ? "—" : M.fmt(trials, 4) + "  (10 000)");
      stG.set(pl > 0 ? (p / pl >= 1 ? "×" + M.fmt(p / pl, p / pl > 100 ? 0 : 1) + " " + t("rep.better") : t("rep.worse")) : "—");
    }

    draw();
  });
})();
