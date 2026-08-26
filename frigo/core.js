"use strict";

// IMPORTANT: do not change these keys in future releases. They preserve the user's list and progress.
const KL="frigo_list_v4",KS="frigo_scans_v4";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const FORMATS=["DataMatrix","EAN13","EAN8","UPCA","UPCE","Code128","Code39","ITF"];

function migratePersistent(){
  try{
    if(localStorage.getItem(KL))return;
    const oldList=JSON.parse(localStorage.getItem("frigo_farmatic_list_v3")||"null");
    const oldScans=JSON.parse(localStorage.getItem("frigo_farmatic_scans_v3")||"null");
    if(Array.isArray(oldList)&&oldList.length){
      const list=oldList.map(x=>({key:String(x.code7||x.cn6||""),farmaticCode:String(x.code7||x.cn6||""),code7:String(x.code7||""),cn6:String(x.cn6||String(x.code7||"").slice(0,6)),name:x.name||"",expected:Number(x.expected)||0}));
      localStorage.setItem(KL,JSON.stringify(list));
      if(Array.isArray(oldScans))localStorage.setItem(KS,JSON.stringify(oldScans.map(x=>({...x,expectedKey:x.expectedKey||x.expectedCode||""}))));
    }
  }catch(e){console.warn("No se pudo migrar sesión antigua",e)}
}
migratePersistent();

let expected=load(KL,[]),scans=load(KS,[]),filter="pending",stream=null,timer=null,busy=false,running=false,frame=0,linearTracks=[],dmLive=new Map();
function load(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function feedback(t,c=""){const e=$("feedback");e.className="feedback "+c;e.innerHTML=t}
function vib(bad=false){navigator.vibrate?.(bad?60:25)}

function parseWorkbook(buf){
  if(!window.XLSX)throw Error("No se pudo cargar el lector de Excel");
  const wb=XLSX.read(buf,{type:"array"});
  for(const sh of wb.SheetNames){
    const a=XLSX.utils.sheet_to_json(wb.Sheets[sh],{header:1,raw:true,defval:""});
    let hr=-1,ci=-1,di=-1,si=-1;
    for(let r=0;r<Math.min(30,a.length);r++){
      const row=a[r].map(norm),c=row.findIndex(x=>x.includes("codigo")),d=row.findIndex(x=>x.includes("descripcion")),st=row.findIndex(x=>x.includes("stock actual"));
      if(c>=0&&d>=0&&st>=0){hr=r;ci=c;di=d;si=st;break}
    }
    if(hr<0)continue;
    const out=[];
    for(let r=hr+1;r<a.length;r++){
      const row=a[r],digits=String(row[ci]??"").replace(/\D/g,""),name=String(row[di]??"").trim(),n=typeof row[si]==="number"?row[si]:Number(String(row[si]).replace(",",".").replace(/[^\d.-]/g,""));
      if(digits.length<6||!name||!Number.isFinite(n))continue;
      let code7="",cn6="";
      if(digits.length===7){code7=digits;cn6=digits.slice(0,6)}
      else if(digits.length===13&&digits.startsWith("847000")){code7=digits.slice(-7);cn6=code7.slice(0,6)}
      out.push({key:digits,farmaticCode:digits,code7,cn6,name,expected:Math.max(0,Math.round(n))});
    }
    if(out.length)return out;
  }
  throw Error("No encuentro Código, Descripción y Stock Actual");
}

function parseGS1(input){
  const raw=String(input??"").replace(/^\]d2/,"").trim(),f={};
  if(/\((?:01|10|17|21|712)\)/.test(raw)){
    const re=/\((01|10|17|21|712)\)/g,m=[...raw.matchAll(re)];
    for(let i=0;i<m.length;i++){
      const st=m[i].index+m[i][0].length,en=i+1<m.length?m[i+1].index:raw.length;
      f[m[i][1]]=raw.slice(st,en).replace(/\x1D/g,"");
    }
  }else{
    let i=0;
    while(i<raw.length){
      if(raw.charCodeAt(i)===29){i++;continue}
      let ai="",fixed=0,max=0;
      if(raw.slice(i,i+3)==="712"){ai="712";max=20;i+=3}
      else{
        const a=raw.slice(i,i+2);
        if(a==="01"){ai=a;fixed=14;i+=2}
        else if(a==="17"){ai=a;fixed=6;i+=2}
        else if(a==="10"||a==="21"){ai=a;max=20;i+=2}
        else{i++;continue}
      }
      if(fixed){f[ai]=raw.slice(i,i+fixed);i+=fixed}
      else{const gs=raw.indexOf("\x1D",i),en=gs>=0?Math.min(gs,i+max):Math.min(raw.length,i+max);f[ai]=raw.slice(i,en);i=gs>=0?gs+1:en}
    }
  }
  const gtin=(f["01"]||"").replace(/\D/g,""),nhrn=(f["712"]||"").replace(/\D/g,"");
  let code7="",cn6="";
  if(nhrn.length>=7){code7=nhrn.slice(0,7);cn6=code7.slice(0,6)}
  else if(nhrn.length===6)cn6=nhrn;
  if(!code7&&/^0847000\d{7}$/.test(gtin)){code7=gtin.slice(-7);cn6=code7.slice(0,6)}
  return{raw,gtin,code7,cn6,serial:f["21"]||"",lot:f["10"]||"",expiry:f["17"]||"",format:"DataMatrix",fingerprint:gtin&&f["21"]?gtin+"|"+f["21"]:raw};
}

