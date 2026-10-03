// Chapter 05 — a three-qubit circuit simulator. Click cells to cycle gates; ● makes the column controlled.
(function () {
  "use strict";
  var M = window.MOA, Q = window.Q, h = M.h, s = M.s, t = M.t, C = Q.C;

  var NQ = 3, COLS = 8;
  var CYCLE = ["", "H", "X", "Z", "S", "T", "Y", "●", "⊕"];

  function grid(spec) { // spec: list of [qubit, col, gate]
    var g = [];
    for (var q = 0; q < NQ; q++) g.push(new Array(COLS).fill(""));
    (spec || []).forEach(function (c) { g[c[0]][c[1]] = c[2]; });
    return g;
  }

  var PRESETS = {
    empty: [],
    interference: [[0, 0, "H"], [0, 1, "H"]],
    bell: [[0, 0, "H"], [0, 1, "●"], [1, 1, "⊕"]],
    ghz: [[0, 0, "H"], [0, 1, "●"], [1, 1, "⊕"], [1, 2, "●"], [2, 2, "⊕"]],
    toffoli: [[0, 0, "X"], [1, 0, "X"], [0, 1, "●"], [1, 1, "●"], [2, 1, "⊕"]],
    // Deutsch–Jozsa on two input qubits, ancilla q2 in |−⟩. Balanced oracle f(x) = x0 ⊕ x1.
    djBalanced: [[2, 0, "X"], [0, 1, "H"], [1, 1, "H"], [2, 1, "H"], [0, 2, "●"], [2, 2, "⊕"], [1, 3, "●"], [2, 3, "⊕"], [0, 4, "H"], [1, 4, "H"]],
    djConstant: [[2, 0, "X"], [0, 1, "H"], [1, 1, "H"], [2, 1, "H"], [0, 4, "H"], [1, 4, "H"]],
    phaseKick: [[0, 0, "H"], [1, 0, "X"], [1, 1, "H"], [0, 2, "●"], [1, 2, "⊕"], [0, 3, "H"]],
  };

  function simulate(g) {
    var st = new Q.State(NQ);
    for (var c = 0; c < COLS; c++) {
      var controls = [];
      for (var q = 0; q < NQ; q++) if (g[q][c] === "●") controls.push(q);
      for (var q2 = 0; q2 < NQ; q2++) {
        var gate = g[q2][c];
        if (!gate || gate === "●") continue;
        var U = gate === "⊕" ? Q.GATES.X : Q.GATES[gate];
        st.apply(U, q2, controls);
      }
    }
    return st;
  }

  function cstr(z) {
    var re = Math.abs(z[0]) < 5e-4 ? 0 : z[0], im = Math.abs(z[1]) < 5e-4 ? 0 : z[1];
    if (!im) return M.fmt(re, 3);
    if (!re) return M.fmt(im, 3) + "i";
    return "(" + M.fmt(re, 3) + (im < 0 ? " − " : " + ") + M.fmt(Math.abs(im), 3) + "i)";
  }

  M.register("circuits/simulator", function (stage) {
    var g = grid(PRESETS.bell);
    var W = 640, H = 170, x0 = 70, cw = 66, y0 = 34, rh = 50;
    var svg = M.svgBox(h("div", { class: "circuit-box" }), W, H, t("circ.title"));
    var chartBox = h("div");
    var stateEl = h("p", { class: "state-text circuit-state", "aria-live": "polite" });

    stage.appendChild(M.controls(
      M.select({ label: t("circ.preset"), value: "bell",
        options: Object.keys(PRESETS).map(function (k) { return { value: k, label: t("circ.presets." + k) }; }),
        onChange: function (v) { g = grid(PRESETS[v]); draw(); } }).el,
      M.button(t("circ.clear"), function () { g = grid([]); draw(); }),
      h("span", { class: "demo-hint" }, t("circ.hint"))));
    stage.appendChild(svg.parentNode);
    stage.appendChild(h("div", { class: "amp-head" }, h("p", { class: "panel-label" }, t("circ.amps")), Q.phaseLegend(t("circ.phase"))));
    stage.appendChild(chartBox);
    stage.appendChild(stateEl);
    var chart = Q.ampChart(chartBox, { width: 640, height: 190, label: t("circ.amps") });

    function cell(q, c) {
      return { x: x0 + c * cw + cw / 2, y: y0 + q * rh };
    }

    function draw() {
      M.clear(svg);
      for (var q = 0; q < NQ; q++) {
        var y = y0 + q * rh;
        svg.appendChild(s("text", { x: 14, y: y + 5, class: "mono label-strong" }, "q" + q + " |0⟩"));
        svg.appendChild(s("line", { x1: x0 - 4, x2: W - 10, y1: y, y2: y, class: "wire" }));
      }
      for (var c = 0; c < COLS; c++) {
        var used = [];
        for (var q1 = 0; q1 < NQ; q1++) if (g[q1][c]) used.push(q1);
        var hasCtrl = used.some(function (q) { return g[q][c] === "●"; });
        if (hasCtrl && used.length > 1) {
          var a = cell(Math.min.apply(null, used), c), b = cell(Math.max.apply(null, used), c);
          svg.appendChild(s("line", { x1: a.x, x2: b.x, y1: a.y, y2: b.y, class: "ctrl-line" }));
        }
        for (var q2 = 0; q2 < NQ; q2++) {
          var p = cell(q2, c), gate = g[q2][c];
          var hit = s("rect", { x: p.x - cw / 2 + 3, y: p.y - rh / 2 + 3, width: cw - 6, height: rh - 6, rx: 6,
            class: "cell-hit", tabindex: "0", role: "button",
            "aria-label": "q" + q2 + ", " + t("circ.col") + " " + (c + 1) + ": " + (gate || t("circ.emptyCell")) });
          (function (qq, cc) {
            hit.addEventListener("click", function () { cycle(qq, cc); });
            hit.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); cycle(qq, cc); } });
          })(q2, c);
          svg.appendChild(hit);
          if (gate === "●") {
            svg.appendChild(s("circle", { cx: p.x, cy: p.y, r: 6, class: "ctrl-dot" }));
          } else if (gate === "⊕") {
            svg.appendChild(s("circle", { cx: p.x, cy: p.y, r: 12, class: "target" }));
            svg.appendChild(s("line", { x1: p.x - 12, x2: p.x + 12, y1: p.y, y2: p.y, class: "target-cross" }));
            svg.appendChild(s("line", { x1: p.x, x2: p.x, y1: p.y - 12, y2: p.y + 12, class: "target-cross" }));
          } else if (gate) {
            svg.appendChild(s("rect", { x: p.x - 15, y: p.y - 15, width: 30, height: 30, rx: 4, class: "gate-box" }));
            svg.appendChild(s("text", { x: p.x, y: p.y + 5, "text-anchor": "middle", class: "gate-label" }, gate));
          }
        }
      }
      var st = simulate(g);
      var amps = [];
      for (var i = 0; i < 8; i++) amps.push(st.amp(i));
      chart.update(amps);
      var terms = [];
      amps.forEach(function (a, i) { if (C.abs2(a) > 1e-6) terms.push(cstr(a) + " " + Q.ket(i, NQ)); });
      stateEl.textContent = "|ψ⟩ = " + terms.join(" + ").replace(/\+ −/g, "− ").replace(/\+ \(−/g, "+ (−");
    }

    function cycle(q, c) {
      var i = CYCLE.indexOf(g[q][c]);
      g[q][c] = CYCLE[(i + 1) % CYCLE.length];
      draw();
    }

    draw();
  });
})();
