(function (root) {
  'use strict';
  const ranks = {11:'Jack',12:'Queen',13:'King',14:'Ace'};
  const suits = {S:'Spades',H:'Hearts',C:'Clubs',D:'Diamonds'};
  // iPadOS can request desktop pages and identify itself as a Mac.
  const mobile = navigator.userAgentData?.mobile || /Android|iPad|iPhone|iPod|Mobi/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function details(card, debuffed, descriptionVisible = false) {
    const playing = Boolean(card.suit && card.rank);
    const name = playing ? (card.enhancement === 'stone' ? 'Stone Card' : (ranks[card.rank] || card.rank)+' of '+suits[card.suit]) : card.name;
    const lines = [name];
    if (card.kind === 'familiar') lines.push(card.rarity ? card.rarity+' Familiar' : 'Familiar');
    if (playing && card.tallyChips) lines.push("Permanent bonus: +"+card.tallyChips+" Chips.");
    if (!playing && card.description && (card.kind === 'familiar' || !descriptionVisible)) lines.push(card.description);
    for (const [field, catalog] of [['enhancement','enhancements'],['edition','editions'],['seal','seals'],['sticker','stickers']]) {
      const effect = root.CWMarket[catalog][card[field]];
      if (effect) {
        const description = field === 'edition' && card.edition === 'negative' && card.kind === 'familiar'
          ? '+1 Familiar slot while equipped. Fits even when your roost is full.'
          : effect.description;
        lines.push(effect.name+' - '+description);
      }
    }
    if (!descriptionVisible && card.perishRounds != null) lines.push(card.perishRounds+' winning blinds remaining.');
    if (debuffed || card.debuffed || card.bossMuted) lines.push('Debuffed - Effects are inactive.');
    if (descriptionVisible && lines.length === 1) return "";
    if (playing && lines.length === 1) lines.push('Standard playing card.');
    return lines.join('\n');
  }
  function attribute(value) {
    if (!value) return "";
    return ' data-card-tip="'+value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')+'"';
  }
  const cross = '<span class="boss-cross" aria-hidden="true">&times;</span>';
  root.CWCardTip = {details, attribute, cross, mobile};
  const tip = document.createElement('div');
  tip.id = 'cw-card-tooltip';
  tip.setAttribute('role','tooltip');
  tip.hidden = true;
  document.body.append(tip);
  let active, activeContent, tipWidth = 0, tipHeight = 0;
  const observer = new MutationObserver(()=>{if(active && !active.isConnected) hide();});
  function hide() {
    if (active?.getAttribute('aria-describedby') === tip.id) active.removeAttribute('aria-describedby');
    active = null;
    activeContent = '';
    tip.hidden = true;
    observer.disconnect();
  }
  function show(node, x, y) {
    if (mobile) return;
    const content = node?.dataset.cardTip;
    if (!content) { hide(); return; }
    if (active !== node || activeContent !== content) {
      hide();
      active = node;
      activeContent = content;
      const [name,...lines] = content.split('\n');
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
      tipWidth = tip.offsetWidth;
      tipHeight = tip.offsetHeight;
      observer.observe(document.body,{childList:true,subtree:true});
    }
    tip.style.left = Math.max(6, Math.min(x+14, innerWidth-tipWidth-6))+'px';
    tip.style.top = Math.max(6, y+tipHeight+20 <= innerHeight ? y+14 : y-tipHeight-10)+'px';
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
})(window);