function parseDetected(r){
  const text=String(r?.text??"").trim(),format=String(r?.format||r?.symbology||"");
  if(!text)return null;
  if(format==="DataMatrix"||r?.symbology==="DataMatrix"||/\((?:01|10|17|21|712)\)/.test(text)){
    const p=parseGS1(text);p.format=format||"DataMatrix";return p;
  }
  const d=text.replace(/\D/g,"");let code7="",cn6="";
  if(d.length===13&&d.startsWith("847000")){code7=d.slice(-7);cn6=code7.slice(0,6)}
  else if(d.length===14&&d.startsWith("0847000")){code7=d.slice(-7);cn6=code7.slice(0,6)}
  else if(d.length===7){code7=d;cn6=d.slice(0,6)}
  else if(d.length===6)cn6=d;
  return{raw:text,gtin:d,code7,cn6,serial:"",lot:"",expiry:"",format,fingerprint:""};
}

function maps(){
  return{
    raw:new Map(expected.map(x=>[x.farmaticCode,x.key])),
    c7:new Map(expected.filter(x=>x.code7).map(x=>[x.code7,x.key])),
    c6:new Map(expected.filter(x=>x.cn6).map(x=>[x.cn6,x.key]))
  };
}
function resolve(p){const m=maps(),d=String(p.gtin||p.raw||"").replace(/\D/g,"");return m.raw.get(d)||m.c7.get(p.code7)||m.c6.get(p.cn6)||""}
function resolveCN(cn){const d=String(cn||"").replace(/\D/g,"");const m=maps();if(d.length===7)return m.c7.get(d)||m.c6.get(d.slice(0,6))||"";if(d.length===6)return m.c6.get(d)||"";return""}

function addBatch(items,dup=0){
  if(!items.length){if(dup)feedback(`<b>Duplicado bloqueado.</b> ${dup} caja(s) ya contadas.`,"warn");return}
  let known=0,unknown=0,last=null;
  for(const {p,id} of items){
    const k=resolve(p);
    scans.push({id,expectedKey:k,raw:p.raw,gtin:p.gtin||"",code7:p.code7||"",cn6:p.cn6||"",serial:p.serial||"",lot:p.lot||"",expiry:p.expiry||"",manualExpiry:"",assignedCN:"",format:p.format||"",at:new Date().toISOString()});
    last={p,k};k?known++:unknown++;
  }
  save(KS,scans);render();
  if(items.length===1&&last?.k){
    const it=expected.find(x=>x.key===last.k),n=scans.filter(s=>s.expectedKey===last.k).length,d=n-it.expected;
    feedback(`<b>${d===0?"✓ ":""}${esc(it.name)}</b><br>${n} / ${it.expected}${d<0?` · faltan ${-d}`:d>0?` · sobra ${d}`:" · correcto"}`,d>0?"bad":d===0?"good":"");
  }else feedback(`<b>${items.length} códigos nuevos.</b><br>${known} de la lista${unknown?` · ${unknown} no previsto(s)`:""}${dup?` · ${dup} duplicado(s)`:""}`,unknown?"warn":"good");
  vib(unknown);
}

