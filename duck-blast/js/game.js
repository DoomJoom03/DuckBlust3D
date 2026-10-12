(() => {
  const canvas = document.getElementById("view");
  const crosshair = document.getElementById("crosshair");
  const hud = document.getElementById("hud");
  const scoreEl = document.getElementById("score");
  const waveEl = document.getElementById("wave");
  const livesEl = document.getElementById("lives");
  const shellsEl = document.getElementById("shells");
  const bannerEl = document.getElementById("banner");
  const flashEl = document.getElementById("flash");
  const menu = document.getElementById("menu");
  const over = document.getElementById("over");
  const finalEl = document.getElementById("final");
  const bestEl = document.getElementById("best");

  const MAX_SHELLS = 2;
  const PELLETS = 10;
  const SPREAD = 0.045;
  const FIRE_DELAY = 0.4;
  const RELOAD_STEP = 0.5;
  const GROUND_Y = -14;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  const scene = new THREE.Scene();
  const SKY = 0x7fcdf5;
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 90, 210);
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 400);
  scene.add(camera);
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const sun = new THREE.DirectionalLight(0xfff2d0, 0.8);
  sun.position.set(1, 2, 1);
  scene.add(sun);

  const view = { tan: Math.tan(THREE.MathUtils.degToRad(30)), aspect: 16 / 9 };
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(0, 0);
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  function mat(color) { return new THREE.MeshLambertMaterial({ color }); }
  function solid(w, h, d, material, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  }

  const grassMat = mat(0x4aa83f);
  const darkGrass = mat(0x3a8a34);
  const mountainMat = mat(0x5aa06a);
  const trunkMat = mat(0x6b4423);
  const leafMat = mat(0x2d7a2f);
  const leafLight = mat(0x3e9a3a);
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  solid(600, 2, 100, grassMat, 0, GROUND_Y - 1, -62);
  solid(600, 2, 30, darkGrass, 0, GROUND_Y - 1, -127);
  for (let i = 0; i < 22; i++) {
    const h = 4 + Math.random() * 14;
    const w = 14 + Math.random() * 22;
    solid(w, h, 14, mountainMat, -120 + i * 11 + Math.random() * 6, GROUND_Y + h / 2, -112 - Math.random() * 8);
    solid(w * 0.55, h * 0.5, 12, darkGrass, -120 + i * 11 + Math.random() * 6, GROUND_Y + h + h * 0.25, -112);
  }
  for (let i = 0; i < 26; i++) {
    const x = -90 + Math.random() * 180;
    const z = -30 - Math.random() * 70;
    const trunkH = 3 + Math.random() * 2;
    solid(1, trunkH, 1, trunkMat, x, GROUND_Y + trunkH / 2, z);
    solid(4, 2, 4, leafMat, x, GROUND_Y + trunkH + 1, z);
    solid(3, 2, 3, leafLight, x, GROUND_Y + trunkH + 3, z);
    solid(1.6, 1.6, 1.6, leafMat, x, GROUND_Y + trunkH + 4.6, z);
  }
  for (let i = 0; i < 30; i++) {
    solid(1.5 + Math.random() * 2, 1.2, 1.5, leafLight, -80 + Math.random() * 160, GROUND_Y + 0.6, -26 - Math.random() * 30);
  }
  solid(8, 8, 1, new THREE.MeshBasicMaterial({ color: 0xffe36b }), 70, 38, -150);

  const clouds = [];
  for (let i = 0; i < 12; i++) {
    const cloud = new THREE.Group();
    const parts = 3 + Math.floor(Math.random() * 3);
    for (let p = 0; p < parts; p++) {
      const w = 5 + Math.random() * 5;
      const part = new THREE.Mesh(new THREE.BoxGeometry(w, 2 + Math.random() * 2, 3), cloudMat);
      part.position.set(p * 4 - parts * 2, Math.random() * 1.5, 0);
      cloud.add(part);
    }
    cloud.position.set(-130 + Math.random() * 260, 14 + Math.random() * 34, -95 - Math.random() * 30);
    cloud.userData.speed = 0.8 + Math.random() * 1.4;
    scene.add(cloud);
    clouds.push(cloud);
  }

  const gun = new THREE.Group();
  const gunMetal = mat(0x2b2b30);
  const gunGrey = mat(0x4a4a54);
  const gunWood = mat(0x8a5a2b);
  const gunPump = mat(0x5e3512);
  gun.add(makeBox(0.1, 0.1, 1.3, gunMetal, 0, 0.04, 0.65));
  gun.add(makeBox(0.08, 0.08, 1.1, gunGrey, 0, -0.06, 0.55));
  gun.add(makeBox(0.2, 0.14, 0.42, gunPump, 0, -0.12, 0.5));
  gun.add(makeBox(0.18, 0.2, 0.45, gunGrey, 0, -0.02, -0.05));
  gun.add(makeBox(0.14, 0.22, 0.7, gunWood, 0, -0.08, -0.55));
  const muzzle = makeBox(0.34, 0.34, 0.2, new THREE.MeshBasicMaterial({ color: 0xffd34a }), 0, 0.04, 1.4);
  muzzle.visible = false;
  gun.add(muzzle);
  const GUN_BASE = new THREE.Vector3(0.48, -0.46, -0.95);
  gun.position.copy(GUN_BASE);
  camera.add(gun);

  const feathers = [];
  const featherGeo = new THREE.BoxGeometry(0.35, 0.35, 0.12);
  const featherMats = [mat(0xffffff), mat(0x8a5a2b), mat(0x1f8a47)];

  const state = {
    mode: "menu",
    score: 0,
    wave: 1,
    lives: 3,
    shells: MAX_SHELLS,
    fireTimer: 0,
    reloading: false,
    reloadTimer: 0,
    autoReload: 0,
    recoil: 0,
    flashTimer: 0,
    ducks: [],
    spawnLeft: 0,
    spawnTimer: 0,
    waveDelay: 0,
    bannerTimer: 0
  };

  function difficulty(wave) {
    return {
      reaction: Math.max(0.1, 0.4 - wave * 0.035),
      cooldown: Math.max(0.35, 0.95 - wave * 0.06),
      impulse: 17 + wave * 1.6,
      radius: Math.min(9.5, 5 + wave * 0.55),
      speed: 7 + wave * 0.9,
      life: Math.max(10, 17 - wave * 0.5)
    };
  }

  function showBanner(text, seconds) {
    bannerEl.textContent = text;
    bannerEl.classList.add("show");
    state.bannerTimer = seconds;
  }

  function renderHud() {
    scoreEl.textContent = "SCORE " + state.score;
    waveEl.textContent = "WAVE " + state.wave;
    livesEl.textContent = "\u2665".repeat(Math.max(0, state.lives));
    shellsEl.innerHTML = "";
    for (let i = 0; i < MAX_SHELLS; i++) {
      const shell = document.createElement("div");
      shell.className = "shell" + (i >= state.shells ? " spent" : "");
      shellsEl.appendChild(shell);
    }
    crosshair.classList.toggle("empty", state.shells === 0);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scale = h > 1000 ? 6 : h > 700 ? 5 : 4;
    renderer.setSize(Math.ceil(w / scale), Math.ceil(h / scale), false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    view.aspect = camera.aspect;
  }

  function updateAim() {
    mouse.set((pointer.x / window.innerWidth) * 2 - 1, -(pointer.y / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    crosshair.style.transform = "translate(" + pointer.x + "px," + pointer.y + "px)";
  }

  function startWave() {
    state.spawnLeft = Math.min(8, 2 + state.wave);
    state.spawnTimer = 0;
    showBanner("WAVE " + state.wave, 1.6);
    renderHud();
  }

  function reset() {
    for (const duck of state.ducks) duck.dispose();
    state.ducks = [];
    state.score = 0;
    state.wave = 1;
    state.lives = 3;
    state.shells = MAX_SHELLS;
    state.reloading = false;
    state.fireTimer = 0;
    state.waveDelay = 0;
    startWave();
  }

  function begin() {
    Sfx.init();
    menu.classList.add("hidden");
    over.classList.add("hidden");
    hud.classList.remove("hidden");
    crosshair.classList.add("active");
    canvas.style.cursor = "none";
    reset();
    state.mode = "playing";
  }

  function endGame() {
    state.mode = "over";
    let best = 0;
    try {
      best = parseInt(localStorage.getItem("duckBlastBest") || "0", 10);
      if (state.score > best) {
        best = state.score;
        localStorage.setItem("duckBlastBest", String(best));
      }
    } catch (e) {
      best = Math.max(best, state.score);
    }
    finalEl.textContent = "Score " + state.score + " - reached wave " + state.wave;
    bestEl.textContent = "Best " + Math.max(best, state.score);
    hud.classList.add("hidden");
    crosshair.classList.remove("active");
    canvas.style.cursor = "default";
    over.classList.remove("hidden");
  }

  function restartWithAd() {
    if (state.mode !== "over") return;

    if (!y8Sdk) {
      begin();
      return;
    }

    let restarted = false;

    function restartOnce() {
      if (restarted) return;
      restarted = true;
      begin();
    }

    y8Sdk.showAd({
      type: "next",
      name: "restart-after-game-over",
      afterAd: restartOnce
    }).catch((error) => {
      console.error("Y8 ad error:", error);
      restartOnce();
    });
  }

  function burst(position) {
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(featherGeo, featherMats[i % featherMats.length]);
      mesh.position.copy(position);
      scene.add(mesh);
      feathers.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 14, Math.random() * 10, (Math.random() - 0.5) * 8),
        life: 0.9 + Math.random() * 0.4
      });
    }
  }

  function startReload() {
    if (state.reloading || state.shells >= MAX_SHELLS) return;
    state.reloading = true;
    state.reloadTimer = RELOAD_STEP;
  }

  function shoot() {
    if (state.mode !== "playing" || state.fireTimer > 0) return;
    if (state.shells <= 0) {
      Sfx.click();
      startReload();
      return;
    }
    state.reloading = false;
    state.shells--;
    state.fireTimer = FIRE_DELAY;
    state.recoil = 1;
    state.flashTimer = 0.06;
    state.autoReload = state.shells === 0 ? 0.5 : 0;
    Sfx.shot();
    flashEl.style.opacity = "0.22";
    updateAim();
    const baseRay = raycaster.ray;
    const hits = new Set();
    const dir = new THREE.Vector3();
    const pelletRay = new THREE.Ray(baseRay.origin.clone());
    for (let i = 0; i < PELLETS; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * SPREAD;
      dir.copy(baseRay.direction);
      dir.x += Math.cos(angle) * r;
      dir.y += Math.sin(angle) * r;
      dir.normalize();
      pelletRay.direction.copy(dir);
      for (const duck of state.ducks) {
        if (duck.state === "dead" || hits.has(duck)) continue;
        if (pelletRay.distanceSqToPoint(duck.pos) < duck.radius * duck.radius) hits.add(duck);
      }
    }
    for (const duck of state.ducks) duck.alarm(baseRay, 16);
    if (hits.size > 0) {
      for (const duck of hits) {
        duck.kill();
        burst(duck.pos);
      }
      state.score += 100 * hits.size * hits.size + (state.wave - 1) * 10 * hits.size;
      Sfx.hit();
    }
    renderHud();
  }

  function updateFeathers(dt) {
    for (let i = feathers.length - 1; i >= 0; i--) {
      const f = feathers[i];
      f.life -= dt;
      f.vel.y -= 22 * dt;
      f.mesh.position.addScaledVector(f.vel, dt);
      f.mesh.rotation.x += 6 * dt;
      f.mesh.rotation.y += 5 * dt;
      if (f.life <= 0) {
        scene.remove(f.mesh);
        feathers.splice(i, 1);
      }
    }
  }

  function update(dt) {
    for (const cloud of clouds) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > 150) cloud.position.x = -150;
    }
    updateFeathers(dt);
    const aimRay = raycaster.ray;
    gun.lookAt(aimRay.direction.clone().multiplyScalar(30));
    state.recoil = Math.max(0, state.recoil - dt * 5);
    gun.rotateX(-state.recoil * 0.35);
    gun.position.copy(GUN_BASE);
    gun.position.z += state.recoil * 0.2;
    state.flashTimer = Math.max(0, state.flashTimer - dt);
    muzzle.visible = state.flashTimer > 0;
    const flashOpacity = parseFloat(flashEl.style.opacity || "0");
    if (flashOpacity > 0) flashEl.style.opacity = String(Math.max(0, flashOpacity - dt * 2));
    if (state.bannerTimer > 0) {
      state.bannerTimer -= dt;
      if (state.bannerTimer <= 0) bannerEl.classList.remove("show");
    }
    if (state.mode !== "playing") return;

    state.fireTimer = Math.max(0, state.fireTimer - dt);
    if (state.autoReload > 0) {
      state.autoReload -= dt;
      if (state.autoReload <= 0) startReload();
    }
    if (state.reloading) {
      state.reloadTimer -= dt;
      if (state.reloadTimer <= 0) {
        state.shells++;
        Sfx.pump();
        renderHud();
        if (state.shells >= MAX_SHELLS) state.reloading = false;
        else state.reloadTimer = RELOAD_STEP;
      }
    }

    if (state.spawnLeft > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.ducks.push(new Duck(scene, view, difficulty(state.wave)));
        state.spawnLeft--;
        state.spawnTimer = 0.45;
      }
    }

    for (let i = state.ducks.length - 1; i >= 0; i--) {
      const duck = state.ducks[i];
      duck.update(dt, aimRay);
      if (duck.state === "gone") {
        if (duck.escaped) {
          state.lives--;
          Sfx.lose();
          showBanner("IT GOT AWAY", 1);
          renderHud();
        }
        duck.dispose();
        state.ducks.splice(i, 1);
      }
    }

    if (state.lives <= 0) {
      endGame();
      return;
    }

    if (state.spawnLeft === 0 && state.ducks.length === 0) {
      if (state.waveDelay <= 0) state.waveDelay = 2.2;
      state.waveDelay -= dt;
      if (state.waveDelay <= 0) {
        state.wave++;
        startWave();
      }
    }
  }

  function togglePause() {
    if (state.mode === "playing") {
      state.mode = "paused";
      showBanner("PAUSED", 9999);
    } else if (state.mode === "paused") {
      state.mode = "playing";
      state.bannerTimer = 0.01;
    }
  }

  window.addEventListener("pointermove", e => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    updateAim();
  });
  window.addEventListener("pointerdown", e => {
    if (e.target.tagName === "BUTTON" || e.button !== 0) return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    updateAim();
    shoot();
  });
  window.addEventListener("keydown", e => {
    if (e.code === "KeyR" && state.mode === "playing") startReload();
    if (e.code === "KeyP") togglePause();
  });
  window.addEventListener("blur", () => { if (state.mode === "playing") togglePause(); });
  window.addEventListener("resize", resize);
  window.addEventListener("contextmenu", e => e.preventDefault());
  document.getElementById("start").addEventListener("click", begin);
  document.getElementById("restart").addEventListener("click", restartWithAd);

  resize();
  updateAim();
  renderHud();
  canvas.style.cursor = "default";

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    if (state.mode !== "paused") update(dt);
    renderer.render(scene, camera);
  }
  frame();
})();
