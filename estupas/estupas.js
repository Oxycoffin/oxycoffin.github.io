"use strict";

function estupasCsvCell(v){return '"'+String(v??"").replace(/"/g,'""')+'"'}

function exportEstupasCSV(){
  const c=calc();
  const rows=[["Codigo_Farmatic","Descripcion","Stock_Farmatic","Contado","Diferencia","Estado","Caducidades","Codigos_leidos"]];
  for(const r of c.rows){
    const rs=scans.filter(s=>s.expectedKey===r.key);
    const rd=rs.map(s=>`[${s.format||""}] ${s.gtin||s.raw}`).join(" | ");
    rows.push([r.farmaticCode,r.name,r.expected,r.physical,r.diff,r.diff===0?"CORRECTO":r.diff>0?"SOBRA":"FALTA",expirySummary(rs),rd]);
  }
  for(const g of c.unknown){
    const cn=g.scans.find(s=>s.assignedCN)?.assignedCN||"";
    rows.push([cn,"NO PREVISTO",0,g.scans.length,g.scans.length,"AÑADIR/REVISAR",expirySummary(g.scans),g.scans.map(s=>`[${s.format||""}] ${s.gtin||s.raw}`).join(" | ")]);
  }
  const blob=new Blob(["\uFEFF"+rows.map(r=>r.map(estupasCsvCell).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="resultado_estupefacientes.csv";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function generateEstupasPDF(){
  if(!window.jspdf?.jsPDF){feedback("No se ha cargado el generador PDF.","bad");return}
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"}),c=calc();
  doc.setFontSize(16);
  doc.text("Inventario ESTUPEFACIENTES · Farmatic",14,14);
  doc.setFontSize(9);
  doc.text(`Generado ${new Date().toLocaleString("es-ES")} · Escaneadas ${scans.length} uds.`,14,20);

  const body=c.rows.map(r=>{
    const rs=scans.filter(s=>s.expectedKey===r.key);
    return [r.farmaticCode,r.name,String(r.expected),String(r.physical),String(r.diff),r.diff===0?"CORRECTO":r.diff>0?"SOBRA":"FALTA",expirySummary(rs)];
  });

  doc.autoTable({
    startY:25,
    head:[["Código","Descripción","Farmatic","Físico","Dif.","Estado","Caducidades"]],
    body,
    styles:{fontSize:7,cellPadding:1.4},
    headStyles:{fontSize:7.5},
    columnStyles:{0:{cellWidth:22},1:{cellWidth:78},2:{cellWidth:16},3:{cellWidth:16},4:{cellWidth:14},5:{cellWidth:22},6:{cellWidth:95}},
    didParseCell:data=>{
      if(data.section==="body"&&data.column.index===5){
        const v=String(data.cell.raw);
        if(v==="FALTA"||v==="SOBRA")data.cell.styles.fontStyle="bold";
      }
    }
  });

  if(c.unknown.length){
    let y=doc.lastAutoTable.finalY+8;
    if(y>175){doc.addPage();y=14}
    doc.setFontSize(12);
    doc.text("Artículos no previstos / por identificar",14,y);
    const ub=c.unknown.map(g=>{
      const s=g.scans[0],cn=g.scans.find(x=>x.assignedCN)?.assignedCN||"";
      return [s.format||"código",s.gtin||s.raw||"",cn,String(g.scans.length),expirySummary(g.scans)];
    });
    doc.autoTable({
      startY:y+4,
      head:[["Tipo","Código leído","CN asignado","Uds.","Caducidades"]],
      body:ub,
      styles:{fontSize:7,cellPadding:1.5},
      columnStyles:{0:{cellWidth:25},1:{cellWidth:72},2:{cellWidth:28},3:{cellWidth:16},4:{cellWidth:105}}
    });
  }

  const pages=doc.getNumberOfPages();
  for(let p=1;p<=pages;p++){
    doc.setPage(p);doc.setFontSize(7);doc.text(`Página ${p}/${pages}`,270,202,{align:"right"});
  }
  doc.save("inventario_estupefacientes_farmatic.pdf");
}

$("exportBtn").onclick=exportEstupasCSV;
$("pdfBtn").onclick=generateEstupasPDF;
