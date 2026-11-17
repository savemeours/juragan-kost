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
  const avatarOptions={
    shirt:[['Mustard',0xe4ad5c],['Hijau lumut',0x607f6c],['Biru denim',0x55758b],['Merah bata',0xa45648],['Putih gading',0xd7cbb7]],
    pants:[['Arang',0x43504d],['Denim',0x50677c],['Khaki',0xa79170],['Hitam',0x303532]],
    skin:[['Hangat',0xbf8a66],['Terang',0xe3b091],['Sawo matang',0xa56d4e],['Gelap',0x795345]],
    hair:[['Pendek',0x302a24],['Belah samping',0x51362a],['Ikal',0x302924],['Plontos',0]],
    accessory:[['Ransel',0x74684f],['Topi',0x627e67],['Kacamata',0x3f463a],['Tanpa aksesori',0]],
  };
  function cleanAvatar(avatar){
    return Object.fromEntries(Object.entries(avatarOptions).map(([key,options])=>{
      const value=Number(avatar?.[key]);
      return [key,Number.isInteger(value)&&value>=0&&value<options.length?value:0];
    }));
  }
  const initial=()=>({cash:2500000,rent:0,rooms:positions.map(()=>({level:0,tenants:0,progress:0})),wifi:false,avatar:cleanAvatar(),at:Date.now()});
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
      data.avatar=cleanAvatar(old.avatar);
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
  const gablePath=new T.Shape();
  gablePath.moveTo(-.5,0);gablePath.lineTo(0,1);gablePath.lineTo(.5,0);gablePath.closePath();
  geometry.gable=new T.ShapeGeometry(gablePath);
  function roof(x,y,z,width,depth,color,wall){
    const pitch=.36,run=depth/2,rise=Math.tan(pitch)*run;
    for(const side of [-1,1]){
      box(0x6d4d40,x,y+rise/2,z+side*run/2,width,.11,run/Math.cos(pitch)).rotation.x=side*pitch;
      for(let row=0;row<6;row++){
        const offset=(row+.5)*run/6;
        const tileY=y+(run-offset)*Math.tan(pitch)+.065;
        box(row%2?color:0xa67559,x,tileY,z+side*offset,width-.02,.053,run/6/Math.cos(pitch)+.017).rotation.x=side*pitch;
        for(let dx=-width/2+.20+row%2*.15;dx<width/2-.13;dx+=.42){
          box(0x875b49,x+dx,tileY+.029,z+side*offset,.013,.014,run/6/Math.cos(pitch)-.025).rotation.x=side*pitch;
        }
      }
      box(0x66594b,x,y-.05,z+side*run,width,.094,.105);
      if(wall)mesh(world,'gable',wall,x+side*(width/2-.27),y-.028,z,depth,rise+.025,1).rotation.y=side*Math.PI/2;
    }
    box(color,x,y+rise+.081,z,width+.07,.135,.21);
  }
  function windowUnit(x,y,z,width,height,occupied,trim){
    box(trim,x,y,z,width+.13,height+.13,.11);
    box(occupied?0xe7b97f:0x799392,x,y,z+.068,width,height,.032);
    box(0xa5aea0,x,y+height*.25,z+.088,width*.90,.032,.014);
    for(const offset of [-.27,0,.27])box(trim,x+offset*width,y,z+.09,.022,height+.03,.028);
    box(0xb1a58d,x,y-height/2-.10,z+.09,width+.2,.075,.24);
  }
  function roomFacade(x,y,z,paint,occupied,style){
    const front=z+1.54;
    const trim=style===2?0x52665d:0x665b4b;
    box(paint,x,y+1.09,z,4.19,2.18,3.08);
    box(0x9b9582,x,y+.19,front+.018,4.19,.29,.061);
    box(trim,x-.92,y+1.025,front+.031,.89,1.79,.116);
    box(style===2?0x80715e:0x89684b,x-.92,y+1.02,front+.097,.74,1.67,.043);
    for(const height of [.52,1.21,1.49])box(0x6b5540,x-.92,y+height,front+.122,.59,.029,.014);
    box(0xe1be82,x-.664,y+.94,front+.137,.071,.035,.035);
    box(0x756d58,x-.9,y+1.95,front+.053,.62,.113,.094);
    for(let vent=0;vent<4;vent++)box(0xaca28c,x-.9+(vent-1.5)*.132,y+1.954,front+.106,.068,.035,.014);
    windowUnit(x+.65,y+1.16,front+.051,1.08,.72,occupied,trim);
    box(0xbaad91,x+.65,y+1.65,front+.16,1.45,.074,.36);
    for(const side of [-1,1]){
      box(0xa79b82,x+side*2.018,y+1.15,front+.028,.15,1.87,.101);
      const frame=box(trim,x+side*2.11,y+1.31,z-.22,.072,.60,.63);
      box(0x768783,frame.position.x+side*.045,y+1.31,z-.22,.029,.48,.52);
    }
  }
  function neighbor(x,z,paint,height,index){
    const width=[4.35,3.81,4.73,3.98][index],depth=[3.57,3.21,3.62,3.61][index];
    const front=z+depth/2;
    box(0xa99d87,x,.092,z,width+.23,.18,depth+.25);
    box(paint,x,.125+height/2,z,width,height,depth);
    box(0x9c9580,x,.22,front+.022,width,.22,.06);
    windowUnit(x+.32*width,.12+height*.55,front+.032,width*.23,.61,false,0x616658);
    box(0x66564a,x-.25*width,.92,front+.025,.82,1.63,.095);
    box(0x82705b,x-.25*width,.92,front+.083,.69,1.49,.028);
    box(0xc1a784,x-.12*width,.23,front+.48,width*.62,.23,.98);
    const awning=[0x8b6b53,0x788276,0x8e6855,0x777d6c][index];
    box(awning,x-.12*width,height*.90,front+.42,width*.65,.12,1.03).rotation.x=.14;
    for(const end of [-.40,.15])box(0x8f8873,x+end*width,height*.46,front+.79,.12,height*.84,.14);
    roof(x,height+.145,z,width+.51,depth+.46,[0xa16d54,0x986e56,0xae735a,0x98644c][index],paint);
    for(const dx of [-.28,.10]){
      mesh(world,'pole',0x986d55,x+dx*width,.20,front+1.03,.25,.28,.25);
      mesh(world,'leaf',0x607f57,x+dx*width,.41,front+1.03,.27,.28,.26);
    }
  }
  function stairFlight(x,y,z){
    for(let i=0;i<13;i++){
      const rise=(i+1)*2.18/13;
      box(0x9b9686,x-1.78+i*.255,y+rise-.075,z,.271,.16,.58);
      box(0x726e60,x-1.81+i*.255,y+rise+.008,z,.032,.031,.59);
    }
    const incline=Math.atan2(2.18,3.34);
    const length=Math.hypot(2.18,3.34);
    for(const edge of [-.30,.30]){
      box(0x646c60,x-.22,y+.99,z+edge,length,.092,.076).rotation.z=incline;
      const rail=box(0x525d50,x-.22,y+1.67,z+edge,length,.044,.052);
      rail.rotation.z=incline;
      for(let post=0;post<5;post++)box(0x525d50,x-1.87+post*.82,y+.36+post*.545,z+edge,.045,.63,.043);
    }
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
    [[-10.55,-9.25,0xc6b597,2.06],[-3.0,-9.1,0xafb8a5,2.19],[3.45,-8.80,0xd0b69a,2.38],[11.1,-8.65,0xb8aa8f,2.18]]
      .forEach(([x,z,paint,height],index)=>neighbor(x,z,paint,height,index));
    for(let x=-9.8;x<10;x+=.86) {
      box(0x777b71,x,.108,6.63,.37,.027,.14);
      for(const offset of [-.10,0,.10])box(0x4f5a50,x+offset,.125,6.63,.024,.012,.128);
    }
    for(let i=0;i<21;i++){
      const x=(i*3.113)%37-18.5;
      box(i%2?0x6f7770:0x666f69,x,.05,7.35+(i*1.09)%2.80,.18+i%4*.14,.007,.038+i%3*.036).rotation.y=i*.58;
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
          const paints=[0xd1bda0,0xc9b8a2,0xc0c7b5,0xd4c4a9];
          roomFacade(x,y,-2.93,paints[i],tenants>floor,i);
          if(floor){
            box(0xaaa38c,x,y+.015,-1.11,4.33,.17,.88);
            box(0x827c6c,x,y-.045,-.653,4.32,.050,.065);
            stairFlight(x,y-2.18,-.57);
            for(const dx of [-2.01,2.01])box(0xb2a793,x+dx,y-1.09,-1.19,.13,2.06,.16);
            box(0x5b6255,x,y+.78,-.83,4.26,.064,.063);
            for(let post=0;post<=8;post++)box(0x626659,x-2.08+post*.52,y+.43,-.83,.038,.65,.041);
          }
        }
        if(level===3){
          box(0x697568,x,.29+height*2.18,-2.91,4.36,.23,3.36);
          for(const z of [-4.51,-1.31])box(0x938d7c,x,.48+height*2.18,z,4.33,.22,.105);
          mesh(world,'pole',0x758787,x+1.27,.64+height*2.18,-3.25,.53,.51,.53);
        }else{
          roof(x,.25+height*2.18,-2.94,4.70,3.78,0xa56e52,[0xd1bda0,0xc9b8a2,0xc0c7b5,0xd4c4a9][i]);
          box(0x777365,x+1.98,.22+height*1.09,-1.06,.063,height*2.18,.063);
        }
        if(level===1){
          box(0xaa9e84,x-.96,.25,-1.19,1.42,.14,.52);
          box(0xbeb094,x-.96,.18,-.94,1.50,.08,.31);
          mesh(world,'pole',0xa77b5e,x+1.46,.35,-1.16,.29,.27,.29);
          mesh(world,'leaf',0x668459,x+1.46,.57,-1.16,.34,.40,.31);
        }
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
  const player=new T.Group();
  active.add(player);
  function character(group,style){
    group.clear();
    const hues=Object.fromEntries(Object.entries(style).map(([key,index])=>[key,avatarOptions[key][index][1]]));
    const put=(shape,color,x,y,z,w,h,d)=>mesh(group,shape,color,x,y,z,w,h,d);
    put('box',hues.shirt,0,.99,0,.385,.46,.27);
    put('round',hues.skin,0,1.25,.01,.135,.14,.13);
    put('round',hues.skin,0,1.42,.018,.26,.28,.245);
    for(const side of [-1,1]){
      put('round',hues.skin,side*.121,1.421,.016,.052,.082,.074);
      put('round',0x302e27,side*.051,1.457,.132,.021,.024,.018);
    }
    put('round',hues.skin,0,1.42,.14,.041,.04,.045);
    if(style.hair<3){
      put('round',hues.hair,0,1.528,-.014,.285,.145,.27);
      if(style.hair===1)put('round',hues.hair,-.051,1.508,.087,.189,.09,.127).rotation.z=.29;
      if(style.hair===2)for(const x of [-.089,0,.089])put('round',hues.hair,x,1.576,.016,.105,.082,.115);
    }
    if(style.accessory===0){
      put('box',hues.accessory,0,1,-.171,.30,.35,.17);
      put('box',0xa59270,0,.918,-.261,.23,.103,.03);
      for(const x of [-.132,.132])put('box',hues.accessory,x,1.01,.143,.032,.32,.025);
    }
    if(style.accessory===1){
      put('round',hues.accessory,0,1.56,.001,.294,.128,.298);
      put('box',hues.accessory,0,1.53,.138,.23,.023,.22);
    }
    if(style.accessory===2){
      put('box',hues.accessory,0,1.457,.144,.22,.024,.019);
      for(const x of [-.077,.077])put('box',0x62867e,x,1.445,.151,.086,.045,.014);
    }
    const legs=[],arms=[];
    for(const side of [-1,1]){
      const leg=new T.Group();leg.position.set(side*.097,.747,0);group.add(leg);
      mesh(leg,'box',hues.pants,0,-.19,0,.149,.38,.17);
      const shin=new T.Group();shin.position.y=-.373;leg.add(shin);
      mesh(shin,'box',hues.pants,0,-.125,0,.133,.27,.146);
      mesh(shin,'box',0x353b35,0,-.285,.046,.158,.10,.242);
      legs.push({hip:leg,knee:shin});
      const arm=new T.Group();arm.position.set(side*.221,1.16,0);group.add(arm);
      mesh(arm,'box',hues.shirt,0,-.086,0,.127,.176,.139);
      mesh(arm,'round',hues.skin,0,-.215,0,.10,.22,.116);
      arms.push(arm);
    }
    return {legs,arms};
  }
  let rig=character(player,state.avatar);
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
    if(event.altKey||event.ctrlKey||event.metaKey||$('avatarDialog').open)return;
    const ch=event.key.toLowerCase();
    if(keyMap[ch]){event.preventDefault();controls.add(keyMap[ch]);}
    if(ch==='e'&&!event.repeat&&selected)selectTarget(selected,true);
  });
  window.addEventListener('keyup',event=>controls.delete(keyMap[event.key.toLowerCase()]));
  window.addEventListener('blur',()=>controls.clear());
  const joystick=$('joystick'), stick=$('stick');
  const touch=new T.Vector2();
  let pointer=null;
  function moveStick(event){
    const rect=joystick.getBoundingClientRect(), range=rect.width*.31;
    touch.set((event.clientX-rect.left-rect.width/2)/range,(event.clientY-rect.top-rect.height/2)/range);
    if(touch.length()>1)touch.normalize();
    if(touch.length()<.12)touch.set(0,0);
    stick.style.transform=`translate(${touch.x*range}px,${touch.y*range}px)`;
  }
  function resetStick(){pointer=null;touch.set(0,0);stick.style.transform='';}
  joystick.addEventListener('pointerdown',event=>{
    if(pointer!==null||event.button!==0)return;
    pointer=event.pointerId;joystick.setPointerCapture(pointer);moveStick(event);
  });
  joystick.addEventListener('pointermove',event=>{if(event.pointerId===pointer)moveStick(event);});
  for(const type of ['pointerup','pointercancel','lostpointercapture']){
    joystick.addEventListener(type,event=>{if(event.pointerId===pointer)resetStick();});
  }
  window.addEventListener('blur',resetStick);
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
  let stride=0, gait=0;
  const velocity=new T.Vector2();
  const desired=new T.Vector2();
  function walk(dt){
    let x=Number(controls.has('right'))-Number(controls.has('left'))+touch.x;
    let z=Number(controls.has('down'))-Number(controls.has('up'))+touch.y;
    const p=player.position;
    const manual=Math.hypot(x,z)>.02;
    if(manual){
      destination=null;queued=null;
      // The thumbstick and arrow keys follow the camera's ground axes.
      const azimuth=cameraAzimuth;
      [x,z]=[x*Math.cos(azimuth)+z*Math.sin(azimuth),-x*Math.sin(azimuth)+z*Math.cos(azimuth)];
    }else if(destination){
      x=destination.x-p.x;z=destination.z-p.z;
      if(Math.hypot(x,z)<.28){
        destination=null;
        const target=queued;queued=null;
        if(target&&near(target))doAction(target);
        x=0;z=0;
      }
    }
    const distance=Math.hypot(x,z);
    const speed=manual?4.25*Math.min(1,distance):Math.min(4.25,distance*6);
    desired.set(x,z).multiplyScalar(distance?speed/distance:0);
    velocity.lerp(desired,1-Math.exp(-(distance?13:17)*dt));
    const vx=velocity.x,vz=velocity.y;
    const nx=T.MathUtils.clamp(p.x+vx*dt,-10,10), nz=T.MathUtils.clamp(p.z+vz*dt,-4.8,6.1);
    if(!collision(nx,p.z))p.x=nx;
    if(!collision(p.x,nz))p.z=nz;
    const actualSpeed=velocity.length();
    if(actualSpeed>.08){
      const heading=Math.atan2(vx,vz);
      const delta=Math.atan2(Math.sin(heading-player.rotation.y),Math.cos(heading-player.rotation.y));
      player.rotation.y+=delta*(1-Math.exp(-14*dt));
      stride+=dt*actualSpeed*2.55;
    }
    gait+=(Math.min(1,actualSpeed/3.3)-gait)*(1-Math.exp(-11*dt));
    for(let i=0;i<2;i++){
      const phase=stride+i*Math.PI;
      rig.legs[i].hip.rotation.x=Math.sin(phase)*.48*gait;
      rig.legs[i].knee.rotation.x=Math.max(0,-Math.sin(phase-.45))*.45*gait;
      rig.arms[i].rotation.x=-Math.sin(phase)*.34*gait;
    }
    p.y=.118+Math.abs(Math.sin(stride))*.036*gait;
    if(!destination&&!queued&&actualSpeed>.12){
      const target=targets.find(near);
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
    const lightDirection = new T.Vector3(-.5, .85, .6).normalize();
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
        const shade = (.58 + .42*Math.max(0,normal.dot(lightDirection))) * light;
        color.copy(object.material.color).multiply(tint).multiplyScalar(shade);
        if (object.material.emissiveIntensity && object.material.emissive.getHex()) {
          color.lerp(object.material.emissive,.35);
        }
        const fog = surfacesBelongToWorld ? Math.max(0,Math.min(.76,((u.z+v.z+w.z)/3+.22)*.92)) : 0;
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
  let width=0,height=0,base,work,followX=0,lastTargetX=Infinity;
  const cameraAzimuth=Math.atan2(7.7,20.1);
  const markerPoint=new T.Vector3();
  function projectTargets(){
    for(const target of targets){
      markerPoint.set(target.x,.61,target.z).project(camera);
      const x=(markerPoint.x+1)*width/2,y=(1-markerPoint.y)*height/2;
      target.button.hidden=x<31||x>width-31||y<100||y>height-130;
      target.button.style.left=x+'px';target.button.style.top=y+'px';
    }
  }
  function setupCamera(force=false,dt=0){
    const ratio=width/height;
    const target=ratio<1.23?player.position.x:0;
    followX=force?target:followX+(target-followX)*(1-Math.exp(-8*dt));
    if(!force && Math.abs(lastTargetX-followX)<.015)return;
    const follow=followX;
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
      const scale=Math.min(1,760/width,680/height);
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
  function draw(dt){
    if(!width||!height)return;
    setupCamera(false,dt);
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
  const avatarDialog=$('avatarDialog'), avatarForm=$('avatarForm');
  const previewCanvas=$('avatarPreview'), previewActor=new T.Group();
  const previewCamera=new T.OrthographicCamera(-1.96,1.96,1,-1,.1,12);
  previewCamera.position.set(2.35,1.46,4.9);
  previewCamera.lookAt(0,.83,0);
  const previewBackdrop=new T.Color(0x84998b);
  function drawAvatarPreview(){
    const choice=Object.fromEntries(new FormData(avatarForm));
    character(previewActor,cleanAvatar(choice));
    const frame=blankFrame(previewCanvas,previewBackdrop);
    renderMeshes(frame,previewActor,previewCamera,previewBackdrop);
    frame.context.putImageData(frame.image,0,0);
  }
  for(const [key,options] of Object.entries(avatarOptions)){
    avatarForm.elements.namedItem(key).replaceChildren(...options.map(([label],index)=>new Option(label,index)));
  }
  $('customize').addEventListener('click',()=>{
    controls.clear();resetStick();destination=null;queued=null;velocity.set(0,0);
    for(const [key,index] of Object.entries(state.avatar))avatarForm.elements.namedItem(key).value=String(index);
    $('avatarError').textContent='';
    avatarDialog.showModal();
    drawAvatarPreview();
  });
  $('cancelAvatar').addEventListener('click',()=>avatarDialog.close());
  avatarForm.addEventListener('change',drawAvatarPreview);
  avatarForm.addEventListener('submit',event=>{
    event.preventDefault();
    const avatar=cleanAvatar(Object.fromEntries(new FormData(avatarForm)));
    if(!persist({...state,avatar})){
      $('avatarError').textContent='Karakter gagal disimpan.';
      return;
    }
    state.avatar=avatar;
    rig=character(player,avatar);
    avatarDialog.close();
    notice('Karakter tersimpan.');
  });

  buildWorld();resize();updateHud();
  new ResizeObserver(resize).observe(root);
  let previous=0, rendered=0, hud=0, saved=0;
  function frame(now){
    const elapsed=previous?Math.max(0,(now-previous)/1000):0;
    const dt=Math.min(.10,elapsed);
    previous=now;
    if(!document.hidden){
      if(!$('avatarDialog').open)walk(dt);
      moveVisitor(dt);
      if(advance(Math.min(1800,elapsed))){buildWorld();notice('Penghuni baru masuk.');}
      if(noticeUntil && now>=noticeUntil){$('notice').textContent='';noticeUntil=0;}
      if(now-hud>200){updateHud();hud=now;}
      if(now-rendered>(renderer?15:31)){draw(Math.min(.12,(now-rendered)/1000));rendered=now;}
      if(now-saved>5000){persist();saved=now;}
    }
    requestAnimationFrame(frame);
  }
  let hiddenAt=0;
  document.addEventListener('visibilitychange',()=>{
    previous=0;
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