function unknownGroupKey(s){return(s.format||"")+":"+(s.gtin||s.raw)}
function calc(){
  const cnt=new Map();
  for(const s of scans)cnt.set(s.expectedKey||("u:"+(s.gtin||s.raw)),(cnt.get(s.expectedKey||("u:"+(s.gtin||s.raw)))||0)+1);
  const rows=expected.map(x=>({...x,physical:cnt.get(x.key)||0})).map(x=>({...x,diff:x.physical-x.expected}));
  let missing=0,correct=0,over=0;
  for(const r of rows){if(r.physical<r.expected)missing+=r.expected-r.physical;if(r.expected>0&&r.diff===0)correct++;if(r.diff>0)over++}
  const unk=new Map();
  for(const s of scans)if(!s.expectedKey){const k=unknownGroupKey(s);if(!unk.has(k))unk.set(k,{key:k,scans:[]});unk.get(k).scans.push(s)}
  return{rows,missing,correct,over,unknown:[...unk.values()]};
}

function expiryToMonth(v){
  const s=String(v||"").trim();
  if(/^\d{4}-\d{2}$/.test(s))return s;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s.slice(0,7);
  if(/^\d{6}$/.test(s))return`20${s.slice(0,2)}-${s.slice(2,4)}`;
  return"";
}
function expiryDisplay(v){
  const s=String(v||"").trim();
  if(/^\d{4}-\d{2}$/.test(s))return`${s.slice(5,7)}/${s.slice(0,4)}`;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return`${s.slice(8,10)}/${s.slice(5,7)}/${s.slice(0,4)}`;
  if(/^\d{6}$/.test(s)){
    const yy=s.slice(0,2),mm=s.slice(2,4),dd=s.slice(4,6);
    return dd==="00"?`${mm}/20${yy}`:`${dd}/${mm}/20${yy}`;
  }
  return s||"Sin caducidad";
}
function scanExpiry(s){return s.manualExpiry||s.expiry||""}
function expirySummary(arr){
  const m=new Map();let none=0;
  for(const s of arr){const e=scanExpiry(s);if(!e){none++;continue}const d=expiryDisplay(e);m.set(d,(m.get(d)||0)+1)}
  const out=[...m.entries()].map(([d,n])=>n>1?`${d} ×${n}`:d);if(none)out.push(`SIN CAD. ×${none}`);return out.join(" · ")||"—";
}

function scanUnitHtml(s,i){
  const fmt=esc(s.format||"código"),serial=s.serial?` · serie ${esc(s.serial)}`:"",lot=s.lot?` · lote ${esc(s.lot)}`:"",sid=encodeURIComponent(s.id);
  if((s.format||"")==="DataMatrix"||s.serial){
    return`<div class="scanUnit"><div class="unitRow"><div class="unitLabel">Caja ${i+1} · ${fmt}${serial}${lot}</div><div class="autoExpiry">Cad. ${esc(expiryDisplay(scanExpiry(s)))}</div></div><div class="unitActions"><button class="danger miniBtn" data-delete-scan="${sid}">Borrar caja</button></div></div>`;
  }
  const val=esc(expiryToMonth(s.manualExpiry||s.expiry||""));
  return`<div class="scanUnit"><div class="unitRow"><div class="unitLabel">Caja ${i+1} · ${fmt} · ${esc(s.gtin||s.raw||"")}</div><input class="expiryInput" type="month" value="${val}" data-expiry-id="${sid}" aria-label="Caducidad caja ${i+1}"></div><div class="unitActions"><button class="danger miniBtn" data-delete-scan="${sid}">Borrar caja</button></div></div>`;
}

