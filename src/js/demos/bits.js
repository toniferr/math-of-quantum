// Chapter 00 — the same "half a NOT" in the 1-norm world (stochastic) and the 2-norm world (rotation).
(function () {
  "use strict";
  var M = window.MOA, h = M.h, s = M.s, t = M.t;

  M.register("bits/norms", function (stage) {
    var tt = 0.5;
    var S = 260, pad = 30;
    var left = M.svgBox(h("div"), S, S, t("norms.classical"));
    var right = M.svgBox(h("div"), S, S, t("norms.quantum"));
    var stC = M.stat(t("norms.cAfter")), stQ = M.stat(t("norms.qAfter"), "accent"), stR = M.stat(t("norms.cRev"));

    stage.appendChild(M.controls(M.slider({ label: t("norms.fraction") + " t", min: 0, max: 1, step: 0.01, value: tt, wide: true,
      format: function (v) { return M.fmt(v, 2); }, onInput: function (v) { tt = v; draw(); } }).el));
    stage.appendChild(h("div", { class: "panel-grid" },
      h("div", {}, h("p", { class: "panel-label" }, t("norms.classical")), left.parentNode),
      h("div", {}, h("p", { class: "panel-label" }, t("norms.quantum")), right.parentNode)));
    stage.appendChild(h("div", { class: "stats" }, stC.el, stR.el, stQ.el));

    var X = M.linear(-1.15, 1.15, pad, S - pad), Y = M.linear(-1.15, 1.15, S - pad, pad);

    function frame(svg, unit) {
      M.clear(svg);
      svg.appendChild(s("line", { x1: X(-1.15), x2: X(1.15), y1: Y(0), y2: Y(0), class: "axis-line" }));
      svg.appendChild(s("line", { x1: X(0), x2: X(0), y1: Y(-1.15), y2: Y(1.15), class: "axis-line" }));
      svg.appendChild(unit);
      svg.appendChild(s("text", { x: X(1.13), y: Y(0) - 6, "text-anchor": "end", class: "label-strong" }, "|0⟩"));
      svg.appendChild(s("text", { x: X(0) + 6, y: Y(1.08), class: "label-strong" }, "|1⟩"));
    }

    function marks(svg, pts, arrows) {
      var names = ["", "×1", "×2"];
      pts.forEach(function (p, i) {
        if (arrows) svg.appendChild(s("line", { x1: X(0), y1: Y(0), x2: X(p[0]), y2: Y(p[1]), class: "vec-line step-" + i }));
        svg.appendChild(s("circle", { cx: X(p[0]), cy: Y(p[1]), r: i ? 6 : 5, class: "step-dot step-" + i }));
        if (i) svg.appendChild(s("text", { x: X(p[0]) + 8, y: Y(p[1]) - 6, class: "label-strong" }, names[i]));
      });
    }

    function draw() {
      // 1-norm: the probability simplex is the segment p0 + p1 = 1 inside the diamond |x| + |y| = 1.
      frame(left, s("g", {},
        s("path", { d: "M" + X(1) + "," + Y(0) + "L" + X(0) + "," + Y(1) + "L" + X(-1) + "," + Y(0) + "L" + X(0) + "," + Y(-1) + "Z", class: "unit-ball" }),
        s("line", { x1: X(1), y1: Y(0), x2: X(0), y2: Y(1), class: "simplex" })));
      var c1 = [1 - tt, tt], c2 = [(1 - tt) * (1 - tt) + tt * tt, 2 * tt * (1 - tt)];
      marks(left, [[1, 0], c1, c2], false);

      // 2-norm: unit circle; a rotation by angle πt/2.
      frame(right, s("g", {}, s("circle", { cx: X(0), cy: Y(0), r: X(1) - X(0), class: "unit-ball" })));
      var a = Math.PI * tt / 2;
      var q1 = [Math.cos(a), Math.sin(a)], q2 = [Math.cos(2 * a), Math.sin(2 * a)];
      marks(right, [[1, 0], q1, q2], true);

      stC.set("(" + M.fmt(c2[0], 2) + ", " + M.fmt(c2[1], 2) + ")");
      var det = 1 - 2 * tt;
      stR.set(tt === 0 || tt === 1 ? t("norms.yes") : Math.abs(det) < 1e-9 ? t("norms.never") : t("norms.notStochastic"));
      stQ.set("(" + M.fmt(q2[0], 2) + ", " + M.fmt(q2[1], 2) + ") → P(1) = " + M.pct(q2[1] * q2[1], 0));
    }

    draw();
  });
})();
