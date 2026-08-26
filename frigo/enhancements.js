"use strict";

const FRIGO_ASSIGNMENTS_KEY="frigo_unknown_assignments_v1";
let frigoAssignments=load(FRIGO_ASSIGNMENTS_KEY,{});

function frigoUnknownSignature(format,raw,gtin){
  return `${format||""}:${gtin||raw||""}`;
}
function frigoUnknownSignatureFromParsed(p){
  return frigoUnknownSignature(p?.format,p?.raw,p?.gtin);
}
function frigoResolveCN(cn){
  const d=String(cn||"").replace(/\D/g,"");
  const m=maps();
  if(d.length===7&&m.c7.has(d))return m.c7.get(d);
  if(d.length>=6&&m.c6.has(d.slice(0,6)))return m.c6.get(d.slice(0,6));
  return "";
}

const frigoBaseResolve=resolve;
resolve=function(p){
  const direct=frigoBaseResolve(p);
  if(direct)return direct;
  const a=frigoAssignments[frigoUnknownSignatureFromParsed(p)];
  return a?.cn?frigoResolveCN(a.cn):"";
};

function frigoApplyAssignments(){
  let changed=false;
  for(const s of scans){
    if(s.expectedKey)continue;
    const sig=frigoUnknownSignature(s.format,s.raw,s.gtin);
    const a=frigoAssignments[sig];
    if(!a?.cn)continue;
    s.assignedCN=a.cn;
    const k=frigoResolveCN(a.cn);
    if(k){s.expectedKey=k;changed=true}
  }
  if(changed)save(KS,scans);
}

const frigoBaseAddBatch=addBatch;
addBatch=function(items,dup=0){
  const before=scans.length;
  frigoBaseAddBatch(items,dup);
  let changed=false;
  for(let i=before;i<scans.length;i++){
    const s=scans[i];
    if(s.manualExpiry==null){s.manualExpiry="";changed=true}
    const a=frigoAssignments[frigoUnknownSignature(s.format,s.raw,s.gtin)];
    if(a?.cn&&!s.assignedCN){s.assignedCN=a.cn;changed=true}
  }
  if(changed)save(KS,scans);
};

function frigoExpiryLabel(s){
  if(s.manualExpiry){
    const [y,m]=String(s.manualExpiry).split("-");
    return y&&m?`${m}/${y}`:String(s.manualExpiry);
  }
  const d=String(s.expiry||"").replace(/\D/g,"");
  if(d.length===6){
    const yy=d.slice(0,2),mm=d.slice(2,4),dd=d.slice(4,6);
    return dd&&dd!=="00"?`${dd}/${mm}/20${yy}`:`${mm}/20${yy}`;
  }
  return "";
}

const frigoBaseCalc=calc;
calc=function(){
  frigoApplyAssignments();
  const c=frigoBaseCalc();
  for(const g of c.unknown){
    g.assignment=frigoAssignments[g.key]||null;
  }
  return c;
};

function frigoRenderScanList(scanList){
  if(!scanList.length)return "";
  return `<details><summary>Ver ${scanList.length} unidad(es) y caducidades</summary><div class="scanList">`+
    scanList.map(s=>{
      const dm=String(s.format||"")==="DataMatrix"||!!s.serial;
      const ident=dm
        ? `Data Matrix${s.serial?` · serie ${esc(s.serial)}`:""}${s.lot?` · lote ${esc(s.lot)}`:""}`
        : `${esc(s.format||"código")} · ${esc(s.gtin||s.raw)}`;
      const auto=frigoExpiryLabel(s);
      const expiryBlock=dm
        ? `<div class="scanMeta">Caducidad: <b>${esc(auto||"no disponible")}</b></div>`
        : `<div class="expiryLine"><label>Caducidad manual</label><input class="expiryInput" type="month" value="${esc(s.manualExpiry||"")}" data-scan="${esc(s.id)}"></div>`;
      return `<div class="scanUnit"><div class="scanMeta">${ident}</div>${expiryBlock}</div>`;
    }).join("")+`</div></details>`;
}

