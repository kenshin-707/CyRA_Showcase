/**
 * CYRA CTF — Realistic 3D Sakura (Cherry Blossom) Particle Physics Engine
 * 
 * Features:
 * - Authentic botanical sakura petal geometry with notch and gradient blush.
 * - 3D tumbling rotation matrix (Pitch, Yaw, Roll) simulating aerodynamic air resistance & lift.
 * - Dynamic undulating breeze & sinusoidal flutter.
 * - Interactive Wind Gusts: dramatic horizontal wind surge with vortex tumbling.
 * - Multi-layer depth with varied sizes, speeds, and translucencies.
 * - High-DPI / Retina display crisp rendering.
 * - Zero CPU waste: pauses on hidden tab & respects prefers-reduced-motion.
 */

(function () {
  "use strict";

  var canvas = document.getElementById("cyra-sakura-canvas");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    canvas.style.display = "none";
    return;
  }

  var width = window.innerWidth;
  var height = window.innerHeight;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Natural sakura petal color schemes
  var PALETTES = [
    { base: "rgba(255, 245, 248, 0.92)", tip: "rgba(255, 160, 185, 0.88)", mid: "rgba(255, 195, 210, 0.85)" },
    { base: "rgba(255, 238, 243, 0.90)", tip: "rgba(255, 140, 170, 0.86)", mid: "rgba(255, 180, 200, 0.82)" },
    { base: "rgba(255, 250, 252, 0.94)", tip: "rgba(255, 175, 198, 0.89)", mid: "rgba(255, 210, 225, 0.86)" },
    { base: "rgba(255, 240, 245, 0.88)", tip: "rgba(255, 120, 155, 0.84)", mid: "rgba(255, 170, 195, 0.80)" }
  ];

  var PETAL_COUNT = width < 768 ? 24 : 42;
  var petals = [];

  // Global breeze & wind state
  var globalWind = {
    x: 0.8,
    y: 0.25,
    targetX: 0.8,
    gust: 0,
    gustDuration: 0
  };

  function createPetal(initialY, initialX) {
    var size = 12 + Math.random() * 12; // 12px to 24px
    var palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    var aspect = 1.25 + Math.random() * 0.35; // width to length ratio

    return {
      x: initialX !== undefined ? initialX : Math.random() * (width + 100) - 50,
      y: initialY !== undefined ? initialY : -25 - Math.random() * (height * 0.5),
      size: size,
      width: size * 0.72,
      height: size * aspect,
      palette: palette,
      
      // 3D Rotations
      rotX: Math.random() * Math.PI * 2,       // Pitch (flipping)
      rotY: Math.random() * Math.PI * 2,       // Yaw (twisting)
      rotZ: Math.random() * Math.PI * 2,       // Roll (2D angle)
      
      rotSpeedX: (Math.random() - 0.5) * 0.04 + 0.018,
      rotSpeedY: (Math.random() - 0.5) * 0.05 + 0.024,
      rotSpeedZ: (Math.random() - 0.5) * 0.03,

      // Aerodynamic floating speeds
      baseFallSpeed: 0.8 + (size / 24) * 0.85 + Math.random() * 0.45,
      fallSpeed: 0,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.018 + Math.random() * 0.022,
      swayAmp: 1.0 + Math.random() * 1.6,
      
      depthAlpha: 0.75 + (size / 24) * 0.25
    };
  }

  // Initialize petals spread across the screen
  for (var i = 0; i < PETAL_COUNT; i++) {
    petals.push(createPetal(Math.random() * height));
  }

  function drawSakuraPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotZ);

    // 3D projection scaling for realistic tumbling
    var scaleX = Math.cos(p.rotX);
    var scaleY = Math.sin(p.rotY);

    // Prevent flat zero scaling
    if (Math.abs(scaleX) < 0.08) scaleX = scaleX < 0 ? -0.08 : 0.08;
    if (Math.abs(scaleY) < 0.08) scaleY = scaleY < 0 ? -0.08 : 0.08;

    ctx.scale(scaleX, scaleY);

    var w = p.width;
    var h = p.height;

    // Gradient along petal length
    var grad = ctx.createLinearGradient(0, 0, 0, -h);
    grad.addColorStop(0, p.palette.base);
    grad.addColorStop(0.45, p.palette.mid);
    grad.addColorStop(1, p.palette.tip);

    ctx.fillStyle = grad;
    ctx.shadowColor = "rgba(255, 170, 190, 0.3)";
    ctx.shadowBlur = 5;

    // Organic realistic Sakura petal shape with curved lobe and tip notch
    ctx.beginPath();
    ctx.moveTo(0, 0); // Base stem point
    // Left curve
    ctx.bezierCurveTo(-w * 0.55, -h * 0.32, -w * 0.72, -h * 0.78, -w * 0.22, -h);
    // Tip notch (characteristic cherry blossom indent)
    ctx.lineTo(0, -h * 0.86);
    ctx.lineTo(w * 0.22, -h);
    // Right curve
    ctx.bezierCurveTo(w * 0.72, -h * 0.78, w * 0.55, -h * 0.32, 0, 0);
    ctx.closePath();
    ctx.fill();

    // Delicate translucent midrib vein
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-w * 0.04, -h * 0.45, 0, -h * 0.84);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 0.65;
    ctx.stroke();

    ctx.restore();
  }

  var lastTime = performance.now();
  var animationFrameId = null;

  function updateAndRender(now) {
    var dt = (now - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; // Clamp large time steps
    lastTime = now;

    ctx.clearRect(0, 0, width, height);

    // Wind dynamics
    if (globalWind.gustDuration > 0) {
      globalWind.gustDuration -= dt;
      // Exponential decay of gust
      globalWind.gust *= Math.pow(0.55, dt * 2.2);
    } else {
      globalWind.gust = 0;
      // Gently drift base wind
      globalWind.targetX = 0.7 + Math.sin(now * 0.0008) * 0.5;
    }
    
    var currentWindX = globalWind.targetX + globalWind.gust;
    globalWind.x += (currentWindX - globalWind.x) * 0.08;

    for (var j = 0; j < petals.length; j++) {
      var p = petals[j];

      // Wind surge accelerates tumble rate
      var gustTumbleMult = 1 + (globalWind.gust > 0 ? globalWind.gust * 0.35 : 0);
      p.rotX += p.rotSpeedX * gustTumbleMult;
      p.rotY += p.rotSpeedY * gustTumbleMult;
      p.rotZ += p.rotSpeedZ * gustTumbleMult;
      p.swayPhase += p.swaySpeed;

      // Air resistance calculation: tumbling petals experience periodic lift & drag
      var drag = (Math.abs(Math.cos(p.rotX)) + Math.abs(Math.sin(p.rotY))) * 0.5;
      p.fallSpeed = p.baseFallSpeed * (0.65 + drag * 0.65);

      // Positional translation with wind gust surge
      var sway = Math.sin(p.swayPhase) * p.swayAmp;
      p.x += (globalWind.x + sway) * (dt * 60);
      p.y += (p.fallSpeed + globalWind.y - (globalWind.gust * 0.12)) * (dt * 60);

      // Recycle petals that leave the viewport
      if (p.y > height + 35) {
        p.y = -25 - Math.random() * 20;
        p.x = Math.random() * (width + 60) - 30;
      }
      if (p.x > width + 60) {
        p.x = -40;
        p.y = Math.random() * height;
      } else if (p.x < -60) {
        p.x = width + 40;
      }

      drawSakuraPetal(p);
    }

    // Clean up excess flurry petals smoothly
    if (petals.length > PETAL_COUNT && globalWind.gust < 0.5) {
      petals.pop();
    }

    animationFrameId = requestAnimationFrame(updateAndRender);
  }

  animationFrameId = requestAnimationFrame(updateAndRender);

  // Global Wind Gust Trigger
  window.cyraTriggerBreeze = function (intensity) {
    var power = intensity !== undefined ? intensity : 11.5;
    globalWind.gust = power;
    globalWind.gustDuration = 2.6;

    // Spawn an exciting wave of flurry petals swept in from the left
    var flurryCount = width < 768 ? 10 : 18;
    for (var k = 0; k < flurryCount; k++) {
      var extra = createPetal(Math.random() * height, -10 - Math.random() * 80);
      extra.baseFallSpeed *= 1.2;
      petals.push(extra);
    }
  };

  // Custom Event Listener
  document.addEventListener("cyra:wind-gust", function (e) {
    var power = (e.detail && e.detail.power) ? e.detail.power : 11.5;
    window.cyraTriggerBreeze(power);
  });

  // Breeze gust during page transitions / link navigation
  document.addEventListener("click", function (e) {
    var link = e.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    if (link.target === "_blank") return;
    window.cyraTriggerBreeze(5.5);
  }, true);

  // Pause when tab is not visible to save resources
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    } else {
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(updateAndRender);
    }
  });

})();
