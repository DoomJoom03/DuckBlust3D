const DuckMaterials = {
  body: new THREE.MeshLambertMaterial({ color: 0x8a5a2b }),
  belly: new THREE.MeshLambertMaterial({ color: 0xd9c9a0 }),
  head: new THREE.MeshLambertMaterial({ color: 0x1f8a47 }),
  ring: new THREE.MeshLambertMaterial({ color: 0xffffff }),
  beak: new THREE.MeshLambertMaterial({ color: 0xffa51f }),
  eye: new THREE.MeshBasicMaterial({ color: 0x101010 }),
  wing: new THREE.MeshLambertMaterial({ color: 0x5e3b1c }),
  tip: new THREE.MeshLambertMaterial({ color: 0xf2f2f2 })
};

function makeBox(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function buildDuckModel() {
  const group = new THREE.Group();
  const m = DuckMaterials;
  group.add(makeBox(1.8, 1, 1.1, m.body, 0, 0, 0));
  group.add(makeBox(1.5, 0.3, 0.9, m.belly, 0.05, -0.5, 0));
  group.add(makeBox(0.7, 0.7, 0.7, m.head, 1.05, 0.75, 0));
  group.add(makeBox(0.2, 0.5, 0.74, m.ring, 0.78, 0.35, 0));
  group.add(makeBox(0.5, 0.2, 0.5, m.beak, 1.6, 0.65, 0));
  group.add(makeBox(0.12, 0.12, 0.1, m.eye, 1.25, 0.9, 0.37));
  group.add(makeBox(0.12, 0.12, 0.1, m.eye, 1.25, 0.9, -0.37));
  group.add(makeBox(0.6, 0.3, 0.6, m.body, -1.1, 0.35, 0));
  const wings = [];
  for (const side of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.3, side * 0.55);
    pivot.add(makeBox(1, 0.12, 1.1, m.wing, 0, 0, side * 0.55));
    pivot.add(makeBox(0.5, 0.12, 0.5, m.tip, -0.2, 0, side * 1.2));
    group.add(pivot);
    wings.push({ pivot, side });
  }
  return { group, wings };
}

class Duck {
  constructor(scene, view, difficulty) {
    this.scene = scene;
    this.view = view;
    this.diff = difficulty;
    this.depth = 35 + Math.random() * 20;
    const b = this.bounds();
    
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.pos = new THREE.Vector3(-this.dir * b.x * 0.95, b.minY + Math.random() * (b.maxY - b.minY), -this.depth);
    this.vel = new THREE.Vector2(this.dir * difficulty.speed, 0);
    this.state = "fly";
    this.escaped = false;
    this.radius = 1.8;
    this.awareness = 0;
    this.cooldown = 0.5;
    this.panic = 0;
    this.life = difficulty.life;
    this.time = Math.random() * 10;
    this.phase = Math.random() * 6;
    this.flapSpeed = 16 + Math.random() * 4;
    this.offset = new THREE.Vector3();
    this.closest = new THREE.Vector3();
    const model = buildDuckModel();
    this.group = model.group;
    this.wings = model.wings;
    this.group.scale.setScalar(1.25);
    this.group.position.copy(this.pos);
    scene.add(this.group);
  }

  bounds() {
    const halfH = this.view.tan * this.depth;
    const halfW = halfH * this.view.aspect;
    return { x: halfW * 0.92, minY: -0.2 * halfH, maxY: 0.8 * halfH };
  }

  alarm(ray, radius) {
    if (this.state === "dead") return;
    ray.closestPointToPoint(this.pos, this.closest);
    if (this.closest.distanceTo(this.pos) < radius) {
      this.panic = 1.4;
      this.awareness = this.diff.reaction;
    }
  }

  kill() {
    this.state = "dead";
    this.vel.set(this.vel.x * 0.25, 5);
    this.spin = (Math.random() < 0.5 ? -1 : 1) * 7;
  }