function assignUnknownCN(groupKey,cn){
  const d=String(cn||"").replace(/\D/g,"");
  if(d.length!==6&&d.length!==7){feedback("El CN debe tener 6 o 7 dígitos.","bad");return}
  const k=resolveCN(d);let n=0;
  scans=scans.map(s=>{
    if(!s.expectedKey&&unknownGroupKey(s)===groupKey){n++;return{...s,assignedCN:d,cn6:d.slice(0,6),code7:d.length===7?d:s.code7,expectedKey:k||""}}
    return s;
  });
  save(KS,scans);render();
  feedback(k?`<b>CN ${esc(d)} asignado.</b> ${n} unidad(es) pasan a contar contra el medicamento de la lista.`:`<b>CN ${esc(d)} guardado.</b> No está en la lista actual, pero quedará identificado en el informe.`,k?"good":"warn");
}
function deleteUnknownGroup(groupKey){
  const n=scans.filter(s=>!s.expectedKey&&unknownGroupKey(s)===groupKey).length;
  if(!n)return;
  if(!confirm(`¿Borrar ${n} escaneo(s) de este desconocido para poder empezar de nuevo?`))return;
  scans=scans.filter(s=>!(!s.expectedKey&&unknownGroupKey(s)===groupKey));save(KS,scans);render();feedback(`${n} escaneo(s) eliminados. Puedes volver a escanear ese producto.`);
}
function setExpiry(scanId,value){
  scans=scans.map(s=>s.id===scanId?{...s,manualExpiry:String(value||"")}:s);save(KS,scans);render();
}
function deleteScan(scanId){
  const s=scans.find(x=>x.id===scanId);
  if(!s)return;
  scans=scans.filter(x=>x.id!==scanId);save(KS,scans);render();
  feedback(`Caja eliminada del recuento${s.serial?` · serie ${esc(s.serial)}`:""}.`);
}
function deleteKnownGroup(expectedKey){
  const item=expected.find(x=>x.key===expectedKey),n=scans.filter(s=>s.expectedKey===expectedKey).length;
  if(!n)return;
  if(!confirm(`¿Borrar las ${n} caja(s) contadas de ${item?.name||"este producto"}? La línea de Farmatic se conserva.`))return;
  scans=scans.filter(s=>s.expectedKey!==expectedKey);save(KS,scans);render();
  feedback(`${n} caja(s) eliminadas del recuento. Puedes volver a escanear el producto.`);
}

function wireRowActions(){
  document.querySelectorAll("[data-expiry-id]").forEach(el=>el.addEventListener("change",()=>setExpiry(decodeURIComponent(el.dataset.expiryId),el.value)));
  document.querySelectorAll("[data-assign-group]").forEach(btn=>btn.addEventListener("click",()=>{const g=decodeURIComponent(btn.dataset.assignGroup),inp=document.querySelector(`[data-cn-group="${CSS.escape(btn.dataset.assignGroup)}"]`);assignUnknownCN(g,inp?.value||"")}));
  document.querySelectorAll("[data-delete-group]").forEach(btn=>btn.addEventListener("click",()=>deleteUnknownGroup(decodeURIComponent(btn.dataset.deleteGroup))));
  document.querySelectorAll("[data-delete-scan]").forEach(btn=>btn.addEventListener("click",()=>deleteScan(decodeURIComponent(btn.dataset.deleteScan))));
  document.querySelectorAll("[data-delete-known]").forEach(btn=>btn.addEventListener("click",()=>deleteKnownGroup(decodeURIComponent(btn.dataset.deleteKnown))));
}

