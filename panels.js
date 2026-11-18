(function (global) {
  'use strict';

  let options = {};
  let layer;
  let page = '';
  let detail = '';
  let focusBefore;
  let message = '';
  let guideTab = 'hands';
  let deckTab = 'draw';
  let targets = [];
  let castSourceRect;
  let restartDeck = 'arcane';
  let restartStake = '';
  let restartChallenge = '';
  let restartSeed = '';
  let collectionTab = '';
  let collectionFilter = 'all';
  const seedLimit = 64;
  let renderedPhase = '';
  const backStack = [];
  const suits = { S: '♠', H: '♥', C: '♣', D: '♦' };
  const suitNames = { S: 'spades', H: 'hearts', C: 'clubs', D: 'diamonds' };
  const suitOrder = ['S','H','C','D'];
  const pictures = new Set(['merlin', 'owl', 'orb', 'grimoire', 'moth', 'dragon', 'key', 'potion']);
  const mandatory = new Set(['lobby', 'payout', 'shop', 'select', 'won', 'lost', 'pack']);
  const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
  const guideExamples = {
    'High Card': ['AS'], 'Pair': ['KH','KC'], 'Two Pair':['QH','QS','5D','5C'],
    'Three of a Kind':['7H','7S','7C'], 'Straight':['6S','5D','4C','3H','2C'],
    'Flush':['AH','JH','8H','5H','2H'], 'Full House':['KH','KS','KC','6D','6S'],
    'Four of a Kind':['9S','9H','9D','9C'], 'Straight Flush':['9S','8S','7S','6S','5S'],
    'Five of a Kind':['AS','AH','AD','AC','AS'], 'Flush House':['KH','KH','KH','6H','6H'],
    'Flush Five':['9D','9D','9D','9D','9D']
  };

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function num(value) { return numbers.format(Number(value) || 0); }
  function rank(n) { return ({11:'J',12:'Q',13:'K',14:'A'})[n] || String(n); }
  function cardModifiers(c) {
    const title = word => word.charAt(0).toUpperCase()+word.slice(1);
    return [c.enhancement && title(c.enhancement), c.edition && title(c.edition), c.seal && title(c.seal)+' Seal',
      c.tallyChips && '+'+num(c.tallyChips)+' Chips banked'].filter(Boolean);
  }
  function red(suit) { return suit === 'H' || suit === 'D' ? ' cw-red-suit' : ''; }
  function api() { return global.CW; }
  function state() { return options.getState?.(); }
  function progress() { return options.getProgress?.() || {}; }
  function item(offer) {
    const id = offer?.id ?? offer;
    const base = api()?.item(offer) || api()?.item(id) || {id,name:id,kind:'item',description:''};
    return offer && typeof offer === 'object' ? {...base,...offer} : base;
  }
  function ownedItem(s, category, i) {
    const d = api().ownedItem?.(s,category,i) || item(s[category][i]);
    return d?.kind === 'familiar' ? {...d,upgradeAge:options.upgradeAge?.(d)} : d;
  }
  function readPhase(s) {
    if (options.wantsLobby?.()) return 'lobby';
    return s?.pack ? 'pack' : s && mandatory.has(s.phase) ? s.phase : '';
  }
  function button(action, label, variant = '', value = '', disabled = false) {
    return '<button class="cw-btn ' + variant + '" type="button" data-cw="' + action + '" data-value="' + esc(value) + '"' + (disabled ? ' disabled' : '') + '>' + esc(label) + '</button>';
  }
  function tab(action, value, label, active) {
    return '<button type="button" class="cw-tab" data-cw="' + action + '" data-value="' + esc(value) + '" aria-pressed="' + (value === active) + '">' + esc(label) + '</button>';
  }
  function heading(text) { return '<h3 class="cw-subheading">' + esc(text) + '</h3>'; }
  function stat(label, value) { return '<div class="cw-stat"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong></div>'; }
  function formula(chips, mult) { return '<span class="cw-formula"><b>' + num(chips) + '</b> <span>×</span> <b>' + num(mult) + '</b></span>'; }
  function cash(n) { return '$' + num(n); }
  let sellAnchor, sellTab;
  function dismissSell() {
    sellAnchor?.setAttribute('aria-expanded','false');
    sellTab?.remove();
    sellAnchor = sellTab = null;
  }
  function positionSell() {
    if (!sellTab) return;
    if (!sellAnchor.isConnected) return dismissSell();
    const card = sellAnchor.getBoundingClientRect();
    const {width,height} = sellTab.getBoundingClientRect();
    sellTab.style.left = Math.max(4, Math.min(card.right + 5, innerWidth - width - 4))+'px';
    sellTab.style.top = Math.max(4, Math.min(card.top + (card.height-height)/2, innerHeight-height-4))+'px';
  }
  function toggleSell(card,index,category='familiars') {
    const alreadyOpen = sellAnchor === card;
    dismissSell();
    if (alreadyOpen) return;
    const s = state(), id = s[category][index];
    if (!id) return;
    const entry = ownedItem(s,category,index);
    sellAnchor = card;
    card.setAttribute('aria-expanded','true');
    sellTab = document.createElement('div');
    sellTab.className = 'owned-action-tab';
    sellTab.popover = 'manual';
    function addAction(label,enabled,activate) {
      const button=document.createElement('button');
      button.type='button';
      button.className='familiar-sell-tab';
      button.disabled=!enabled;
      button.textContent=label;
      button.setAttribute('aria-label',label+' '+entry.name);
      button.addEventListener('click',event=>{
        event.stopPropagation();
        dismissSell();
        if (card.isConnected && state()===s && s[category][index]===id) activate();
      });
      sellTab.append(button);
    }
    const canSell=api().canSell(s,category,index);
    addAction(canSell?'Sell '+cash(api().sellPrice(s,id)):entry.sticker==='eternal'?'Eternal':'Sale unavailable',
      canSell,()=>perform(card.getBoundingClientRect(),category==='familiars'?'sell':'sellConsumable',index));
    if (category==='consumables') addAction('Use',api().canUse(s,index),()=>act('use-item',String(index),card));
    card.after(sellTab);
    global.CWContent.colorStats(sellTab);
    sellTab.showPopover?.();
    positionSell();
  }
  document.addEventListener('pointerdown',event=>{
    if (sellTab && !sellAnchor.contains(event.target) && !sellTab.contains(event.target)) dismissSell();
  },true);
  document.addEventListener('keydown',event=>{
    if (sellTab && event.key==='Escape') {
      sellAnchor.focus();
      dismissSell();
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },true);
  window.addEventListener('resize',positionSell);
  document.addEventListener('scroll',positionSell,true);
  function packFamily(d) {
    const pool = d.pool || api().item(d.id)?.pool;
    return pool === 'star' ? 'constellation' : pool || 'standard';
  }
  function itemDescription(d) {
    const hand = d.rarity === 'Constellation' && (d.value || api().item(d.id)?.value);
    const description = esc(d.description);
    return hand ? description.replace(esc(hand), '<strong class="constellation-hand">'+esc(hand)+'</strong>') : description;
  }
  function cardTip(card, descriptionVisible = false) {
    const run = state();
    const muted = card.suit && run?.phase === 'play' && api().debuffed(run,card);
    return global.CWCardTip.attribute(global.CWCardTip.details(card,muted,descriptionVisible));
  }
  function picture(d, compact = false, frame = global.CWFamiliarFrames) {
    if(d.kind==='card' && options.cardPreview) return '<div class="card-display">'+options.cardPreview(d)+'</div>';
    const css = compact ? 'cw-owned-emblem' : 'cw-item-image';
    let content;
    if (d.kind === 'pack') {
      const family = packFamily(d);
      return '<div class="'+css+' booster-face" data-family="'+family+'"><svg class="booster-seal" viewBox="0 0 24 24" aria-hidden="true">'+global.CWContent.cardTypes[family][1]+'</svg></div>';
    }
    if (d.kind === 'familiar' || pictures.has(d.art)) {
      content = '<img alt="" src="' + esc(global.CWContent.portrait(d.art)) + '">';
    } else if (d.kind === 'card') {
      content = '<span>' + esc(rank(d.rank) + (suits[d.suit] || '')) + '</span>';
    } else {
      content = '<span aria-hidden="true">' + esc(d.icon || '✦') + '</span>';
    }
    const type=global.CWContent.cardType(d);
    const accent = /^#[a-f\d]{3,8}$/i.test(d.color || '') ? d.color : '#c3abdc';
    const edition = ['foil','holographic','polychrome','negative'].includes(d.edition) ? ' cw-edition-'+d.edition : '';
    return '<div class="' + css + edition + '"' + (frame?.attribute(d) || '') + ' data-family="'+type+'" style="--item-color:' + accent + '">' + content + (frame?.ornament(d) || '') + global.CWContent.familiarFinish(d,d.upgradeAge) + global.CWContent.typeBadge(type,compact) + (d.bossMuted?global.CWCardTip.cross:'') + '</div>';
  }
  function badges(d) {
    const edition = d.edition && (api().EDITIONS?.[d.edition]?.name || global.CWMarket?.editions?.[d.edition]?.name || d.edition);
    const sticker = d.sticker || d.status;
    const statuses = Array.isArray(d.stickers) ? d.stickers : sticker ? [sticker] : [];
    const labels = [edition, ...statuses, d.eternal && !statuses.includes('eternal') && 'Eternal',
      d.rental && !statuses.includes('rental') && 'Rental', d.perishable && !statuses.includes('perishable') && 'Perishable',
      d.perishRounds != null && d.perishRounds+' left', d.debuffed && 'Disabled'].filter(Boolean);
    return labels.length ? '<span class="cw-badges">'+labels.map(label=>'<span>'+esc(label)+'</span>').join('')+'</span>' : '';
  }
  function shell() {
    if (layer) return;
    layer = document.createElement('div');
    layer.className = 'cw-backdrop';
    layer.hidden = true;
    layer.innerHTML = '<section class="cw-dialog" role="dialog" aria-modal="true" aria-labelledby="cw-panel-title" tabindex="-1"><header class="cw-head"></header><div class="cw-message" aria-live="polite"></div><div class="cw-body"></div><footer class="cw-footer"></footer></section>';
    document.body.append(layer);
    const fitTrials = () => {
      const panel = dialog();
      if (layer.hidden || panel.dataset.page !== 'select' || !panel.offsetHeight) return;
      const style = getComputedStyle(layer);
      const room = layer.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      panel.style.setProperty('--trial-scale', Math.min(1, room / panel.offsetHeight));
    };
    const observer = new ResizeObserver(fitTrials);
    observer.observe(layer);
    observer.observe(dialog());
    layer.addEventListener('input', event => {
      if (event.target.id === 'cw-run-seed') {
        restartSeed = event.target.value;
        layer.querySelector('.seed-indicator').hidden = !restartSeed.trim();
      }
      if (event.target.type === 'range') {
        const value = layer.querySelector('output[for="'+event.target.id+'"]');
        if (value) value.value = Math.round(Number(event.target.value)*100)+'%';
      }
    });
    layer.addEventListener('change', event => {
      const key = event.target.dataset.select;
      const value = event.target.value;
      if (key === 'deck') restartDeck = value;
      if (key === 'stake') restartStake = value;
      if (key === 'challenge') restartChallenge = value;
      if (key) paint(false);
      const preference = event.target.dataset.setting;
      if (preference) options.setSetting?.(preference,Number(value));
    });
    layer.addEventListener('submit', event => {
      if (event.target.id === 'cw-new-run') { event.preventDefault(); act('restart',''); }
      if (event.target.id === 'cw-new-profile') {
        event.preventDefault();
        act('create-profile',event.target.querySelector('input').value);
      }
    });
    layer.addEventListener('click', e => {
      const owned=e.target.closest('[data-owned-category]');
      if (owned) return toggleSell(owned,Number(owned.dataset.slot),owned.dataset.ownedCategory);
      const companion=e.target.closest('[data-companion]');
      if (companion) return toggleSell(companion,Number(companion.dataset.companion));
      if (e.target === layer) { if (isDismissible()) close(); return; }
      const b = e.target.closest('[data-cw]');
      if (b && !b.disabled) act(b.dataset.cw, b.dataset.value ?? '', b);
    });
    document.addEventListener('keydown', event => {
      if (!page) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation();
        if (isDismissible()) close();
      } else if (event.key === 'Tab') {
        const buttons = [...layer.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary')].filter(el=>el.getClientRects().length);
        if (!buttons.length) { event.preventDefault(); return; }
        const first = buttons[0], last = buttons[buttons.length-1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog() || !layer.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !layer.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    }, true);
  }
  function dialog() { return layer?.querySelector('.cw-dialog'); }
  function isDismissible() { return page !== readPhase(state()); }
  function route(next, value = '') {
    const wasOpen = !!page;
    page = next;
    detail = value;
    message = '';
    if (!page) {
      if (!layer) return;
      layer.hidden = true;
      if (focusBefore?.isConnected) focusBefore.focus({preventScroll:true});
      focusBefore = null;
      return;
    }
    shell();
    if (!wasOpen) focusBefore = document.activeElement;
    layer.hidden = false;
    paint(true);
    dialog().focus({preventScroll:true});
  }
  function open(next, value = '', sourceRect) {
    const s = state();
    const names = {codex:'guide',info:'run',options:'settings'};
    next = names[next] || next;
    if (!['menu','guide','deck','run','settings','restart','spell','shop-spell','leave-rewards','lobby','career','collection','profiles'].includes(next)) return;
    if (!s && !['menu','lobby','settings','restart','career','collection','profiles'].includes(next)) return;
    if (page === next && value === detail) return;
    if (page !== next && page) backStack.push([page,detail]);
    if (next === 'restart') {
      restartDeck = s?.deckId || 'arcane';
      restartStake = s?.stakeId || '';
      restartChallenge = '';
      restartSeed = '';
    }
    if (next === 'spell') {
      const d = ownedItem(s,'consumables',Number(value));
      const selected = (options.getSelection?.() || []).filter(id=>usableCards(s).some(c=>c.id===id && api().canTarget(d,c)));
      targets = selected.length <= d.maxTargets ? selected : [];
    }
    if (next === 'shop-spell') targets = [];
    if (next === 'shop-spell' || next === 'spell') castSourceRect = sourceRect;
    route(next, value);
  }
  function close() {
    if (page && !isDismissible()) return;
    const leaving = page;
    const previous = backStack.pop() || [readPhase(state()), ''];
    route(previous[0], previous[1]);
    if (previous[0] === 'lobby' || previous[0] === 'menu') {
      const trigger = leaving === 'guide' ? '[data-cw="learn"]' : '[data-value="'+leaving+'"]';
      layer.querySelector(trigger)?.focus({preventScroll:true});
    }
  }
  function sync() {
    const now = readPhase(state());
    if (renderedPhase !== now) {
      renderedPhase = now;
      backStack.length = 0;
      route(now);
      return;
    }
    if (!page && now) route(now);
    else if (page) paint(false);
  }
  function configure(config) { options = config; shell(); sync(); }
  function result(kicker,title,body,footer = '') { return {kicker,title,body,footer}; }
  function paint(reset) {
    dismissSell();
    if (!page) return;
    const s = state() || {};
    const body = layer.querySelector('.cw-body');
    const priorScroll = reset ? 0 : body.scrollTop;
    const focused = !reset && layer.contains(document.activeElement) && document.activeElement.dataset.cw ? {action:document.activeElement.dataset.cw,value:document.activeElement.dataset.value} : null;
    const focusedId = !reset && layer.contains(document.activeElement) && document.activeElement.id;
    const openSections = !reset && page === 'restart' ? [...body.querySelectorAll('details[open]')].map(section=>section.id) : [];
    const selection = !reset && document.activeElement?.tagName === 'INPUT' ? [document.activeElement.selectionStart,document.activeElement.selectionEnd] : null;
    const views = {menu:menuView,guide:guideView,deck:deckView,run:runView,settings:settingsView,restart:restartView,spell:spellView,'shop-spell':spellView,'leave-rewards':leaveRewardsView,shop:shopView,pack:packView,payout:payoutView,select:selectView,won:endView,lost:endView,lobby:lobbyView,career:careerView,collection:collectionView,profiles:profilesView};
    const view = views[page]?.(s);
    if (!view) return;
    dialog().dataset.page = page;
    layer.classList.toggle('in-parlor',Boolean(options.wantsLobby?.()));
    layer.classList.toggle('at-verdict',page==='won' || page==='lost');
    layer.querySelector('.cw-head').innerHTML = '<div><p class="cw-kicker">' + esc(view.kicker) + '</p><h2 id="cw-panel-title">' + esc(view.title) + '</h2></div>' + (view.headerEnd || '') + (isDismissible() ? '<button type="button" class="cw-x" data-cw="close" aria-label="Close panel">×</button>' : '');
    const emblem = {restart:'logo',guide:'grimoire',collection:'orb',career:'blind',settings:'key',profiles:'owl'}[page];
    if (page === 'shop') global.CWShopCat.mount(layer.querySelector('.cw-head'),s);
    if (emblem && options.wantsLobby?.()) {
      layer.querySelector('.cw-head').insertAdjacentHTML('afterbegin','<img class="parlor-emblem" alt="" src="'+global.CWContent.portrait(emblem)+'">');
    }
    dialog().querySelector(':scope > .victory-sky')?.remove();
    if (view.victory) {
      dialog().insertAdjacentHTML('afterbegin','<div class="victory-sky" aria-hidden="true"><div class="astrolabe"><i class="orbit-outer"></i><i class="orbit-middle"></i><i class="orbit-inner"></i><i class="victory-star"></i></div></div>');
      layer.querySelector('.cw-head').insertAdjacentHTML('beforeend',victoryScore(s));
    }
    layer.querySelector('.cw-message').textContent = message;
    global.CWContent.colorStats(layer.querySelector('.cw-head'));
    body.innerHTML = view.body;
    for (const id of openSections) {
      const section = document.getElementById(id);
      if (section) section.open = true;
    }
    global.CWContent?.colorStats?.(body);
    if(page==='payout' && reset && !options.getSettings?.()?.reducedMotion && body.animate) tallySpoils(body);
    layer.querySelector('.cw-footer').innerHTML = view.footer;
    global.CWContent.colorStats(layer.querySelector('.cw-footer'));
    global.CWContent.colorStats(layer.querySelector('.cw-message'));
    body.scrollTop = priorScroll;
    if (focusedId) {
      const field = document.getElementById(focusedId);
      field?.focus({preventScroll:true});
      if (selection?.[0] != null) field?.setSelectionRange(...selection);
    } else if (focused) {
      const restore = [...layer.querySelectorAll('button:not(:disabled)')].find(b => b.dataset.cw === focused.action && b.dataset.value === focused.value);
      (restore || dialog()).focus({preventScroll:true});
    }
  }
  function announce(text) { message = text; paint(false); }
  function changed(sound = 'select', sourceRect) {
    options.playSound?.(sound);
    options.onChange?.();
    sync();
    options.playFamiliarEvents?.(sourceRect);
  }
  function perform(sourceRect, action, ...args) {
    const paying=action==='cashOut' && !options.getSettings?.()?.reducedMotion && layer.animate;
    const speed=options.getSettings?.()?.speed || 1;
    const origin=paying && layer.querySelector('.spoils-total strong')?.getBoundingClientRect();
    const amount=origin && state().payout.total;
    const ok = api()[action]?.(state(), ...args);
    if (ok == null || ok === false) { options.playSound?.('error'); announce('That action is unavailable right now.'); return false; }
    message = '';
    const sounds = {buy:'buy',buyAndUse:'buy',pick:'buy',sell:'buy',sellConsumable:'buy',reroll:'buy',rerollBoss:'buy',cashOut:state().phase==='won'?'win':'shop',startBlind:'deal',endless:'deal'};
    changed(sounds[action],sourceRect);
    if(origin && amount>0){
      const purse=layer.querySelector('.cw-purse strong, .victory-stat-wallet strong') || document.getElementById('money');
      const end=purse.getBoundingClientRect();
      const dx=end.left+end.width/2-origin.left-origin.width/2;
      const dy=end.top+end.height/2-origin.top-origin.height/2;
      for(let i=0;i<Math.min(10,amount);i++){
        const coin=document.createElement('i');
        coin.className='payout-coin';
        coin.style.left=(origin.left+origin.width/2)+'px';
        coin.style.top=(origin.top+origin.height/2)+'px';
        document.body.append(coin);
        coin.animate([
          {translate:'0 0',scale:'.55',opacity:0},
          {translate:(dx*.4+(i%3-1)*19)+'px '+(dy*.4-42)+'px',scale:'1',opacity:1,offset:.4},
          {translate:dx+'px '+dy+'px',scale:'.45',opacity:.2}
        ],{duration:390/speed,delay:i*37/speed,fill:'both'}).onfinish=()=>coin.remove();
      }
      purse.animate([{color:'#fff2a0',scale:'1.2'},{scale:'1'}],{duration:260/speed,delay:370/speed});
    }
    return true;
  }
  function example(name) {
    return '<div class="cw-examples">' + (guideExamples[name] || []).map(c => {
      const suit = c.slice(-1);
      return '<span class="cw-mini' + red(suit) + '">' + esc(c.slice(0,-1) + suits[suit]) + '</span>';
    }).join('') + '</div>';
  }
  function guideView(s) {
    const tabs = '<div class="cw-tabs">' + tab('guide-tab','hands','Poker hands',guideTab) + tab('guide-tab','rules','How to play',guideTab) + '</div>';
    let section;
    if (guideTab === 'rules') {
      const notes = [
        ['Beat the blind','Select one to five cards and play them to add to your round score. Reach the target before your hands run out.'],
        ['Build a scoring hand','The strongest poker combination in your selection sets its base chips and multiplier. Only the cards that form that combination add their rank chips. Aces add 11 chips and face cards add 10.'],
        ['Draw and discard','Played or discarded cards leave your hand. Draw replacements from the pile until the hand is full or the pile runs out. All deck cards return for the next blind.'],
        ['Stack your familiars','Familiars apply from left to right. Place additive multiplier bonuses before multiplier effects to make the most of both. Drag your familiars to change their order.'],
        ['Spend your winnings','Visit the shop after a blind for familiars, spells, vouchers and boosters. Save cash to earn interest at the end of a round.'],
        ['Survive eight antes','Each ante contains a Small Blind, a Big Blind and a Boss Blind with its own rule. Skipping an eligible blind awards its listed bonus. Defeat the eighth boss to win.']
      ];
      const lesson = '<div class="grimoire-lesson"><div class="lesson-hand" aria-hidden="true">'+parlorCard('K','♥','ruby')+parlorCard('K','♣','jade')+'</div><div><b>A pair of kings</b><p>Play two kings together. Both cards score, and your familiar can add its bonus.</p></div></div>';
      section = lesson+'<dl class="cw-instructions">' + notes.map(([t,d])=>'<div><dt>'+esc(t)+'</dt><dd>'+esc(d)+'</dd></div>').join('') + '</dl>';
    } else {
      const visible = Object.entries(api().HANDS).filter(([name,h])=>!h.secret || s.seenHands?.[name]);
      const rows = visible.map(([name,h]) => {
        const level = s.levels[name] || 1;
        return '<tr><td class="cw-guide-name">' + esc(name) + '</td><td>' + num(s.seenHands?.[name] || 0) + '</td><td class="cw-level">' + num(level) + '</td><td class="cw-example-col">' + example(name) + '</td><td>' + formula(h.chips+(level-1)*h.chipStep,h.mult+(level-1)*h.multStep) + '</td></tr>';
      }).join('');
      section = '<table class="cw-guide"><thead><tr><th>Hand</th><th title="Times played this run">Played</th><th>Lv.</th><th class="cw-example-col">Example</th><th>Chips × Mult</th></tr></thead><tbody>' + rows + '</tbody></table>';
      if (visible.length < Object.keys(api().HANDS).length) section += '<p class="cw-guide-hint">Changing your deck can unlock hidden hands.</p>';
    }
    return result('Grimoire',guideTab==='rules'?'How to play':'Hand guide',tabs+section);
  }
  function deckView(s) {
    const source = deckTab === 'draw' ? s.draw : s.deck;
    const tabs = '<div class="cw-tabs">' + tab('deck-tab','draw','Draw pile · '+s.draw.length,deckTab) + tab('deck-tab','all','Full deck · '+s.deck.length,deckTab) + '</div>';
    const ranks = Array.from({length:13},(_,i)=>14-i);
    let grid = '<div class="cw-deck-grid" aria-label="Card counts by suit and rank"><span></span>' + ranks.map(r=>'<span class="cw-rank-label">'+rank(r)+'</span>').join('');
    for (const suit of suitOrder) {
      grid += '<span class="cw-suit-label'+red(suit)+'" aria-label="'+suitNames[suit]+'">'+suits[suit]+'</span>';
      for (const r of ranks) {
        const copies = source.filter(c=>c.rank===r && c.suit===suit);
        const n = copies.length;
        const label = rank(r)+' of '+suitNames[suit]+', '+n+' copies';
        const descriptions = copies.map(c=>global.CWCardTip.details(c,s.phase==='play' && api().debuffed(s,c)));
        const crossed = n && s.phase==='play' && copies.every(c=>api().debuffed(s,c));
        const variants = [...new Set(descriptions)];
        const tip = n ? global.CWCardTip.attribute(variants.length===1 ? variants[0] : [label,...variants.map(v=>descriptions.filter(d=>d===v).length+' × '+v.replaceAll('\n',' · '))].join('\n')) : '';
        grid += '<span class="cw-deck-tile'+red(suit)+(n?'':' cw-spent')+'"'+(n?' tabindex="0"'+tip:'')+' aria-label="'+esc(label)+'">'+(n>1?'×'+n:n?rank(r):'–')+(crossed?global.CWCardTip.cross:'')+'</span>';
      }
    }
    const modified = source.filter(c=>c.enhancement || c.edition || c.seal || c.tallyChips);
    const mods = modified.length ? heading('Modified cards')+'<div class="cw-mod-list">'+modified.map(c=>'<span tabindex="0"'+cardTip(c)+'>'+esc(rank(c.rank)+suits[c.suit]+' · '+cardModifiers(c).join(' · '))+(s.phase==='play' && api().debuffed(s,c)?global.CWCardTip.cross:'')+'</span>').join('')+'</div>' : '';
    return result('Deck inspection','Your deck',tabs+grid+'</div>'+mods);
  }
  function road(s) {
    return '<div class="cw-road">'+[0,1,2].map(i=>{
      const b = api().blindInfo(s,i);
      const status = i<s.blind?'Passed':i===s.blind?'Current':'Upcoming';
      const description = i===2?b.description:status;
      return '<div class="cw-road-row'+(i===s.blind?' cw-active':'')+'"><div><b>'+esc(b.name)+'</b><small>'+esc(description)+'</small></div><span>'+num(b.target)+'<small>chips</small></span></div>';
    }).join('')+'</div>';
  }
  function runView(s) {
    const st = s.stats;
    const modes = [api().DECKS?.[s.deckId]?.name,api().STAKES?.[s.stakeId]?.name,api().CHALLENGES?.[s.challengeId]?.name].filter(Boolean).join(' · ');
    const stopBoss = api().canDisableBoss?.(s) ? button('disable-boss','Disable boss rule'+bossCost('bossDisablePrice',s),'cw-danger') : '';
    const tally = s.tallyPerPlay ? '<p>Witch’s Tally · Played cards bank +'+num(s.tallyPerPlay)+' Chips each.</p>' : '';
    return result('Run record','Run info','<div class="cw-stats">'+stat('Ante',s.ante)+stat('Round',s.round)+stat('Blinds won',st.roundsWon)+stat('Best hand score',num(st.bestScore))+'</div>'+heading('This ante')+road(s)+heading('Run details')+'<div class="cw-box">'+esc(modes)+'<br><small>'+num(st.handsPlayed)+' hands played · '+num(st.discardsUsed)+' discards used'+(s.seed != null?' · Seed '+esc(s.seed):'')+'</small>'+tally+'</div>',
        stopBoss+button('open','Hand guide','','guide')+button('open','Career','','career')+button('open','Settings','','settings'));
  }
  function settingsView() {
    const settings = options.getSettings?.() || {};
    const row=(name,desc,key,active)=>'<div class="cw-setting"><div><b>'+name+'</b><small>'+desc+'</small></div><button class="cw-toggle" type="button" data-cw="toggle-setting" data-value="'+key+'" aria-label="'+name+'" aria-pressed="'+active+'">'+(active?'On':'Off')+'</button></div>';
    const volume = (label,key) => {
      const id='cw-'+key, value=settings[key] ?? 1;
      return '<div class="cw-setting"><label for="'+id+'"><b>'+label+'</b></label><div class="cw-volume"><input id="'+id+'" type="range" min="0" max="1" step="0.05" value="'+value+'" data-setting="'+key+'"><output for="'+id+'">'+Math.round(value*100)+'%</output></div></div>';
    };
    const speeds=[0.75,1,1.5,2,3].map(speed=>'<option value="'+speed+'"'+(speed===(settings.speed || 1)?' selected':'')+'>'+speed+'×</option>').join('');
    const speed='<div class="cw-setting"><label for="cw-speed"><b>Game speed</b><small>Scoring, cards, and payouts</small></label><select id="cw-speed" class="cw-select" data-setting="speed">'+speeds+'</select></div>';
    const body=row('Game audio','Music and sound effects at the table.','muted',!settings.muted)+volume('Music','musicVolume')+volume('Sound effects','effectVolume')+speed+row('Reduced motion','Limit card and score animations.','reducedMotion',!!settings.reducedMotion)+row('High contrast','Distinguish playing card suits with color.','highContrast',!!settings.highContrast);
    return result('Preferences','Settings',body,button('show-menu','Main menu'));
  }
  function resumable() { return options.hasSavedRun?.() ?? options.hasRun?.() ?? Boolean(state()?.seed); }
  function runChoices() {
    const decks = api().DECKS || {};
    const stakes = api().STAKES || {};
    const challenges = api().CHALLENGES || {};
    const profile = progress();
    const unlocked = profile.unlocked || {};
    const available = (options,category,id) => Object.hasOwn(options,id) && (!unlocked[category] || unlocked[category].includes(id));
    const current = (options,category,id) => available(options,category,id) ? id : Object.keys(options).find(key=>available(options,category,key));
    const challengeId = available(challenges,'challenges',restartChallenge) ? restartChallenge : '';
    const challenge = challenges[challengeId];
    return {decks,stakes,challenges,unlocked,unlockHints:profile.unlockHints || {},challengeId,challenge,
      deckId:challenge?.deck ?? challenge?.deckId ?? current(decks,'decks',restartDeck) ?? 'arcane',
      stakeId:challenge?.stake ?? challenge?.stakeId ?? current(stakes,'stakes',restartStake)};
  }
  function runSelect(label,key,values,selected,unlocked,forced=false) {
    const id='cw-run-'+key;
    const list=Object.entries(values).map(([value,d])=>{
      const locked=!!unlocked && !unlocked.includes(value) && value!==selected;
      return '<option value="'+esc(value)+'"'+(value===selected?' selected':'')+(locked?' disabled':'')+'>'+esc(d.name+(locked?' · Locked':''))+'</option>';
    }).join('');
    const standard=key==='challenge'?'<option value=""'+(selected?'':' selected')+'>Standard run</option>':'';
    const choice=values[selected];
    return '<div class="cw-run-field"><label for="'+id+'">'+label+'</label><select id="'+id+'" class="cw-select" data-select="'+key+'"'+(forced?' disabled':'')+'>'+standard+list+'</select>'+(choice && key!=='challenge'?'<small>'+esc(choice.description)+'</small>':'')+'</div>';
  }
  function startForm(s) {
    const {decks,stakes,challenges,unlocked,unlockHints,deckId,stakeId,challengeId,challenge}=runChoices();
    const deck=decks[deckId];
    const forcedDeck=!!(challenge?.deck || challenge?.deckId);
    const available=Object.entries(decks).filter(([id])=>id===deckId || !unlocked.decks || unlocked.decks.includes(id));
    const deckOptions=available.map(([id,d])=>'<option value="'+esc(id)+'"'+(id===deckId?' selected':'')+'>'+esc(d.name)+'</option>').join('');
    const deckSelect='<select id="cw-run-deck" data-select="deck" aria-label="Starting deck"'+(forcedDeck?' disabled':'')+'>'+deckOptions+'</select>';
    const seed = '<div class="cw-seed-form"><label for="cw-run-seed">Practice seed <small>Optional</small></label><div><input id="cw-run-seed" type="text" maxlength="'+seedLimit+'" autocomplete="off" autocapitalize="off" spellcheck="false" value="'+esc(restartSeed)+'" placeholder="Random seed">'+(resumable() && s.seed?button('repeat-seed','Reuse seed'):'')+'</div></div>';
    const locked=Object.entries(decks).filter(([id])=>unlocked.decks && !unlocked.decks.includes(id));
    const deckHints=locked.length?'<details class="deck-unlocks" id="deck-unlocks"><summary>Locked decks ('+locked.length+')</summary><dl>'+
      locked.map(([id,d])=>'<div><dt>'+esc(d.name)+'</dt><dd>'+esc(unlockHints[id] || d.unlockText || 'Locked')+'</dd></div>').join('')+'</dl></details>':'';
    const starters=challenge?.rules?.starter ?? deck.starter ?? ['merlin'];
    const companions=starters.map(id=>{
      const d=item(id);
      return '<span><img alt="" src="'+esc(global.CWContent.portrait(d.art))+'">'+esc(d.name)+'</span>';
    }).join('');
    const emblem=({arcane:'grimoire',alchemist:'potion',oracle:'orb'})[deckId] || (deck.starter?.length ? item(deck.starter[0]).art : 'owl');
    const selector='<div class="deck-selector'+(forcedDeck?' fixed':'')+'">'+deckSelect+'</div>';
    const preview='<div class="deck-preview"><div class="run-deck-art" aria-hidden="true"><i></i><i></i><i><img src="'+esc(global.CWContent.portrait(emblem))+'" alt=""></i></div>'+
      '<div class="deck-choice">'+selector+'<p>'+esc(challenge?.description || deck.description)+'</p></div></div>'+
      '<div class="deck-companions"><small>Starting familiar'+(starters.length>1?'s':'')+'</small>'+(companions || '<span>None</span>')+'</div>';
    const settings=[stakes[stakeId]?.name,challenge?.name].filter(Boolean).map(esc).join(' · ');
    return '<form id="cw-new-run">'+preview+'<details class="run-options" id="run-options"><summary>Run options <small>'+settings+
      '<span class="seed-indicator"'+(restartSeed.trim()?'':' hidden')+'> · Seeded</span></small></summary><div class="run-settings">'+
      (Object.keys(stakes).length?runSelect('Difficulty','stake',stakes,stakeId,unlocked.stakes,!!(challenge?.stake || challenge?.stakeId)):'')+
      (Object.keys(challenges).length?runSelect('Challenge','challenge',challenges,challengeId,unlocked.challenges):'')+seed+deckHints+'</div></details></form>';
  }
  function startButton() { return '<button class="cw-btn cw-primary" type="submit" form="cw-new-run">Start run</button>'; }
  function restartView(s) {
    return result('','Choose your deck',startForm(s)+(resumable() && !['won','lost'].includes(s.phase)?'<p class="cw-explain">Starting a new run replaces your active run.</p>':''),button('close','Back')+startButton());
  }
  function parlorCard(rank,suit,extra='') {
    return '<i class="parlor-card '+extra+'"><b>'+rank+'</b><span>'+suit+'</span><small>'+suit+'</small></i>';
  }
  function parlorScene() {
    return '<div class="parlor-scene"><div class="parlor-painting">'+
      '<span class="parlor-lantern" aria-hidden="true"></span>'+
      '<button type="button" class="dealer-window" data-cw="deal-trick" aria-label="Ask the market cat to deal a poker hand"><span class="dealer-cat"></span></button>'+
      '<div class="dealer-hand" aria-hidden="true"></div>'+
      '<output class="dealer-call" aria-live="polite"></output></div></div>';
  }
  function dealParlorTrick() {
    const hand=layer.querySelector('.dealer-hand');
    const tricks=['Pair','Three of a Kind','Straight Flush'];
    const index=Number(hand.dataset.deal || 0);
    const name=tricks[index], cards=guideExamples[name];
    hand.dataset.deal=String((index+1)%tricks.length);
    hand.innerHTML=cards.map((card,i)=>{
      const suit=card.slice(-1), angle=(i-(cards.length-1)/2)*18;
      return '<span class="trick-card" style="--fan:'+angle+'deg;--order:'+i+'">'+parlorCard(card.slice(0,-1),suits[suit],red(suit)?'ruby':'jade')+'</span>';
    }).join('');
    layer.querySelector('.dealer-call').textContent=name;
    options.playSound?.('select');
  }
  function lobbyView(s) {
    const saved=resumable(), live=saved && !['won','lost'].includes(s.phase);
    const main=live ? button('continue-run','Resume Run','parlor-play') : button('open','Play','parlor-play','restart');
    const secondary=live ? button('open','New Run','parlor-secondary','restart') :
      saved ? button('continue-run','Last Result','parlor-secondary') : '';
    const links='<nav class="parlor-links" aria-label="Main menu">'+button('learn','How to play')+button('open','Menu','','menu')+'</nav>';
    const title='<div class="parlor-hero"><h1 class="parlor-logo"><em>Card</em> <strong>Wizard</strong></h1>'+
      '<div class="parlor-actions">'+main+secondary+'</div>'+links+'</div>';
    return result('','Card Wizard',title+parlorScene());
  }
  function menuView() {
    const entries=[['collection','Collection','orb'],['career','Career','blind'],['settings','Settings','key'],['profiles','Profile','owl']];
    const profile=progress().profile?.name || 'Apprentice';
    const nav=entries.map(([value,label,art])=>'<button type="button" data-cw="open" data-value="'+value+'"><img alt="" src="'+
      esc(global.CWContent.portrait(art))+'"><b>'+label+'</b>'+(value==='profiles'?'<small>'+esc(profile)+'</small>':'')+'</button>').join('');
    return result('','Menu','<nav class="parlor-directory" aria-label="Game menu">'+nav+'</nav>');
  }
  function profilesView() {
    const profiles=options.getProfiles?.() || [];
    const entries=profiles.map(profile=>'<div class="cw-profile-row"><b>'+esc(profile.name)+'</b>'+(profile.active?'<span>Active</span>':button('change-profile','Switch','',profile.id))+'</div>').join('');
    const create='<form id="cw-new-profile" class="cw-seed-form"><label for="cw-profile-name">Add a profile</label><div><input id="cw-profile-name" name="name" required maxlength="32" autocomplete="off" placeholder="Profile name"><button class="cw-btn cw-primary" type="submit">Create</button></div></form>';
    return result('','Profiles',entries+create,button('close','Back'));
  }
  function careerView() {
    const data=progress(), st=data.stats || {};
    const grid='<div class="cw-stats">'+stat('Wins',num(st.wins))+stat('Runs',num(st.runsStarted))+stat('Top ante',num(st.bestAnte))+stat('Top hand',num(st.bestScore))+'</div>';
    const counts='<div class="cw-stat-details">'+stat('Hands played',num(st.handsPlayed))+stat('Discards',num(st.discardsUsed))+stat('Blinds cleared',num(st.roundsWon))+stat('Blinds skipped',num(st.skipped))+'</div>';
    const rows=(values,definitions)=>Object.entries(values || {}).map(([id,value])=>{
      const wins=typeof value==='object'?Object.values(value).reduce((total,count)=>total+(Number(count)||0),0):Number(value)||0;
      return '<div class="cw-profile-row"><b>'+esc(definitions?.[id]?.name || id)+'</b><span>'+num(wins)+' wins</span></div>';
    }).join('');
    const milestones=(data.achievements || []).map(a=>'<div class="cw-achievement'+(a.earned?' unlocked':'')+'"><span aria-label="'+(a.earned?'Earned':'Locked')+'">'+(a.earned?'✦':'◇')+'</span><div><b>'+esc(a.name)+'</b><small>'+esc(a.description)+'</small></div></div>').join('');
    const decks=rows(st.deckWins,api().DECKS), stakes=rows(st.stakeWins,api().STAKES), challenges=rows(st.challengeWins,api().CHALLENGES);
    const usage=Object.entries(st.itemUses || {}).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([id,count])=>'<div class="cw-profile-row"><b>'+esc(item(id).name)+'</b><span>'+num(count)+'</span></div>').join('');
    return result(data.profile?.name || '','Career',grid+counts+(decks?heading('Deck wins')+decks:'')+(stakes?heading('Difficulty wins')+stakes:'')+
      (challenges?heading('Challenge wins')+challenges:'')+(usage?heading('Most used items')+usage:'')+(milestones?heading('Achievements')+'<div class="cw-achievements">'+milestones+'</div>':''),button('close','Back')+button('open','Collection','','collection'));
  }
  function collectionView() {
    const data=progress();
    const groups=data.collection || [];
    const active=groups.find(group=>group.key===collectionTab) || groups[0];
    const tabs='<div class="cw-tabs">'+groups.map(g=>tab('collection-tab',g.key,g.name,active?.key)).join('')+'</div>';
    const entries=active?.entries || [];
    const visible=entries.filter(e=>collectionFilter==='all' || (collectionFilter==='known'?e.discovered:!e.discovered));
    if (active?.key==='decks') visible.sort((a,b)=>Number(a.locked)-Number(b.locked));
    const summary='<div class="cw-collection-summary"><strong>'+entries.filter(e=>e.discovered).length+' / '+entries.length+' discovered</strong><div class="cw-tabs">'+tab('collection-filter','all','All',collectionFilter)+tab('collection-filter','known','Discovered',collectionFilter)+tab('collection-filter','unknown','Unknown',collectionFilter)+'</div></div>';
    const list=visible.map(entry=>{
      const deckId=active.key==='decks' && entry.id.replace(/^deck_/,'');
      if (deckId && !entry.discovered && data.unlocked?.decks?.includes(deckId)) {
        const emblem=({arcane:'grimoire',alchemist:'potion',oracle:'orb'})[deckId] || 'grimoire';
        return '<article class="cw-collection-item available-deck"><img alt="" src="'+global.CWContent.portrait(emblem)+'"><div><b>'+esc(entry.name)+'</b><small>Available to play</small></div></article>';
      }
      if (!entry.discovered) return '<article class="cw-collection-item unknown"><span class="cw-owned-emblem" aria-hidden="true">'+(entry.locked?'◇':'?')+'</span><div><b>'+esc(entry.locked?'Locked':'Undiscovered')+'</b>'+(entry.unlockHint?'<small>'+esc(entry.unlockHint)+'</small>':'')+'</div></article>';
      return '<article class="cw-collection-item"'+cardTip(entry,true)+'>'+picture(entry,true)+'<div><b>'+esc(entry.name)+'</b><small>'+itemDescription(entry)+'</small></div></article>';
    }).join('');
    return result(data.profile?.name || '','Collection',tabs+summary+(list?'<div class="cw-collection-items">'+list+'</div>':'<p class="cw-empty">No entries match this view.</p>'),button('close','Back'));
  }
  function targetCards(cards,d,action='target') {
    return cards.map(c=>{
      const isSelected = targets.includes(c.id);
      const disabled = !api().canTarget(d,c) || (!isSelected && targets.length>=d.maxTargets);
      return options.cardPreview(c,{action,selected:isSelected,disabled});
    }).join('');
  }
  function targetLabel(d) {
    if (d.effect==='rankCopy' || d.effect==='suitCopy') {
      const key = d.effect==='rankCopy' ? 'rank' : 'suit';
      const source = usableCards(state()).find(c=>c.id===targets[0]);
      if (!source) return 'Choose a card to set the '+key;
      return 'Copy '+(key==='rank' ? rank(source.rank) : suitNames[source.suit])+' to 1–'+(d.maxTargets-1)+' other cards';
    }
    const range = d.maxTargets===d.minTargets ? String(d.minTargets) : d.minTargets+'–'+d.maxTargets;
    return 'Choose '+range+' card'+(d.maxTargets===1?'':'s');
  }
  function targetsReady(d) { return targets.length>=d.minTargets && targets.length<=d.maxTargets; }
  function usableCards(s) { return s.pack?.hand || s.hand || []; }
  function spellView(s) {
    const index=Number(detail);
    const shopping=page==='shop-spell';
    const d=shopping?item(s.offers[index]):ownedItem(s,'consumables',index);
    const body='<p class="cw-explain">'+itemDescription(d)+'</p>'+(d.maxTargets?heading(targetLabel(d))+'<div class="pack-playing-cards">'+targetCards(usableCards(s),d)+'</div>':'');
    const label=shopping?'Buy & use '+cash(api().price(s,s.offers[index])):'Cast spell';
    const check=shopping?api().canBuyAndUse?.(s,index,targets):api().canUse?.(s,index,targets);
    return result('',d.name,body,button('close','Back')+button(shopping?'buy-use-cast':'cast',label,'cw-primary','',!targetsReady(d) || check===false));
  }
  function isSpell(d) { return d.kind==='spell' || d.kind==='spectral'; }
  function mayBuyAndUse(s,index,d) {
    if (!isSpell(d) || !api().buyAndUse || s.money < api().price(s,s.offers[index]) || usableCards(s).length < (d.minTargets || 0)) return false;
    return api().canBuyAndUse?.(s,index) ?? true;
  }
  function offer(d, control) {
    const family=global.CWContent.cardType(d);
    const rarity=d.rarity && ![family,'booster'].includes(d.rarity.toLowerCase())?'<div class="cw-item-type">'+esc(d.rarity)+'</div>':'';
    return '<article class="cw-offer"'+cardTip(d,true)+'>'+picture(d)+rarity+'<h3>'+esc(d.name)+'</h3>'+badges(d)+'<p>'+itemDescription(d)+'</p>'+control+'</article>';
  }
  function companionRail(s) {
    const cap=api().capacity(s).familiars;
    const slots=Array.from({length:cap},(_,i)=>{
      if (!s.familiars[i]) return '<span class="companion-empty" aria-hidden="true">✧</span>';
      const d=ownedItem(s,'familiars',i);
      return '<button type="button" class="companion-card" data-companion="'+i+'"'+cardTip(d)+' aria-expanded="false" aria-label="'+esc(d.name+'. '+d.description)+'">'+marketFamiliar(d)+'</button>';
    }).join('');
    return '<section class="companion-rail" aria-label="Equipped familiars"><div><h3>Familiars <small>'+s.familiars.length+' / '+cap+'</small></h3><div class="companion-slots">'+slots+'</div></div>'+marketPurse(s.money)+'</section>';
  }
  function marketInventory(s,cap) {
    const count=s.familiars.length;
    const total=Math.max(cap.familiars,count);
    const slots=Array.from({length:total},(_,i)=>{
      if (i>=count) return '<span class="moon-empty-slot" style="--slot:'+i+'" aria-hidden="true"><span>✧</span></span>';
      const d=ownedItem(s,'familiars',i);
      const tilt=count>1 ? (2*i/(count-1)-1)*Math.min(8,(count-1)*2) : 0;
      const pose='--slot:'+i+';--tilt:'+tilt.toFixed(2)+'deg;--drop:'+Math.abs(tilt).toFixed(2)+'px';
      return '<button type="button" class="companion-card moon-companion" style="'+pose+'" data-companion="'+i+'"'+cardTip(d)+' aria-expanded="false" aria-label="'+esc(d.name+'. '+d.description)+'">'+marketFamiliar(d)+'</button>';
    }).join('');
    const spellSlots=Array.from({length:Math.max(cap.consumables,s.consumables.length)},(_,i)=>{
      if (!s.consumables[i]) return '<span class="moon-spell-empty" aria-hidden="true"><svg viewBox="0 0 24 24">'+global.CWContent.cardTypes.spell[1]+'</svg></span>';
      const d=ownedItem(s,'consumables',i);
      return '<button type="button" class="moon-spell-card" aria-expanded="false" data-owned-category="consumables" data-slot="'+i+'"'+cardTip(d)+
        ' aria-label="'+esc('Inspect '+d.name)+'">'+picture(d,true)+'<span class="moon-spell-name">'+esc(d.name)+'</span></button>';
    }).join('');
    return '<section class="companion-rail moon-roost" aria-label="Shop inventory">'+
      '<div class="moon-roost-title"><h3>Your familiars</h3><small class="moon-capacity" aria-label="'+count+' of '+cap.familiars+' familiar slots occupied">'+count+' / '+cap.familiars+'</small></div>'+
      '<div class="companion-slots" style="--intervals:'+Math.max(1,total-1)+'">'+slots+'</div>'+
      '<div class="moon-spell-title"><h3>Your spells</h3><small>'+s.consumables.length+' / '+cap.consumables+' stored</small></div>'+
      '<div class="moon-spell-slots">'+spellSlots+'</div>'+marketPurse(s.money)+'</section>';
  }

  function marketPurse(money) {
    return '<div class="cw-purse roost-purse" aria-label="Coin purse"><strong class="stat-money">'+cash(money)+'</strong></div>';
  }

  function marketFamiliar(d) {
    const frame = global.CWFamiliarFrames;
    return '<span class="grimoire-card"'+(frame?.attribute(d) || '')+' data-rarity="'+esc(d.rarity || 'Common')+'">'+picture(d.bossMuted ? {...d,bossMuted:false} : d,true,null)+(frame?.ornament(d) || '')+'<span class="grimoire-name">'+esc(d.name)+'</span><i class="grimoire-jewel" aria-hidden="true"></i>'+(d.bossMuted?global.CWCardTip.cross:'')+'</span>';
  }
  function marketObject(d) {
    if (d.kind==='familiar') return marketFamiliar(d);
    const art=picture(d);
    if (d.kind==='pack') return '<div class="moon-parcel" data-family="'+packFamily(d)+'">'+art+'</div>';
    if (d.kind==='voucher') return '<div class="moon-warrant"><i>✧</i>'+art+'<i>✧</i></div>';
    return art;
  }

  function hasFreeReward(s) {
    return Boolean(s.rewardPacks?.length || (s.freeReroll && !s.rules.noReroll));
  }
  function rewardTicket(s,atExit=false) {
    const packs=s.rewardPacks || [];
    const reroll=s.freeReroll && !s.rules.noReroll;
    const sale=!atExit && s.shopDiscount<1;
    if (!packs.length && !reroll && !sale) return '';
    const pack=packs.length ? item(packs[0]) : null;
    const openPack=pack ? button('reward-pack','Open '+pack.name+' · FREE','moon-claim') : '';
    const rerollButton=reroll ? button('reroll','Reroll stock · FREE','moon-claim') : '';
    const queued=packs.length>1 ? '<small>+'+(packs.length-1)+' queued</small>' : '';
    const discount=sale ? '<strong>'+Math.round(100*(1-s.shopDiscount))+'% off all stock</strong>' : '';
    return '<section class="moon-reward-ticket" aria-label="Blind skip rewards"><h3><span aria-hidden="true">✦</span> Blind skip reward</h3>'+
      '<div>'+openPack+queued+rerollButton+discount+'</div></section>';
  }
  function leaveRewardsView(s) {
    const packs=s.rewardPacks?.length || 0;
    const detail=[];
    if (s.freeReroll && !s.rules.noReroll) detail.push('Your free reroll expires when you leave.');
    if (packs) detail.push(packs===1 ? 'Your unopened pack carries over to the next shop.' : 'Your unopened packs carry over to the next shop.');
    const body=rewardTicket(s,true)+'<p class="cw-explain">'+esc(detail.join(' '))+'</p>';
    return result('Moonlit Market','Leave with unused rewards?',body,
      button('close','Back to shop','cw-primary')+button('leave-anyway','Leave shop'));
  }
  function shopView(s) {
    const cap=api().capacity(s);
    function stockCard(i,slot,indices) {
      const id=s.offers[i];
      const d=item(id), price=api().price(s,id), ok=api().canBuy(s,i);
      const family=global.CWContent.cardType(d);
      const type={pack:d.kind==='pack' ? global.CWContent.cardTypes[packFamily(d)][0]+' pack' : 'Booster pack',voucher:'Run upgrade',card:'Playing card',spectral:'Spectral spell',constellation:'Constellation',familiar:'Familiar',spell:'Spell'}[family || d.kind] || d.kind;
      let reason='';
      if (!ok) {
        if (s.money<price) reason='Need '+cash(price-s.money)+' more';
        else if (d.kind==='familiar' && s.familiars.some(ref=>global.CWMarket.splitVariant(ref).id===global.CWMarket.splitVariant(id).id)) reason='Already equipped';
        else if (d.kind==='familiar' && s.familiars.length>=cap.familiars) reason='Roost full';
        else if (d.kind==='spell' && s.consumables.length>=cap.consumables) reason='Spell slots full';
        else reason='Unavailable';
      }
      const castable=mayBuyAndUse(s,i,d);
      const description=d.kind==='pack'
        ? d.description.replace(' of '+d.choices+' ', ' of '+(d.choices+global.CWMarket.voucherPower(s,'packOptions'))+' ')
        : d.description;
      const details=global.CWCardTip.details({...d,description},false).split('\n');
      details.splice(1,0,type+(d.kind==='familiar' && d.rarity?' · '+d.rarity:''));
      if (reason) details.push(reason);
      if (ok) details.push('Buy for '+cash(price));
      const tip=global.CWCardTip.attribute(details.join('\n'));
      const label=esc('Buy '+d.name+' for '+cash(price)+(reason?'. '+reason:''));
      const before=s.catSale && api().price(s,id,false);
      const oldPrice=before>price?'<del aria-hidden="true">'+cash(before)+'</del>':'';
      const priceTag='<span class="moon-price">'+oldPrice+'<span class="stat-money">'+cash(price)+'</span></span>';
      const buy='<button type="button" class="moon-purchase" '+(ok?'data-cw="buy"':'aria-disabled="true"')+' data-value="'+i+'" aria-label="'+label+'"'+tip+'>'+priceTag+'</button>';
      const cast=castable?'<button type="button" class="moon-cast" data-cw="inspect-cast" data-value="'+i+'" aria-label="'+esc('Buy and cast '+d.name+' for '+cash(price))+'">Buy &amp; cast</button>':'';
      const tilt=(slot-(indices.length-1)/2)*Math.min(3,14/Math.max(1,indices.length-1));
      const pose='--slot:'+slot+';--tilt:'+tilt.toFixed(2)+'deg;--drop:'+Math.abs(tilt).toFixed(2)+'px';
      return '<article class="moon-item" data-stock-type="'+esc(family || d.kind)+'" style="'+pose+'"><div class="moon-display">'+
        '<div class="moon-art" inert aria-hidden="true">'+marketObject(d)+'</div>'+buy+cast+'</div></article>';
    }
    const count=s.shopOfferCount ?? Math.max(0,s.offers.length-3);
    const shelf=(name,cls,indices,control='')=>{
      const available=indices.filter(i=>s.offers[i]);
      const goods=available.length?available.map(stockCard).join(''):'<div class="moon-sold">Sold out</div>';
      return '<section class="moon-shelf '+cls+'"><header><h3>'+name+'</h3>'+control+'</header><div class="moon-goods" style="--intervals:'+Math.max(0,available.length-1)+'">'+goods+'</div></section>';
    };
    const reroll=api().rerollPrice(s);
    const rerollControl=!s.rules?.noReroll?button('reroll','↻  Reroll '+(reroll?cash(reroll):'FREE'),'moon-reroll'+(reroll?'':' moon-free-roll'),'',s.money<reroll):'';
    const stock=shelf('Card counter','moon-stock',Array.from({length:count},(_,i)=>i),rerollControl);
    const packs=shelf('Booster packs','moon-packs',s.offers.slice(count,-1).map((_,i)=>count+i));
    const voucher=shelf('Voucher','moon-vouchers',[s.offers.length-1]);
    const rewards=rewardTicket(s);
    const footer=button('show-menu','Menu')+button('open','Deck','','deck')+button('open','Hand guide','','guide')+button('leave-shop','Next blind →','cw-primary moon-next');
    return result('Shop · Ante '+s.ante,'Moonlit Market',rewards+marketInventory(s,cap)+'<div class="moon-shelves">'+stock+packs+voucher+'</div>',footer);
  }
  let lastPack, dealStart;
  function packView(s) {
    if (lastPack !== s.pack) { lastPack=s.pack; dealStart=performance.now(); }
    const spread=s.pack.choices.filter(Boolean).length;
    const speed=options.getSettings?.()?.speed || 1;
    const elapsed=performance.now()-dealStart;
    let position=0;
    const cap=api().capacity(s);
    const hand=s.pack.hand || [];
    const active=detail===''?-1:Number(detail);
    const cards = s.pack.choices.map((id,i)=>{
      if (!id) return '';
      const d=item(id);
      const targeted=isSpell(d) && d.maxTargets>0;
      const fallback=d.kind==='familiar' && d.edition!=='negative' && s.familiars.length>=cap.familiars;
      const blocked=api().canPick ? !api().canPick(s,i) : fallback || (targeted && hand.length < (d.minTargets || 0));
      const action=targeted?'prepare-pack-spell':'pick';
      const label=blocked?'Unavailable':targeted?(active===i?'Selected':'Select spell'):isSpell(d)?'Cast':'Take';
      const offset=position++ - (spread-1)/2;
      const delay=(240+i*80)/speed-elapsed;
      return '<div class="pack-slot'+(active===i?' chosen':'')+'" style="--tilt:'+offset*2+'deg;--drop:'+Math.abs(offset)*5+'px;--from:'+(-offset*70)+'px;--delay:'+delay+'ms">'+offer(d,button(action,label,active===i?'cw-active':'cw-primary',i,blocked))+'</div>';
    }).join('');
    const d=active>=0?item(s.pack.choices[active]):null;
    const valid=d && targetsReady(d) && api().canPick?.(s,active,targets)!==false;
    const handCards=hand.map(card=>{
      const selected=targets.includes(card.id);
      const target=d && {selected, disabled:!api().canTarget(d,card) || (!selected && targets.length>=d.maxTargets)};
      return options.cardPreview(card,target);
    }).join('');
    const dealt=hand.length?'<div class="cw-pack-hand">'+heading(d?targetLabel(d):'Pack hand')+
      '<div class="pack-playing-cards">'+handCards+'</div>'+
      (d?button('pick-cast','Cast '+d.name,'cw-primary',active,!valid):'')+'</div>':'';
    const wrapper=elapsed<700/speed?'<div aria-hidden="true" class="pack-wrapper" style="--age:'+(-elapsed)+'ms;--duration:'+(650/speed)+'ms">'+picture(item(s.pack.id))+'</div>':'';
    const ownedCards=['familiars','consumables'].flatMap(category=>s[category].map((id,i)=>{
      const d=ownedItem(s,category,i);
      const mark=d.kind==='familiar' && d.edition==='negative'?' <small class="pack-negative-label">Negative +1</small>':'';
      return '<button type="button" data-owned-category="'+category+'" data-slot="'+i+'" aria-expanded="false"'+cardTip(d)+'>'+esc(d.name)+mark+'</button>';
    })).join('');
    const view=result('Booster pack',s.pack.name,'<div class="pack-spread">'+wrapper+cards+'</div>'+dealt,ownedCards+button('close-pack','Skip remaining'));
    view.headerEnd='<strong class="pack-remaining">'+num(s.pack.remaining)+(s.pack.remaining===1?' pick left':' picks left')+'</strong>';
    return view;
  }
  function tallySpoils(body) {
    const speed = options.getSettings?.()?.speed || 1;
    const total = body.querySelector('.spoils-total strong');
    let subtotal = 0;
    total.textContent = cash(0);
    body.querySelectorAll('.spoils-line').forEach((row,i) => {
      const delay = (70 + i*155) / speed;
      row.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],
        {duration:230/speed,delay,fill:'backwards'});
      setTimeout(() => {
        if (!total.isConnected) return;
        const value = Number(row.dataset.amount);
        subtotal += value;
        total.textContent = cash(subtotal);
        if (value) {
          options.playSound?.('coin',i);
          total.animate([{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:160/speed});
        }
      },delay);
    });
  }
  function victoryScore(s) {
    return '<div class="victory-score"><div><small>Round score</small><b>'+num(s.score)+'</b></div>'+
      '<div><small>Blind target</small><b>'+num(s.target)+'</b></div></div>';
  }
  function payoutView(s) {
    const p = s.payout;
    const row = (label,value) => '<li class="spoils-line" data-amount="'+Number(value)+'"><span>'+label+
      '</span><b>'+cash(value)+'</b></li>';
    const ledger = row('Blind bounty',p.blind) + row('Unused hands',p.hands) +
      (!s.rules?.noInterest || p.interest ? row('Interest',p.interest || 0) : '') + (p.bonus ? row('Bonus',p.bonus) : '');
    const body = '<h3 class="victory-label">Round winnings</h3>'+
      '<div class="spoils-total" aria-label="'+cash(p.total)+' earned"><strong class="stat-money" aria-hidden="true">'+cash(p.total)+
      '</strong></div><ul class="spoils-lines">'+ledger+'</ul>';
    const finalBlind = s.ante === s.rules?.anteLimit && s.blind === 2;
    const marketGifts=[];
    if (s.rewardPacks?.length) marketGifts.push(s.rewardPacks.length===1 ? 'a free '+item(s.rewardPacks[0]).name : s.rewardPacks.length+' free packs');
    if (s.freeReroll && !s.rules.noReroll) marketGifts.push('a free reroll');
    const waiting=!finalBlind && marketGifts.length ? '<p class="market-gift-note">Waiting at the shop &middot; '+esc(marketGifts.join(' and '))+'</p>' : '';
    const footer = '<div class="victory-purse"><span>Purse after collection</span><b>'+cash(s.money+p.total)+'</b></div>'+
      waiting+button('cash-out',finalBlind?'Collect & finish run':'Collect & visit shop','cw-primary');
    return {...result('Ante '+s.ante+'  /  Round '+s.round,api().blindInfo(s).name+' defeated',body,footer),victory:true};
  }
  function selectView(s) {
    const tickets=[0,1,2].map(i=>{
      const blind=api().blindInfo(s,i), active=i===s.blind;
      const receipt=s.skipReceipts?.[i];
      const phase=i<s.blind?(receipt?'Skipped':'Passed'):active?'Choose':'Upcoming';
      const seal='<img alt="" src="'+global.CWContent.portrait(['owl','grimoire','dragon'][i])+'">';
      const tagText=blind.tag?.description || blind.tag;
      const canSkip=i<2 && !s.rules?.noSkip;
      const tag=i<s.blind ? (receipt?'<small class="tag-bonus earned">'+esc(receipt)+'</small>':'') :
        canSkip && tagText?'<small class="tag-bonus">Skip bonus · '+esc(tagText)+'</small>':'';
      const reroll=i===2 && api().canRerollBoss?.(s)?button('reroll-boss','Reroll boss'+bossCost('bossRerollPrice',s)):'';
      const disable=i===2 && api().canDisableBoss?.(s)?button('disable-boss','Disable rule'+bossCost('bossDisablePrice',s)):'';
      const bossTools=reroll || disable?'<div class="cw-boss-tools">'+reroll+disable+'</div>':'';
      return '<article class="blind-ticket tier-'+i+(active?' current':'')+'"><header>'+esc(blind.kind)+'</header><div class="blind-stamp" aria-hidden="true"><i>'+seal+'</i></div><small class="trial-target" aria-label="Target">&#9678;</small><strong class="blind-goal" aria-label="Target '+num(blind.target)+' chips">'+num(blind.target)+'</strong><div class="blind-prize" aria-label="Reward '+cash(blind.reward)+'">'+cash(blind.reward)+'</div>'+(i===2?'<div class="boss-brief"><b>'+esc(blind.name)+'</b><small>'+esc(blind.description)+'</small></div>':'')+'<div class="blind-actions">'+(active?button('start-blind','Play blind','cw-primary'):'<b class="blind-state">'+phase+'</b>')+(active && canSkip?button('skip','Skip blind'):'')+tag+bossTools+'</div></article>';
    }).join('');
    return {...result('Choose your blind · Ante '+s.ante,'The Astral Trials',companionRail(s)+'<div class="blind-board">'+tickets+'</div>',''),headerEnd:button('show-menu','Menu')};
  }
  function bossCost(action,s) {
    const cost=api()[action]?.(s);
    return cost>0?' '+cash(cost):'';
  }
  function endView(s) {
    const won=s.phase==='won', challenge=api().CHALLENGES?.[s.challengeId];
    const last=s.lastScore;
    const faces=last?.finalCards || (last?.scoring || []).map(id=>s.deck.find(card=>card.id===id)).filter(Boolean);
    const fan=faces.map((c,i)=>{
      const angle=(i-(faces.length-1)/2)*14;
      return '<div class="verdict-leaf" style="--fan:'+angle+'deg;--order:'+i+'">'+options.cardPreview(c)+'</div>';
    }).join('');
    const crest='<div class="verdict-art" aria-hidden="true" inert><div class="verdict-halo"></div><i class="verdict-orbit"></i>'+
      '<div class="verdict-stars">✦ <i>✧</i> ✦</div><div class="verdict-hand">'+(fan || parlorCard('A',won?'☀':'☾','omen'))+'</div></div>';
    const blind=api().blindInfo(s).name;
    const outcome=won ? (challenge?challenge.name+' complete':blind+' defeated') : num(Math.max(0,s.target-s.score))+' chips short of '+blind;
    const summary='<div class="verdict-summary">'+(last?'<div class="last-cast">Final hand <strong>'+esc(last.name)+'</strong></div>':'')+
      '<p>'+esc(outcome)+'</p><div class="verdict-meter" aria-hidden="true"><i style="width:'+Math.min(100,100*s.score/Math.max(1,s.target))+'%"></i></div>'+
      '<div class="verdict-total"><b>'+num(s.score)+'</b> / '+num(s.target)+' chips</div></div>';
    const stats='<div class="verdict-stats">'+stat('Blinds won',num(s.stats.roundsWon))+
      stat(s.stats.bestHand?'Best hand · '+s.stats.bestHand:'Best hand',num(s.stats.bestScore))+stat('Final purse',cash(s.money))+'</div>';
    const actions=button('replay','Play Again','verdict-play')+button('show-menu','Main Menu')+
      (won && !s.challengeId?button('endless','Continue Endless','verdict-endless'):'');
    return result('Ante '+s.ante+'  /  Round '+s.round,won?'You won!':'You lost',crest+summary+stats,actions);
  }
  function resolveCast(s,d,action,index,ids) {
    const before=ids.map(id=>({...usableCards(s).find(c=>c.id===id)}));
    const deckSize=s.deck.length;
    const bag=[...s.familiars,...s.consumables.filter((_,i)=>action!=='use' || i!==index)];
    const levels={...s.levels};
    const balance=s.money-(action==='buyAndUse'?api().price(s,s.offers[index]):0);
    if (!api()[action](s,index,ids)) return false;
    const results=[];
    const push=(oldFace,newFace,label,style='turn')=>results.push({oldFace,newFace,label,style});
    const face=c=>'<div class="card-display">'+options.cardPreview(c)+'</div>';
    for (const old of before) {
      const card=s.deck.find(c=>c.id===old.id);
      if (!card) { push(face(old),'','Removed','burn'); continue; }
      if (d.effect==='copy') {
        for (const copy of s.deck.slice(deckSize)) push('',face(copy),'Copy added','copy');
        continue;
      }
      const changes=[];
      if (old.rank!==card.rank) changes.push(rank(old.rank)+' → '+rank(card.rank));
      if (old.suit!==card.suit) changes.push(suits[old.suit]+' → '+suits[card.suit]);
      for (const key of ['enhancement','edition','seal']) {
        if (old[key]===card[key]) continue;
        changes.push(card[key]?(key==='seal'?card[key]+' seal':card[key]):old[key]+' removed');
      }
      const sourceLabel = old.id===ids[0] && ({rankCopy:'Rank source',suitCopy:'Suit source'})[d.effect];
      push(face(old),face(card),changes.join(' · ') || sourceLabel || 'Unchanged',d.effect==='seal'?'stamp':'turn');
    }
    if (d.effect==='generate' || d.effect==='inventoryEdition') {
      for (const ref of [...s.familiars,...s.consumables]) {
        const i=bag.indexOf(ref);
        if (i>=0) { bag.splice(i,1); continue; }
        const reward=item(ref);
        push('',picture({...reward,upgradeAge:0}),reward.name+(d.effect==='inventoryEdition'?' · Negative':''),'copy');
      }
    }
    if (!results.length) {
      const gains=Object.keys(levels).filter(k=>levels[k]!==s.levels[k]).map(k=>k+' · Lv '+s.levels[k]);
      if (d.effect==='tally') gains.push('Cards now bank +'+num(s.tallyPerPlay)+' Chips per play');
      const label=gains.join(' / ') || (['money','cash'].includes(d.effect)?'+'+cash(s.money-balance):d.effect==='bossDisable'?'Boss ward active':'No new cards');
      push('',picture(d),label,'copy');
    }
    showCast(d,results);
    return true;
  }
  function showCast(d,results) {
    document.querySelector('.cast-reveal')?.remove();
    const el=document.createElement('aside');
    el.className='cast-reveal';
    el.dataset.family=global.CWContent.cardType(d);
    el.setAttribute('role','status');
    el.innerHTML='<strong>'+esc(d.name)+'</strong><div class="cast-results">'+results.map(r=>
      '<div class="cast-result '+r.style+'"><div class="cast-faces"><div class="cast-before">'+r.oldFace+'</div><div class="cast-after">'+r.newFace+'</div></div><b>'+esc(r.label)+'</b></div>'
    ).join('')+'</div>';
    global.CWContent.colorStats(el);
    document.body.append(el);
    setTimeout(()=>el.remove(),2700);
  }
  function act(name, value, control) {
    const s=state() || {};
    const index=Number(value);
    if(name==='close') return close();
    if(name==='deal-trick' && page==='lobby') return dealParlorTrick();
    if(name==='learn') { guideTab='rules'; return open('guide'); }
    if(name==='replay' && (s.phase==='won' || s.phase==='lost')) {
      backStack.length=0;
      return options.restart(s.deckId,undefined,s.stakeId,s.challengeId);
    }
    if(name==='open') return open(value);
    if(name==='guide-tab') { guideTab=value; return paint(false); }
    if(name==='deck-tab') { deckTab=value; return paint(false); }
    if(name==='collection-tab') { collectionTab=value; collectionFilter='all'; return paint(false); }
    if(name==='collection-filter') { collectionFilter=value; return paint(false); }
    if(name==='show-menu') {
      if (options.wantsLobby?.()) { backStack.length=0; return route('lobby'); }
      if (options.showMenu) { options.showMenu(); return sync(); }
      return open('lobby');
    }
    if(name==='continue-run') {
      backStack.length=0;
      if(options.continueRun) { options.continueRun(); sync(); }
      else route(readPhase(s));
      return;
    }
    if(name==='change-profile' || name==='create-profile') {
      const action=name==='change-profile'?'changeProfile':'createProfile';
      if (!options[action]?.(value.trim())) { announce('Choose a valid profile name or profile.'); return; }
      restartDeck='arcane';
      restartStake=restartChallenge=restartSeed=collectionTab='';
      collectionFilter='all';
      backStack.length=0;
      route('lobby');
      return;
    }
    if(name==='repeat-seed') {
      restartSeed=String(s.seed || '');
      paint(false);
      const field=layer.querySelector('#cw-run-seed');
      field.focus(); field.select();
      return;
    }
    if(name==='toggle-setting') {
      const current=options.getSettings?.() || {};
      options.setSetting?.(value,!current[value]); paint(false); return;
    }
    if(name==='restart') {
      const seed=restartSeed.trim();
      if (seed.length>seedLimit) { announce('Choose a seed of up to '+seedLimit+' characters.'); return; }
      const {deckId,stakeId,challengeId}=runChoices();
      if(options.restart?.(deckId,seed || undefined,stakeId,challengeId || undefined)===false) { announce('Choose an available run setup.'); return; }
      restartSeed='';
      backStack.length=0;
      sync();
      return;
    }
    if(name==='use-item') {
      const d=ownedItem(s,'consumables',index);
      const sourceRect=control?.getBoundingClientRect();
      if (d.maxTargets>0) return open('spell',String(index),sourceRect);
      if(resolveCast(s,d,'use',index,[])) changed('select',sourceRect);
      else announce('That spell is unavailable right now.');
      return;
    }
    if(name==='inspect-cast') {
      const art=control.closest('.moon-item')?.querySelector('.moon-art');
      return open('shop-spell',String(index),(art || control).getBoundingClientRect());
    }
    if(name==='buy-use') {
      const d=item(s.offers[index]);
      const sourceRect=(control?.closest('.moon-item')?.querySelector('.moon-art') || control)?.getBoundingClientRect();
      if (d.maxTargets>0) return open('shop-spell',String(index),sourceRect);
      if(resolveCast(s,d,'buyAndUse',index,[])) changed('buy',sourceRect);
      else announce('That spell is unavailable right now.');
      return;
    }
    if(name==='prepare-pack-spell') {
      detail=value;
      targets=[];
      paint(false);
      layer.querySelector('.cw-pack-hand button')?.focus();
      return;
    }
    if(name==='target' || name==='pack-target') {
      const card=usableCards(s).find(c=>String(c.id)===value);
      if(!card) return;
      targets=targets.includes(card.id)?targets.filter(id=>id!==card.id):[...targets,card.id];
      paint(false); return;
    }
    if(name==='cast' || name==='buy-use-cast') {
      const i=Number(detail), buying=name==='buy-use-cast';
      const d=buying?item(s.offers[i]):ownedItem(s,'consumables',i);
      const sourceRect=castSourceRect || control?.getBoundingClientRect();
      if(resolveCast(s,d,buying?'buyAndUse':'use',i,targets)) {
        close();
        message=d.name+' cast.';
        changed(buying?'buy':'select',sourceRect);
      }
      else announce('Choose valid cards for this spell.');
      return;
    }
    if(name==='pick' || name==='pick-cast') {
      const ids=name==='pick-cast'?targets:[];
      const choice=item(s.pack.choices[index]);
      const sourceRect=(control?.closest('.pack-slot') || layer.querySelector('.pack-slot.chosen') || control)?.getBoundingClientRect();
      if(!(isSpell(choice)?resolveCast(s,choice,'pick',index,ids):api().pick(s,index,ids))) { announce('Choose valid cards or make inventory space first.'); return; }
      detail='';
      targets=[];
      changed('buy',sourceRect);
      return;
    }
    if (name==='leave-shop' && hasFreeReward(s)) return open('leave-rewards');
    if (page==='leave-rewards' && (name==='reroll' || name==='reward-pack')) close();
    const commands={
      'buy':['buy',index],'close-pack':['closePack'],reroll:['reroll'],'reward-pack':['claimRewardPack'],
      'leave-shop':['leaveShop'],'leave-anyway':['leaveShop'],'cash-out':['cashOut'],'start-blind':['startBlind'],skip:['skipBlind'],
      'sell-familiar':['sell',index],'sell-consumable':['sellConsumable',index],
      'move-left':['reorder',index,index-1],'move-right':['reorder',index,index+1],endless:['endless'],
      'reroll-boss':['rerollBoss'],'disable-boss':['disableBoss']
    };
    if(commands[name]) perform(control?.getBoundingClientRect(),...commands[name]);
  }
  global.CWP={configure,open,close,sync,toggleSell,dismissSell,isOpen:()=>!!page,getPage:()=>page};
})(window);
