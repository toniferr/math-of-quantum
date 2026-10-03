// Chapter 01 — the Bloch sphere: drag the state, read amplitudes, phasors and probabilities.
(function () {
  "use strict";
  var M = window.MOA, Q = window.Q, h = M.h, t = M.t;

  var PRESETS = {
    "|0⟩": [0, 0], "|1⟩": [Math.PI, 0], "|+⟩": [Math.PI / 2, 0], "|−⟩": [Math.PI / 2, Math.PI],
    "|+i⟩": [Math.PI / 2, Math.PI / 2], "|−i⟩": [Math.PI / 2, -Math.PI / 2],
  };

  function cfmt(z) {
    var re = Math.abs(z[0]) < 5e-4 ? 0 : z[0], im = Math.abs(z[1]) < 5e-4 ? 0 : z[1];
    if (!im) return M.fmt(re, 2);
    if (!re) return M.fmt(im, 2) + "i";
    return "(" + M.fmt(re, 2) + (im < 0 ? " − " : " + ") + M.fmt(Math.abs(im), 2) + "i)";
  }

  M.register("qubits/bloch", function (stage) {
    var theta = 1.1, phi = 0.9, counts = [0, 0];
    var rand = M.rng(Date.now() % 1e6);
    var holder = h("div", { class: "bloch-holder" });
    var side = h("div", { class: "bloch-side" });
    var stateEl = h("p", { class: "state-text", "aria-live": "polite" });
    var rows = Q.probRows(["0", "1"]);
    var phasorBox = h("div", { class: "phasor-box" });

    var thSl = M.slider({ label: "θ", min: 0, max: Math.PI, step: 0.01, value: theta,
      format: function (v) { return M.fmt(v * 180 / Math.PI, 0) + "°"; }, onInput: function (v) { theta = v; counts = [0, 0]; update(); } });
    var phSl = M.slider({ label: "φ", min: -Math.PI, max: Math.PI, step: 0.01, value: phi,
      format: function (v) { return M.fmt(v * 180 / Math.PI, 0) + "°"; }, onInput: function (v) { phi = v; counts = [0, 0]; update(); } });

    stage.appendChild(h("div", { class: "bloch-layout" }, holder, side));
    side.appendChild(h("div", { class: "btn-row presets" }, Object.keys(PRESETS).map(function (k) {
      return M.button(k, function () { theta = PRESETS[k][0]; phi = PRESETS[k][1]; counts = [0, 0]; sync(); update(); });
    })));
    side.appendChild(thSl.el);
    side.appendChild(phSl.el);
    side.appendChild(stateEl);
    side.appendChild(h("p", { class: "panel-label" }, t("bloch.amps")));
    side.appendChild(phasorBox);
    side.appendChild(h("p", { class: "panel-label" }, t("bloch.probs")));
    side.appendChild(rows.el);
    side.appendChild(h("div", { class: "btn-row" },
      M.button(t("bloch.measure100"), function () { measure(100); }, "primary"),
      M.button(t("bloch.clear"), function () { counts = [0, 0]; update(); })));

    var ph = Q.phasor(phasorBox, t("bloch.amps"));
    var cv = Q.bloch(holder, {
      label: t("bloch.title"), draggable: true, aspect: 1,
      onDrag: function (th, p) { theta = th; phi = p; counts = [0, 0]; sync(); update(); },
      vectors: function () { return [{ v: Q.blochVector(theta, phi), label: "ψ" }]; },
    });

    function sync() { thSl.set(theta, true); phSl.set(Math.atan2(Math.sin(phi), Math.cos(phi)), true); }

    function measure(n) {
      var p0 = Math.cos(theta / 2) * Math.cos(theta / 2);
      for (var i = 0; i < n; i++) counts[rand() < p0 ? 0 : 1]++;
      update();
    }

    function update() {
      var a = [Math.cos(theta / 2), 0], b = Q.C.scale(Q.C.exp(phi), Math.sin(theta / 2));
      stateEl.textContent = "|ψ⟩ = " + cfmt(a) + " |0⟩ + " + cfmt(b) + " |1⟩";
      ph.update([{ a: a, cls: "k1", label: "α" }, { a: b, cls: "k2", label: "β" }]);
      rows.set([Q.C.abs2(a), Q.C.abs2(b)], counts[0] + counts[1] ? counts : null);
      cv.redraw();
    }

    update();
  });
})();