function render(){
  const has=expected.length>0;$("loadCard").classList.toggle("hidden",has);$("inventory").classList.toggle("hidden",!has);if(!has)return;
  const c=calc(),positive=expected.filter(x=>x.expected>0).length;
  $("mScan").textContent=scans.length;$("mMissing").textContent=c.missing;$("mCorrect").textContent=`${c.correct}/${positive}`;$("mIssues").textContent=c.over+c.unknown.length;$("undoBtn").disabled=!scans.length;
  const tabs=[["pending","Pendientes",c.rows.filter(r=>r.physical<r.expected).length],["correct","Cuadrados",c.rows.filter(r=>r.expected>0&&r.diff===0).length],["over","Sobran",c.rows.filter(r=>r.diff>0).length],["unknown","No previstos",c.unknown.length],["all","Todos",c.rows.length]];
  $("tabs").innerHTML=tabs.map(([id,l,n])=>`<button class="tab ${filter===id?"active":""}" data-f="${id}">${l} ${n}</button>`).join("");
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{filter=b.dataset.f;render()});
  const q=norm($("search").value),data=[];
  if(filter==="unknown")for(const g of c.unknown)data.push({unknown:true,groupKey:g.key,name:"No previsto",code:g.key.replace(/^[^:]+:/,""),format:g.scans[0].format,physical:g.scans.length,scans:g.scans,assignedCN:g.scans.find(s=>s.assignedCN)?.assignedCN||""});
  else for(const r of c.rows){if(filter==="pending"&&r.physical>=r.expected)continue;if(filter==="correct"&&!(r.expected>0&&r.diff===0))continue;if(filter==="over"&&r.diff<=0)continue;data.push(r)}
  const list=q?data.filter(r=>norm(`${r.name} ${r.farmaticCode||r.code||""} ${r.assignedCN||""}`).includes(q)):data;
  $("rows").innerHTML=list.length?list.map(r=>{
    if(r.unknown){
      const enc=encodeURIComponent(r.groupKey);
      return`<div class="row"><div class="rowgrid"><div><div class="name">${esc(r.name)}</div><div class="code">${esc(r.format||"código")} · ${esc(r.code)}</div>${r.assignedCN?`<div class="assigned">CN asignado: ${esc(r.assignedCN)}</div>`:""}</div><div class="count"><b>${r.physical}</b><div class="delta warntxt">añadir/revisar</div></div></div><div class="unknownTools"><input class="cnInput" inputmode="numeric" maxlength="7" placeholder="CN 6/7 dígitos" value="${esc(r.assignedCN)}" data-cn-group="${enc}"><button class="secondary" data-assign-group="${enc}">Asignar CN</button><button class="danger" data-delete-group="${enc}">Borrar</button></div><details><summary>Caducidades · ${esc(expirySummary(r.scans))}</summary><div class="unitList">${r.scans.map(scanUnitHtml).join("")}</div></details></div>`;
    }
    const d=r.diff,txt=d===0?"correcto":d>0?`sobra ${d}`:`faltan ${-d}`,cls=d===0?"goodtxt":d>0?"badtxt":"";
    const rs=scans.filter(s=>s.expectedKey===r.key);
    const rk=encodeURIComponent(r.key);
    return`<div class="row"><div class="rowgrid"><div><div class="name">${esc(r.name)}</div><div class="code">Farmatic ${esc(r.farmaticCode)}</div></div><div class="count"><b>${r.physical} / ${r.expected}</b><div class="delta ${cls}">${txt}</div></div></div>${rs.length?`<div class="knownTools"><button class="danger miniBtn" data-delete-known="${rk}">Borrar recuento (${rs.length})</button></div><details><summary>Caducidades · ${esc(expirySummary(rs))}</summary><div class="unitList">${rs.map(scanUnitHtml).join("")}</div></details>`:""}</div>`;
  }).join(""):'<div class="empty">No hay elementos.</div>';
  wireRowActions();
}

