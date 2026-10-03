// Chapter 08 — Grover's search: oracle and diffusion step by step, success probability and the 2D picture.
(function () {
  "use strict";
  var M = window.MOA, h = M.h, s = M.s, t = M.t;

  M.register("grover/search", function (stage) {
    var n = 5, N = 32, marked = 13, amps, k, phaseFlipped;
    var barsSvg = M.svgBox(h("div"), 640, 200, t("grover.amps"));
    var probSvg = M.svgBox(h("div"), 320, 190, t("grover.prob"));
    var planeSvg = M.svgBox(h("div"), 220, 190, t("grover.plane"));
    var stK = M.stat(t("grover.iters")), stP = M.stat(t("grover.success"), "accent"), stOpt = M.stat(t("grover.optimal"));
    var markSl = M.slider({ label: t("grover.marked"), min: 0, max: N - 1, step: 1, value: marked,
      format: function (v) { return M.fmt(v, 0); }, onInput: function (v) { marked = v; reset(); } });

    stage.appendChild(M.controls(
      M.slider({ label: t("grover.qubits") + " n", min: 2, max: 7, step: 1, value: n, format: function (v) { return v + "  (N = " + (1 << v) + ")"; },
        onInput: function (v) { n = v; N = 1 << n; markSl.input.max = N - 1; if (marked >= N) { marked = N - 1; markSl.set(marked, true); } reset(); } }).el,
      markSl.el));
    stage.appendChild(M.controls(h("div", { class: "btn-row" },
      M.button(t("grover.oracle"), function () { oracle(); draw(); }),
      M.button(t("grover.diffusion"), function () { diffusion(); draw(); }),
      M.button(t("grover.iteration"), function () { if (!phaseFlipped) oracle(); diffusion(); draw(); }, "primary"),
      M.button(t("grover.reset"), function () { reset(); }))));
    stage.appendChild(barsSvg.parentNode);
    stage.appendChild(h("div", { class: "grover-grid" },
      h("div", {}, h("p", { class: "panel-label" }, t("grover.prob")), probSvg.parentNode),
      h("div", {}, h("p", { class: "panel-label" }, t("grover.plane")), planeSvg.parentNode)));
    stage.appendChild(h("div", { class: "stats" }, stK.el, stP.el, stOpt.el));

    function reset() {
      amps = new Float64Array(N).fill(1 / Math.sqrt(N));
      k = 0; phaseFlipped = false;
      draw();
    }
    function oracle() { amps[marked] = -amps[marked]; phaseFlipped = !phaseFlipped; }
    function diffusion() {
      var mean = 0;
      for (var i = 0; i < N; i++) mean += amps[i] / N;
      for (var j = 0; j < N; j++) amps[j] = 2 * mean - amps[j];
      if (phaseFlipped) { k++; phaseFlipped = false; }
    }

    function draw() {
      var theta = Math.asin(1 / Math.sqrt(N)), kopt = Math.max(0, Math.round(Math.PI / (4 * theta) - 0.5));
      // Amplitude bars with the mean.
      M.clear(barsSvg);
      var L = 30, R = 10, T = 10, B = 26, mid = (200 - B + T) / 2, half = (200 - B - T) / 2;
      var maxA = 0, mean = 0;
      for (var i = 0; i < N; i++) { maxA = Math.max(maxA, Math.abs(amps[i])); mean += amps[i] / N; }
      var sc = half / Math.max(maxA, 0.3);
      barsSvg.appendChild(s("line", { x1: L, x2: 640 - R, y1: mid, y2: mid, class: "axis-line" }));
      var slot = (640 - L - R) / N, bw = Math.max(1.5, slot * 0.7);
      for (var j = 0; j < N; j++) {
        var v = amps[j], x = L + slot * (j + 0.5);
        barsSvg.appendChild(s("rect", { x: x - bw / 2, y: v >= 0 ? mid - v * sc : mid, width: bw, height: Math.abs(v) * sc, rx: 1,
          class: "amp-bar" + (j === marked ? " amp-hi" : "") + (v < 0 ? " amp-neg" : "") }));
      }
      barsSvg.appendChild(s("line", { x1: L, x2: 640 - R, y1: mid - mean * sc, y2: mid - mean * sc, class: "mean-line" }));
      barsSvg.appendChild(s("text", { x: 640 - R, y: mid - mean * sc - 5, "text-anchor": "end" }, t("grover.mean")));
      barsSvg.appendChild(s("text", { x: L + slot * (marked + 0.5), y: amps[marked] >= 0 ? mid + 16 : mid - 8, "text-anchor": "middle", class: "label-strong" }, "w = " + marked));

      // Success probability vs iterations.
      M.clear(probSvg);
      var kmax = Math.max(6, 2 * kopt + 3);
      var X = M.linear(0, kmax, 34, 310), Y = M.linear(0, 1, 165, 12);
      probSvg.appendChild(M.axes({ x: X, y: Y, x0: 34, x1: 310, y0: 165, y1: 12, xTicks: [0, kopt, kmax], yTicks: [0, 0.5, 1],
        yFmt: function (v) { return M.fmt(v, 1); } }));
      var pts = [];
      for (var q = 0; q <= 200; q++) { var kk = kmax * q / 200; pts.push([X(kk), Y(Math.pow(Math.sin((2 * kk + 1) * theta), 2))]); }
      probSvg.appendChild(s("path", { d: M.path(pts), class: "curve-muted" }));
      for (var m = 0; m <= kmax; m++) probSvg.appendChild(s("circle", { cx: X(m), cy: Y(Math.pow(Math.sin((2 * m + 1) * theta), 2)), r: 2.5, class: "pt-a" }));
      var pNow = amps[marked] * amps[marked];
      probSvg.appendChild(s("circle", { cx: X(k), cy: Y(pNow), r: 6, class: "pt-dot" }));

      // The 2D plane spanned by |w⊥⟩ (x axis) and |w⟩ (y axis).
      M.clear(planeSvg);
      var cx = 40, cy = 160, rr = 130;
      planeSvg.appendChild(s("path", { d: "M" + (cx + rr) + "," + cy + "A" + rr + "," + rr + " 0 0,0 " + cx + "," + (cy - rr), class: "unit-ball" }));
      planeSvg.appendChild(s("line", { x1: cx, y1: cy, x2: cx + rr + 10, y2: cy, class: "axis-line" }));
      planeSvg.appendChild(s("line", { x1: cx, y1: cy, x2: cx, y2: cy - rr - 10, class: "axis-line" }));
      planeSvg.appendChild(s("text", { x: cx + rr + 6, y: cy + 16, "text-anchor": "end" }, "|w⊥⟩"));
      planeSvg.appendChild(s("text", { x: cx + 6, y: cy - rr - 2 }, "|w⟩"));
      var aw = amps[marked], aperp = 0;
      for (var z = 0; z < N; z++) if (z !== marked) aperp += amps[z] * amps[z];
      aperp = Math.sqrt(aperp) * (amps[(marked + 1) % N] < 0 ? -1 : 1);
      planeSvg.appendChild(s("line", { x1: cx, y1: cy, x2: cx + rr * Math.cos(theta), y2: cy - rr * Math.sin(theta), class: "curve-muted" }));
      planeSvg.appendChild(s("text", { x: cx + rr * Math.cos(theta) + 4, y: cy - rr * Math.sin(theta) + 12 }, "|s⟩"));
      planeSvg.appendChild(s("line", { x1: cx, y1: cy, x2: cx + rr * aperp, y2: cy - rr * aw, class: "state-arrow" }));
      planeSvg.appendChild(s("circle", { cx: cx + rr * aperp, cy: cy - rr * aw, r: 5, class: "pt-dot" }));

      stK.set(M.fmt(k, 0) + (phaseFlipped ? " + " + t("grover.oracleOnly") : ""));
      stP.set(M.pct(pNow, 1));
      stOpt.set(M.fmt(kopt, 0) + "  (≈ π/4 · √N = " + M.fmt(Math.PI / 4 * Math.sqrt(N), 1) + ")");
    }

    reset();
  });
})();
