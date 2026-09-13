/* Daily cash count. All money uses CajaCore integer cents; all data stays local. */
(() => {
  'use strict';
  const C=window.CajaCore, A=window.CajaArt, $=s=>document.querySelector(s);
  const K={history:'caja-clara.history.v2',draft:'caja-clara.draft.v2',settings:'caja-clara.settings.v2',lang:'caja-clara.language'};
  const LAST=C.DENOMS.length+3;
  const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let lang='es',view='wizard',history=[],locked=false,settings={},draft,staged=null,pending=null,timer;
  const t=(es,en)=>lang==='es'?es:en;
  const money=n=>new Intl.NumberFormat(lang==='es'?'es-ES':'en-IE',{style:'currency',currency:'EUR'}).format(n/100);
  const grams=n=>new Intl.NumberFormat(lang==='es'?'es-ES':'en-IE',{maximumFractionDigits:3}).format(n);
  const dateText=d=>new Intl.DateTimeFormat(lang==='es'?'es-ES':'en-GB',{dateStyle:'long'}).format(new Date(d+'T12:00:00'));
  const button=(action,label,kind='',extra='')=>`<button type="button" class="button ${kind}" data-action="${action}" ${extra}>${label}</button>`;
  const read=(key,fallback)=>{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw);};
  function storageWarning(){const el=$('#storageWarning');el.hidden=false;el.textContent=t('No se ha podido guardar o leer algún dato. Exporta una copia; no borres el navegador.','Some data could not be saved or read. Export a copy; do not clear the browser.');}
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{storageWarning();return false;}}
  function persist(){return write(K.draft,draft);}
  function storeHistory(next){if(locked){toast(t('El historial original está protegido: recupéralo antes de guardar.','The original history is protected: recover it before saving.'));return false;}if(!write(K.history,next))return false;history=next;return true;}
  function fresh(){return {...C.newDraft(settings),step:1};}
  function boot(){
    try{lang=read(K.lang,'es')==='en'?'en':'es';}catch{storageWarning();}
    try{settings=read(K.settings,{expectedRaw:'350',coinMode:'weight',taras:{}});settings.taras=C.tareMap(settings.taras);}catch{settings={expectedRaw:'350',coinMode:'weight',taras:C.tareMap()};storageWarning();}
    try{const saved=read(K.history,null),rows=saved===null?read('caja-clara.history.v1',[]):saved;if(!Array.isArray(rows))throw Error();history=rows.map(C.migrateRecord);if(saved===null&&rows.length)write(K.history,history);}catch{locked=true;storageWarning();}
    try{
      const saved=read(K.draft,null),old=read('caja-clara.draft.v1',null);
      draft=saved||(old?C.migrateDraft(old):fresh());
      if(!draft||draft.version!==2||!draft.counts||typeof draft.counts!=='object'||Array.isArray(draft.counts))throw Error();
      draft.step=Math.max(1,Math.min(LAST,Math.trunc(Number(draft.step)||1)));
      draft.taras=C.tareMap(draft.taras);draft.coinMode=draft.coinMode==='quantity'?'quantity':'weight';
      if(!C.validDate(draft.date))draft.date=C.localDate();
      delete draft.name;
    }catch{draft=fresh();storageWarning();}
    render();
  }
  function toast(text){clearTimeout(timer);$('#toast').textContent=text;$('#toast').classList.add('show');timer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
  function ask(title,text,action){pending=action;const d=$('#confirmDialog');d.returnValue='cancel';$('#dialogTitle').textContent=title;$('#dialogText').textContent=text;$('#dialogCancel').textContent=t('Cancelar','Cancel');$('#dialogConfirm').textContent=t('Confirmar','Confirm');d.showModal();}
  function err(code){return ({number:t('Revisa el número y sus decimales. No se admiten valores negativos.','Check the number and decimal places. Negative inputs are not allowed.'),'below-tare':t('El peso es menor que la tara de esta cubeta.','Weight is below this tray’s tare.'),envelopes:t('Los sobres superan todo el efectivo contado. Revisa antes de guardar.','Envelopes exceed all counted cash. Check before saving.'),headers:t('El CSV necesita Fecha y Total EUR.','The CSV needs Fecha and Total EUR.'),csv:t('CSV vacío o con comillas incorrectas.','Empty CSV or invalid quotes.'),columns:t('No coincide el número de columnas.','Column count does not match.'),date:t('Fecha no válida en el archivo.','Invalid date in the file.'),inconsistent:t('Los importes y el desglose no coinciden.','Amounts and details do not reconcile.'),'id-conflict':t('ID repetido con otros importes. No se sobrescribe.','ID already has different amounts. Not overwritten.'),record:t('Registro no válido.','Invalid record.')})[code]||t('No se pudo procesar este dato.','This data could not be processed.');}
  function safeTotals(){try{return C.totals(draft);}catch{return null;}}
  function finalDiff(r){return r.difference===null?t('Sin referencia','No reference'):r.difference===0?t('Caja cuadrada','Till balanced'):r.difference>0?t('Sobran ','Surplus ')+money(r.difference):t('Faltan ','Short ')+money(-r.difference);}
  function header(){
    document.documentElement.lang=lang;document.title=t('Caja Clara · Arqueo diario','Caja Clara · Daily cash count');
    $('#description').content=t('Arqueo diario, saldo en directo y sobres. Sin nombres ni cuentas.','Daily cash count, live balance and envelopes. No names or accounts.');
    $('#homeButton').setAttribute('aria-label',t('Caja Clara, volver al recuento','Caja Clara, back to count'));
    $('#historyButton').textContent=t('Historial','History')+(history.length?' · '+history.length:'');
    $('#settingsButton').textContent=t('Ajustes','Settings');$('#languageButton').textContent=lang==='es'?'EN':'ES';
    $('#languageButton').setAttribute('aria-label',lang==='es'?'Switch to English':'Cambiar a español');
    for(const key of ['history','settings'])$('#'+key+'Button').classList.toggle('selected',view===key);
  }
  // The board is outside the scrolling main area and never remounted on keystrokes.
  function board(rebuild=false){
    const r=safeTotals(),done=draft.step===LAST;
    const root=$('#liveBoard');
    root.setAttribute('aria-label',t('Saldo del recuento actual','Current count balance'));
    if(rebuild||!$('#runningTotal'))root.innerHTML=`<div class="balance-top"><span>${t('Saldo de caja','Till balance')}</span><small id="countState"></small></div><output id="runningTotal" aria-live="polite" aria-atomic="true">—</output><div class="balance-equation"><div><span>${t('Contado','Counted')}</span><strong id="grossTotal"></strong></div><button type="button" data-action="edit-pablo"><span>1-Pablo ↗</span><strong id="pabloTotal"></strong></button><button type="button" data-action="edit-victor"><span>2-Victor ↗</span><strong id="victorTotal"></strong></button></div><div class="balance-bottom"><span id="targetLabel"></span><strong id="liveDifference"></strong></div>`;
    const values={'#runningTotal':r?money(r.total):'—','#grossTotal':r?money(r.gross):'—','#pabloTotal':r?money(-r.pablo):'—','#victorTotal':r?money(-r.victor):'—'};
    for(const [selector,value] of Object.entries(values)){
      const el=$(selector),changed=el.textContent!==value;el.textContent=value;
      if(selector==='#runningTotal')el.dataset.cents=r?String(r.total):'';
      if(changed&&!rebuild&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&el.animate){el.getAnimations().forEach(a=>a.cancel());el.animate([{opacity:.65,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:160,easing:'ease-out'});}
    }
    root.classList.toggle('negative',!!r&&r.total<0);root.classList.toggle('balanced',!!r&&r.difference===0);
    $('#countState').textContent=draft.saved?t('Guardado','Saved'):done?t('Resultado','Result'):t('En curso','In progress');
    $('#targetLabel').textContent=r&&r.expected!==null?t('Fondo ','Float ')+money(r.expected):t('Sin fondo de referencia','No reference float');
    $('#liveDifference').textContent=!r?t('Revisa el dato','Check the input'):done?finalDiff(r):r.difference===null?'—':r.difference===0?t('Fondo alcanzado','Float reached'):r.difference<0?t('Hasta el fondo: ','To reach float: ')+money(-r.difference):t('Por encima: ','Above float: ')+money(r.difference);
  }
  function render(focus=false){
    header();document.body.classList.toggle('counting',view==='wizard'&&draft.step<LAST);board(true);
    if(view==='settings')renderSettings();else if(view==='history')renderHistory();else if(draft.step===LAST)renderReview();else renderEntry();
    $('#app').scrollTop=0;
    if(focus){const el=$('#entry')||$('#pageHeading');el?.focus({preventScroll:true});if(el?.id==='entry')el.select();}
  }
  function current(){return draft.step===1?{key:'pabloRaw',envelope:true,index:1,label:'1-Pablo'}:draft.step===2?{key:'victorRaw',envelope:true,index:2,label:'2-Victor'}:C.DENOMS[draft.step-3];}
  function value(){const d=current();return d.envelope?draft[d.key]??'':draft.counts[d.key]??'';}
  function setValue(v){const d=current();if(d.envelope)draft[d.key]=v;else draft.counts[d.key]=v;draft.saved=false;draft.started=true;persist();}
  function renderEntry(){
    const d=current(),weight=d.type==='coins'&&draft.coinMode==='weight';
    $('#app').innerHTML=`<section class="wizard"><div class="step-heading"><div class="illustration">${A.render(d)}</div><div class="step-copy"><p class="eyebrow">${t('Paso','Step')} ${draft.step} / ${LAST-1}</p><h1 id="pageHeading" tabindex="-1">${E(d.label)}</h1><p>${d.envelope?t('Retirada pendiente','Pending withdrawal'):weight?t('Pesa la cubeta llena','Weigh the full tray'):t('Cuenta las unidades','Count the units')}</p>${d.type==='coins'?button('toggle-mode',weight?t('Cambiar a unidades','Switch to units'):t('Cambiar a peso','Switch to weight'),'mode-link'):''}</div><progress value="${draft.step}" max="${LAST-1}" aria-label="${t('Progreso del recuento','Count progress')}"></progress></div>
      <div class="entry-area"><label for="entry">${d.envelope?t('Importe del sobre','Envelope amount'):weight?t('Peso total · cubeta incluida','Total weight · including tray'):t('Número de unidades','Number of units')}</label><div class="entry-field"><input id="entry" type="text" inputmode="none" enterkeyhint="next" autocomplete="off" spellcheck="false" maxlength="18" placeholder="0" value="${E(value())}" aria-describedby="entryHelp entryError"><span>${d.envelope?'€':weight?'g':t('uds.','units')}</span>${button('clear-entry','×','clear',`aria-label="${t('Vaciar campo','Clear input')}"`)}</div><p id="entryHelp"></p><p id="entryError" class="error" role="alert"></p></div>
      <div class="keypad" role="group" aria-label="${t('Teclado numérico','Numeric keypad')}">${['1','2','3','4','5','6','7','8','9',d.envelope||weight?',':'','0','⌫'].map(k=>`<button type="button" data-key="${k}" ${k===''?'disabled aria-hidden="true"':''} ${k==='⌫'?`aria-label="${t('Borrar último dígito','Delete last digit')}"`:''}>${k}</button>`).join('')}</div>
      <footer class="wizard-footer">${button('back',t('← Atrás','← Back'),'',draft.step===1?'disabled':'')}${button('next',draft.returnToReview||draft.step===LAST-1?t('Ver resultado →','View result →'):t('Siguiente →','Next →'),'primary','id="nextButton"')}<small>${t('Vacío = 0 · Enter para avanzar','Empty = 0 · Enter to continue')}</small></footer></section>`;
    updateEntry();
  }
  function updateEntry(){
    const d=current();let invalid=false;
    try{
      if(d.envelope){C.money(value());$('#entryHelp').textContent=t('Resta desde ahora. Cuenta ese efectivo; si ya lo retiraste, pon 0.','Deducted now. Count that cash; if already removed, enter 0.');}
      else{const a=C.entry(d,value(),draft.coinMode,draft.taras);$('#entryHelp').textContent=d.type==='coins'&&draft.coinMode==='weight'?`${t('Tara','Tare')} ${grams(a.tare)} g · ${t('Neto','Net')} ${grams(a.net)} g → ${a.quantity} ${t('monedas','coins')} · ${money(a.amount)}`:`${a.quantity} × ${d.label} = ${money(a.amount)}`;if(d.type==='coins'&&draft.coinMode==='weight'&&Math.abs(a.residual)>d.mg/5000)$('#entryHelp').textContent+=' · '+t('Comprueba el peso.','Check the weight.');}
      $('#entryError').textContent='';
    }catch(e){invalid=true;$('#entryError').textContent=err(e.message);$('#entryHelp').textContent='';}
    $('#entry').setAttribute('aria-invalid',String(invalid));$('#nextButton').disabled=invalid;board();
  }
  function key(k){const el=$('#entry');if(!el)return;const s=el.selectionStart??el.value.length,e=el.selectionEnd??s;let v=el.value;if(k==='⌫')v=v.slice(0,s===e?Math.max(0,s-1):s)+v.slice(e);else v=v.slice(0,s)+k+v.slice(e);if(v.length>18)return;el.value=v;setValue(v);updateEntry();el.focus({preventScroll:true});const pos=k==='⌫'?Math.max(0,s-(s===e?1:0)):s+k.length;el.setSelectionRange(pos,pos);}
  function go(step,review=false){draft.step=Math.max(1,Math.min(LAST,step));draft.returnToReview=review;view='wizard';persist();render(true);}
  function next(){try{const d=current();if(d.envelope)C.money(value());else C.entry(d,value(),draft.coinMode,draft.taras);go(draft.returnToReview?LAST:draft.step+1);}catch(e){toast(err(e.message));}}
  function summary(r){return [[t('Contado','Counted'),money(r.gross)],['1-Pablo',money(-r.pablo)],['2-Victor',money(-r.victor)],[t('Fondo','Float'),r.expected===null?'—':money(r.expected)]].map(([label,amount])=>`<div class="summary-row"><span>${label}</span><strong>${amount}</strong></div>`).join('');}
  function renderReview(){
    const r=safeTotals(),bad=[];
    C.DENOMS.forEach((d,i)=>{try{C.entry(d,draft.counts[d.key],draft.coinMode,draft.taras);}catch{bad.push(i);}});
    $('#app').innerHTML=`<section class="page review"><p class="eyebrow">${t('El resultado de tu recuento','Your count result')}</p><h1 id="pageHeading" tabindex="-1">${draft.saved?t('Caja guardada.','Count saved.'):r&&r.difference===0?t('Todo cuadra.','All balanced.'):t('Revisa y guarda.','Review and save.')}</h1><p class="muted">${draft.saved?E(dateText(draft.date)):t('La fecha se asigna automáticamente al guardar.','The date is assigned automatically when saving.')}</p><div class="panel">${r?summary(r):`<p class="error">${t('Revisa los campos marcados antes de guardar.','Check the flagged inputs before saving.')}</p>`}</div><p id="reviewError" class="error" role="alert">${r&&r.total<0?err('envelopes'):''}</p>${button('save',draft.saved?t('✓ Guardado','✓ Saved'):t('Guardar resultado','Save result'),'primary full',`id="saveButton" ${draft.saved||!r||r.total<0?'disabled':''}`)}<div class="action-row">${button('review-back',t('← Atrás','← Back'))}${button('copy',t('Copiar resumen','Copy summary'))}${button('new',t('Nuevo recuento','New count'))}</div><details class="panel breakdown" ${bad.length?'open':''}><summary>${t('Revisar denominaciones','Review denominations')}</summary>${C.DENOMS.map((d,i)=>`<button class="breakdown-row" data-action="edit-denom" data-index="${i}"><span class="mini-art">${A.render(d)}</span><span>${d.label}</span><strong>${bad.includes(i)?t('Revisar','Check'):money(C.entry(d,draft.counts[d.key],draft.coinMode,draft.taras).amount)} ↗</strong></button>`).join('')}</details><p class="privacy">${t('Solo en este navegador. Exporta el historial para tener una copia.','Only in this browser. Export history to keep a backup.')}</p></section>`;
  }
  function save(){
    try{
      const existing=history.find(r=>r.id===draft.id),now=new Date();
      // First save uses the local save day, including drafts carried past midnight.
      // Editing the same saved record never silently moves it to another date.
      const dated={...draft,date:existing?.date||C.localDate(now)};
      const r=C.record(dated,existing?.createdAt||now.toISOString());
      if(!storeHistory([...history.filter(x=>x.id!==r.id),r]))return;
      draft.date=r.date;draft.saved=true;persist();render(true);toast(t('Resultado guardado.','Result saved.'));
    }catch(e){$('#reviewError').textContent=err(e.message);}
  }
  function newCount(){const perform=()=>{draft=fresh();view='wizard';persist();render(true);};if(draft.started&&!draft.saved)ask(t('¿Empezar otro recuento?','Start another count?'),t('Se sustituirá solo el borrador. El historial y las taras se conservan.','Only the draft is replaced. History and tares are kept.'),perform);else perform();}
  function renderSettings(){
    $('#app').innerHTML=`<section class="page"><p class="eyebrow">${t('Configura una vez','Set up once')}</p><h1 id="pageHeading" tabindex="-1">${t('A tu manera.','Your way.')}</h1><form id="settingsForm" class="panel" novalidate><label class="field">${t('Fondo habitual','Usual float')}<div class="input-unit"><input name="expected" inputmode="decimal" autocomplete="off" value="${E(settings.expectedRaw??'350')}" placeholder="350"><span>€</span></div><small>${t('Vacío para no comparar con un fondo.','Leave blank for no reference float.')}</small></label><label class="field">${t('Contar monedas por','Count coins by')}<select name="mode"><option value="weight" ${settings.coinMode==='weight'?'selected':''}>${t('Peso · gramos','Weight · grams')}</option><option value="quantity" ${settings.coinMode==='quantity'?'selected':''}>${t('Unidades','Units')}</option></select></label><h2>${t('Taras de tus cubetas','Your tray tares')}</h2><p class="hint">${t('Peso de cada cubeta vacía. Deja 0 g si aún no la utilizas.','Weight of each empty tray. Leave 0 g if not in use yet.')}</p><div class="tare-list">${C.COINS.map(d=>`<label class="tare-row"><span class="mini-art">${A.render(d)}</span><span>${d.label}</span><div class="input-unit"><input name="${d.key}" aria-label="${t('Tara de','Tare for')} ${d.label}" inputmode="decimal" autocomplete="off" value="${E(settings.taras[d.key])}"><span>g</span></div></label>`).join('')}</div><p id="settingsError" class="error" role="alert"></p><div class="stack">${button('settings-save',t('Guardar para nuevos recuentos','Save for new counts'),'primary')}${button('settings-apply',t('Guardar y aplicar al actual','Save and apply to current count'))}</div></form><p class="hint">${t('Los cambios no recalculan el historial.','Changes never recalculate history.')}</p>${button('wizard',t('← Volver al recuento','← Back to count'))}</section>`;
  }
  function updateSettings(apply){
    try{
      const f=new FormData($('#settingsForm')),taras=C.tareMap(Object.fromEntries(C.COINS.map(d=>[d.key,f.get(d.key)]))),expectedRaw=String(f.get('expected')),coinMode=String(f.get('mode'));C.money(expectedRaw);
      const nextSettings={taras,expectedRaw,coinMode};
      const perform=()=>{
        try{let next=draft;if(apply||!draft.started){const source=draft.coinMode==='quantity'?{...draft,taras}:draft;next=C.convertMode(source,coinMode);next={...next,taras:{...taras},expectedRaw,saved:false};}
          if(!write(K.settings,nextSettings))return;settings=nextSettings;draft=next;persist();view='wizard';render(true);toast(t('Ajustes guardados.','Settings saved.'));
        }catch(e){$('#settingsError').textContent=err(e.message);}
      };
      if(apply&&draft.started)ask(t('¿Aplicar al recuento actual?','Apply to current count?'),t('Cambiarán el fondo y las taras de este borrador. Los pesos ya introducidos se recalcularán; el historial no cambia.','This draft’s float and tares will change. Entered weights are recalculated; history is unchanged.'),perform);else perform();
    }catch(e){$('#settingsError').textContent=err(e.message);}
  }
  function renderHistory(){
    const sorted=[...history].sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||''));
    $('#app').innerHTML=`<section class="page"><p class="eyebrow">${t('Sin nombres. Solo fechas.','No names. Just dates.')}</p><h1 id="pageHeading" tabindex="-1">${t('Cada día cuenta.','Every day counts.')}</h1><div class="action-row">${button('import',t('Importar CSV','Import CSV'),'primary')}${button('export',t('Exportar CSV','Export CSV'),'',history.length?'':'disabled')}${button('wizard',t('Volver','Back'))}</div><input id="csvFile" type="file" accept=".csv,text/csv,text/plain" hidden><p class="privacy">${t('Guardado en este navegador. Exporta antes de borrar datos o cambiar de dispositivo.','Saved in this browser. Export before clearing data or changing devices.')}</p><div id="importPreview"></div>${locked?`<div class="panel error">${t('Historial ilegible: el original no se sobrescribirá.','Unreadable history: the original will not be overwritten.')}${button('recover',t('Descargar originales','Download originals'))}</div>`:sorted.length?`<div class="history-list">${sorted.map(r=>`<details class="history-item"><summary><span><strong>${E(dateText(r.date))}</strong><small>${r.createdAt?E(new Intl.DateTimeFormat(lang==='es'?'es-ES':'en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date(r.createdAt))):t('Importado','Imported')}</small></span><span class="history-money"><strong>${money(r.total)}</strong><small>${finalDiff(r)}</small></span></summary><div class="history-detail">${summary(r)}<p class="hint">${r.counts?t('Desglose y taras conservados con el registro.','Details and tares preserved with this record.'):t('El CSV antiguo solo contenía totales; no se inventa un desglose.','The old CSV only contained totals; no breakdown is invented.')}</p>${button('delete',t('Eliminar registro','Delete record'),'danger',`data-id="${E(r.id)}"`)}</div></details>`).join('')}</div>`:`<div class="panel empty"><h2>${t('Tu primer día empieza aquí.','Your first day starts here.')}</h2><p class="hint">${t('Guarda un recuento o importa tu CSV anterior.','Save a count or import your previous CSV.')}</p></div>`}</section>`;
    if(staged)preview();
  }
  function download(text,name,type='text/csv;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  async function importFile(file){if(!file)return;if(file.size>10*1024*1024){toast(t('El archivo supera 10 MB.','File exceeds 10 MB.'));return;}try{const bytes=await file.arrayBuffer();let text=new TextDecoder('utf-8').decode(bytes);if(text.includes('\ufffd'))text=new TextDecoder('windows-1252').decode(bytes);staged={...C.importCsv(text,history),text,name:file.name};if(view==='history')preview();}catch(e){toast(err(e.message));}finally{if($('#csvFile'))$('#csvFile').value='';}}
  function preview(){if(!staged||!$('#importPreview'))return;const s=staged;$('#importPreview').innerHTML=`<section class="panel import-preview"><h2>${t('Antes de importar','Before importing')}</h2><p>${E(s.name)}</p><div class="import-stats"><strong>${s.added.length}<small>${t('nuevos','new')}</small></strong><strong>${s.duplicates}<small>${t('duplicados','duplicates')}</small></strong><strong>${s.errors.length}<small>${t('con errores','with errors')}</small></strong></div><p class="hint">${t('Solo se añaden los nuevos. No se borra ni sustituye tu historial.','Only new records are added. History is not deleted or replaced.')}</p>${s.errors.length?`<p class="error">${t('No se importarán estas filas:','These rows will not be imported:')}</p><ul>${s.errors.slice(0,20).map(e=>`<li>${e.line}: ${err(e.code)}</li>`).join('')}</ul>`:''}<div class="action-row">${button('import-confirm',t('Añadir ','Add ')+s.added.length,'primary',!s.added.length||locked?'disabled':'')}${button('import-cancel',t('Cancelar','Cancel'))}</div></section>`;}
  function confirmImport(){if(!staged)return;try{const r=C.importCsv(staged.text,history);if(!storeHistory([...history,...r.added]))return;staged=null;render();toast(t('Historial importado.','History imported.'));}catch(e){toast(err(e.message));}}
  async function copy(){const r=safeTotals();if(!r)return;const text=`${dateText(draft.saved?draft.date:C.localDate())}\n${t('Contado','Counted')}: ${money(r.gross)}\n1-Pablo: ${money(-r.pablo)}\n2-Victor: ${money(-r.victor)}\n${t('Saldo','Balance')}: ${money(r.total)}\n${finalDiff(r)}`;try{await navigator.clipboard.writeText(text);toast(t('Resumen copiado.','Summary copied.'));}catch{window.prompt(t('Copia el resumen:','Copy summary:'),text);}}
  document.addEventListener('pointerdown',e=>{if(e.target.closest('[data-key]')&&$('#entry'))e.preventDefault();});
  document.addEventListener('click',e=>{
    const pad=e.target.closest('[data-key]');if(pad&&!pad.disabled){key(pad.dataset.key);return;}
    const el=e.target.closest('[data-action]');if(!el||el.disabled)return;const a=el.dataset.action;
    if(['wizard','history','settings'].includes(a)){view=a;render(true);return;}
    if(a==='language'){lang=lang==='es'?'en':'es';write(K.lang,lang);render();return;}
    if(a==='next'){next();return;}if(a==='back'){go(draft.step-1);return;}
    if(a==='clear-entry'){setValue('');$('#entry').value='';updateEntry();$('#entry').focus({preventScroll:true});return;}
    if(a==='toggle-mode'){try{draft=C.convertMode(draft,draft.coinMode==='weight'?'quantity':'weight');draft.saved=false;settings.coinMode=draft.coinMode;write(K.settings,settings);persist();render(true);}catch(e){toast(err(e.message));}return;}
    if(a==='edit-pablo'||a==='edit-victor'){go(a==='edit-pablo'?1:2,draft.step===LAST);return;}
    if(a==='edit-denom'){go(Number(el.dataset.index)+3,true);return;}
    if(a==='review-back'){go(LAST-1);return;}if(a==='new'){newCount();return;}if(a==='save'){save();return;}if(a==='copy'){copy();return;}
    if(a==='settings-save'||a==='settings-apply'){updateSettings(a==='settings-apply');return;}
    if(a==='import'){$('#csvFile').click();return;}if(a==='import-confirm'){confirmImport();return;}if(a==='import-cancel'){staged=null;$('#importPreview').innerHTML='';return;}
    if(a==='export'){download(C.exportCsv(history),`historial-caja-${C.localDate()}.csv`);return;}
    if(a==='recover'){try{download(JSON.stringify({v1:localStorage.getItem('caja-clara.history.v1'),v2:localStorage.getItem(K.history)},null,2),'caja-recuperacion.json','application/json');}catch{storageWarning();}return;}
    if(a==='delete')ask(t('¿Eliminar este registro?','Delete this record?'),t('Solo se eliminará este resultado.','Only this result will be deleted.'),()=>{if(storeHistory(history.filter(r=>r.id!==el.dataset.id))){if(draft.id===el.dataset.id){draft.saved=false;persist();}render();}});
  });
  document.addEventListener('input',e=>{if(e.target.id==='entry'){setValue(e.target.value);updateEntry();}});
  document.addEventListener('change',e=>{if(e.target.id==='csvFile')importFile(e.target.files[0]);});
  document.addEventListener('submit',e=>{if(!e.target.closest('dialog'))e.preventDefault();});
  document.addEventListener('keydown',e=>{if(view!=='wizard'||draft.step>=LAST||$('#confirmDialog').open||e.ctrlKey||e.metaKey)return;if(e.key==='Enter'&&e.target.id==='entry'){e.preventDefault();next();}else if(e.altKey&&e.key==='ArrowLeft'){e.preventDefault();go(draft.step-1);}else if(e.altKey&&e.key==='ArrowRight'){e.preventDefault();next();}});
  $('#confirmDialog').addEventListener('close',()=>{const action=pending;pending=null;if($('#confirmDialog').returnValue==='confirm')action?.();});
  window.addEventListener('storage',e=>{if(e.key===K.history){try{const rows=read(K.history,[]);if(!Array.isArray(rows))throw Error();history=rows.map(C.migrateRecord);if(view==='history')render();else header();}catch{locked=true;storageWarning();}}});
  function viewport(){document.documentElement.style.setProperty('--app-height',`${window.visualViewport?.height||innerHeight}px`);}
  window.visualViewport?.addEventListener('resize',viewport);window.addEventListener('resize',viewport);viewport();boot();
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js').then(r=>r.update()).catch(()=>{}));
})();
