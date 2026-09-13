/* Caja Clara: pure, dependency-free counting and CSV logic (also testable in Node). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CajaCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const DENOMS = [
    ...[50000, 20000, 10000, 5000, 2000, 1000, 500].map(cents => ({key:`bills-${cents}`, cents, label:`${cents / 100} €`, type:'bills'})),
    ...[[200,8500],[100,7500],[50,7800],[20,5740],[10,4100],[5,3920],[2,3060],[1,2300]].map(([cents,mg]) => ({key:`coins-${cents}`, cents, mg, label:cents >= 100 ? `${cents / 100} €` : `${cents} c`, type:'coins'}))
  ];
  const COINS = DENOMS.filter(d => d.type === 'coins');
  const LIMIT = 1e12;
  function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const [y,m,d] = value.split('-').map(Number);
    const date = new Date(y,m-1,d,12);
    return y >= 1900 && y <= 9999 && date.getFullYear() === y && date.getMonth() === m-1 && date.getDate() === d;
  }
  function number(raw, decimals = 2, signed = false) {
    let text = String(raw ?? '').trim().replace(/[\s\u00a0\u202f]/g,'');
    if (!text) return 0;
    // Accept both locale conventions, but never accept a partially parsed value.
    if (text.includes(',') && text.includes('.')) {
      const decimal = text.lastIndexOf(',') > text.lastIndexOf('.') ? ',' : '.';
      const group = decimal === ',' ? '.' : ',';
      const parts = text.split(decimal);
      const sign = /^[+-]/.test(parts[0]) ? parts[0][0] : '';
      const integer = sign ? parts[0].slice(1) : parts[0];
      const pattern = new RegExp(`^\\d{1,3}(\\${group}\\d{3})+$`);
      if (parts.length !== 2 || !pattern.test(integer)) throw new Error('number');
      text = sign + integer.split(group).join('') + '.' + parts[1];
    } else text = text.replace(',','.');
    const signPattern = signed ? '[+-]?' : '\\+?';
    const fraction = decimals ? `(?:\\.\\d{0,${decimals}})?` : '';
    if (!(new RegExp(`^${signPattern}\\d+${fraction}$`)).test(text)) throw new Error('number');
    const value = Number(text);
    if (!Number.isFinite(value) || Math.abs(value) > LIMIT || (!signed && value < 0)) throw new Error('number');
    return value;
  }
  function money(raw, signed = false) {
    const text = String(raw ?? '').replace(/\s*€\s*$/,'');
    const cents = Math.round(number(text,2,signed)*100);
    if (!Number.isSafeInteger(cents) || Math.abs(cents) > LIMIT) throw new Error('number');
    return cents;
  }
  function tareMap(input = {}) {
    return Object.fromEntries(COINS.map(d => [d.key, number(input[d.key] ?? 0,3)]));
  }
  function entry(d, raw, mode, taras) {
    if (d.type === 'coins' && mode === 'weight') {
      const grossMg = Math.round(number(raw,3)*1000);
      const tareMg = Math.round(number(taras?.[d.key] ?? 0,3)*1000);
      // Empty / explicit zero means no coins, not an unweighed empty tray.
      if (grossMg === 0) return {quantity:0,amount:0,net:0,tare:tareMg/1000,residual:0};
      if (grossMg < tareMg) throw new Error('below-tare');
      const netMg = grossMg-tareMg;
      const quantity = Math.round(netMg/d.mg);
      if (quantity > 999999) throw new Error('number');
      return {quantity,amount:quantity*d.cents,net:netMg/1000,tare:tareMg/1000,residual:(netMg-quantity*d.mg)/1000};
    }
    const quantity = number(raw,0);
    if (quantity > 999999) throw new Error('number');
    return {quantity,amount:quantity*d.cents,net:0,tare:0,residual:0};
  }
  function totals(draft) {
    const entries = DENOMS.map(d => ({...d,...entry(d,draft.counts?.[d.key],draft.coinMode,draft.taras)}));
    const bills = entries.filter(d=>d.type==='bills').reduce((s,d)=>s+d.amount,0);
    const coins = entries.filter(d=>d.type==='coins').reduce((s,d)=>s+d.amount,0);
    const pablo = money(draft.pabloRaw), victor = money(draft.victorRaw);
    const total = bills+coins-pablo-victor;
    const expected = String(draft.expectedRaw ?? '').trim() === '' ? null : money(draft.expectedRaw);
    return {entries,bills,coins,gross:bills+coins,pablo,victor,total,expected,difference:expected===null?null:total-expected};
  }
  function convertMode(draft, next) {
    if (!['quantity','weight'].includes(next)) throw new Error('mode');
    const result = {...draft,counts:{...draft.counts},coinMode:next};
    if (draft.coinMode === next) return result;
    for (const d of COINS) {
      const quantity = entry(d,draft.counts?.[d.key],draft.coinMode,draft.taras).quantity;
      result.counts[d.key] = quantity === 0 ? '' : String(next === 'weight' ? (quantity*d.mg+Math.round(number(draft.taras?.[d.key]??0,3)*1000))/1000 : quantity);
    }
    return result;
  }
  function uuid() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function newDraft(settings = {}) {
    return {version:2,id:uuid(),date:localDate(),expectedRaw:String(settings.expectedRaw ?? '350'),pabloRaw:'',victorRaw:'',coinMode:settings.coinMode==='quantity'?'quantity':'weight',taras:tareMap(settings.taras),counts:{},step:0,started:false};
  }
  function record(draft, createdAt = new Date().toISOString()) {
    if (!validDate(draft.date)) throw new Error('date');
    const t = totals(draft);
    if (t.total < 0) throw new Error('envelopes');
    return {version:2,id:draft.id,date:draft.date,createdAt,bills:t.bills,coins:t.coins,gross:t.gross,pablo:t.pablo,victor:t.victor,total:t.total,expected:t.expected,difference:t.difference,coinMode:draft.coinMode,counts:{...draft.counts},taras:tareMap(draft.taras)};
  }
  function migrateRecord(old) {
    if (!old || typeof old !== 'object') throw new Error('record');
    const date = old.date || (Number.isNaN(Date.parse(old.createdAt)) ? '' : localDate(new Date(old.createdAt)));
    if (!validDate(date) || (old.createdAt && Number.isNaN(Date.parse(old.createdAt)))) throw new Error('date');
    const r = {version:2,id:old.id || uuid(),date,createdAt:old.createdAt || '',bills:old.bills ?? null,coins:old.coins ?? null,gross:old.gross ?? old.total,pablo:old.pablo ?? 0,victor:old.victor ?? 0,total:old.total,expected:old.expected ?? null,difference:null,coinMode:old.coinMode==='weight'?'weight':'quantity',counts:old.counts && typeof old.counts==='object' ? {...old.counts} : null,taras:tareMap(old.taras)};
    if (typeof r.id !== 'string' || r.id.length > 200 || /^[=+@\t\r\n]/.test(r.id)) throw new Error('record');
    for (const key of ['gross','pablo','victor','total','expected','bills','coins']) {
      const n=r[key];
      if (n === null && ['expected','bills','coins'].includes(key)) continue;
      if (!Number.isSafeInteger(n) || n < 0 || n > LIMIT) throw new Error('record');
    }
    if (r.gross-r.pablo-r.victor !== r.total || (r.bills!==null && r.coins!==null && r.bills+r.coins!==r.gross)) throw new Error('inconsistent');
    r.difference=r.expected===null?null:r.total-r.expected;
    return r;
  }
  function migrateDraft(old) {
    const d = newDraft({coinMode:old?.coinMode || 'quantity'});
    if (!old || typeof old !== 'object') return d;
    d.expectedRaw=String(old.expectedRaw ?? '350');
    d.counts=Object.fromEntries(DENOMS.map(v=>[v.key,String(old.counts?.[v.key]??'')]));
    // Old weight inputs were net, so they must never inherit configured trays.
    d.taras=tareMap();
    d.started=Object.values(d.counts).some(v=>v.trim()!=='');
    d.step=d.started?3:0;
    return d;
  }
  function parseDate(raw) {
    let s=String(raw??'').trim().replace(/^'/,'');
    if (validDate(s)) return {date:s,createdAt:''};
    const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
    if (m) {
      const date=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
      if (!validDate(date) || Number(m[4]||0)>23 || Number(m[5]||0)>59 || Number(m[6]||0)>59) throw new Error('date');
      return {date,createdAt:m[4]?new Date(`${date}T${m[4].padStart(2,'0')}:${m[5]}:${m[6]||'00'}`).toISOString():''};
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) && validDate(s.slice(0,10)) && !Number.isNaN(Date.parse(s))) {
      const d=new Date(s); return {date:localDate(d),createdAt:d.toISOString()};
    }
    throw new Error('date');
  }
  function parseCsv(text) {
    text=String(text).replace(/^\ufeff/,'');
    let separator=';',quoted=false, counts={';':0,',':0,'\t':0};
    for (let i=0;i<text.length;i++) {
      const c=text[i];
      if(c==='"') { if(quoted&&text[i+1]==='"'){i++;continue;} quoted=!quoted; }
      if(!quoted) {if(c==='\n'||c==='\r')break;if(c in counts)counts[c]++;}
    }
    separator=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
    let row=[],value='',inside=false,closed=false,line=1,start=1;
    const rows=[];
    const cell=()=>{row.push(value);value='';closed=false;};
    const finish=()=>{cell();if(row.some(v=>v.trim()!==''))rows.push({values:row,line:start});row=[];start=line+1;};
    for(let i=0;i<text.length;i++) {
      const c=text[i];
      if(inside) {
        if(c==='"') {if(text[i+1]==='"'){value+='"';i++;}else{inside=false;closed=true;}}
        else{value+=c;if(c==='\n')line++;}
      } else if(c==='"') {if(value.trim()!==''||closed)throw new Error('csv');value='';inside=true;}
      else if(c===separator)cell();
      else if(c==='\r'||c==='\n') {if(c==='\r'&&text[i+1]==='\n')i++;finish();line++;}
      else {if(closed&&c.trim()!=='')throw new Error('csv');if(!closed)value+=c;}
    }
    if(inside)throw new Error('csv');
    if(value!==''||row.length||closed)finish();
    return rows;
  }
  const headerKey=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  function fingerprint(r) {
    const stamp=r.createdAt&&!Number.isNaN(Date.parse(r.createdAt))?new Date(r.createdAt).toISOString():r.date;
    return JSON.stringify([r.date,stamp,r.gross,r.pablo,r.victor,r.total,r.expected]);
  }
  function importCsv(text, existing=[]) {
    const parsed=parseCsv(text);
    if(parsed.length<1)throw new Error('csv');
    const headers=parsed.shift().values.map(headerKey);
    const find=(...names)=>headers.findIndex(h=>names.includes(h));
    const indexes={date:find('fecha','date'),created:find('fecharegistro','createdat'),bills:find('billeteseur','bills eur'.replace(/ /g,'')),coins:find('monedaseur','coinseur'),total:find('totaleur','total','cajaeur','remainingeur'),gross:find('contadoeur','grosseur'),pablo:find('sobre1pabloeur','pabloeur'),victor:find('sobre2victoreur','victoreur'),expected:find('esperadoeur','expectedeur'),difference:find('diferenciaeur','differenceeur'),mode:find('modomonedas','coinmode'),counts:find('detallejson','countsjson'),taras:find('tarasjson','taresjson'),id:find('id')};
    if(indexes.date<0||indexes.total<0)throw new Error('headers');
    const seen=new Set(existing.map(fingerprint));
    const ids=new Map(existing.map(r=>[r.id,fingerprint(r)]));
    const added=[],errors=[];let duplicates=0;
    for(const row of parsed) {
      try {
        if(row.values.length!==headers.length)throw new Error('columns');
        const get=k=>indexes[k]<0?'':row.values[indexes[k]].trim();
        if(get('total')==='')throw new Error('number');
        const date=parseDate(get('date'));
        const createdAt=get('created')?parseDate(get('created')).createdAt:date.createdAt;
        const total=money(get('total'));
        const pablo=money(get('pablo')),victor=money(get('victor'));
        const gross=get('gross')===''?total+pablo+victor:money(get('gross'));
        const expected=get('expected')===''?null:money(get('expected'));
        const candidate={id:get('id')||uuid(),date:date.date,createdAt,bills:get('bills')===''?null:money(get('bills')),coins:get('coins')===''?null:money(get('coins')),gross,pablo,victor,total,expected,coinMode:get('mode'),counts:get('counts')?JSON.parse(get('counts')):null,taras:get('taras')?JSON.parse(get('taras')):{}};
        const r=migrateRecord(candidate);
        if(get('difference')!==''&&money(get('difference'),true)!==r.difference)throw new Error('inconsistent');
        if(r.counts) {
          if(Array.isArray(r.counts))throw new Error('record');
          const t=totals({counts:r.counts,coinMode:r.coinMode,taras:r.taras,expectedRaw:'',pabloRaw:'',victorRaw:''});
          if(t.gross!==r.gross)throw new Error('inconsistent');
        }
        const fp=fingerprint(r);
        if(seen.has(fp)){duplicates++;continue;}
        if(ids.has(r.id)&&ids.get(r.id)!==fp)throw new Error('id-conflict');
        seen.add(fp);ids.set(r.id,fp);added.push(r);
      } catch(error) {errors.push({line:row.line,code:error instanceof SyntaxError?'record':error.message});}
    }
    return {added,duplicates,errors,rows:parsed.length};
  }
  function exportCsv(records) {
    const headers=['Fecha','Fecha registro','Billetes EUR','Monedas EUR','Contado EUR','Sobre 1 Pablo EUR','Sobre 2 Victor EUR','Total EUR','Esperado EUR','Diferencia EUR','Modo monedas','Detalle JSON','Taras JSON','ID'];
    const amount=n=>n===null||n===undefined?'':(n/100).toFixed(2);
    const cell=v=>`"${String(v??'').replace(/"/g,'""')}"`;
    const rows=records.map(r=>[r.date,r.createdAt,amount(r.bills),amount(r.coins),amount(r.gross),amount(r.pablo),amount(r.victor),amount(r.total),amount(r.expected),amount(r.difference),r.coinMode,r.counts?JSON.stringify(r.counts):'',JSON.stringify(r.taras||{}),r.id]);
    return '\ufeff'+[headers,...rows].map(row=>row.map(cell).join(';')).join('\r\n');
  }
  return {DENOMS,COINS,localDate,validDate,number,money,tareMap,entry,totals,convertMode,newDraft,record,migrateRecord,migrateDraft,parseCsv,importCsv,exportCsv,fingerprint,uuid};
});