render=function(){
  frigoApplyAssignments();
  const has=expected.length>0;
  $("loadCard").classList.toggle("hidden",has);
  $("inventory").classList.toggle("hidden",!has);
  if(!has)return;

  const c=calc(),positive=expected.filter(x=>x.expected>0).length;
  $("mScan").textContent=scans.length;
  $("mMissing").textContent=c.missing;
  $("mCorrect").textContent=`${c.correct}/${positive}`;
  $("mIssues").textContent=c.over+c.unknown.length;
  $("undoBtn").disabled=!scans.length;

  const tabs=[
    ["pending","Pendientes",c.rows.filter(r=>r.physical<r.expected).length],
    ["correct","Cuadrados",c.rows.filter(r=>r.expected>0&&r.diff===0).length],
    ["over","Sobran",c.rows.filter(r=>r.diff>0).length],
    ["unknown","No previstos",c.unknown.length],
    ["all","Todos",c.rows.length]
  ];
  $("tabs").innerHTML=tabs.map(([id,l,n])=>`<button class="tab ${filter===id?"active":""}" data-f="${id}">${l} ${n}</button>`).join("");
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{filter=b.dataset.f;render()});

  const q=norm($("search").value),data=[];
  if(filter==="unknown"){
    for(const g of c.unknown){
      data.push({
        unknown:true,groupKey:g.key,name:"No previsto",
        code:g.key.replace(/^[^:]+:/,""),
        format:g.scans[0]?.format||"",physical:g.scans.length,
        scans:g.scans,assignment:g.assignment
      });
    }
  }else{
    for(const r of c.rows){
      if(filter==="pending"&&r.physical>=r.expected)continue;
      if(filter==="correct"&&!(r.expected>0&&r.diff===0))continue;
      if(filter==="over"&&r.diff<=0)continue;
      data.push(r);
    }
  }
  const list=q?data.filter(r=>norm(`${r.name} ${r.farmaticCode||r.code||""} ${r.assignment?.cn||""}`).includes(q)):data;

  $("rows").innerHTML=list.length?list.map(r=>{
    if(r.unknown){
      const ass=r.assignment?.cn?`<div class="assigned">CN asignado: <b>${esc(r.assignment.cn)}</b>${r.assignment.name?` · ${esc(r.assignment.name)}`:""}</div>`:"";
      return `<div class="row">
        <div class="rowgrid">
          <div>
            <div class="name">${esc(r.name)}</div>
            <div class="code">${esc(r.format||"código")} · ${esc(r.code)}</div>
            ${ass}
          </div>
          <div class="count"><b>${r.physical}</b><div class="delta warntxt">añadir/revisar</div></div>
        </div>
        <div class="unknownTools">
          <input class="cnInput" inputmode="numeric" pattern="[0-9]*" maxlength="7" placeholder="CN 6/7 cifras" value="${esc(r.assignment?.cn||"")}" data-cn-for="${esc(r.groupKey)}">
          <button class="secondary miniBtn assignCNBtn" data-group="${esc(r.groupKey)}">Asignar CN</button>
          <button class="danger miniBtn deleteUnknownBtn" data-group="${esc(r.groupKey)}">Borrar este desconocido</button>
        </div>
        ${frigoRenderScanList(r.scans)}
      </div>`;
    }

    const d=r.diff;
    const txt=d===0?"correcto":d>0?`sobra ${d}`:`faltan ${-d}`;
    const cls=d===0?"goodtxt":d>0?"badtxt":"";
    const related=scans.filter(s=>s.expectedKey===r.key);
    const exps=[...new Set(related.map(frigoExpiryLabel).filter(Boolean))];
    return `<div class="row">
      <div class="rowgrid">
        <div>
          <div class="name">${esc(r.name)}</div>
          <div class="code">Farmatic ${esc(r.farmaticCode)}${r.cn6?` · CN ${esc(r.cn6)}`:""}</div>
          ${exps.length?`<div class="scanMeta">Cad.: ${esc(exps.join(", "))}</div>`:""}
        </div>
        <div class="count"><b>${r.physical} / ${r.expected}</b><div class="delta ${cls}">${txt}</div></div>
      </div>
      ${frigoRenderScanList(related)}
    </div>`;
  }).join(""):'<div class="empty">No hay elementos.</div>';

  frigoBindRowActions();
};

