/* Caja Clara daily wizard. No analytics, network storage, dependencies or account. */
(() => {
  'use strict';
  const C=window.CajaCore, $=s=>document.querySelector(s);
  const KEYS={history:'caja-clara.history.v2',draft:'caja-clara.draft.v2',settings:'caja-clara.settings.v2',language:'caja-clara.language'};
  const LAST=C.DENOMS.length+3;
  const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let lang='es',view='wizard',history=[],historyLocked=false,settings={},draft,staged=null,pending=null,toastTimer,reviewError='';
  const t=(es,en)=>lang==='en'?en:es;
  const money=c=>new Intl.NumberFormat(lang==='en'?'en-IE':'es-ES',{style:'currency',currency:'EUR'}).format((c||0)/100);
  const grams=n=>new Intl.NumberFormat(lang==='en'?'en-IE':'es-ES',{maximumFractionDigits:3}).format(n);
  const dateLabel=date=>C.validDate(date)?new Intl.DateTimeFormat(lang==='en'?'en-GB':'es-ES',{dateStyle:'long'}).format(new Date(date+'T12:00:00')):date;
  const btn=(action,label,kind='secondary',extra='')=>`<button type="button" class="button ${kind}" data-action="${action}" ${extra}>${label}</button>`;
  function storageWarning(){$('#storageWarning').hidden=false;$('#storageWarning').textContent=t('No se ha podido leer o guardar algún dato local. No borres el navegador: exporta el historial antes de salir.','Some local data could not be read or saved. Do not clear browser data; export your history before leaving.');}
  function read(key,fallback){const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw);}
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{storageWarning();return false;}}
  function persist(){const ok=write(KEYS.draft,draft);if($('#draftState'))$('#draftState').textContent=ok?t('Borrador guardado en este dispositivo','Draft saved on this device'):t('Borrador sin guardar','Draft not saved');return ok;}
  function saveHistory(next){if(historyLocked){toast(t('El historial original necesita recuperarse antes de guardar.','Recover the original history before saving.'));return false;}if(!write(KEYS.history,next))return false;history=next;return true;}
  function boot(){
    try{lang=read(KEYS.language,'es')==='en'?'en':'es';}catch{storageWarning();}
    try{settings=read(KEYS.settings,{expectedRaw:'350',coinMode:'weight',taras:{}});settings.taras=C.tareMap(settings.taras);}catch{settings={expectedRaw:'350',coinMode:'weight',taras:C.tareMap()};storageWarning();}
    try{
      const saved=read(KEYS.history,null);
      const records=saved===null?read('caja-clara.history.v1',[]):saved;
      if(!Array.isArray(records))throw new Error('history');
      history=records.map(C.migrateRecord);
      if(saved===null&&records.length)write(KEYS.history,history); // Leave v1 untouched as a migration backup.
    }catch{historyLocked=true;storageWarning();}
    try{
      const saved=read(KEYS.draft,null);
      draft=saved||C.migrateDraft(read('caja-clara.draft.v1',null));
      if(!saved&&!localStorage.getItem('caja-clara.draft.v1'))draft=C.newDraft(settings);
      if(!draft||draft.version!==2||!C.validDate(draft.date)||typeof draft.counts!=='object')throw new Error('draft');
      draft.taras=C.tareMap(draft.taras);draft.step=Math.max(0,Math.min(LAST,Number(draft.step)||0));
    }catch{draft=C.newDraft(settings);storageWarning();}
    render();
  }
  function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4000);}
  function ask(title,text,action){pending=action;$('#confirmDialog').returnValue='cancel';$('#dialogTitle').textContent=title;$('#dialogText').textContent=text;$('#dialogCancel').textContent=t('Cancelar','Cancel');$('#dialogConfirm').textContent=t('Confirmar','Confirm');$('#confirmDialog').showModal();}
  function errorText(code){return ({'number':t('Introduce un número válido y no negativo. Usa coma o punto decimal.','Enter a valid non-negative number. Use a decimal comma or point.'),'below-tare':t('El peso es menor que la tara. Revisa el peso o la cubeta configurada.','Weight is below the tare. Check the weight or tray setting.'),'envelopes':t('Los sobres superan el efectivo contado. Revisa los importes antes de guardar.','The envelopes exceed counted cash. Check the amounts before saving.'),'date':t('Revisa la fecha.','Check the date.'),'headers':t('Faltan las columnas Fecha y Total EUR del CSV.','The CSV needs Fecha and Total EUR columns.'),'csv':t('El archivo CSV está vacío o sus comillas no están bien cerradas.','The CSV is empty or has malformed quotes.'),'columns':t('El número de columnas no coincide.','The number of columns does not match.'),'inconsistent':t('Los importes o el desglose no coinciden.','Amounts or denomination details do not reconcile.'),'record':t('Datos de registro no válidos.','Invalid record data.'),'id-conflict':t('Ese ID ya existe con otros importes; no se ha sobrescrito.','This ID already has different amounts; it was not overwritten.')})[code]||t('No se pudo procesar este dato.','This data could not be processed.');}
  function header(){
    document.documentElement.lang=lang;document.title=t('Caja Clara · Arqueo diario','Caja Clara · Daily cash count');
    $('#description').content=t('Arqueo diario guiado con taras, sobres e historial privado.','Guided daily cash count with tray tares, envelopes and private history.');
    $('#homeButton').setAttribute('aria-label',t('Caja Clara, volver al recuento','Caja Clara, back to counting'));
    $('#historyButton').innerHTML=t('Historial','History')+` <span class="badge">${history.length}</span>`;
    $('#settingsButton').textContent=t('Ajustes','Settings');$('#languageButton').textContent=lang==='es'?'EN':'ES';
    $('#languageButton').setAttribute('aria-label',lang==='es'?'Switch to English':'Cambiar a español');
    $('#historyButton').classList.toggle('selected',view==='history');$('#settingsButton').classList.toggle('selected',view==='settings');
  }
  function render(focus=false){
    header();document.body.classList.toggle('counting',view==='wizard'&&draft.step>0&&draft.step<LAST);
    if(view==='history')renderHistory();else if(view==='settings')renderSettings();else if(draft.step===0)renderSetup();else if(draft.step===LAST)renderReview();else renderEntry();
    if(focus){const target=$('#entry')||$('#pageHeading');target?.focus({preventScroll:true});if(target?.id==='entry')target.select();}
  }
  function renderSetup(){
    $('#app').innerHTML=`<section class="page setup"><div class="page-top"><p class="eyebrow">${t('Un día. Una caja. Todo claro.','One day. One till. All clear.')}</p><h1 id="pageHeading" tabindex="-1">${t('Vamos a cuadrar<br>la caja.','Let’s balance<br>the till.')}</h1><p class="muted">${t('Primero los sobres. Después, una denominación cada vez.','Envelopes first. Then one denomination at a time.')}</p></div>
      <div class="panel setup-fields"><label class="field">${t('Fecha del arqueo','Count date')}<input id="countDate" type="date" value="${E(draft.date)}" required></label>
      <label class="field">${t('Fondo que debe quedar','Float that should remain')}<div class="input-unit"><input id="expected" inputmode="decimal" autocomplete="off" value="${E(draft.expectedRaw)}" placeholder="350"><span>€</span></div><small>${t('Déjalo vacío para contar sin comparar.','Leave blank to count without comparison.')}</small></label>
      <fieldset class="field"><legend>${t('Cómo contarás las monedas','How you will count coins')}</legend><div class="segmented">${btn('mode-quantity',t('Unidades','Units'),draft.coinMode==='quantity'?'active':'',`aria-pressed="${draft.coinMode==='quantity'}"`)}${btn('mode-weight',t('Peso · g','Weight · g'),draft.coinMode==='weight'?'active':'',`aria-pressed="${draft.coinMode==='weight'}"`)}</div></fieldset></div>
      <p class="hint">${draft.coinMode==='weight'?t('Pesa la cubeta llena: su tara se descuenta automáticamente.','Weigh the full tray: its tare is deducted automatically.'):t('Introduce el número de monedas de cada tipo.','Enter the number of coins of each type.')}</p>
      <p id="setupError" class="error" role="alert"></p>${btn('start',draft.returnToReview?t('Volver al resultado →','Back to result →'):draft.started?t('Continuar con los sobres →','Continue to envelopes →'):t('Empezar recuento →','Start counting →'),'primary full')}
      <p class="privacy">${t('Solo en este dispositivo · Sin nombres ni cuentas','Only on this device · No names or accounts')}</p>${draft.started?btn('new',t('Empezar otro recuento vacío','Start another empty count'),'text'):''}</section>`;
  }
  function current(){
    if(draft.step===1)return {key:'pabloRaw',envelope:true,label:'1-Pablo',index:1};
    if(draft.step===2)return {key:'victorRaw',envelope:true,label:'2-Victor',index:2};
    return C.DENOMS[draft.step-3];
  }
  const rawValue=()=>{const d=current();return d.envelope?draft[d.key]:draft.counts[d.key]??'';};
  function setValue(value){const d=current();if(d.envelope)draft[d.key]=value;else draft.counts[d.key]=value;draft.started=true;draft.saved=false;reviewError='';persist();}
  function renderEntry(){
    const d=current(),weight=!d.envelope&&d.type==='coins'&&draft.coinMode==='weight';
    const title=d.envelope?t('Prepara el sobre','Prepare the envelope'):weight?t('Pesa las monedas de','Weigh the coins worth'):t('Cuenta las unidades de','Count the units worth');
    const nextName=draft.step===LAST-1?t('Revisar resultado','Review result'):draft.step===1?'2-Victor':C.DENOMS[draft.step-2]?.label||'';
    $('#app').innerHTML=`<section class="wizard" aria-label="${t('Recuento paso a paso','Step-by-step count')}">
      <div class="wizard-progress"><div><span>${t('Paso','Step')} ${draft.step} / ${LAST-1}</span><span>${E(dateLabel(draft.date))}</span></div><progress value="${draft.step}" max="${LAST-1}">${draft.step}</progress></div>
      <div class="step-heading"><p id="entryPrompt" class="eyebrow">${title}</p><h1 class="denom ${d.envelope?'envelope':d.type==='coins'?'coin':'bill'}" id="pageHeading" tabindex="-1">${E(d.label)}</h1></div>
      <div class="entry-area"><label class="sr-only" for="entry">${d.envelope?t('Importe del sobre en euros','Envelope amount in euros'):weight?t('Peso bruto en gramos, cubeta incluida','Gross weight in grams, including tray'):t('Número de unidades','Number of units')} ${E(d.label)}</label><div class="entry-field"><input id="entry" type="text" inputmode="none" enterkeyhint="next" autocomplete="off" spellcheck="false" maxlength="18" value="${E(rawValue())}" placeholder="0" aria-describedby="entryHelp entryError"><span>${d.envelope?'€':weight?'g':t('uds.','units')}</span>${btn('clear-entry','×','clear',`aria-label="${t('Vaciar este campo','Clear this field')}"`)}</div><div id="entryHelp" class="entry-help"></div><p id="entryError" class="error" role="alert"></p></div>
      <div class="keypad" role="group" aria-label="${t('Teclado numérico','Numeric keypad')}">${['1','2','3','4','5','6','7','8','9',d.envelope||weight?',':'','0','⌫'].map(key=>`<button type="button" data-key="${key}" ${key===''?'disabled aria-hidden="true"':''} ${key==='⌫'?`aria-label="${t('Borrar último dígito','Delete last digit')}"`:''}>${key}</button>`).join('')}</div>
      <div class="wizard-total"><span>${d.envelope?t('A retirar en sobres','To remove in envelopes'):t('Contado hasta ahora','Counted so far')}</span><strong id="runningTotal"></strong></div>
      <footer class="wizard-footer">${btn('back',t('← Atrás','← Back'))}${btn('next',draft.returnToReview||draft.step===LAST-1?t('Ver resultado →','View result →'):t('Siguiente →','Next →'),'primary',`id="nextButton"`)}<span class="next-hint">${t('Vacío = 0','Empty = 0')}${nextName?' · '+t('Después: ','Next: ')+E(nextName):''}</span></footer>
    </section>`;
    updateEntry();
  }
  function updateEntry(){
    const d=current(),help=$('#entryHelp');let invalid=false;
    try{
      if(d.envelope){C.money(rawValue());help.textContent=t('Incluye este dinero al contar. Se restará una sola vez al final. Si ya lo retiraste, pon 0.','Include this money when counting. It is deducted once at the end. If already removed, enter 0.');}
      else{
        const a=C.entry(d,rawValue(),draft.coinMode,draft.taras);
        help.textContent=d.type==='coins'&&draft.coinMode==='weight'?`${t('Tara','Tare')} ${grams(a.tare)} g · ${t('Neto','Net')} ${grams(a.net)} g → ${a.quantity} ${t('monedas','coins')} · ${money(a.amount)}`:`${a.quantity} × ${E(d.label)} = ${money(a.amount)}`;
        if(d.type==='coins'&&draft.coinMode==='weight'&&Math.abs(a.residual)>(d.mg/1000)*0.2)help.textContent+=' · '+t('Peso entre monedas: comprueba la lectura.','Weight between coins: check the reading.');
      }
      $('#entryError').textContent='';
    }catch(e){invalid=true;$('#entryError').textContent=errorText(e.message);help.textContent='';}
    $('#entry').setAttribute('aria-invalid',String(invalid));$('#nextButton').disabled=invalid;
    try{const total=C.totals(draft);$('#runningTotal').textContent=money(d.envelope?total.pablo+total.victor:total.gross);}catch{$('#runningTotal').textContent='—';}
  }
  function changeKey(key){const input=$('#entry');if(!input)return;let value=input.value;const start=input.selectionStart??value.length,end=input.selectionEnd??value.length;if(key==='⌫'){value=start===end?value.slice(0,Math.max(0,start-1))+value.slice(end):value.slice(0,start)+value.slice(end);}else value=value.slice(0,start)+key+value.slice(end);if(value.length>18)return;input.value=value;setValue(value);updateEntry();input.focus({preventScroll:true});const pos=key==='⌫'?Math.max(0,start-(start===end?1:0)):start+key.length;input.setSelectionRange(pos,pos);}
  function go(step,review=false){draft.step=step;draft.returnToReview=review;persist();render(true);}
  function next(){
    if(draft.step===0){try{if(!C.validDate(draft.date))throw new Error('date');C.money(draft.expectedRaw);draft.started=true;go(draft.returnToReview?LAST:1);}catch(e){$('#setupError').textContent=errorText(e.message);}return;}
    try{const d=current();if(d.envelope)C.money(rawValue());else C.entry(d,rawValue(),draft.coinMode,draft.taras);go(draft.returnToReview?LAST:draft.step+1);}catch(e){toast(errorText(e.message));}
  }
  function summaryRows(r){const row=(a,b,action)=>`<div class="summary-row"><span>${a}</span>${action?`<button class="inline-edit" data-action="${action}">${b} <span aria-hidden="true">↗</span></button>`:`<strong>${b}</strong>`}</div>`;
    return row(t('Efectivo contado','Cash counted'),money(r.gross))+row('1-Pablo','− '+money(r.pablo),view==='wizard'?'edit-pablo':null)+row('2-Victor','− '+money(r.victor),view==='wizard'?'edit-victor':null)+row(t('Fondo esperado','Expected float'),r.expected===null?'—':money(r.expected),view==='wizard'?'edit-setup':null);
  }
  function diffText(r){return r.difference===null?t('Sin fondo de referencia','No reference float'):r.difference===0?t('Caja cuadrada','Till balanced'):r.difference>0?t('Sobran ','Surplus ')+money(r.difference):t('Faltan ','Short ')+money(-r.difference);}
  function renderReview(){
    let r;try{r=C.totals(draft);}catch(e){$('#app').innerHTML=`<section class="page"><h1 id="pageHeading" tabindex="-1">${t('Revisa el recuento','Check the count')}</h1><p class="error">${errorText(e.message)}</p>${btn('review-back',t('Volver a revisar','Back to review'),'primary')}</section>`;return;}
    const impossible=r.total<0;
    $('#app').innerHTML=`<section class="page review"><p class="eyebrow">${E(dateLabel(draft.date))}</p><h1 id="pageHeading" tabindex="-1">${draft.saved?t('Caja guardada.','Count saved.'):t('Todo, en su sitio.','Everything accounted for.')}</h1><div class="result ${r.difference===0?'balanced':''}"><span>${t('Queda en caja tras retirar los sobres','Remaining after removing envelopes')}</span><strong id="remainingTotal">${money(r.total)}</strong><p class="difference ${r.difference<0?'short':''}" id="difference">${diffText(r)}</p></div>
      <div class="panel summary">${summaryRows(r)}</div><p class="hint">${t('Los sobres se restan del contado, no del fondo esperado.','Envelopes are deducted from counted cash, not from the expected float.')}${draft.coinMode==='weight'?' '+t('Las monedas se estiman redondeando a la unidad más cercana.','Coins are estimated by rounding to the nearest unit.'):''}</p>
      <p id="reviewError" role="alert" class="error">${impossible?errorText('envelopes'):E(reviewError)}</p>${btn('save',draft.saved?t('✓ Guardado','✓ Saved'):t('Guardar resultado','Save result'),'primary full',`id="saveButton" ${draft.saved||impossible?'disabled':''}`)}
      <div class="action-row">${btn('review-back',t('← Atrás','← Back'))}${btn('copy',t('Copiar resumen','Copy summary'))}${btn('new',t('Nuevo recuento','New count'))}</div>
      <details class="panel breakdown"><summary>${t('Revisar denominaciones','Review denominations')} <span>${money(r.gross)}</span></summary>${r.entries.map((d,i)=>`<button class="breakdown-row" data-action="edit-denom" data-index="${i}"><span>${d.label}</span><span>${d.quantity} ${t('uds.','units')}</span><strong>${money(d.amount)} ↗</strong></button>`).join('')}</details><p class="privacy" id="draftState">${t('Borrador guardado en este dispositivo','Draft saved on this device')}</p></section>`;
  }
  function save(){
    try{const existing=history.find(r=>r.id===draft.id);const r=C.record(draft,existing?.createdAt);const next=history.filter(x=>x.id!==r.id);next.push(r);if(!saveHistory(next))return;draft.saved=true;persist();render();toast(t('Resultado guardado por fecha.','Result saved by date.'));}catch(e){reviewError=errorText(e.message);renderReview();}
  }
  function newCount(){const action=()=>{draft=C.newDraft(settings);reviewError='';view='wizard';persist();render(true);};if(draft.started&&!draft.saved)ask(t('¿Empezar otro recuento?','Start another count?'),t('Se sustituirá el borrador actual. El historial y las taras se conservan.','The current draft will be replaced. History and tray tares are kept.'),action);else action();}
  function renderSettings(){
    $('#app').innerHTML=`<section class="page"><p class="eyebrow">${t('Configúralo una vez','Set it up once')}</p><h1 id="pageHeading" tabindex="-1">${t('Tus cubetas.','Your trays.')}</h1><p class="muted">${t('Introduce el peso vacío de cada cubeta en gramos. Al contar, pesa directamente la cubeta llena.','Enter each empty tray’s weight in grams. When counting, weigh the full tray directly.')}</p><form id="settingsForm" class="panel" novalidate><div class="tare-list">${C.COINS.map(d=>`<label class="tare-row"><span class="mini-coin">${d.label}</span><span>${t('Tara de la cubeta','Tray tare')}</span><div class="input-unit"><input name="${d.key}" aria-label="${t('Tara de','Tare for')} ${d.label}" inputmode="decimal" autocomplete="off" value="${E(settings.taras[d.key])}" placeholder="0"><span>g</span></div></label>`).join('')}</div><p class="hint">${t('Sin cubeta, deja 0 g. Un campo de recuento vacío o a 0 significa que no hay monedas.','Without a tray, leave 0 g. An empty or zero count field means no coins.')}</p><label class="field">${t('Fondo habitual','Usual float')}<div class="input-unit"><input name="expected" inputmode="decimal" value="${E(settings.expectedRaw??'350')}" placeholder="350"><span>€</span></div></label><p id="settingsError" class="error" role="alert"></p><div class="stack">${btn('settings-save',t('Guardar para nuevos recuentos','Save for new counts'),'primary')}${btn('settings-apply',t('Guardar y aplicar al recuento actual','Save and apply to current count'))}</div></form><p class="hint">${t('Los arqueos anteriores conservan sus propias taras y nunca se recalculan.','Previous counts retain their own tares and are never recalculated.')}</p>${btn('wizard',t('← Volver al recuento','← Back to counting'),'text')}</section>`;
  }
  function updateSettings(apply){
    try{const form=new FormData($('#settingsForm'));const taras=C.tareMap(Object.fromEntries(C.COINS.map(d=>[d.key,form.get(d.key)])));C.money(form.get('expected'));const next={taras,expectedRaw:String(form.get('expected')),coinMode:draft.coinMode};
      const perform=()=>{if(!write(KEYS.settings,next))return;settings=next;if(apply||!draft.started){draft.taras={...taras};draft.saved=false;persist();}toast(t('Ajustes guardados.','Settings saved.'));view='wizard';render();};
      if(apply&&draft.started&&draft.coinMode==='weight')ask(t('¿Aplicar estas taras?','Apply these tares?'),t('Cambiará el cálculo de las monedas ya pesadas en este borrador. El historial no se modifica.','This will change calculations for coins already weighed in this draft. History is unchanged.'),perform);else perform();
    }catch(e){$('#settingsError').textContent=errorText(e.message);}
  }
  function renderHistory(){
    const sorted=[...history].sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||''));
    $('#app').innerHTML=`<section class="page history"><p class="eyebrow">${t('Tu historial, sin nombres','Your history, without names')}</p><h1 id="pageHeading" tabindex="-1">${t('Cada día cuenta.','Every day counts.')}</h1><div class="action-row">${btn('import',t('Importar CSV','Import CSV'),'primary')}${btn('export',t('Exportar CSV','Export CSV'),'secondary',history.length?'':'disabled')}${btn('wizard',t('Volver','Back'))}</div><input id="csvFile" type="file" accept=".csv,text/csv,text/plain" hidden><p class="privacy">${t('Solo en este navegador. Exporta una copia antes de borrar datos o cambiar de dispositivo.','Only in this browser. Export a copy before clearing data or switching devices.')}</p><div id="importPreview"></div>
      ${historyLocked?`<div class="panel error">${t('No se ha podido leer el historial original. No se sobrescribirá.','The original history could not be read. It will not be overwritten.')}${btn('recover',t('Descargar datos originales','Download original data'))}</div>`:sorted.length?`<div class="history-list">${sorted.map(r=>`<details class="history-item"><summary><span><strong>${E(dateLabel(r.date))}</strong><small>${r.createdAt?E(new Intl.DateTimeFormat(lang==='en'?'en-GB':'es-ES',{hour:'2-digit',minute:'2-digit'}).format(new Date(r.createdAt))):t('Importado','Imported')}</small></span><span class="history-money"><strong>${money(r.total)}</strong><small class="${r.difference<0?'short':''}">${E(diffText(r))}</small></span></summary><div class="history-detail">${summaryRows(r)}<p class="muted">${t('Billetes','Notes')}: ${r.bills===null?'—':money(r.bills)} · ${t('Monedas','Coins')}: ${r.coins===null?'—':money(r.coins)}</p>${r.counts?`<p class="hint">${r.coinMode==='weight'?t('Recuento por peso · Taras guardadas con este resultado.','Counted by weight · Tares saved with this result.'):t('Recuento por unidades.','Counted by units.')}</p>`:`<p class="hint">${t('El CSV original no incluye cantidades por denominación. Se conservan sus importes, sin inventar el desglose.','The original CSV has no quantities per denomination. Its amounts are preserved without inventing a breakdown.')}</p>`}${btn('delete',t('Eliminar este registro','Delete this record'),'danger-text',`data-id="${E(r.id)}"`)}</div></details>`).join('')}</div>`:`<div class="panel empty"><span>↗</span><h2>${t('Aquí empieza tu historial.','Your history starts here.')}</h2><p>${t('Guarda el primer recuento o importa tu CSV anterior.','Save your first count or import your previous CSV.')}</p></div>`}</section>`;
    if(staged)renderImportPreview();
  }
  function download(text,name,type='text/csv;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  async function importFile(file){
    if(!file)return;if(file.size>10*1024*1024){toast(t('El archivo supera 10 MB.','The file exceeds 10 MB.'));return;}
    try{const bytes=await file.arrayBuffer();let text=new TextDecoder('utf-8').decode(bytes);if(text.includes('\ufffd'))text=new TextDecoder('windows-1252').decode(bytes);const result=C.importCsv(text,history);staged={...result,text,name:file.name};if(view==='history')renderImportPreview();}catch(e){toast(errorText(e.message));}finally{if($('#csvFile'))$('#csvFile').value='';}
  }
  function renderImportPreview(){
    if(!staged||!$('#importPreview'))return;
    const s=staged;$('#importPreview').innerHTML=`<section class="panel import-preview"><h2>${t('Antes de importar','Before importing')}</h2><p>${E(s.name)}</p><div class="import-stats"><strong>${s.added.length}<small>${t('nuevos','new')}</small></strong><strong>${s.duplicates}<small>${t('duplicados','duplicates')}</small></strong><strong>${s.errors.length}<small>${t('con errores','with errors')}</small></strong></div><p class="hint">${t('Se añadirán los nuevos; no se sustituye ni borra tu historial. Los nombres del CSV antiguo se ignoran.','New records will be added; your history is not replaced or deleted. Names in the old CSV are ignored.')}</p>${s.added.length?`<p class="hint">${t('Fechas','Dates')}: ${E([...s.added].map(r=>r.date).sort()[0])} → ${E([...s.added].map(r=>r.date).sort().at(-1))}</p>`:''}${s.errors.length?`<div class="error"><p>${t('Las filas con errores no se importarán. Revisa el CSV.','Rows with errors will not be imported. Review the CSV.')}</p><ul>${s.errors.slice(0,20).map(e=>`<li>${t('Fila','Row')} ${e.line}: ${errorText(e.code)}</li>`).join('')}</ul>${s.errors.length>20?`<p>+ ${s.errors.length-20} ${t('errores más','more errors')}</p>`:''}</div>`:''}<div class="action-row">${btn('import-confirm',t('Añadir ','Add ')+s.added.length+t(' registros',' records'),'primary',s.added.length&&!historyLocked?'':'disabled')}${btn('import-cancel',t('Cancelar','Cancel'))}</div></section>`;
  }
  function confirmImport(){if(!staged)return;try{const fresh=C.importCsv(staged.text,history);if(!saveHistory([...history,...fresh.added]))return;staged=null;renderHistory();header();toast(t('Historial importado sin sustituir registros.','History imported without replacing records.'));}catch(e){toast(errorText(e.message));}}
  async function copySummary(){try{const r=C.totals(draft);const text=`${dateLabel(draft.date)}\n${t('Contado','Counted')}: ${money(r.gross)}\n1-Pablo: ${money(r.pablo)}\n2-Victor: ${money(r.victor)}\n${t('Queda en caja','Remaining in till')}: ${money(r.total)}\n${diffText(r)}`;if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);toast(t('Resumen copiado.','Summary copied.'));return;}catch{}}window.prompt(t('Copia el resumen:','Copy summary:'),text);}catch(e){toast(errorText(e.message));}}
  document.addEventListener('click',event=>{
    const key=event.target.closest('[data-key]');if(key&&!key.disabled){changeKey(key.dataset.key);return;}
    const node=event.target.closest('[data-action]');if(!node||node.disabled)return;const action=node.dataset.action;
    if(['wizard','history','settings'].includes(action)){view=action;render(true);return;}
    if(action==='language'){lang=lang==='es'?'en':'es';write(KEYS.language,lang);render();return;}
    if(action==='start'||action==='next'){next();return;}
    if(action==='back'){go(draft.step-1);return;}
    if(action==='clear-entry'){setValue('');$('#entry').value='';updateEntry();$('#entry').focus({preventScroll:true});return;}
    if(action.startsWith('mode-')){try{draft=C.convertMode(draft,action.slice(5));settings.coinMode=draft.coinMode;draft.saved=false;write(KEYS.settings,settings);persist();renderSetup();}catch(e){toast(errorText(e.message));}return;}
    if(action==='save'){save();return;}if(action==='new'){newCount();return;}if(action==='copy'){copySummary();return;}
    if(action==='review-back'){go(LAST-1);return;}if(action==='edit-pablo'){go(1,true);return;}if(action==='edit-victor'){go(2,true);return;}if(action==='edit-denom'){go(Number(node.dataset.index)+3,true);return;}if(action==='edit-setup'){go(0,true);return;}
    if(action==='settings-save'||action==='settings-apply'){updateSettings(action==='settings-apply');return;}
    if(action==='export'){download(C.exportCsv(history),`historial-caja-${C.localDate()}.csv`);return;}
    if(action==='import'){$('#csvFile').click();return;}if(action==='import-confirm'){confirmImport();return;}if(action==='import-cancel'){staged=null;$('#importPreview').innerHTML='';return;}
    if(action==='recover'){try{download(JSON.stringify({v1:localStorage.getItem('caja-clara.history.v1'),v2:localStorage.getItem(KEYS.history)},null,2),'caja-recuperacion.json','application/json');}catch{storageWarning();}return;}
    if(action==='delete'){ask(t('¿Eliminar este registro?','Delete this record?'),t('Solo se eliminará este resultado del historial.','Only this result will be removed from history.'),()=>{if(saveHistory(history.filter(r=>r.id!==node.dataset.id))){if(draft.id===node.dataset.id){draft.saved=false;persist();}render();}});}
  });
  document.addEventListener('input',event=>{
    const el=event.target;
    if(el.id==='entry'){setValue(el.value);updateEntry();}
    if(el.id==='countDate'||el.id==='expected'){draft[el.id==='countDate'?'date':'expectedRaw']=el.value;draft.saved=false;persist();}
  });
  document.addEventListener('change',event=>{if(event.target.id==='csvFile')importFile(event.target.files[0]);});
  document.addEventListener('submit',event=>{if(!event.target.closest('dialog'))event.preventDefault();});
  document.addEventListener('keydown',event=>{
    if(view!=='wizard'||draft.step<1||draft.step>=LAST||$('#confirmDialog').open||event.ctrlKey||event.metaKey)return;
    if(event.key==='Enter'&&event.target.id==='entry'){event.preventDefault();next();}
    else if(event.altKey&&event.key==='ArrowLeft'){event.preventDefault();go(draft.step-1);}
    else if(event.altKey&&event.key==='ArrowRight'){event.preventDefault();next();}
  });
  $('#confirmDialog').addEventListener('close',()=>{const action=pending;pending=null;if($('#confirmDialog').returnValue==='confirm')action?.();});
  window.addEventListener('storage',event=>{if(event.key===KEYS.history){try{const next=read(KEYS.history,[]);if(!Array.isArray(next))throw new Error('history');history=next.map(C.migrateRecord);if(view==='history')render();else header();}catch{historyLocked=true;storageWarning();}}});
  boot();
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js').then(reg=>reg.update()).catch(()=>{}));
})();
