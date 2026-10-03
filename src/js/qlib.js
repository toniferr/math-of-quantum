// Quantum toolkit shared by the demos: complex numbers, an n-qubit state-vector simulator,
// a Bloch-sphere renderer and phase-coloured amplitude charts. Exposed as window.Q.
(function () {
  "use strict";
  var M = window.MOA;

  // ------------------------------------------------------------------ complex numbers ([re, im])

  var C = {
    of: function (re, im) { return [re, im || 0]; },
    add: function (a, b) { return [a[0] + b[0], a[1] + b[1]]; },
    sub: function (a, b) { return [a[0] - b[0], a[1] - b[1]]; },
    mul: function (a, b) { return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]; },
    scale: function (a, s) { return [a[0] * s, a[1] * s]; },
    conj: function (a) { return [a[0], -a[1]]; },
    abs2: function (a) { return a[0] * a[0] + a[1] * a[1]; },
    abs: function (a) { return Math.hypot(a[0], a[1]); },
    arg: function (a) { return Math.atan2(a[1], a[0]); },
    exp: function (theta) { return [Math.cos(theta), Math.sin(theta)]; }, // e^{i theta}
  };

  // ------------------------------------------------------------------ gates (2x2 complex matrices)

  var S2 = Math.SQRT1_2;
  var GATES = {
    I: [[[1, 0], [0, 0]], [[0, 0], [1, 0]]],
    X: [[[0, 0], [1, 0]], [[1, 0], [0, 0]]],
    Y: [[[0, 0], [0, -1]], [[0, 1], [0, 0]]],
    Z: [[[1, 0], [0, 0]], [[0, 0], [-1, 0]]],
    H: [[[S2, 0], [S2, 0]], [[S2, 0], [-S2, 0]]],
    S: [[[1, 0], [0, 0]], [[0, 0], [0, 1]]],
    T: [[[1, 0], [0, 0]], [[0, 0], C.exp(Math.PI / 4)]],
  };
  function phase(phi) { return [[[1, 0], [0, 0]], [[0, 0], C.exp(phi)]]; }
  function ry(theta) {
    var c = Math.cos(theta / 2), s = Math.sin(theta / 2);
    return [[[c, 0], [-s, 0]], [[s, 0], [c, 0]]];
  }
  function rx(theta) {
    var c = Math.cos(theta / 2), s = Math.sin(theta / 2);
    return [[[c, 0], [0, -s]], [[0, -s], [c, 0]]];
  }
  function rz(theta) { return [[C.exp(-theta / 2), [0, 0]], [[0, 0], C.exp(theta / 2)]]; }

  // ------------------------------------------------------------------ state vectors

  // An n-qubit state: amplitudes indexed by basis state; qubit 0 is the most significant (top wire).
  function State(n) {
    this.n = n;
    this.re = new Float64Array(1 << n);
    this.im = new Float64Array(1 << n);
    this.re[0] = 1;
  }
  State.prototype.clone = function () {
    var s = new State(this.n);
    s.re.set(this.re);
    s.im.set(this.im);
    return s;
  };
  State.prototype.amp = function (i) { return [this.re[i], this.im[i]]; };
  State.prototype.set = function (amps) { // amps: array of [re, im]
    for (var i = 0; i < amps.length; i++) { this.re[i] = amps[i][0]; this.im[i] = amps[i][1]; }
    return this;
  };
  State.prototype.probs = function () {
    var out = [];
    for (var i = 0; i < this.re.length; i++) out.push(this.re[i] * this.re[i] + this.im[i] * this.im[i]);
    return out;
  };
  // Apply a 2x2 gate to `target`, only where every qubit in `controls` is 1.
  State.prototype.apply = function (g, target, controls) {
    var n = this.n, bit = 1 << (n - 1 - target), cmask = 0;
    (controls || []).forEach(function (c) { cmask |= 1 << (n - 1 - c); });
    for (var i = 0; i < this.re.length; i++) {
      if (i & bit || (i & cmask) !== cmask) continue;
      var j = i | bit;
      var ar = this.re[i], ai = this.im[i], br = this.re[j], bi = this.im[j];
      this.re[i] = g[0][0][0] * ar - g[0][0][1] * ai + g[0][1][0] * br - g[0][1][1] * bi;
      this.im[i] = g[0][0][0] * ai + g[0][0][1] * ar + g[0][1][0] * bi + g[0][1][1] * br;
      this.re[j] = g[1][0][0] * ar - g[1][0][1] * ai + g[1][1][0] * br - g[1][1][1] * bi;
      this.im[j] = g[1][0][0] * ai + g[1][0][1] * ar + g[1][1][0] * bi + g[1][1][1] * br;
    }
    return this;
  };
  State.prototype.sample = function (rand) { return M.sample(this.probs(), rand); };

  function ket(i, n) {
    var s = i.toString(2);
    while (s.length < n) s = "0" + s;
    return "|" + s + "⟩";
  }

  // ------------------------------------------------------------------ phase colours

  // Phase → hue on a colour wheel (0 → red-ish, π/2 → yellow-green, π → cyan, −π/2 → violet).
  function phaseColor(theta, light) {
    var hue = ((theta * 180 / Math.PI) % 360 + 360 + 15) % 360;
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    return "hsl(" + hue.toFixed(0) + ", 70%, " + (dark ? (light ? 72 : 62) : (light ? 55 : 46)) + "%)";
  }

  // ------------------------------------------------------------------ Bloch sphere

  // Point on the sphere for a qubit cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩.
  function blochVector(theta, phi) {
    return [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
  }
  function anglesOf(v) {
    var r = Math.hypot(v[0], v[1], v[2]) || 1;
    return { theta: Math.acos(M.clamp(v[2] / r, -1, 1)), phi: Math.atan2(v[1], v[0]) };
  }
  // Bloch vector of a (possibly mixed) single-qubit state given amplitudes a, b.
  function blochOf(a, b) {
    var ab = C.mul(C.conj(a), b); // conj(a) b
    return [2 * ab[0], 2 * ab[1], C.abs2(a) - C.abs2(b)];
  }

  // A canvas Bloch sphere. o = {label, az, el, draggable, onDrag(theta, phi), vectors(): [{v, cls, label}]}
  function bloch(parent, o) {
    var az = o.az === undefined ? -0.6 : o.az, el = o.el === undefined ? 0.32 : o.el;
    var R = 1, cx = 0, cy = 0, radius = 100;

    function project(v) {
      var xr = v[0] * Math.cos(az) - v[1] * Math.sin(az);
      var yr = v[0] * Math.sin(az) + v[1] * Math.cos(az);
      var depth = xr * Math.cos(el) + v[2] * Math.sin(el);
      var sx = yr, sy = v[2] * Math.cos(el) - xr * Math.sin(el);
      return { x: cx + sx * radius, y: cy - sy * radius, depth: depth };
    }
    function unproject(px, py) {
      var sx = (px - cx) / radius, sy = (cy - py) / radius;
      var r2 = sx * sx + sy * sy;
      if (r2 > 1) { var k = 1 / Math.sqrt(r2); sx *= k; sy *= k; r2 = 1; }
      var d = Math.sqrt(Math.max(0, 1 - r2));
      var xr = d * Math.cos(el) - sy * Math.sin(el);
      var z = d * Math.sin(el) + sy * Math.cos(el);
      var yr = sx;
      return [xr * Math.cos(az) + yr * Math.sin(az), -xr * Math.sin(az) + yr * Math.cos(az), z];
    }

    function curve(ctx, pts, colorFront, colorBack, width) {
      for (var pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        var started = false;
        pts.forEach(function (v) {
          var p = project(v);
          var front = p.depth >= -1e-9;
          if (front === (pass === 1)) {
            if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
          } else started = false;
        });
        ctx.setLineDash(pass === 0 ? [3, 4] : []);
        ctx.strokeStyle = pass === 0 ? colorBack : colorFront;
        ctx.lineWidth = width || 1;
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    function draw(ctx, w, h) {
      cx = w / 2; cy = h / 2; radius = Math.min(w, h) * 0.36;
      var fg = M.color("--fg"), faint = M.color("--faint"), rule = M.color("--rule"), muted = M.color("--muted");
      // Sphere outline and soft fill.
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = M.color("--accent-soft");
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = faint;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Equator and a meridian.
      var eq = [], mer = [], mer2 = [];
      for (var k = 0; k <= 96; k++) {
        var tt = 2 * Math.PI * k / 96;
        eq.push([Math.cos(tt), Math.sin(tt), 0]);
        mer.push([Math.sin(tt), 0, Math.cos(tt)]);
        mer2.push([0, Math.sin(tt), Math.cos(tt)]);
      }
      curve(ctx, eq, faint, rule, 1.1);
      curve(ctx, mer, rule, rule, 0.8);
      curve(ctx, mer2, rule, rule, 0.8);
      // Axes.
      var axes = [[[0, 0, 1], "|0⟩"], [[0, 0, -1], "|1⟩"], [[1, 0, 0], "|+⟩"], [[-1, 0, 0], "|−⟩"], [[0, 1, 0], "|+i⟩"], [[0, -1, 0], "|−i⟩"]];
      ctx.font = "13px " + getComputedStyle(document.body).getPropertyValue("--serif");
      axes.forEach(function (a) {
        var p0 = project([0, 0, 0]), p1 = project(a[0]);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.setLineDash(p1.depth < 0 ? [2, 3] : []);
        ctx.strokeStyle = faint;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
        var lp = project(a[0].map(function (c) { return c * 1.18; }));
        ctx.fillStyle = p1.depth < 0 ? faint : muted;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(a[1], lp.x, lp.y);
      });
      // State vectors.
      (o.vectors ? o.vectors() : []).forEach(function (sv) {
        var v = sv.v, len = Math.hypot(v[0], v[1], v[2]);
        var p0 = project([0, 0, 0]), p = project(v);
        var col = sv.color || M.color("--accent");
        if (sv.dot) { // a bare point, for clouds of states
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.6, 0, 2 * Math.PI);
          ctx.fillStyle = col;
          ctx.globalAlpha = p.depth < 0 ? 0.35 : 0.85;
          ctx.fill();
          ctx.globalAlpha = 1;
          return;
        }
        // Shadow on the equatorial plane helps read φ.
        if (len > 0.05 && !sv.noShadow) {
          var sh = project([v[0], v[1], 0]);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(sh.x, sh.y);
          ctx.lineTo(p.x, p.y);
          ctx.setLineDash([2, 3]);
          ctx.strokeStyle = faint;
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.depth < 0 ? 5 : 7, 0, 2 * Math.PI);
        ctx.fillStyle = col;
        ctx.globalAlpha = p.depth < 0 ? 0.55 : 1;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = M.color("--bg");
        ctx.lineWidth = 2;
        ctx.stroke();
        if (sv.label) {
          ctx.fillStyle = fg;
          ctx.textAlign = "left";
          ctx.fillText(sv.label, p.x + 10, p.y - 10);
        }
      });
    }

    var cv = M.canvas(parent, { aspect: o.aspect || 1.15, label: o.label, draw: draw, class: "demo-canvas bloch-canvas" });
    if (o.draggable) {
      var dragging = false;
      function moveTo(ev) {
        var p = cv.toLocal(ev);
        var v = unproject(p.x, p.y);
        var a = anglesOf(v);
        o.onDrag(a.theta, a.phi);
      }
      cv.canvas.addEventListener("pointerdown", function (ev) { dragging = true; cv.canvas.setPointerCapture(ev.pointerId); moveTo(ev); ev.preventDefault(); });
      cv.canvas.addEventListener("pointermove", function (ev) { if (dragging) moveTo(ev); });
      cv.canvas.addEventListener("pointerup", function () { dragging = false; });
      cv.canvas.addEventListener("pointercancel", function () { dragging = false; });
    }
    return cv;
  }

  // ------------------------------------------------------------------ amplitude chart

  // SVG bars of |amplitude|² coloured by phase, with ket labels. Returns {update(state or amps)}.
  function ampChart(parent, o) {
    var W = o.width || 560, H = o.height || 200, L = 8, B = 30, T = 14;
    var svg = M.svgBox(parent, W, H, o.label);
    function update(amps, highlight) {
      M.clear(svg);
      var n = amps.length, slot = (W - 2 * L) / n, bw = Math.max(2, Math.min(40, slot * 0.7));
      var maxP = o.scale === "max" ? Math.max.apply(null, amps.map(C.abs2)) || 1 : 1;
      svg.appendChild(M.s("line", { x1: L, x2: W - L, y1: H - B, y2: H - B, class: "axis-line" }));
      if (o.signed) svg.appendChild(M.s("line", { x1: L, x2: W - L, y1: (H - B + T) / 2, y2: (H - B + T) / 2, class: "axis-line" }));
      amps.forEach(function (a, i) {
        var x = L + slot * (i + 0.5);
        if (o.signed) { // real amplitudes as signed bars (Grover)
          var mid = (H - B + T) / 2, half = (H - B - T) / 2, v = a[0] / (o.maxAmp || 1);
          var y0 = v >= 0 ? mid - v * half : mid;
          svg.appendChild(M.s("rect", { x: x - bw / 2, y: y0, width: bw, height: Math.abs(v) * half, rx: 2,
            class: "amp-bar" + (highlight === i ? " amp-hi" : "") + (v < 0 ? " amp-neg" : "") }));
        } else {
          var p = C.abs2(a) / maxP, hgt = p * (H - B - T);
          var bar = M.s("rect", { x: x - bw / 2, y: H - B - hgt, width: bw, height: hgt, rx: 2, class: "amp-bar" + (highlight === i ? " amp-hi" : "") });
          if (C.abs(a) > 1e-9) bar.setAttribute("fill", phaseColor(C.arg(a)));
          svg.appendChild(bar);
          if (n <= 16 && p > 0.004) {
            svg.appendChild(M.s("text", { x: x, y: H - B - hgt - 4, "text-anchor": "middle", class: "mono amp-p" }, M.fmt(C.abs2(a), 2)));
          }
        }
        var every = n <= 16 ? 1 : n <= 32 ? 2 : n <= 64 ? 8 : 32;
        if (i % every === 0 && o.labels !== false) {
          var lbl = o.labelFn ? o.labelFn(i) : ket(i, Math.round(Math.log2(n)));
          svg.appendChild(M.s("text", { x: x, y: H - B + 16, "text-anchor": "middle", class: "mono ket-label" + (n > 16 ? " small" : "") }, lbl));
        }
      });
    }
    return { update: update, svg: svg };
  }

  // Phase wheel legend (small inline SVG).
  function phaseLegend(label) {
    var svg = M.s("svg", { viewBox: "-22 -22 44 44", class: "phase-legend", role: "img", "aria-label": label });
    for (var k = 0; k < 24; k++) {
      var a0 = 2 * Math.PI * k / 24, a1 = 2 * Math.PI * (k + 1) / 24;
      var p = "M0,0L" + (18 * Math.cos(a0)).toFixed(2) + "," + (-18 * Math.sin(a0)).toFixed(2) +
        "A18,18 0 0,0 " + (18 * Math.cos(a1)).toFixed(2) + "," + (-18 * Math.sin(a1)).toFixed(2) + "Z";
      var seg = M.s("path", { d: p });
      seg.setAttribute("fill", phaseColor(a0 + Math.PI / 24));
      svg.appendChild(seg);
    }
    svg.appendChild(M.s("text", { x: 20, y: 3, class: "wheel-lbl" }, "0"));
    svg.appendChild(M.s("text", { x: -21, y: 3, class: "wheel-lbl", "text-anchor": "end" }, "π"));
    return M.h("span", { class: "phase-key" }, svg, M.h("span", {}, label));
  }

  // Complex amplitude as an arrow in a small unit circle (phasor).
  function phasor(parent, label) {
    var svg = M.svgBox(parent, 120, 120, label);
    function update(list) { // list: [{a: [re, im], cls}]
      M.clear(svg);
      svg.appendChild(M.s("circle", { cx: 60, cy: 60, r: 50, class: "phasor-circle" }));
      svg.appendChild(M.s("line", { x1: 6, x2: 114, y1: 60, y2: 60, class: "axis-line" }));
      svg.appendChild(M.s("line", { x1: 60, x2: 60, y1: 6, y2: 114, class: "axis-line" }));
      list.forEach(function (it) {
        var x = 60 + 50 * it.a[0], y = 60 - 50 * it.a[1];
        var g = M.s("g", { class: "phasor " + (it.cls || "") });
        g.appendChild(M.s("line", { x1: it.from ? 60 + 50 * it.from[0] : 60, y1: it.from ? 60 - 50 * it.from[1] : 60, x2: x, y2: y }));
        g.appendChild(M.s("circle", { cx: x, cy: y, r: 3.5 }));
        if (it.label) g.appendChild(M.s("text", { x: x + 5, y: y - 5 }, it.label));
        svg.appendChild(g);
      });
    }
    return { update: update };
  }

  // Probability rows shared by the qubit demos: label, bar, value (and an optional observed count).
  function probRows(labels) {
    var rows = labels.map(function (l) {
      var fill = M.h("span", { class: "prob-fill" }), seen = M.h("span", { class: "prob-seen" });
      var val = M.h("span", { class: "prob-val" }), cnt = M.h("span", { class: "prob-cnt" });
      return { el: M.h("div", { class: "prob-row" }, M.h("span", { class: "prob-lbl" }, l), M.h("span", { class: "prob-track" }, fill, seen), val, cnt),
        fill: fill, seen: seen, val: val, cnt: cnt };
    });
    return {
      el: M.h("div", { class: "prob-rows" }, rows.map(function (r) { return r.el; })),
      set: function (ps, counts) {
        var total = counts ? counts.reduce(function (a, b) { return a + b; }, 0) : 0;
        rows.forEach(function (r, i) {
          r.fill.style.width = (100 * ps[i]).toFixed(1) + "%";
          r.val.textContent = M.pct(ps[i], 1);
          r.seen.style.width = total ? (100 * counts[i] / total).toFixed(1) + "%" : "0";
          r.cnt.textContent = total ? M.fmt(counts[i], 0) : "";
        });
      },
    };
  }

  function gcd(a, b) { while (b) { var t = b; b = a % b; a = t; } return Math.abs(a); }
  function modpow(b, e, m) {
    var r = 1; b %= m;
    while (e > 0) { if (e & 1) r = r * b % m; b = b * b % m; e >>= 1; }
    return r;
  }

  window.Q = {
    C: C, GATES: GATES, phase: phase, rx: rx, ry: ry, rz: rz, State: State, ket: ket,
    phaseColor: phaseColor, bloch: bloch, blochVector: blochVector, blochOf: blochOf, anglesOf: anglesOf,
    ampChart: ampChart, phaseLegend: phaseLegend, probRows: probRows, phasor: phasor, gcd: gcd, modpow: modpow,
  };
})();
