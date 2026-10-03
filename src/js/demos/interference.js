// Chapter 02 — Mach–Zehnder interferometer with phasors, and quantum vs classical walks.
(function () {
  "use strict";
  var M = window.MOA, Q = window.Q, h = M.h, s = M.s, t = M.t, C = Q.C;

  // ------------------------------------------------------------------ interferometer

  M.register("interference/interferometer", function (stage) {
    var phi = 0.8, hits = [0, 0];
    var rand = M.rng(Date.now() % 1e6);
    var diagram = M.svgBox(h("div"), 620, 210, t("mz.title"));
    var boxes = [h("div", { class: "phasor-box" }), h("div", { class: "phasor-box" })];
    var curveBox = h("div");
    var st0 = M.stat("P(D0)", "accent"), st1 = M.stat("P(D1)"), stH = M.stat(t("mz.hits"));

    stage.appendChild(M.controls(
      M.slider({ label: t("mz.phase") + " φ", min: 0, max: 2 * Math.PI, step: 0.01, value: phi,
        format: function (v) { return M.fmt(v * 180 / Math.PI, 0) + "°"; }, onInput: function (v) { phi = v; hits = [0, 0]; draw(); } }).el,
      h("div", { class: "btn-row" }, M.button(t("mz.fire"), function () { fire(100); }, "primary"))));
    stage.appendChild(diagram.parentNode);
    stage.appendChild(h("div", { class: "mz-grid" },
      h("div", {}, h("p", { class: "panel-label" }, t("mz.d0")), boxes[0]),
      h("div", {}, h("p", { class: "panel-label" }, t("mz.d1")), boxes[1]),
      h("div", { class: "mz-curve" }, h("p", { class: "panel-label" }, t("mz.curve")), curveBox)));
    stage.appendChild(h("div", { class: "stats" }, st0.el, st1.el, stH.el));

    var ph0 = Q.phasor(boxes[0], t("mz.d0")), ph1 = Q.phasor(boxes[1], t("mz.d1"));
    var curve = M.svgBox(curveBox, 280, 150, t("mz.curve"));

    function amps() {
      var a = [0.5, 0], b = C.scale(C.exp(phi), 0.5);
      return { d0: [a, b], d1: [a, C.scale(b, -1)] };
    }

    function fire(n) {
      var p0 = Math.cos(phi / 2) * Math.cos(phi / 2);
      for (var i = 0; i < n; i++) hits[rand() < p0 ? 0 : 1]++;
      draw();
    }

    function drawDiagram(p0) {
      M.clear(diagram);
      var src = [30, 150], bs1 = [130, 150], m1 = [130, 50], m2 = [430, 150], bs2 = [430, 50];
      function beam(a, b, w) { diagram.appendChild(s("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: "beam", "stroke-width": w })); }
      beam(src, bs1, 3);
      beam(bs1, m1, 2); beam(bs1, m2, 2); beam(m1, bs2, 2); beam(m2, bs2, 2);
      beam(bs2, [560, 50], 1 + 5 * p0);
      beam(bs2, [430, 10], 1 + 5 * (1 - p0));
      diagram.appendChild(s("rect", { x: 10, y: 138, width: 26, height: 24, rx: 4, class: "device" }));
      diagram.appendChild(s("text", { x: 23, y: 182, "text-anchor": "middle" }, t("mz.source")));
      [bs1, bs2].forEach(function (b, i) {
        diagram.appendChild(s("line", { x1: b[0] - 16, y1: b[1] + 16, x2: b[0] + 16, y2: b[1] - 16, class: "splitter" }));
        diagram.appendChild(s("text", { x: b[0] + (i ? -22 : 14), y: b[1] + 30, "text-anchor": "middle" }, "H"));
      });
      [m1, m2].forEach(function (m) {
        diagram.appendChild(s("line", { x1: m[0] - 14, y1: m[1] + 14, x2: m[0] + 14, y2: m[1] - 14, class: "mirror" }));
      });
      diagram.appendChild(s("rect", { x: 260, y: 36, width: 40, height: 28, rx: 5, class: "shifter" }));
      diagram.appendChild(s("text", { x: 280, y: 55, "text-anchor": "middle", class: "label-strong" }, "φ"));
      diagram.appendChild(s("rect", { x: 560, y: 36, width: 40, height: 28, rx: 5, class: "detector" + (p0 > 0.5 ? " hot" : "") }));
      diagram.appendChild(s("text", { x: 580, y: 55, "text-anchor": "middle", class: "label-strong" }, "D0"));
      diagram.appendChild(s("rect", { x: 410, y: 0, width: 40, height: 12, rx: 3, class: "detector" + (p0 < 0.5 ? " hot" : "") }));
      diagram.appendChild(s("text", { x: 470, y: 12, class: "label-strong" }, "D1"));
      diagram.appendChild(s("text", { x: 580, y: 82, "text-anchor": "middle", class: "mono" }, hits[0] + hits[1] ? String(hits[0]) : ""));
      diagram.appendChild(s("text", { x: 500, y: 26, class: "mono" }, hits[0] + hits[1] ? String(hits[1]) : ""));
    }

    function draw() {
      var A = amps();
      var p0 = C.abs2(C.add(A.d0[0], A.d0[1]));
      drawDiagram(p0);
      [[ph0, A.d0], [ph1, A.d1]].forEach(function (pair) {
        var sum = C.add(pair[1][0], pair[1][1]);
        pair[0].update([
          { a: pair[1][0], cls: "k1", label: "1" },
          { a: sum, from: pair[1][0], cls: "k2", label: "2" },
          { a: sum, cls: "sum" },
        ]);
      });
      M.clear(curve);
      var X = M.linear(0, 2 * Math.PI, 30, 270), Y = M.linear(0, 1, 130, 10);
      curve.appendChild(M.axes({ x: X, y: Y, x0: 30, x1: 270, y0: 130, y1: 10, xTicks: [0, Math.PI, 2 * Math.PI], yTicks: [0, 0.5, 1],
        xFmt: function (v) { return v === 0 ? "0" : v < 4 ? "π" : "2π"; }, yFmt: function (v) { return M.fmt(v, 1); } }));
      var pts = [];
      for (var k = 0; k <= 120; k++) { var x = 2 * Math.PI * k / 120; pts.push([X(x), Y(Math.cos(x / 2) * Math.cos(x / 2))]); }
      curve.appendChild(s("path", { d: M.path(pts), class: "curve" }));
      curve.appendChild(s("circle", { cx: X(phi), cy: Y(p0), r: 5, class: "pt-dot" }));
      st0.set(M.pct(p0, 1));
      st1.set(M.pct(1 - p0, 1));
      stH.set(hits[0] + hits[1] ? hits[0] + " / " + hits[1] : "—");
    }

    draw();
  });

  // ------------------------------------------------------------------ quantum walk

  function hadamardWalk(steps) {
    // amplitudes per position (index offset by `steps`) and coin (0: left, 1: right)
    var n = 2 * steps + 1, re = [new Float64Array(n), new Float64Array(n)], im = [new Float64Array(n), new Float64Array(n)];
    var S2 = Math.SQRT1_2;
    re[0][steps] = S2; im[1][steps] = S2; // symmetric start (|L⟩ + i|R⟩)/√2
    for (var tt = 0; tt < steps; tt++) {
      var nre = [new Float64Array(n), new Float64Array(n)], nim = [new Float64Array(n), new Float64Array(n)];
      for (var x = 0; x < n; x++) {
        var a0r = re[0][x], a0i = im[0][x], a1r = re[1][x], a1i = im[1][x];
        if (!a0r && !a0i && !a1r && !a1i) continue;
        var l_r = S2 * (a0r + a1r), l_i = S2 * (a0i + a1i), r_r = S2 * (a0r - a1r), r_i = S2 * (a0i - a1i);
        if (x > 0) { nre[0][x - 1] += l_r; nim[0][x - 1] += l_i; }
        if (x < n - 1) { nre[1][x + 1] += r_r; nim[1][x + 1] += r_i; }
      }
      re = nre; im = nim;
    }
    var p = [];
    for (var y = 0; y < n; y++) p.push(re[0][y] * re[0][y] + im[0][y] * im[0][y] + re[1][y] * re[1][y] + im[1][y] * im[1][y]);
    return p;
  }

  function binomial(steps) {
    var p = [], n = 2 * steps + 1, logf = [0];
    for (var i = 1; i <= steps; i++) logf.push(logf[i - 1] + Math.log(i));
    for (var x = -steps; x <= steps; x++) {
      if ((x + steps) % 2) { p.push(0); continue; }
      var k = (x + steps) / 2;
      p.push(Math.exp(logf[steps] - logf[k] - logf[steps - k] - steps * Math.LN2));
    }
    void n;
    return p;
  }

  function sigma(p, steps) {
    var m = 0, m2 = 0;
    p.forEach(function (v, i) { var x = i - steps; m += v * x; m2 += v * x * x; });
    return Math.sqrt(Math.max(0, m2 - m * m));
  }

  M.register("interference/walk", function (stage) {
    var steps = 60, MAX = 100;
    var svg = M.svgBox(h("div"), 640, 240, t("walk.title"));
    var stC = M.stat(t("walk.sigmaC")), stQ = M.stat(t("walk.sigmaQ"), "accent"), stR = M.stat(t("walk.ratio"));
    var sl = M.slider({ label: t("walk.steps") + " t", min: 1, max: MAX, step: 1, value: steps, wide: true,
      format: function (v) { return M.fmt(v, 0); }, onInput: function (v) { steps = v; draw(); } });
    var playBtn = M.button(t("walk.play"), function () { if (!anim.running) { steps = 1; } anim.toggle(); }, "primary");

    stage.appendChild(M.controls(sl.el, h("div", { class: "btn-row" }, playBtn)));
    stage.appendChild(svg.parentNode);
    stage.appendChild(h("div", { class: "stats" }, stC.el, stQ.el, stR.el));

    var last = 0;
    var anim = M.animator(stage, function () {
      var now = performance.now();
      if (now - last < 60) return true;
      last = now;
      steps = Math.min(MAX, steps + 1);
      sl.set(steps, true);
      draw();
      return steps < MAX;
    });
    anim.onchange = function (on) { playBtn.textContent = on ? t("walk.pause") : t("walk.play"); };

    function draw() {
      var q = hadamardWalk(steps), c = binomial(steps);
      M.clear(svg);
      var X = M.linear(-MAX - 1, MAX + 1, 20, 620);
      var ymax = Math.max(0.08, Math.max.apply(null, q), Math.max.apply(null, c)) * 1.08;
      var Y = M.linear(0, ymax, 210, 12);
      svg.appendChild(M.axes({ x: X, y: Y, x0: 20, x1: 620, y0: 210, y1: 12, xTicks: [-100, -50, 0, 50, 100],
        yTicks: [], xFmt: function (v) { return M.fmt(v, 0); } }));
      var w = Math.max(1.5, (X(1) - X(0)) * 1.6);
      c.forEach(function (v, i) {
        if (!v) return;
        var x = X(i - steps);
        svg.appendChild(s("rect", { x: x - w / 2, y: Y(v), width: w, height: Y(0) - Y(v), class: "bar-classical" }));
      });
      q.forEach(function (v, i) {
        if (v < 1e-6) return;
        var x = X(i - steps);
        svg.appendChild(s("rect", { x: x - w / 2 + 0.5, y: Y(v), width: Math.max(1, w - 1), height: Y(0) - Y(v), class: "bar-quantum" }));
      });
      svg.appendChild(s("text", { x: 26, y: 24, class: "legend-q" }, "■ " + t("walk.quantum")));
      svg.appendChild(s("text", { x: 26, y: 40, class: "legend-c" }, "■ " + t("walk.classical")));
      var sc = sigma(c, steps), sq = sigma(q, steps);
      stC.set(M.fmt(sc, 1) + "  (√t = " + M.fmt(Math.sqrt(steps), 1) + ")");
      stQ.set(M.fmt(sq, 1) + "  (" + M.fmt(sq / steps, 2) + " · t)");
      stR.set("×" + M.fmt(sq / sc, 1));
    }

    draw();
  });
})();