function frigoBindRowActions(){
  document.querySelectorAll(".expiryInput").forEach(inp=>{
    inp.addEventListener("change",()=>{
      const s=scans.find(x=>x.id===inp.dataset.scan);
      if(!s)return;
      s.manualExpiry=inp.value||"";
      save(KS,scans);
      feedback("Caducidad guardada.","good");
      render();
    });
  });

  document.querySelectorAll(".assignCNBtn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const group=btn.dataset.group;
      const inp=[...document.querySelectorAll(".cnInput")].find(x=>x.dataset.cnFor===group);
      const cn=String(inp?.value||"").replace(/\D/g,"");
      if(cn.length!==6&&cn.length!==7){
        feedback("Introduce un CN de 6 o 7 cifras.","bad");return;
      }

      const k=frigoResolveCN(cn);
      const item=k?expected.find(x=>x.key===k):null;
      frigoAssignments[group]={cn,name:item?.name||"",updatedAt:new Date().toISOString()};
      save(FRIGO_ASSIGNMENTS_KEY,frigoAssignments);

      let moved=0;
      for(const s of scans){
        if(s.expectedKey)continue;
        if(frigoUnknownSignature(s.format,s.raw,s.gtin)!==group)continue;
        s.assignedCN=cn;
        if(k){s.expectedKey=k;moved++}
      }
      save(KS,scans);
      feedback(
        item
          ?`CN ${esc(cn)} asignado a <b>${esc(item.name)}</b>. ${moved} unidad(es) pasan a ese producto.`
          :`CN ${esc(cn)} guardado. No está en esta lista de Farmatic, pero queda identificado.`,
        "good"
      );
      render();
    });
  });

  document.querySelectorAll(".deleteUnknownBtn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const group=btn.dataset.group;
      const g=calc().unknown.find(x=>x.key===group);
      const n=g?.scans.length||0;
      if(!n)return;
      if(!confirm(`¿Borrar ${n} escaneo(s) de este desconocido para poder empezar de nuevo?`))return;
      scans=scans.filter(s=>s.expectedKey||frigoUnknownSignature(s.format,s.raw,s.gtin)!==group);
      delete frigoAssignments[group];
      save(KS,scans);save(FRIGO_ASSIGNMENTS_KEY,frigoAssignments);
      feedback(`${n} escaneo(s) desconocido(s) borrados.`,"good");
      render();
    });
  });
}

