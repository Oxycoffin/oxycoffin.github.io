import {Renderer,heightNormal} from './renderer.js';
const circle=Math.PI*2;
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function seededTexture(ctx,w,h,base,seed=13){ctx.fillStyle=base;ctx.fillRect(0,0,w,h);let s=seed;for(let i=0;i<13000;i++){s=(s*1664525+1013904223)>>>0;const x=s%w;s=(s*1664525+1013904223)>>>0;const y=s%h;ctx.fillStyle=i%2?'#ffffff09':'#0000000b';ctx.fillRect(x,y,1+(i%3),1);}}
function heightField(w,h){const c=canvas(w,h),ctx=c.getContext('2d');ctx.fillStyle='#666';ctx.fillRect(0,0,w,h);return c;}
// Rays are reflected by the geometry of each mirror. There is no target-angle password.
export function traceRays(mirrors){
 const entries=[{color:'r',start:[-1,0,1,0],target:[-1,1]},{color:'g',start:[1,-1,0,1],target:[3,1]},{color:'b',start:[-1,2,1,0],target:[0,-1]}];
 return entries.map(e=>{let [x,y,dx,dy]=e.start;const path=[[x,y]],seen=new Set();let exit=null;for(let step=0;step<64;step++){x+=dx;y+=dy;path.push([x,y]);if(x<0||x>2||y<0||y>2){exit=[x,y];break;}const key=[x,y,dx,dy].join(',');if(seen.has(key))break;seen.add(key);if(mirrors[y*3+x]===0)[dx,dy]=[-dy,-dx];else [dx,dy]=[dy,dx];}return {...e,path,exit,correct:exit!==null&&exit[0]===e.target[0]&&exit[1]===e.target[1]};});
}
export function initPuzzles(G){
 let rig=null,rigCanvas=null,rigFrame=null,rigTextures=new Set();
 const tx=(a,b)=>G.t(a,b);
 function getRig(parent){
  if(!rig){
   // CSS geometry must not depend on the changing framebuffer dimensions.
   rigFrame=document.createElement('div');rigFrame.className='relief-viewport';
   rigCanvas=canvas(1280,720);rigCanvas.className='puzzle-canvas';
   rigFrame.append(rigCanvas);rig=new Renderer(rigCanvas);
  }
  parent.append(rigFrame);return rig;
 }
 function addTexture(id,color,height){if(rigTextures.has(id))return;rig.add(id,color,heightNormal(height,7));rigTextures.add(id);}
 function controls(parent,{angle=225,z=38,onChange=()=>{}}={}){
  const div=document.createElement('div');div.className='puzzle-tools';div.innerHTML='<label>'+tx('Ángulo','Angle')+' <input aria-label="'+tx('Ángulo de la luz','Light angle')+'" id="light-angle" type="range" min="0" max="360" value="'+angle+'"></label><label>'+tx('Altura','Height')+' <input aria-label="'+tx('Altura de la luz','Light height')+'" id="light-height" type="range" min="18" max="200" value="'+z+'"></label><span class="small" id="grazing-status"></span>';parent.append(div);const settings={angle,z};div.querySelectorAll('input').forEach(input=>input.oninput=()=>{settings.angle=+div.querySelector('#light-angle').value;settings.z=+div.querySelector('#light-height').value;onChange(settings);});return settings;
 }
 function startRig(id,settings){G.setTick(()=>{const a=settings.angle*Math.PI/180;rig.begin([{p:[640+Math.cos(a)*540,360+Math.sin(a)*285,settings.z],c:[7.5,4.9,2.1],r:1450},{p:[1200,50,80],c:[.18,.45,.8],r:1400},{p:[0,0,1],c:[0,0,0],r:1},{p:[0,0,1],c:[0,0,0],r:1}],[.20,.23,.30],1.25);rig.draw(id,[0,0,1280,720],{spec:.3});rig.end();const status=G.$('grazing-status');if(status)status.textContent=settings.z<65?tx('Luz rasante: relieve visible','Grazing light: relief visible'):tx('Luz frontal: poco contraste de relieve','Frontal light: low relief contrast');});}
 function relief(){
  const p=G.modal(tx('Cuatro sellos. Una caída.','Four seals. One fall.'),'<p class="clue">'+tx('El pigmento es idéntico. Cambia el ángulo y la altura de la luz para leer el metal, no su color.','The pigment is identical. Change the angle and height of the light to read the metal, not its colour.')+'</p>',true);
  getRig(p);const id='seals';if(!rigTextures.has(id)){
   const a=canvas(1280,720),c=a.getContext('2d'),h=heightField(1280,720),d=h.getContext('2d');seededTexture(c,1280,720,'#544737');
   c.strokeStyle='#a18855';c.lineWidth=4;c.strokeRect(26,26,1228,668);
   for(let i=0;i<4;i++){const x=202+i*293,y=351;const notch=[Math.PI,Math.PI/2,0,-Math.PI/2][i];
    c.fillStyle='#64563f';c.beginPath();c.arc(x,y,113,0,circle);c.fill();c.fillStyle='#2c251b';c.font='26px Georgia';c.textAlign='center';c.fillText(String.fromCharCode(65+i),x,571);
    d.strokeStyle='#999';d.lineWidth=16;d.beginPath();d.arc(x,y,97,notch+.12,notch+circle-.12);d.stroke();
    d.strokeStyle='#a7a7a7';d.lineWidth=10;d.beginPath();d.moveTo(x-43,y+38);d.lineTo(x-43,y-20);d.lineTo(x,y-59);d.lineTo(x+43,y-20);d.lineTo(x+43,y+38);d.closePath();d.stroke();d.beginPath();d.moveTo(x-12,y+38);d.lineTo(x-12,y+8);d.lineTo(x+12,y+8);d.lineTo(x+12,y+38);d.stroke();
    for(const yy of [72,650]){c.fillStyle='#847458';c.beginPath();c.arc(x,yy,6,0,circle);c.fill();d.fillStyle='#aaa';d.beginPath();d.arc(x,yy,6,0,circle);d.fill();}
   }
   addTexture(id,a,h);
  }
  const settings=controls(p,{angle:225,z:130});startRig(id,settings);
  const row=document.createElement('div');row.className='row';for(let i=0;i<4;i++)row.append(G.button(tx('Tomar calco ','Take rubbing ')+String.fromCharCode(65+i),()=>{
   if(i!==1){G.note(tx('La rotura no coincide con la caída que recuerda Celso.','The break does not match the fall Celso remembers.'));return;}
   G.add('calco');G.remember('rubbing');G.closeModal();G.say('Bagheera',tx('La muesca está abajo. Un desperfecto se convierte en prueba de autenticidad. Debo de estar ganando valor con los años.','The nick is at the bottom. Damage becomes proof of authenticity. I must be gaining value with age.'));
  }));p.append(row);const q=document.createElement('p');q.className='small';q.textContent=tx('Las líneas solo están en el mapa de alturas y en sus normales. El color de los cuatro discos es el mismo.','The lines exist only in the height map and its normals. All four discs have the same colour.');p.append(q);
 }
 function contract(){
  const p=G.modal(tx('Un contrato que no cabe en una tinta','A contract that needs two inks'),'<p class="clue">'+tx('Lúa: «Dos tintas fluorescentes, dos bandas. Lee ambas antes de sacar conclusiones».','Lúa: “Two fluorescent inks, two bands. Read both before drawing conclusions.”')+'</p>',true);
  const c=canvas(1100,430);c.className='puzzle-canvas';p.append(c);let band=0;const modes=[tx('Blanca','White'),tx('Ámbar','Amber'),tx('Cian','Cyan')],row=document.createElement('div');row.className='puzzle-tools';let buttons=[];
  function draw(){const d=c.getContext('2d');seededTexture(d,1100,430,'#171e27');d.save();d.translate(550,215);d.rotate(-.012);d.fillStyle='#3c3934';d.fillRect(-455,-175,910,350);d.strokeStyle='#a3967466';d.strokeRect(-434,-154,868,308);d.font='24px Georgia';d.textAlign='center';d.fillStyle='#b6a986';d.fillText(tx('CESIÓN DE SOMBRA · expediente 0/0','SHADOW ASSIGNMENT · file 0/0'),0,-105);
   const lines=band===1?tx(['Cesión voluntaria de la sombra.','Duración: indefinida.','Firma: la sombra de Bagheera.'],['Voluntary assignment of the shadow.','Duration: indefinite.','Signed: Bagheera’s shadow.']):band===2?tx(['Toda cesión puede revisarse en el Archivo.','Ninguna firma sustituye el consentimiento.','Cláusula original: hasta el alba.'],['Every assignment may be reviewed at the Archive.','No signature replaces consent.','Original clause: until dawn.']):tx(['Dos escrituras se pisan.','Una firma legible. Un acuerdo ilegible.','Hace falta separar las bandas.'],['Two writings overlap.','A legible signature. An illegible agreement.','The bands must be separated.']);
   d.font='27px Georgia';d.shadowColor=band===1?'#f0aa48':band===2?'#48c5e4':'transparent';d.shadowBlur=band?10:0;d.fillStyle=band===1?'#f0cc8d':band===2?'#9ee0e2':'#7b7b79';lines.forEach((line,i)=>d.fillText(line,0,-24+i*56));d.restore();buttons.forEach((b,i)=>b.classList.toggle('active',i===band));
  }
  for(let i=0;i<3;i++){const b=G.button(modes[i],()=>{band=i;if(i===1){G.flag('amberRead');G.remember('amber');}if(i===2){G.flag('cyanRead');G.remember('cyan');}draw();update();});buttons.push(b);row.append(b);}p.append(row);const readout=document.createElement('p');readout.className='beam-readout';p.append(readout);const done=G.button(tx('Guardar el contrato','Keep the contract'),()=>{if(!G.state.flags.amberRead||!G.state.flags.cyanRead)return;G.remove('barco');G.add('contrato');G.closeModal();G.say('Bagheera',tx('Voluntaria no significa irrevocable. Y alguien cambió la duración. Celso tendrá que dejarme revisar el original.','Voluntary does not mean irrevocable. And someone changed the duration. Celso will have to let me review the original.'));},'primary');p.append(done);
  function update(){const n=Number(!!G.state.flags.amberRead)+Number(!!G.state.flags.cyanRead);readout.textContent=tx('Bandas leídas: ','Bands read: ')+n+'/2';done.disabled=n!==2;}draw();update();
 }
 function ledger(){
  const p=G.modal(tx('La presión no se borra','Pressure cannot be erased'),'<p class="clue">'+tx('Una escritura atraviesa las tres hojas con profundidad 3 → 2 → 1. Una escritura posterior en una copia rompe esa progresión. Ilumina los surcos de calibración.','One writing passes through the three sheets at depths 3 → 2 → 1. Writing again on a copy breaks that progression. Illuminate the calibration grooves.')+'</p>',true);
  getRig(p);const id='ledger-'+G.state.language;
  if(!rigTextures.has(id)){
   const a=canvas(1280,720),c=a.getContext('2d'),h=heightField(1280,720),d=h.getContext('2d');seededTexture(c,1280,720,'#292526');
   for(let i=0;i<3;i++){const x=72+i*403;seededTextureLocal(c,x,92,334,529,'#948269',i+1);c.fillStyle='#3c3029';c.font='32px Georgia';c.textAlign='center';c.fillText(['A · '+tx('Original','Original'),'B · '+tx('Archivo','Archive'),'C · '+tx('Recibo','Receipt')][i],x+167,158);c.font='21px Georgia';c.fillText(i===1?tx('Duración: indefinida','Duration: indefinite'):tx('Duración: hasta el alba','Duration: until dawn'),x+167,225);c.font='italic 24px Georgia';c.fillText(tx('La sombra de Bagheera','Bagheera’s shadow'),x+167,278);c.strokeStyle='#51453744';for(let y=330;y<501;y+=32){c.beginPath();c.moveTo(x+27,y);c.lineTo(x+306,y);c.stroke();}
    c.font='17px Georgia';c.fillStyle='#4b3d2e';c.fillText(tx('Marcas del estilete','Stylus marks'),x+167,368);
    const count=[3,3,1][i];d.strokeStyle=i===2?'#858585':'#bcbcbc';d.lineWidth=10;d.lineCap='round';for(let n=0;n<count;n++){d.beginPath();d.moveTo(x+114+n*39,410);d.lineTo(x+105+n*39,474);d.stroke();}
    // The pressure numeral and marks are relief, not a colour printed on the page.
    d.fillStyle=i===2?'#858585':'#bcbcbc';d.font='44px Georgia';d.textAlign='center';d.fillText(String(count),x+167,553);
   }addTexture(id,a,h);
  }
  const settings=controls(p,{angle:160,z:140});startRig(id,settings);let chosen=null,reason=null;
  const controlsRow=document.createElement('div');controlsRow.className='puzzle-tools';for(let i=0;i<3;i++)controlsRow.append(G.button(tx('Acusar copia ','Accuse copy ')+['A','B','C'][i],e=>{chosen=i;[...controlsRow.children].forEach((b,j)=>b.classList.toggle('active',j===i));}));p.append(controlsRow);
  const reasons=document.createElement('div');reasons.className='row';const labels=[tx('Tiene una firma distinta.','It has a different signature.'),tx('Recibió una segunda escritura.','It was written on a second time.'),tx('La hoja más débil es falsa.','The faintest sheet is forged.')];labels.forEach((l,i)=>reasons.append(G.button(l,()=>{reason=i;[...reasons.children].forEach((b,j)=>b.classList.toggle('active',j===i));})));p.append(reasons);
  const submit=G.button(tx('Construir la prueba','Build the evidence'),()=>{if(chosen===null||reason===null)return G.note(tx('Elige una copia y una explicación.','Choose a copy and an explanation.'));if(chosen!==1||reason!==1)return G.note(tx('Esa explicación no encaja con las marcas de presión de las tres hojas.','That explanation does not fit the pressure marks on all three sheets.'));G.add('prueba');G.remember('fraud');G.closeModal();G.say('Bagheera',tx('Tres, tres, uno. B no recibió solo el trazo que la atravesó: alguien escribió encima.\nLa duración se cambió en la copia del archivo. Ofelia tiene algo que contar.','Three, three, one. B did not just receive the stroke that passed through it: someone wrote on it.\nThe duration was changed on the archive copy. Ofelia has something to tell me.'));},'primary');submit.style.marginTop='16px';p.append(submit);
 }
 function seededTextureLocal(ctx,x,y,w,h,base,seed){ctx.fillStyle=base;ctx.fillRect(x,y,w,h);let s=seed;for(let i=0;i<3000;i++){s=(s*1664525+1013904223)>>>0;const xx=s%w;s=(s*1664525+1013904223)>>>0;const yy=s%h;ctx.fillStyle=i%2?'#ffffff0b':'#0000000b';ctx.fillRect(x+xx,y+yy,2,1);}}
 function mirrors(){
  const p=G.modal(tx('No es una contraseña. Es un camino.','Not a password. A path.'),'<p class="clue">'+tx('El prisma exige tres testigos: rojo al oeste-centro, verde al este-centro y azul al norte-oeste. Pulsa un espejo para cambiar su diagonal. Los haces se recalculan, no se memorizan.','The prism requires three witnesses: red west-centre, green east-centre, blue north-west. Click a mirror to change its diagonal. Beams are recalculated, not matched against a password.')+'</p>',true);
  const c=canvas(1000,540);c.className='puzzle-canvas';c.setAttribute('aria-label',tx('Matriz óptica. Hay nueve botones de espejo después del lienzo.','Optical matrix. Nine mirror buttons follow this canvas.'));p.append(c);const base=canvas(1000,540);seededTexture(base.getContext('2d'),1000,540,'#141b27');
  const gx=385,gy=145,step=106,palette={r:'#ff886b',g:'#97e9b4',b:'#8bd4ff'},names={r:tx('ROJO','RED'),g:tx('VERDE','GREEN'),b:tx('AZUL','BLUE')};let rays=traceRays(G.state.mirrors);
  const readout=document.createElement('p');readout.className='beam-readout';readout.setAttribute('aria-live','polite');p.append(readout);
  const accessible=document.createElement('div');accessible.className='row';const aButtons=[];for(let i=0;i<9;i++){const b=G.button('',()=>turn(i));b.style.padding='4px 8px';b.style.fontSize='12px';b.setAttribute('aria-label',tx('Girar espejo ','Rotate mirror ')+(i+1));aButtons.push(b);accessible.append(b);}p.append(accessible);
  const submit=G.button(tx('Abrir el canal de declaración','Open the testimony channel'),()=>{if(!rays.every(r=>r.correct))return G.note(tx('Todavía no llegan los tres haces a sus testigos.','All three beams must reach their witnesses.'));G.flag('beams');G.closeModal();G.say('La cápsula',tx('«¿Me oyes? Esta vez, antes de rescatarme, ¿podemos hablar?»','“Can you hear me? This time, before rescuing me, could we talk?”'));G.ui();},'primary');submit.style.marginTop='16px';p.append(submit);
  function update(){rays=traceRays(G.state.mirrors);const n=rays.filter(r=>r.correct).length;readout.textContent=tx('Testigos iluminados: ','Witnesses lit: ')+n+'/3 · '+rays.map(r=>names[r.color]+' '+(r.correct?'✓':'—')).join('   ');submit.disabled=n!==3;aButtons.forEach((b,i)=>b.textContent=(i+1)+' '+(G.state.mirrors[i]===0?'/':'\\'));}
  function turn(i){G.state.mirrors[i]=1-G.state.mirrors[i];G.save();update();draw(performance.now());}
  c.addEventListener('click',e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)*1000/r.width,y=(e.clientY-r.top)*540/r.height;const col=Math.round((x-gx)/step),row=Math.round((y-gy)/step);if(col<0||col>2||row<0||row>2)return;if(Math.abs(x-(gx+col*step))>40||Math.abs(y-(gy+row*step))>40)return;turn(row*3+col);});
  function draw(now){const d=c.getContext('2d');d.drawImage(base,0,0);const shine=d.createRadialGradient(488,254,40,488,254,310);shine.addColorStop(0,'#614b3633');shine.addColorStop(1,'#141b2700');d.fillStyle=shine;d.fillRect(0,0,1000,540);d.strokeStyle='#be99605e';d.lineWidth=2;d.strokeRect(gx-62,gy-62,step*2+124,step*2+124);
   for(let row=0;row<3;row++)for(let col=0;col<3;col++){const x=gx+col*step,y=gy+row*step;d.strokeStyle='#957442';d.lineWidth=3;d.fillStyle='#232d3b';d.beginPath();d.arc(x,y,35,0,circle);d.fill();d.stroke();d.fillStyle='#665333';d.beginPath();d.arc(x-25,y+25,3,0,circle);d.fill();}
   for(const r of rays){const color=palette[r.color];d.save();d.globalCompositeOperation='screen';d.strokeStyle=color;d.shadowColor=color;d.shadowBlur=18;d.lineWidth=3;d.beginPath();r.path.forEach(([x,y],i)=>{const xx=gx+x*step,yy=gy+y*step;i?d.lineTo(xx,yy):d.moveTo(xx,yy);});d.stroke();d.shadowBlur=0;d.globalAlpha=.12;d.lineWidth=14;d.stroke();d.globalAlpha=1;const a=(now/550)%Math.max(1,r.path.length-1),k=Math.floor(a),f=a-k,p0=r.path[k],p1=r.path[Math.min(k+1,r.path.length-1)];d.fillStyle='#fff';d.beginPath();d.arc(gx+(p0[0]+(p1[0]-p0[0])*f)*step,gy+(p0[1]+(p1[1]-p0[1])*f)*step,3,0,circle);d.fill();d.restore();
    const [sx,sy]=r.start;d.fillStyle=color;d.beginPath();d.arc(gx+sx*step,gy+sy*step,8,0,circle);d.fill();d.font='12px system-ui';d.textAlign=sx<0?'right':'center';d.fillText(names[r.color]+' →',gx+sx*step-(sx<0?17:0),gy+sy*step-(sx<0?-4:18));
    const [ex,ey]=r.target,x=gx+ex*step,y=gy+ey*step;d.strokeStyle=color;d.lineWidth=2;d.fillStyle=r.correct?color:'#141b27';d.beginPath();d.arc(x,y,13,0,circle);d.fill();d.stroke();d.textAlign=ex<0?'right':ex>2?'left':'center';d.fillStyle=color;d.fillText('◎ '+names[r.color],x+(ex<0?-22:ex>2?22:0),y+(ey<0?-21:5));
   }
   for(let i=0;i<9;i++){const x=gx+(i%3)*step,y=gy+Math.floor(i/3)*step,slash=G.state.mirrors[i]===0;d.save();d.translate(x,y);d.rotate(slash?-Math.PI/4:Math.PI/4);const g=d.createLinearGradient(0,-5,0,5);g.addColorStop(0,'#f8edd7');g.addColorStop(.3,'#d5e6ee');g.addColorStop(1,'#52738c');d.fillStyle=g;d.fillRect(-30,-4,60,8);d.restore();d.font='11px system-ui';d.textAlign='center';d.fillStyle='#a6b0bc';d.fillText(String(i+1),x,y+49);}
   d.font='14px Georgia';d.fillStyle='#aeb5be';d.textAlign='center';d.fillText(tx('La luz no necesita que le digas adónde va. Necesita que le dejes un camino.','Light does not need to be told where to go. It needs a path.'),500,507);
  }
  update();draw(0);G.setTick(draw);
 }
 return {relief,contract,ledger,mirrors};
}
