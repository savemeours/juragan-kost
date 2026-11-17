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
  const gable = new T.Shape();
  gable.moveTo(-2.75,0);
  gable.lineTo(0,1.11);
  gable.lineTo(2.75,0);
  gable.closePath();
  const gableGeometry = new T.ShapeGeometry(gable);
  const materials = new Map();
  const defaultAngle = 0.39;
  let renderer, canvas, model, pending, pointer;
  let backdropDirty = true;
  const backdrop = document.createElement('canvas');
  backdrop.width = 780;
  backdrop.height = 440;
  let angle = defaultAngle;

  function mesh(shape, color, x, y, z, w, h, d, glow = false, group = world) {
    const key = glow ? 'lit-' + color : color;
    if (!materials.has(key)) {
      const attributes = { color, roughness: .86 };
      if (glow) Object.assign(attributes, { emissive:color, emissiveIntensity:.55 });
      materials.set(key, new T.MeshStandardMaterial(attributes));
    }
    const object = new T.Mesh(geometry[shape], materials.get(key));
    object.position.set(x, y, z);
    object.scale.set(w, h, d);
    group.add(object);
    return object;
  }
  const box = (...args) => mesh('box', ...args);

  function tree(x, z, height) {
    mesh('trunk',0x665144,x,height*.33,z,.21,height*.66,.21);
    for (const [ox,oy,oz,w,c] of [[0,.74,0,.61,0x426747],[-.17,.78,.1,.47,0x52764c],[.19,.86,-.06,.46,0x6b8657],[0,.97,-.12,.38,0x748d55]]) {
      mesh('leaves',c,x+ox*height,oy*height,z+oz*height,w*height,.4*height,w*height);
    }
  }

  function tileRoof(x, y, z, width, depth, color, detailed = false) {
    const slope = .38;
    const span = depth/2;
    for (const side of [-1,1]) {
      box(color,x,y+span*Math.tan(slope)/2,z+side*span/2,width,.13,span/Math.cos(slope)).rotation.x=side*slope;
      const spacing = detailed ? .39 : .65;
      for (let dx=-width/2+.17; dx<width/2; dx+=spacing) {
        box(0x8d5849,x+dx,y+span*Math.tan(slope)/2+.072,z+side*span/2,.034,.028,span/Math.cos(slope)).rotation.x=side*slope;
      }
      box(0x594840,x,y,z+side*span,width+.04,.10,.09);
    }
    box(color,x,y+span*Math.tan(slope)+.075,z,width+.12,.16,.21);
  }

  function scooter(x,z,color) {
    for (const dz of [-.32,.31]) {
      mesh('trunk',0x333634,x,.14,z+dz,.28,.10,.28).rotation.z=Math.PI/2;
    }
    box(color,x,.25,z,.27,.20,.68);
    box(0x373a38,x,.38,z-.16,.24,.075,.36);
    box(color,x,.42,z+.24,.15,.36,.16).rotation.x=-.19;
    box(0x484a47,x,.61,z+.23,.37,.035,.04);
    box(0xdfdac2,x,.53,z+.31,.13,.10,.045);
  }

  function surroundings(phase, amenities) {
    const night=phase==='malam';
    box(0x8f8d73,0,-.26,-1,180,.50,180);
    box(0x7e8565,0,.008,-.9,35,.029,15.8);
    box(0x626663,0,.035,6.54,110,.045,3.56);
    box(0x93908a,0,.089,4.58,40,.13,.37);
    box(0x474e4a,0,.107,4.28,40,.055,.18);
    box(0xaaa497,0,.09,3.55,11.85,.16,1.72);
    for(let x=-5.7; x<=5.7; x+=.57) {
      box(0x949086,x,.173,3.55,.018,.006,1.69);
    }
    for (const x of [-4.84,4.84]) {
      box(0xc2b59b,x,.40,4.31,2.24,.48,.23);
      box(0xaca18d,x,.66,4.31,2.30,.06,.28);
    }
    for (const x of [-3.66,3.66]) box(0xbab09d,x,.59,4.31,.22,.97,.24);
    for (const [x,z,h] of [[-7.1,-.05,3.5],[7.35,-1.75,3.15],[-8.7,-5.2,4.05],[6.9,-6.0,4.0],[-3.8,-8.0,4.6]]) tree(x,z,h);

    for (const [x,z,w,c] of [[-8.9,-6.7,3.8,0xc9b9a4],[.4,-8.0,3.7,0xbfb8a5],[7.3,-7.2,4.1,0xc7c1a9],[11.3,-3.8,3.3,0xc0b498]]) {
      box(c,x,1.04,z,w,2.08,3.1);
      box(0x676959,x,1.17,z+1.57,.65,1.06,.055);
      tileRoof(x,2.11,z,w+.30,3.42,0x875849);
    }
    for (const x of [-6.4,7.9]) {
      box(0x6d6a5f,x,2.26,4.72,.12,4.52,.12);
      box(0x5f635c,x,4.45,4.61,.58,.07,.08);
      box(0x7c8178,x-.20,3.79,4.72,.45,.064,.062);
      box(night?0xffd49a:0x7b8076,x-.43,3.76,4.72,.19,.085,.14,night);
    }
    for(const z of [4.56,4.68]) box(0x474c47,.75,4.40,z,14.27,.027,.024);
    for(const x of [-3.2,3.2]) {
      box(0x827a68,x,.21,3.89,.64,.21,.47);
      for(const offset of [-.15,.07,.19]) {
        mesh('leaves',0x5b744b,x+offset,.40,3.89,.27,.30,.34);
      }
    }
    for(const [x,z,c] of [[-2.9,3.27,0x526b63],[-2.43,3.24,0x946654]]) scooter(x,z,c);

    if (amenities.parkir) {
      box(0x82857a,4.65,.185,3.33,2.62,.041,1.54);
      scooter(4.22,3.26,0x657e86);
      scooter(4.93,3.25,0x9b8375);
    }
    if (amenities.kolam) {
      box(0xbeb9a7,-5.8,.15,2.8,2.24,.15,1.68);
      box(0x599eaa,-5.8,.23,2.8,1.92,.05,1.39);
    }
    if (amenities.keamanan) {
      box(0xd1c4ad,5.91,.77,3.82,.97,1.44,.73);
      box(0x5e7776,5.91,.96,4.20,.57,.37,.055);
      box(0x66675c,5.91,1.51,3.82,1.11,.13,.90);
    }
  }

  function building({floors, rooms, level, amenities, phase}) {
    const facades=[0xd7c7ab,0xdad4bf,0xcbd1c8];
    const trims=[0x827567,0x788579,0x677570];
    const facade=facades[level]??facades[0];
    const trim=trims[level]??trims[0];
    const night=phase==='malam';
    const height=2.13;
    box(0xa49c8c,0,.14,0,12.1,.26,5.15);
    for(let floor=0; floor<floors; floor++) {
      const y=.25+floor*height;
      box(facade,0,y+height/2,-.38,11.65,height,4.16);
      box(trim,0,y+.135,1.74,11.75,.24,.13);
      box(0xa6a296,0,y+.035,2.25,11.95,.14,1.12);
      box(0x9b9585,0,y+height-.075,2.25,11.95,.15,1.18);
      for(let column=0; column<6; column++) {
        const x=(column-2.5)*1.92;
        const room=rooms[floor*6+column];
        const lit=night&&Boolean(room?.tenant);
        box(0xc4baa5,x-.94,y+1.03,2.65,.16,2.03,.19);
        box(0x4c4e43,x-.46,y+.96,1.733,.74,1.74,.12);
        box(room?.lvl>0?0x756252:0x8b8170,x-.46,y+.96,1.806,.62,1.60,.043);
        box(0xc1a77f,x-.25,y+.89,1.84,.075,.035,.028);
        box(0x4f5651,x+.43,y+1.14,1.75,.84,.90,.115);
        box(lit?0xedba75:0x789291,x+.43,y+1.14,1.819,.75,.80,.043,lit);
        for(const delta of [-.20,.20]) box(0x686b5e,x+.43+delta,y+1.14,1.849,.027,.79,.027);
        box(0x706e60,x+.43,y+1.12,1.85,.75,.033,.028);
        box(0xc8beab,x+.43,y+.67,1.84,.92,.095,.2);
        box(night?0xffcb86:0xcec4ad,x-.46,y+1.91,1.79,.21,.11,.081,night);
        if(floor>0) {
          box(0x626956,x,y+.92,2.76,1.89,.051,.055);
          for(const delta of [-.77,-.39,0,.39,.77]) box(0x626956,x+delta,y+.50,2.76,.035,.82,.035);
        }
        if(amenities.ac && room?.lvl>0) {
          box(0xd0cec0,x+.53,y+1.84,1.86,.36,.20,.16);
          box(0x87938a,x+.53,y+1.84,1.949,.24,.116,.017);
        }
      }
      box(0xc4baa5,5.77,y+1.03,2.65,.16,2.03,.19);
      for (const side of [-1,1]) for(const z of [-1.48,.46]) {
        box(0x59635b,side*5.843,y+1.32,z,.046,.59,.68);
        box(0x8ba09a,side*5.873,y+1.32,z,.035,.48,.55);
      }
    }
    const roof=.25+floors*height;
    if(level<2&&!amenities.rooftop) {
      tileRoof(0,roof+.03,.04,12.26,5.85,0x9d604f,true);
      const material=materials.get(facade);
      for(const side of [-1,1]) {
        const end=new T.Mesh(gableGeometry,material);
        end.rotation.y=side*Math.PI/2;
        end.position.set(side*5.77,roof,.04);
        world.add(end);
      }
    } else {
      box(0x96998a,0,roof+.085,.03,12,.19,5.53);
      for(const z of [-2.62,2.69]) box(trim,0,roof+.29,z,11.9,.40,.15);
      for(const x of [-5.9,5.9]) box(trim,x,roof+.29,.04,.15,.40,5.3);
    }
    box(0x4e5a57,3.85,roof+.38,-2.82,.42,.55,.44);
    mesh('trunk',0x5b7773,3.85,roof+.70,-2.82,.78,.62,.78);
    if(amenities.wifi) {
      box(0x777d74,-4.6,roof+.79,-2.13,.05,1.52,.05);
      for(const y of [1.21,1.40,1.56]) box(0x777d74,-4.6,roof+y,-2.13,.45,.043,.045);
    }
    if(amenities.lift) box(facade,-3.85,roof+.52,-.72,1.23,1.04,1.42);
    if(amenities.rooftop) {
      box(0xa77657,.9,roof+1.25,.16,2.65,.15,1.88);
      for(const x of [-.3,2.1]) for(const z of [-.65,.98]) box(0x6f6653,x,roof+.66,z,.08,1.23,.08);
      box(0xb49a7b,.9,roof+.51,.2,1.58,.18,.82);
    }
  }

  function rebuild(state) {
    const palettes = {
      pagi:[0xc2d1cc, 0xffe4c3, 1.66, 2.0],
      siang:[0xbbd0ce, 0xfff0dc, 1.84, 2.05],
      sore:[0xd9b9a8, 0xffc085, 1.45, 2.1],
      malam:[0x233645, 0x9ab7f3, .84, .74],
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

  // Project the same Three.js geometry with Canvas when WebGL is unavailable.
  function renderOnCanvas(target, group, view, background, light = 1) {
    const ctx = target.getContext('2d');
    if (!ctx) return;
    const {width, height} = target;
    const image = ctx.createImageData(width,height);
    const pixels = image.data;
    const depth = new Float32Array(width*height).fill(Infinity);
    const sky = background.getHex(T.SRGBColorSpace);
    const skyR = sky >> 16, skyG = sky >> 8 & 255, skyB = sky & 255;
    for (let i=0; i<pixels.length; i+=4) {
      pixels[i]=skyR;
      pixels[i+1]=skyG;
      pixels[i+2]=skyB;
      pixels[i+3]=255;
    }
    group.updateMatrixWorld(true);
    view.updateMatrixWorld(true);
    const normal = new T.Vector3();
    const sun = new T.Vector3(-.5, .85, .6).normalize();
    const color = new T.Color();
    const surfacesBelongToWorld = group === world;
    const tint = new T.Color(0xffffff);
    if (surfacesBelongToWorld) tint.lerp(sunLight.color, light < .7 ? .48 : .24);
    group.children.forEach(object => {
      const {position, normal:normals} = object.geometry.attributes;
      const index = object.geometry.index;
      const normalMatrix = new T.Matrix3().getNormalMatrix(object.matrixWorld);
      const projected = [];
      for (let i = 0; i < position.count; i++) {
        projected.push(new T.Vector3().fromBufferAttribute(position,i).applyMatrix4(object.matrixWorld).project(view));
      }
      const size = index ? index.count : position.count;
      for (let i = 0; i < size; i += 3) {
        const a = index ? index.getX(i) : i;
        const b = index ? index.getX(i+1) : i+1;
        const c = index ? index.getX(i+2) : i+2;
        const points = [projected[a],projected[b],projected[c]];
        const [u,v,w] = points;
        if ((v.x-u.x)*(w.y-u.y)-(v.y-u.y)*(w.x-u.x) <= 0) continue;
        normal.fromBufferAttribute(normals,a).applyNormalMatrix(normalMatrix);
        const shade = (.58 + .42*Math.max(0,normal.dot(sun))) * light;
        color.copy(object.material.color).multiply(tint).multiplyScalar(shade);
        if (object.material.emissiveIntensity && object.material.emissive.getHex()) {
          color.lerp(object.material.emissive,.35);
        }
        const fog = surfacesBelongToWorld ? Math.max(0,Math.min(.76,((u.z+v.z+w.z)/3+.45)*1.1)) : 0;
        color.lerp(background,fog);
        const rgb=color.getHex(T.SRGBColorSpace);
        rasterize(points,rgb,width,height,pixels,depth);
      }
    });
    ctx.putImageData(image,0,0);
  }

  function rasterize(points, color, width, height, pixels, depth) {
    const [a,b,c] = points.map(({x,y,z})=>({x:(x+1)*width/2,y:(1-y)*height/2,z}));
    const minX=Math.max(0,Math.ceil(Math.min(a.x,b.x,c.x)-.5));
    const maxX=Math.min(width-1,Math.floor(Math.max(a.x,b.x,c.x)-.5));
    const minY=Math.max(0,Math.ceil(Math.min(a.y,b.y,c.y)-.5));
    const maxY=Math.min(height-1,Math.floor(Math.max(a.y,b.y,c.y)-.5));
    const denom=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
    if (!denom || minX>maxX || minY>maxY) return;
    const red=color>>16, green=color>>8&255, blue=color&255;
    const advanceU=(b.y-c.y)/denom, advanceV=(c.y-a.y)/denom;
    for(let y=minY;y<=maxY;y++) {
      let u=(minX+.5-c.x)*advanceU+(c.x-b.x)*(y+.5-c.y)/denom;
      let v=(minX+.5-c.x)*advanceV+(a.x-c.x)*(y+.5-c.y)/denom;
      for(let x=minX;x<=maxX;x++,u+=advanceU,v+=advanceV) {
        const w=1-u-v;
        if (u<-.00001 || v<-.00001 || w<-.00001) continue;
        const z=u*a.z+v*b.z+w*c.z;
        const index=y*width+x;
        if (z>=depth[index] || z < -1 || z > 1) continue;
        depth[index]=z;
        const pixel=index*4;
        pixels[pixel]=red;
        pixels[pixel+1]=green;
        pixels[pixel+2]=blue;
      }
    }
  }

  function setView(view, angle, ratio, floors) {
    const targetY = 1 + (floors-1)*.61;
    const span = Math.max(4.6 + (floors-1)*.74, 8.25/ratio);
    view.left = -span*ratio;
    view.right = span*ratio;
    view.top = span;
    view.bottom = -span;
    view.position.set(Math.sin(angle)*19, 5.9+targetY, Math.cos(angle)*19);
    view.lookAt(0,targetY+.45,.53);
    view.updateProjectionMatrix();
  }

  function draw() {
    pending = undefined;
    if (!model) return;
    const light = model.phase === 'malam' ? .56 : model.phase === 'sore' ? .92 : 1;
    if (backdropDirty) {
      setView(camera, defaultAngle, backdrop.width/backdrop.height, model.floors);
      renderOnCanvas(backdrop, world, camera, scene.background, light);
      document.body.style.setProperty('--kos-backdrop', 'url("' + backdrop.toDataURL() + '")');
      backdropDirty = false;
    }
    const {clientWidth:width, clientHeight:height} = viewport;
    if (!width || !height) return;
    setView(camera, angle, width/height, model.floors);
    if (renderer && !renderer.getContext().isContextLost()) {
      renderer.setSize(width,height,false);
      renderer.render(scene,camera);
    } else {
      const ratio = Math.min(devicePixelRatio || 1, 1.25, 920/width);
      if (canvas.width !== Math.round(width*ratio)) canvas.width = Math.round(width*ratio);
      if (canvas.height !== Math.round(height*ratio)) canvas.height = Math.round(height*ratio);
      renderOnCanvas(canvas, world, camera, scene.background, light);
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
    canvas = document.createElement('canvas');
    try {
      const context = canvas.getContext('webgl2', {antialias:true,powerPreference:'low-power'})
        || canvas.getContext('webgl', {antialias:true,powerPreference:'low-power'});
      if (context) renderer = new T.WebGLRenderer({canvas, context});
    } catch (error) {
      console.info('Render melalui CPU.', error.message);
    }
    if (renderer) {
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        const replacement = canvas.cloneNode();
        canvas.replaceWith(replacement);
        renderer.dispose();
        renderer = undefined;
        canvas = replacement;
        bindControls();
        schedule();
      }, {once:true});
    } else {
      canvas = document.createElement('canvas');
    }
    canvas.setAttribute('aria-hidden','true');
    viewport.append(canvas);
    stage.classList.add('kos-3d-ready');
    scene.add(world);
    new ResizeObserver(schedule).observe(viewport);
    bindControls();
    stage.querySelectorAll('[data-orbit]').forEach(button => {
      button.addEventListener('click', () => {
        const direction = Number(button.dataset.orbit);
        rotate(direction === 0 ? defaultAngle : angle+direction*Math.PI/8);
      });
    });
  }

  function bindControls() {
    canvas.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      pointer = {id:event.pointerId, x:event.clientX, angle};
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (pointer?.id === event.pointerId) rotate(pointer.angle+(pointer.x-event.clientX)*.009);
    });
    canvas.addEventListener('lostpointercapture', () => { pointer = undefined; });
  }

  const roomImages = new Map();
  window.kosRoomImage = (level, occupied) => {
    const key = level + ':' + occupied;
    if (roomImages.has(key)) return roomImages.get(key);
    const room = new T.Group();
    const brick = (color,x,y,z,w,h,d) => mesh('box',color,x,y,z,w,h,d,false,room);
    brick(0xcab08a,0,-.08,0,4.3,.16,3.3);
    brick(0xe8d3ae,0,1,-1.6,4.3,2,.13);
    brick(0xd9c2a8,-2.1,1,0,.13,2,3.3);
    brick(0x648b99,.8,1.3,-1.51,1.28,.85,.13);
    if (level > 0) {
      brick(0x865646,.81,.19,.22,1.45,.39,2.14);
      brick(level > 2 ? 0x438c86 : 0x7d9eaf,.81,.45,.22,1.43,.15,2.03);
      brick(0xf7ecda,.81,.57,-.52,1.09,.13,.44);
      brick(0xc19061,-1.39,.42,-.81,.85,.83,.59);
      brick(0xe4a660,-1.4,.94,-.81,.38,.22,.29);
      if (occupied) {
        brick(0x527997,-.68,.44,.55,.43,.60,.31);
        mesh('orb',0xb88057,-.68,.91,.55,.39,.40,.39,false,room);
        brick(0x4b626a,-.68,.13,.55,.31,.27,.28);
      }
    }
    const image = document.createElement('canvas');
    image.width = 180;
    image.height = 120;
    const view = new T.OrthographicCamera(-3.3,3.3,2.2,-2.2,.1,20);
    view.position.set(5,4,7);
    view.lookAt(0,.67,0);
    renderOnCanvas(image,room,view,new T.Color(0xe8dfcc));
    const url = image.toDataURL();
    roomImages.set(key,url);
    return url;
  };

  window.updateKosScene = nextState => {
    model = nextState;
    if (!canvas) start();
    rebuild(model);
    backdropDirty = true;
    schedule();
  };
})();