exportCSV=function(){
  const c=calc();
  const rows=[["Codigo_Farmatic","CN","Descripcion","Stock_Farmatic","Contado","Diferencia","Estado","Caducidades","Codigos_leidos"]];
  for(const r of c.rows){
    const rd=scans.filter(s=>s.expectedKey===r.key);
    rows.push([
      r.farmaticCode,r.cn6||"",r.name,r.expected,r.physical,r.diff,
      r.diff===0?"CORRECTO":r.diff>0?"SOBRA":"FALTA",
      [...new Set(rd.map(frigoExpiryLabel).filter(Boolean))].join(" | "),
      rd.map(s=>`[${s.format||""}] ${s.gtin||s.raw}`).join(" | ")
    ]);
  }
  for(const g of c.unknown){
    rows.push([
      "",g.assignment?.cn||"","NO PREVISTO",0,g.scans.length,g.scans.length,"AÑADIR/REVISAR",
      [...new Set(g.scans.map(frigoExpiryLabel).filter(Boolean))].join(" | "),
      g.scans.map(s=>`[${s.format||""}] ${s.gtin||s.raw}`).join(" | ")
    ]);
  }
  const b=new Blob(["\uFEFF"+rows.map(r=>r.map(csv).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const u=URL.createObjectURL(b),a=document.createElement("a");
  a.href=u;a.download="resultado_frigo.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
};
$("exportBtn").onclick=exportCSV;

function frigoMakePDF(){
  const JsPDF=window.jspdf?.jsPDF;
  if(!JsPDF){feedback("No se ha podido cargar el generador PDF. Recarga con conexión.","bad");return}
  const doc=new JsPDF({orientation:"landscape",unit:"mm",format:"a4"});
  const c=calc(),now=new Date();
  const expectedUnits=expected.reduce((a,x)=>a+x.expected,0);

  doc.setFont("helvetica","bold");doc.setFontSize(16);
  doc.text("Inventario FRIGO · conciliación Farmatic",14,14);
  doc.setFont("helvetica","normal");doc.setFontSize(9);
  doc.text(`Generado: ${now.toLocaleString("es-ES")}`,14,20);
  doc.text(`Artículos: ${expected.length} · Stock esperado: ${expectedUnits} · Escaneado: ${scans.length} · Faltan: ${c.missing} · No previstos: ${c.unknown.length}`,14,25);

  const expiryForKey=key=>{
    const arr=scans.filter(s=>s.expectedKey===key).map(frigoExpiryLabel).filter(Boolean);
    return [...new Set(arr)].join(", ")||"—";
  };

  const issueRows=[];
  for(const r of c.rows){
    if(r.diff===0)continue;
    issueRows.push([r.farmaticCode,r.name,String(r.expected),String(r.physical),String(r.diff),r.diff>0?"SOBRA":"FALTA",expiryForKey(r.key)]);
  }
  for(const g of c.unknown){
    issueRows.push([
      g.assignment?.cn||"—",
      `NO PREVISTO · ${g.scans[0]?.format||""} ${g.scans[0]?.gtin||g.scans[0]?.raw||""}`,
      "0",String(g.scans.length),`+${g.scans.length}`,"AÑADIR / REVISAR",
      [...new Set(g.scans.map(frigoExpiryLabel).filter(Boolean))].join(", ")||"—"
    ]);
  }

  doc.setFont("helvetica","bold");doc.setFontSize(11);
  doc.text("Incidencias",14,33);
  doc.autoTable({
    startY:36,
    head:[["Código / CN","Descripción","Farmatic","Físico","Dif.","Estado","Caducidades"]],
    body:issueRows.length?issueRows:[["—","Sin incidencias","—","—","0","CORRECTO","—"]],
    styles:{fontSize:7,cellPadding:1.5,overflow:"linebreak"},
    headStyles:{fillColor:[30,41,59]},
    columnStyles:{0:{cellWidth:24},1:{cellWidth:92},2:{cellWidth:18},3:{cellWidth:18},4:{cellWidth:15},5:{cellWidth:28},6:{cellWidth:55}}
  });

  let y=(doc.lastAutoTable?.finalY||36)+7;
  if(y>175){doc.addPage();y=14}
  doc.setFont("helvetica","bold");doc.setFontSize(11);
  doc.text("Inventario completo",14,y);

  doc.autoTable({
    startY:y+3,
    head:[["Código","Descripción","Farmatic","Físico","Dif.","Estado","Caducidades"]],
    body:c.rows.map(r=>[
      r.farmaticCode,r.name,String(r.expected),String(r.physical),String(r.diff),
      r.diff===0?"CORRECTO":r.diff>0?"SOBRA":"FALTA",expiryForKey(r.key)
    ]),
    styles:{fontSize:6.7,cellPadding:1.3,overflow:"linebreak"},
    headStyles:{fillColor:[30,41,59]},
    columnStyles:{0:{cellWidth:24},1:{cellWidth:98},2:{cellWidth:18},3:{cellWidth:18},4:{cellWidth:15},5:{cellWidth:25},6:{cellWidth:52}},
    didDrawPage:()=>{
      const page=doc.internal.getNumberOfPages();
      doc.setFontSize(7);doc.setTextColor(100);
      doc.text(`FRIGO · página ${page}`,278,202,{align:"right"});
      doc.setTextColor(0);
    }
  });

  doc.save(`inventario_frigo_${now.toISOString().slice(0,10)}.pdf`);
  feedback("PDF generado. Puedes abrirlo desde Descargas y mandarlo a imprimir.","good");
}

$("pdfBtn").onclick=frigoMakePDF;

for(const s of scans)if(s.manualExpiry==null)s.manualExpiry="";
save(KS,scans);
frigoApplyAssignments();
render();
