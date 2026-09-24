const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');
const coin = C.COINS[0];

test('addition accepts comma, dot, spaces and leading decimal fractions', () => {
  for (const [raw, expected] of [['120+80+35',235],['120,5 + 80.25 + 49,25',250],['0,1+0,2',0.3],['100,125+0.875',101],['.5 + ,25',0.75],['+12+3',15],['1.234,50+2,5',1237],['',0],['0',0]]) {
    assert.equal(C.sum(raw,3),expected,raw);
  }
});
test('cent and milligram sums do not accumulate binary floating point error', () => {
  assert.equal(C.inputMoney('0.1+0.2'),30);
  assert.equal(C.sum(Array(50).fill('0.1').join('+'),3),5);
});
test('money input preserves a trailing currency sign and strict cents', () => {
  assert.equal(C.inputMoney('0,29 €'),29);
  assert.equal(C.inputMoney('100+20,50 €'),12050);
  assert.throws(()=>C.inputMoney('0.001+0.002'));
  assert.throws(()=>C.inputMoney('10000000000+0.01'));
});
test('incomplete sums and unsupported operations never partially parse', () => {
  for(const raw of ['1+','1++2','+','1+-2','1-2','2*3','(1+2)','1/0','1e3','NaN','Infinity','alert(1)','1+2oops','1.0001']) {
    assert.throws(()=>C.sum(raw,3),undefined,raw);
  }
});
test('length and precision limits apply to the entire input', () => {
  assert.equal(C.sum(Array(100).fill('1').join('+'),0),100);
  assert.throws(()=>C.sum('1+'.repeat(121)+'1',0));
  assert.throws(()=>C.sum('1000000000000+1',3));
  assert.throws(()=>C.sum('0.5+0.5',0));
  assert.throws(()=>C.sum('1',1));
});
test('weighted batches sum before rounding the coin quantity, with existing tare once', () => {
  assert.deepEqual(C.entry(coin,'30+75','weight',{'coins-200':20}),C.entry(coin,'105','weight',{'coins-200':20}));
  assert.equal(C.entry(coin,'2.2+2.2','weight',{}).quantity,1);
  assert.equal(C.entry(coin,'100,125+50.375+19.5','weight',{}).quantity,20);
  assert.throws(()=>C.entry(coin,'10+5','weight',{'coins-200':20}),/below-tare/);
});
test('unit additions apply to bills and quantity-mode coins', () => {
  assert.equal(C.entry(C.DENOMS[0],'2+3+4','quantity',{}).quantity,9);
  assert.equal(C.entry(coin,'10+5','quantity',{}).amount,3000);
  assert.throws(()=>C.entry(coin,'999999+1','quantity',{}));
});
test('both envelopes still subtract once, now with addition', () => {
  const d=C.newDraft();d.counts['bills-5000']='5+5';d.pabloRaw='70+30';d.victorRaw='20+30';
  const t=C.totals(d);assert.equal(t.gross,50000);assert.equal(t.total,35000);assert.equal(t.difference,0);
});
test('saving normalizes unvisited sums without mutating the live draft', () => {
  const d=C.newDraft();d.counts['bills-5000']='5+5';d.counts['coins-200']='30+75';d.taras['coins-200']=20;d.pabloRaw='70+30';
  const before=JSON.stringify(d),r=C.record(d);
  assert.equal(r.counts['bills-5000'],'10');assert.equal(r.counts['coins-200'],'105');assert.equal(r.total,42000);
  assert.equal(JSON.stringify(d),before);assert.equal(r.version,2);
  const imported=C.importCsv(C.exportCsv([r]));assert.deepEqual(imported.errors,[]);assert.deepEqual(imported.added,[r]);
});
test('mode conversion respects sums and does not double-count the tray', () => {
  const d=C.newDraft();d.counts['coins-200']='30+75';d.taras['coins-200']=20;
  const q=C.convertMode(d,'quantity');assert.equal(q.counts['coins-200'],'10');
  assert.equal(C.convertMode(q,'weight').counts['coins-200'],'105');
});
test('settings and CSV money still reject formulas', () => {
  assert.throws(()=>C.money('1+2'));assert.throws(()=>C.tareMap({'coins-200':'1+2'}));
  const r=C.importCsv('Fecha;Total EUR\n2026-09-24;1+2');assert.equal(r.added.length,0);assert.equal(r.errors.length,1);
});
test('v1 and v2 records, zero defaults and saved snapshots remain compatible', () => {
  const old={id:'old',createdAt:'2026-09-12T20:00:00Z',bills:30000,coins:3300,total:33300,expected:35000};
  const r=C.migrateRecord(old);assert.equal(r.total,33300);assert.equal(r.difference,-1700);
  const d=C.newDraft({taras:{'coins-200':20}});d.counts['coins-200']='105';const saved=C.record(d);
  d.taras['coins-200']=50;assert.equal(saved.taras['coins-200'],20);assert.equal(saved.total,2000);
  assert.equal(C.totals(C.migrateDraft({coinMode:'weight',counts:{'coins-200':'85'}})).gross,2000);
});
