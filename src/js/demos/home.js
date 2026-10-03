// Home — drag a qubit on the Bloch sphere and measure it.
(function () {
  "use strict";
  var M = window.MOA, Q = window.Q, h = M.h, t = M.t;


  M.register("home/qubit", function (stage) {
    var theta = Math.PI / 3, phi = Math.PI / 4, counts = [0, 0], last = null;
    var rand = M.rng(Date.now() % 1e6);
    var holder = h("div", { class: "bloch-holder" });
    var side = h("div", { class: "bloch-side" });
    var stateEl = h("p", { class: "state-text", "aria-live": "polite" });
    var rows = Q.probRows(["0", "1"]);
    var outcome = h("p", { class: "demo-title outcome" });

    stage.appendChild(h("div", { class: "bloch-layout" }, holder, side));
    side.appendChild(h("p", { class: "demo-hint" }, t("home.hint")));
    side.appendChild(stateEl);
    side.appendChild(rows.el);
    side.appendChild(h("div", { class: "btn-row" },
      M.button(t("home.measure"), function () { measure(1); }, "primary"),
      M.button(t("home.measure100"), function () { measure(100); }),
      M.button(t("home.reset"), function () { counts = [0, 0]; last = null; update(); })));
    side.appendChild(outcome);

    var cv = Q.bloch(holder, {
      label: t("home.title"), draggable: true, aspect: 1,
      onDrag: function (th, ph) { theta = th; phi = ph; counts = [0, 0]; last = null; update(); },
      vectors: function () { return [{ v: Q.blochVector(theta, phi), label: "ψ" }]; },
    });

    function probs() { var c = Math.cos(theta / 2); return [c * c, 1 - c * c]; }

    function measure(n) {
      var p = probs();
      for (var i = 0; i < n; i++) { last = rand() < p[0] ? 0 : 1; counts[last]++; }
      update();
    }

    function update() {
      var a = Math.cos(theta / 2), b = Math.sin(theta / 2);
      stateEl.textContent = "|ψ⟩ = " + M.fmt(a, 2) + " |0⟩ + " + M.fmt(b, 2) + "·e^(i·" + M.fmt(phi * 180 / Math.PI, 0) + "°) |1⟩";
      rows.set(probs(), counts[0] + counts[1] ? counts : null);
      outcome.textContent = last === null ? "" : t("home.got", { v: last, n: counts[0] + counts[1] });
      cv.redraw();
    }

    update();
  });
})();
