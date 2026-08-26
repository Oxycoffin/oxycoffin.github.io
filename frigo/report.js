"use strict";

(function(){
  // Layout tuned for a real printed A4 landscape sheet.
  // Pages are balanced and row height is calculated so the table uses almost
  // the full printable height instead of being compressed into the top half.
  const MAX_ROWS_PER_PAGE = 37;
  const MARGIN_X = 4.5;
  const TABLE_W = 288;
  const COLS = [18, 196, 15, 59];
  const HEADER_Y = 15.0;
  const HEADER_H = 5.0;
  const BODY_BOTTOM = 199.2;
  const FOOTER_Y = 206.0;
  const MIN_ROW_H = 4.7;
  const MAX_ROW_H = 5.55;

  function reportConfig(){
    const est = location.pathname.includes("/estupas");
    return est
      ? {title:"ESTUPEFACIENTES - STOCK Y CADUCIDADES", filename:"lista_estupefacientes_caducidades.pdf"}
      : {title:"FRIGO - STOCK Y CADUCIDADES", filename:"lista_frigo_caducidades.pdf"};
  }

  function pad2(n){ return String(n).padStart(2,"0"); }
  function fmtDate(d){ return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`; }
  function cutoffDate(now){ return new Date(now.getFullYear(), now.getMonth()+7, 0, 23, 59, 59, 999); }

  function parseExpiry(raw){
    const s=String(raw||"").trim();
    let y,m,d,display="";
    if(/^\d{4}-\d{2}$/.test(s)){
      y=+s.slice(0,4); m=+s.slice(5,7); d=new Date(y,m,0).getDate(); display=`${pad2(m)}/${y}`;
    } else if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
      y=+s.slice(0,4); m=+s.slice(5,7); const dd=+s.slice(8,10); d=dd||new Date(y,m,0).getDate(); display=dd?`${pad2(dd)}/${pad2(m)}/${y}`:`${pad2(m)}/${y}`;
    } else if(/^\d{6}$/.test(s)){
      y=2000 + +s.slice(0,2); m=+s.slice(2,4); const dd=+s.slice(4,6); d=dd||new Date(y,m,0).getDate(); display=dd?`${pad2(dd)}/${pad2(m)}/${y}`:`${pad2(m)}/${y}`;
    } else {
      return null;
    }
    if(m<1||m>12||d<1||d>31)return null;
    const date=new Date(y,m-1,d,23,59,59,999);
    if(Number.isNaN(date.getTime()))return null;
    return {date,display};
  }

  function expiryGroups(unitScans, cutoff){
    if(!unitScans.length)return [{kind:"dash", text:"—"}];
    const map=new Map(); let none=0;
    for(const s of unitScans){
      const raw=(typeof scanExpiry==="function"?scanExpiry(s):(s.manualExpiry||s.expiry||""));
      if(!raw){none++;continue;}
      const p=parseExpiry(raw);
      const label=p?.display || (typeof expiryDisplay==="function"?expiryDisplay(raw):String(raw));
      const key=label;
      if(!map.has(key))map.set(key,{kind:"date",text:label,count:0,upcoming:!!(p&&p.date<=cutoff)});
      const g=map.get(key); g.count++; if(p&&p.date<=cutoff)g.upcoming=true;
    }
    const out=[...map.values()];
    if(none)out.push({kind:"none",text:"SIN CAD.",count:none,upcoming:false});
    return out.length?out:[{kind:"dash",text:"—"}];
  }

  function drawTriangle(doc,x,baseline,size=1.15){
    doc.setFillColor(20,20,20);
    doc.triangle(x,baseline-0.15,x+size,baseline-0.15,x+size/2,baseline-size*0.95,"F");
  }
  function drawCross(doc,x,baseline,size=1.0){
    doc.setDrawColor(20,20,20); doc.setLineWidth(0.27);
    doc.line(x,baseline-size,x+size,baseline);
    doc.line(x+size,baseline-size,x,baseline);
  }

  function fitText(doc,text,maxWidth){
    let s=String(text||"");
    if(doc.getTextWidth(s)<=maxWidth)return s;
    while(s.length>1 && doc.getTextWidth(s)>maxWidth)s=s.slice(0,-1);
    return s;
  }

  function drawExpiryRuns(doc,groups,x,y,w,fontBase){
    doc.setFont("helvetica","normal");
    let font=fontBase;
    const widthFor=(fs)=>{
      doc.setFontSize(fs); let total=0;
      groups.forEach((g,i)=>{
        if(g.upcoming)total+=1.55;
        total+=doc.getTextWidth(g.text+(g.count>1?` ×${g.count}`:""));
        if(i<groups.length-1)total+=doc.getTextWidth(" · ");
      });
      return total;
    };
    while(font>4.8 && widthFor(font)>w-1.7)font-=0.2;
    doc.setFontSize(font);
    let cx=x+1.0;
    for(let i=0;i<groups.length;i++){
      const g=groups[i];
      if(g.upcoming){drawTriangle(doc,cx,y,0.95);cx+=1.4;}
      let txt=g.text+(g.count>1?` ×${g.count}`:"");
      if(i<groups.length-1)txt+=" · ";
      const room=x+w-0.7-cx;
      if(room<=0)break;
      txt=fitText(doc,txt,room);
      doc.text(txt,cx,y);
      cx+=doc.getTextWidth(txt);
    }
  }

  function makeRows(c, cutoff){
    const rows=[];
    for(const r of c.rows){
      const rs=scans.filter(s=>s.expectedKey===r.key);
      const missing=r.expected>0 && r.physical===0;
      rows.push({
        code:String(r.farmaticCode||r.code7||r.cn6||""),
        description:String(r.name||""),
        stock:r.physical===r.expected?String(r.physical):`${r.physical}/${r.expected}`,
        missing,
        unknown:false,
        expiries:expiryGroups(rs,cutoff)
      });
    }
    for(const g of c.unknown){
      const first=g.scans[0]||{};
      const assigned=g.scans.find(s=>s.assignedCN)?.assignedCN||"";
      const raw=first.gtin||first.raw||"";
      rows.push({
        code:String(assigned||raw||"?"),
        description:`NO PREVISTO - ${first.format||"CÓDIGO"}${raw?` ${raw}`:""}`,
        stock:`${g.scans.length}/0`,
        missing:false,
        unknown:true,
        expiries:expiryGroups(g.scans,cutoff)
      });
    }
    return rows;
  }

  function drawPageHeader(doc, cfg, now, cutoff, page, pages){
    const dateText=fmtDate(now), pageText=`${page}/${pages}`;
    doc.setTextColor(15,15,15);
    doc.setFont("helvetica","bold"); doc.setFontSize(12.4);
    doc.text(cfg.title,6.2,8.3);
    const titleW=doc.getTextWidth(cfg.title);
    const dateX=Math.max(71,6.2+titleW+4.8);
    doc.setFont("helvetica","normal"); doc.setFontSize(7.4);
    doc.text(dateText,dateX,8.25);
    doc.text(pageText,dateX+16.5,8.25);

    const ly=12.3;
    drawTriangle(doc,6.3,ly,1.08);
    doc.setFontSize(6.35); doc.text(`PRÓXIMA CADUCIDAD (hasta ${fmtDate(cutoff)})`,8.25,ly);
    const firstW=doc.getTextWidth(`PRÓXIMA CADUCIDAD (hasta ${fmtDate(cutoff)})`);
    const x2=8.25+firstW+4.1;
    drawCross(doc,x2,ly,0.86);
    doc.text("NO LOCALIZADO",x2+1.7,ly);
    const x3=x2+1.7+doc.getTextWidth("NO LOCALIZADO")+4.2;
    doc.text("Stock: contado; si difiere, contado/Farmatic",x3,ly);
  }

  function drawTableHeader(doc){
    let x=MARGIN_X;
    doc.setFillColor(35,35,35); doc.setDrawColor(35,35,35);
    doc.rect(MARGIN_X,HEADER_Y,TABLE_W,HEADER_H,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(6.05); doc.setTextColor(255,255,255);
    const labels=["CÓDIGO","DESCRIPCIÓN","STOCK","CADUCIDAD(ES)"];
    for(let i=0;i<COLS.length;i++){
      const cx=x+COLS[i]/2;
      doc.text(labels[i],cx,HEADER_Y+3.25,{align:"center"});
      x+=COLS[i];
    }
  }

  function drawRow(doc,row,index,rowH){
    const y=HEADER_Y+HEADER_H+index*rowH;
    const fill=row.missing?[224,224,224]:row.unknown?[246,246,246]:[255,255,255];
    doc.setFillColor(...fill); doc.setDrawColor(177,177,177); doc.setLineWidth(0.10);
    let x=MARGIN_X;
    for(const w of COLS){doc.rect(x,y,w,rowH,"FD");x+=w;}
    const baseline=y+rowH*0.67;
    const rowFont=Math.min(6.35,Math.max(5.75,5.75+(rowH-MIN_ROW_H)*0.7));
    doc.setTextColor(20,20,20); doc.setFontSize(rowFont); doc.setFont("helvetica","normal");

    x=MARGIN_X;
    doc.text(fitText(doc,row.code,COLS[0]-1.2),x+COLS[0]/2,baseline,{align:"center"});
    x+=COLS[0];

    if(row.missing){
      drawCross(doc,x+1.1,baseline,0.80);
      doc.setFont("helvetica","bold");
      const prefix="NO LOCALIZADO - ";
      doc.text(prefix,x+2.6,baseline);
      const px=x+2.6+doc.getTextWidth(prefix);
      doc.setFont("helvetica","normal");
      doc.text(fitText(doc,row.description,COLS[1]-(px-x)-1.0),px,baseline);
    }else{
      doc.text(fitText(doc,row.description,COLS[1]-1.7),x+0.85,baseline);
    }
    x+=COLS[1];

    if(row.missing){
      drawCross(doc,x+3.7,baseline,0.74);
      doc.text(row.stock,x+7.0,baseline);
    }else doc.text(row.stock,x+COLS[2]/2,baseline,{align:"center"});
    x+=COLS[2];

    drawExpiryRuns(doc,row.expiries,x,baseline,COLS[3],rowFont);
  }

  function drawFooter(doc,page,pages){
    doc.setFont("helvetica","normal"); doc.setFontSize(6.2); doc.setTextColor(40,40,40);
    doc.text(`${page}/${pages}`,291.8,FOOTER_Y,{align:"right"});
  }

  function generateStockExpiryReport(){
    if(!window.jspdf?.jsPDF){feedback("No se ha cargado el generador PDF.","bad");return;}
    const cfg=reportConfig(), now=new Date(), cutoff=cutoffDate(now), c=calc();
    const rows=makeRows(c,cutoff);

    // First decide how many pages are needed with the same maximum density as
    // the reference report. Then balance the rows across pages so neither page
    // is unnecessarily sparse.
    const pages=Math.max(1,Math.ceil(rows.length/MAX_ROWS_PER_PAGE));
    const rowsPerPage=Math.max(1,Math.ceil(rows.length/pages));
    const availableBody=BODY_BOTTOM-(HEADER_Y+HEADER_H);
    const rowH=Math.max(MIN_ROW_H,Math.min(MAX_ROW_H,availableBody/rowsPerPage));

    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});
    doc.setProperties({title:cfg.title,subject:"Stock y caducidades",creator:"Inventario Farmatic"});

    for(let p=1;p<=pages;p++){
      if(p>1)doc.addPage("a4","landscape");
      drawPageHeader(doc,cfg,now,cutoff,p,pages);
      drawTableHeader(doc);
      const start=(p-1)*rowsPerPage,end=Math.min(start+rowsPerPage,rows.length);
      for(let i=start;i<end;i++)drawRow(doc,rows[i],i-start,rowH);
      drawFooter(doc,p,pages);
    }
    doc.save(cfg.filename);
  }

  window.generateStockExpiryReport=generateStockExpiryReport;
  const btn=document.getElementById("pdfBtn");
  if(btn)btn.onclick=generateStockExpiryReport;
})();
