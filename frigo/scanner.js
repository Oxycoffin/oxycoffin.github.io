"use strict";

let scanEngine = "wasm";
let wasmReady = false;
let wasmInitPromise = null;
let wasmErrors = 0;
let jsReader = null;
let cropCanvas = null;
let cropIndex = 0;

function center(r,w,h){
  const p=r?.position;
  const pts=p?[p.topLeft,p.topRight,p.bottomRight,p.bottomLeft].filter(Boolean):[];
  return pts.length
    ? {x:pts.reduce((a,q)=>a+(q.x||0),0)/pts.length/w,y:pts.reduce((a,q)=>a+(q.y||0),0)/pts.length/h}
    : {x:.5,y:.5};
}

function collect(results,w,h){
  const now=performance.now(),items=[];
  let dup=0;
  linearTracks=linearTracks.filter(t=>now-t.last<1700);
  const used=new Set();
  const batchIds=new Set();
  const frameSeen=[];

  for(const r of results){
    if(!r||r.isValid===false||!r.text) continue;
    const p=parseDetected(r);
    if(!p) continue;

    if(p.serial){
      const id=p.fingerprint||p.raw;
      if(batchIds.has(id)) continue;
      batchIds.add(id);
      const last=dmLive.get(id)||0;
      dmLive.set(id,now);
      if(scans.some(s=>s.id===id)){
        if(now-last>1800) dup++;
        continue;
      }
      items.push({p,id});
      continue;
    }

    const c=center(r,w,h),key=(p.format||"BAR")+":"+p.raw;
    if(frameSeen.some(x=>x.key===key&&Math.hypot(x.x-c.x,x.y-c.y)<.12)) continue;
    frameSeen.push({key,x:c.x,y:c.y});
    let best=-1,dist=99;
    for(let i=0;i<linearTracks.length;i++){
      const t=linearTracks[i];
      if(used.has(i)||t.key!==key) continue;
      const d=Math.hypot(t.x-c.x,t.y-c.y);
      if(d<dist){dist=d;best=i;}
    }
    if(best>=0&&dist<.24){
      Object.assign(linearTracks[best],{x:c.x,y:c.y,last:now});
      used.add(best);
      continue;
    }
    linearTracks.push({key,x:c.x,y:c.y,last:now});
    used.add(linearTracks.length-1);
    items.push({p,id:`linear:${Date.now()}:${frame}:${items.length}:${Math.random()}`});
  }

  for(const [id,t] of dmLive) if(now-t>2300) dmLive.delete(id);
  return {items,dup};
}

function fit(){
  const v=$("video"),c=$("scanCanvas");
  if(!v.videoWidth||!v.videoHeight) return false;
  const maxSide=scanEngine==="wasm"?1152:960;
  const sc=Math.min(1,maxSide/Math.max(v.videoWidth,v.videoHeight));
  const w=Math.max(320,Math.round(v.videoWidth*sc));
  const h=Math.max(240,Math.round(v.videoHeight*sc));
  if(c.width!==w)c.width=w;
  if(c.height!==h)c.height=h;
  return true;
}

async function prepareWasm(){
  if(wasmReady) return true;
  if(wasmInitPromise) return wasmInitPromise;
  if(!window.ZXingWASM?.readBarcodes) return false;

  wasmInitPromise=(async()=>{
    try{
      if(typeof ZXingWASM.prepareZXingModule==="function"){
        await ZXingWASM.prepareZXingModule({
          overrides:{
            locateFile:(path,prefix)=>path.endsWith(".wasm")
              ? "https://cdn.jsdelivr.net/npm/zxing-wasm@3.1.1/dist/reader/zxing_reader.wasm"
              : prefix+path
          },
          fireImmediately:true
        });
      }
      wasmReady=true;
      return true;
    }catch(e){
      console.error("ZXing WASM init failed",e);
      wasmReady=false;
      return false;
    }
  })();
  return wasmInitPromise;
}

function canonicalBrowserFormat(name){
  return ({
    DATA_MATRIX:"DataMatrix",EAN_13:"EAN13",EAN_8:"EAN8",UPC_A:"UPCA",UPC_E:"UPCE",
    CODE_128:"Code128",CODE_39:"Code39",ITF:"ITF"
  })[name]||name||"";
}

function browserResultToReadResult(result,ox=0,oy=0,scaleX=1,scaleY=1){
  const text=typeof result?.getText==="function"?result.getText():String(result?.text||"");
  let rawFormat="";
  try{
    const f=result.getBarcodeFormat?.();
    rawFormat=window.ZXingBrowser?.BarcodeFormat?.[f]||String(f??"");
  }catch{}
  const pts=(result.getResultPoints?.()||[]).map(p=>({x:ox+(p.getX?.()??p.x??0)*scaleX,y:oy+(p.getY?.()??p.y??0)*scaleY}));
  let position;
  if(pts.length){
    const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    position={topLeft:{x:minX,y:minY},topRight:{x:maxX,y:minY},bottomRight:{x:maxX,y:maxY},bottomLeft:{x:minX,y:maxY}};
  }
  return {text,format:canonicalBrowserFormat(rawFormat),symbology:canonicalBrowserFormat(rawFormat),position,isValid:true};
}

function ensureJsReader(){
  if(jsReader) return true;
  if(!window.ZXingBrowser?.BrowserMultiFormatReader) return false;
  jsReader=new ZXingBrowser.BrowserMultiFormatReader();
  return true;
}

