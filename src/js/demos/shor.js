// Chapter 07 — Shor's algorithm on small numbers: period, exact measurement distribution,
// continued fractions and the final gcds.
(function () {
  "use strict";
  var M = window.MOA, Q = window.Q, h = M.h, s = M.s, t = M.t;

  var NUMBERS = [15, 21, 33, 35, 39, 51, 55, 57, 65, 69, 77, 85, 87, 91];

  function order(a, N) {
    var v = a % N;
    for (var r = 1; r <= N; r++) { if (v === 1) return r; v = v * a % N; }
    return null;
  }

  // Convergents p/q of the continued fraction of y/Q.
  function convergents(y, Qn) {
    var out = [], a = [], num = y, den = Qn;
    while (den && a.length < 40) { var q = Math.floor(num / den); a.push(q); var r = num - q * den; num = den; den = r; }
    var p0 = 0, q0 = 1, p1 = 1, q1 = 0;
    a.forEach(function (ai) {
      var p2 = ai * p1 + p0, q2 = ai * q1 + q0;
      out.push([p2, q2]);
      p0 = p1; q0 = q1; p1 = p2; q1 = q2;
    });
    return { terms: a, conv: out };
  }

  M.register("shor/walkthrough", function (stage) {
    var N = 21, a = 2, y = null;
    var rand = M.rng(Date.now() % 1e6);
    var aSel;
    var periodSvg = M.svgBox(h("div"), 640, 170, t("shor.f"));
    var distSvg = M.svgBox(h("div"), 640, 170, t("shor.dist"));
    var step3 = h("div", { class: "shor-step" }), step4 = h("div", { class: "shor-step" });
    var info = h("p", { class: "demo-hint" });

    var nSel = M.select({ label: "N", value: String(N), options: NUMBERS.map(function (n) { return { value: String(n), label: String(n) }; }),
      onChange: function (v) { N = +v; rebuildA(); y = null; draw(); } });
    var aWrap = h("span");
    stage.appendChild(M.controls(nSel.el, aWrap,
      h("div", { class: "btn-row" }, M.button(t("shor.measure"), function () { sample(); }, "primary"))));
    stage.appendChild(info);
    stage.appendChild(h("ol", { class: "shor-steps" },
      h("li", {}, h("p", { class: "panel-label" }, t("shor.step1")), periodSvg.parentNode),
      h("li", {}, h("p", { class: "panel-label" }, t("shor.step2")), distSvg.parentNode),
      h("li", {}, h("p", { class: "panel-label" }, t("shor.step3")), step3),
      h("li", {}, h("p", { class: "panel-label" }, t("shor.step4")), step4)));

    function rebuildA() {
      var opts = [];
      for (var x = 2; x < N; x++) if (Q.gcd(x, N) === 1) opts.push({ value: String(x), label: String(x) });
      if (!opts.some(function (o) { return +o.value === a; })) a = +opts[0].value;
      M.clear(aWrap);
      aSel = M.select({ label: "a", value: String(a), options: opts, onChange: function (v) { a = +v; y = null; draw(); } });
      aWrap.appendChild(aSel.el);
    }

    function qubits() { var tq = 1; while ((1 << tq) < N * N) tq++; return tq; }

    // Exact probability of measuring y after the QFT (second register traced out).
    function distribution(r, Qn) {
      var probs = new Float64Array(Qn);
      for (var yy = 0; yy < Qn; yy++) {
        var th = 2 * Math.PI * r * yy / Qn, sn = Math.sin(th / 2), total = 0;
        for (var x0 = 0; x0 < r; x0++) {
          var m = Math.floor((Qn - 1 - x0) / r) + 1;
          total += Math.abs(sn) < 1e-12 ? m * m : Math.pow(Math.sin(m * th / 2) / sn, 2);
        }
        probs[yy] = total / (Qn * Qn);
      }
      return probs;
    }

    var cache = {};
    function dist(r, Qn) { var k = r + ":" + Qn; if (!cache[k]) cache[k] = distribution(r, Qn); return cache[k]; }

    function sample() {
      var r = order(a, N), Qn = 1 << qubits(), p = dist(r, Qn);
      var u = rand(), acc = 0;
      for (var i = 0; i < Qn; i++) { acc += p[i]; if (u < acc) { y = i; break; } }
      if (y === null) y = Qn - 1;
      draw();
    }

    function draw() {
      var r = order(a, N), tq = qubits(), Qn = 1 << tq;
      info.textContent = t("shor.info", { t: tq, Q: Qn, r: r });

      // 1. The periodic function.
      M.clear(periodSvg);
      var xs = Math.min(48, Math.max(3 * r + 2, 24));
      var X = M.linear(0, xs - 1, 36, 628), Y = M.linear(0, N, 150, 12);
      periodSvg.appendChild(M.axes({ x: X, y: Y, x0: 36, x1: 628, y0: 150, y1: 12, xTicks: [0, r, 2 * r, 3 * r].filter(function (v) { return v < xs; }),
        yTicks: [0, N], yFmt: function (v) { return M.fmt(v, 0); } }));
      for (var x = 0; x < xs; x++) {
        var v = Q.modpow(a, x, N);
        periodSvg.appendChild(s("circle", { cx: X(x), cy: Y(v), r: 3.5, class: v === 1 ? "pt-b" : "pt-a" }));
      }
      for (var k = 0; k * r < xs; k++) periodSvg.appendChild(s("line", { x1: X(k * r), x2: X(k * r), y1: 12, y2: 150, class: "period-line" }));

      // 2. Measurement distribution, binned for drawing.
      M.clear(distSvg);
      var p = dist(r, Qn), bins = 320, per = Qn / bins, mx = 0, vals = [];
      for (var b = 0; b < bins; b++) {
        var m = 0;
        for (var j = Math.floor(b * per); j < Math.floor((b + 1) * per); j++) if (p[j] > m) m = p[j];
        vals.push(m); if (m > mx) mx = m;
      }
      var DX = M.linear(0, Qn, 36, 628), DY = M.linear(0, mx * 1.1, 150, 12);
      distSvg.appendChild(M.axes({ x: DX, y: DY, x0: 36, x1: 628, y0: 150, y1: 12, xTicks: [0, Qn / 2, Qn], yTicks: [],
        xFmt: function (v) { return M.fmt(v, 0); } }));
      var w = (628 - 36) / bins;
      vals.forEach(function (v, i) {
        if (v < mx * 0.01) return;
        distSvg.appendChild(s("rect", { x: 36 + i * w, y: DY(v), width: Math.max(1, w), height: 150 - DY(v), class: "bar-quantum" }));
      });
      for (var l = 0; l < r; l++) distSvg.appendChild(s("line", { x1: DX(l * Qn / r), x2: DX(l * Qn / r), y1: 12, y2: 150, class: "period-line" }));
      if (y !== null) distSvg.appendChild(s("circle", { cx: DX(y), cy: DY(p[y]), r: 6, class: "pt-dot" }));

      // 3. Continued fractions.
      M.clear(step3);
      var candidate = null;
      if (y === null) {
        step3.appendChild(h("p", { class: "demo-hint" }, t("shor.press")));
      } else {
        var cf = convergents(y, Qn);
        step3.appendChild(h("p", {}, h("code", {}, "y = " + y + ",  y/Q = " + y + "/" + Qn + " = [" + cf.terms.join("; ") + "]")));
        var row = h("p", { class: "conv-row" });
        cf.conv.forEach(function (pq) {
          var ok = pq[1] < N && pq[1] > 0;
          if (ok) candidate = pq[1];
          row.appendChild(h("span", { class: "conv" + (ok ? " ok" : "") }, pq[0] + "/" + pq[1]));
        });
        step3.appendChild(row);
        if (y === 0) candidate = null;
        if (candidate) {
          // If the convergent's denominator is a proper divisor of r, try small multiples.
          var tried = [candidate], found = Q.modpow(a, candidate, N) === 1 ? candidate : null;
          for (var mult = 2; !found && mult * candidate < N && mult < 8; mult++) {
            tried.push(mult * candidate);
            if (Q.modpow(a, mult * candidate, N) === 1) found = mult * candidate;
          }
          step3.appendChild(h("p", {}, t("shor.candidate", { q: candidate }) + (found ? t("shor.verified", { r: found }) : t("shor.notVerified"))));
          candidate = found;
        } else {
          step3.appendChild(h("p", {}, t("shor.useless")));
        }
      }

      // 4. Factors.
      M.clear(step4);
      if (candidate) {
        if (candidate % 2) {
          step4.appendChild(h("p", {}, t("shor.odd", { r: candidate })));
        } else {
          var half = Q.modpow(a, candidate / 2, N);
          if (half === N - 1) {
            step4.appendChild(h("p", {}, t("shor.minusOne", { a: a, h: candidate / 2, N: N })));
          } else {
            var f1 = Q.gcd(half - 1, N), f2 = Q.gcd(half + 1, N);
            step4.appendChild(h("p", {}, h("code", {}, a + "^" + candidate / 2 + " mod " + N + " = " + half)));
            step4.appendChild(h("p", {}, h("code", {}, "gcd(" + (half - 1) + ", " + N + ") = " + f1 + ",   gcd(" + (half + 1) + ", " + N + ") = " + f2)));
            step4.appendChild(h("p", { class: "factor-result" }, N + " = " + f1 + " × " + (N / f1)));
          }
        }
      } else {
        step4.appendChild(h("p", { class: "demo-hint" }, t("shor.waiting")));
      }
    }

    rebuildA();
    draw();
  });
})();
