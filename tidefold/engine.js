(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.TidefoldEngine=api;
})(typeof self!=='undefined'?self:globalThis,function(){
  'use strict';
  const RINGS=3, SECTORS=7, CELLS=21, TARGET_SCORE=3, MAX_PLIES=84;
  const LUMEN=1, CORAL=-1;
  const mod=(n,m)=>((n%m)+m)%m;
  const idx=(ring,sector)=>ring*SECTORS+mod(sector,SECTORS);
  const coords=i=>({ring:Math.floor(i/SECTORS),sector:i%SECTORS});
  const scoreIndex=p=>p===LUMEN?0:1;
  const other=p=>-p;

  function initial(first=LUMEN){
    return {board:Array(CELLS).fill(0),scores:[0,0],turn:first,ply:0};
  }
  function clone(s){ return {board:s.board.slice(),scores:s.scores.slice(),turn:s.turn,ply:s.ply}; }
  function rotateRing(board,ring,dir){
    const out=board.slice();
    for(let s=0;s<SECTORS;s++) out[idx(ring,s+dir)]=board[idx(ring,s)];
    return out;
  }
  function fold(board,seam,dir){
    let out=board.slice();
    if(seam===0){ out=rotateRing(out,0,dir); out=rotateRing(out,1,-dir); }
    else if(seam===1){ out=rotateRing(out,1,dir); out=rotateRing(out,2,-dir); }
    else throw new Error('invalid seam');
    return out;
  }
  function blooms(board){
    const list=[];
    for(let s=0;s<SECTORS;s++){
      const p=board[idx(0,s)];
      if(p&&board[idx(1,s)]===p&&board[idx(2,s)]===p){
        list.push({sector:s,player:p,cells:[idx(0,s),idx(1,s),idx(2,s)]});
      }
    }
    return list;
  }
  function resolve(board,scores,list=blooms(board)){
    const out=board.slice(), next=scores.slice();
    for(const b of list){
      for(const c of b.cells) out[c]=0;
      next[scoreIndex(b.player)]++;
    }
    return {board:out,scores:next,blooms:list};
  }
  function terminal(s){
    const a=s.scores[0], b=s.scores[1];
    if(a>=TARGET_SCORE||b>=TARGET_SCORE){
      if(a===b) return {winner:0,reason:'dual-target'};
      return {winner:a>b?LUMEN:CORAL,reason:'target'};
    }
    if(s.ply>=MAX_PLIES||s.board.every(Boolean)){
      if(a===b) return {winner:0,reason:s.board.every(Boolean)?'full-board':'turn-limit'};
      return {winner:a>b?LUMEN:CORAL,reason:s.board.every(Boolean)?'full-board':'turn-limit'};
    }
    return null;
  }
  function transition(state,move){
    if(terminal(state)) throw new Error('game over');
    const {place,seam,dir}=move;
    if(!Number.isInteger(place)||place<0||place>=CELLS||state.board[place]) throw new Error('invalid placement');
    if((seam!==0&&seam!==1)||(dir!==1&&dir!==-1)) throw new Error('invalid fold');
    const placedBoard=state.board.slice();
    placedBoard[place]=state.turn;
    const foldedBoard=fold(placedBoard,seam,dir);
    const list=blooms(foldedBoard);
    const res=resolve(foldedBoard,state.scores,list);
    const next={board:res.board,scores:res.scores,turn:other(state.turn),ply:state.ply+1};
    return {move:{place,seam,dir},mover:state.turn,placed:{board:placedBoard},folded:{board:foldedBoard},blooms:list,state:next,terminal:terminal(next)};
  }
  function legalMoves(state,placeOnly=null){
    if(terminal(state)) return [];
    const places=[];
    if(Number.isInteger(placeOnly)){
      if(placeOnly>=0&&placeOnly<CELLS&&!state.board[placeOnly]) places.push(placeOnly);
    } else {
      for(let i=0;i<CELLS;i++) if(!state.board[i]) places.push(i);
    }
    const out=[];
    for(const place of places) for(const seam of [0,1]) for(const dir of [-1,1]) out.push({place,seam,dir});
    return out;
  }
  function spokeStats(board,player){
    let pairs=0,singles=0,blocked=0;
    for(let s=0;s<SECTORS;s++){
      let own=0,rival=0;
      for(let r=0;r<RINGS;r++){
        const v=board[idx(r,s)];
        if(v===player) own++; else if(v===-player) rival++;
      }
      if(rival) blocked++;
      else if(own===2) pairs++;
      else if(own===1) singles++;
    }
    return {pairs,singles,blocked};
  }
  function evaluate(state,player){
    const me=scoreIndex(player), them=scoreIndex(-player);
    const ps=spokeStats(state.board,player), os=spokeStats(state.board,-player);
    const material=state.board.reduce((n,v)=>n+(v===player?1:v===-player?-1:0),0);
    return (state.scores[me]-state.scores[them])*250 + (ps.pairs-os.pairs)*18 + (ps.singles-os.singles)*3 + material*.8;
  }
  function moveValue(state,move,player=state.turn){
    const t=transition(state,move);
    const me=scoreIndex(player), them=scoreIndex(-player);
    const gained=t.state.scores[me]-state.scores[me];
    const conceded=t.state.scores[them]-state.scores[them];
    if(t.terminal){
      if(t.terminal.winner===player) return 1e6;
      if(t.terminal.winner===-player) return -1e6;
    }
    return gained*300-conceded*360+evaluate(t.state,player);
  }
  function rankMoves(state,player=state.turn,limit=Infinity){
    return legalMoves(state).map(move=>({move,value:moveValue(state,move,player)}))
      .sort((a,b)=>b.value-a.value).slice(0,limit);
  }
  function randomMove(state,rng=Math.random){
    const moves=legalMoves(state); return moves[Math.floor(rng()*moves.length)]||null;
  }
  return Object.freeze({RINGS,SECTORS,CELLS,TARGET_SCORE,MAX_PLIES,LUMEN,CORAL,mod,idx,coords,scoreIndex,other,initial,clone,rotateRing,fold,blooms,resolve,terminal,transition,legalMoves,spokeStats,evaluate,moveValue,rankMoves,randomMove});
});
