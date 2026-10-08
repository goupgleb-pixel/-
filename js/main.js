(function () {
  'use strict';

  var canvas = document.getElementById('scene');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none)').matches;

  /* ================= ЧАСТИЦЫ ================= */
  var qn = parseInt(new URLSearchParams(location.search).get('n'), 10);
  var N = qn > 0 ? qn : (isTouch ? 22000 : 42000);
  var SHAPES = 4;

  var palette = {
    white: new THREE.Color('#f4f6ff'),
    blue: new THREE.Color('#3d7bff'),
    deepBlue: new THREE.Color('#1b3f9e'),
    yellow: new THREE.Color('#ffc83d'),
    orange: new THREE.Color('#ff7a2f'),
    dim: new THREE.Color('#7f8aa8')
  };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

  function mix(c1, c2, t, out) {
    out.r = c1.r + (c2.r - c1.r) * t;
    out.g = c1.g + (c2.g - c1.g) * t;
    out.b = c1.b + (c2.b - c1.b) * t;
  }

  /* shape 0: ракета (ось Y, затем наклон) */
  function rocketPoint(p, c) {
    var r = Math.random();
    var tmp = new THREE.Color();
    var x, y, z;
    if (r < 0.52) {                       // корпус
      y = rnd(-1.5, 1.9);
      var k = (y + 1.5) / 3.4;            // 0..1 снизу вверх
      var rad = 0.78 * Math.sin(Math.pow(k, 0.62) * Math.PI * 0.5 + 0.35) * (1 - Math.pow(k, 4) * 0.98);
      rad = Math.max(rad, 0.02);
      var a = rnd(0, Math.PI * 2);
      var fuzz = 1 + gauss() * 0.06;
      x = Math.cos(a) * rad * fuzz;
      z = Math.sin(a) * rad * fuzz;
      mix(palette.white, palette.deepBlue, Math.min(1, Math.abs(Math.sin(a * 1.0 + y)) * 0.8 + Math.random() * 0.2), tmp);
      if (Math.random() < 0.35) tmp.copy(palette.white);
    } else if (r < 0.64) {                // иллюминатор
      var u = rnd(0, Math.PI * 2), v = Math.acos(rnd(-1, 1));
      x = Math.sin(v) * Math.cos(u) * 0.34;
      y = 0.55 + Math.cos(v) * 0.34;
      z = 0.62 + Math.sin(v) * Math.sin(u) * 0.34;
      mix(palette.yellow, palette.white, Math.random() * 0.7, tmp);
    } else if (r < 0.80) {                // стабилизаторы
      var side = Math.random() < 0.5 ? -1 : 1;
      var t = Math.random(), s = Math.random();
      var yy = -1.55 + t * 1.25;
      var maxX = 0.55 + (1 - t) * 0.9;
      x = side * (0.55 + s * (maxX - 0.55) * 1.0 + 0.0);
      y = yy - s * 0.55;
      z = gauss() * 0.04;
      mix(palette.blue, palette.yellow, Math.random() < 0.3 ? 1 : s * 0.4, tmp);
    } else {                              // пламя
      var h = Math.pow(Math.random(), 0.8);
      y = -1.55 - h * 2.2;
      var rr = (1 - h) * 0.55 * Math.sqrt(Math.random());
      var aa = rnd(0, Math.PI * 2);
      x = Math.cos(aa) * rr + gauss() * 0.04;
      z = Math.sin(aa) * rr + gauss() * 0.04;
      mix(palette.yellow, palette.orange, h, tmp);
    }
    // наклон вправо-вверх и смещение к правой части экрана
    var ang = -0.62;
    var cx = x * Math.cos(ang) - y * Math.sin(ang);
    var cy = x * Math.sin(ang) + y * Math.cos(ang);
    p.set(cx * 1.15 + 2.7, cy * 1.15 + 0.1, z * 1.15);
    c.copy(tmp);
  }

  /* shape 1: разреженное звёздное поле (взрыв частиц) */
  function starPoint(p, c) {
    p.set(rnd(-9, 9), rnd(-5.5, 5.5), rnd(-6, 3));
    if (Math.random() < 0.15) mix(palette.white, palette.yellow, Math.random(), c);
    else mix(palette.dim, palette.white, Math.random(), c);
  }

  /* shape 2: глобус справа */
  function globePoint(p, c) {
    var u = rnd(0, Math.PI * 2), v = Math.acos(rnd(-1, 1));
    var R = 2.5 * (Math.random() < 0.85 ? 1 : rnd(0.55, 1));
    var x = Math.sin(v) * Math.cos(u) * R;
    var y = Math.cos(v) * R;
    var z = Math.sin(v) * Math.sin(u) * R;
    // «континенты»: плотность по шуму, остальное — тусклый океан
    var land = Math.sin(u * 3 + y * 1.4) * Math.cos(v * 4 - u) + Math.sin(u * 7 + 2) * 0.35;
    if (land < -0.15 && Math.random() < 0.55) { x *= 1.18; y *= 1.18; z *= 1.18; }
    p.set(x + 3.0, y, z - 0.5);
    if (land > 0.1) mix(palette.yellow, palette.orange, Math.random(), c);
    else if (y > 0.4) mix(palette.white, palette.blue, Math.random(), c);
    else mix(palette.blue, palette.deepBlue, Math.random(), c);
  }

  /* shape 3: спиральная галактика-кольцо (команда/контакты) */
  function galaxyPoint(p, c) {
    var arm = Math.floor(Math.random() * 3);
    var d = Math.pow(Math.random(), 0.7) * 6.5 + 0.4;
    var a = d * 0.9 + arm * (Math.PI * 2 / 3) + gauss() * 0.45;
    p.set(Math.cos(a) * d, gauss() * 0.35 * (1 + d * 0.1), Math.sin(a) * d - 3.5);
    var t = Math.min(1, d / 7);
    if (Math.random() < 0.12) mix(palette.white, palette.yellow, Math.random(), c);
    else mix(palette.yellow, palette.blue, t, c);
    c.multiplyScalar(0.55 + Math.random() * 0.45);
  }

  var generators = [rocketPoint, starPoint, globePoint, galaxyPoint];

  var geo = new THREE.BufferGeometry();
  var tmpP = new THREE.Vector3();
  var tmpC = new THREE.Color();
  var seeds = new Float32Array(N * 3);
  var sizes = new Float32Array(N);

  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  var i, s;
  for (s = 0; s < SHAPES; s++) {
    var pos = new Float32Array(N * 3);
    var col = new Float32Array(N * 3);
    for (i = 0; i < N; i++) {
      generators[s](tmpP, tmpC);
      pos[i * 3] = tmpP.x; pos[i * 3 + 1] = tmpP.y; pos[i * 3 + 2] = tmpP.z;
      col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b;
    }
    geo.setAttribute('aPos' + s, new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aCol' + s, new THREE.BufferAttribute(col, 3));
  }
  for (i = 0; i < N; i++) {
    seeds[i * 3] = Math.random();
    seeds[i * 3 + 1] = Math.random();
    seeds[i * 3 + 2] = Math.random();
    sizes[i] = 0.6 + Math.pow(Math.random(), 3) * 1.8;
  }
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  var vert = [
    'attribute vec3 aPos0; attribute vec3 aPos1; attribute vec3 aPos2; attribute vec3 aPos3;',
    'attribute vec3 aCol0; attribute vec3 aCol1; attribute vec3 aCol2; attribute vec3 aCol3;',
    'attribute vec3 aSeed; attribute float aSize;',
    'uniform vec4 uW; uniform float uTime; uniform float uBurst; uniform vec3 uMouse; uniform float uPx; uniform float uClick;',
    'varying vec3 vCol;',
    'void main(){',
    '  vec3 p = aPos0*uW.x + aPos1*uW.y + aPos2*uW.z + aPos3*uW.w;',
    '  vCol = aCol0*uW.x + aCol1*uW.y + aCol2*uW.z + aCol3*uW.w;',
    // разлёт во время перехода между формами
    '  vec3 dir = normalize(aSeed - 0.5 + 0.001);',
    '  p += dir * uBurst * (1.5 + aSeed.x * 4.0);',
    // лёгкое «дыхание»
    '  p += vec3(sin(uTime*0.6 + aSeed.x*40.0), cos(uTime*0.5 + aSeed.y*40.0), sin(uTime*0.4 + aSeed.z*40.0)) * 0.035;',
    '  vec4 wp = modelMatrix * vec4(p, 1.0);',
    // мягкое перемешивание вокруг курсора: завихрение + дрожание, без «дырки»
    '  vec2 d = wp.xy - uMouse.xy;',
    '  float dist = length(d);',
    '  float f = smoothstep(1.5, 0.0, dist);',
    '  float k = f * (0.16 + uClick * 0.5);',
    '  vec2 perp = vec2(-d.y, d.x) / (dist + 0.001);',
    '  vec2 jit = vec2(sin(uTime*2.2 + aSeed.x*60.0), cos(uTime*1.9 + aSeed.y*60.0));',
    '  wp.xy += (perp * (aSeed.z - 0.35) * 1.4 + jit * 0.9 + (aSeed.xy - 0.5) * 1.2) * k;',
    '  wp.z += (aSeed.z - 0.5) * 2.0 * k;',
    '  vec4 mv = viewMatrix * wp;',
    '  gl_Position = projectionMatrix * mv;',
    '  gl_PointSize = aSize * uPx * (0.075 + f * 0.015) / -mv.z;',
    '}'
  ].join('\n');

  var frag = [
    'precision mediump float;',
    'varying vec3 vCol;',
    'void main(){',
    '  float d = length(gl_PointCoord - 0.5);',
    '  if (d > 0.5) discard;',
    '  float a = smoothstep(0.5, 0.05, d);',
    '  gl_FragColor = vec4(vCol, a * 0.95);',
    '}'
  ].join('\n');

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x05060b, 1);
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 8;

  var uniforms = {
    uW: { value: new THREE.Vector4(1, 0, 0, 0) },
    uTime: { value: 0 },
    uBurst: { value: 0 },
    uMouse: { value: new THREE.Vector3(999, 999, 0) },
    uPx: { value: 1 },
    uClick: { value: 0 }
  };
  var mat = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  var points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // на узких экранах отодвигаем камеру, чтобы фигуры помещались
    camera.position.z = w / h < 1 ? 8 + (1 - w / h) * 7 : 8;
    camera.updateProjectionMatrix();
    uniforms.uPx.value = h * dpr * 0.5;
  }
  window.addEventListener('resize', resize);
  resize();

  /* ================= СКРОЛЛ → ПРОГРЕСС ФОРМ ================= */
  var sections = Array.prototype.slice.call(document.querySelectorAll('.sec'));
  // секции hero, solutions, expertise, team, contact → формы 0,1,2,3,3
  var shapeOf = [0, 1, 2, 3, 3];

  function smooth(t) { return t * t * (3 - 2 * t); }

  function targetProgress() {
    var center = window.scrollY + window.innerHeight * 0.55;
    var idx = 0;
    for (var k = 0; k < sections.length; k++) {
      if (sections[k].offsetTop <= center) idx = k;
    }
    var sec = sections[idx];
    var frac = Math.min(1, Math.max(0, (center - sec.offsetTop) / sec.offsetHeight));
    var cur = shapeOf[idx];
    var next = shapeOf[Math.min(idx + 1, shapeOf.length - 1)];
    var t = next === cur ? 0 : smooth(Math.min(1, Math.max(0, (frac - 0.55) / 0.45)));
    return cur + (next - cur) * t;
  }

  var prog = 0, progTarget = 0;
  var mouse = { x: 0, y: 0, nx: 0, ny: 0 };
  var mouseWorld = new THREE.Vector3(999, 999, 0);

  window.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.nx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ny = -((e.clientY / window.innerHeight) * 2 - 1);
    cursor.classList.add('is-on');
  });
  window.addEventListener('touchmove', function (e) {
    var t = e.touches[0];
    mouse.nx = (t.clientX / window.innerWidth) * 2 - 1;
    mouse.ny = -((t.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  var click = 0;
  window.addEventListener('pointerdown', function () { click = 1; cursor.classList.add('is-down'); });
  window.addEventListener('pointerup', function () { cursor.classList.remove('is-down'); });

  /* ================= КУРСОР / МЕНЮ / БЕГУЩАЯ СТРОКА ================= */
  var cursor = document.getElementById('cursor');
  var cx = 0, cy = 0;
  document.addEventListener('mouseover', function (e) {
    cursor.classList.toggle('is-link', !!e.target.closest('a, button'));
  });

  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  }
  burger.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  var marquee = document.getElementById('marquee');
  var marqueeSec = document.getElementById('expertise');

  /* ================= ЦИКЛ ================= */
  var clock = new THREE.Clock();
  var plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  var ray = new THREE.Raycaster();
  var ndc = new THREE.Vector2();

  function frame() {
    var dt = Math.min(clock.getDelta(), 0.05);
    var time = clock.elapsedTime;

    progTarget = targetProgress();
    var prev = prog;
    prog += (progTarget - prog) * Math.min(1, dt * 4.5);

    // веса форм
    var base = Math.min(SHAPES - 1, Math.floor(prog));
    var f = prog - base;
    var nxt = Math.min(SHAPES - 1, base + 1);
    var w = [0, 0, 0, 0];
    w[base] += 1 - f;
    w[nxt] += f;
    uniforms.uW.value.set(w[0], w[1], w[2], w[3]);
    // разлёт максимален в середине перехода
    uniforms.uBurst.value = Math.sin(Math.PI * f) * (reduceMotion ? 0 : 1) * (nxt === base ? 0 : 1);

    uniforms.uTime.value = time;

    // параллакс и медленное вращение
    var rotY = reduceMotion ? 0 : Math.sin(time * 0.25) * 0.25 + mouse.nx * 0.18;
    var rotX = reduceMotion ? 0 : -mouse.ny * 0.1;
    points.rotation.y += (rotY - points.rotation.y) * 0.05;
    points.rotation.x += (rotX - points.rotation.x) * 0.05;
    if (prog > 2.5) points.rotation.z += dt * 0.04;   // галактика медленно вращается
    else points.rotation.z *= 0.95;

    // позиция курсора в мировых координатах (для отталкивания)
    ndc.set(mouse.nx, mouse.ny);
    ray.setFromCamera(ndc, camera);
    ray.ray.intersectPlane(plane, mouseWorld);
    if (mouseWorld) {
      // сглаживаем позицию, чтобы частицы текли за курсором
      if (uniforms.uMouse.value.x > 900) uniforms.uMouse.value.copy(mouseWorld);
      else uniforms.uMouse.value.lerp(mouseWorld, 0.18);
    }
    click *= Math.pow(0.04, dt);       // волна от клика затухает за ~0.7 с
    uniforms.uClick.value = click;

    // курсор
    cx += (mouse.x - cx) * 0.2;
    cy += (mouse.y - cy) * 0.2;
    cursor.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';

    // бегущая строка привязана к скроллу
    if (marquee) {
      var r = marqueeSec.getBoundingClientRect();
      marquee.style.transform = 'translate3d(' + (-Math.abs(r.top) * 0.6 - 200) + 'px,0,0)';
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
