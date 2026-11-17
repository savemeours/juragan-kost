(() => {
  'use strict';
  const T=window.THREE;
  const $=id=>document.getElementById(id);
  if(!T){$('objective').textContent='Mesin 3D gagal dimuat. Coba muat ulang.';return;}
  const root=$('world'), signs=$('markers');
  const key='juragan-kos-build-1';
  const positions=[-7.5,-2.5,2.5,7.5];
  const costs=[850000,1400000,2900000];
  const slots=[0,1,2,3];
  const rentRates=[0,19000,42000,78000];
  const facilityCost=1200000;
  const initial=()=>({cash:2500000,rent:0,rooms:positions.map(()=>({level:0,tenants:0,progress:0})),wifi:false,at:Date.now()});
  function read(){
    const data=initial();
    try{
      const old=JSON.parse(localStorage.getItem(key));
      if(!old || !Array.isArray(old.rooms) || old.rooms.length!==4)return data;
      for(const field of ['cash','rent','at'])if(Number.isFinite(old[field]))data[field]=Math.max(0,old[field]);
      data.rooms=old.rooms.map(room=>{
        const level=Math.max(0,Math.min(3,Math.floor(Number(room?.level)||0)));
        return {level,tenants:Math.min(slots[level],Math.max(0,Math.floor(Number(room?.tenants)||0))),progress:Math.max(0,Math.min(18,Number(room?.progress)||0))};
      });
      data.wifi=old.wifi===true;
    }catch{}
    return data;
  }
  const state=read();
  function advance(seconds){
    let changed=false;
    for(const room of state.rooms){
      if(!room.level)continue;
      let time=seconds;
      while(room.tenants<slots[room.level] && time>0){
        const wait=Math.max(0,(state.wifi?12:18)-room.progress);
        const step=Math.min(wait,time);
        state.rent+=step*room.tenants*rentRates[room.level];
        room.progress+=step;
        time-=step;
        if(step===wait){room.tenants++;room.progress=0;changed=true;}
        else break;
      }
      state.rent+=time*room.tenants*rentRates[room.level];
    }
    return changed;
  }
  const offline=Math.min(1800,Math.max(0,(Date.now()-state.at)/1000));
  if(offline>0)advance(offline);
  function persist(next=state){
    try{localStorage.setItem(key,JSON.stringify({...next,at:Date.now()}));return true;}catch{return false;}
  }

  const scene=new T.Scene();
  const world=new T.Group(), active=new T.Group();
  const sky=new T.Color(0x9eb4b3);
  scene.background=sky;
  const hemi=new T.HemisphereLight(0xffeed9,0x899480,2.15);
  const sun=new T.DirectionalLight(0xffdeb0,2.2);
  sun.position.set(-6,10,7);
  scene.add(world,active,hemi,sun);
  const camera=new T.OrthographicCamera(-11,11,7,-7,.1,70);
  const geometry={box:new T.BoxGeometry(1,1,1),leaf:new T.IcosahedronGeometry(.5,1),round:new T.SphereGeometry(.5,10,7),pole:new T.CylinderGeometry(.5,.55,1,8)};
  const materials=new Map();
  function mesh(group,shape,color,x,y,z,w,h,d){
    if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.9}));
    const object=new T.Mesh(geometry[shape],materials.get(color));
    object.position.set(x,y,z);object.scale.set(w,h,d);group.add(object);return object;
  }
  const box=(color,x,y,z,w,h,d)=>mesh(world,'box',color,x,y,z,w,h,d);
  function tree(x,z,h){
    mesh(world,'pole',0x765c4d,x,h*.26,z,.20,h*.52,.20);
    mesh(world,'leaf',0x527152,x,h*.70,z,.74*h,.52*h,.62*h);
    mesh(world,'leaf',0x65825a,x-.31,h*.85,z+.17,.48*h,.44*h,.47*h);
  }
  function roof(x,y,z,width,depth,color){
    const pitch=.33, run=depth/2, rise=Math.tan(pitch)*run;
    for(const side of [-1,1]){
      box(color,x,y+rise/2,z+side*run/2,width,.13,run/Math.cos(pitch)).rotation.x=side*pitch;
      for(let dx=-width/2+.17;dx<width/2;dx+=.29)box(0x98644f,x+dx,y+rise/2+.068,z+side*run/2,.023,.016,run/Math.cos(pitch)).rotation.x=side*pitch;
    }
    box(0x875743,x,y+rise+.065,z,width+.06,.13,.20);
  }
  function roomFacade(x,y,z,paint,occupied){
    box(paint,x,y+1.08,z,4.15,2.16,3.08);
    box(0x88867b,x,y+.17,z+1.55,4.2,.23,.08);
    box(0x514e43,x-.85,y+.99,z+1.56,.86,1.73,.12);
    box(0x806249,x-.85,y+1.01,z+1.635,.73,1.66,.043);
    box(0xc6ac78,x-.59,y+.96,z+1.663,.085,.034,.031);
    box(0x525b55,x+.66,y+1.16,z+1.58,1.26,.87,.10);
    box(occupied?0xecc180:0x789191,x+.66,y+1.16,z+1.637,1.13,.73,.03);
    for(const offset of [-.29,.29])box(0x565b50,x+.66+offset,y+1.16,z+1.656,.032,.74,.025);
    box(0xa99d86,x+.66,y+.72,z+1.65,1.27,.079,.22);
    box(0xe6c58a,x-.84,y+1.95,z+1.64,.22,.092,.10);
  }
  function buildWorld(){
    world.clear();
    box(0x8e947b,0,-.21,0,72,.39,66);
    box(0xaaab95,0,.01,1,22,.045,10);
    box(0xbab19c,0,.066,1.08,20.0,.082,6.65);
    for(let x=-9.5;x<=9.5;x+=.52)box(0xafaa98,x,.108,1.07,.016,.009,6.46);
    box(0x626b68,0,.026,8.75,58,.045,3.45);
    box(0xaaa397,0,.079,6.91,38,.12,.39);
    for(let x=-18;x<=18;x+=2.3)box(0xb7b097,x,.054,8.81,.82,.009,.045);
    box(0x81735d,0,.35,-5.22,21,.65,.24);
    for(let x=-10;x<=10;x+=2.5)box(0xc0aa8b,x,.49,-5.17,.24,.91,.28);
    for(const [x,z,h] of [[-10.65,-2,3.6],[10.55,-2.7,3.2],[-10,4.1,2.7],[10.3,4.0,3.0],[-6,-8.5,3.1],[8.7,-10.1,4.2],[-13.2,1.7,3.9],[14.3,-5,2.9]])tree(x,z,h);
    for(const [x,z,paint,h] of [[-10.4,-9.25,0xc6b597,2.1],[-2.9,-9.1,0xbbc0a8,1.96],[3.3,-8.55,0xd0b69a,2.35],[11,-8.5,0xb8aa8f,2.02]]){
      box(paint,x,h/2,z,4.25,h,3.54);
      box(0x707d70,x+.82,1.2,z+1.80,.88,.68,.08);
      box(0x7f6450,x-.73,.79,z+1.8,.65,1.5,.09);
      roof(x,h,z,4.62,4.0,0xa16b53);
    }
    for(const x of [-9.6,9.6]){
      box(0x535b50,x,1.45,6.50,.096,2.9,.096);
      box(0x535b50,x,2.82,6.29,.075,.065,.52);
      box(0xe3c991,x,2.70,6.08,.25,.085,.14);
    }
    for(const x of [-9.2,9.2]){
      box(0x978471,x,.25,3.5,1.20,.42,.63);
      mesh(world,'leaf',0x678258,x,.60,3.5,1.08,.46,.53);
    }
    state.rooms.forEach(({level,tenants},i)=>{
      const x=positions[i];
      box(level?0xb4a78b:0xa39e87,x,.12,-2.85,4.43,.20,3.72);
      if(level){
        const height=level;
        for(let floor=0;floor<height;floor++){
          const y=.22+floor*2.18;
          roomFacade(x,y,-2.93,level===3?0xc0c7b5:0xd1bda0,tenants>floor);
          if(floor){
            box(0xaaa38c,x,y+.08,-1.16,4.30,.15,.70);
            box(0x5b6255,x,y+.78,-.83,4.26,.064,.063);
            for(let post=0;post<=8;post++)box(0x626659,x-2.08+post*.52,y+.43,-.83,.038,.65,.041);
          }
        }
        if(level===3){
          box(0x697568,x,.29+height*2.18,-2.91,4.36,.23,3.36);
          for(const z of [-4.51,-1.31])box(0x938d7c,x,.48+height*2.18,z,4.33,.22,.105);
          mesh(world,'pole',0x758787,x+1.27,.64+height*2.18,-3.25,.53,.51,.53);
        }else roof(x,.25+height*2.18,-2.94,4.52,3.62,0xa56e52);
      }else{
        for(const dx of [-2.02,2.02])for(const z of [-4.42,-1.34])box(0xd6c69f,x+dx,.33,z,.12,.42,.12);
        box(0xbdb090,x,.225,-2.83,3.78,.022,2.64);
      }
      pad(x,.17,level?0x778871:0xc29458);
    });
    pad(-5.75,4.35,0x809473);
    pad(5.75,4.35,state.wifi?0x609382:0x89795b);
    box(0x62685a,-6.67,.58,4.89,.56,1.14,.38);
    box(0xb1c2a0,-6.67,.73,4.683,.39,.32,.07);
    if(state.wifi){
      box(0x6b746c,6.78,1.05,4.82,.084,2.07,.095);
      box(0xabb2a0,6.78,2.12,4.82,.44,.095,.14);
      box(0xd2cfaa,6.78,1.54,4.82,.26,.38,.22);
    }
    dirty=true;
  }
  function pad(x,z,color){
    box(0x5e6657,x,.13,z,1.56,.082,.91);
    box(color,x,.178,z,1.40,.055,.75);
  }
  const player=new T.Group();active.add(player);
  const avatarColor=0xe7b36c;
  mesh(player,'box',avatarColor,0,.96,0,.40,.51,.27);
  mesh(player,'round',0xbf8a66,0,1.40,.02,.25,.31,.25);
  mesh(player,'round',0x393a32,0,1.49,-.017,.27,.17,.27);
  mesh(player,'box',0x75694f,0,1.0,-.17,.31,.37,.16);
  const legs=[],arms=[];
  for(const side of [-1,1]){
    const leg=new T.Group();leg.position.set(side*.103,.72,0);player.add(leg);
    mesh(leg,'box',0x4d5550,0,-.28,0,.17,.58,.19);
    mesh(leg,'box',0x3b4940,0,-.63,.045,.174,.13,.245);legs.push(leg);
    const arm=new T.Group();arm.position.set(side*.235,1.17,0);player.add(arm);
    mesh(arm,'box',0xb77b43,0,-.13,0,.12,.25,.14);
    mesh(arm,'round',0xb88461,0,-.29,0,.12,.17,.12);arms.push(arm);
  }
  player.position.set(0,.113,3.28);
  const targets=[
    ...positions.map((x,id)=>({kind:'room',id,x,z:.17})),
    {kind:'rent',x:-5.75,z:4.35},
    {kind:'wifi',x:5.75,z:4.35},
  ];
  let selected=null,destination=null,queued=null,dirty=true;
  let noticeUntil=0;
  const rupiah=new Intl.NumberFormat('id-ID');
  const rp=value=>'Rp '+rupiah.format(Math.floor(value));
  function compact(value){return value>=1e6?'Rp '+(value/1e6).toLocaleString('id-ID',{maximumFractionDigits:1})+' jt':value>=1e3?'Rp '+Math.floor(value/1e3)+' rb':rp(value);}
  function notice(message){
    $('notice').textContent=message;noticeUntil=performance.now()+3400;
  }
  function describe(target){
    if(target.kind==='rent')return {name:'Pos tagih',hint:'Ambil sewa dari semua kamar.',action:'Ambil '+compact(state.rent),disabled:state.rent<1};
    if(target.kind==='wifi')return {name:'Wi-Fi kos',hint:'Penghuni datang lebih cepat setelah Wi-Fi terpasang.',action:state.wifi?'Wi-Fi aktif':'Pasang · '+compact(facilityCost),disabled:state.wifi||state.cash<facilityCost};
    const {level,tenants}=state.rooms[target.id];
    return {name:'Petak '+(target.id+1),hint:level?tenants+'/'+slots[level]+' penghuni · Lv. '+level:'Lahan siap dibangun.',action:level===3?'Level maksimum':(level?'Tingkatkan':'Bangun kamar')+' · '+compact(costs[level]),disabled:level===3||state.cash<costs[level]};
  }
  function near(target){return Math.hypot(player.position.x-target.x,player.position.z-target.z)<1.05;}
  function doAction(target){
    const info=describe(target);
    if(info.disabled){notice(info.action);return;}
    const next={...state,rooms:state.rooms.map(room=>({...room}))};
    let message;
    if(target.kind==='rent'){
      const pay=Math.floor(next.rent);next.cash+=pay;next.rent-=pay;message='Sewa masuk: '+rp(pay)+'.';
    }else if(target.kind==='wifi'){
      next.cash-=facilityCost;next.wifi=true;message='Wi-Fi terpasang.';
    }else{
      const room=next.rooms[target.id];
      next.cash-=costs[room.level];room.level++;
      message=room.level===1?'Kamar di petak '+(target.id+1)+' selesai dibangun.':'Petak '+(target.id+1)+' naik ke Lv. '+room.level+'.';
    }
    if(!persist(next)){notice('Progres gagal disimpan. Cek penyimpanan browser.');return;}
    Object.assign(state,next);
    if(target.kind!=='rent')buildWorld();
    notice(message);
    updateHud();
  }
  function selectTarget(target,act=false){
    selected=target;
    destination=near(target)?null:{x:target.x,z:target.z};
    queued=act?target:null;
    if(act && !destination){queued=null;doAction(target);}
    updateHud();
  }
  for(const target of targets){
    const button=document.createElement('button');
    button.type='button';button.className='marker';button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>selectTarget(target));
    signs.append(button);target.button=button;
  }
  $('action').addEventListener('click',()=>{if(selected)selectTarget(selected,true);});
  const controls=new Set();
  const keyMap={w:'up',a:'left',s:'down',d:'right',arrowup:'up',arrowdown:'down',arrowleft:'left',arrowright:'right'};
  window.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey)return;
    const ch=event.key.toLowerCase();
    if(keyMap[ch]){event.preventDefault();controls.add(keyMap[ch]);}
    if(ch==='e'&&!event.repeat&&selected)selectTarget(selected,true);
  });
  window.addEventListener('keyup',event=>controls.delete(keyMap[event.key.toLowerCase()]));
  window.addEventListener('blur',()=>controls.clear());
  document.querySelectorAll('[data-move]').forEach(button=>{
    const control=button.dataset.move;
    button.addEventListener('pointerdown',event=>{button.setPointerCapture(event.pointerId);controls.add(control);});
    button.addEventListener('lostpointercapture',()=>controls.delete(control));
    button.addEventListener('pointerup',()=>controls.delete(control));
    button.addEventListener('pointercancel',()=>controls.delete(control));
  });
  function updateHud(){
    $('cash').textContent=compact(state.cash);
    $('rent').textContent=compact(state.rent);
    const occupied=state.rooms.reduce((sum,room)=>sum+room.tenants,0), capacity=state.rooms.reduce((sum,room)=>sum+slots[room.level],0);
    $('occupancy').textContent=occupied+'/'+capacity;
    const built=state.rooms.filter(room=>room.level>0).length;
    $('objective').textContent=!built?'Bangun kamar pertama.':!occupied?'Tunggu penghuni pertama datang.':built<4?'Bangun semua petak · '+built+'/4':state.rooms.some(room=>room.level<3)?'Tingkatkan semua petak ke Lv. 3.':!state.wifi?'Lengkapi properti dengan Wi-Fi.':'Kompleks lengkap · 12 tempat tinggal.';
    for(const target of targets){
      const level=target.kind==='room'?state.rooms[target.id].level:0;
      target.button.textContent=target.kind==='room'?'Petak '+(target.id+1)+(level?' · Lv. '+level:' · Bangun'):target.kind==='rent'?'Pos tagih':'Wi-Fi';
      target.button.setAttribute('aria-pressed',String(selected===target));
    }
    if(!selected)return;
    const detail=describe(selected);
    $('targetName').textContent=detail.name;
    $('targetInfo').textContent=detail.hint+(near(selected)?'':' Dekati titik untuk berinteraksi.');
    $('action').textContent=detail.action;
    $('action').disabled=detail.disabled;
  }
  const collision=(x,z)=>z<-1.20 && state.rooms.some((room,index)=>room.level && Math.abs(x-positions[index])<2.28 && z>-4.78);
  const visitor=new T.Group();
  active.add(visitor);
  mesh(visitor,'box',0x627c72,0,.91,0,.33,.45,.24);
  mesh(visitor,'round',0xaf7759,0,1.32,.02,.24,.26,.24);
  mesh(visitor,'round',0x43473d,0,1.41,-.015,.24,.13,.24);
  mesh(visitor,'box',0x876748,-.26,.30,-.14,.18,.36,.21);
  const visitorLegs=[-.079,.079].map(x=>{
    const leg=new T.Group();leg.position.set(x,.67,0);visitor.add(leg);
    mesh(leg,'box',0x4c5050,0,-.28,0,.13,.56,.15);
    mesh(leg,'box',0x424840,0,-.57,.028,.14,.095,.22);
    return leg;
  });
  let visitorTime=0;
  function moveVisitor(dt){
    visitorTime+=dt;
    const duration=31;
    const x=(visitorTime%duration)*1.28-19.84;
    visitor.position.set(x,.14,6.76);visitor.rotation.y=Math.PI/2;
    visitorLegs.forEach((leg,index)=>{leg.rotation.x=Math.sin(visitorTime*8)*.48*(index?1:-1);});
  }
  let stride=0;
  function walk(dt){
    let x=Number(controls.has('right'))-Number(controls.has('left'));
    let z=Number(controls.has('down'))-Number(controls.has('up'));
    const p=player.position;
    if(x||z){destination=null;queued=null;}
    else if(destination){
      x=destination.x-p.x;z=destination.z-p.z;
      if(Math.hypot(x,z)<.32){
        destination=null;
        const target=queued;queued=null;
        if(target&&near(target))doAction(target);
        x=0;z=0;
      }
    }
    const length=Math.hypot(x,z);
    if(length){
      const step=4.2*dt;
      const nx=T.MathUtils.clamp(p.x+x/length*step,-10.0,10);
      const nz=T.MathUtils.clamp(p.z+z/length*step,-4.8,6.1);
      if(!collision(nx,p.z))p.x=nx;
      if(!collision(p.x,nz))p.z=nz;
      player.rotation.y=Math.atan2(x,z);
      stride+=dt*11;
    }
    const swing=length?Math.sin(stride)*.48:0;
    for(let i=0;i<2;i++){legs[i].rotation.x=i?swing:-swing;arms[i].rotation.x=i?-swing:swing;}
    p.y=.117+(length?Math.abs(swing)*.055:0);
    if(!destination && !queued && length){
      const target=targets.reduce((best,item)=>near(item)?item:best,null);
      if(target)selected=target;
    }
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
    const surfacesBelongToWorld = group === world || group === active;
    const tint = new T.Color(0xffffff);
    if (surfacesBelongToWorld) tint.lerp(sun.color,.18);
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

  let canvas=document.createElement('canvas'), renderer;
  try{
    const context=canvas.getContext('webgl2',{antialias:true})||canvas.getContext('webgl',{antialias:true});
    if(context){
      renderer=new T.WebGLRenderer({canvas,context});
      renderer.setPixelRatio(Math.min(1.5,devicePixelRatio||1));
      renderer.toneMapping=T.ACESFilmicToneMapping;
    }
  }catch{}
  if(!renderer)canvas=document.createElement('canvas');
  root.prepend(canvas);
  canvas.setAttribute('aria-hidden','true');
  let width=0,height=0,base,work,lastTargetX=Infinity;
  const markerPoint=new T.Vector3();
  function projectTargets(){
    for(const target of targets){
      markerPoint.set(target.x,.61,target.z).project(camera);
      const x=(markerPoint.x+1)*width/2,y=(1-markerPoint.y)*height/2;
      target.button.hidden=x<31||x>width-31||y<100||y>height-130;
      target.button.style.left=x+'px';target.button.style.top=y+'px';
    }
  }
  function setupCamera(force=false){
    const ratio=width/height;
    const follow=ratio<1.23?Math.round(player.position.x*2)/2:0;
    if(!force && lastTargetX===follow)return;
    lastTargetX=follow;
    const span=ratio<1.23?9.35:Math.max(7.1,11.9/ratio);
    camera.left=-span*ratio;camera.right=span*ratio;camera.bottom=-span;camera.top=span;
    camera.position.set(follow+7.7,15,21);
    camera.lookAt(follow,1.2,.9);
    camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
    dirty=true;
  }
  function resize(){
    width=root.clientWidth;height=root.clientHeight;
    if(!width||!height)return;
    if(renderer)renderer.setSize(width,height,false);
    else{
      const scale=Math.min(1,850/width,820/height);
      canvas.width=Math.max(1,Math.round(width*scale));
      canvas.height=Math.max(1,Math.round(height*scale));
    }
    setupCamera(true);
  }
  canvas.addEventListener('pointerup',event=>{
    if(event.button!==0 || !width || !height)return;
    const rect=canvas.getBoundingClientRect();
    const ray=new T.Raycaster();
    ray.setFromCamera(new T.Vector2(2*(event.clientX-rect.left)/width-1,1-2*(event.clientY-rect.top)/height),camera);
    const point=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-.12),new T.Vector3());
    if(point){queued=null;destination={x:T.MathUtils.clamp(point.x,-10,10),z:T.MathUtils.clamp(point.z,-1.1,6.1)};}
  });
  function draw(){
    if(!width||!height)return;
    setupCamera();
    if(renderer)renderer.render(scene,camera);
    else{
      if(dirty){
        base=blankFrame(canvas,sky);work=blankFrame(canvas,sky);
        renderMeshes(base,world,camera,sky);dirty=false;
      }
      work.image.data.set(base.image.data);work.depth.set(base.depth);
      renderMeshes(work,active,camera,sky);
      work.context.putImageData(work.image,0,0);
    }
    projectTargets();
  }
  buildWorld();resize();updateHud();
  new ResizeObserver(resize).observe(root);
  let previous=0, rendered=0, hud=0, saved=0;
  function frame(now){
    const dt=previous?Math.min(.10,(now-previous)/1000):0;
    previous=now;
    if(!document.hidden){
      walk(dt);moveVisitor(dt);
      if(advance(dt)){buildWorld();notice('Penghuni baru masuk.');}
      if(noticeUntil && now>=noticeUntil){$('notice').textContent='';noticeUntil=0;}
      if(now-hud>200){updateHud();hud=now;}
      if(now-rendered>33){draw();rendered=now;}
      if(now-saved>5000){persist();saved=now;}
    }
    requestAnimationFrame(frame);
  }
  let hiddenAt=0;
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){hiddenAt=Date.now();persist();controls.clear();}
    else if(hiddenAt){
      if(advance(Math.min(1800,(Date.now()-hiddenAt)/1000)))buildWorld();
      hiddenAt=0;persist();
    }
  });
  window.addEventListener('pagehide',()=>{if(!hiddenAt)persist();});
  requestAnimationFrame(frame);
  if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
