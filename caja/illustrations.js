/* Original inline UI illustrations. No external assets or animation libraries. */
(() => {
  'use strict';
  let serial = 0;
  const palettes = {50000:['#ddd0f3','#77519d'],20000:['#eee0ae','#997129'],10000:['#cbe5c0','#487e49'],5000:['#f2d2b3','#bc7138'],2000:['#c6e2ef','#407c9a'],1000:['#f1c7c2','#ac584f'],500:['#dce3d9','#657867']};
  function render(item) {
    const id = `cash-art-${++serial}`;
    if (item.envelope) {
      const second = item.index === 2;
      const ink = second ? '#556ea0' : '#a06342';
      const paper = second ? '#dce5f4' : '#f0ddc6';
      return `<svg class="cash-art art-envelope" viewBox="0 0 260 160" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}" x2="0.7" y2="1"><stop stop-color="#fffaf0"/><stop offset="1" stop-color="${paper}"/></linearGradient></defs><ellipse class="art-shadow" cx="130" cy="145" rx="82" ry="7" fill="#163e32" opacity=".09"/><g class="envelope-body"><path d="M37 67L130 12 223 67V137H37Z" fill="${paper}" stroke="${ink}" stroke-opacity=".25"/><g class="envelope-slip"><rect x="64" y="31" width="133" height="85" rx="7" fill="#fbfff6" stroke="#bfd4b9"/><rect x="72" y="40" width="117" height="67" rx="4" fill="#deedcd"/><path d="M83 56h33m-33 8h24" stroke="#749568" stroke-width="3" stroke-linecap="round"/><text x="166" y="70" text-anchor="middle" font-size="30" font-weight="600" fill="#557951">€</text></g><path d="M37 65L130 109 223 65V134Q223 142 215 142H45Q37 142 37 134Z" fill="url(#${id})" stroke="${ink}" stroke-opacity=".3"/><path d="M38 138L103 93m119 45L157 93" fill="none" stroke="${ink}" stroke-opacity=".2"/><rect x="107" y="104" width="46" height="25" rx="12.5" fill="${ink}"/><text x="130" y="122" text-anchor="middle" font-size="15" font-weight="700" fill="#fff">0${second?2:1}</text></g></svg>`;
    }
    if (item.type === 'bills') {
      const [paper,ink] = palettes[item.cents] || palettes[500];
      const value = item.cents / 100;
      return `<svg class="cash-art art-note" viewBox="0 0 260 160" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}"><stop stop-color="${paper}"/><stop offset="1" stop-color="#fffaf0"/></linearGradient><pattern id="${id}-pattern" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="${ink}" stroke-opacity=".08" stroke-width="1"/></pattern></defs><ellipse class="art-shadow" cx="130" cy="139" rx="88" ry="7" fill="#163e32" opacity=".09"/><g class="note-body"><rect x="24" y="33" width="217" height="105" rx="10" fill="${ink}" opacity=".12" transform="rotate(4 130 80)"/><rect x="18" y="24" width="224" height="108" rx="9" fill="url(#${id})" stroke="${ink}" stroke-opacity=".4"/><rect x="25" y="31" width="210" height="94" rx="5" fill="url(#${id}-pattern)" stroke="${ink}" stroke-opacity=".25"/><path d="M159 113V69a22 22 0 0144 0v44m-34 0V70a12 12 0 0124 0v43m-47 0h70" fill="none" stroke="${ink}" stroke-width="3" opacity=".3"/><path d="M142 24v108" stroke="${ink}" stroke-width="9" opacity=".09"/><text x="40" y="54" font-size="12" font-weight="650" fill="${ink}">EURO</text><text x="38" y="106" font-size="49" font-weight="700" letter-spacing="-2" fill="${ink}">${value}</text><text x="217" y="49" font-size="17" font-weight="650" text-anchor="end" fill="${ink}">€</text><path class="art-glint" d="M31 35h70" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/></g></svg>`;
    }
    const gold = ['#f8e9ae','#c59b42'];
    const silver = ['#f2f3ec','#a3b0ae'];
    const copper = ['#f4c7a5','#b56e49'];
    const outer = item.cents===200?silver:item.cents>=10?gold:copper;
    const inner = item.cents===200?gold:item.cents===100?silver:outer;
    const value = item.cents>=100?item.cents/100:item.cents;
    const unit = item.cents>=100?'EURO':'CENT';
    const stars = Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return `<circle cx="${(130+53*Math.sin(a)).toFixed(2)}" cy="${(73+53*Math.cos(a)).toFixed(2)}" r="1.4" fill="${outer[1]}"/>`;}).join('');
    return `<svg class="cash-art art-coin" viewBox="0 0 260 160" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}" x2=".8" y2="1"><stop stop-color="${outer[0]}"/><stop offset="1" stop-color="${outer[1]}"/></linearGradient><linearGradient id="${id}-inner" x2=".8" y2="1"><stop stop-color="${inner[0]}"/><stop offset="1" stop-color="${inner[1]}"/></linearGradient></defs><ellipse class="art-shadow" cx="130" cy="143" rx="51" ry="6" fill="#163e32" opacity=".1"/><g class="coin-body"><circle cx="130" cy="77" r="63" fill="${outer[1]}"/><circle cx="130" cy="73" r="63" fill="url(#${id})" stroke="${outer[1]}"/><circle cx="130" cy="73" r="58" fill="none" stroke="#fff" stroke-opacity=".65"/><circle cx="130" cy="73" r="45" fill="url(#${id}-inner)" stroke="${inner[1]}" stroke-opacity=".65"/>${stars}<text x="130" y="82" text-anchor="middle" font-size="44" font-weight="750" letter-spacing="-2" fill="#604f30">${value}</text><text x="130" y="102" text-anchor="middle" font-size="10" letter-spacing="2" font-weight="700" fill="#604f30">${unit}</text><path class="art-glint" d="M90 40a52 52 0 0130-16" fill="none" stroke="#fff" stroke-width="3" stroke-opacity=".75" stroke-linecap="round"/></g></svg>`;
  }
  window.CajaArt = {render};
})();
