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
    return [c.enhancement && title(c.enhancement), c.edition && title(c.edition), c.seal && title(c.seal)+' Seal'].filter(Boolean);
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
  function ownedItem(s, category, i) { return api().ownedItem?.(s,category,i) || item(s[category][i]); }
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
  function picture(d, compact = false) {
    if(d.kind==='card' && options.cardPreview) return '<div class="card-display">'+options.cardPreview(d)+'</div>';
    const css = compact ? 'cw-owned-emblem' : 'cw-item-image';
    let content;
    if (d.kind !== 'card' && pictures.has(d.art) && global.CWContent?.portrait) {
      content = '<img alt="" src="' + esc(global.CWContent.portrait(d.art)) + '">';
    } else if (d.kind === 'card') {
      content = '<span>' + esc(rank(d.rank) + (suits[d.suit] || '')) + '</span>';
    } else {
      content = '<span aria-hidden="true">' + esc(d.icon || '✦') + '</span>';
    }
    const type=global.CWContent.cardType(d);
    const accent = /^#[a-f\d]{3,8}$/i.test(d.color || '') ? d.color : '#c3abdc';
    const edition = ['foil','holographic','polychrome','negative'].includes(d.edition) ? ' cw-edition-'+d.edition : '';
    return '<div class="' + css + edition + '" data-family="'+type+'" style="--item-color:' + accent + '">' + content + global.CWContent.typeBadge(type,compact) + '</div>';
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
    function inspectCompanion(event) {
      const card = event.target.closest('[data-companion]');
      if (!card) return;
      const rail = card.closest('.companion-rail');
      rail.querySelector('.lit')?.classList.remove('lit');
      card.classList.add('lit');
      const d = ownedItem(state(),'familiars',Number(card.dataset.companion));
      const readout = rail.querySelector('.companion-effect');
      readout.innerHTML = '<b>'+esc(d.name)+'</b><span>'+esc(d.description)+'</span>';
      global.CWContent.colorStats(readout);
    }
    for (const event of ['pointerover','focusin','click']) layer.addEventListener(event, inspectCompanion);
    layer.addEventListener('input', event => {
      if (event.target.id === 'cw-run-seed') restartSeed = event.target.value;
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
      if (e.target === layer) { if (isDismissible()) close(); return; }
      const b = e.target.closest('[data-cw]');
      if (b && !b.disabled) act(b.dataset.cw, b.dataset.value ?? '');
    });
    document.addEventListener('keydown', event => {
      if (!page) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation();
        if (isDismissible()) close();
      } else if (event.key === 'Tab') {
        const buttons = [...layer.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')];
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
  function open(next, value = '') {
    const s = state();
    const names = {codex:'guide',info:'run',options:'settings',familiar:'inventory',familiars:'inventory',consumables:'inventory',spells:'inventory'};
    next = names[next] || next;
    if (!['guide','deck','run','settings','inventory','restart','spell','shop-spell','lobby','career','collection','profiles'].includes(next)) return;
    if (!s && !['lobby','settings','restart','career','collection','profiles'].includes(next)) return;
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
      const selected = (options.getSelection?.() || []).filter(id=>usableCards(s).some(c=>c.id===id));
      targets = selected.length <= d.maxTargets ? selected : [];
    }
    if (next === 'shop-spell') targets = [];
    route(next, value);
  }
  function close() {
    if (page && !isDismissible()) return;
    const previous = backStack.pop() || [readPhase(state()), ''];
    route(previous[0], previous[1]);
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
    if (!page) return;
    const s = state() || {};
    const body = layer.querySelector('.cw-body');
    const priorScroll = reset ? 0 : body.scrollTop;
    const focused = !reset && layer.contains(document.activeElement) && document.activeElement.dataset.cw ? {action:document.activeElement.dataset.cw,value:document.activeElement.dataset.value} : null;
    const focusedId = !reset && layer.contains(document.activeElement) && document.activeElement.id;
    const selection = !reset && document.activeElement?.tagName === 'INPUT' ? [document.activeElement.selectionStart,document.activeElement.selectionEnd] : null;
    const views = {guide:guideView,deck:deckView,run:runView,settings:settingsView,inventory:inventoryView,restart:restartView,spell:spellView,'shop-spell':spellView,shop:shopView,pack:packView,payout:payoutView,select:selectView,won:endView,lost:endView,lobby:lobbyView,career:careerView,collection:collectionView,profiles:profilesView};
    const view = views[page]?.(s);
    if (!view) return;
    dialog().dataset.page = page;
    layer.querySelector('.cw-head').innerHTML = '<div><p class="cw-kicker">' + esc(view.kicker) + '</p><h2 id="cw-panel-title">' + esc(view.title) + '</h2></div>' + (isDismissible() ? '<button type="button" class="cw-x" data-cw="close" aria-label="Close panel">×</button>' : '');
    layer.querySelector('.cw-message').textContent = message;
    global.CWContent.colorStats(layer.querySelector('.cw-head'));
    body.innerHTML = view.body;
    global.CWContent?.colorStats?.(body);
    if(page==='payout' && !options.getSettings?.()?.reducedMotion && body.animate){
      const rows=[...body.querySelectorAll('.cw-ledger-row')];
      const speed=options.getSettings?.()?.speed || 1;
      rows.forEach((row,i)=>row.animate([
        {opacity:0,translate:'0 7px'},
        {opacity:1,translate:'0 0'}
      ],{duration:180/speed,delay:i*105/speed,fill:'backwards'}));
      const total=rows.at(-1).querySelector('b');
      let subtotal=0;
      total.textContent=cash(0);
      [s.payout.blind,s.payout.hands,s.payout.interest,s.payout.bonus||0].forEach((value,i)=>{
        setTimeout(()=>{
          if(!total.isConnected)return;
          subtotal+=value;
          total.textContent=cash(subtotal);
          if(value)options.playSound?.('coin',i);
        },(i*105+70)/speed);
      });
      rows.at(-1).getAnimations().forEach(a=>a.cancel());
    }
    layer.querySelector('.cw-footer').innerHTML = view.footer;
    body.scrollTop = priorScroll;
    if (reset && page==='inventory' && detail) body.querySelector('.cw-highlight-item')?.scrollIntoView({block:'nearest'});
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
  function changed(sound = 'select') { options.playSound?.(sound); options.onChange?.(); sync(); }
  function perform(action, ...args) {
    const paying=action==='cashOut' && !options.getSettings?.()?.reducedMotion && layer.animate;
    const speed=options.getSettings?.()?.speed || 1;
    const origin=paying && layer.querySelector('.cw-total b')?.getBoundingClientRect();
    const amount=origin && state().payout.total;
    const ok = api()[action]?.(state(), ...args);
    if (ok == null || ok === false) { options.playSound?.('error'); announce('That action is unavailable right now.'); return false; }
    message = '';
    const sounds = {buy:'buy',buyAndUse:'buy',pick:'buy',sell:'buy',sellConsumable:'buy',reroll:'buy',rerollBoss:'buy',cashOut:'shop',startBlind:'deal',endless:'deal'};
    changed(sounds[action]);
    if(origin && amount>0){
      const purse=layer.querySelector('.cw-purse strong') || document.getElementById('money');
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
        ['Stack your familiars','Familiars apply from left to right. Place additive multiplier bonuses before multiplier effects to make the most of both. Change their order in your inventory.'],
        ['Spend your winnings','Visit the shop after a blind for familiars, spells, vouchers and boosters. Save cash to earn interest at the end of a round.'],
        ['Survive eight antes','Each ante contains a Small Blind, a Big Blind and a Boss Blind with its own rule. Skipping an eligible blind awards its listed bonus. Defeat the eighth boss to win.']
      ];
      section = '<dl class="cw-instructions">' + notes.map(([t,d])=>'<div><dt>'+esc(t)+'</dt><dd>'+esc(d)+'</dd></div>').join('') + '</dl>';
    } else {
      const visible = Object.entries(api().HANDS).filter(([name,h])=>!h.secret || s.seenHands?.[name]);
      const rows = visible.map(([name,h]) => {
        const level = s.levels[name] || 1;
        return '<tr><td class="cw-guide-name">' + esc(name) + '</td><td class="cw-level">' + num(level) + '</td><td class="cw-example-col">' + example(name) + '</td><td>' + formula(h.chips+(level-1)*h.chipStep,h.mult+(level-1)*h.multStep) + '</td></tr>';
      }).join('');
      section = '<table class="cw-guide"><thead><tr><th>Hand</th><th>Lv.</th><th class="cw-example-col">Example</th><th>Chips × Mult</th></tr></thead><tbody>' + rows + '</tbody></table>';
      if (visible.length < Object.keys(api().HANDS).length) section += '<p class="cw-guide-hint">Changing your deck can unlock hidden hands.</p>';
    }
    return result('Grimoire','Hand guide',tabs+section);
  }
  function deckView(s) {
    const source = deckTab === 'draw' ? s.draw : s.deck;
    const tabs = '<div class="cw-tabs">' + tab('deck-tab','draw','Draw pile · '+s.draw.length,deckTab) + tab('deck-tab','all','Full deck · '+s.deck.length,deckTab) + '</div>';
    const ranks = Array.from({length:13},(_,i)=>14-i);
    let grid = '<div class="cw-deck-grid" aria-label="Card counts by suit and rank"><span></span>' + ranks.map(r=>'<span class="cw-rank-label">'+rank(r)+'</span>').join('');
    for (const suit of suitOrder) {
      grid += '<span class="cw-suit-label'+red(suit)+'" aria-label="'+suitNames[suit]+'">'+suits[suit]+'</span>';
      for (const r of ranks) {
        const n = source.filter(c=>c.rank===r && c.suit===suit).length;
        const label = rank(r)+' of '+suitNames[suit]+', '+n+' copies';
        grid += '<span class="cw-deck-tile'+red(suit)+(n?'':' cw-spent')+'" title="'+esc(label)+'" aria-label="'+esc(label)+'">'+(n>1?'×'+n:n?rank(r):'–')+'</span>';
      }
    }
    const modified = source.filter(c=>c.enhancement || c.edition || c.seal);
    const mods = modified.length ? heading('Modified cards')+'<div class="cw-mod-list">'+modified.map(c=>'<span>'+esc(rank(c.rank)+suits[c.suit]+' · '+cardModifiers(c).join(' · '))+'</span>').join('')+'</div>' : '';
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
    return result('Run record','Run info','<div class="cw-stats">'+stat('Ante',s.ante)+stat('Round',s.round)+stat('Blinds won',st.roundsWon)+stat('Best hand score',num(st.bestScore))+'</div>'+heading('This ante')+road(s)+heading('Run details')+'<div class="cw-box">'+esc(modes)+'<br><small>'+num(st.handsPlayed)+' hands played · '+num(st.discardsUsed)+' discards used'+(s.seed != null?' · Seed '+esc(s.seed):'')+'</small></div>',
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
    const unlocked = progress().unlocked || {};
    const available = (options,category,id) => Object.hasOwn(options,id) && (!unlocked[category] || unlocked[category].includes(id));
    const current = (options,category,id) => available(options,category,id) ? id : Object.keys(options).find(key=>available(options,category,key));
    const challengeId = available(challenges,'challenges',restartChallenge) ? restartChallenge : '';
    const challenge = challenges[challengeId];
    return {decks,stakes,challenges,unlocked,challengeId,challenge,
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
    return '<div class="cw-run-field"><label for="'+id+'">'+label+'</label><select id="'+id+'" class="cw-select" data-select="'+key+'"'+(forced?' disabled':'')+'>'+standard+list+'</select>'+(choice?'<small>'+esc(choice.description)+'</small>':'')+'</div>';
  }
  function startForm(s) {
    const {decks,stakes,challenges,unlocked,deckId,stakeId,challengeId,challenge}=runChoices();
    const seed = '<div class="cw-seed-form"><label for="cw-run-seed">Run seed <small>Optional · practice</small></label><div><input id="cw-run-seed" type="text" maxlength="'+seedLimit+'" autocomplete="off" autocapitalize="off" spellcheck="false" value="'+esc(restartSeed)+'" placeholder="Random seed">'+(resumable() && s.seed?button('repeat-seed','Reuse seed'):'')+'</div></div>';
    const hints=progress().unlockHints || {};
    const nextDeck=Object.keys(decks).find(id=>unlocked.decks && !unlocked.decks.includes(id) && hints[id]);
    const hint=nextDeck && !challenge?'<p class="cw-unlock-hint"><b>'+esc(decks[nextDeck].name)+'</b> '+esc(hints[nextDeck])+'</p>':'';
    return '<form id="cw-new-run"><div class="cw-run-grid">'+runSelect('Starting deck','deck',decks,deckId,unlocked.decks,!!(challenge?.deck || challenge?.deckId))+
      (Object.keys(stakes).length?runSelect('Difficulty','stake',stakes,stakeId,unlocked.stakes,!!(challenge?.stake || challenge?.stakeId)):'')+'</div>'+
      (Object.keys(challenges).length?runSelect('Mode','challenge',challenges,challengeId,unlocked.challenges):'')+hint+seed+'</form>';
  }
  function startButton() { return '<button class="cw-btn cw-primary" type="submit" form="cw-new-run">Start run</button>'; }
  function restartView(s) {
    return result('','New run',startForm(s)+(resumable() && !['won','lost'].includes(s.phase)?'<p class="cw-explain">Starting a new run replaces the active run for this profile.</p>':''),button('close','Back')+startButton());
  }
  function lobbyView(s) {
    const profile=progress().profile;
    const navigation='<div class="cw-lobby-nav">'+button('open',profile?.name || 'Profiles','','profiles')+button('open','Collection','','collection')+button('open','Career','','career')+button('open','Settings','','settings')+'</div>';
    const hasSave=resumable();
    const liveSave=hasSave && !['won','lost'].includes(s.phase);
    const notice=liveSave?'<p class="cw-explain">Starting a new run replaces this profile’s active run.</p>':'';
    return result('','Card Wizard',navigation+startForm(s)+notice,(hasSave?button('continue-run',liveSave?'Resume run':'View results'):'')+startButton());
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
    const summary='<div class="cw-collection-summary"><strong>'+entries.filter(e=>e.discovered).length+' / '+entries.length+' discovered</strong><div class="cw-tabs">'+tab('collection-filter','all','All',collectionFilter)+tab('collection-filter','known','Discovered',collectionFilter)+tab('collection-filter','unknown','Unknown',collectionFilter)+'</div></div>';
    const list=visible.map(entry=>{
      if (!entry.discovered) return '<article class="cw-collection-item unknown"><span class="cw-owned-emblem" aria-hidden="true">'+(entry.locked?'◇':'?')+'</span><div><b>'+esc(entry.locked?'Locked':'Undiscovered')+'</b>'+(entry.unlockHint?'<small>'+esc(entry.unlockHint)+'</small>':'')+'</div></article>';
      return '<article class="cw-collection-item">'+picture(entry,true)+'<div><b>'+esc(entry.name)+'</b><small>'+esc(entry.description)+'</small></div></article>';
    }).join('');
    return result(data.profile?.name || '','Collection',tabs+summary+(list?'<div class="cw-collection-items">'+list+'</div>':'<p class="cw-empty">No entries match this view.</p>'),button('close','Back'));
  }
  function owned(s, category, list) {
    const entries = list.map((id,i)=>{
      const d = ownedItem(s,category,i);
      const price = api().sellPrice?.(s,id) ?? Math.max(1,Math.floor(d.cost/2));
      let controls='';
      if (category==='familiars') {
        if (list.length>1 && ['shop','play'].includes(s.phase)) controls+='<button class="cw-line-action" type="button" aria-label="Move '+esc(d.name)+' left" data-cw="move-left" data-value="'+i+'"'+(i===0?' disabled':'')+'>←</button><button class="cw-line-action" type="button" aria-label="Move '+esc(d.name)+' right" data-cw="move-right" data-value="'+i+'"'+(i===list.length-1?' disabled':'')+'>→</button>';
        const eternal=d.eternal || d.sticker==='eternal' || d.stickers?.includes('eternal');
        const canSell=api().canSell?.(s,category,i) ?? (!eternal && ['shop','play'].includes(s.phase));
        controls+=button('sell-familiar',eternal?'Eternal':'Sell '+cash(price),'',i,!canSell);
      } else if(category==='consumables') {
        const canUse=api().canUse?.(s,i) ?? (['shop','play'].includes(s.phase) && usableCards(s).length >= (d.minTargets || 0));
        const canSell=api().canSell?.(s,category,i) ?? true;
        controls+=button('use-item','Use','cw-primary',i,!canUse)+button('sell-consumable','Sell '+cash(price),'',i,!canSell);
      }
      return '<div class="cw-owned'+(d.id===detail?' cw-highlight-item':'')+'">'+picture(d,true)+'<div class="cw-owned-info"><b>'+esc(d.name)+'</b>'+badges(d)+'<small>'+esc(d.description)+'</small></div><div class="cw-owned-controls">'+controls+'</div></div>';
    }).join('');
    return entries || '<p class="cw-empty">No '+esc(category)+' yet.</p>';
  }
  function inventoryView(s) {
    const cap = api().capacity(s);
    return result('','Inventory',heading('Familiars · '+s.familiars.length+' / '+cap.familiars)+owned(s,'familiars',s.familiars)+heading('Consumables · '+s.consumables.length+' / '+cap.consumables)+owned(s,'consumables',s.consumables)+(s.vouchers.length?heading('Vouchers')+owned(s,'vouchers',s.vouchers):''));
  }
  function targetCards(cards,d,action='target') {
    return cards.map(c=>{
      const isSelected = targets.includes(c.id);
      const mods=cardModifiers(c);
      const label = [rank(c.rank)+' of '+suitNames[c.suit], ...mods].join(', ');
      return '<button class="cw-target'+red(c.suit)+'" type="button" aria-label="'+esc(label)+'" title="'+esc(label)+'" data-cw="'+action+'" data-value="'+esc(c.id)+'" aria-pressed="'+isSelected+'"'+(!isSelected && targets.length>=d.maxTargets?' disabled':'')+'>'+esc(rank(c.rank)+suits[c.suit])+(mods.length?'<small>'+mods.map(esc).join('<br>')+'</small>':'')+'</button>';
    }).join('');
  }
  function targetLabel(d) {
    const range = d.maxTargets===d.minTargets ? String(d.minTargets) : d.minTargets+'–'+d.maxTargets;
    return 'Choose '+range+' card'+(d.maxTargets===1?'':'s');
  }
  function targetsReady(d) { return targets.length>=d.minTargets && targets.length<=d.maxTargets; }
  function usableCards(s) { return s.pack?.hand || s.hand || []; }
  function spellView(s) {
    const index=Number(detail);
    const shopping=page==='shop-spell';
    const d=shopping?item(s.offers[index]):ownedItem(s,'consumables',index);
    const body='<p class="cw-explain">'+esc(d.description)+'</p>'+heading(targetLabel(d))+'<div class="cw-targets">'+targetCards(usableCards(s),d)+'</div>';
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
    return '<article class="cw-offer">'+picture(d)+rarity+'<h3>'+esc(d.name)+'</h3>'+badges(d)+'<p>'+esc(d.description)+'</p>'+control+'</article>';
  }
  function companionRail(s) {
    const cap=api().capacity(s).familiars;
    const first=s.familiars[0] && ownedItem(s,'familiars',0);
    const slots=Array.from({length:cap},(_,i)=>{
      if (!s.familiars[i]) return '<span class="companion-empty" aria-hidden="true">✧</span>';
      const d=ownedItem(s,'familiars',i);
      return '<button type="button" class="companion-card'+(i===0?' lit':'')+'" data-companion="'+i+'" data-cw="open-inventory" data-value="'+esc(d.id)+'" aria-label="'+esc(d.name+'. '+d.description)+'">'+picture(d,true)+'</button>';
    }).join('');
    return '<section class="companion-rail" aria-label="Equipped familiars"><div><h3>Familiars <small>'+s.familiars.length+' / '+cap+'</small></h3><div class="companion-slots">'+slots+'</div></div><div class="companion-effect">'+(s.familiars.length?'<b>'+esc(first.name)+'</b><span>'+esc(first.description)+'</span>':'')+'</div></section>';
  }
  function stockEffect(d,s) {
    if(d.kind!=='pack')return esc(d.description);
    const kind={familiar:'Familiars',star:'Constellations',spell:'Spells',spectral:'Spectral spells',standard:'Cards'}[d.pool];
    return '<span class="pack-odds" aria-label="'+esc(d.description)+'"><b>'+(d.choices+global.CWMarket.voucherPower(s,'packOptions'))+'</b> '+esc(kind)+' <i aria-hidden="true">→</i> Pick '+d.picks+'</span>';
  }
  function shopView(s) {
    function stockCard(i) {
      const id=s.offers[i];
      if(!id)return '<div class="shop-empty">Sold out</div>';
      const d=item(id), price=api().price(s,id), ok=api().canBuy(s,i);
      const label=ok?(d.kind==='pack'?'Open':'Buy'):s.money<price?'Need '+cash(price-s.money):s.familiars.includes(d.id)?'Already owned':'Unavailable';
      const cast=mayBuyAndUse(s,i,d)?button('buy-use','Buy & use','',i):'';
      return '<article class="market-item '+esc(d.kind)+'"><div class="market-art">'+picture(d)+'<small>'+cash(price)+'</small></div><b>'+esc(d.name)+'</b>'+badges(d)+'<p>'+stockEffect(d,s)+'</p><div class="cw-buy-controls">'+button('buy',label,'cw-primary',i,!ok)+cast+'</div></article>';
    }
    const reroll=api().rerollPrice(s);
    const shelf=(label,slots,action='')=>'<section class="shop-shelf"><header><h3>'+label+'</h3>'+action+'</header><div>'+slots.map(stockCard).join('')+'</div></section>';
    const count=s.shopOfferCount ?? Math.max(0,s.offers.length-3);
    const stock=shelf('Cards',Array.from({length:count},(_,i)=>i),button('reroll','Reroll '+cash(reroll),'reroll','',s.money<reroll || Boolean(s.rules?.noReroll)));
    const lower='<div class="shop-lower">'+shelf('Voucher',[count+2])+shelf('Booster packs',[count,count+1])+'</div>';
    const rewards=s.rewardPacks?.length?'<div class="cw-rewards">'+button('reward-pack','Open reward pack ('+s.rewardPacks.length+')','cw-primary')+'</div>':'';
    const footer='<div class="cw-purse">Wallet <strong>'+cash(s.money)+'</strong></div>'+button('show-menu','Menu')+button('open','Inventory','','inventory')+button('open','Deck','','deck')+button('open','Hand guide','','guide')+button('leave-shop','Next blind →','cw-primary');
    return result('Shop · Ante '+s.ante,'Moonlit Market',companionRail(s)+rewards+'<div class="shop-racks">'+stock+lower+'</div>',footer);
  }
  function packView(s) {
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
      return offer(d,button(action,label,active===i?'cw-active':'cw-primary',i,blocked));
    }).join('');
    const d=active>=0?item(s.pack.choices[active]):null;
    const valid=d && targetsReady(d) && api().canPick?.(s,active,targets)!==false;
    const dealt=hand.length?'<div class="cw-pack-hand">'+heading(d?targetLabel(d):'Pack hand')+(d?'<div class="cw-targets">'+targetCards(hand,d,'pack-target')+'</div>'+button('pick-cast','Cast '+d.name,'cw-primary',active,!valid):
      '<div class="cw-targets">'+hand.map(c=>'<span class="cw-dealt'+red(c.suit)+'" title="'+esc(cardModifiers(c).join(', '))+'">'+esc(rank(c.rank)+suits[c.suit])+'</span>').join('')+'</div>')+'</div>':'';
    return result('Booster pack',s.pack.name,companionRail(s)+'<div class="cw-market-summary"><strong>'+num(s.pack.remaining)+(s.pack.remaining===1?' pick left':' picks left')+'</strong>'+button('open','Inventory','','inventory')+'</div><div class="cw-items">'+cards+'</div>'+dealt,button('show-menu','Menu')+button('close-pack','Skip remaining'));
  }
  function payoutView(s) {
    const p = s.payout;
    const row=(name,value,total=false)=>'<div class="cw-ledger-row'+(total?' cw-total':'')+'"><span>'+esc(name)+'</span><span class="cash-stack" aria-hidden="true">'+('<i></i>').repeat(Math.min(8,Math.max(0,value)))+'</span><b>'+cash(value)+'</b></div>';
    return result('Round '+s.round,'Blind cleared','<div class="cw-ledger">'+row('Blind',p.blind)+row('Hands left',p.hands)+(p.interest?row('Interest',p.interest):'')+(p.bonus?row('Bonus',p.bonus):'')+row('Total',p.total,true)+'</div>',button('cash-out','Collect '+cash(p.total),'cw-primary'));

  }
  function selectView(s) {
    const tickets=[0,1,2].map(i=>{
      const blind=api().blindInfo(s,i), active=i===s.blind;
      const phase=i<s.blind?'Passed':active?'Choose':'Upcoming';
      const seal='<img alt="" src="'+global.CWContent.portrait(['owl','grimoire','dragon'][i])+'">';
      const tagText=blind.tag?.description || blind.tag;
      const canSkip=i<2 && !s.rules?.noSkip;
      const tag=canSkip && tagText?'<small class="tag-bonus">Skip bonus · '+esc(tagText)+'</small>':'';
      const reroll=i===2 && api().canRerollBoss?.(s)?button('reroll-boss','Reroll boss'+bossCost('bossRerollPrice',s)):'';
      const disable=i===2 && api().canDisableBoss?.(s)?button('disable-boss','Disable rule'+bossCost('bossDisablePrice',s)):'';
      const bossTools=reroll || disable?'<div class="cw-boss-tools">'+reroll+disable+'</div>':'';
      return '<article class="blind-ticket tier-'+i+(active?' current':'')+'"><header>'+esc(blind.kind)+'</header><div class="blind-stamp" aria-hidden="true"><i>'+seal+'</i></div><small class="trial-target" aria-label="Target">&#9678;</small><strong class="blind-goal" aria-label="Target '+num(blind.target)+' chips">'+num(blind.target)+'</strong><div class="blind-prize" aria-label="Reward '+cash(blind.reward)+'">'+('<span class="reward-coin" aria-hidden="true">$</span> '+cash(blind.reward))+'</div>'+(i===2?'<div class="boss-brief"><b>'+esc(blind.name)+'</b><small>'+esc(blind.description)+'</small></div>':'')+'<div class="blind-actions">'+(active?button('start-blind','Play blind','cw-primary'):'<b class="blind-state">'+phase+'</b>')+(active && canSkip?button('skip','Skip blind'):'')+tag+bossTools+'</div></article>';
    }).join('');
    return result('Choose your blind · Ante '+s.ante,'The Astral Trials',companionRail(s)+'<div class="blind-board">'+tickets+'</div>',button('show-menu','Menu'));
  }
  function bossCost(action,s) {
    const cost=api()[action]?.(s);
    return cost>0?' '+cash(cost):'';
  }
  function endView(s) {
    const won=s.phase==='won';
    const challenge=api().CHALLENGES?.[s.challengeId];
    const headline=won?(challenge?.name || 'The final blind falls'):'Out of hands';
    const note=won?'You cleared '+(s.rules?.anteLimit || 8)+' antes.'+(challenge?' Challenge complete.':' Continue with your current deck in Endless.'):'Your score reached '+num(s.score)+' of the '+num(s.target)+' chips required.';
    return result('Run complete',won?'Victory':'Run over','<div class="cw-hero"><span class="cw-hero-emblem" aria-hidden="true">'+(won?'✶':'♠')+'</span><h3 class="cw-hero-title">'+esc(headline)+'</h3><p class="cw-explain">'+esc(note)+'</p></div><div class="cw-stats">'+stat('Ante reached',s.ante)+stat('Blinds won',s.stats.roundsWon)+stat('Best hand score',num(s.stats.bestScore))+'</div>',button('show-menu','Menu')+button('open','New run',won?'':'cw-primary','restart')+(won && !s.challengeId?button('endless','Continue endless →','cw-primary'):''));
  }
  function act(name, value) {
    const s=state() || {};
    const index=Number(value);
    if(name==='close') return close();
    if(name==='open') return open(value);
    if(name==='open-inventory') return open('inventory',value);
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
      if (d.maxTargets>0) return open('spell',String(index));
      if(perform('use',index,[])) announce(d.name+' cast.');
      return;
    }
    if(name==='buy-use') {
      const d=item(s.offers[index]);
      if (d.maxTargets>0) return open('shop-spell',String(index));
      if(perform('buyAndUse',index,[])) announce(d.name+' cast.');
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
      if(api()[buying?'buyAndUse':'use'](s,i,targets)) { close(); changed(buying?'buy':'select'); announce(d.name+' cast.'); }
      else announce('Choose valid cards for this spell.');
      return;
    }
    if(name==='pick' || name==='pick-cast') {
      const ids=name==='pick-cast'?targets:[];
      if(!api().pick(s,index,ids)) { announce('Choose valid cards or make inventory space first.'); return; }
      detail='';
      targets=[];
      changed('buy');
      return;
    }
    const commands={
      'buy':['buy',index],'close-pack':['closePack'],reroll:['reroll'],'reward-pack':['claimRewardPack'],
      'leave-shop':['leaveShop'],'cash-out':['cashOut'],'start-blind':['startBlind'],skip:['skipBlind'],
      'sell-familiar':['sell',index],'sell-consumable':['sellConsumable',index],
      'move-left':['reorder',index,index-1],'move-right':['reorder',index,index+1],endless:['endless'],
      'reroll-boss':['rerollBoss'],'disable-boss':['disableBoss']
    };
    if(commands[name]) perform(...commands[name]);
  }
  global.CWP={configure,open,close,sync,isOpen:()=>!!page,getPage:()=>page};
})(window);
