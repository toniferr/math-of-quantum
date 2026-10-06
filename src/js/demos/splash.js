// Home — the title screen: a large Bloch sphere over an interference pattern. The qubit precesses (leaving a trail),
// gates rotate it, and measuring collapses it to a pole with the Born-rule probabilities; the counts add up below.
// When nobody touches it, it plays a short sequence of gates on its own. Drag the sphere to turn it.
(function () {
  "use strict";
  var M = window.MOA, h = M.h, t = M.t;

  var S2 = Math.SQRT1_2;
  // Each gate is a rotation of the Bloch sphere: [axis, angle].
  var GATES = {
    H: [[S2, 0, S2], Math.PI], X: [[1, 0, 0], Math.PI], Y: [[0, 1, 0], Math.PI], Z: [[0, 0, 1], Math.PI],
    S: [[0, 0, 1], Math.PI / 2], T: [[0, 0, 1], Math.PI / 4],
  };
  var AUTO = ["H", "T", "T", "H", "S", "X", "H", "M", "H", "S", "T", "M", "Y", "H", "M"];

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function easeInOut(x) { x = clamp(x, 0, 1); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function rotate(v, a, ang) {          // Rodrigues: rotate vector v about unit axis a by ang
    var c = Math.cos(ang), s = Math.sin(ang), d = v[0] * a[0] + v[1] * a[1] + v[2] * a[2];
    return [
      v[0] * c + (a[1] * v[2] - a[2] * v[1]) * s + a[0] * d * (1 - c),
      v[1] * c + (a[2] * v[0] - a[0] * v[2]) * s + a[1] * d * (1 - c),
      v[2] * c + (a[0] * v[1] - a[1] * v[0]) * s + a[2] * d * (1 - c),
    ];
  }
  function norm(v) { var n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; }

  M.register("splash/bloch", function (root) {
    var canvas = root.querySelector(".splash-canvas");
    var copy = root.querySelector(".splash-copy");
    var ctx = canvas.getContext("2d");
    var waves = document.createElement("canvas"), wctx = waves.getContext("2d");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var W = 0, H = 0, cx = 0, cy = 0, R = 100, fadeTo = 0, dark = false, mono = "monospace";
    var yaw = -0.6, pitch = 0.32, time = 0;
    var state = norm([0.6, 0.3, 0.74]);   // Bloch vector (x, y, z); z = +1 is |0⟩
    var trail = [], anim = null, collapse = null, counts = [0, 0];
    var paused = false, visible = true, running = false, autoIndex = 0, autoWait = 2.2, idleFor = 99, drag = null;

    // ---------------------------------------------------------------- HUD

    var readout = h("p", { class: "splash-caption", "aria-live": "off" });
    var gateBtns = Object.keys(GATES).map(function (g) {
      return h("button", { type: "button", class: "splash-btn gate", title: t("splash.gate." + g), onclick: function () { user(); apply(g); } }, g);
    });
    var measureBtn = h("button", { type: "button", class: "splash-btn measure", onclick: function () { user(); measure(); } }, t("splash.measure"));
    var resetBtn = h("button", { type: "button", class: "splash-btn", onclick: function () { user(); counts = [0, 0]; startAt([0, 0, 1]); } }, "|0⟩");
    var pauseBtn = h("button", { type: "button", class: "splash-btn", "aria-pressed": "false", onclick: function () { paused = !paused; syncPause(); setRunning(true); } });
    root.appendChild(h("div", { class: "splash-hud" },
      h("div", { class: "splash-opts", role: "group", "aria-label": t("splash.gates") }, gateBtns, measureBtn, resetBtn),
      readout,
      h("div", { class: "splash-ctrls" }, pauseBtn)));
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", t("splash.label"));
    function syncPause() { pauseBtn.textContent = paused ? t("splash.play") : t("splash.pause"); pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false"); }
    syncPause();
    if (reduce) pauseBtn.hidden = true;

    function user() { idleFor = 0; }

    // ---------------------------------------------------------------- the qubit

    function startAt(v) { state = norm(v); trail = []; anim = null; collapse = null; if (reduce) draw(); updateReadout(); }

    function apply(g) {
      if (collapse) return;
      var gate = GATES[g];
      if (reduce) { state = norm(rotate(state, gate[0], gate[1])); trail = []; draw(); updateReadout(); return; }
      if (anim) state = norm(rotate(anim.from, anim.axis, anim.angle));
      anim = { from: state, axis: gate[0], angle: gate[1], t: 0, dur: 0.9, gate: g };
      flash(g);
    }

    function measure() {
      if (collapse) return;
      if (anim) { state = norm(rotate(anim.from, anim.axis, anim.angle)); anim = null; }
      var p0 = (1 + state[2]) / 2;
      var outcome = Math.random() < p0 ? 0 : 1;
      counts[outcome]++;
      collapse = { from: state, to: outcome === 0 ? [0, 0, 1] : [0, 0, -1], t: 0, outcome: outcome, p: outcome === 0 ? p0 : 1 - p0 };
      if (reduce) { state = collapse.to; collapse = null; trail = []; draw(); }
      updateReadout();
    }

    var lastGate = "", gateTime = -9;
    function flash(g) { lastGate = g; gateTime = time; }

    function current() {
      if (anim) return norm(rotate(anim.from, anim.axis, anim.angle * easeInOut(anim.t / anim.dur)));
      if (collapse) {
        var k = easeInOut(collapse.t / 0.6), a = collapse.from, b = collapse.to;
        return norm([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]);
      }
      return state;
    }

    function step(dt) {
      time += dt; idleFor += dt;
      if (anim) {
        anim.t += dt;
        if (anim.t >= anim.dur) { state = norm(rotate(anim.from, anim.axis, anim.angle)); anim = null; }
      } else if (collapse) {
        collapse.t += dt;
        if (collapse.t >= 1.5) { state = collapse.to; collapse = null; trail = []; }
      } else {
        // Free evolution: precession about the z axis (a phase that turns, while the probabilities stay put).
        state = norm(rotate(state, [0, 0, 1], dt * 0.7));
      }
      if (!drag) yaw += dt * 0.12;
      var v = current();
      trail.push(v);
      if (trail.length > 140) trail.shift();
      // With nobody around, play a short program by itself.
      if (idleFor > 6 && !anim && !collapse) {
        autoWait -= dt;
        if (autoWait <= 0) {
          var g = AUTO[autoIndex++ % AUTO.length];
          if (g === "M") measure(); else apply(g);
          autoWait = g === "M" ? 3.2 : 2.2;
        }
      }
    }

    // ---------------------------------------------------------------- projection and drawing

    function project(v) {
      // Bloch (x, y, z) -> screen, with z up; rotate by yaw about z, then tilt by pitch about the screen x axis.
      var cyw = Math.cos(yaw), syw = Math.sin(yaw);
      var x = v[0] * cyw - v[1] * syw, y = v[0] * syw + v[1] * cyw, z = v[2];
      var cp = Math.cos(pitch), sp = Math.sin(pitch);
      var depth = y * cp - z * sp, up = z * cp + y * sp;   // depth > 0: towards the viewer
      return { x: cx + x * R, y: cy - up * R, d: depth };
    }

    function circle(fn, n, color, width, dashedBack) {
      var prev = null;
      for (var i = 0; i <= n; i++) {
        var p = project(fn(i / n * Math.PI * 2));
        if (prev) {
          var back = (prev.d + p.d) / 2 < 0;
          ctx.strokeStyle = color;
          ctx.globalAlpha = back ? 0.35 : 1;
          ctx.lineWidth = width;
          ctx.setLineDash(back && dashedBack ? [3, 4] : []);
          ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        }
        prev = p;
      }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }

    var waveAge = 99;
    function drawWaves() {
      if (waveAge++ >= 2) {
        waveAge = 0;
        var fw = waves.width, fh = waves.height, img = wctx.createImageData(fw, fh), d = img.data;
        var s1 = { x: cx - R * 1.25, y: H + R * 0.2 }, s2 = { x: cx + R * 1.25, y: H + R * 0.2 };
        var k = 2 * Math.PI / (R * 0.32), w = time * 2.2;
        var base = dark ? [92, 126, 255] : [70, 100, 220];
        for (var j = 0; j < fh; j++) {
          for (var i = 0; i < fw; i++) {
            var px = (i + 0.5) * W / fw, py = (j + 0.5) * H / fh;
            var r1 = Math.hypot(px - s1.x, py - s1.y), r2 = Math.hypot(px - s2.x, py - s2.y);
            var a = Math.cos(k * r1 - w) + Math.cos(k * r2 - w);
            var inten = a * a / 4;                    // |ψ1 + ψ2|²: bright fringes where the waves agree
            var n = (j * fw + i) * 4;
            d[n] = base[0]; d[n + 1] = base[1]; d[n + 2] = base[2];
            d[n + 3] = Math.round(inten * (dark ? 70 : 46));
          }
        }
        wctx.putImageData(img, 0, 0);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(waves, 0, 0, W, H);
    }

    function draw() {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      drawWaves();
      var line = dark ? "rgba(225,232,255,0.55)" : "rgba(30,40,70,0.5)";
      var faint = dark ? "rgba(225,232,255,0.22)" : "rgba(30,40,70,0.2)";
      // Sphere body.
      var g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      g.addColorStop(0, dark ? "rgba(120,150,255,0.22)" : "rgba(255,255,255,0.9)");
      g.addColorStop(1, dark ? "rgba(20,26,60,0.55)" : "rgba(200,212,245,0.55)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = line; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      // Latitude and longitude lines.
      [-0.5, 0, 0.5].forEach(function (z) {
        var r = Math.sqrt(1 - z * z);
        circle(function (a) { return [r * Math.cos(a), r * Math.sin(a), z]; }, 72, z === 0 ? line : faint, z === 0 ? 1.4 : 1, true);
      });
      [0, Math.PI / 3, 2 * Math.PI / 3].forEach(function (lon) {
        circle(function (a) { return [Math.sin(a) * Math.cos(lon), Math.sin(a) * Math.sin(lon), Math.cos(a)]; }, 72, faint, 1, true);
      });
      // Axes and their states.
      ctx.font = "600 13px " + mono;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      [[[0, 0, 1], "|0⟩"], [[0, 0, -1], "|1⟩"], [[1, 0, 0], "|+⟩"], [[-1, 0, 0], "|−⟩"], [[0, 1, 0], "|+i⟩"], [[0, -1, 0], "|−i⟩"]].forEach(function (ax) {
        var p0 = project([0, 0, 0]), p1 = project(ax[0]), p2 = project([ax[0][0] * 1.16, ax[0][1] * 1.16, ax[0][2] * 1.16]);
        ctx.strokeStyle = faint; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = p2.d < -0.2 ? faint : line;
        ctx.fillText(ax[1], p2.x, p2.y);
      });
      // The trail of the state on the surface.
      var accent = dark ? "#ff8a5c" : "#d9481c";
      for (var i = 1; i < trail.length; i++) {
        var a = project(trail[i - 1]), b = project(trail[i]);
        ctx.globalAlpha = (i / trail.length) * (b.d < 0 ? 0.35 : 0.9);
        ctx.strokeStyle = accent; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // The state vector.
      var v = current(), o = project([0, 0, 0]), p = project(v);
      ctx.strokeStyle = accent; ctx.lineWidth = 3.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(p.x, p.y, 7.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = line;
      ctx.fillText("ψ", p.x + 16, p.y - 14);
      // A measurement: flash and the outcome.
      if (collapse) {
        var k = clamp(collapse.t / 1.5, 0, 1);
        ctx.globalAlpha = (1 - k) * (dark ? 0.35 : 0.45);
        ctx.fillStyle = dark ? "#ffffff" : "#ffd166";
        ctx.beginPath(); ctx.arc(cx, cy, R * (1 + k * 0.5), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.font = "700 " + Math.round(R * 0.22) + "px " + mono;
        ctx.fillStyle = accent;
        ctx.fillText(t("splash.got", { n: collapse.outcome }), cx, cy - R * 1.32);
      } else if (time - gateTime < 1.2 && lastGate) {
        ctx.globalAlpha = 1 - (time - gateTime) / 1.2;
        ctx.font = "800 " + Math.round(R * 0.3) + "px " + mono;
        ctx.fillStyle = accent;
        ctx.fillText(lastGate, cx, cy - R * 1.32);
        ctx.globalAlpha = 1;
      }
      // Counts of outcomes so far.
      var total = counts[0] + counts[1];
      if (total) {
        var bw = R * 0.5, bx = Math.min(cx + R * 1.18, W - bw * 1.3), by = cy + R * 0.9, maxH = R * 0.8;
        [0, 1].forEach(function (n) {
          var hh = maxH * counts[n] / Math.max(counts[0], counts[1]);
          ctx.fillStyle = n ? (dark ? "rgba(140,170,255,0.8)" : "rgba(60,90,200,0.75)") : accent;
          ctx.fillRect(bx + n * (bw * 0.6), by - hh, bw * 0.45, hh);
          ctx.fillStyle = line;
          ctx.font = "600 12px " + mono;
          ctx.fillText(String(n), bx + n * (bw * 0.6) + bw * 0.225, by + 12);
          ctx.fillText(String(counts[n]), bx + n * (bw * 0.6) + bw * 0.225, by - hh - 10);
        });
      }
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      // Keep the copy readable on wide screens.
      if (fadeTo) {
        var bg = dark ? "20,22,26" : "255,255,255";
        var gr = ctx.createLinearGradient(0, 0, fadeTo + 80, 0);
        gr.addColorStop(0, "rgba(" + bg + ",0.92)"); gr.addColorStop(0.75, "rgba(" + bg + ",0.6)"); gr.addColorStop(1, "rgba(" + bg + ",0)");
        ctx.fillStyle = gr; ctx.fillRect(0, 0, fadeTo + 80, H);
      }
    }

    var readTimer = 0;
    function updateReadout() {
      var v = current();
      var theta = Math.acos(clamp(v[2], -1, 1)), phi = Math.atan2(v[1], v[0]);
      var a = Math.cos(theta / 2), b = Math.sin(theta / 2), deg = Math.round(((phi * 180 / Math.PI) + 360) % 360);
      readout.textContent = t("splash.state", { a: a.toFixed(2), b: b.toFixed(2), phi: deg, p0: Math.round(a * a * 100), p1: Math.round(b * b * 100) }) +
        (counts[0] + counts[1] ? " · " + t("splash.counts", { zero: counts[0], one: counts[1] }) : "");
    }

    // ---------------------------------------------------------------- layout, loop and input

    function layout() {
      var r = canvas.getBoundingClientRect();
      W = Math.max(280, r.width); H = Math.max(260, r.height);
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      waves.width = Math.ceil(W / 6); waves.height = Math.ceil(H / 6);
      var cr = copy.getBoundingClientRect();
      var overlay = cr.bottom > r.top + 10 && cr.top < r.bottom;
      fadeTo = overlay ? cr.right - r.left + 40 : 0;
      var left = overlay ? cr.right - r.left + 40 : 0;
      var hud = root.querySelector(".splash-hud");
      var bottomSpace = overlay && hud ? hud.offsetHeight + 10 : 10;
      R = Math.max(70, Math.min((H - bottomSpace) * 0.34, (W - left) * 0.28));
      cx = left + (W - left) * 0.48;
      cy = (H - bottomSpace) * 0.52;
      dark = document.documentElement.getAttribute("data-theme") === "dark";
      mono = getComputedStyle(document.documentElement).getPropertyValue("--mono").trim() || "monospace";
      waveAge = 99;
    }

    var last = 0;
    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      step(dt);
      draw();
      readTimer += dt;
      if (readTimer > 0.15) { readTimer = 0; updateReadout(); }
      requestAnimationFrame(frame);
    }
    function setRunning(on) {
      on = on && !paused && visible && !reduce;
      if (on === running) return;
      running = on; last = 0;
      if (on) requestAnimationFrame(frame);
    }

    canvas.addEventListener("pointerdown", function (e) {
      drag = { x: e.clientX, y: e.clientY, yaw: yaw, pitch: pitch };
      canvas.setPointerCapture(e.pointerId);
      user();
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drag) return;
      yaw = drag.yaw + (e.clientX - drag.x) * 0.008;
      pitch = clamp(drag.pitch + (e.clientY - drag.y) * 0.006, -1.2, 1.2);
      if (reduce) draw();
    });
    canvas.addEventListener("pointerup", function () { drag = null; });
    canvas.addEventListener("pointercancel", function () { drag = null; });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; setRunning(true); }).observe(root);
    }
    document.addEventListener("visibilitychange", function () { visible = !document.hidden; setRunning(true); });
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { layout(); draw(); }, 150); });
    M.onTheme(function () { layout(); draw(); });

    layout();
    if (reduce) {
      // A still picture: a state with its precession trail.
      for (var i = 0; i < 120; i++) { state = norm(rotate(state, [0, 0, 1], 0.03)); trail.push(state); }
    }
    updateReadout();
    draw();
    setRunning(true);
  });
})();
