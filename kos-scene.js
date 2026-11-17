(() => {
  'use strict';
  const T = window.THREE;
  if (!T) return;

  const stage = document.getElementById('kosStage');
  const viewport = document.getElementById('kosViewport');
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-10, 10, 5, -5, 0.1, 100);
  const skyLight = new T.HemisphereLight(0xffffff, 0x8a7463, 2.5);
  const sunLight = new T.DirectionalLight(0xffedcb, 2.1);
  sunLight.position.set(-8, 12, 7);
  scene.add(skyLight, sunLight);

  const world = new T.Group();
  const geometry = {
    box: new T.BoxGeometry(1, 1, 1),
    trunk: new T.CylinderGeometry(0.5, 0.65, 1, 8),
    leaves: new T.IcosahedronGeometry(0.5, 1),
    orb: new T.SphereGeometry(0.5, 16, 12),
  };
  const materials = new Map();
  const defaultAngle = 0.48;
  let renderer, model, pending, pointer, ready = false;
  let angle = defaultAngle;

  function mesh(shape, color, x, y, z, w, h, d, glow = false) {
    const key = glow ? 'lit-' + color : color;
    if (!materials.has(key)) {
      const attributes = { color, roughness: .86 };
      if (glow) Object.assign(attributes, { emissive:color, emissiveIntensity:.55 });
      materials.set(key, new T.MeshStandardMaterial(attributes));
    }
    const object = new T.Mesh(geometry[shape], materials.get(key));
    object.position.set(x, y, z);
    object.scale.set(w, h, d);
    world.add(object);
    return object;
  }
  const box = (...args) => mesh('box', ...args);

  function tree(x, z, height) {
    mesh('trunk', 0x805a44, x, height * .28, z, .23, height * .56, .23);
    mesh('leaves', 0x4d985d, x, height * .74, z, height * .77, height * .76, height * .72);
    mesh('leaves', 0x81ab61, x-.29, height * .88, z+.12, height * .5, height * .54, height * .52);
  }

  function surroundings(phase, amenities) {
    box(0xc6d7a8, 0, -.37, 0, 25, .55, 19);
    box(0x98b58a, 0, -.08, 0, 15.8, .25, 12.3);
    box(0xc5b7a0, 0, .08, 2.8, 12.3, .18, 3.7);
    box(0x42515b, 0, .04, 6.05, 24, .15, 2.65);
    box(0xe8d6af, 0, .14, 4.58, 23, .13, .14);
    for (let x = -10; x <= 10; x += 2.5) box(0xe9dfc5, x, .123, 6.05, 1.3, .016, .065);
    for (const [x,z,h] of [[-7,0,2.9],[7,0,3.0],[-7.8,-2.5,2.2],[8,-2.9,2.3],[-5.5,-4,2.45],[4.5,-4.3,2.65]]) {
      tree(x,z,h);
    }
    for (const x of [-5.7,5.7]) {
      box(0x384953, x, .83, 3.95, .10, 1.62, .10);
      box(0xffdfa0, x, 1.63, 3.95, .27, .17, .27, phase === 'malam');
    }
    if (amenities.parkir) {
      box(0x8b9897, 5.3, .2, 2.95, 3.65, .12, 2.25);
      for (let x = 4; x <= 6.8; x += 1.4) box(0xe4e4d3, x, .27, 2.95, .055, .02, 1.88);
      box(0xb85843, 4.7, .48, 2.92, .92, .45, 1.65);
      box(0xc2dce1, 4.7, .78, 2.87, .75, .24, .9);
    }
    if (amenities.kolam) {
      box(0xe6d7b0, -5.35,.20,2.7,2.9,.15,2.35);
      box(0x49b7c7, -5.35,.29,2.7,2.55,.06,1.98);
    }
    if (amenities.keamanan) {
      box(0xe3c795, -6.2,.75,4,1.15,1.22,.85);
      box(0x475968, -6.2,1.43,4,1.35,.17,1.02);
      box(0x86bac8, -6.2,.93,4.44,.7,.34,.05);
    }
  }

  function building({floors, rooms, level, amenities}) {
    const facades = [0xeac9a3, 0xe9dfc4, 0xbbd2d9];
    const trims = [0x995852, 0x477e73, 0x34576d];
    const facade = facades[level] ?? facades[0];
    const trim = trims[level] ?? trims[0];
    const height = 1.65;
    box(0xe6dcc8, 0, .20, 0, 10.35,.35,4.25);
    for (let floor = 0; floor < floors; floor++) {
      const y = .36 + floor * height;
      box(facade, 0, y+height/2, 0, 9.72,height,3.75);
      box(trim, 0,y+height-.06,0, 9.98,.13,3.96);
      for (let column = 0; column < 6; column++) {
        const x = (column - 2.5)*1.52;
        const room = rooms[floor*6+column];
        const occupied = Boolean(room?.tenant);
        const raised = (room?.lvl ?? 1) > 1;
        box(0x4f656a, x,y+.89,1.89, 1.15,.76,.09);
        box(occupied ? 0xffc77e : 0x81aebb, x,y+.89,1.95, .98,.60,.045, occupied);
        box(0xece0c8, x,y+.89,1.98,.045,.61,.035);
        box(raised ? 0xe99d5e : 0xd6c1a4, x,y+.51,2.01,1.22,.1,.24);
        if (amenities.ac && occupied) box(0xe5eaec, x+.51,y+1.34,1.97,.32,.19,.21);
      }
      for (const side of [-1, 1]) {
        for (const z of [-.84,.62]) {
          box(0x4c646b, side*4.88,y+.87,z,.07,.74,.83);
          box(0x8eb7c2, side*4.93,y+.87,z,.04,.59,.68);
        }
      }
    }
    const roof = .36 + floors*height;
    box(trim, 0,roof+.13,0,10.38,.25,4.18);
    box(0x60767b, 0,roof+.28,0,9.76,.11,3.63);
    for (const z of [-1.89,1.89]) box(trim, 0,roof+.40,z,10.10,.23,.13);
    for (const x of [-5,5]) box(trim, x,roof+.40,0,.13,.23,3.8);
    box(0x31494e, 0,.82,1.98, .54,1.03,.19);
    box(0xf4e1b9, 0,.25,2.14, 1.24,.23,.52);
    if (amenities.lift) box(facade, -3.92,roof+.56,-.82,1.15,.71,1.26);
    if (amenities.wifi) {
      box(0xece2ce, 3.7,roof+.74,-.72,.075,.94,.075);
      box(0xece2ce, 3.7,roof+1.15,-.72,.65,.065,.07);
    }
    if (amenities.rooftop) {
      box(0xf3cd8e, .9,roof+.98,.16,2.65,.14,1.88);
      for (const x of [-.3,2.1]) for (const z of [-.65,.98]) {
        box(0xd1ae83,x,roof+.57,z,.08,.82,.08);
      }
      box(0xd1ae83,.9,roof+.51,.2,1.6,.18,.93);
    }
  }

  function rebuild(state) {
    const palettes = {
      pagi:[0xc4e4e8, 0xffe2b9, 2.5, 2.0],
      siang:[0xaddae8, 0xfff1db, 2.65, 2.1],
      sore:[0xe0b5a9, 0xffc085, 2.05, 2.35],
      malam:[0x203a5b, 0x9ab7f3, 1.55, 1.05],
    };
    const [background, sunlight, ambient, direct] = palettes[state.phase] ?? palettes.siang;
    scene.background = new T.Color(background);
    scene.fog = new T.Fog(background, 24, 57);
    sunLight.color.setHex(sunlight);
    sunLight.intensity = direct;
    skyLight.intensity = ambient;
    world.clear();
    surroundings(state.phase, state.amenities);
    building(state);
    if (state.phase === 'malam') mesh('orb', 0xfff0cb, -8, 7.2, -9, 1.15,1.15,1.15,true);
  }

  function draw() {
    pending = undefined;
    const {clientWidth:width, clientHeight:height} = viewport;
    if (!renderer || !width || !height || !model) return;
    const ratio = width/height;
    const targetY = 1 + (model.floors-1)*.61;
    const span = Math.max(4.6 + (model.floors-1)*.65, 7.8/ratio);
    camera.left = -span*ratio;
    camera.right = span*ratio;
    camera.top = span;
    camera.bottom = -span;
    camera.position.set(Math.sin(angle)*19, 9.1+targetY, Math.cos(angle)*19);
    camera.lookAt(0,targetY,.53);
    camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
    renderer.render(scene,camera);
    if (!ready) {
      ready = true;
      stage.classList.add('kos-3d-ready');
      schedule();
    }
  }

  function schedule() {
    if (pending === undefined) pending = requestAnimationFrame(draw);
  }

  function rotate(nextAngle) {
    angle = nextAngle;
    schedule();
  }

  function start() {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden','true');
    renderer = new T.WebGLRenderer({canvas, antialias:true, powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    viewport.append(canvas);
    scene.add(world);
    new ResizeObserver(schedule).observe(viewport);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      ready = false;
      stage.classList.remove('kos-3d-ready');
    });
    canvas.addEventListener('webglcontextrestored', schedule);
    canvas.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      pointer = {id:event.pointerId, x:event.clientX, angle};
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (pointer?.id === event.pointerId) rotate(pointer.angle+(pointer.x-event.clientX)*.009);
    });
    canvas.addEventListener('lostpointercapture', () => { pointer = undefined; });
    stage.querySelectorAll('[data-orbit]').forEach(button => {
      button.addEventListener('click', () => {
        const direction = Number(button.dataset.orbit);
        rotate(direction === 0 ? defaultAngle : angle+direction*Math.PI/8);
      });
    });
  }

  let unavailable = false;
  window.updateKosScene = nextState => {
    if (unavailable) return;
    try {
      model = nextState;
      if (!renderer) start();
      rebuild(model);
      schedule();
    } catch (error) {
      unavailable = true;
      stage.classList.remove('kos-3d-ready');
      console.info('Pemandangan 2D aktif karena WebGL tidak tersedia.', error.message);
    }
  };
})();