  dodge(b) {
    let nx = this.offset.x;
    let ny = this.offset.y;
    const len = Math.hypot(nx, ny);
    
    if (len < 0.05) {
      const a = Math.random() * Math.PI * 2;
      nx = Math.cos(a);
      ny = Math.sin(a);
    } 
    else {
      nx /= len;
      ny /= len;
    }

    const turn = (Math.random() - 0.5) * 1.2;
    const cx = nx * Math.cos(turn) - ny * Math.sin(turn);
    let cy = nx * Math.sin(turn) + ny * Math.cos(turn);
    
    if (this.pos.y < b.minY + 3 && cy < 0) cy = -cy;
    if (this.pos.y > b.maxY - 3 && cy > 0) cy = -cy;
    
    const impulse = this.diff.impulse * (0.8 + Math.random() * 0.5);
    this.vel.x += cx * impulse;
    this.vel.y += cy * impulse;
    const speed = this.vel.length();
    if (speed > 32) this.vel.multiplyScalar(32 / speed);
    if (Math.abs(this.vel.x) > 2) this.dir = Math.sign(this.vel.x);
    this.cooldown = this.diff.cooldown * (0.8 + Math.random() * 0.5);
    this.awareness = 0;
    this.wingBoost = 0.5;
    Sfx.quack();
  }

  update(dt, ray) {
    this.time += dt;
    const b = this.bounds();
    
    if (this.state === "dead") {
      this.vel.y -= 34 * dt;
      this.pos.x += this.vel.x * dt;
      this.pos.y += this.vel.y * dt;
      this.group.rotation.z += this.spin * dt;
      this.group.rotation.x += 3 * dt;
      this.group.position.copy(this.pos);
      
      if (this.pos.y < -14) this.state = "gone";
      return;
    }
    
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.panic = Math.max(0, this.panic - dt);
    this.wingBoost = Math.max(0, (this.wingBoost || 0) - dt);

    if (this.state === "fly") {
      this.life -= dt;
      
      if (this.life <= 0) {
        this.state = "escape";
        this.vel.set(this.dir * 5, 15);
      }
      ray.closestPointToPoint(this.pos, this.closest);
      this.offset.copy(this.pos).sub(this.closest);
      
      if (this.offset.length() < this.diff.radius) {
        this.awareness += dt;
      } else {
        this.awareness = Math.max(0, this.awareness - dt * 2);
      }
      
      if (this.awareness >= this.diff.reaction && this.cooldown <= 0) this.dodge(b);
      const mult = this.panic > 0 ? 1.5 : 1;
      const targetX = this.dir * this.diff.speed * mult;
      const targetY = Math.sin(this.time * 1.7 + this.phase) * 1.8;
      const k = Math.min(1, dt * 2.2);
      this.vel.x += (targetX - this.vel.x) * k;
      this.vel.y += (targetY - this.vel.y) * k;
      this.pos.x += this.vel.x * dt;
      this.pos.y += this.vel.y * dt;
      
      if (this.pos.x > b.x) { this.pos.x = b.x; this.dir = -1; this.vel.x = Math.min(this.vel.x, 0); }
      if (this.pos.x < -b.x) { this.pos.x = -b.x; this.dir = 1; this.vel.x = Math.max(this.vel.x, 0); }
      if (this.pos.y > b.maxY) { this.pos.y = b.maxY; this.vel.y = -Math.abs(this.vel.y) * 0.5; }
      if (this.pos.y < b.minY) { this.pos.y = b.minY; this.vel.y = Math.abs(this.vel.y) * 0.5; }
    } 
    else {
      this.pos.x += this.vel.x * dt;
      this.pos.y += this.vel.y * dt;
      
      if (this.pos.y > b.maxY + 12) {
        this.state = "gone";
        this.escaped = true;
      }
    }

    const flap = Math.sin(this.time * (this.flapSpeed + (this.wingBoost > 0 ? 14 : 0)));
    
    for (const wing of this.wings) wing.pivot.rotation.x = wing.side * flap * 0.85;
    
    this.group.rotation.y = this.dir > 0 ? 0 : Math.PI;
    this.group.rotation.z = THREE.MathUtils.clamp(this.vel.y * 0.035, -0.5, 0.5);
    this.group.position.copy(this.pos);
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); });
  }
}
