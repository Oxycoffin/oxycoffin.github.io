(()=>{
'use strict';
const E=window.TidefoldEngine;
if(!E) throw new Error('TidefoldEngine unavailable');
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const T={
  es:{lumen:'Lumen',coral:'Coral',hint:'Pista',history:'Historial',newGame:'Nueva',rules:'Reglas',settings:'Ajustes',seed:'SIEMBRA',seedDetail:'elige una cámara vacía',fold:'PLIEGA',foldDetail:'elige una corriente',yourTurn:'Tu turno · siembra una célula',chooseFold:'Célula sembrada · elige un pliegue sobre los anillos',ai:'La corriente rival está calculando…',win:'Floración triple · has ganado',lose:'Coral alcanzó tres floraciones',draw:'El campo queda en equilibrio',hintReady:'Pista marcada en el campo',undo:'Turno anterior restaurado',noUndo:'Nada que deshacer',innerCW:'Interior ↻ · Medio ↺',innerCCW:'Interior ↺ · Medio ↻',outerCW:'Medio ↻ · Exterior ↺',outerCCW:'Medio ↺ · Exterior ↻'},
  en:{lumen:'Lumen',coral:'Coral',hint:'Hint',history:'History',newGame:'New',rules:'Rules',settings:'Settings',seed:'SEED',seedDetail:'choose an empty chamber',fold:'FOLD',foldDetail:'choose a current',yourTurn:'Your turn · seed a cell',chooseFold:'Cell seeded · choose a fold on the rings',ai:'The rival current is calculating…',win:'Third bloom · you win',lose:'Coral reached three blooms',draw:'The field settles in balance',hintReady:'Hint marked on the field',undo:'Previous turn restored',noUndo:'Nothing to undo',innerCW:'Inner ↻ · Middle ↺',innerCCW:'Inner ↺ · Middle ↻',outerCW:'Middle ↻ · Outer ↺',outerCCW:'Middle ↺ · Outer ↻'}
};
let lang=(localStorage.getItem('tidefold.lang')||((navigator.language||'es').toLowerCase().startsWith('en')?'en':'es'));
let difficulty=localStorage.getItem('tidefold.difficulty')||'current';
let sound=localStorage.getItem('tidefold.sound')!=='off';
let starter=localStorage.getItem('tidefold.starter')||'human';
let state=E.initial(starter==='human'?E.LUMEN:E.CORAL);
let pending=null, busy=false, moveLog=[], stateHistory=[], hintMove=null, previewMove=null, audioCtx=null;
try{const saved=JSON.parse(localStorage.getItem('tidefold.state')||'null');if(saved&&Array.isArray(saved.board)&&saved.board.length===21&&!E.terminal(saved))state=saved}catch{}

const ringEls=[$('#ring0'),$('#ring1'),$('#ring2')], shell=$('#boardShell');
function tr(key){return T[lang][key]||key}
function polar(ring,sector){
  const radii=[.22,.36,.50]; const a=(-90+sector*(360/E.SECTORS))*Math.PI/180; const rr=radii[ring]*100;
  return {x:50+Math.cos(a)*rr,y:50+Math.sin(a)*rr,angle:-90+sector*(360/E.SECTORS)};
}
function buildSpokes(){const el=$('#spokes');el.innerHTML='';for(let s=0;s<E.SECTORS;s++){const i=document.createElement('i');i.className='spoke';i.style.transform=`translate(-50%,-100%) rotate(${s*360/E.SECTORS}deg)`;el.append(i)}}
function buildBoard(){
  ringEls.forEach((ringEl,r)=>{ringEl.innerHTML='';for(let s=0;s<E.SECTORS;s++){const i=E.idx(r,s),p=polar(r,s),b=document.createElement('button');b.type='button';b.className='cell';b.dataset.index=i;b.style.setProperty('--x',p.x+'%');b.style.setProperty('--y',p.y+'%');b.setAttribute('aria-label',`R${r+1} S${s+1}`);b.addEventListener('click',()=>selectCell(i));ringEl.append(b)}})
}
function organism(player,extra=''){const o=document.createElement('span');o.className='organism '+(player===E.CORAL?'coral ':'')+extra;return o}
function boardForRender(){if(pending!==null){const b=state.board.slice();b[pending]=E.LUMEN;return b}return state.board}
function renderBoard(board=boardForRender()){
  $$('.cell').forEach(cell=>{
    const i=+cell.dataset.index,v=board[i];cell.className='cell';cell.innerHTML='';
    if(!busy&&state.turn===E.LUMEN&&pending===null&&!v)cell.classList.add('selectable');
    if(pending===i)cell.classList.add('pending');
    if(v)cell.append(organism(v,pending===i?'pending':''));
    if(hintMove&&hintMove.place===i&&!v){const mark=organism(E.LUMEN,'hint');cell.append(mark)}
  });
  shell.classList.toggle('awaiting-fold',pending!==null&&!busy);
  $('#coreLabel').textContent=pending!==null?tr('fold'):tr('seed');$('#coreDetail').textContent=pending!==null?tr('foldDetail'):tr('seedDetail');
}
function render(){
  $('#humanScore').textContent=state.scores[0];$('#aiScore').textContent=state.scores[1];$('#undoButton').disabled=!stateHistory.length||busy;
  $$('[data-i18n]').forEach(el=>el.textContent=tr(el.dataset.i18n));
  const end=E.terminal(state);
  $('#statusPill').classList.toggle('ai',busy||state.turn===E.CORAL);
  if(end){$('#statusText').textContent=end.winner===E.LUMEN?tr('win'):end.winner===E.CORAL?tr('lose'):tr('draw')}
  else if(busy||state.turn===E.CORAL)$('#statusText').textContent=tr('ai');
  else $('#statusText').textContent=pending!==null?tr('chooseFold'):tr('yourTurn');
  renderBoard();save();
}
function save(){localStorage.setItem('tidefold.state',JSON.stringify(state));localStorage.setItem('tidefold.lang',lang);localStorage.setItem('tidefold.difficulty',difficulty);localStorage.setItem('tidefold.sound',sound?'on':'off');localStorage.setItem('tidefold.starter',starter)}
function beep(kind='move'){if(!sound)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);o.type=kind==='bloom'?'triangle':'sine';o.frequency.value=kind==='bloom'?620:kind==='fold'?240:360;g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.12);o.start();o.stop(audioCtx.currentTime+.13)}catch{}}
function toast(msg){const e=$('#toast');e.textContent=msg;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1500)}
function selectCell(i){if(busy||state.turn!==E.LUMEN||E.terminal(state)||state.board[i])return;pending=i;hintMove=null;previewMove=null;clearPreview();beep();render()}
function clearPreview(){shell.classList.remove('has-preview');$$('.fold-control').forEach(b=>b.classList.remove('preview'));$('#ghostLayer').innerHTML='';$('#foldCaption').textContent='';$('#arrowA').className='direction-arrow';$('#arrowB').className='direction-arrow'}
function previewFold(move,button){if(pending===null||busy)return;clearPreview();previewMove=move;button.classList.add('preview');shell.classList.add('has-preview');const text=move.seam===0?(move.dir===1?tr('innerCW'):tr('innerCCW')):(move.dir===1?tr('outerCW'):tr('outerCCW'));$('#foldCaption').textContent=text;
  const a=$('#arrowA'),b=$('#arrowB'); const rings=move.seam===0?[0,1]:[1,2]; const dirs=[move.dir,-move.dir]; [a,b].forEach((el,k)=>{el.className='direction-arrow '+(dirs[k]===1?'cw':'ccw');el.dataset.arrow=dirs[k]===1?'↻':'↺';const d=[30,58,86][rings[k]];el.style.width=d+'%';el.style.height=d+'%'});
  const placed=state.board.slice();placed[pending]=E.LUMEN;const folded=E.fold(placed,move.seam,move.dir);const gl=$('#ghostLayer');for(let i=0;i<folded.length;i++){if(!folded[i])continue;const {ring,sector}=E.coords(i),p=polar(ring,sector),g=document.createElement('i');g.className='ghost '+(folded[i]===E.LUMEN?'lumen':'coral');g.style.left=p.x+'%';g.style.top=p.y+'%';gl.append(g)}
}
$$('.fold-control').forEach(btn=>{const move=()=>({place:pending,seam:+btn.dataset.seam,dir:+btn.dataset.dir});btn.addEventListener('pointerenter',()=>pending!==null&&previewFold(move(),btn));btn.addEventListener('focus',()=>pending!==null&&previewFold(move(),btn));btn.addEventListener('pointerdown',()=>pending!==null&&previewFold(move(),btn));btn.addEventListener('pointerleave',()=>{if(!busy)clearPreview()});btn.addEventListener('click',()=>{if(pending===null||busy)return;commitHuman(move())})});
function rotationsFor(move){return move.seam===0?[move.dir,-move.dir,0]:[0,move.dir,-move.dir]}
function animateBloom(list){const layer=$('#bloomLayer');layer.innerHTML='';for(const b of list){const ray=document.createElement('i');ray.className='bloom-ray';ray.style.setProperty('--angle',`${b.sector*360/E.SECTORS}deg`);layer.append(ray)}if(list.length)beep('bloom');setTimeout(()=>layer.innerHTML='',650)}
async function animateTransition(t,hadPending=false){
  clearPreview();busy=true; shell.classList.remove('awaiting-fold');
  if(!hadPending){renderBoard(t.placed.board);await wait(230)}
  const rots=rotationsFor(t.move),step=360/E.SECTORS;ringEls.forEach((el,r)=>el.style.transform=`rotate(${rots[r]*step}deg)`);beep('fold');await wait(450);
  ringEls.forEach(el=>{el.style.transition='none';el.style.transform='rotate(0deg)'});renderBoard(t.folded.board);void shell.offsetWidth;ringEls.forEach(el=>el.style.transition='');
  animateBloom(t.blooms);await wait(t.blooms.length?480:120);
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function commitHuman(move){
  stateHistory.push({state:E.clone(state),log:moveLog.slice()}); const t=E.transition(state,move);await animateTransition(t,true);state=t.state;moveLog.push({player:E.LUMEN,move,blooms:t.blooms.length});pending=null;busy=false;render();if(!E.terminal(state))setTimeout(aiTurn,260)
}
function seededRng(seed){let x=seed>>>0||123456789;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1000000)/1000000}}
function rollout(start,rootPlayer,rng,max=10){let s=E.clone(start);for(let d=0;d<max&&!E.terminal(s);d++){const ranked=E.rankMoves(s,s.turn,10);let m;if(ranked.length&&rng()<.72)m=ranked[Math.floor(rng()*Math.min(4,ranked.length))].move;else m=E.randomMove(s,rng);if(!m)break;s=E.transition(s,m).state}const end=E.terminal(s);if(end)return end.winner===rootPlayer?1:end.winner===0?.5:0;const v=E.evaluate(s,rootPlayer);return 1/(1+Math.exp(-v/90))}
async function chooseAI(){
  const ranked=E.rankMoves(state,E.CORAL,difficulty==='drift'?12:difficulty==='abyss'?24:18);if(!ranked.length)return null;if(difficulty==='drift')return ranked[Math.floor(Math.random()*Math.min(5,ranked.length))].move;
  const candidates=ranked.slice(0,difficulty==='abyss'?10:7);const rng=seededRng(state.ply*991+state.scores[0]*31+state.scores[1]*47+17);let best=candidates[0].move,bestScore=-Infinity;const sims=difficulty==='abyss'?28:12;
  for(const c of candidates){const first=E.transition(state,c.move).state;let total=c.value/180;for(let i=0;i<sims;i++)total+=rollout(first,E.CORAL,rng,difficulty==='abyss'?14:9);if(total>bestScore){bestScore=total;best=c.move}await wait(0)}return best;
}
async function aiTurn(){if(busy||state.turn!==E.CORAL||E.terminal(state))return;busy=true;render();const before=E.clone(state),move=await chooseAI();if(!move){busy=false;render();return}stateHistory.push({state:before,log:moveLog.slice()});const t=E.transition(state,move);await animateTransition(t,false);state=t.state;moveLog.push({player:E.CORAL,move,blooms:t.blooms.length});busy=false;render()}
function undo(){if(busy||!stateHistory.length){toast(tr('noUndo'));return}let snap=stateHistory.pop();while(snap&&snap.state.turn!==E.LUMEN&&stateHistory.length)snap=stateHistory.pop();if(!snap)return;state=E.clone(snap.state);moveLog=snap.log.slice();pending=null;hintMove=null;busy=false;render();toast(tr('undo'))}
async function hint(){if(busy||state.turn!==E.LUMEN||pending!==null)return;const best=E.rankMoves(state,E.LUMEN,1)[0];if(!best)return;hintMove=best.move;renderBoard();toast(tr('hintReady'));setTimeout(()=>{if(hintMove===best.move){hintMove=null;renderBoard()}},3500)}
function newGame(first=starter){starter=first;state=E.initial(first==='human'?E.LUMEN:E.CORAL);pending=null;busy=false;moveLog=[];stateHistory=[];hintMove=null;clearPreview();render();closeSheet();if(state.turn===E.CORAL)setTimeout(aiTurn,350)}
function openSheet(kind){
  const sheet=$('#sheet'),body=$('#sheetBody');$('#sheetBackdrop').hidden=false;sheet.hidden=false;body.innerHTML='';
  const es=lang==='es'; const titleMap={menu:'TIDEFOLD',rules:es?'Reglas rápidas':'Quick rules',history:es?'Historial':'History',settings:es?'Ajustes':'Settings',about:es?'Cuaderno de campo':'Field notes'};$('#sheetTitle').textContent=titleMap[kind]||'TIDEFOLD';
  if(kind==='rules')body.innerHTML=rulesHTML(es); else if(kind==='history')body.innerHTML=historyHTML(es); else if(kind==='settings')body.innerHTML=settingsHTML(es); else if(kind==='about')body.innerHTML=aboutHTML(es); else body.innerHTML=menuHTML(es); bindSheet(kind)
}
function closeSheet(){$('#sheet').hidden=true;$('#sheetBackdrop').hidden=true}
function menuHTML(es){return `<div class="rule-grid"><button class="rule-card sheet-link" data-open="rules"><b>${es?'Cómo se juega':'How to play'}</b><p>${es?'Reglas y objetivo en menos de un minuto.':'Rules and objective in under a minute.'}</p></button><button class="rule-card sheet-link" data-open="history"><b>${es?'Historial de esta partida':'Game history'}</b><p>${moveLog.length} ${es?'jugadas registradas':'moves logged'}.</p></button><button class="rule-card sheet-link" data-open="settings"><b>${es?'Ajustes':'Settings'}</b><p>${es?'IA, sonido, idioma y quién empieza.':'AI, sound, language and first player.'}</p></button><button class="rule-card sheet-link" data-open="about"><b>${es?'Cuaderno de campo':'Field notes'}</b><p>${es?'Referencias de diseño e investigación.':'Design and research references.'}</p></button></div>`}
function rulesHTML(es){return `<div class="rule-grid"><div class="rule-card"><b>01 · ${es?'Siembra':'Seed'}</b><p>${es?'Coloca una célula Lumen en cualquier cámara vacía.':'Place one Lumen cell in any empty chamber.'}</p></div><div class="rule-card"><b>02 · ${es?'Pliega':'Fold'}</b><p>${es?'Elige uno de los cuatro controles incrustados en los anillos. El par de flechas enseña exactamente qué dos corrientes giran y en qué sentido.':'Choose one of the four controls embedded in the rings. The paired arrows show exactly which currents rotate and in which direction.'}</p></div><div class="rule-card"><b>03 · ${es?'Florece':'Bloom'}</b><p>${es?'Tres organismos iguales en un mismo radio florecen, puntúan y desaparecen. Todas las floraciones se resuelven a la vez.':'Three matching organisms on one spoke bloom, score and disappear. All blooms resolve at once.'}</p></div><div class="rule-card"><b>04 · ${es?'Gana':'Win'}</b><p>${es?'Primero en alcanzar tres floraciones.':'First to three blooms.'}</p></div></div>`}
function historyHTML(es){if(!moveLog.length)return `<p>${es?'Todavía no hay movimientos.':'No moves yet.'}</p>`;return `<div class="history-list">${moveLog.map((m,i)=>{const c=E.coords(m.move.place);const fold=m.move.seam===0?(m.move.dir===1?'I↻ M↺':'I↺ M↻'):(m.move.dir===1?'M↻ O↺':'M↺ O↻');return `<div class="history-row"><b>${String(i+1).padStart(2,'0')} · ${m.player===E.LUMEN?'LUMEN':'CORAL'}${m.blooms?' · ✦ '+m.blooms:''}</b><span>R${c.ring+1}/S${c.sector+1} · ${fold}</span></div>`}).join('')}</div>`}
function settingsHTML(es){return `<div class="setting-grid"><div class="setting-card"><label>${es?'Dificultad IA':'AI difficulty'}</label><div class="segmented" data-setting="difficulty"><button data-v="drift" class="${difficulty==='drift'?'active':''}">${es?'Deriva':'Drift'}</button><button data-v="current" class="${difficulty==='current'?'active':''}">${es?'Corriente':'Current'}</button><button data-v="abyss" class="${difficulty==='abyss'?'active':''}">${es?'Abismo':'Abyss'}</button></div></div><div class="setting-card"><label>${es?'Sonido':'Sound'}</label><button class="switch ${sound?'on':''}" id="soundToggle" type="button" aria-label="Sound"></button></div><div class="setting-card"><label>${es?'Idioma':'Language'}</label><div class="segmented" data-setting="lang"><button data-v="es" class="${lang==='es'?'active':''}">ES</button><button data-v="en" class="${lang==='en'?'active':''}">EN</button></div></div><div class="setting-card"><label>${es?'Empieza':'First move'}</label><div class="segmented" data-setting="starter"><button data-v="human" class="${starter==='human'?'active':''}">${es?'Tú':'You'}</button><button data-v="ai" class="${starter==='ai'?'active':''}">IA</button></div></div></div>`}
function aboutHTML(es){return `<p>${es?'TIDEFOLD se diseñó como un objeto oceanográfico vivo: geometría radial inspirada en ilustración científica marina, falso color, fósforo de sónar y controles que pertenecen físicamente al campo en lugar de vivir en un panel separado.':'TIDEFOLD is designed as a living oceanographic instrument: radial geometry inspired by scientific marine illustration, false colour, sonar phosphor and controls that physically belong to the field instead of a separate panel.'}</p><h3>${es?'Principios usados':'Design principles'}</h3><div class="rule-grid"><div class="rule-card"><b>Autonomy + competence</b><p>${es?'Pocas decisiones, consecuencias visibles y control directo.':'Few decisions, visible consequences and direct control.'}</p></div><div class="rule-card"><b>Uncertainty mastery</b><p>${es?'Las cuatro transformaciones son inspeccionables, pero la respuesta rival mantiene la tensión.':'All four transformations can be inspected while the rival response preserves tension.'}</p></div><div class="rule-card"><b>MDA</b><p>${es?'La contrarrotación no es una animación decorativa: es simultáneamente regla, dinámica y estética.':'Counter-rotation is not decorative animation: it is rule, dynamic and aesthetic at once.'}</p></div></div><h3>${es?'Fuentes':'Sources'}</h3><div class="source-grid"><a target="_blank" rel="noreferrer" href="https://ocean.si.edu/ocean-life/invertebrates/art-forms-nature-marine-species-ernst-haeckel">Smithsonian Ocean · Ernst Haeckel</a><a target="_blank" rel="noreferrer" href="https://www.lri.fr/~sebag/Examens_2008/UCT_ecml06.pdf">Kocsis & Szepesvári · UCT</a><a target="_blank" rel="noreferrer" href="https://pure.ewha.ac.kr/en/publications/the-motivational-pull-of-video-games-a-self-determination-theory-/">Ryan, Rigby & Przybylski · Self-determination</a><a target="_blank" rel="noreferrer" href="https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.924953/full">Frontiers · Uncertainty and enjoyment</a><a target="_blank" rel="noreferrer" href="https://storage.ghost.io/c/25/84/2584b75d-4bd6-4cce-8259-f1d1c65abbb5/content/files/~hunicke/mda.pdf">Hunicke, LeBlanc & Zubek · MDA</a><a target="_blank" rel="noreferrer" href="https://perfect-pentago.net/details.html">Pentago · placement + board transformation</a></div>`}
function bindSheet(kind){$$('.sheet-link').forEach(b=>b.onclick=()=>openSheet(b.dataset.open));$$('[data-setting] button').forEach(b=>b.onclick=()=>{const group=b.closest('[data-setting]').dataset.setting,v=b.dataset.v;if(group==='difficulty')difficulty=v;if(group==='lang'){lang=v;render()}if(group==='starter'){starter=v;newGame(v);return}save();openSheet('settings')});const st=$('#soundToggle');if(st)st.onclick=()=>{sound=!sound;save();openSheet('settings')}}
$('#sheetClose').onclick=closeSheet;$('#sheetBackdrop').onclick=closeSheet;$('#menuButton').onclick=()=>openSheet('menu');$('#brandButton').onclick=()=>openSheet('about');$('#rulesButton').onclick=()=>openSheet('rules');$('#historyButton').onclick=()=>openSheet('history');$('#settingsButton').onclick=()=>openSheet('settings');$('#undoButton').onclick=undo;$('#hintButton').onclick=hint;$('#newButton').onclick=()=>newGame(starter);
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
buildSpokes();buildBoard();render();if(state.turn===E.CORAL&&!E.terminal(state))setTimeout(aiTurn,450);
})();