function decodeCrop(reader,source,sx,sy,sw,sh,w,h){
  cropCanvas ||= document.createElement("canvas");
  const cw=Math.max(240,Math.round(w*.58)),ch=Math.max(180,Math.round(h*.58));
  cropCanvas.width=cw;cropCanvas.height=ch;
  const ctx=cropCanvas.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(source,sx,sy,sw,sh,0,0,cw,ch);
  try{
    const r=reader.decodeFromCanvas(cropCanvas);
    return browserResultToReadResult(r,sx,sy,sw/cw,sh/ch);
  }catch{return null;}
}

function readWithJsFallback(canvas){
  if(!ensureJsReader()) return [];
  const results=[];
  try{
    const r=jsReader.decodeFromCanvas(canvas);
    if(r)results.push(browserResultToReadResult(r));
  }catch{}

  const w=canvas.width,h=canvas.height;
  const patterns=[
    [0,0,.58,1],[.42,0,.58,1],
    [0,0,1,.58],[0,.42,1,.58],
    [0,0,.62,.62],[.38,0,.62,.62],[0,.38,.62,.62],[.38,.38,.62,.62]
  ];
  for(let n=0;n<3;n++){
    const p=patterns[(cropIndex+n)%patterns.length];
    const r=decodeCrop(jsReader,canvas,Math.round(p[0]*w),Math.round(p[1]*h),Math.round(p[2]*w),Math.round(p[3]*h),w,h);
    if(r)results.push(r);
  }
  cropIndex=(cropIndex+3)%patterns.length;
  return results;
}

async function scanFrame(){
  if(!running||busy)return;
  busy=true;frame++;
  const t=performance.now();
  try{
    if(!fit())return;
    const c=$("scanCanvas"),ctx=c.getContext("2d",{willReadFrequently:true});
    if(!ctx)throw Error("Canvas 2D no disponible");
    ctx.drawImage($("video"),0,0,c.width,c.height);

    let valid=[];
    if(scanEngine==="wasm"){
      try{
        const img=ctx.getImageData(0,0,c.width,c.height);
        const hard=frame%6===0;
        const res=await ZXingWASM.readBarcodes(img,{
          formats:FORMATS,
          maxNumberOfSymbols:24,
          tryHarder:hard,
          tryRotate:true,
          tryDownscale:true,
          tryInvert:false,
          returnErrors:false
        });
        valid=(res||[]).filter(x=>x?.text&&x.isValid!==false);
        wasmErrors=0;
      }catch(e){
        wasmErrors++;
        console.error("ZXing WASM frame failed",e);
        if(wasmErrors>=2){
          scanEngine="js";
          $("scanStatus").textContent="Motor compatible iPhone activado";
          feedback("<b>Modo compatible activado.</b> El motor multicódigo WASM falló en Safari; sigo escaneando con ZXing JS sin perder la sesión.","warn");
        }
        return;
      }
    }else{
      valid=readWithJsFallback(c);
    }

    const batch=collect(valid,c.width,c.height);
    if(batch.items.length||batch.dup)addBatch(batch.items,batch.dup);
    $("scanStatus").textContent=`Activo · ${scanEngine==="wasm"?"multicódigo":"compatible"} · ${valid.length} detectado(s) · ${Math.round(performance.now()-t)} ms`;
  }catch(e){
    console.error(e);
    $("scanStatus").textContent="Error: "+String(e?.message||e).slice(0,90);
  }finally{
    busy=false;
    if(running)timer=setTimeout(scanFrame,scanEngine==="wasm"?45:70);
  }
}

async function start(){
  if(running)return;
  try{
    scanEngine=(await prepareWasm())?"wasm":"js";
    if(scanEngine==="js"&&!ensureJsReader()){
      feedback("No se ha podido cargar ningún motor de lectura. Recarga la página con conexión.","bad");
      return;
    }

    stream=await navigator.mediaDevices.getUserMedia({
      audio:false,
      video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30,max:60}}
    });
    const v=$("video");v.srcObject=stream;await v.play();
    const tr=stream.getVideoTracks()[0],caps=tr.getCapabilities?.();
    if(caps?.focusMode?.includes?.("continuous"))try{await tr.applyConstraints({advanced:[{focusMode:"continuous"}]})}catch{}

    running=true;linearTracks=[];dmLive.clear();frame=0;wasmErrors=0;cropIndex=0;
    $("cameraOff").classList.add("hidden");$("startBtn").disabled=true;$("stopBtn").disabled=false;
    feedback(scanEngine==="wasm"?"<b>Multicódigo activo.</b> Puedes enfocar varias cajas a la vez.":"<b>Modo compatible iPhone activo.</b> Escaneo continuo de Data Matrix y códigos de barras.");
    $("scanStatus").textContent=scanEngine==="wasm"?"Motor multicódigo listo":"Motor compatible listo";
    scanFrame();
  }catch(e){
    stop();
    feedback("No pude abrir la cámara: "+esc(e?.message||e),"bad");
  }
}

function stop(){
  running=false;busy=false;
  if(timer)clearTimeout(timer);timer=null;
  try{stream?.getTracks().forEach(t=>t.stop())}catch{}
  stream=null;
  $("video").srcObject=null;
  $("cameraOff").classList.remove("hidden");
  $("startBtn").disabled=false;$("stopBtn").disabled=true;
  $("scanStatus").textContent="Parado";
  linearTracks=[];dmLive.clear();
}

$("startBtn").onclick=start;
$("stopBtn").onclick=stop;
addEventListener("pagehide",stop);