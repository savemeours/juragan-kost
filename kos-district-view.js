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
  const moving = new T.Group();
  const arrivals = [];
  let traffic = [];
  const doors = [];
  let trafficPhase;
  let lastFrame = 0;
  let animationClock = 0;
  let cachedFrame;
  let onScreen = true;
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const geometry = {
    box: new T.BoxGeometry(1, 1, 1),
    trunk: new T.CylinderGeometry(0.5, 0.65, 1, 8),
    leaves: new T.IcosahedronGeometry(0.5, 2),
    head: new T.SphereGeometry(.5, 10, 7),
    orb: new T.SphereGeometry(0.5, 16, 12),
  };
  const roofSlope = .36;
  const gableShape = new T.Shape();
  gableShape.moveTo(-.5,0);
  gableShape.lineTo(0,1);
  gableShape.lineTo(.5,0);
  gableShape.closePath();
  const gableGeometry = new T.ShapeGeometry(gableShape);
  const materials = new Map();
  const defaultAngle = 0.43;
  let renderer, canvas, model, pending, pointer;
  let rendererWidth, rendererHeight;
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

  function tileRoof(x,y,z,width,depth,color,closedWall) {
    const span = depth/2;
    const pitch = Math.tan(roofSlope);
    const tileColors = [color, 0x92604f, 0x9a6654, 0x895848];
    for (const side of [-1,1]) {
      box(0x634a40,x,y+span*pitch/2,z+side*span/2,width,.115,span/Math.cos(roofSlope)).rotation.x=side*roofSlope;
      const rows = Math.ceil(span/.39);
      for(let row=0;row<rows;row++) {
        const offset=(row+.5)*span/rows;
        box(tileColors[row%tileColors.length],x,y+(span-offset)*pitch+.067,z+side*offset,
          width-.035,.058,span/rows/Math.cos(roofSlope)+.022).rotation.x=side*roofSlope;
        for(let joint=-width/2+.24+row%2*.17;joint<width/2-.08;joint+=.41) {
          box(0x805344,x+joint,y+(span-offset)*pitch+.102,z+side*offset,
            .015,.011,span/rows/Math.cos(roofSlope)-.025).rotation.x=side*roofSlope;
        }
      }
      box(0x594940,x,y-.02,z+side*span,width+.02,.105,.13);
      box(0x69655a,x,y-.091,z+side*(span+.02),width-.05,.066,.15);
    }
    box(color,x,y+span*pitch+.086,z,width+.06,.145,.235);
    if(!closedWall) return;
    for(const side of [-1,1]) {
      const end=new T.Mesh(gableGeometry,materials.get(closedWall.color));
      end.scale.set(depth,span*pitch+.065,1);
      end.rotation.y=side*Math.PI/2;
      end.position.set(x+side*closedWall.width/2,y-.055,z);
      world.add(end);
    }
  }

  function neighborHouse({x,z,width,depth,height,paint,roof,porch=false,night}) {
    const front=z+depth/2;
    const glazing=night ? 0xc99e6d : 0x788b82;
    box(0x9c9582,x,.09,z,width+.18,.19,depth+.20);
    box(paint,x,height/2+.15,z,width,height,depth);
    box(0x959081,x,.25,front+.025,width,.22,.055);
    const doorX=x-width*.23;
    box(0x574c42,doorX,.91,front+.037,.67,1.53,.085);
    box(0x79624e,doorX,.90,front+.089,.53,1.36,.028);
    const winX=x+width*.21;
    box(0x5e665a,winX,1.13,front+.05,1.02,.70,.10);
    box(glazing,winX,1.13,front+.111,.89,.57,.04,night);
    box(0x5e665a,winX,1.13,front+.139,.036,.56,.032);
    box(0xa49c85,winX,.78,front+.12,1.07,.078,.22);
    tileRoof(x,height+.17,z,width+.49,depth+.48,roof,{color:paint,width});
    if(!porch) return;
    box(0xa7a091,x,.12,front+.52,width-.15,.21,1.04);
    box(0x6a6659,x,1.99,front+.40,width+.10,.12,1.03).rotation.x=.10;
    for(const dx of [-width*.40,width*.40]) box(paint,x+dx,1.04,front+.82,.15,1.85,.15);
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

  const part = (group,shape,color,x,y,z,w,h,d,glow=false) =>
    mesh(shape,color,x,y,z,w,h,d,glow,group);

  function pedestrian(shirt, skin, luggage = false, rider = false) {
    const body = new T.Group();
    const add = (shape,color,x,y,z,w,h,d) => part(body,shape,color,x,y,z,w,h,d);
    add('trunk',shirt,0,1.07,0,.37,.52,.27);
    add('head',skin,0,1.48,.01,.23,.27,.23);
    add('head',rider ? 0xddd9cd : 0x343231,0,1.55,-.014,.235,.16,.237);
    add('box',0x343e43,0,.79,0,.30,.17,.21);
    const arms = [];
    const legs = [];
    for (const side of [-1,1]) {
      const arm = new T.Group();
      arm.position.set(side*.205,1.245,0);
      part(arm,'box',shirt,0,-.095,0,.115,.22,.12);
      part(arm,'head',skin,0,-.255,0,.09,.19,.095);
      body.add(arm);
      arms.push(arm);
      const leg = new T.Group();
      leg.position.set(side*.086,.76,0);
      part(leg,'box',0x454b4f,0,-.30,0,.13,.61,.145);
      part(leg,'box',0x343633,0,-.66,.052,.148,.12,.24);
      body.add(leg);
      legs.push(leg);
    }
    if (luggage) {
      add('box',0x626e62,-.36,.247,-.20,.245,.39,.22);
      add('box',0x858578,-.36,.53,-.20,.037,.30,.037);
      add('box',0x3e4240,-.36,.68,-.20,.16,.03,.036);
      for (const side of [-1,1]) add('head',0x353935,-.36+side*.085,.056,-.20,.06,.09,.10);
      add('box',0x80634c,0,1.08,-.17,.27,.35,.14);
    }
    return {body,arms,legs};
  }

  function personPose(person, stride, scale = 1) {
    const swing = Math.sin(stride) * .52 * scale;
    person.legs[0].rotation.x = swing;
    person.legs[1].rotation.x = -swing;
    person.arms[0].rotation.x = -swing*.63;
    person.arms[1].rotation.x = swing*.63;
    person.body.position.y = Math.abs(Math.sin(stride))*.035*scale;
  }

  function vehicle(kind, color, night) {
    const group = new T.Group();
    const add = (shape,c,x,y,z,w,h,d,glow=false) => part(group,shape,c,x,y,z,w,h,d,glow);
    const car = kind === 'car';
    const length = car ? 2.85 : 1.36;
    for (const z of [-length*.34,length*.34]) {
      for (const x of car?[-.57,.57]:[0]) {
        add('trunk',0x282c2c,x,car?.24:.17,z,car?.47:.34,.13,car?.47:.34).rotation.z=Math.PI/2;
        add('trunk',0x8f938b,x+(x<0?-.067:.067),car?.24:.17,z,.24,.03,.24).rotation.z=Math.PI/2;
      }
    }
    if(car) {
      add('box',color,0,.39,0,1.14,.36,length);
      add('box',0x425457,0,.67,-.15,.95,.31,1.40);
      add('box',color,0,.84,-.20,.98,.12,.98);
      add('box',0x53676a,0,.70,.57,.91,.37,.055).rotation.x=-.47;
      for(const x of [-.40,.40]) {
        add('box',0xf9e1b6,x,.44,length*.505,.22,.105,.07,night);
        add('box',0xb94d41,x,.43,-length*.505,.23,.10,.06,night);
        add('box',0x565c57,x*1.53,.58,.46,.16,.075,.11);
      }
    } else {
      add('box',color,0,.34,-.05,.34,.27,.88);
      add('box',0x353a3a,0,.52,-.17,.30,.12,.43);
      add('box',color,0,.51,.37,.26,.32,.25).rotation.x=-.22;
      add('box',0xece1bc,0,.56,.53,.18,.10,.08,night);
      add('box',0xa04136,0,.42,-.53,.17,.055,.07,night);
      const driver = pedestrian(0x696d66,0xaa7858,false,true);
      driver.body.scale.setScalar(.74);
      driver.body.position.set(0,-.01,-.14);
      driver.legs.forEach(leg=> { leg.rotation.x=-.79; });
      driver.arms.forEach(arm=> { arm.rotation.x=-.90; });
      group.add(driver.body);
    }
    return group;
  }

  function configureTraffic() {
    trafficPhase = model.phase;
    moving.clear();
    traffic = [
      {actor:pedestrian(0x65715e,0xa87558),z:4.04,direction:1,speed:1.10,offset:13,walk:true},
      {actor:pedestrian(0x83665e,0xb98362,true),z:8.49,direction:-1,speed:1.02,offset:17,walk:true},
      {actor:pedestrian(0x7b8790,0x98674f),z:4.02,direction:-1,speed:1.19,offset:28,walk:true},
      {group:vehicle('motor',0x8c4a3e,model.phase==='malam'),z:5.68,direction:1,speed:3.34,offset:12},
      {group:vehicle('car',0x74858d,model.phase==='malam'),z:7.21,direction:-1,speed:2.80,offset:11},
      {group:vehicle('motor',0x6d7867,model.phase==='malam'),z:7.26,direction:-1,speed:3.65,offset:29},
    ];
    for(const item of traffic) {
      item.group ??= item.actor.body;
      item.group.rotation.y=item.direction*Math.PI/2;
      moving.add(item.group);
    }
    for(const arrival of arrivals) moving.add(arrival.actor.body);
  }

  function roomCoordinates(index) {
    const floor = Math.floor(index/6);
    return {x:(index%6-2.5)*1.92-.46,y:.25+floor*2.13,floor};
  }

  function arrivalPath(index) {
    const {x,y,floor}=roomCoordinates(index);
    const path = [[3.0,.17,4.04],[1.45,.17,4.04],[1.0,.17,3.40]];
    if(floor) {
      path.push([6.10,.17,3.1],[6.10,.25,2.59]);
      for(let level=0; level<floor; level++) {
        const base=.25+level*2.13;
        path.push([6.10,base,2.32],[6.10,base+1.065,-.64],[6.73,base+1.065,-.64],[6.73,base+2.13,2.32]);
      }
      path.push([6.25,y,2.54]);
    }
    path.push([x,y,2.49],[x,y,1.81]);
    return path.map(([x,y,z])=>new T.Vector3(x,y,z));
  }

  function moveActors(seconds) {
    for(const item of traffic) {
      item.group.position.x=item.direction*((item.offset+seconds*item.speed)%44-22);
      item.group.position.z=item.z;
      item.group.position.y=.058;
      if(item.walk) {
        personPose(item.actor,seconds*7+item.offset,.90);
        item.group.position.y+=.17;
      }
    }
    for(const door of doors) if(door) door.rotation.y=0;
    for(let i=arrivals.length-1;i>=0;i--) {
      const arrival=arrivals[i];
      if(model.rooms[arrival.index]?.tenant?.key!==arrival.tenantKey ||
         seconds-arrival.begins >= arrival.duration) {
        moving.remove(arrival.actor.body);
        arrivals.splice(i,1);
        continue;
      }
      const time=seconds-arrival.begins;
      const door=doors[arrival.index];
      const stepThrough=time-(arrival.duration-1.6);
      if(door && stepThrough>0) door.rotation.y=Math.sin(Math.min(1,stepThrough/1.6)*Math.PI)*1.22;
      const position=arrival.actor.body.position;
      const distance = Math.max(0,(time-.22)*1.65);
      let segment=0;
      while (segment<arrival.lengths.length-1 && arrival.lengths[segment+1]<=distance) segment++;
      const from=arrival.path[segment], to=arrival.path[segment+1] || from;
      const segmentLength=arrival.lengths[segment+1]-arrival.lengths[segment];
      const progress=segmentLength ? Math.min(1,(distance-arrival.lengths[segment])/segmentLength) : 1;
      const walking=time>.22 && segmentLength>0;
      personPose(arrival.actor, time*8, walking ? .85 : 0);
      const bounce=position.y;
      position.lerpVectors(from,to,progress);
      position.y+=bounce;
      if(walking) arrival.actor.body.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);
      if(!walking && time>.3) arrival.actor.body.rotation.y=Math.PI;
    }
  }

  const facilityViews = {
    rooftop:{x:0,z:.3,angle:.32,span:3.6,width:7.2,elevation:13},
    kolam:{x:-8.65,z:2.05,angle:-.39,span:2.65,width:3.8,elevation:15},
    parkir:{x:9.28,z:2.05,angle:.55,span:2.75,width:4.1,elevation:15},
  };
  let focusedFacility = '';
  let focusedPlot = null;

  function poolArea(night) {
    const {x,z}=facilityViews.kolam;
    // Four separate coping edges keep the pool recessed below the deck.
    for(const side of [-1,1]){
      box(0xd6c7ab,x+side*1.64,.30,z,.17,.23,3.43);
      box(0xd6c7ab,x,.30,z+side*1.63,3.18,.23,.17);
      box(0x9d9078,x+side*1.89,.139,z,.40,.24,3.83);
      box(0xa99a83,x,.139,z+side*1.87,3.40,.24,.39);
      box(0x43868a,x+side*1.55,.23,z,.045,.24,3.15);
    }
    box(night?0x3d9a9f:0x48aabb,x,.213,z,3.10,.035,3.10,night);
    for(let i=0;i<11;i++){
      const u=(i*1.29)%2.78-1.39, v=(i*.91)%2.73-1.36;
      box(night?0x66b6b4:0x7ac3c4,x+u,.235,z+v,.18+i%3*.11,.003,.025).rotation.y=i*.7;
    }
    for(const side of [-1,1]){
      box(0xced3cc,x+side*.16,.45,z+1.18,.045,.49,.05);
      box(0xced3cc,x+side*.16,.65,z+1.45,.045,.055,.47);
    }
    for(const y of [.27,.37,.47]) box(0xb4c4bd,x,y,z+1.17,.34,.033,.048);
    for(const offset of [-.51,.49]){
      const bedX=x-2.22;
      box(0x777364,bedX,.29,z+offset,.41,.12,.88);
      box(0xdec7a3,bedX,.365,z+offset,.37,.045,.83);
      box(0xdec7a3,bedX,.42,z+offset-.34,.37,.085,.24).rotation.x=.37;
    }
  }

  function parkingArea(night) {
    const {x,z}=facilityViews.parkir;
    box(0x8d8d82,x,.095,z,4.15,.17,3.57);
    box(0x949082,x,.095,z+2.03,3.39,.17,.62);
    for(let slot=0;slot<=4;slot++) box(0xded5ae,x-1.53+slot*.78,.185,z+.41,.034,.011,1.78);
    box(0xded5ae,x,.185,z-.49,3.12,.011,.045);
    for(const dx of [-1.81,1.81]){
      box(0x585e57,x+dx,.96,z-.97,.108,1.93,.108);
      box(0x585e57,x+dx,.98,z+1.21,.108,1.97,.108);
      box(0x626e68,x+dx,1.98,z+.12,.07,.09,2.48).rotation.x=.085;
    }
    // Leave the front bays visible under the shorter canopy.
    box(0x636d66,x,2.03,z-.32,3.96,.10,1.98).rotation.x=.085;
    box(0x444e49,x,1.94,z+.65,3.95,.085,.075);
    box(night?0xffe2a6:0xd8d8c7,x,1.933,z+.36,.48,.05,.11,night);
    for(const [i,color] of [[0,0x526c73],[1,0x9a5d46],[3,0x343e3d]]) scooter(x-1.14+i*.78,z+.27,color);
    for(const dx of [-1.76,1.76]){
      box(0xb2a486,x+dx,.27,z+1.58,.13,.30,.13);
      box(0xe9cc80,x+dx,.345,z+1.58,.135,.065,.135);
    }
  }

  function rooftopCafe(roof,night) {
    const y=roof+.18;
    box(0xae9b83,0,y+.025,.22,10.77,.052,4.32);
    for(let x=-5.02;x<5.3;x+=.35) box(0x887760,x,y+.053,.22,.017,.004,4.30);
    for(const x of [-5.29,5.29]) for(let z=-1.72;z<=2.07;z+=.87){
      box(0x565d53,x,y+.42,z,.063,.78,.065);
    }
    for(const x of [-5.29,5.29]) box(0x565d53,x,y+.79,.22,.065,.055,4.32);
    box(0x565d53,0,y+.79,2.34,10.64,.059,.060);
    for(let x=-5.22;x<5.3;x+=.42) box(0x565d53,x,y+.42,2.34,.038,.73,.036);
    // Rear service counter, open front seating and lightweight shade.
    const counterX=1.98;
    box(0x95735a,counterX,y+.48,-1.31,3.91,.84,.64);
    box(0xe0cdb2,counterX,y+.94,-1.30,4.11,.095,.79);
    box(0x4d5650,counterX+.99,y+1.11,-1.42,.52,.26,.35);
    for(const dx of [-.67,-.44,-.21]) mesh('trunk',0xd8c7a8,counterX+dx,y+1.02,-1.37,.12,.084,.12);
    for(const x of [.02,4.03]) for(const z of [-1.85,-.48]) box(0x545e53,x,y+.95,z,.086,1.85,.082);
    for(let i=0;i<10;i++){
      box(i%2?0x926b4a:0xa57c57,.20+i*.40,y+1.88,-1.18,.33,.105,1.74);
      if(i%3===0) mesh('orb',night?0xffdca0:0xd0bc91,.20+i*.40,y+1.70,-.58,.10,.10,.10,night);
    }
    for(const [x,z] of [[-3.68,.38],[-1.74,1.11],[.44,.78],[2.77,1.22]]){
      mesh('trunk',0x606558,x,y+.237,z,.08,.45,.08);
      mesh('trunk',0xc6a47e,x,y+.48,z,.66,.078,.66);
      for(const side of [-1,1]){
        box(0x62695c,x+side*.52,y+.16,z,.29,.31,.34);
        box(0xa78964,x+side*.52,y+.325,z,.35,.055,.38);
        box(0x62695c,x+side*.70,y+.46,z,.045,.27,.35);
      }
    }
    for(const x of [-4.73,4.71]){
      box(0x9b806b,x,y+.13,1.85,.66,.26,.54);
      mesh('leaves',0x637953,x,y+.41,1.85,.61,.44,.47);
    }
  }

  function surroundings(phase, amenities) {
    const night=phase==='malam';
    box(0x8f8d73,0,-.26,-1,180,.50,180);
    box(0x7e8565,0,.008,-.9,35,.029,15.8);
    box(0x626663,0,.035,6.54,110,.045,3.56);
    box(0x9b968b,0,.085,8.50,40,.12,.48);
    for(let i=0;i<28;i++){
      const x=(i*3.791)%39-19.5;
      const z=5.0+(i*1.127)%3.13;
      box([0x656865,0x5e6260,0x6a6d69][i%3],x,.059,z,.28+(i%5)*.17,.006,.055+(i%3)*.068).rotation.y=i*.47;
    }
    for(let x=-6.25;x<6.3;x+=.92){
      box(0x666965,x,.139,4.28,.28,.018,.16);
      for(const delta of [-.065,0,.065]) box(0x474d48,x+delta,.15,4.28,.014,.007,.143);
    }
    box(0x93908a,0,.089,4.58,40,.13,.37);
    box(0x474e4a,0,.107,4.28,40,.055,.18);
    box(0xaaa497,0,.09,3.55,11.85,.16,1.72);
    box(0x777a6a,.04,.024,-2.22,12.18,.013,.86);
    box(0x747766,6.05,.024,-.10,.64,.013,4.81);
    for(const [x,z] of [[-7.1,-.05],[7.35,-1.75],[-8.7,-5.2],[6.9,-6.0]]) {
      mesh('trunk',0x72755c,x,.027,z,1.21,.016,.87);
    }
    for(let x=-5.7; x<=5.7; x+=.57) {
      box(0x949086,x,.173,3.55,.018,.006,1.69);
    }
    for (const x of [-4.84,4.84]) {
      box(0xc2b59b,x,.40,4.31,2.24,.48,.23);
      box(0xaca18d,x,.66,4.31,2.30,.06,.28);
    }
    for (const x of [-3.66,3.66]) box(0xbab09d,x,.59,4.31,.22,.97,.24);
    for (const [x,z,h] of [[-7.1,-.05,3.5],[7.35,-1.75,3.15],[-8.7,-5.2,4.05],[6.9,-6.0,4.0],[-3.8,-8.0,4.6]]) tree(x,z,h);

    const houses=[
      {x:-8.9,z:-6.4,width:3.9,depth:3.5,height:1.91,paint:0xc3b998,roof:0xa46a55,porch:true},
      {x:.4,z:-8.0,width:4.5,depth:3.2,height:2.39,paint:0xb0b29f,roof:0x896653},
      {x:7.6,z:-7.2,width:4.0,depth:3.69,height:2.10,paint:0xc9bda7,roof:0xa56b58,porch:true},
      {x:11.5,z:-2.9,width:3.35,depth:3.83,height:2.27,paint:0xb7aa90,roof:0x9a5d4f},
    ];
    houses.forEach(house=>neighborHouse({...house,night}));
    for(const x of [-13.25,12.55]){
      box(0x91897a,x,.43,1.94,3.35,.66,.14);
      box(0xa59c85,x,.79,1.94,3.44,.08,.21);
      for(const dx of [-1.66,1.66]) box(0xa99d87,x+dx,.48,1.94,.21,.94,.25);
    }
    for (const x of [-6.4,7.9]) {
      box(0x6d6a5f,x,2.26,4.72,.12,4.52,.12);
      box(0x5f635c,x,4.45,4.61,.58,.07,.08);
      box(0x7c8178,x-.20,3.79,4.72,.45,.064,.062);
      box(night?0xffd49a:0x7b8076,x-.43,3.76,4.72,.19,.085,.14,night);
    }
    for(const z of [4.56,4.68]) box(0x474c47,.75,4.40,z,14.27,.027,.024);
    for(const [x,z,wide] of [[-12.15,-1.4,1.56],[12.7,.86,1.42],[-10.5,-.64,1.01],[7.95,-1.2,1.23]]){
      box(0xa59c86,x,.112,z,wide,.15,.49);
      box(0x746b54,x,.193,z,wide-.10,.027,.39);
      for(let i=0;i<4;i++) mesh('leaves',[0x708054,0x566d49][i%2],x+(i-1.5)*wide/4,.335,z,.31,.31,.32);
    }
    for(const [x,z] of [[-11.7,3.36],[11.95,3.48]]){
      box(0x8e8778,x,.078,z,1.13,.10,.58);
      box(0x515d51,x,.27,z,.23,.38,.23);
      box(0x647162,x,.48,z,.29,.063,.28);
    }
    for(const x of [-3.2,3.2]) {
      box(0x827a68,x,.21,3.89,.64,.21,.47);
      for(const offset of [-.15,.07,.19]) {
        mesh('leaves',0x5b744b,x+offset,.40,3.89,.27,.30,.34);
      }
    }
    for(const [x,z,c] of [[-2.9,3.27,0x526b63],[-2.43,3.24,0x946654]]) scooter(x,z,c);

    if(amenities.parkir) parkingArea(night);
    if(amenities.kolam) poolArea(night);
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
      box(facade,0,y+height/2,-.55,11.65,height,3.82);
      box(0x8f8b7e,0,y+.112,2.09,11.63,.020,.72);
      box(0x9a9587,0,y+.115,2.57,11.63,.019,.25);
      for(let seam=-5.60;seam<5.7;seam+=.48) {
        box(0x77766a,seam,y+.127,2.18,.016,.006,.94);
      }
      box(facade,0,y+1.91,1.60,11.65,.44,.23);
      box(trim,0,y+.135,1.74,11.75,.24,.13);
      box(0xa6a296,0,y+.035,2.25,11.95,.14,1.12);
      box(0x959082,0,y+height-.075,2.25,11.95,.15,1.18);
      box(0x69675a,0,y+height-.116,2.826,11.94,.045,.06);
      for(let column=0; column<6; column++) {
        const x=(column-2.5)*1.92;
        const room=rooms[floor*6+column];
        const lit=night&&Boolean(room?.tenant);
        box(0xc4baa5,x-.94,y+1.03,2.65,.16,2.03,.19);
        box(facade,x+.367,y+.89,1.595,1.19,1.78,.23);
        for(const edge of [-.35,.35]) box(0x655342,x-.46+edge,y+.895,1.692,.045,1.75,.10);
        box(0x67564b,x-.46,y+1.747,1.70,.72,.061,.10);
        box(0x393934,x-.46,y+.90,1.398,.66,1.70,.045);
        const door = new T.Group();
        door.position.set(x-.78,y+.93,1.757);
        part(door,'box',room?.lvl>0?0x756252:0x8b8170,.30,0,0,.60,1.60,.046);
        part(door,'box',0xc1a77f,.53,-.052,.03,.075,.035,.028);
        part(door,'box',0x6d5a49,.30,.52,.026,.43,.029,.020);
        part(door,'box',0x6d5a49,.30,-.52,.026,.43,.029,.020);
        doors[floor*6+column]=door;
        moving.add(door);
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
      box(facade,5.73,y+.89,1.595,.19,1.78,.23);
      box(0xc4baa5,5.77,y+1.03,2.65,.16,2.03,.19);
      for (const side of [-1,1]) for(const z of [-1.48,.46]) {
        box(0x59635b,side*5.843,y+1.32,z,.046,.59,.68);
        box(0x8ba09a,side*5.873,y+1.32,z,.035,.48,.55);
      }
    }
    for(let floor=0;floor<floors-1;floor++){
      const y=.25+floor*height;
      for(let step=0;step<9;step++){
        const rise=(step+1)*1.065/9;
        box(0xa09b89,6.10,y+rise-.059,2.26-step*.324,.63,.13,.352);
        box(0x949185,6.73,y+1.065+rise-.059,-.58+step*.324,.64,.13,.352);
      }
      box(0xa09b89,6.42,y+1.065-.065,-.72,1.28,.13,.43);
      box(0x959183,6.42,y+height-.065,2.41,1.3,.13,.55);
      for(const [x,base,zStart,zEnd] of [[5.84,y,2.26,-.66],[7.01,y+1.065,-.66,2.26]]) {
        const length=Math.hypot(zEnd-zStart,1.065);
        const pitch=-Math.atan2(1.065,zEnd-zStart);
        const inclination=zEnd>zStart ? pitch : pitch+Math.PI;
        box(0x666b5f,x,base+.55+.5325,(zStart+zEnd)/2,.055,.062,length).rotation.x=inclination;
        for(let post=0;post<=4;post++){
          const t=post/4;
          box(0x696d60,x,base+.28+t*1.065,zStart+(zEnd-zStart)*t,.038,.55,.038);
        }
        box(0x817e71,x,base+.44,(zStart+zEnd)/2,.11,.14,length).rotation.x=inclination;
      }
      box(0x666b5f,6.42,y+1.62,-.91,1.32,.055,.055);
      for(const x of [5.79,7.05]) box(0x696d60,x,y+1.34,-.91,.04,.56,.04);
    }
    const roof=.25+floors*height;
    if(level<2&&!amenities.rooftop) {
      tileRoof(0,roof+.045,.04,12.26,5.85,0xa26a56,{color:facade,width:11.64});
      for(const x of [-5.77,5.77]) {
        box(0x706c5f,x,roof/2,2.79,.076,roof,.081);
        box(0x706c5f,x,roof-.08,2.86,.078,.089,.22);
      }
    } else {
      box(0x96998a,0,roof+.085,.03,12,.19,5.53);
      for(const z of [-2.62,2.69]) box(trim,0,roof+.29,z,11.9,.40,.15);
      for(const x of [-5.9,5.9]) box(trim,x,roof+.29,.04,.15,.40,5.3);
    }
    const tankBase=level<2&&!amenities.rooftop ? roof+.54 : roof+.19;
    box(0x777b6d,4.13,tankBase-.17,-1.64,.81,.38,.79);
    mesh('trunk',0x526762,4.13,tankBase+.33,-1.64,.67,.62,.67);
    mesh('trunk',0x43534e,4.13,tankBase+.652,-1.64,.59,.045,.59);
    if(amenities.wifi) {
      box(0x777d74,-4.6,roof+.79,-2.13,.05,1.52,.05);
      for(const y of [1.21,1.40,1.56]) box(0x777d74,-4.6,roof+y,-2.13,.45,.043,.045);
    }
    if(amenities.lift) box(facade,-3.85,roof+.52,-.72,1.23,1.04,1.42);
    if(amenities.rooftop) rooftopCafe(roof,night);
  }

  function districtLot(plot,type,connected,night) {
    const {x,z}=plot;
    box(connected?0x899676:0x818578,x,.054,z,5.9,.08,4.08);
    if(connected) box(0xb2a690,x,.107,z+1.73,.86,.037,1.11);
    if(!type) {
      for(const dx of [-2.72,2.72]) for(const dz of [-1.87,1.87]){
        box(0xb6a688,x+dx,.225,z+dz,.095,.34,.095);
      }
      return;
    }
    if(type==='taman') {
      box(0xb5a58c,x,.105,z,4.89,.025,.74);
      box(0xb5a58c,x,.106,z,.79,.026,3.83);
      for(const delta of [-1.67,1.67]){
        tree(x+delta,z-.96,2.17);
        box(0x665c4c,x+delta,.26,z+.86,.92,.12,.33);
        for(const end of [-.32,.32]) box(0x626759,x+delta+end,.15,z+.86,.09,.24,.23);
        box(0x817057,x+delta,.44,z+1.01,.92,.23,.068);
      }
      box(0x575e52,x,.76,z-.85,.055,1.44,.055);
      mesh('orb',night?0xffd99c:0xd8cfb7,x,1.49,z-.85,.18,.18,.18,night);
      return;
    }
    const hall=type==='komunitas';
    const width=hall?4.20:3.26;
    const wall=hall?0xc5bea5:0xb7b196;
    const front=z+.84;
    box(0x9e9581,x,.12,z,width+.35,.23,2.05);
    box(wall,x,.97,z,width,1.74,1.65);
    tileRoof(x,1.84,z,width+.42,2.05,hall?0xa16c58:0x866a58,{color:wall,width});
    if(hall){
      for(const dx of [-1.35,1.35]){
        box(0x595e51,x+dx,1.0,front,.73,.69,.07);
        box(night?0xe5ba7c:0x78918b,x+dx,1.0,front+.051,.65,.60,.04,night);
      }
      box(0x776456,x,.90,front,.74,1.41,.086);
      box(0x798073,x,1.71,front+.018,2.58,.12,.062);
    }else{
      box(0x5f6c58,x,1.04,front,.99,.66,.074);
      box(night?0xe4c082:0x7d9283,x,1.05,front+.048,.86,.57,.038,night);
      box(0xb08565,x,.73,front+.16,1.77,.19,.35);
      for(const dx of [-1.22,1.22]) box(0x686e5a,x+dx,.90,front+.64,.067,1.51,.07);
      for(let stripe=0;stripe<7;stripe++){
        box(stripe%2?0xd0b88d:0x8a6c54,x-1.08+.36*stripe,1.67,front+.34,.355,.064,.82).rotation.x=.21;
      }
    }
  }

  function buildDistrict({district,districtPlots,phase}){
    if(!district || !districtPlots) return;
    const night=phase==='malam';
    for(const [road,z,x] of [['north',-14.25,14.0],['south',14.55,-13.0]]){
      if(!district.roads[road]) continue;
      box(0x666962,0,.071,z,29,.079,1.20);
      const linkLength=Math.abs(z-6.55);
      box(0x666962,x,.072,(z+6.55)/2,1.25,.081,linkLength);
      for(const edge of [-.67,.67]) box(0x9c9988,0,.107,z+edge,27,.049,.14);
    }
    districtPlots.forEach((plot,i)=>{
      const first=world.children.length;
      districtLot(plot,district.plots[i],!!district.roads[plot.road],night);
      if(plot.road!=='north') return;
      const facingRoad=new T.Group();
      facingRoad.position.set(plot.x,0,plot.z);
      facingRoad.rotation.y=Math.PI;
      for(const object of world.children.slice(first)){
        object.position.x-=plot.x;
        object.position.z-=plot.z;
        facingRoad.add(object);
      }
      world.add(facingRoad);
    });
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
    for(const door of doors) if(door) moving.remove(door);
    doors.length=0;
    if(trafficPhase!==state.phase) configureTraffic();
    surroundings(state.phase, state.amenities);
    building(state);
    buildDistrict(state);
    if (state.phase === 'malam') mesh('orb', 0xfff0cb, -8, 7.2, -9, 1.15,1.15,1.15,true);
  }

  function blankFrame(target,background) {
    const context = target.getContext('2d');
    const {width,height} = target;
    const image = context.createImageData(width,height);
    const pixels = image.data;
    const depth = new Float32Array(width*height).fill(Infinity);
    const sky = background.getHex(T.SRGBColorSpace);
    const skyR = sky >> 16, skyG = sky >> 8 & 255, skyB = sky & 255;
    for(let i=0;i<pixels.length;i+=4) {
      pixels[i]=skyR;
      pixels[i+1]=skyG;
      pixels[i+2]=skyB;
      pixels[i+3]=255;
    }
    return {context,image,depth,width,height};
  }

  // Keep the static color and depth buffers so animation only redraws moving meshes.
  function renderMeshes(frame, group, view, background, light = 1) {
    const {width,height,depth,image:{data:pixels}} = frame;
    group.updateMatrixWorld(true);
    view.updateMatrixWorld(true);
    const normal = new T.Vector3();
    const sun = new T.Vector3(-.5, .85, .6).normalize();
    const color = new T.Color();
    const surfacesBelongToWorld = group === world || group === moving;
    const tint = new T.Color(0xffffff);
    if (surfacesBelongToWorld) tint.lerp(sunLight.color, light < .7 ? .48 : .24);
    group.traverse(object => {
      if(!object.isMesh) return;
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

  function setView(view, angle, ratio, floors, focus='', plot=null) {
    const detail=plot ? {...plot,span:3.2,width:4.3,elevation:15} : facilityViews[focus];
    const enabled=Boolean(model.amenities.parkir || model.amenities.kolam);
    const rooftop=Boolean(model.amenities.rooftop);
    const targetX=detail?.x ?? 0;
    const targetZ=detail?.z ?? (enabled ? 1.4 : .53);
    const targetY=focus==='rooftop' ? .25+floors*2.13+.66 : detail ? .45 : 1.35+(floors-1)*.83;
    const span=detail
      ? Math.max(detail.span,detail.width/ratio)
      : Math.max(4.65+(floors-1)*.83, (enabled ? 11.7 : 8.35)/ratio, rooftop ? 5.25 : 0);
    view.left=-span*ratio;
    view.right=span*ratio;
    view.top=span;
    view.bottom=-span;
    const elevation=detail?.elevation ?? (rooftop ? 10.5 : 6.1);
    view.position.set(targetX+Math.sin(angle)*19,targetY+elevation,targetZ+Math.cos(angle)*19);
    view.lookAt(targetX,targetY,targetZ);
    view.updateProjectionMatrix();
  }

  function draw(now) {
    pending = undefined;
    if (!model) return;
    const light = model.phase === 'malam' ? .56 : model.phase === 'sore' ? .92 : 1;
    if (backdropDirty) {
      moveActors(animationClock);
      setView(camera, defaultAngle, backdrop.width/backdrop.height, model.floors);
      const frame=blankFrame(backdrop,scene.background);
      renderMeshes(frame,world,camera,scene.background,light);
      renderMeshes(frame,moving,camera,scene.background,light);
      frame.context.putImageData(frame.image,0,0);
      document.body.style.setProperty('--kos-backdrop', 'url("' + backdrop.toDataURL() + '")');
      backdropDirty = false;
    }
    const {clientWidth:width, clientHeight:height} = viewport;
    if (!width || !height || !onScreen || document.hidden) {
      lastFrame=0;
      return;
    }
    const animate=!motionPreference.matches;
    const elapsed=lastFrame ? now-lastFrame : 0;
    if(animate && elapsed && elapsed < (renderer ? 30 : 41)) {
      schedule();
      return;
    }
    if(animate) animationClock+=Math.min(elapsed||0,100)/1000;
    lastFrame=now;
    moveActors(animationClock);
    setView(camera, angle, width/height, model.floors,focusedFacility,focusedPlot);
    if (renderer && !renderer.getContext().isContextLost()) {
      if(canvas.clientWidth!==rendererWidth || canvas.clientHeight!==rendererHeight) {
        rendererWidth=canvas.clientWidth;
        rendererHeight=canvas.clientHeight;
        renderer.setSize(width,height,false);
      }
      renderer.render(scene,camera);
    } else {
      const ratio = Math.min(devicePixelRatio || 1, 1.16, 850/width);
      const newWidth=Math.max(1,Math.round(width*ratio)), newHeight=Math.max(1,Math.round(height*ratio));
      if(canvas.width!==newWidth || canvas.height!==newHeight) {
        canvas.width=newWidth;
        canvas.height=newHeight;
        cachedFrame=undefined;
      }
      if(!cachedFrame || cachedFrame.angle!==angle) {
        const base=blankFrame(canvas,scene.background);
        renderMeshes(base,world,camera,scene.background,light);
        cachedFrame={base, angle, work:blankFrame(canvas,scene.background)};
      }
      const {base,work}=cachedFrame;
      work.image.data.set(base.image.data);
      work.depth.set(base.depth);
      renderMeshes(work,moving,camera,scene.background,light);
      work.context.putImageData(work.image,0,0);
    }
    if(animate) schedule();
  }

  function schedule() {
    if (pending === undefined) pending = requestAnimationFrame(draw);
  }

  function rotate(nextAngle) {
    angle = nextAngle;
    lastFrame=0;
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
        cachedFrame=undefined;
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
    scene.add(world,moving);
    new ResizeObserver(schedule).observe(viewport);
    new IntersectionObserver(([entry])=> {
      onScreen=entry.isIntersecting;
      lastFrame=0;
      if(onScreen) schedule();
    }).observe(viewport);
    document.addEventListener('visibilitychange',()=> {
      lastFrame=0;
      if(!document.hidden) schedule();
    });
    motionPreference.addEventListener('change',()=> {
      lastFrame=0;
      if(motionPreference.matches) {
        arrivals.splice(0).forEach(arrival=>moving.remove(arrival.actor.body));
        doors.forEach(door=> {door.rotation.y=0;});
      }
      schedule();
    });
    bindControls();
    stage.querySelectorAll('[data-facility-view]').forEach(button=>{
      button.addEventListener('click',()=>{
        const focus=button.dataset.facilityView;
        const next=focusedFacility===focus ? '' : focus;
        setFacilityFocus(next);
        rotate(facilityViews[next]?.angle ?? defaultAngle);
      });
    });
    stage.querySelectorAll('[data-orbit]').forEach(button => {
      button.addEventListener('click', () => {
        const direction = Number(button.dataset.orbit);
        if(direction===0) setFacilityFocus('');
        rotate(direction === 0 ? defaultAngle : angle+direction*Math.PI/8);
      });
    });
  }

  function setFacilityFocus(focus) {
    focusedFacility=focus;
    focusedPlot=null;
    cachedFrame=undefined;
    stage.querySelectorAll('[data-facility-view]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.facilityView===focus));
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
  const tenantColors = {mhs:0x627f85,kar:0x8b6b56,band:0x573f4e,ojol:0x647e5c,kantor:0x596575};
  window.kosRoomImage = (level, tenant) => {
    const key = level + ':' + (tenant || '');
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
      brick(0x8c765b,-1.57,.92,-1.04,.61,1.76,.74);
      brick(0xb69c78,-1.57,1.19,-.657,.055,.17,.031);
      brick(0xa98a63,-.55,.67,-1.07,.94,.081,.53);
      for(const x of [-.96,-.17]) brick(0x797769,x,.32,-1.07,.065,.65,.45);
      if(tenant) {
        const resident=pedestrian(tenantColors[tenant]??0x737763,0xb18161,true);
        resident.body.scale.setScalar(.87);
        resident.body.position.set(-.58,0,.46);
        resident.body.rotation.y=.35;
        room.add(resident.body);
        brick(0x353e44,-.50,.744,-1.11,.37,.10,.24);
      }
    }
    const image = document.createElement('canvas');
    image.width = 180;
    image.height = 120;
    const view = new T.OrthographicCamera(-3.3,3.3,2.2,-2.2,.1,20);
    view.position.set(5,4,7);
    view.lookAt(0,.67,0);
    const background=new T.Color(0xe8dfcc);
    const frame=blankFrame(image,background);
    renderMeshes(frame,room,view,background);
    frame.context.putImageData(frame.image,0,0);
    const url = image.toDataURL();
    roomImages.set(key,url);
    return url;
  };

  window.kosTenantArrival = (index, tenantKey) => {
    if(!model || motionPreference.matches || !viewport.clientWidth) return;
    const path=arrivalPath(index);
    const lengths=[0];
    for(let i=1;i<path.length;i++) lengths.push(lengths[i-1]+path[i-1].distanceTo(path[i]));
    const actor=pedestrian(tenantColors[tenantKey]??0x737763,0xb18161,true);
    actor.body.position.copy(path[0]);
    moving.add(actor.body);
    arrivals.push({index,tenantKey,actor,path,lengths,begins:animationClock,duration:lengths.at(-1)/1.65+.92});
    schedule();
  };

  window.kosFocusDistrict = index=>{
    const plot=model?.districtPlots?.[index];
    if(!plot) return;
    setFacilityFocus('');
    focusedPlot=plot;
    rotate(plot.road==='north' ? Math.PI-.35 : .35);
  };

  window.updateKosScene = nextState => {
    model = nextState;
    if (!canvas) start();
    if(focusedFacility && !model.amenities[focusedFacility]) {
      setFacilityFocus('');
      angle=defaultAngle;
    }
    stage.querySelectorAll('[data-facility-view]').forEach(button=>{
      button.hidden=!model.amenities[button.dataset.facilityView];
    });
    rebuild(model);
    cachedFrame=undefined;
    lastFrame=0;
    backdropDirty = true;
    schedule();
  };
})();
