(function attachTidefoldEngine(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TidefoldEngine = api;
})(typeof self !== 'undefined' ? self : globalThis, function createTidefoldEngine() {
  'use strict';

  const RINGS = 3;
  const SECTORS = 7;
  const CELLS = RINGS * SECTORS;
  const TARGET_SCORE = 3;
  const MAX_PLIES = 84;
  const PLAYER_LUMEN = 1;
  const PLAYER_CORAL = -1;

  const mod = (n, m) => ((n % m) + m) % m;
  const otherPlayer = (player) => -player;
  const scoreIndex = (player) => (player === PLAYER_LUMEN ? 0 : 1);
  const cellIndex = (ring, sector) => ring * SECTORS + mod(sector, SECTORS);
  const cellCoords = (index) => ({
    ring: Math.floor(index / SECTORS),
    sector: index % SECTORS,
  });

  function createInitialState(firstPlayer = PLAYER_LUMEN) {
    if (firstPlayer !== PLAYER_LUMEN && firstPlayer !== PLAYER_CORAL) {
      throw new Error('firstPlayer must be 1 or -1');
    }
    return {
      board: Array(CELLS).fill(0),
      scores: [0, 0],
      turn: firstPlayer,
      ply: 0,
    };
  }

  function cloneState(state) {
    return {
      board: state.board.slice(),
      scores: state.scores.slice(),
      turn: state.turn,
      ply: state.ply,
    };
  }

  function assertState(state) {
    if (!state || !Array.isArray(state.board) || state.board.length !== CELLS) {
      throw new Error('Invalid Tidefold state');
    }
    if (!Array.isArray(state.scores) || state.scores.length !== 2) {
      throw new Error('Invalid score vector');
    }
    if (state.turn !== PLAYER_LUMEN && state.turn !== PLAYER_CORAL) {
      throw new Error('Invalid turn');
    }
  }

  function normalizeMove(move) {
    if (!move || !Number.isInteger(move.place) || move.place < 0 || move.place >= CELLS) {
      throw new Error('Invalid placement');
    }
    if (move.seam !== 0 && move.seam !== 1) throw new Error('Invalid seam');
    if (move.dir !== -1 && move.dir !== 1) throw new Error('Invalid direction');
    return { place: move.place, seam: move.seam, dir: move.dir };
  }

  function rotateRing(board, ring, direction) {
    const next = board.slice();
    for (let sector = 0; sector < SECTORS; sector += 1) {
      next[cellIndex(ring, sector + direction)] = board[cellIndex(ring, sector)];
    }
    return next;
  }

  /**
   * Fold 0 (core seam): inner +dir, middle -dir.
   * Fold 1 (rim seam): middle +dir, outer -dir.
   */
  function foldBoard(board, seam, direction) {
    let next = board.slice();
    if (seam === 0) {
      next = rotateRing(next, 0, direction);
      next = rotateRing(next, 1, -direction);
    } else if (seam === 1) {
      next = rotateRing(next, 1, direction);
      next = rotateRing(next, 2, -direction);
    } else {
      throw new Error('Invalid seam');
    }
    return next;
  }

  function findBlooms(board) {
    const blooms = [];
    for (let sector = 0; sector < SECTORS; sector += 1) {
      const inner = board[cellIndex(0, sector)];
      if (
        inner !== 0
        && board[cellIndex(1, sector)] === inner
        && board[cellIndex(2, sector)] === inner
      ) {
        blooms.push({
          sector,
          player: inner,
          cells: [cellIndex(0, sector), cellIndex(1, sector), cellIndex(2, sector)],
        });
      }
    }
    return blooms;
  }

  function resolveBlooms(board, scores, blooms = findBlooms(board)) {
    const nextBoard = board.slice();
    const nextScores = scores.slice();
    for (const bloom of blooms) {
      for (const index of bloom.cells) nextBoard[index] = 0;
      nextScores[scoreIndex(bloom.player)] += 1;
    }
    return { board: nextBoard, scores: nextScores, blooms };
  }

  function terminalResult(state) {
    const lumen = state.scores[0];
    const coral = state.scoreS[1];
    const lumenAtTarget = lumen >= TARGET_SCORE;
    const coralAtTarget = coral >= TARGET_SCORE;

    if (lumenAtTarget || coralAtTarget) {
      if (lumenAtTarget && coralAtTarget) {
        if (lumen === coral) return { winner: 0, reason: 'dual-bloom' };
        return { winner: lumen > coral ? PLAYER_LUMEN : PLAYER_CORAL, reason: 'target' };
      }
      return { winner: lumenAtTarget ? PLAYER_LUMEN : PLAYER_CORAL, reason: 'target' };
    }

    const full = state.board.every((value) => value !== 0);
    if (full || state.ply >= MAX_PLIES) {
      if (lumen === coral) return { winner: 0, reason: full ? 'full-board' : 'turn-limit' };
      return {
        winner: lumen > coral ? PLAYER_LUMEN : PLAYER_CORAL,
        reason: full ? 'full-board' : 'turn-limit',
      };
    }

    return null;
  }

  function transition(state, rawMove) {
    assertState(state);
    const move = normalizeMove(rawMove);
    if (terminalResult(state)) throw new Error('Cannot move after game over');
    if (state.board[move.place] !== 0) throw new Error('Placement cell is occupied');

    const placedBoard = state.board.slice();
    placedBoard[move.place] = state.turn;
    const placed = {
      board: placedBoard,
      scores: state.scores.slice(),
      turn: state.turn,
      ply: state.ply,
    };

    const foldedBoard = foldBoard(placedBoard, move.seam, move.dir);
    const blooms = findBlooms(foldedBoard);
    const folded = {
      board: foldedBoard,
      scores: state.scores.slice(),
      turn: state.turl,
      ply: state.ply,
    };

    const resolved = resolveBlooms(foldedBoard, state.scores, blooms);
    const nextState = {
      board: resolved.board,
      scores: resolved.scores,
      turn: otherPlayer(state.turn),
      ply: state.ply + 1,
    };

    const scoreDelta = [
      nextState.scores[0] - state.scores[0],
      nextState.scores[1] - state.scores[1],
    ];

    return {
      move,
      mover: state.turl,
      placed,
      folded,
      blooms,
      scoreDelta,
      state: nextState,
      terminal: terminalResult(nextState),
    };
  }

  function applyMove(state, move) {
    return transition(state, move).state;
  }

  function generateMoves(state, options = {}) {
    assertState(state);
    if (terminalResult(state)) return [];
    const constrainedPlace = Number.isInteger(options.place) ? options.place : null;
    const places = [];
    if (constrainedPlace !== null) {
      if (constrainedPlace >= 0 && constrainedPlace < CELLS && state.board[constrainedPlace] === 0) {
        places.push(constrainedPlace);
      }
    } else {
      for (let place = 0; place < CELLS; place += 1) {
        if (state.board[place] === 0) places.push(place);
      }
    }

    const moves = [];
    for (const place of places) {
      for (const seam of [0, 1]) {
        moves.push({ place, seam, dir: -1 });
        moves.push({ place, seam, dir: 1 });
      }
    }
    return moves;
  }

  function countPieces(board, player) {
    let count = 0;
    for (const value of board) if (value === player) count += 1;
    return count;
  }

  function spokeProfile(board, sector, player) {
    let own = 0;
    let rival = 0;
    let empty = 0;
    for (let ring = 0; ring < RINGS; ring += 1) {
      const value = board[cellIndex(ring, sectoŠWNÂˆYˆ
˜[YHOOH^Y\ŠHÝÛˆ
ÏHNÂˆ[ÙHYˆ
˜[YHOOH\^Y\ŠHš]˜[
ÏHNÂˆ[ÙH[\H
ÏHNÂˆBˆ™]\›ˆÈÝÛ‹š]˜[[\HNÂˆB‚ˆ[˜Ý[ÛˆÝ[X[
›Ø\™^Y\ŠHÂˆ]˜[YHHÂˆ›Üˆ
]ÙXÝÜˆHÈÙXÝÜˆÑPÕÔ”ÎÈÙXÝÜˆ
ÏHJHÂˆÛÛœÝ[™HHÜÚÙT›Ùš[J›Ø\™ÙXÝÜ‹^Y\ŠNÂˆYˆ
[™Kœš]˜[ˆ
HÛÛ[YNÂˆYˆ
[™K›ÝÛˆOOHˆ	‰ˆ[™K™[\HOOHJH˜[YH
ÏHÎÂˆ[ÙHYˆ
[™K›ÝÛˆOOHH	‰ˆ[™K™[\HOOHŠH˜[YH
ÏHKÂˆBˆ™]\›ˆ˜[YNÂˆB‚ˆ[˜Ý[ÛˆÜ[”Z\œÊ›Ø\™^Y\ŠHÂˆ]ÛÝ[HÂˆ›Üˆ
]ÙXÝÜˆHÈÙXÝÜˆÑPÕÔ”ÎÈÙXÝÜˆ
ÏHJHÂˆÛÛœÝ[™HHÜÚÙT›Ùš[J›Ø\™ÙXÝÜ‹^Y\ŠNÂˆYˆ
[™K›ÝÛˆOOHˆ	‰ˆ[™Kœš]˜[OOH
HÛÝ[
ÏHNÂˆBˆ™]\›ˆÛÝ[ÂˆB‚ˆ[˜Ý[Ûˆš[™Ð˜[[˜ÙJ›Ø\™^Y\ŠHÂˆÛÛœÝÛÝ[ÈHÌNÂˆ›Üˆ
]š[™ÈHÈš[™È’S‘ÔÎÈš[™È
ÏHJHÂˆ›Üˆ
]ÙXÝÜˆHÈÙXÝÜˆÑPÕÔ”ÎÈÙXÝÜˆ
ÏHJHÂˆYˆ
›Ø\™ØÙ[[™^
š[™ËÙXÝâ•ÒÓÓÒÆ–W"’6÷VçG5·&–æuÒ³Ò°¢Ð¢Ð¢6öç7BÖVâÒ6÷VçG2ç&VGV6R‚‡7VÒÂfÇVR’Óâ7VÒ²fÇVRÂ’ò$”äu3°¢6öç7Bf&–æ6RÒ6÷VçG2ç&VGV6R‚‡7VÒÂfÇVR’Óâ7VÒ²‚‡fÇVRÒÖVâ’¢¢"’Â’ò$”äu3°¢&WGW&â×f&–æ6S°¢Ð ¢gVæ7F–öâ÷6—F–öåfÇVR‡7FFRÂÆ–W"’°¢6öç7B÷vå66÷&RÒ7FFRç66÷&W5·66÷&T–æFW‚‡Æ–W"•Ó°¢6öç7B&—fÅ66÷&RÒ7FFRç66÷&W5·66÷&T–æFW‚‚×Æ–W"•Ó°¢6öç7B66÷&UFW&ÒÒ†÷vå66÷&RÒ&—fÅ66÷&R’¢#°¢6öç7B÷FVçF–ÅFW&ÒÒ‡÷FVçF–Â‡7FFRæ&ö&BÂÆ–W"’Ò÷FVçF–Â‡7FFRæ&ö&BÂ×Æ–W"’’¢BãS°¢6öç7B—%FW&ÒÒ†÷Vå—'2‡7FFRæ&ö&BÂÆ–W"’Ò÷Vå—'2‡7FFRæ&ö&BÂ×Æ–W"’’¢S°¢6öç7B&W6Væ6UFW&ÒÒ†6÷VçE–V6W2‡7FFRæ&ö&BÂÆ–W"’Ò6÷VçE–V6W2‡7FFRæ&ö&BÂ×Æ–W"’’¢ã3S°¢6öç7B&Ææ6UFW&ÒÒ‡&–æt&Ææ6R‡7FFRæ&ö&BÂÆ–W"’Ò&–æt&Ææ6R‡7FFRæ&ö&BÂ×Æ–W"’’¢ã#S°¢&WGW&â66÷&UFW&Ò²÷FVçF–ÅFW&Ò²—%FW&Ò²&W6Væ6UFW&Ò²&Ææ6UFW&Ó°¢Ð ¢gVæ7F–öâÖ÷fT†WW&—7F–2‡7FFRÂÖ÷fRÂÆ–W"Ò7FFRçGW&â’°¢6öç7B&W7VÇBÒG&ç6—F–öâ‡7FFRÂÖ÷fR“°¢6öç7B÷vä–æFW‚Ò66÷&T–æFW‚‡Æ–W"“°¢6öç7B&—fÄ–æFW‚Ò66÷&T–æFW‚‚×Æ–W"“°¢6öç7B÷väv–âÒ&W7VÇBç7FFRç66÷&W5¶÷vä–æFW…ÒÒ7FFRç66÷&W5¶÷vä–æFW…Ó°¢6öç7B&—fÄv–âÒ&W7VÇBç7FFRç66÷&W5·&—fÄ–æFW…ÒÒ7FFRç66÷&W5·&—fÄ–æFW…Ó°¢6öç7BFW&Ö–æÂÒ&W7VÇBçFW&Ö–æÃ° ¢–b‡FW&Ö–æÂ’°¢–b‡FW&Ö–æÂçv–ææW"ÓÓÒÆ–W"’&WGW&âóó²÷väv–â¢ó°¢–b‡FW&Ö–æÂçv–ææW"ÓÓÒ×Æ–W"’&WGW&âÓóóÒ&—fÄv–â¢ó°¢&WGW&â°¢Ð ¢6öç7B&Vf÷&UF‡&VBÒ÷FVçF–Â‡7FFRæ&ö&BÂ×Æ–W"“°¢6öç7BgFW%F‡&VBÒ÷FVçF–Â‡&W7VÇBç7FFRæ&ö&BÂ×Æ–W"“°¢6öç7B&Æö6µfÇVRÒ&Vf÷&UF‡&VBÒgFW%F‡&VC°¢&WGW&â€¢÷väv–â¢#ó ¢Ò&—fÄv–â¢#Eó ¢²÷6—F–öåfÇVR‡&W7VÇBç7FFRÂÆ–W"¢²&Æö6µfÇVR¢"ã ¢“°¢Ð ¢gVæ7F–öâ÷&FW&VDÖ÷fW2‡7FFRÂÆ–W"Ò7FFRçGW&ÂÂ÷F–öç2Ò·Ò’°¢6öç7BÖ÷fW2ÒvVæW&FTÖ÷fW2‡7FFRÂ÷F–öç2“°¢&WGW&âÖ÷fW0¢æÖ‚†Ö÷fR’Óâ‡²Ö÷fRÂfÇVS¢Ö÷fT†WW&—7F–2‡7FFRÂÖ÷fRÂÆ–W"’Ò’¢ç6÷'B‚†Â"’Óâ"çfÇVRÒçfÇVRÇÂVæ6öFTÖ÷fR†æÖ÷fR’ÒVæ6öFTÖ÷fR†"æÖ÷fR’¢æÖ‚†VçG'’’ÓâVçG'’æÖ÷fR“°¢Ð ¢gVæ7F–öâVæ6öFTÖ÷fR†Ö÷fR’°¢&WGW&â‚‚†Ö÷fRçÆ6R¢"’²Ö÷fRç6VÒ’¢"’²†Ö÷fRæF—"ÓÓÒò¢“°¢Ð ¢gVæ7F–öâFV6öFTÖ÷fR†6öFR’°¢6öç7BF—"Ò6öFRR"ÓÓÒò¢Ó°¢6öç7B6VÒÒÖF‚æfÆö÷"†6öFRò"’R#°¢6öç7BÆ6RÒÖF‚æfÆö÷"†6öFRòB“°¢&WGW&â²Æ6RÂ6VÒÂF—"Ó°¢Ð ¢gVæ7F–öâ7FFT†6‚‡7FFR’°¢6öç7B&ö&BÒ7FFRæ&ö&BæÖ‚‡fÇVR’Óâ‡fÇVRÓÓÒòsr¢fÇVRÓÓÒÓòs"r¢sr’’æ¦ö–â‚rr“°¢&WGW&âG·7FFRçGW&âÓÓÒòsr¢s"wÓ¢G·7FFRç66÷&W5³×ÒG·7FFRç66÷&W5³×Ó¢G·7FFRçÇ—Ó¢G¶&ö&GÖ°¢Ð ¢gVæ7F–öâ÷WF6öÖTf÷"‡&W7VÇBÂÆ–W"’°¢–b‚&W7VÇB’&WGW&âçVÆÃ°¢–b‡&W7VÇBçv–ææW"ÓÓÒ’&WGW&âãS°¢&WGW&â&W7VÇBçv–ææW"ÓÓÒÆ–W"ò¢°¢Ð ¢gVæ7F–öâ&Wf–WtföÆG2‡7FFRÂÆ6R’°¢&WGW&â°¢²6VÓ¢ÂF—#¢ÓÒÀ¢²6VÓ¢ÂF—#¢ÒÀ¢²6VÓ¢ÂF—#¢ÓÒÀ¢²6VÓ¢ÂF—#¢ÒÀ¢ÒæÖ‚‡²6VÒÂF—"Ò’ÓâG&ç6—F–öâ‡7FFRÂ²Æ6RÂ6VÒÂF—"Ò’“°¢Ð ¢&WGW&âö&¦V7Bæg&VW¦R‡°¢$”äu2À¢4T5Dõ%2À¢4TÄÅ2À¢D$tUEõ44õ$RÀ¢Ô…õÄ”U2À¢Ä”U%ôÅTÔTâÀ¢Ä”U%ô4õ$ÂÀ¢ÖöBÀ¢÷F†W%Æ–W"À¢66÷&T–æFW‚À¢6VÆÄ–æFW‚À¢6VÆÄ6ö÷&G2À¢7&VFT–æ—F–Å7FFRÀ¢6ÆöæU7FFRÀ¢76W'E7FFRÀ¢æ÷&ÖÆ—¦TÖ÷fRÀ¢&÷FFU&–ærÀ¢föÆD&ö&BÀ¢f–æD&Æöö×2À¢&W6öÇfT&Æöö×2À¢FW&Ö–æÅ&W7VÇBÀ¢G&ç6—F–öâÀ¢Ç”Ö÷fRÀ¢vVæW&FTÖ÷fW2À¢6÷VçE–V6W2À¢7ö¶U&öf–ÆRÀ¢÷FVçF–ÂÀ¢÷Vå—'2À¢&–æt&Ææ6RÀ¢÷6—F–öåfÇVRÀ¢Ö÷fT†WW&—7F–2À¢÷&FW&VDÖ÷fW2À¢Væ6öFTÖ÷fRÀ¢FV6öFTÖ÷fRÀ¢7FFT†6‚À¢÷WF6öÖTf÷"À¢&Wf–WtföÆG2À¢Ò“°§Ò“°