function csv(v){return'"'+String(v??"").replace(/"/g,'""')+'"'}
function exportCSV(){
  const c=calc(),rows=[["Codigo_Farmatic","Descripcion","Stock_Farmatic","Contado","Diferencia","Estado","Caducidades","Codigos_leidos"]];
  for(const r of c.rows){const rs=scans.filter(s=>s.expectedKey===r.key),rd=rs.map(s=>`[${s.format||""}] ${s.gtin||s.raw}`).join(" | ");rows.push([r.farmaticCode,r.name,r.expected,r.physical,r.diff,r.diff===0?"CORRECTO":r.diff>0?"SOBRA":"FALTA",expirySummary(rs),rd])}
  for(const g of c.unknown){const cn=g.scans.find(s=>s.assignedCN)?.assignedCN||"";rows.push([cn,"NO PREVISTO",0,g.scans.length,g.scans.length,"AÑADIR/REVISAR",expirySummary(g.scans),g.scans.map(s=>`[${s.format||""}] ${s.gtin||s.raw}`).join(" | ")])}
  const b=new Blob(["\uFEFF"+rows.map(r=>r.map(csv).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download="resultado_frigo.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}

function exportPDF(){
  const JsPDF=window.jspdf?.jsPDF;
  if(!JsPDF){feedback("No se ha cargado el generador PDF. Recarga con conexión.","bad");return}
  const c=calc(),doc=new JsPDF({orientation:"landscape",unit:"mm",format:"a4"});
  const now=new Date(),stamp=now.toLocaleString("es-ES");
  doc.setFont("helvetica","bold");doc.setFontSize(16);doc.text("INVENTARIO FRIGO · FARMATIC",12,13);
  doc.setFont("helvetica","normal");doc.setFontSize(9);doc.text(`Generado: ${stamp}    ·    Unidades escaneadas: ${scans.length}    ·    Faltan: ${c.missing}    ·    Incidencias: ${c.over+c.unknown.length}`,12,19);
  const body=c.rows.map(r=>{const rs=scans.filter(s=>s.expectedKey===r.key);return[r.farmaticCode,r.name,String(r.expected),String(r.physical),r.diff>0?`+${r.diff}`:String(r.diff),r.diff===0?"CORRECTO":r.diff>0?"SOBRA":"FALTA",expirySummary(rs)]});
  doc.autoTable({startY:24,head:[["Código","Descripción","Farmatic","Físico","Dif.","Estado","Caducidades"]],body,theme:"grid",styles:{fontSize:7,cellPadding:1.8,valign:"middle"},headStyles:{fillColor:[35,40,50]},columnStyles:{0:{cellWidth:22},1:{cellWidth:96},2:{cellWidth:16,halign:"center"},3:{cellWidth:16,halign:"center"},4:{cellWidth:14,halign:"center"},5:{cellWidth:22},6:{cellWidth:75}},margin:{left:10,right:10}});
  if(c.unknown.length){
    let y=(doc.lastAutoTable?.finalY||24)+8;if(y>175){doc.addPage();y=14}
    doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text("ARTÍCULOS NO PREVISTOS",10,y);y+=4;
    const ub=c.unknown.map(g=>{const s=g.scans[0],cn=g.scans.find(x=>x.assignedCN)?.assignedCN||"";return[s.format||"código",s.gtin||s.raw,cn,String(g.scans.length),expirySummary(g.scans)]});
    doc.autoTable({startY:y,head:[["Formato","Código leído","CN asignado","Unidades","Caducidades"]],body:ub,theme:"grid",styles:{fontSize:7,cellPadding:1.8},headStyles:{fillColor:[35,40,50]},columnStyles:{0:{cellWidth:28},1:{cellWidth:95},2:{cellWidth:28},3:{cellWidth:20,halign:"center"},4:{cellWidth:95}},margin:{left:10,right:10}});
  }
  doc.save(`inventario_frigo_${now.toISOString().slice(0,10)}.pdf`);feedback("Informe PDF generado.","good");
}

$("fileInput").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;$("loadStatus").textContent="Leyendo…";try{expected=parseWorkbook(await f.arrayBuffer());scans=[];save(KL,expected);save(KS,scans);render();feedback(`Lista cargada: ${expected.length} artículos.`,"good")}catch(err){$("loadStatus").textContent="Error: "+(err?.message||err)}};
$("undoBtn").onclick=()=>{if(scans.length){scans.pop();save(KS,scans);render();feedback("Último escaneo deshecho.")}};
$("search").oninput=render;$("exportBtn").onclick=exportCSV;$("pdfBtn").onclick=exportPDF;
$("changeListBtn").onclick=()=>{stop();expected=[];scans=[];localStorage.removeItem(KL);localStorage.removeItem(KS);$("fileInput").value="";render()};
$("resetBtn").onclick=()=>{if(confirm("¿Borrar los escaneos?")){scans=[];save(KS,scans);render()}};
render();
