// Chapter 04 — an entanglement meter for two-qubit states, and the CHSH game.
(function () {
  "use strict";
  var M = window.MOA, Q = window.Q, h = M.h, s = M.s, t = M.t;

  // ------------------------------------------------------------------ meter

  var STATES = {
    product: [1, 0, 0, 0],
    plus0: [1, 0, 1, 0],
    phiPlus: [1, 0, 0, 1],
    psiMinus: [0, 1, -1, 0],
    partial: [0.9, 0.2, 0.1, 0.4],
  };

  M.register("entanglement/meter", function (stage) {
    var c = STATES.partial.slice();
    var names = ["|00⟩", "|01⟩", "|10⟩", "|11⟩"];
    var sliders = names.map(function (n, i) {
      return M.slider({ label: n, min: -1, max: 1, step: 0.01, value: c[i], format: function (v) { return M.fmt(v, 2); },
        onInput: function (v) { c[i] = v; draw(); } });
    });
    var stDet = M.stat("c₀₀c₁₁ − c₀₁c₁₀", "accent"), stE = M.stat(t("meter.entropy")), stK = M.stat(t("meter.kind"));
    var chartBox = h("div"), aBox = h("div", { class: "mini-bloch" }), bBox = h("div", { class: "mini-bloch" });
    var norm = [];

    stage.appendChild(M.controls(M.select({ label: t("meter.preset"), value: "partial",
      options: Object.keys(STATES).map(function (k) { return { value: k, label: t("meter.presets." + k) }; }),
      onChange: function (v) { c = STATES[v].slice(); sliders.forEach(function (sl, i) { sl.set(c[i], true); }); draw(); } }).el));
    stage.appendChild(h("div", { class: "meter-grid" },
      h("div", { class: "tr-sliders" }, sliders.map(function (sl) { return sl.el; }), h("p", { class: "demo-hint" }, t("meter.normalized"))),
      h("div", {}, h("p", { class: "panel-label" }, t("meter.amps")), chartBox),
      h("div", { class: "mini-pair" },
        h("div", {}, h("p", { class: "panel-label" }, t("meter.qa")), aBox),
        h("div", {}, h("p", { class: "panel-label" }, t("meter.qb")), bBox))));
    stage.appendChild(h("div", { class: "stats" }, stDet.el, stE.el, stK.el));

    var chart = Q.ampChart(chartBox, { width: 300, height: 170, label: t("meter.amps") });
    var rA = [0, 0, 1], rB = [0, 0, 1];
    var bA = Q.bloch(aBox, { label: t("meter.qa"), aspect: 1, vectors: function () { return [{ v: rA, noShadow: true }]; } });
    var bB = Q.bloch(bBox, { label: t("meter.qb"), aspect: 1, vectors: function () { return [{ v: rB, noShadow: true, color: M.color("--k2") }]; } });

    function draw() {
      var n = Math.hypot(c[0], c[1], c[2], c[3]) || 1;
      norm = c.map(function (v) { return v / n; });
      var a = norm[0], b = norm[1], cc = norm[2], d = norm[3];
      var det = a * d - b * cc, conc = Math.min(1, 2 * Math.abs(det));
      var l1 = (1 + Math.sqrt(Math.max(0, 1 - conc * conc))) / 2, l2 = 1 - l1;
      var ent = M.entropy([l1, l2]);
      // Reduced states (real amplitudes): ρ_A = C Cᵀ, ρ_B = Cᵀ C.
      rA = [2 * (a * cc + b * d), 0, (a * a + b * b) - (cc * cc + d * d)];
      rB = [2 * (a * b + cc * d), 0, (a * a + cc * cc) - (b * b + d * d)];
      chart.update(norm.map(function (v) { return [v, 0]; }));
      stDet.set(M.fmt(det, 3));
      stE.set(M.fmt(ent, 3) + " " + t("meter.bits"));
      stK.set(Math.abs(det) < 1e-3 ? t("meter.productState") : ent > 0.999 ? t("meter.maximal") : t("meter.entangled"));
      bA.redraw();
      bB.redraw();
    }

    draw();
  });

  // ------------------------------------------------------------------ CHSH game

  M.register("entanglement/chsh", function (stage) {
    var ang = { a0: 0, a1: 45, b0: 22.5, b1: -22.5 }, model = "quantum", N = 4000;
    var rand = M.rng(Date.now() % 1e6);
    var result = null;
    var gauge = M.svgBox(h("div"), 620, 90, t("chsh.gauge"));
    var plot = M.svgBox(h("div"), 300, 180, t("chsh.corr"));
    var table = h("table", { class: "mini-table" });
    var stS = M.stat("S", "accent"), stTheory = M.stat(t("chsh.theory"));

    var sliders = Object.keys(ang).map(function (k) {
      var lbl = k[0] === "a" ? "α" + (k[1] === "0" ? "₀" : "₁") : "β" + (k[1] === "0" ? "₀" : "₁");
      return M.slider({ label: lbl, min: -90, max: 90, step: 0.5, value: ang[k], format: function (v) { return M.fmt(v, 1) + "°"; },
        onInput: function (v) { ang[k] = v; result = null; draw(); } });
    });

    stage.appendChild(M.controls(
      M.segmented({ label: t("chsh.model"), value: model,
        options: [{ value: "quantum", label: t("chsh.quantum") }, { value: "local", label: t("chsh.local") }],
        onChange: function (v) { model = v; result = null; draw(); } }).el,
      h("div", { class: "btn-row" },
        M.button(t("chsh.optimal"), function () { setAngles(0, 45, 22.5, -22.5); }),
        M.button(t("chsh.aligned"), function () { setAngles(0, 0, 0, 0); }),
        M.button(t("chsh.run"), function () { run(); }, "primary"))));
    stage.appendChild(h("div", { class: "chsh-sliders" }, sliders.map(function (sl) { return sl.el; })));
    stage.appendChild(gauge.parentNode);
    stage.appendChild(h("div", { class: "panel-grid" },
      h("div", {}, h("p", { class: "panel-label" }, t("chsh.corr")), plot.parentNode),
      h("div", {}, h("p", { class: "panel-label" }, t("chsh.table")), table)));
    stage.appendChild(h("div", { class: "stats" }, stS.el, stTheory.el));

    function setAngles(a0, a1, b0, b1) {
      ang = { a0: a0, a1: a1, b0: b0, b1: b1 };
      sliders.forEach(function (sl, i) { sl.set([a0, a1, b0, b1][i], true); });
      result = null;
      draw();
    }

    var RAD = Math.PI / 180;
    // Correlation E(α, β) predicted by each model for polarizers at angles α, β.
    function Eq(a, b) { return Math.cos(2 * (a - b) * RAD); }
    function El(a, b) {
      var d = Math.abs(((a - b) % 180 + 180) % 180);
      d = Math.min(d, 180 - d);
      return 1 - 4 * d / 180;
    }
    function E(a, b) { return model === "quantum" ? Eq(a, b) : El(a, b); }

    function sampleRound(a, b) {
      if (model === "quantum") {
        var same = rand() < Math.cos((a - b) * RAD) * Math.cos((a - b) * RAD);
        var x = rand() < 0.5 ? 1 : -1;
        return [x, same ? x : -x];
      }
      var lambda = rand() * 180;
      var A = Math.cos(2 * (a - lambda) * RAD) >= 0 ? 1 : -1, B = Math.cos(2 * (b - lambda) * RAD) >= 0 ? 1 : -1;
      return [A, B];
    }

    function run() {
      var sums = [[0, 0], [0, 0]], ns = [[0, 0], [0, 0]];
      for (var i = 0; i < N; i++) {
        var x = rand() < 0.5 ? 0 : 1, y = rand() < 0.5 ? 0 : 1;
        var r = sampleRound(x ? ang.a1 : ang.a0, y ? ang.b1 : ang.b0);
        sums[x][y] += r[0] * r[1];
        ns[x][y]++;
      }
      result = sums.map(function (row, x) { return row.map(function (v, y) { return v / ns[x][y]; }); });
      draw();
    }

    function sValue(e) { return e[0][0] + e[0][1] + e[1][0] - e[1][1]; }

    function draw() {
      var th = [[E(ang.a0, ang.b0), E(ang.a0, ang.b1)], [E(ang.a1, ang.b0), E(ang.a1, ang.b1)]];
      var Sth = sValue(th), Sexp = result ? sValue(result) : null;

      M.clear(gauge);
      var X = M.linear(-3, 3, 20, 600);
      gauge.appendChild(s("rect", { x: X(-2), y: 30, width: X(2) - X(-2), height: 22, class: "zone-classical" }));
      gauge.appendChild(s("rect", { x: X(2), y: 30, width: X(2 * Math.SQRT2) - X(2), height: 22, class: "zone-quantum" }));
      gauge.appendChild(s("rect", { x: X(-2 * Math.SQRT2), y: 30, width: X(-2) - X(-2 * Math.SQRT2), height: 22, class: "zone-quantum" }));
      [-2 * Math.SQRT2, -2, 0, 2, 2 * Math.SQRT2].forEach(function (v) {
        gauge.appendChild(s("line", { x1: X(v), x2: X(v), y1: 26, y2: 56, class: "axis-line" }));
        gauge.appendChild(s("text", { x: X(v), y: 72, "text-anchor": "middle", class: "mono" }, Math.abs(v) > 2.5 ? (v < 0 ? "−2√2" : "2√2") : M.fmt(v, 0)));
      });
      gauge.appendChild(s("text", { x: X(0), y: 20, "text-anchor": "middle" }, t("chsh.classicalZone")));
      gauge.appendChild(s("text", { x: X(2.42), y: 20, "text-anchor": "middle" }, t("chsh.quantumZone")));
      gauge.appendChild(s("line", { x1: X(Sth), x2: X(Sth), y1: 24, y2: 58, class: "marker-theory" }));
      if (Sexp !== null) gauge.appendChild(s("circle", { cx: X(Math.max(-3, Math.min(3, Sexp))), cy: 41, r: 7, class: "pt-dot" }));

      M.clear(plot);
      var PX = M.linear(0, 90, 34, 290), PY = M.linear(-1, 1, 160, 12);
      plot.appendChild(M.axes({ x: PX, y: PY, x0: 34, x1: 290, y0: 160, y1: 12, xTicks: [0, 22.5, 45, 67.5, 90], yTicks: [-1, 0, 1],
        xFmt: function (v) { return M.fmt(v, 1) + "°"; }, yFmt: function (v) { return M.fmt(v, 0); } }));
      var q = [], l = [];
      for (var k = 0; k <= 90; k++) { q.push([PX(k), PY(Eq(0, k))]); l.push([PX(k), PY(El(0, k))]); }
      plot.appendChild(s("path", { d: M.path(l), class: "curve-muted" }));
      plot.appendChild(s("path", { d: M.path(q), class: "curve" }));
      plot.appendChild(s("text", { x: 40, y: 152 }, t("chsh.diff")));

      M.clear(table);
      table.appendChild(h("thead", {}, h("tr", {}, h("th", {}, ""), h("th", { class: "num" }, t("chsh.predicted")), h("th", { class: "num" }, t("chsh.measured")))));
      var body = h("tbody");
      [["α₀β₀", 0, 0], ["α₀β₁", 0, 1], ["α₁β₀", 1, 0], ["α₁β₁", 1, 1]].forEach(function (r) {
        body.appendChild(h("tr", {}, h("td", {}, "E(" + r[0] + ")"), h("td", { class: "num" }, M.fmt(th[r[1]][r[2]], 3)),
          h("td", { class: "num" }, result ? M.fmt(result[r[1]][r[2]], 3) : "—")));
      });
      table.appendChild(body);

      stS.set(Sexp === null ? "—" : M.fmt(Sexp, 3) + (Math.abs(Sexp) > 2 ? "  > 2" : ""));
      stTheory.set(M.fmt(Sth, 3));
    }

    draw();
  });
})();
