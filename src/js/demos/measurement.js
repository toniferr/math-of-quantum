// Chapter 03 — a chain of Stern–Gerlach analysers at chosen angles.
(function () {
  "use strict";
  var M = window.MOA, h = M.h, s = M.s, t = M.t;

  M.register("measurement/stern-gerlach", function (stage) {
    var a2 = 90, a3 = 0, middle = true, N = 1000;
    var rand = M.rng(Date.now() % 1e6);
    var counts = null;
    var svg = M.svgBox(h("div"), 660, 230, t("sg.title"));
    var stP = M.stat(t("sg.final"), "accent"), stT = M.stat(t("sg.theory"));

    stage.appendChild(M.controls(
      M.slider({ label: t("sg.angle2"), min: 0, max: 180, step: 5, value: a2, format: function (v) { return M.fmt(v, 0) + "°"; },
        onInput: function (v) { a2 = v; counts = null; draw(); } }).el,
      M.slider({ label: t("sg.angle3"), min: 0, max: 180, step: 5, value: a3, format: function (v) { return M.fmt(v, 0) + "°"; },
        onInput: function (v) { a3 = v; counts = null; draw(); } }).el,
      M.toggle({ label: t("sg.middle"), checked: middle, onChange: function (v) { middle = v; counts = null; draw(); } }).el,
      h("div", { class: "btn-row" }, M.button(t("sg.send"), function () { run(); }, "primary"))));
    stage.appendChild(svg.parentNode);
    stage.appendChild(h("div", { class: "stats" }, stP.el, stT.el));

    function pass(fromDeg, toDeg) { var d = (toDeg - fromDeg) * Math.PI / 180; return Math.cos(d / 2) * Math.cos(d / 2); }

    function theory() {
      return middle ? pass(0, a2) * pass(a2, a3) : pass(0, a3);
    }

    function run() {
      // Every atom leaving the first (z) analyser is "up" along z.
      var c = { up2: 0, down2: 0, up3: 0, down3: 0 };
      for (var i = 0; i < N; i++) {
        var dir = 0;
        if (middle) {
          if (rand() < pass(dir, a2)) { c.up2++; dir = a2; } else { c.down2++; continue; }
        }
        if (rand() < pass(dir, a3)) c.up3++; else c.down3++;
      }
      counts = c;
      draw();
    }

    function magnet(x, angle, label, count) {
      var g = s("g", {});
      g.appendChild(s("rect", { x: x, y: 85, width: 70, height: 60, rx: 8, class: "device" }));
      // Little arrow showing the analyser's axis (0° = up along z, 90° = along x, 180° = down).
      var cx = x + 35, cy = 115, r = 18, rad = angle * Math.PI / 180;
      g.appendChild(s("line", { x1: cx, y1: cy, x2: cx + r * Math.sin(rad), y2: cy - r * Math.cos(rad), class: "axis-arrow" }));
      g.appendChild(s("circle", { cx: cx + r * Math.sin(rad), cy: cy - r * Math.cos(rad), r: 3, class: "axis-dot" }));
      g.appendChild(s("text", { x: cx, y: 165, "text-anchor": "middle", class: "label-strong" }, label));
      g.appendChild(s("text", { x: cx, y: 181, "text-anchor": "middle" }, angle + "°"));
      if (count) g.appendChild(s("text", { x: x + 80, y: 150, class: "mono blocked" }, "✕ " + count));
      return g;
    }

    function draw() {
      M.clear(svg);
      var y = 115;
      svg.appendChild(s("rect", { x: 10, y: y - 12, width: 30, height: 24, rx: 4, class: "device" }));
      svg.appendChild(s("text", { x: 25, y: y + 40, "text-anchor": "middle" }, t("sg.oven")));
      var xs = middle ? [80, 260, 440] : [80, 440];
      svg.appendChild(s("line", { x1: 40, y1: y, x2: xs[0], y2: y, class: "beam", "stroke-width": 3 }));
      svg.appendChild(magnet(xs[0], 0, "SG₁", null));
      svg.appendChild(s("line", { x1: xs[0] + 70, y1: y, x2: xs[1], y2: y, class: "beam", "stroke-width": 3 }));
      if (middle) {
        svg.appendChild(magnet(260, a2, "SG₂", counts ? counts.down2 : null));
        svg.appendChild(s("line", { x1: 330, y1: y, x2: 440, y2: y, class: "beam", "stroke-width": 1 + 2 * pass(0, a2) }));
      }
      svg.appendChild(magnet(440, a3, middle ? "SG₃" : "SG₂", counts ? counts.down3 : null));
      var pFinal = theory();
      svg.appendChild(s("line", { x1: 510, y1: y, x2: 600, y2: y, class: "beam", "stroke-width": 1 + 2 * pFinal }));
      svg.appendChild(s("rect", { x: 600, y: y - 30, width: 14, height: 60, rx: 3, class: "detector hot" }));
      svg.appendChild(s("text", { x: 607, y: y + 50, "text-anchor": "middle", class: "mono label-strong" }, counts ? String(counts.up3) : ""));
      svg.appendChild(s("text", { x: 330, y: 24, "text-anchor": "middle" }, t("sg.legend")));

      stT.set(M.pct(pFinal, 1));
      stP.set(counts ? counts.up3 + " / " + N : "—");
    }

    draw();
  });
})();
