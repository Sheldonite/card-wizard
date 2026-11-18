(function (root) {
  'use strict';
  const ranks = {11:'Jack',12:'Queen',13:'King',14:'Ace'};
  const suits = {S:'Spades',H:'Hearts',C:'Clubs',D:'Diamonds'};
  function details(card, debuffed) {
    const playing = Boolean(card.suit && card.rank);
    const name = playing ? (card.enhancement === 'stone' ? 'Stone Card' : (ranks[card.rank] || card.rank)+' of '+suits[card.suit]) : card.name;
    const lines = [name];
    if (!playing && card.description) lines.push(card.description);
    for (const [field, catalog] of [['enhancement','enhancements'],['edition','editions'],['seal','seals'],['sticker','stickers']]) {
      const effect = root.CWMarket[catalog][card[field]];
      if (effect) lines.push(effect.name+' — '+effect.description);
    }
    if (card.perishRounds != null) lines.push(card.perishRounds+' winning blinds remaining.');
    if (debuffed || card.debuffed) lines.push('Debuffed — Effects are inactive.');
    if (playing && lines.length === 1) lines.push('Standard playing card.');
    return lines.join('\n');
  }
  function attribute(value) {
    return ' data-card-tip="'+value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')+'"';
  }
  const cross = '<span class="boss-cross" aria-hidden="true">&times;</span>';
  root.CWCardTip = {details, attribute, cross};
  const tip = document.createElement('div');
  tip.id = 'cw-card-tooltip';
  tip.setAttribute('role','tooltip');
  tip.hidden = true;
  document.body.append(tip);
  let active;
  function hide() {
    if (active?.getAttribute('aria-describedby') === tip.id) active.removeAttribute('aria-describedby');
    active = null;
    tip.hidden = true;
  }
  function show(node, x, y) {
    if (!node) { hide(); return; }
    if (active !== node) {
      hide();
      active = node;
      const [name,...lines] = node.dataset.cardTip.split('\n');
      const heading = document.createElement('b');
      heading.textContent = name;
      tip.replaceChildren(heading);
      for (const line of lines) {
        const row = document.createElement('div');
        row.textContent = line;
        tip.append(row);
      }
      root.CWContent.colorStats(tip);
      node.setAttribute('aria-describedby',tip.id);
      tip.hidden = false;
    }
    const width = tip.offsetWidth, height = tip.offsetHeight;
    tip.style.left = Math.max(6, Math.min(x+14, innerWidth-width-6))+'px';
    tip.style.top = Math.max(6, y+height+20 <= innerHeight ? y+14 : y-height-10)+'px';
  }
  const selector = '[data-card-tip]';
  function pointer(e) {
    if (e.pointerType !== 'touch') show(e.target.closest?.(selector), e.clientX, e.clientY);
  }
  document.addEventListener('pointerover',pointer,true);
  document.addEventListener('pointermove',pointer,true);
  document.addEventListener('pointerout',e=>{if (!e.relatedTarget || !active?.contains(e.relatedTarget)) hide();},true);
  document.addEventListener('focusin',e=>{
    const node = e.target.closest(selector) || e.target.closest('button')?.querySelector(selector);
    if (node) { const rect=node.getBoundingClientRect(); show(node,rect.left,rect.bottom); }
  });
  document.addEventListener('focusout',hide);
  document.addEventListener('scroll',hide,true);
  document.addEventListener('pointerdown',hide,true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape') hide();},true);
  window.addEventListener('blur',hide);
  new MutationObserver(()=>{if(active && !active.isConnected) hide();}).observe(document.body,{childList:true,subtree:true});
})(window);
