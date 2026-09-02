const assert=require('node:assert/strict');
const E=require('../engine.js');
let s=E.initial();
assert.equal(E.CELLS,21);
assert.equal(E.legalMoves(s).length,84);
const ring=Array.from({length:21},(_,i)=>i);const rot=E.rotateRing(ring,0,1);assert.equal(rot[E.idx(0,1)],0);assert.equal(rot[E.idx(0,0)],6);
s=E.initial();s.board[E.idx(0,0)]=1;s.board[E.idx(1,1)]=1;const t=E.transition(s,{place:E.idx(2,6),seam:1,dir:-1});assert.equal(t.blooms.length,1);assert.deepEqual(t.state.scores,[1,0]);assert.equal(t.state.board.filter(Boolean).length,0);
const ranked=E.rankMoves(E.initial(),E.LUMEN,5);assert.equal(ranked.length,5);assert.ok(ranked.every(x=>E.legalMoves(E.initial()).some(m=>m.place===x.move.place&&m.seam===x.move.seam&&m.dir===x.move.dir)));
console.log('TIDEFOLD engine: OK');
