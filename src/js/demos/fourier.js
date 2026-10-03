// Chapter 06 — QFT of a periodic state, and Bernstein–Vazirani: n queries vs one.
(function () {
  "use strict";
  var M = window.MOA, Q = window.Q, h = M.h, t = M.t, C = Q.C;

  // ------------------------------------------------------------------ QFT of a periodic state

  M.register("fourier/qft", function (stage) {
    var N = 64, r = 8, x0 = 0;
    var inBox = h("div"), outBox = h("div");
    var stM = M.stat(t("qft.terms")), stS = M.stat(t("qft.spacing"), "accent"), stP = M.stat(t("qft.peaks"));
    var offSl = M.slider({ label: t("qft.offset") + " x₀", min: 0, max: r - 1, step: 1, value: x0,
      format: function (v) { return M.fmt(v, 0); }, onInput: function (v) { x0 = v; draw(); } });

    stage.appendChild(M.controls(
      M.slider({ label: t("qft.period") + " r", min: 1, max: 20, step: 1, value: r, format: function (v) { return M.fmt(v, 0); },
        onInput: function (v) { r = v; offSl.input.max = r - 1; if (x0 > r - 1) { x0 = r - 1; offSl.set(x0, true); } draw(); } }).el,
      offSl.el));
    stage.appendChild(h("p", { class: "panel-label" }, t("qft.input")));
    stage.appendChild(inBox);
    stage.appendChild(h("div", { class: "amp-head" }, h("p", { class: "panel-label" }, t("qft.output")), Q.phaseLegend(t("circ.phase"))));
    stage.appendChild(outBox);
    stage.appendChild(h("div", { class: "stats" }, stM.el, stS.el, stP.el));

    var lbl = function (i) { return String(i); };
    var inChart = Q.ampChart(inBox, { width: 640, height: 120, label: t("qft.input"), labelFn: lbl });
    var outChart = Q.ampChart(outBox, { width: 640, height: 170, label: t("qft.output"), labelFn: lbl, scale: "max" });

    function draw() {
      var xs = [];
      for (var x = x0; x < N; x += r) xs.push(x);
      var amp = 1 / Math.sqrt(xs.length);
      var input = [];
      for (var i = 0; i < N; i++) input.push([0, 0]);
      xs.forEach(function (x) { input[x] = [amp, 0]; });
      var out = [];
      for (var k = 0; k < N; k++) {
        var acc = [0, 0];
        xs.forEach(function (x) { acc = C.add(acc, C.exp(2 * Math.PI * x * k / N)); });
        out.push(C.scale(acc, amp / Math.sqrt(N)));
      }
      inChart.update(input);
      outChart.update(out);
      var peaks = out.filter(function (a) { return C.abs2(a) > 0.5 / r; }).length;
      stM.set(M.fmt(xs.length, 0));
      stS.set("N/r = " + M.fmt(N / r, N % r ? 2 : 0));
      stP.set(N % r ? t("qft.blurred", { n: peaks }) : t("qft.exact", { n: r }));
    }

    draw();
  });

  // ------------------------------------------------------------------ Bernstein–Vazirani

  M.register("fourier/bv", function (stage) {
    var n = 6, secret = [1, 0, 1, 1, 0, 1], known = [], qResult = null;
    var bitsRow = h("div", { class: "bit-row" });
    var classical = h("div", { class: "bv-panel" }), quantum = h("div", { class: "bv-panel" });
    var chartBox = h("div");

    stage.appendChild(h("p", { class: "panel-label" }, t("bv.secret")));
    stage.appendChild(bitsRow);
    stage.appendChild(h("div", { class: "panel-grid" },
      h("div", {}, h("p", { class: "panel-label" }, t("bv.classical")), classical),
      h("div", {}, h("p", { class: "panel-label" }, t("bv.quantum")), quantum, chartBox)));
    var chart = Q.ampChart(chartBox, { width: 320, height: 120, label: t("bv.quantum"), labels: false });

    var qBtn = M.button(t("bv.run"), function () { runQuantum(); }, "primary");
    var cBtn = M.button(t("bv.query"), function () { if (known.length < n) { known.push(secret[known.length]); draw(); } });

    function runQuantum() {
      var st = new Q.State(n);
      for (var q = 0; q < n; q++) st.apply(Q.GATES.H, q);
      for (var q2 = 0; q2 < n; q2++) if (secret[q2]) st.apply(Q.GATES.Z, q2); // phase oracle (−1)^{s·x}
      for (var q3 = 0; q3 < n; q3++) st.apply(Q.GATES.H, q3);
      var amps = [];
      for (var i = 0; i < (1 << n); i++) amps.push(st.amp(i));
      chart.update(amps);
      qResult = st.sample(Math.random);
      draw();
    }

    function draw() {
      M.clear(bitsRow);
      secret.forEach(function (b, i) {
        bitsRow.appendChild(h("button", { type: "button", class: "bit-btn", "aria-pressed": b ? "true" : "false",
          onclick: function () { secret[i] = 1 - secret[i]; known = []; qResult = null; chart.update([]); draw(); } }, String(b)));
      });
      M.clear(classical);
      var list = h("ol", { class: "query-list" });
      known.forEach(function (b, i) {
        var e = new Array(n).fill(0); e[i] = 1;
        list.appendChild(h("li", {}, h("code", {}, "f(" + e.join("") + ") = " + b)));
      });
      classical.appendChild(list);
      classical.appendChild(h("p", { class: "bv-guess" }, "s = " + secret.map(function (_, i) { return i < known.length ? known[i] : "?"; }).join("")));
      classical.appendChild(h("div", { class: "btn-row" }, cBtn));
      classical.appendChild(h("p", { class: "demo-hint" }, t("bv.queries", { k: known.length, n: n })));
      cBtn.disabled = known.length >= n;
      M.clear(quantum);
      quantum.appendChild(h("div", { class: "btn-row" }, qBtn));
      quantum.appendChild(h("p", { class: "bv-guess" }, qResult === null ? "s = ??????" : "s = " + Q.ket(qResult, n).slice(1, -1)));
      quantum.appendChild(h("p", { class: "demo-hint" }, t("bv.queries", { k: qResult === null ? 0 : 1, n: 1 })));
    }

    draw();
  });
})();
