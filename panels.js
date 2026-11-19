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
  let styleTab = 'backs';
  let targets = [];
  let castSourceRect;
  let casting = false;
  let restartDeck = '';
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
    if (s?.playtest && s.phase !== 'play') return 'playtest-end';
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
  const mobile = global.CWCardTip.mobile;
  let preview;
  function dismissPreview() {
    if (preview?.open) preview.close();
    preview?.remove();
    preview = null;
  }
  function inspect(control, actions = [], {text = control.dataset.cardTip, type = '', reason = ''} = {}) {
    if (!text || casting) return;
    dismissPreview();
    const [name,...effects] = text.split('\n');
    const popup = document.createElement('dialog');
    popup.className = 'moon-preview';
    popup.setAttribute('aria-labelledby','item-preview-name');
    popup.innerHTML = '<div class="moon-preview-body"><button type="button" class="cw-x moon-preview-close" aria-label="Close item details">&times;</button>'+
      (type ? '<small>'+esc(type)+'</small>' : '')+'<h3 id="item-preview-name">'+esc(name)+'</h3>'+
      effects.map(line=>'<p>'+esc(line)+'</p>').join('')+(reason ? '<p class="moon-preview-reason">'+esc(reason)+'</p>' : '')+
      (actions.length ? '<div class="moon-preview-actions">'+actions.map((a,i)=>
        '<button type="button" class="cw-btn'+(i===0?' cw-primary':'')+'" data-preview-action="'+i+'"'+(a.disabled?' disabled':'')+'>'+esc(a.label)+'</button>'
      ).join('')+'</div>' : '')+'</div>';
    popup.addEventListener('click', event=>{
      event.stopPropagation();
      const button = event.target.closest('button');
      if (event.target !== popup && !button) return;
      const action = button && actions[button.dataset.previewAction];
      if (button?.disabled) return;
      dismissPreview();
      if (control.isConnected) action?.run();
    });
    popup.addEventListener('close',()=>{ if (preview===popup) dismissPreview(); },{once:true});
    (control.closest('.cw-dialog') || document.body).append(popup);
    global.CWContent.colorStats(popup);
    preview = popup;
    popup.showModal();
  }
  function inspectSelection(control,select,disabled=false) {
    const selected = control.getAttribute('aria-pressed') === 'true';
    inspect(control,[{label:selected?'Deselect card':'Select card',disabled,run:select}]);
  }
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
    if (casting) return;
    const alreadyOpen = sellAnchor === card;
    dismissSell();
    if (alreadyOpen) return;
    const s = state(), id = s[category][index];
    if (!id) return;
    const entry = ownedItem(s,category,index);
    const canSell=api().canSell(s,category,index);
    const sale={
      label:canSell?'Sell '+cash(api().sellPrice(s,id)):entry.sticker==='eternal'?'Eternal':'Sale unavailable',
      disabled:!canSell, run:()=>perform(card.getBoundingClientRect(),category==='familiars'?'sell':'sellConsumable',index)
    };
    const actions=[sale];
    if (category==='consumables') {
      const ids=page==='pack' && entry.maxTargets ? targets : undefined;
      const use={label:'Use',disabled:!api().canUse(s,index,ids),run:()=>act('use-item',String(index),card)};
      if (mobile) actions.unshift(use);
      else actions.push(use);
    }
    if (mobile) return inspect(card,actions);
    sellAnchor = card;
    card.setAttribute('aria-expanded','true');
    sellTab = document.createElement('div');
    sellTab.className = 'owned-action-tab';
    if (typeof sellTab.showPopover === 'function') sellTab.popover = 'manual';
    for (const {label,disabled,run} of actions) {
      const button=document.createElement('button');
      button.type='button';
      button.className='familiar-sell-tab';
      button.disabled=disabled;
      button.textContent=label;
      button.setAttribute('aria-label',label+' '+entry.name);
      button.addEventListener('click',event=>{
        event.stopPropagation();
        dismissSell();
        if (card.isConnected && state()===s && s[category][index]===id) run();
      });
      sellTab.append(button);
    }
    card.after(sellTab);
    global.CWContent.colorStats(sellTab);
    if (typeof sellTab.showPopover === 'function') {
      try { sellTab.showPopover(); } catch { sellTab.classList.add('is-open'); }
    } else {
      sellTab.classList.add('is-open');
    }
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
    return global.CWCardTip.attribute(global.CWCardTip.details(card,muted,descriptionVisible && !mobile));
  }
  function picture(d, compact = false, {frame = global.CWFamiliarFrames, includeFinish = true} = {}) {
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
    const finish = includeFinish ? global.CWContent.cardFinish(d,d.upgradeAge) : '';
    return '<div class="' + css + edition + '"' + (frame?.attribute(d) || '') + ' data-family="'+type+'" style="--item-color:' + accent + '">' + content + (frame?.ornament(d) || '') + finish + global.CWContent.typeBadge(type,compact) + (d.bossMuted?global.CWCardTip.cross:'') + '</div>';
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
    layer.innerHTML = '<section class="cw-dialog" role="dialog" aria-modal="true" aria-labelledby="cw-panel-title" tabindex="-1"><header class="cw-head"></header><div class="cw-message" aria-live="polite"></div><div class="cw-familiar-announcement visually-hidden" aria-live="polite" aria-atomic="true"></div><div class="cw-body"></div><footer class="cw-footer"></footer></section>';
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
    let swipe, targetHold = null, suppressTargetClick = false;
    const clearTargetHold = () => { if (targetHold) { clearTimeout(targetHold.timer); targetHold = null; } };
    layer.addEventListener('contextmenu', event => {
      if (mobile && event.target.closest('[data-cw="target"],[data-cw="pack-target"]')) event.preventDefault();
    });
    layer.addEventListener('pointerdown', event => {
      suppressTargetClick = false;
      clearTargetHold();
      const targetCard = (mobile || event.pointerType === 'touch') && event.isPrimary && event.button === 0
        ? event.target.closest('[data-cw="target"],[data-cw="pack-target"]') : null;
      if (targetCard) {
        const id = event.pointerId, x = event.clientX, y = event.clientY;
        targetHold = {id, x, y, timer: setTimeout(() => {
          targetHold = null;
          if (!targetCard.isConnected || casting) return;
          suppressTargetClick = true;
          const action = targetCard.dataset.cw;
          inspectSelection(targetCard, () => act(action, targetCard.dataset.value ?? '', targetCard), targetCard.disabled);
        }, 450)};
      }
      const card = event.target.closest('.deck-slide');
      if (!card || card.dataset.fixed || !event.isPrimary || event.button !== 0) return;
      swipe = {id:event.pointerId, x:event.clientX, y:event.clientY};
      card.setPointerCapture(event.pointerId);
    });
    layer.addEventListener('pointermove', event => {
      if (targetHold && targetHold.id === event.pointerId && Math.hypot(event.clientX - targetHold.x, event.clientY - targetHold.y) >= 6) {
        clearTargetHold();
      }
    });
    layer.addEventListener('pointerup', event => {
      if (targetHold && targetHold.id === event.pointerId) clearTargetHold();
      if (swipe?.id !== event.pointerId) return;
      const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) >= 36 && Math.abs(dx) > Math.abs(dy) * 1.3) stepDeck(dx < 0 ? 1 : -1);
    });
    layer.addEventListener('pointercancel', clearTargetHold);
    layer.addEventListener('lostpointercapture', () => { swipe = null; clearTargetHold(); });
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
      if (mobile) {
        const offer=e.target.closest('.cw-offer');
        if (offer && page==='pack') return inspectPackChoice(offer);
        const action=b?.dataset.cw;
        const activate=()=>act(action,b.dataset.value ?? '',b);
        if (action==='target' || action==='pack-target') {
          if (suppressTargetClick) { suppressTargetClick = false; return; }
          if (!b.disabled) return activate();
          return;
        }
        if (b?.matches('.practice-choice')) return inspect(b,[{label:'Start playtest',run:activate}]);
        if (action==='reward-pack') {
          const s=state(), pack=item(s.rewardPacks[0]);
          return inspect(b,[{label:'Open free pack',run:activate}],{text:global.CWCardTip.details({...pack,description:packDescription(s,pack)})});
        }
        const entry=e.target.closest('[data-card-tip]');
        if (!b && entry) return inspect(entry);
      }
      if (b && !b.disabled) act(b.dataset.cw, b.dataset.value ?? '', b);
    });
    document.addEventListener('keydown', event => {
      if (preview?.open) {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopImmediatePropagation();
          dismissPreview();
        }
        return;
      }
      if (!page) return;
      if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
          (page === 'lobby' || page === 'restart') && !event.altKey && !event.metaKey && !event.ctrlKey &&
          (document.activeElement === dialog() || event.target.closest('.deck-carousel'))) {
        event.preventDefault();
        stepDeck(event.key === 'ArrowRight' ? 1 : -1);
      } else if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation();
        if (isDismissible()) close();
      } else if (event.key === 'Tab') {
        const buttons = [...layer.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')].filter(el=>el.getClientRects().length);
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
    dismissPreview();
    const wasOpen = !!page;
    if(wasOpen && page!==next){
      dialog()?.querySelector('.familiar-proc-witnesses')?.remove();
      const announcement=dialog()?.querySelector('.cw-familiar-announcement');
      if(announcement)announcement.textContent='';
      global.CWFamiliarScoreFX?.clear();
    }
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
    if (casting) return;
    const s = state();
    const names = {codex:'guide',info:'run',options:'settings'};
    next = names[next] || next;
    if (!['menu','guide','deck','run','settings','restart','spell','shop-spell','leave-rewards','lobby','career','collection','profiles','playtest','card-styles','style-preview'].includes(next)) return;
    if (!s && !['menu','lobby','settings','restart','career','collection','profiles','card-styles','style-preview'].includes(next)) return;
    if (page === next && value === detail) return;
    if (page !== next && page) backStack.push([page,detail]);
    if (next === 'restart') {
      restartChallenge = '';
      restartSeed = '';
    }
    if (next === 'spell') {
      const d = ownedItem(s,'consumables',Number(value));
      targets = (options.getSelection?.(d) || []).filter(id=>usableCards(s).some(c=>c.id===id));
    }
    if (next === 'shop-spell') targets = [];
    if (next === 'shop-spell' || next === 'spell') castSourceRect = sourceRect;
    route(next, value);
  }
  function close() {
    if (casting) return;
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
    if (casting) return;
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
    dismissPreview();
    dismissSell();
    if (!page) return;
    const s = state() || {};
    const body = layer.querySelector('.cw-body');
    const priorScroll = reset ? 0 : body.scrollTop;
    const spreadScroll = !reset && body.querySelector('.pack-spread')?.scrollLeft;
    const handScroll = !reset && layer.querySelector('.spell-hand-scroll')?.scrollLeft;
    const focused = !reset && layer.contains(document.activeElement) && document.activeElement.dataset.cw ? {action:document.activeElement.dataset.cw,value:document.activeElement.dataset.value} : null;
    const focusedId = !reset && layer.contains(document.activeElement) && document.activeElement.id;
    const openSections = !reset && (page === 'restart' || page === 'career') ? [...body.querySelectorAll('details[open]')].map(section=>section.id) : [];
    const selection = !reset && document.activeElement?.tagName === 'INPUT' ? [document.activeElement.selectionStart,document.activeElement.selectionEnd] : null;
    const views = {menu:menuView,guide:guideView,deck:deckView,run:runView,settings:settingsView,restart:restartView,spell:spellView,'shop-spell':spellView,'leave-rewards':leaveRewardsView,shop:shopView,pack:packView,payout:payoutView,select:selectView,won:endView,lost:endView,lobby:lobbyView,career:careerView,collection:collectionView,profiles:profilesView};
    views['card-styles'] = cardStylesView;
    views['style-preview'] = stylePreviewView;
    views.playtest = playtestView;
    views['playtest-end'] = playtestEndView;
    const view = views[page]?.(s);
    if (!view) return;
    dialog().dataset.page = page;
    dialog().classList.toggle('casting-pack', Boolean(view.castingPack));
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
    if (page === 'lobby') global.CWParlorCat?.mount(body);
    for (const id of openSections) {
      const section = document.getElementById(id);
      if (section) section.open = true;
    }
    global.CWContent?.colorStats?.(body);
    if(page==='payout' && reset && !options.getSettings?.()?.reducedMotion && body.animate) tallySpoils(body);
    layer.querySelector('.cw-footer').innerHTML = view.footer;
    global.CWContent.colorStats(layer.querySelector('.cw-footer'));
    global.CWContent.colorStats(layer.querySelector('.cw-message'));
    if (layer.querySelector('.pack-playing-cards')) refreshSpellHand(s);
    if (spreadScroll) body.querySelector('.pack-spread')?.scrollTo(spreadScroll,0);
    if (handScroll) layer.querySelector('.spell-hand-scroll')?.scrollTo(handScroll,0);
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
    const inBlind = s.phase === 'play';
    const remaining = inBlind && deckTab === 'draw' ? new Set(s.draw.map(c=>c.id)) : null;
    const fullLabel = 'Full deck · '+s.deck.length;
    const controls = inBlind
      ? tab('deck-tab','draw','Draw pile · '+s.draw.length,deckTab) + tab('deck-tab','all',fullLabel,deckTab)
      : '<strong>'+fullLabel+'</strong>';
    const legend = remaining && remaining.size < s.deck.length ? '<span class="cw-deck-key">Dimmed = already drawn</span>' : '';
    const rows = suitOrder.map(suit => {
      const cards = s.deck.filter(c=>c.suit===suit).sort((a,b)=>b.rank-a.rank);
      const count = remaining ? cards.filter(c=>remaining.has(c.id)).length : cards.length;
      const faces = cards.map((c,i)=>{
        const drawn = remaining && !remaining.has(c.id);
        const slot = drawn ? 'class="cw-deck-slot cw-drawn" aria-label="Already drawn"' : 'class="cw-deck-slot"';
        return '<li '+slot+'>'+options.cardPreview(c,null,{index:i,total:cards.length})+'</li>';
      }).join('');
      return '<section class="cw-deck-row" aria-label="'+suitNames[suit]+'"><div class="cw-deck-count'+red(suit)+'" aria-hidden="true">'+
        '<span>'+suits[suit]+'</span><b>'+count+'</b></div><ul class="cw-deck-cards" aria-label="'+count+' '+suitNames[suit]+(remaining?' remaining':'')+'">'+faces+'</ul></section>';
    }).join('');
    return result('Deck inspection','Your deck','<div class="cw-tabs cw-deck-tabs">'+controls+legend+'</div><div class="cw-deck-rows">'+rows+'</div>');
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
    const {DECKS:decks, STAKES:stakes, CHALLENGES:challenges} = api();
    const profile = progress(), unlocked = profile.unlocked;
    const deckIds = Object.keys(decks), stakeIds = Object.keys(stakes);
    const challengeId = page === 'restart' && unlocked.challenges.includes(restartChallenge) ? restartChallenge : '';
    const challenge = challenges[challengeId];
    const lastDeck = resumable() && state()?.deckId;
    const wonDeck = deckIds.find(id => profile.stats.deckWins[id] > 0);
    const deckId = challenge?.deck || restartDeck || lastDeck || wonDeck || deckIds[0];
    const wins = profile.stats.deckStakeWins[deckId] || {};
    const available = stakeIds.filter(id => unlocked.stakes.includes(id));
    const preferred = profile.deckDifficulties?.[deckId];
    const stakeId = challenge?.stake || (available.includes(preferred) ? preferred :
      available.find(id => !wins[id]) || available.at(-1));
    const locked = !challenge && !unlocked.decks.includes(deckId);
    return {decks, stakes, challenges, deckIds, stakeIds, deckId, stakeId, challengeId, challenge, wins, profile, locked};
  }

  function stepDeck(direction) {
    const {deckIds, deckId, challenge} = runChoices();
    if (challenge?.deck) return;
    restartDeck = deckIds[(deckIds.indexOf(deckId) + direction + deckIds.length) % deckIds.length];
    paint(false);
    const slide = layer.querySelector('.deck-slide');
    if (slide?.animate && !options.getSettings?.()?.reducedMotion && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      slide.animate([{transform:'translateX('+direction*12+'px)',opacity:.5},{transform:'none',opacity:1}],{duration:170,easing:'ease-out'});
    }
    layer.querySelector('.cw-familiar-announcement').textContent = slide.innerText;
  }

  function deckCarousel(choices) {
    const {decks, deckId, deckIds, stakes, stakeIds, wins, profile, locked, challenge} = choices;
    const deck = decks[deckId];
    const fixed = Boolean(challenge?.deck);
    const cleared = stakeIds.filter(id => wins[id] > 0);
    const emblem = ({arcane:'grimoire',alchemist:'potion',oracle:'orb'})[deckId] ||
      (deck.starter?.length ? item(deck.starter[0]).art : 'owl');
    const art = '<div class="run-deck-art" data-deck="'+esc(deckId)+'" aria-hidden="true"><i></i><i></i><i><img draggable="false" src="' +
      esc(global.CWContent.portrait(emblem)) + '" alt=""></i></div>';
    const record = cleared.length ? '<span class="record-label">Cleared</span>' +
      cleared.map(id => '<span class="cleared-stake"><i aria-hidden="true">&#10003;</i> '+esc(stakes[id].name)+'</span>').join('') :
      (profile.stats.deckWins[deckId] > 0 ? num(profile.stats.deckWins[deckId])+' '+(profile.stats.deckWins[deckId]===1?'win':'wins')+' &middot; Difficulty unrecorded' : 'No campaign wins yet');
    const position = deckIds.indexOf(deckId) + 1;
    const arrow = (step,label) => '<button type="button" class="deck-arrow" data-cw="step-deck" data-value="'+step+
      '" aria-label="'+label+' deck"'+(fixed?' disabled':'')+'><i aria-hidden="true"></i></button>';
    return '<section class="deck-carousel" aria-label="Deck record">'+arrow(-1,'Previous')+
      '<div class="deck-slide"'+(fixed?' data-fixed="true"':'')+'>'+art+'<div class="deck-caption">'+
      '<div class="deck-folio">'+(fixed?'Challenge deck':'Deck')+' <span>'+position+' / '+deckIds.length+'</span></div>'+
      '<h3>'+esc(deck.name)+'</h3><div class="deck-record">'+(locked?'<b>Locked</b> '+esc(profile.unlockHints[deckId]):record)+
      '</div></div></div>'+arrow(1,'Next')+'</section>';
  }

  function difficultyPicker(choices) {
    const {stakes, stakeIds, stakeId, wins, profile, locked, challenge} = choices;
    const buttons = stakeIds.map(id => {
      const selected = id === stakeId;
      const available = !locked && (challenge ? selected : profile.unlocked.stakes.includes(id));
      const cleared = wins[id] > 0;
      const status = cleared ? 'Cleared' : available ? 'Open' : 'Locked';
      const hint = challenge ? 'Difficulty set by '+challenge.name : locked ? profile.unlockHints[choices.deckId] : profile.unlockHints[id];
      return '<button type="button" class="difficulty-chip" data-cw="pick-stake" data-value="'+esc(id)+'" aria-pressed="'+
        (selected && !locked)+'"'+(!available || challenge?' disabled':'')+' title="'+esc(hint || stakes[id].description)+'">'+
        '<b>'+esc(stakes[id].name)+'</b><small>'+(cleared?'&#10003; ':'')+status+'</small></button>';
    }).join('');
    return '<fieldset class="deck-difficulties"><legend>Difficulty</legend><div>'+buttons+'</div></fieldset>'+
      (locked?'':'<p class="stake-rule"><b>'+esc(stakes[stakeId].name)+'</b> &middot; '+esc(stakes[stakeId].description)+'</p>');
  }

  function startForm(s, choices) {
    const {decks, deckId, profile, challenges, challengeId, challenge} = choices;
    const deck = decks[deckId];
    const starters = api().startingFamiliars(deck,profile.unlocked.familiars,challenge);
    const companions = starters.map(id => {
      const d = item(id);
      return '<span><img'+global.CWFamiliarFrames.rarityAttribute(d)+' alt="" src="'+esc(global.CWContent.portrait(d.art))+'">'+esc(d.name)+'</span>';
    }).join('');
    const trialOptions = Object.entries(challenges).map(([id,d]) => {
      const locked = !profile.unlocked.challenges.includes(id);
      return '<option value="'+esc(id)+'"'+(id===challengeId?' selected':'')+(locked?' disabled':'')+'>'+
        esc(d.name)+(locked?' &middot; Locked':'')+'</option>';
    }).join('');
    const trial = '<div class="cw-run-field"><label for="cw-run-challenge">Challenge</label>'+
      '<select id="cw-run-challenge" class="cw-select" data-select="challenge"><option value="">Standard run</option>'+trialOptions+'</select></div>';
    const seed = '<div class="cw-seed-form"><label for="cw-run-seed">Practice seed <small>Optional</small></label><div><input id="cw-run-seed" type="text" maxlength="'+seedLimit+'" autocomplete="off" autocapitalize="off" spellcheck="false" value="'+esc(restartSeed)+'" placeholder="Random seed">'+(resumable() && s.seed?button('repeat-seed','Reuse seed'):'')+'</div></div>';
    return '<form id="cw-new-run">'+deckCarousel(choices)+'<p class="deck-description">'+esc(challenge?.description || deck.description)+'</p>'+
      '<div class="deck-companions"><small>Starting familiar'+(starters.length>1?'s':'')+'</small>'+(companions || '<span>None</span>')+'</div>'+
      difficultyPicker(choices)+'<details class="run-options" id="run-options"><summary>Run options <small>'+
      esc(challenge?.name || '')+'<span class="seed-indicator"'+(restartSeed.trim()?'':' hidden')+'>Seeded practice</span></small></summary>'+
      '<div class="run-settings">'+trial+seed+'</div></details></form>';
  }
  function restartView(s) {
    const choices = runChoices();
    const start = '<button class="cw-btn cw-primary" type="submit" form="cw-new-run"'+(choices.locked?' disabled':'')+'>'+
      (choices.locked?'Deck locked':'Start run')+'</button>';
    return result('','Choose your deck',startForm(s,choices)+(resumable() && !['won','lost'].includes(s.phase)?'<p class="cw-explain">Starting a new run replaces your active run.</p>':''),button('close','Back')+start);
  }
  function parlorCard(rank,suit,extra='') {
    return '<i class="parlor-card '+extra+'"><b>'+rank+'</b><span>'+suit+'</span><small>'+suit+'</small></i>';
  }
  function parlorScene() {
    return '<div class="parlor-scene"><div class="parlor-painting">'+
      '<span class="parlor-lantern" aria-hidden="true"></span>'+
      '<button type="button" class="dealer-window" data-cw="deal-trick" aria-label="Ask the market cat to deal a poker hand"><canvas class="dealer-cat-canvas" width="420" height="320" aria-hidden="true"></canvas></button>'+
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
    global.CWParlorCat?.react();
    options.playSound?.('select');
  }
  function lobbyView(s) {
    const saved=resumable(), live=saved && !['won','lost'].includes(s.phase);
    const choices=runChoices();
    const main=live ? button('continue-run','Resume Run','parlor-play') : button('open','Play','parlor-play','restart');
    const secondary=live ? button('open','New Run','parlor-secondary','restart') :
      saved ? button('continue-run','Last Result','parlor-secondary') : '';
    const decksWon=choices.deckIds.filter(id=>choices.profile.stats.deckWins[id]>0).length;
    const links='<nav class="parlor-links" aria-label="Main menu">'+
      button('open',decksWon+' / '+choices.deckIds.length+' decks won','','career')+button('open','Card styles','','card-styles')+button('learn','How to play')+button('open','Menu','','menu')+'</nav>';
    const resumeDetail=live?'<p class="resume-detail">In progress &middot; '+esc(choices.decks[s.deckId].name)+
      ' &middot; '+esc(choices.stakes[s.stakeId].name)+'</p>':'';
    const title='<div class="parlor-hero"><h1 class="parlor-logo"><em>Card</em> <strong>Wizard</strong></h1>'+
      deckCarousel(choices)+'<div class="parlor-actions">'+main+secondary+button('open','Playtest','parlor-secondary','playtest')+'</div>'+resumeDetail+links+'</div>';
    return result('','Card Wizard',title+parlorScene());
  }
  function playtestView() {
    const cards = Object.keys(global.CWPlaytest.deals).map(id => {
      const familiar = item(id);
      return '<button type="button" class="practice-choice" data-cw="start-practice" data-value="'+id+'"'+(mobile?cardTip(familiar)+' aria-haspopup="dialog"':'')+'>'+
        '<img'+global.CWFamiliarFrames.rarityAttribute(familiar)+' alt="" src="'+esc(global.CWContent.portrait(familiar.art))+'"><span><strong>'+esc(familiar.name)+'</strong>'+
        '<small>'+esc(familiar.description)+'</small></span></button>';
    }).join('');
    return result('Practice table','Familiar playtest','<p class="practice-note">Choose a familiar for a preset deal. Your run stays saved.</p>'+
      '<div class="practice-choices">'+cards+'</div>');
  }
  function playtestEndView(s) {
    const used = s.stats.itemUses?.[s.playtest];
    const summary = used ? global.CWPlaytest.deals[s.playtest].done : 'Retry the deal to try '+item(s.playtest).name+'\'s suggested play.';
    const score = s.lastScore ? stat(s.lastScore.name,num(s.lastScore.total)+' chips') : '';
    return result('Familiar playtest',s.phase === 'payout' ? 'Blind cleared' : 'Deal complete',
      score+'<p class="practice-note">'+esc(summary)+'</p>',
      button('start-practice','Retry deal','cw-primary',s.playtest)+button('open','Switch familiar','','playtest')+button('show-menu','Exit playtest'));
  }
  function cardStylesView() {
    const data=progress(), isSets=styleTab==='sets';
    const items=isSets?(data.cardSets || []):(data.cardStyles || []);
    const equipped=isSets?(data.equippedCardSet || 'classic'):(data.equippedCardStyle || 'classic');
    const preview=items.find(s=>s.id===detail) || items.find(s=>s.id===equipped) || items[0];
    const picture=item=>esc(global.CWContent.portrait(item.art));
    const tabs='<div class="cw-tabs style-tabs">'+
      tab('style-tab','backs','Card backs · '+(data.cardStyles || []).filter(s=>s.earned).length+'/'+(data.cardStyles || []).length,styleTab)+
      tab('style-tab','sets','Card sets · '+(data.cardSets || []).filter(s=>s.earned).length+'/'+(data.cardSets || []).length,styleTab)+
      '</div>';
    const tiles=items.map(item=>{
      const selected=item.id===preview.id, worn=item.id===equipped;
      const status=worn?'Equipped':item.earned?'Unlocked':'Locked';
      const previewKey=(isSets?'set:':'back:')+item.id;
      return '<div class="style-swatch-wrap"><button type="button" class="style-swatch" data-cw="preview-style" data-value="'+item.id+
        '" aria-pressed="'+selected+'" aria-label="'+esc(item.name+', '+status)+'" title="'+esc(item.name+', '+status)+'">'+
        '<img alt="" src="'+picture(item)+'">'+(worn?'<span aria-hidden="true">&#10003;</span>':'')+'</button>'+
        '<button type="button" class="swatch-preview-btn" data-cw="preview-deck" data-value="'+esc(previewKey)+'" aria-label="Preview full deck with '+esc(item.name)+'">Preview</button></div>';
    }).join('');
    const worn=preview.id===equipped;
    const equipAction=isSets?'equip-set':'equip-style';
    const previewKey=(isSets?'set:':'back:')+preview.id;
    const action='<div class="style-actions">'+
      button(equipAction,worn?'Equipped':preview.earned?(isSets?'Equip card set':'Equip card back'):'Locked','cw-primary',preview.id,worn || !preview.earned)+
      button('preview-deck','Preview full deck','',previewKey)+'</div>';
    const hero='<figure class="style-print"><img alt="'+esc(preview.name+(isSets?' card set illustration':' card illustration'))+'" src="'+picture(preview)+'"></figure>';
    const tagline=preview.tagline?'<p class="style-tagline">'+esc(preview.tagline)+'</p>':'';
    const goal='<p class="style-goal"><strong>'+esc(preview.achievementName || 'Achievement')+':</strong> '+esc(preview.goal)+'</p>';
    const controls='<section class="style-options"><div class="style-titles"><h3>'+esc(preview.name)+'</h3>'+
      tagline+goal+'</div>'+action+'<div class="style-picks"><p>'+items.filter(s=>s.earned).length+
      ' / '+items.length+' unlocked</p><div class="style-swatches" role="group" aria-label="Preview a '+(isSets?'card set':'card back')+'">'+tiles+'</div></div></section>';
    const footer=button('close','Back')+button(equipAction,isSets?'Use classic faces':'Use classic backs','','classic',equipped==='classic');
    return result('','Card styles',tabs+'<div class="style-gallery">'+hero+controls+'</div>',footer);
  }
  function stylePreviewView() {
    const data=progress();
    const isSet=String(detail || '').startsWith('set:');
    const id=String(detail || '').replace(/^(?:set|back):/,'');
    const items=isSet?(data.cardSets || []):(data.cardStyles || []);
    const item=items.find(entry=>entry.id===id) || items[0];
    if(!item) return cardStylesView();
    const equipped=isSet?(data.equippedCardSet || 'classic'):(data.equippedCardStyle || 'classic');
    const worn=item.id===equipped;
    const equipAction=isSet?'equip-set':'equip-style';
    const artUrl=global.CWContent.portrait(item.art);
    const theme=isSet?{cardStyle:null,cardSet:item}:{cardStyle:item,cardSet:null};
    const scopeAttrs=isSet
      ? 'data-card-set="'+esc(item.id)+'" style="--card-set-ink:'+esc(item.color)+';--card-set-art:url(&quot;'+esc(artUrl)+'&quot;)"'
      : 'data-card-style="'+esc(item.id)+'" data-card-set="classic" style="--card-style-ink:'+esc(item.color)+';--card-style-art:url(&quot;'+esc(artUrl)+'&quot;)"';
    const ranks=[14,13,12,11,10,9,8,7,6,5,4,3,2];
    const rows=suitOrder.map(suit=>{
      const faces=ranks.map((rank,i)=>{
        const card={id:'preview_'+suit+'_'+rank,rank,suit};
        return '<li class="cw-deck-slot">'+options.cardPreview(card,null,{index:i,total:ranks.length,theme})+'</li>';
      }).join('');
      return '<section class="cw-deck-row" aria-label="'+suitNames[suit]+'"><div class="cw-deck-count'+red(suit)+'" aria-hidden="true">'+
        '<span>'+suits[suit]+'</span><b>13</b></div><ul class="cw-deck-cards" aria-label="13 '+suitNames[suit]+'">'+faces+'</ul></section>';
    }).join('');
    const banner='<div class="style-preview-banner"><img class="style-preview-thumb" alt="'+esc(item.name)+'" src="'+esc(artUrl)+'"><div>'+
      (item.tagline?'<p class="style-tagline">'+esc(item.tagline)+'</p>':'')+
      '<p class="style-goal"><strong>'+esc(item.achievementName || 'Achievement')+':</strong> '+esc(item.goal)+'</p>'+
      '<p class="style-preview-note">Hover over any suit row to fan out and inspect all 52 cards.</p></div></div>';
    const body='<div class="cw-style-scope" '+scopeAttrs+'>'+banner+'<div class="cw-deck-rows">'+rows+'</div></div>';
    const footer=button('close','Back to gallery')+button(equipAction,worn?'Equipped':item.earned?(isSet?'Equip card set':'Equip card back'):'Locked','cw-primary',item.id,worn || !item.earned);
    return result(isSet?'Card set deck preview':'Card back deck preview',item.name,body,footer);
  }
  function menuView() {
    const entries=[['collection','Collection','orb'],['card-styles','Card styles','king'],['career','Career','blind'],['settings','Settings','key'],['profiles','Profile','owl']];
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
    const rewards=data.familiarAchievements || [];
    const earnedRewards=rewards.filter(a=>a.earned).length;
    const familiarRows=rewards.map(a=>'<div class="cw-achievement'+(a.earned?' unlocked':'')+'"><span aria-hidden="true">'+(a.earned?'&#10003;':'&#9671;')+'</span><div><b>'+esc(a.earned?a.name:'Locked Familiar')+'</b><small>'+esc(a.description)+(!a.earned && a.target?' &middot; '+num(a.current)+' / '+num(a.target):'')+'</small></div></div>').join('');
    const familiarSection='<details id="career-familiars" class="career-familiars"><summary>Familiar unlocks &middot; '+earnedRewards+' / '+rewards.length+'</summary><div class="cw-achievements">'+familiarRows+'</div></details>';
    const styleRewards=new Map([
      ...(data.cardStyles || []).map(style=>[style.achievement,{...style,action:'view-style',label:'Card back'}]),
      ...(data.cardSets || []).map(set=>[set.achievement,{...set,action:'view-set',label:'Card set'}])
    ]);
    const milestones=(data.achievements || []).map(a=>{
      const style=styleRewards.get(a.id);
      const reward=style ? '<button class="career-style-link" type="button" data-cw="'+style.action+'" data-value="'+style.id+'">'+
        '<img alt="" src="'+esc(global.CWContent.portrait(style.art))+'">'+esc(style.name)+' <small>('+style.label+')</small></button>' : '';
      return '<div class="cw-achievement'+(a.earned?' unlocked':'')+'"><span aria-label="'+(a.earned?'Earned':'Locked')+'">'+
        (a.earned?'&#10003;':'&#9671;')+'</span><div><b>'+esc(a.name)+'</b><small>'+esc(a.description)+'</small>'+reward+'</div></div>';
    }).join('');
    const decks=Object.entries(api().DECKS).filter(([id])=>st.deckWins?.[id]>0).map(([id,deck])=>{
      const cleared=Object.entries(api().STAKES).filter(([stake])=>st.deckStakeWins?.[id]?.[stake]>0);
      const names=cleared.map(([,stake])=>esc(stake.name)).join(' &middot; ');
      const wins=st.deckWins[id];
      return '<div class="cw-profile-row"><div><b>'+esc(deck.name)+'</b><small class="career-clears">'+
        (names?'&#10003; '+names:'Difficulty unrecorded')+'</small></div><span>'+num(wins)+(wins===1?' win':' wins')+'</span></div>';
    }).join('');
    const stakes=rows(st.stakeWins,api().STAKES), challenges=rows(st.challengeWins,api().CHALLENGES);
    const usage=Object.entries(st.itemUses || {}).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([id,count])=>'<div class="cw-profile-row"><b>'+esc(item(id).name)+'</b><span>'+num(count)+'</span></div>').join('');
    return result(data.profile?.name || '','Career',grid+counts+heading('Deck wins')+(decks || '<p class="cw-explain">Beat the Ante 8 boss in an unseeded standard run to earn your first deck win.</p>')+
      (stakes?heading('Difficulty wins')+stakes:'')+
      (challenges?heading('Challenge wins')+challenges:'')+(usage?heading('Most used items')+usage:'')+familiarSection+(milestones?heading('Achievements')+'<div class="cw-achievements">'+milestones+'</div>':''),button('close','Back')+button('open','Collection','','collection'));
  }
  function collectionView() {
    const data=progress();
    const groups=data.collection || [];
    const active=groups.find(group=>group.key===collectionTab) || groups[0];
    const tabs='<div class="cw-tabs">'+groups.map(g=>tab('collection-tab',g.key,g.name,active?.key)).join('')+'</div>';
    const entries=active?.entries || [];
    const familiarTab=active?.key==='familiars';
    const visible=entries.filter(e=>{
      if (collectionFilter==='locked') return e.locked;
      if (collectionFilter==='known') return e.discovered;
      if (collectionFilter==='unknown') return !e.discovered && (!familiarTab || !e.locked);
      return true;
    });
    if (active?.key==='decks') visible.sort((a,b)=>Number(a.locked)-Number(b.locked));
    const available=active?.key==='familiars' ? entries.filter(e=>!e.locked).length+' / '+entries.length+' unlocked &middot; ' : '';
    const summary='<div class="cw-collection-summary"><strong>'+available+entries.filter(e=>e.discovered).length+' / '+entries.length+' discovered</strong><div class="cw-tabs">'+tab('collection-filter','all','All',collectionFilter)+tab('collection-filter','known','Discovered',collectionFilter)+tab('collection-filter','unknown',familiarTab?'Undiscovered':'Unknown',collectionFilter)+(familiarTab?tab('collection-filter','locked','Locked',collectionFilter):'')+'</div></div>';
    const tag=mobile?'button':'article';
    const inspectable=mobile?' type="button" aria-haspopup="dialog"':'';
    const row=(classes,tip,body)=>'<'+tag+' class="cw-collection-item'+classes+'"'+inspectable+tip+'>'+body+'</'+tag+'>';
    const list=visible.map(entry=>{
      const deckId=active.key==='decks' && entry.id.replace(/^deck_/,'');
      if (deckId && !entry.discovered && data.unlocked?.decks?.includes(deckId)) {
        const emblem=({arcane:'grimoire',alchemist:'potion',oracle:'orb'})[deckId] || 'grimoire';
        return row(' available-deck',mobile?cardTip(entry):'','<img alt="" src="'+global.CWContent.portrait(emblem)+'"><div><b>'+esc(entry.name)+'</b><small>Available to play</small></div>');
      }
      if (!entry.discovered || (active.key==='familiars' && entry.locked)) return '<article class="cw-collection-item unknown"><span class="cw-owned-emblem" aria-hidden="true">'+(entry.locked?'◇':'?')+'</span><div><b>'+esc(entry.locked?'Locked':'Undiscovered')+'</b>'+(entry.unlockHint?'<small>'+esc(entry.unlockHint)+'</small>':'')+'</div></article>';
      return row('',cardTip(entry,true),picture(entry,true)+'<div><b>'+esc(entry.name)+'</b><small>'+itemDescription(entry)+'</small></div>');
    }).join('');
    return result(data.profile?.name || '','Collection',tabs+summary+(list?'<div class="cw-collection-items">'+list+'</div>':'<p class="cw-empty">No entries match this view.</p>'),button('close','Back'));
  }
  function targetCards(cards,d,action='target') {
    const rankStencil = d?.effect === 'rankCopy';
    const marker = rankStencil ? '<span class="rank-smoke" aria-hidden="true"><i></i><i></i><i></i></span><span class="rank-source-tab" aria-hidden="true">Source</span>' : '';
    const faces = cards.map((c,i)=>{
      const position = cards.length>1 ? 2*i/(cards.length-1)-1 : 0;
      const tilt = position*Math.min(9,(cards.length-1)*1.35);
      const pose = '--tilt:'+tilt.toFixed(2)+'deg;--drop:'+(position*tilt).toFixed(2)+'px';
      return '<div class="spell-hand-slot" style="'+pose+'"><div class="spell-hand-face">'+
        options.cardPreview(c,{action,selected:targets.includes(c.id)})+marker+'</div></div>';
    }).join('');
    return '<div class="spell-hand-heading" aria-live="polite" aria-atomic="true"><h3 class="cw-subheading"></h3><span class="spell-hand-count"></span></div>'+
      '<div class="spell-hand-scroll"><div role="group" aria-label="Playing cards" class="pack-playing-cards'+(rankStencil?' rank-stencil-hand':'')+
      '" style="--gaps:'+Math.max(0,cards.length-1)+'">'+faces+'</div></div>';
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
  function usableCards(s) { return s.pack?.hand || s.hand || []; }
  function refreshSpellHand(s) {
    const hand=layer.querySelector('.pack-playing-cards');
    const index=Number(detail);
    const pack=page==='pack', shopping=page==='shop-spell';
    const d=pack ? (detail==='' ? null : item(s.pack.choices[index])) :
      shopping ? item(s.offers[index]) : ownedItem(s,'consumables',index);
    let invalidCard=false;
    usableCards(s).forEach((card,i)=>{
      const slot=hand.children[i];
      const face=slot.querySelector('button');
      const selected=targets.includes(card.id);
      const invalid=selected && d && !api().canTarget(d,card);
      const source=d?.effect==='rankCopy' && card.id===targets[0];
      face.setAttribute('aria-pressed',String(selected));
      if (source) face.setAttribute('aria-description','Rank source');
      else face.removeAttribute('aria-description');
      slot.classList.toggle('rank-source',source);
      slot.classList.toggle('invalid-target',Boolean(invalid));
      if (invalid) invalidCard=true;
    });
    layer.querySelector('.spell-hand-count').textContent=targets.length+' selected';
    layer.querySelector('.spell-hand-heading h3').textContent=invalidCard ? 'Stone cards have no rank or suit' : d ? targetLabel(d) : 'Your hand';
    if (pack) {
      if (mobile) return;
      for (const button of layer.querySelectorAll('[data-cw="choose-pack-spell"]:not(:disabled)')) {
        const i=Number(button.dataset.value);
        button.textContent=api().canPick(s,i,targets) ? 'Cast' : i===index && d ? 'Choose cards' : 'Select spell';
      }
    } else {
      const cast=layer.querySelector('[data-cw="buy-use-cast"],[data-cw="cast"]');
      if (cast) cast.disabled=!(shopping ? api().canBuyAndUse(s,index,targets) : api().canUse(s,index,targets));
    }
  }
  function spellView(s) {
    const index=Number(detail);
    const shopping=page==='shop-spell';
    const d=shopping?item(s.offers[index]):ownedItem(s,'consumables',index);
    const body='<p class="cw-explain">'+itemDescription(d)+'</p>'+(d.maxTargets?targetCards(usableCards(s),d):'');
    const label=shopping?'Buy & use '+cash(api().price(s,s.offers[index])):'Cast spell';
    const check=shopping?api().canBuyAndUse?.(s,index,targets):api().canUse?.(s,index,targets);
    return result('',d.name,body,button('close','Back')+button(shopping?'buy-use-cast':'cast',label,'cw-primary','',check===false));
  }
  function isSpell(d) { return d.kind==='spell' || d.kind==='spectral'; }
  function mayBuyAndUse(s,index,d) {
    if (!isSpell(d) || !api().buyAndUse || !api().affordable(s,api().price(s,s.offers[index])) || usableCards(s).length < (d.minTargets || 0)) return false;
    return api().canBuyAndUse?.(s,index) ?? true;
  }
  function offer(d, control) {
    const family=global.CWContent.cardType(d);
    const rarity=d.rarity && ![family,'booster'].includes(d.rarity.toLowerCase())?'<div class="cw-item-type">'+esc(d.rarity)+'</div>':'';
    const finish = d.kind === 'card' ? '' : global.CWContent.cardFinish(d,d.upgradeAge);
    return '<article class="cw-offer"'+global.CWFamiliarFrames.rarityAttribute(d)+cardTip(d,true)+'>'+picture(d,false,{includeFinish:false})+finish+rarity+'<h3>'+esc(d.name)+'</h3>'+badges(d)+'<p>'+itemDescription(d)+'</p>'+control+'</article>';
  }
  function inspectPackChoice(offer) {
    const control=offer.querySelector('[data-cw]');
    const s=state(), i=Number(control.dataset.value);
    const targeted=control.dataset.cw==='choose-pack-spell';
    const cast=isSpell(item(s.pack.choices[i]));
    const label=targeted && !api().canPick(s,i,targets) ? 'Choose targets' : cast ? 'Cast' : 'Take';
    const disabled=!api().canPick(s,i);
    inspect(control,[{label,disabled,run:()=>act(control.dataset.cw,control.dataset.value,control)}],
      {text:offer.dataset.cardTip,reason:disabled?'Unavailable':''});
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
        ' aria-label="'+esc('Inspect '+d.name)+'">'+spellCardFace(d)+'</button>';
    }).join('');
    return '<section class="companion-rail moon-roost" aria-label="Shop inventory">'+
      '<div class="moon-roost-title"><h3>Your familiars</h3><small class="moon-capacity" aria-label="'+count+' of '+cap.familiars+' familiar slots occupied">'+count+' / '+cap.familiars+'</small></div>'+
      '<div class="companion-slots" style="--intervals:'+Math.max(1,total-1)+'">'+slots+'</div>'+
      '<div class="moon-spell-title"><h3>Your spells</h3><small>'+s.consumables.length+' / '+cap.consumables+' stored</small></div>'+
      '<div class="moon-spell-slots">'+spellSlots+'</div>'+marketPurse(s.money)+'</section>';
  }

  function marketPurse(money, compact=false) {
    return '<div class="cw-purse roost-purse'+(compact?' pack-purse':'')+'" role="group" aria-label="Coin purse"><strong class="stat-money">'+cash(money)+'</strong></div>';
  }

  function marketFamiliar(d) {
    const frame = global.CWFamiliarFrames;
    const portrait = picture(d.bossMuted ? {...d,bossMuted:false} : d,true,{frame:null,includeFinish:false});
    return '<span class="grimoire-card"'+(frame?.attribute(d) || '')+'>'+portrait+(frame?.ornament(d) || '')+global.CWContent.cardFinish(d,d.upgradeAge)+'<span class="grimoire-name">'+esc(d.name)+'</span><i class="grimoire-jewel" aria-hidden="true"></i>'+(d.bossMuted?global.CWCardTip.cross:'')+'</span>';
  }
  function spellCardFace(d) {
    return picture(d,true,{includeFinish:false})+global.CWContent.cardFinish(d)+'<span class="moon-spell-name">'+esc(d.name)+'</span>';
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
  function packDescription(s,pack) {
    return pack.description.replace(' of '+pack.choices+' ', ' of '+(pack.choices+global.CWMarket.voucherPower(s,'packOptions'))+' ');
  }
  function shopOffer(s,i,cap) {
    const id=s.offers[i];
    const d=item(id), price=api().price(s,id), ok=api().canBuy(s,i);
    const family=global.CWContent.cardType(d);
    const type={pack:d.kind==='pack' ? global.CWContent.cardTypes[packFamily(d)][0]+' pack' : 'Booster pack',voucher:'Run upgrade',card:'Playing card',spectral:'Spectral spell',constellation:'Constellation',familiar:'Familiar',spell:'Spell'}[family || d.kind] || d.kind;
    let reason='';
    if (!ok) {
      if (!api().affordable(s,price)) reason='Need '+cash(price-api().funds(s))+' more';
      else if (d.kind==='familiar' && s.familiars.length>=cap.familiars) reason='Roost full';
      else if (d.kind==='spell' && s.consumables.length>=cap.consumables) reason='Spell slots full';
      else reason='Unavailable';
    }
    const castable=mayBuyAndUse(s,i,d);
    const description=d.kind==='pack' ? packDescription(s,d) : d.description;
    const details=global.CWCardTip.details({...d,description},false).split('\n');
    return {d,price,reason,castable,type,details};
  }
  function shopView(s) {
    const cap=api().capacity(s);
    function stockCard(i,slot,indices) {
      const id=s.offers[i];
      const {d,price,reason,castable,type,details}=shopOffer(s,i,cap);
      const family=global.CWContent.cardType(d);
      const ok=!reason;
      const before=s.catSale && api().price(s,id,false);
      const oldPrice=before>price?'<del aria-hidden="true">'+cash(before)+'</del>':'';
      const priceTag='<span class="moon-price">'+oldPrice+'<span class="stat-money">'+cash(price)+'</span></span>';
      const showTitle=!mobile && d.kind!=='familiar' && d.kind!=='card';
      const titleTag=showTitle?'<span class="moon-title" aria-hidden="true">'+esc(d.name)+'</span>':'';
      let controls;
      if (mobile) {
        controls='<button type="button" class="moon-purchase" data-cw="inspect-offer" data-value="'+i+'" aria-haspopup="dialog" aria-label="'+esc('Inspect '+d.name)+'"'+(ok?'':' data-unavailable')+'>'+priceTag+'</button>';
      } else {
        if (d.kind!=='familiar') details.splice(1,0,type);
        const tip=global.CWCardTip.attribute([...details,reason || 'Buy for '+cash(price)].join('\n'));
        const label=esc('Buy '+d.name+' for '+cash(price)+(reason?'. '+reason:''));
        controls='<button type="button" class="moon-purchase" '+(ok?'data-cw="buy"':'data-cw="buy-blocked" aria-disabled="true" data-reason="'+esc(reason)+'"')+' data-value="'+i+'" aria-label="'+label+'"'+tip+'>'+priceTag+'</button>';
        if (castable) controls+='<button type="button" class="moon-cast" data-cw="inspect-cast" data-value="'+i+'" aria-label="'+esc('Buy and cast '+d.name+' for '+cash(price))+'">Buy &amp; cast</button>';
      }
      const tilt=(slot-(indices.length-1)/2)*Math.min(3,14/Math.max(1,indices.length-1));
      const pose='--slot:'+slot+';--tilt:'+tilt.toFixed(2)+'deg;--drop:'+Math.abs(tilt).toFixed(2)+'px';
      return '<article class="moon-item" data-stock-type="'+esc(family || d.kind)+'" style="'+pose+'"><div class="moon-display">'+
        '<div class="moon-art" inert aria-hidden="true">'+marketObject(d)+'</div>'+titleTag+controls+'</div></article>';
    }
    const count=s.shopOfferCount ?? Math.max(0,s.offers.length-3);
    const shelf=(name,cls,indices,control='')=>{
      const available=indices.filter(i=>s.offers[i]);
      const goods=available.length?available.map(stockCard).join(''):'<div class="moon-sold">Sold out</div>';
      return '<section class="moon-shelf '+cls+'"><header><h3>'+name+'</h3>'+control+'</header><div class="moon-goods" style="--intervals:'+Math.max(0,available.length-1)+'">'+goods+'</div></section>';
    };
    const reroll=api().rerollPrice(s);
    const rerollControl=!s.rules?.noReroll?button('reroll','↻  Reroll '+(reroll?cash(reroll):'FREE'),'moon-reroll'+(reroll?'':' moon-free-roll'),'',!api().affordable(s,reroll)):'';
    const stock=shelf('Card counter','moon-stock',Array.from({length:count},(_,i)=>i),rerollControl);
    const packs=shelf('Booster packs','moon-packs',s.offers.slice(count,-1).map((_,i)=>count+i));
    const voucher=shelf('Voucher','moon-vouchers',[s.offers.length-1]);
    const rewards=rewardTicket(s);
    const footer=button('show-menu','Menu')+button('open','Deck','','deck')+button('open','Hand guide','','guide')+button('leave-shop','Next blind →','cw-primary moon-next');
    return result('Shop · Ante '+s.ante,'Moonlit Market',rewards+marketInventory(s,cap)+'<div class="moon-shelves">'+stock+packs+voucher+'</div>',footer);
  }
  function packInventoryFan(s,category,capacity) {
    const familiar=category==='familiars';
    const label=familiar?'Familiars':'Spells';
    const icon='<svg aria-hidden="true" viewBox="0 0 24 24">'+global.CWContent.cardTypes[familiar?'familiar':'spell'][1]+'</svg>';
    const count=s[category].length;
    const gaps=Math.max(0,count-1);
    const cards=s[category].map((_,i)=>{
      const d=ownedItem(s,category,i);
      const tilt=(i-gaps/2)*Math.min(7,22/Math.max(1,gaps));
      const pose='--slot:'+i+';--tilt:'+tilt+'deg;--drop:'+(tilt*tilt/17)+'px';
      const face=familiar?marketFamiliar(d):'<span class="moon-spell-card">'+spellCardFace(d)+'</span>';
      return '<button type="button" class="pack-fan-card" style="'+pose+'" data-owned-category="'+category+'" data-slot="'+i+
        '" aria-expanded="false" aria-label="'+esc('Inspect '+d.name)+'"'+cardTip(d)+'>'+face+'</button>';
    }).join('');
    return '<section class="pack-inventory-group" data-group="'+category+'" aria-labelledby="pack-'+category+'"><h3 id="pack-'+category+'">'+icon+label+
      ' <small>'+count+' / '+capacity+'</small></h3><div class="pack-fan-scroll"><div class="pack-inventory-fan" style="--gaps:'+gaps+'">'+
      (cards || '<span class="pack-fan-empty" aria-hidden="true">'+icon+'</span>')+'</div></div></section>';
  }
  let lastPack, dealStart;
  function packView(s) {
    if (lastPack !== s.pack) { lastPack=s.pack; dealStart=performance.now(); targets=[]; detail=''; }
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
      const action=targeted?'choose-pack-spell':'pick';
      const label=blocked?'Unavailable':targeted?(active===i?'Selected':'Select spell'):isSpell(d)?'Cast':'Take';
      const offset=position++ - (spread-1)/2;
      const delay=(240+i*80)/speed-elapsed;
      return '<div class="pack-slot'+(active===i?' chosen':'')+'" style="--tilt:'+offset*2+'deg;--drop:'+Math.abs(offset)*5+'px;--from:'+(-offset*70)+'px;--delay:'+delay+'ms">'+offer(d,button(action,mobile?'Inspect':label,active===i?'cw-active':'cw-primary',i,blocked && !mobile))+'</div>';
    }).join('');
    const d=active>=0?item(s.pack.choices[active]):null;
    const dealt=hand.length?'<section class="cw-pack-hand">'+targetCards(hand,d,'pack-target')+'</section>':'';
    const wrapper=elapsed<700/speed?'<div aria-hidden="true" class="pack-wrapper" style="--age:'+(-elapsed)+'ms;--duration:'+(650/speed)+'ms">'+picture(item(s.pack.id))+'</div>':'';
    const castingPack=['spell','spectral'].includes(s.pack.pool) || hand.length>0;
    const skip=button('close-pack','Skip remaining');
    const footer=packInventoryFan(s,'familiars',cap.familiars)+dealt+packInventoryFan(s,'consumables',cap.consumables)+(castingPack?'':skip);
    const view=result('Booster pack',s.pack.name,'<div class="pack-spread">'+wrapper+cards+'</div>',footer);
    view.castingPack=castingPack;
    view.headerEnd='<div class="pack-status">'+marketPurse(s.money,true)+'<strong class="pack-remaining">'+num(s.pack.remaining)+(s.pack.remaining===1?' pick left':' picks left')+'</strong>'+(castingPack?skip:'')+'</div>';
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
  const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));

  async function revealCard(node,card,effect,delay,speed,reduced) {
    if (!reduced) {
      if (delay) await wait(delay/speed);
      node.animate([{filter:'brightness(1)'},{filter:'brightness(1.55)'}],{duration:140/speed});
      await wait(140/speed);
    }
    if (!card) {
      if (reduced) node.style.opacity='.3';
      else node.animate([{opacity:1},{opacity:0,clipPath:'inset(0 0 100% 0)',filter:'sepia(1)'}],
        {duration:440/speed,fill:'forwards'});
      return;
    }
    // Replace the printed face while keeping the original button, fan pose and selection.
    const template=document.createElement('template');
    template.innerHTML=options.cardPreview(card);
    const face=template.content.firstElementChild;
    for (const key of ['suit','edition','enhanced','enhancement','debuffed','cardTip']) node.dataset[key]=face.dataset[key];
    node.style.setProperty('--suit',face.style.getPropertyValue('--suit'));
    node.setAttribute('aria-label',face.getAttribute('aria-label'));
    node.replaceChildren(...face.childNodes);
    const flash=document.createElement('span');
    flash.className='spell-imprint';
    flash.dataset.ink=card.edition || card.enhancement || card.seal || effect;
    flash.style.setProperty('--imprint-time',(510/speed)+'ms');
    flash.setAttribute('aria-hidden','true');
    node.append(flash);
  }

  async function resolveCast(s,d,action,index,ids,control) {
    const pack=page==='pack', picker=page==='spell' || page==='shop-spell';
    const hand=page ? layer.querySelector('.pack-playing-cards') : document.getElementById('hand');
    const faces=hand?.querySelectorAll('.playing-card') || [];
    const byId=new Map(Array.from(faces,node=>[node.dataset.card || node.dataset.value,node]));
    const source=control?.closest('.pack-slot,.moon-item') || control;
    const origin=(picker && castSourceRect) || source?.getBoundingClientRect();
    const deckSize=s.deck.length, balance=s.money-(action==='buyAndUse'?api().price(s,s.offers[index]):0);
    const bag=[...s.familiars,...s.consumables.filter((_,i)=>action!=='use' || i!==index)];
    const levels={...s.levels};
    if (!api()[action](s,index,ids)) {
      announce('Choose valid cards or make inventory space first.');
      return;
    }
    casting=true;
    try {
      options.saveRun?.();
      dismissSell();
      options.playSound?.(action==='use'?'select':'buy');
      const speed=options.getSettings?.()?.speed || 1;
      const reduced=options.getSettings?.()?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches || !layer.animate;
      dialog().setAttribute('aria-busy','true');
      const results=[];
      if (d.effect==='generate' || d.effect==='inventoryEdition') {
        for (const ref of [...s.familiars,...s.consumables]) {
          const prior=bag.indexOf(ref);
          if (prior>=0) bag.splice(prior,1);
          else results.push(item(ref).name+(d.effect==='inventoryEdition'?' · Negative':''));
        }
        if (!results.length) results.push('No new cards');
      }
      for (const key of Object.keys(levels)) if (levels[key]!==s.levels[key]) results.push(key+' · Lv '+s.levels[key]);
      if (d.effect==='tally') results.push('+'+num(s.tallyPerPlay)+' Chips per play');
      if (d.effect==='money' || d.effect==='cash') results.push('+'+cash(s.money-balance));
      if (d.effect==='bossDisable') results.push('Boss ward active');
      if (d.effect==='copy') results.push('+'+(s.deck.length-deckSize)+' to deck');
      const notice=[d.name,...results].join(' · ');
      const caption=page && (layer.querySelector('.spell-hand-heading h3') || layer.querySelector('.pack-status .pack-remaining') || layer.querySelector('.cw-message'));
      if (caption) caption.textContent=notice;
      else options.toast?.(notice);
      if (!reduced) source?.animate([{filter:'brightness(1)'},{filter:'brightness(1.4)',offset:.35},{filter:'brightness(1)'}],{duration:400/speed});
      const affected=['rankCopy','suitCopy'].includes(d.effect) ? ids.slice(1) : ids;
      await Promise.all(affected.map((id,i)=>{
        const node=byId.get(String(id));
        if (node) return revealCard(node,s.deck.find(c=>c.id===id),d.effect,i*55,speed,reduced);
      }));
      await wait(reduced ? 260 : (affected.length ? 610 : 550)/speed);
    } finally {
      casting=false;
      dialog().removeAttribute('aria-busy');
      if (picker || action==='pick') { targets=[]; detail=''; }
      else if (pack && d.maxTargets) targets=[];
      if (picker) close();
      options.onChange?.(false);
      sync();
      options.playFamiliarEvents?.(origin);
    }
  }
  function act(name, value, control) {
    if (casting) return;
    const s=state() || {};
    const index=Number(value);
    if (name==='buy-blocked') {
      options.playSound?.('error');
      options.toast?.(control?.dataset.reason || 'Unavailable');
      return;
    }
    if (name==='inspect-offer') {
      const {d,price,reason,castable,type,details}=shopOffer(s,index,api().capacity(s));
      const actions=[{label:'Buy '+cash(price),disabled:Boolean(reason),run:()=>act('buy',value,control)}];
      if (castable) actions.push({label:'Buy & cast '+cash(price),run:()=>act('inspect-cast',value,control)});
      return inspect(control,actions,{text:details.join('\n'),type:d.kind==='familiar'?'':type,reason});
    }
    if(name==='close') return close();
    if(name==='view-style'){styleTab='backs';return open('card-styles',value);}
    if(name==='view-set'){styleTab='sets';return open('card-styles',value);}
    if(name==='preview-deck')return open('style-preview',value);
    if(name==='style-tab' && page==='card-styles'){
      styleTab=value==='sets'?'sets':'backs';
      detail='';
      message='';
      return paint(false);
    }
    if(name==='preview-style' && page==='card-styles'){
      detail=value;
      message='';
      return paint(false);
    }
    if(name==='equip-style' && (page==='card-styles' || page==='style-preview')){
      if(!options.equipCardStyle?.(value))return;
      return announce(value==='classic'?'Classic card backs equipped.':'Card back equipped.');
    }
    if(name==='equip-set' && (page==='card-styles' || page==='style-preview')){
      if(!options.equipCardSet?.(value))return;
      return announce(value==='classic'?'Classic card faces equipped.':'Card set equipped.');
    }
    if(name==='start-practice' && global.CWPlaytest.deals[value]) {
      backStack.length=0;
      route('');
      options.startPractice(value);
      return;
    }
    if(name==='step-deck') return stepDeck(index);
    if(name==='pick-stake') {
      const choices=runChoices();
      if(choices.locked || choices.challenge || !choices.profile.unlocked.stakes.includes(value)) return;
      options.setDeckDifficulty(choices.deckId,value);
      return paint(false);
    }
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
      restartDeck='';
      if (options.wantsLobby?.()) { backStack.length=0; return route('lobby'); }
      if (options.showMenu) { options.showMenu(); return sync(); }
      return open('lobby');
    }
    if(name==='continue-run') {
      restartDeck='';
      backStack.length=0;
      if(options.continueRun) { options.continueRun(); sync(); }
      else route(readPhase(s));
      return;
    }
    if(name==='change-profile' || name==='create-profile') {
      const action=name==='change-profile'?'changeProfile':'createProfile';
      if (!options[action]?.(value.trim())) { announce('Choose a valid profile name or profile.'); return; }
      restartDeck=restartChallenge=restartSeed=collectionTab='';
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
      const {deckId,stakeId,challengeId,locked}=runChoices();
      if (locked) return;
      if(options.restart?.(deckId,seed || undefined,stakeId,challengeId || undefined)===false) { announce('Choose an available run setup.'); return; }
      restartSeed='';
      restartDeck='';
      backStack.length=0;
      sync();
      return;
    }
    if(name==='use-item') {
      const d=ownedItem(s,'consumables',index);
      const ids=d.maxTargets ? (page==='pack' ? targets : options.getSelection?.(d) || []) : [];
      if (d.maxTargets && page!=='pack' && !api().canUse(s,index,ids)) return open('spell',String(index),control?.getBoundingClientRect());
      return resolveCast(s,d,'use',index,ids,control);
    }
    if(name==='inspect-cast') {
      if (!item(s.offers[index]).maxTargets) return act('buy-use',value,control);
      const art=control.closest('.moon-item')?.querySelector('.moon-art');
      return open('shop-spell',String(index),(art || control).getBoundingClientRect());
    }
    if(name==='buy-use') {
      const d=item(s.offers[index]);
      const sourceRect=(control?.closest('.moon-item')?.querySelector('.moon-art') || control)?.getBoundingClientRect();
      if (d.maxTargets>0) return open('shop-spell',String(index),sourceRect);
      return resolveCast(s,d,'buyAndUse',index,[],control);
    }
    if(name==='choose-pack-spell') {
      if (api().canPick(s,index,targets)) return resolveCast(s,item(s.pack.choices[index]),'pick',index,targets,control);
      detail=value;
      paint(false);
      layer.querySelector('.cw-pack-hand .playing-card')?.focus({preventScroll:true});
      return;
    }
    if(name==='target' || name==='pack-target') {
      const card=usableCards(s).find(c=>String(c.id)===value);
      if(!card) return;
      const removing=targets.includes(card.id);
      targets=removing?targets.filter(id=>id!==card.id):[...targets,card.id];
      options.playSound?.(removing?'deselect':'select');
      refreshSpellHand(s);
      return;
    }
    if(name==='cast' || name==='buy-use-cast') {
      const i=Number(detail), buying=name==='buy-use-cast';
      const d=buying?item(s.offers[i]):ownedItem(s,'consumables',i);
      return resolveCast(s,d,buying?'buyAndUse':'use',i,targets,control);
    }
    if(name==='pick') {
      const choice=item(s.pack.choices[index]);
      if (isSpell(choice)) return resolveCast(s,choice,'pick',index,[],control);
      const sourceRect=control?.getBoundingClientRect();
      if(!api().pick(s,index)) { announce('Make inventory space first.'); return; }
      detail='';
      targets=[];
      changed('buy',sourceRect);
      return;
    }
    if (name==='leave-shop' && hasFreeReward(s)) return open('leave-rewards');
    const commands={
      'buy':['buy',index],'close-pack':['closePack'],reroll:['reroll'],'reward-pack':['claimRewardPack'],
      'leave-shop':['leaveShop'],'leave-anyway':['leaveShop'],'cash-out':['cashOut'],'start-blind':['startBlind'],skip:['skipBlind'],
      'sell-familiar':['sell',index],'sell-consumable':['sellConsumable',index],
      'move-left':['reorder',index,index-1],'move-right':['reorder',index,index+1],endless:['endless'],
      'reroll-boss':['rerollBoss'],'disable-boss':['disableBoss']
    };
    if(commands[name]) {
      const itemArt=control?.closest('.moon-item')?.querySelector('.moon-art');
      const sourceRect=(itemArt || control)?.getBoundingClientRect();
      if (page==='leave-rewards' && (name==='reroll' || name==='reward-pack')) close();
      perform(sourceRect,...commands[name]);
    }
  }
  global.CWP={configure,open,close,sync,toggleSell,dismissSell,inspect,inspectSelection,dismissPreview,isOpen:()=>!!page || casting || !!preview?.open,getPage:()=>page};
})(window);
