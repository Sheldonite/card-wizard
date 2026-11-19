(() => {
  'use strict';
  const {CW, CWP, CWProgress, CWSound: audio} = window;
  const $ = id => document.getElementById(id);
  const paths = {
    leaf:'<path d="M3 17c2-5 6-9 11-12M5 13C2 6 9 3 17 2c0 8-3 15-12 11Z"/>',
    mult:'<path d="m10 2-6 10h5l-1 6 8-12h-6z"/>',
    steel:'<path d="m10 2 7 3v5q0 5-7 8-7-3-7-8V5zM10 5v9"/>',
    lucky:'<path d="M10 9C2 10 2 3 6 3q4 0 4 5 0-6 4-5c4 1 4 6-3 7 8-1 8 6 4 6-4 0-5-5-5-5q0 5-4 7m3-8c-6 9-11-2-1-1"/>',
    repeat:'<path d="M4 8a6 6 0 1 1 0 5M4 3v5h5"/>',
    book:'<path d="M2 4.5c3-.8 6-.8 8 1 2-1.8 5-1.8 8-1v11c-3-.8-5.8-.8-8 1-2.2-1.8-5-1.8-8-1zM10 5.5v11"/>',
    sound:'<path d="M3 8h3l4-4v12l-4-4H3zM13 7c2 1.4 2 4.6 0 6m2-9c4.8 3.2 4.8 8.8 0 12"/>',
    mute:'<path d="M3 8h3l4-4v12l-4-4H3zM13 8l4 4m0-4-4 4"/>',
    settings:'<path d="m8.4 2.5-.5 1.9-1.5.9-1.8-.6-1.7 2.9 1.4 1.4v1.9l-1.4 1.4 1.7 2.9 1.8-.6 1.5.9.5 1.9h3.2l.5-1.9 1.5-.9 1.8.6 1.7-2.9-1.4-1.4V9l1.4-1.4-1.7-2.9-1.8.6-1.5-.9-.5-1.9z"/><circle cx="10" cy="10" r="2.5"/>',
    menu:'<path d="M3 5h14M3 10h14M3 15h14"/>',
    'arrow-left':'<path d="M16 10H4m5-5-5 5 5 5"/>',
    'arrow-right':'<path d="M4 10h12m-5-5 5 5-5 5"/>',
    eye:'<path d="M1.5 10s3.5-5.3 8.5-5.3 8.5 5.3 8.5 5.3-3.5 5.3-8.5 5.3S1.5 10 1.5 10Z"/><circle cx="10" cy="10" r="2.4"/>',
    spark:'<path d="M10 1.7c1.1 5.4 2.5 6.8 7.8 8.3-5.3 1.4-6.7 2.9-7.8 8.3C8.7 12.9 7.1 11.4 2 10c5.1-1.5 6.7-2.9 8-8.3z"/>',
    stars:'<path d="m7.5 3 1.4 4.8 4.6 1.5-4.6 1.6-1.4 4.8-1.6-4.8-4.4-1.6 4.4-1.5zm7.8 7.4 1 3 2.6.9-2.6 1-1 2.8-1-2.8-2.7-1 2.7-.9zM15 2v4m-2-2h4"/>',
    potion:'<path d="M7 2h6m-5 0v5l-4.7 6.7c-1.1 1.8.1 3.8 2.3 3.8h8.8c2.2 0 3.4-2 2.3-3.8L12 7V2M6.8 11.2c2 .6 3.6-1 6.5-.1"/>',
    chip:'<ellipse cx="10" cy="7" rx="7.5" ry="3.6"/><path d="M2.5 7v5.4c0 4.7 15 4.7 15 0V7m-11 4v3.5m7-3.5v3.5"/>',
    hand:'<path d="M6 9V5.7a1 1 0 0 1 2 0v2.5-4.3a1 1 0 0 1 2 0v4-4.8a1 1 0 0 1 2 0V8 4.9a1 1 0 0 1 2 0V10l1-2.4c.8-1.7 2.5-.6 2 .8l-1.4 5.3c-.5 2.2-1.9 3.8-4.4 3.8H9c-2 0-3-1.2-4-2.7L2.8 11c-.8-1.5.8-2.6 1.8-1.4l1.5 2z"/>',
    discard:'<path d="M4 6h12m-9-2h6m-8 2 1 11h8l1-11m-7 3 .4 5m3.6-5-.4 5"/>',
    coin:'<circle cx="10" cy="10" r="7.4"/><path d="m10 5 3.2 5-3.2 5-3.2-5z"/>',
    scroll:'<path d="M5 3h9a2 2 0 0 1 2 2v3h-4m-7-5c1.5 0 2 1 2 2v10c0 2-4 2-4 0v-2h4m0 4h7c1.5 0 2-1 2-2V8m-7 1h3m-3 3h3"/>',
    chevron:'<path d="m7 4 6 6-6 6"/>',play:'<path fill="currentColor" stroke="none" d="M5 2.8v14.4L17.1 10z"/>',
    cards:'<path d="m6 4 8-2 3 12-3 .8M3 6h9v11H3z"/><path d="m7.5 8.5 1.8 3-1.8 3-1.8-3z"/>',
    diamond:'<path d="m10 2 6 8-6 8-6-8z"/><path d="m10 6 3 4-3 4-3-4z"/>',check:'<path d="m3 10 4 4L17 4"/>'
  };
  function icon(key) {return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[key] || paths.spark)+'</svg>';}
  const vesselArt='<i class="vessel-art" aria-hidden="true"><i class="vessel-liquid"></i><i class="vessel-spill"></i><i class="vessel-drops"></i></i>';
  document.querySelectorAll('.score-components .score-vessel').forEach(vessel=>vessel.insertAdjacentHTML('afterbegin',vesselArt));
  document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});
  const suits = {
    S:{name:'Spades',color:'#382b48',path:'M10 1C7.9 4.4 1.7 7.9 1.7 12.1c0 4.2 4.8 5.4 7.6 2.1-.4 2.3-1.2 3.7-3.1 5h7.6c-1.9-1.3-2.7-2.7-3.1-5 2.8 3.3 7.6 2.1 7.6-2.1C18.3 7.9 12.1 4.4 10 1Z',etch:'M4.8 12.2c-.6-2.1 1.4-4.2 3-5.6'},
    H:{name:'Hearts',color:'#a03253',path:'M10 18.8C8.3 16.8 1 11.6 1 6.5 1 1.1 7.2 0 10 4.8 12.8 0 19 1.1 19 6.5c0 5.1-7.3 10.3-9 12.3Z',etch:'M3.3 7c-.2-2.5 1.6-3.7 3.4-3.1'},
    C:{name:'Clubs',color:'#27483e',path:'M10 1.2a4.5 4.5 0 0 1 3.5 7.2c3.3-2 6.6.7 5.2 4.5-1.2 3.7-5.4 4.4-8 1.2.5 2.4 1.4 4 3.4 5.1H5.9c2-1.1 2.9-2.7 3.4-5.1-2.6 3.2-6.8 2.5-8-1.2-1.4-3.8 1.9-6.5 5.2-4.5A4.5 4.5 0 0 1 10 1.2Z',etch:'M7.5 5.4c0-1.3 1.3-2.3 2.6-2.2M3.3 12c0-1.2.7-2.1 1.9-2.2'},
    D:{name:'Diamonds',color:'#a13e30',path:'M10 0 18.4 10 10 20 1.6 10Z',etch:'m10 3 3.7 7-3.7 6.8L6.2 10z'}
  };
  const cardSetThemes = {
    'toadstool-coven': {
      S:{color:'#2f5e42',path:'M10 1.4C4.2 1.8 1.4 6.6 1.8 10.6c.3 2.5 3.1 2.7 6.3 2.3-.3 2.5-1 4.1-2.7 5.7h9.2c-1.7-1.6-2.4-3.2-2.7-5.7 3.2.4 6 .2 6.3-2.3.4-4-2.4-8.8-8.2-9.2Z',etch:'M6.2 6.2a1.1 1.1 0 1 0 .1 0M13.2 5.4a1 1 0 1 0 .1 0M10.2 8.8a1.2 1.2 0 1 0 .1 0'},
      H:{color:'#b44032',path:'M10 18.8C7.8 16.4 1.2 11.4 1.2 6.5c0-4.6 5.6-6.2 8.8-1.9 3.2-4.3 8.8-2.7 8.8 1.9 0 4.9-6.6 9.9-8.8 12.3Z',etch:'M5.4 6.6a1 1 0 1 0 .1 0M14.2 6.8a1 1 0 1 0 .1 0M10 11.8a1.1 1.1 0 1 0 .1 0'},
      C:{color:'#24563b',path:'M10 1.4c3 0 5 2.4 4.2 5.4 2.8-1.4 5.6 1 4.6 4.4-1 3.3-4.6 4-7.4 1.6.4 2.3 1.2 4.1 3 5.8H5.6c1.8-1.7 2.6-3.5 3-5.8-2.8 2.4-6.4 1.7-7.4-1.6-1-3.4 1.8-5.8 4.6-4.4C5 3.8 7 1.4 10 1.4Z',etch:'M10 4.8v6.2M6.2 9.6 10 11l3.8-1.4'},
      D:{color:'#b06a26',path:'M10 .8C13.6 4.4 17.8 7.8 18 11c-.2 3.2-4.4 5.8-8 8.4C6.4 16.8 2.2 14.2 2 11c.2-3.2 4.4-6.6 8-10.2Z',etch:'M4.6 9.2c3.2 1.8 7.6 1.8 10.8 0M10 3.2v4.8'}
    },
    'owl-observatory': {
      S:{color:'#2a3a74',path:'M10 .8c-2 4-8 7.4-8 11.4 0 3.8 4.3 4.8 7 1.9-.4 2.2-1.2 3.6-3 4.9h8c-1.8-1.3-2.6-2.7-3-4.9 2.7 2.9 7 1.9 7-1.9 0-4-6-7.4-8-11.4Z',etch:'M10 4.6l1 2.7 2.8 1-2.8 1-1 2.7-1-2.7-2.8-1 2.8-1Z'},
      H:{color:'#a33a5e',path:'M10 18.8C8 16.6 1.2 11.4 1.2 6.4 1.2 1.3 7.1.3 10 4.8 12.9.3 18.8 1.3 18.8 6.4c0 5-6.8 10.2-8.8 12.4Z',etch:'M10 7.2l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8Z'},
      C:{color:'#2b5d68',path:'M10 1.2a4.3 4.3 0 0 1 3.4 7c3.2-1.8 6.4.8 5 4.4-1.1 3.4-5.1 4.1-7.6 1.1.4 2.3 1.3 4 3.2 5.2H6c1.9-1.2 2.8-2.9 3.2-5.2-2.5 3-6.5 2.3-7.6-1.1-1.4-3.6 1.8-6.2 5-4.4a4.3 4.3 0 0 1 3.4-7Z',etch:'M10 4.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4M6.2 10.6a1.4 1.4 0 1 0 0 2.8M13.8 10.6a1.4 1.4 0 1 0 0 2.8'},
      D:{color:'#b57924',path:'M10 .4 13 7l6.6 3-6.6 3-3 6.6L7 13 .4 10 7 7Z',etch:'M10 4.5 11.5 8.5 15.5 10 11.5 11.5 10 15.5 8.5 11.5 4.5 10 8.5 8.5Z'}
    },
    'teacup-dragons': {
      S:{color:'#2c5d63',path:'M10.4.8C7.6 4.4 2 7.4 2 11.8c0 4 4.4 5.2 7.1 2.2-.4 2.2-1.2 3.7-3 5h7.8c-1.8-1.3-2.6-2.8-3-5 2.7 3 7.1 1.8 7.1-2.2 0-3.2-2.4-5.6-4.2-7.8.2 2.2-.8 3.2-1.8 2.4C12.4 4.2 11.8 2.2 10.4.8Z',etch:'M8 12.2c-.4-2.2 1.2-4 2.8-5.4'},
      H:{color:'#b83a2c',path:'M10 18.8C7.8 16.4 1.4 11.6 1.4 6.6c0-4.4 5.4-5.8 8.6-1.8 3.2-4 8.6-2.6 8.6 1.8 0 5-6.4 9.8-8.6 12.2Z',etch:'M10 13.8c-2-1.6-3-3.6-1.8-5.6.8 1.2 1.8.8 2.2-.8 1.6 1.8 1.8 4.4-.4 6.4'},
      C:{color:'#3b6944',path:'M10 1.4c2.8 1.4 4.2 4.2 3.2 6.8 3-1.4 5.8.6 5.2 3.8-.6 3.2-4.6 4.4-7.6 1.8.4 2.2 1.2 3.9 3.1 5.2H6.1c1.9-1.3 2.7-3 3.1-5.2-3 2.6-7 1.4-7.6-1.8-.6-3.2 2.2-5.2 5.2-3.8-1-2.6.4-5.4 3.2-6.8Z',etch:'M10 4v7.6M5.4 10.8 10 11.6l4.6-.8'},
      D:{color:'#bd6b24',path:'M10 .6 18 10 10 19.4 2 10Z',etch:'M10 4c2.2 2 3.4 4 3.4 6S12.2 14 10 16c-2.2-2-3.4-4-3.4-6S7.8 6 10 4Z'}
    },
    'badger-alchemists': {
      S:{color:'#5a346e',path:'M7.4 1.4h5.2v2.4h-1v2.6c3.8 1.6 6.4 4.4 6.4 7.4 0 3-3.4 5-8 5s-8-2-8-5c0-3 2.6-5.8 6.4-7.4V3.8h-1V1.4Z',etch:'M5.4 13.2c2.4-1.2 6.8 1.2 9.2 0M8.6 10.2a1 1 0 1 0 .1 0'},
      H:{color:'#a8375a',path:'M10 18.8C8 16.6 1.2 11.6 1.2 6.5 1.2 1.2 7.2.2 10 4.8 12.8.2 18.8 1.2 18.8 6.5c0 5.1-6.8 10.1-8.8 12.3Z',etch:'M5.6 9.8c2.6-.8 6.2.8 8.8 0M7.4 6.4a.9.9 0 1 0 .1 0'},
      C:{color:'#276953',path:'M10 1.4a4.2 4.2 0 0 1 3.3 6.8c3.2-1.8 6.3.8 5 4.4-1.2 3.4-5.1 4.2-7.6 1.3.4 2.2 1.3 3.9 3.2 5.1H6.1c1.9-1.2 2.8-2.9 3.2-5.1-2.5 2.9-6.4 2.1-7.6-1.3-1.3-3.6 1.8-6.2 5-4.4a4.2 4.2 0 0 1 3.3-6.8Z',etch:'M7.8 5.2a1.3 1.3 0 1 0 2.4 0M5.2 11.4a1.1 1.1 0 1 0 2 0M12.8 11.4a1.1 1.1 0 1 0 2 0'},
      D:{color:'#b46b28',path:'M10 .6 17.6 7.4 15.2 16 10 19.6 4.8 16 2.4 7.4Z',etch:'M10 1.6v17M3.4 8l6.6 2.4L16.6 8'}
    },
    'goose-archmages': {
      S:{color:'#2e4484',path:'M10.8.8 4.4 12.4c-1.8.6-2.8 1.6-2.8 2.6 0 2 3.8 3.6 8.4 3.6s8.4-1.6 8.4-3.6c0-1-1-2-2.8-2.6L10.8.8Z',etch:'M6.2 13.6c2.2.8 5.4.8 7.6 0M10.4 7.2l.7 1.6 1.7.7-1.7.7-.7 1.6-.7-1.6-1.7-.7 1.7-.7Z'},
      H:{color:'#a82f4e',path:'M10 18.8C8 16.6 1.2 11.6 1.2 6.6c0-4.8 5.8-6 8.8-1.6 3-4.4 8.8-3.2 8.8 1.6 0 5-6.8 10-8.8 12.2Z',etch:'M6.4 7.8 7.6 5.2 10 7l2.4-1.8 1.2 2.6Z'},
      C:{color:'#3c5234',path:'M10 1.2a4.4 4.4 0 0 1 3.4 7c3.3-1.9 6.5.8 5.1 4.5-1.2 3.5-5.2 4.2-7.8 1.2.4 2.3 1.4 4 3.3 5.1H6c1.9-1.1 2.9-2.8 3.3-5.1-2.6 3-6.6 2.3-7.8-1.2-1.4-3.7 1.8-6.4 5.1-4.5a4.4 4.4 0 0 1 3.4-7Z',etch:'M10 3.8v11.4M7.2 7.4h5.6'},
      D:{color:'#b07822',path:'M10 .6 18.2 10 10 19.4 1.8 10Z',etch:'M10 4.6 14 10 10 15.4 6 10ZM10 7.6v4.8'}
    }
  };
  let cardStyle, cardSet;
  function suitSpec(suit,setOverride){
    const activeSet=setOverride===undefined?cardSet:setOverride;
    const custom=activeSet && cardSetThemes[activeSet.id]?.[suit];
    return custom ? {...suits[suit],...custom} : suits[suit];
  }
  function pip(suit,attr='',setOverride) {return '<svg viewBox="0 0 20 20" aria-hidden="true" '+attr+'><path fill="currentColor" d="'+suitSpec(suit,setOverride).path+'"/></svg>';}
  function stampedPip(suit,x,y,style='',setOverride) {
    const s=suitSpec(suit,setOverride);
    return '<svg viewBox="0 0 20 20" aria-hidden="true" class="pip '+style+'" style="left:'+x+'%;top:'+y+'%"><path fill="currentColor" d="'+s.path+'"/><path class="pip-etch" d="'+s.etch+'"/></svg>';
  }
  const left=25, right=75, center=50, top=15, bottom=85;
  const pairRows=ys=>ys.flatMap(y=>[[left,y],[right,y]]);
  const spots={
    2:[[center,top],[center,bottom]],3:[[center,top],[center,50],[center,bottom]],
    4:pairRows([top,bottom]),5:[...pairRows([top,bottom]),[center,50]],
    6:pairRows([top,50,bottom]),7:[...pairRows([top,50,bottom]),[center,32]],
    8:[...pairRows([top,50,bottom]),[center,32],[center,68]],9:[...pairRows([top,38,62,bottom]),[center,50]],
    10:[...pairRows([top,38,62,bottom]),[center,27],[center,73]]
  };
  const faceNames={11:'Jack',12:'Queen',13:'King',14:'Ace'};
  const rankText=rank=>({11:'J',12:'Q',13:'K',14:'A'})[rank] || String(rank);
  const cardName=c=>(faceNames[c.rank] || c.rank)+' of '+suits[c.suit].name;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const compact=n=>Math.abs(n)>=1e7?Number(n).toExponential(2):num(n);
  const prefKey='card-wizard.settings.1';
  function read(key) {try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
  function store(key,value) {try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
  const profileStore=CWProgress.createStore();
  function applyCardStyle(){
    cardStyle=profileStore.getEquippedCardStyle();
    cardSet=profileStore.getEquippedCardSet();
    const root=document.documentElement;
    if(cardStyle){
      root.dataset.cardStyle=cardStyle.id;
      root.style.setProperty('--card-style-ink',cardStyle.color);
      root.style.setProperty('--card-style-art','url("'+CWContent.portrait(cardStyle.art)+'")');
    }else{
      delete root.dataset.cardStyle;
      root.style.removeProperty('--card-style-ink');
      root.style.removeProperty('--card-style-art');
    }
    if(cardSet){
      root.dataset.cardSet=cardSet.id;
      root.style.setProperty('--card-set-ink',cardSet.color);
      root.style.setProperty('--card-set-art','url("'+CWContent.portrait(cardSet.art)+'")');
    }else{
      delete root.dataset.cardSet;
      root.style.removeProperty('--card-set-ink');
      root.style.removeProperty('--card-set-art');
    }
  }
  applyCardStyle();
  function loadRun(){
    const saved=profileStore.getRun();
    return saved && (CW.restore ? CW.restore(saved) : saved);
  }
  let run=loadRun();
  let hasRun=Boolean(run);
  let showLobby=true;
  let suspendedRun=null;
  if(!run) run=CW.newRun(undefined,'arcane');
  const prefs={
    muted:false,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
    highContrast:false,speed:1,musicVolume:1,effectVolume:1,sort:'rank',...read(prefKey)
  };
  const fxTime=ms=>ms/(Number(prefs.speed) || 1);
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,fxTime(ms)));
  const selected=new Set();
  let busy=false, currentHand=[], toastTimer, lastViewKey='';
  let orderCardId=null;
  let unlockTimer;
  const unlockQueue=[];
  function showUnlock(){
    if(unlockTimer || !unlockQueue.length)return;
    const reward=unlockQueue.shift(), notice=$('familiar-unlock');
    notice.innerHTML='<img alt="" src="'+esc(CWContent.portrait(reward.art))+'"><div><small>'+esc(reward.title)+'</small><b>'+esc(reward.name)+'</b><span>'+esc(reward.hint)+'</span></div>';
    notice.hidden=false;
    unlockTimer=setTimeout(()=>{
      notice.hidden=true;
      unlockTimer=null;
      showUnlock();
    },4000);
  }
  function announceUnlocks(){
    for(const id of profileStore.takeFamiliarUnlocks()){
      const f=CW.item(id);
      unlockQueue.push({title:'Familiar unlocked',name:f.name,art:f.art,hint:f.unlock});
    }
    for(const style of profileStore.takeCardStyleUnlocks()){
      unlockQueue.push({title:'Card back unlocked',name:style.name,art:style.art,hint:style.goal});
    }
    for(const set of profileStore.takeCardSetUnlocks()){
      unlockQueue.push({title:'Card set unlocked',name:set.name,art:set.art,hint:set.goal});
    }
    showUnlock();
  }
  function save(){
    if(run.playtest){
      $('save-note').textContent='Practice session';
      return;
    }
    const saved=hasRun && profileStore.saveRun(run);
    announceUnlocks();
    $('save-note').innerHTML='<i data-icon="check">'+icon('check')+'</i>'+
      (saved?'Run saved':hasRun?'Playing this session':'Choose a run');
  }
  function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),1700);}
  function updatePrefs(){
    audio.setVolumes(prefs.musicVolume,prefs.effectVolume);
    audio.setMuted(prefs.muted);
    document.body.classList.toggle('still',!!prefs.reducedMotion);
    window.CWShopCat?.syncMotion?.();
    window.CWParlorCat?.syncMotion?.();
    document.body.classList.toggle('high-contrast',!!prefs.highContrast);
    const mute=$('sound-btn');
    mute.innerHTML='<i data-icon="sound">'+icon(prefs.muted?'mute':'sound')+'</i>';
    mute.title=mute.ariaLabel=prefs.muted?'Enable sound':'Mute sound';
    mute.setAttribute('aria-pressed',String(prefs.muted));
    store(prefKey,prefs);
  }
  function setSetting(key,value){
    if(key==='speed') value=Math.min(3,Math.max(.5,Number(value)||1));
    if(key==='musicVolume' || key==='effectVolume') value=Math.min(1,Math.max(0,Number(value)||0));
    prefs[key]=value;
    updatePrefs();
  }
  function sortedHand(){
    const cards=[...run.hand];
    if(run.cardOrderMode==='manual') return cards;
    const sort=run.cardOrderMode || prefs.sort;
    const suitOrder='SHCD';
    return cards.sort((a,b)=>{
      const rank=b.rank-a.rank, suit=suitOrder.indexOf(a.suit)-suitOrder.indexOf(b.suit);
      return sort==='suit'?suit || rank:rank || suit;
    });
  }
  function art(card,themeOverride){
    const activeStyle=themeOverride && 'cardStyle' in themeOverride ? themeOverride.cardStyle : cardStyle;
    const activeSet=themeOverride && 'cardSet' in themeOverride ? themeOverride.cardSet : cardSet;
    const wildInk=card.enhancement==='wild'?'<span class="wild-ink" aria-hidden="true"></span>':'';
    if(card.rank>=11 && card.rank<=13){
      const face=faceNames[card.rank].toLowerCase();
      const portrait=window.CWContent.portrait(activeSet ? 'card-set-courts/'+activeSet.id+'-'+face : face);
      const suitsBand=wildInk?'<span class="court-suits" aria-hidden="true">'+
        Object.keys(suits).map(suit=>pip(suit,'style="color:'+suitSpec(suit,activeSet).color+'"',activeSet)).join('')+'</span>':'';
      return '<span class="court-window" aria-hidden="true"></span>'+wildInk+
        '<img alt="" class="court" src="'+portrait+'">'+suitsBand;
    }
    if(activeStyle && card.rank===14){
      return wildInk+'<span class="illustrated-ace" aria-hidden="true"></span>';
    }
    if(wildInk) return wildInk;
    if(card.rank===14) return '<div class="pips ace-orbit">'+stampedPip(card.suit,50,50,'ace',activeSet)+'<svg class="ace-spark" viewBox="0 0 10 10" aria-hidden="true"><path fill="currentColor" d="m5 0 1.2 3.7L10 5 6.2 6.3 5 10 3.8 6.3 0 5l3.8-1.3z"/></svg></div>';
    return '<div class="pips">'+spots[card.rank].map(([x,y])=>stampedPip(card.suit,x,y,y>50?'invert':'',activeSet)).join('')+'</div>';
  }
  const enhancementIcons={bonus:'chip',mult:'mult',wild:'stars',glass:'diamond',steel:'steel',stone:'diamond',gold:'coin',lucky:'lucky'};
  const sealIcons={red:'repeat',gold:'coin',blue:'stars',purple:'scroll'};
  function cardMarkup(c,i,n,preview=false,packTarget=null,themeOverride=null){
    const activeSet=themeOverride && 'cardSet' in themeOverride ? themeOverride.cardSet : cardSet;
    const offset=i-(n-1)/2, rot=offset*Math.min(1.7,11/(n-1 || 1));
    const rank=rankText(c.rank)+pip(c.suit,'',activeSet), debuffed=!themeOverride && run.phase==='play' && CW.debuffed(run,c);
    const bonus=Object.hasOwn(enhancementIcons,c.enhancement)?c.enhancement:'';
    const tally=c.tallyChips>0?'<span class="card-tally" aria-hidden="true">'+icon('chip')+'+'+esc(num(c.tallyChips))+'</span>':'';
    const label=[bonus==='stone'?'Stone card':cardName(c),bonus==='stone'?'':bonus,c.edition,c.seal && (c.seal+' seal'),tally && ('+'+num(c.tallyChips)+' permanent Chips'),debuffed && 'debuffed'].filter(Boolean).join(', ');
    const seal=c.seal?'<span class="wax-seal '+esc(c.seal)+'" aria-hidden="true">'+icon(sealIcons[c.seal])+'</span>':'';
    const face=bonus==='stone'?'<span class="stone-face" aria-hidden="true">'+icon('diamond')+'</span>':
      '<span class="corner-rank">'+rank+'</span>'+art(c,themeOverride)+'<span class="corner-rank flipped">'+rank+'</span>';
    const badge=bonus?'<span class="card-enhance" aria-hidden="true">'+icon(enhancementIcons[bonus])+'<b>'+esc(bonus)+'</b></span>':'';
    const finish=window.CWContent.cardFinish(c);
    const foilStamp=c.edition==='foil'?'<span class="foil-stamp" aria-hidden="true">'+icon('spark')+'</span>':'';
    const element=preview && !packTarget && !CWCardTip.mobile?'div':'button';
    const controls=packTarget
      ? 'type="button" data-cw="'+(packTarget.action==='target'?'target':'pack-target')+'" data-value="'+esc(c.id)+'" aria-pressed="'+packTarget.selected+'"'+(packTarget.disabled?' disabled':'')
      : preview?(CWCardTip.mobile?'type="button" aria-haspopup="dialog"':'role="img" tabindex="0"'):'type="button" data-card="'+esc(c.id)+'" draggable="false" aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight" aria-pressed="'+selected.has(c.id)+'"';
    return '<'+element+' '+controls+' class="playing-card'+(preview?' card-preview':'')+'" data-suit="'+esc(c.suit)+'" aria-label="'+esc(label)+'" data-edition="'+esc(c.edition || '')+'" data-enhanced="'+Boolean(bonus)+'" data-enhancement="'+esc(bonus)+'" data-debuffed="'+!!debuffed+'" '+CWCardTip.attribute(CWCardTip.details(c,debuffed))+' style="--suit:'+suitSpec(c.suit,activeSet).color+';--rot:'+rot+'deg;--arc:'+Math.min(10,offset*offset*.6)+'px">'+face+finish+foilStamp+seal+badge+tally+(debuffed?CWCardTip.cross:'')+'</'+element+'>';
  }
  function describeFamiliar(id){
    const i=run.familiars.indexOf(id);
    const it=i>=0&&(CW.ownedItem?.(run,'familiars',i) || CW.item(id));
    const box=$('relic-readout');
    box.hidden=!it;
    if(it)box.innerHTML='<strong>'+icon('spark')+esc(it.name)+'</strong><span>'+esc(it.description)+'</span>';
    if(it)window.CWContent.colorStats(box);
  }
  let observedRun;
  let familiarStates = new Map();
  function trackFamiliarUpgrades(){
    const next = new Map();
    run.familiars.forEach((ref,i)=>{
      const d = CW.ownedItem(run,'familiars',i);
      const key = d.baseId || d.id;
      const previous = familiarStates.get(key);
      const value = Number(d.stackAmount?.replace(/^x/,'') || 0);
      const gained = observedRun === run && ((d.edition && d.edition !== previous?.edition) ||
        (previous && value > previous.value));
      next.set(key,{edition:d.edition,value,at:gained ? performance.now() : observedRun === run && previous ? previous.at : -Infinity});
    });
    observedRun = run;
    familiarStates = next;
  }
  function upgradeAge(d){
    return performance.now() - (familiarStates.get(d.baseId || d.id)?.at ?? -Infinity);
  }
  function itemSlots(category,cap){
    const ids=run[category], spell=category==='consumables';
    return Array.from({length:Math.max(cap,ids.length)},(_,i)=>{
      const it=ids[i] && (CW.ownedItem?.(run,category,i) || CW.item(ids[i]));
      if(!it) return '<span class="item-slot slot-empty'+(spell?' spell-slot':'')+'" aria-hidden="true">'+icon(spell?'potion':'spark')+'</span>';
      const marks=[it.edition,it.sticker,it.status].filter(value=>typeof value==='string');
      const subtitle=marks.length?' ('+marks.join(', ')+')':'';
      const type=window.CWContent.cardType(it);
      const label=(type==='pack'?'Booster':type)+' '+it.name+subtitle+': '+it.description;
      const badge=marks.length?'<small class="item-mark" aria-hidden="true">'+esc(marks[0].charAt(0))+'</small>':'';
      const stack=it.stackAmount?'<small class="familiar-stack stat-'+(it.stackStat==='chips'?'chips':'mult')+'" aria-hidden="true">'+esc(it.stackAmount)+'</small>':'';
      const frame=window.CWFamiliarFrames;
      return '<button class="item-slot item-card"'+(frame?.attribute(it) || '')+' data-family="'+type+'" data-item="'+esc(ids[i])+'" aria-expanded="false" data-slot="'+i+'" data-base-item="'+esc(it.baseId || it.id)+'" data-edition="'+esc(it.edition || '')+'" aria-label="'+esc(label)+'" '+CWCardTip.attribute(CWCardTip.details(it))+'><img src="'+window.CWContent.portrait(it.art)+'" alt="">'+(frame?.ornament(it) || '')+window.CWContent.typeBadge(type,true)+window.CWContent.cardFinish(it,upgradeAge(it))+badge+stack+(it.bossMuted?CWCardTip.cross:'')+'<b>'+esc(it.name)+'</b></button>';
    }).join('');
  }
  function selectedInPlayOrder(){return currentHand.filter(c=>selected.has(c.id)).map(c=>c.id);}
  function handTitleMarkup(hand){
    return esc(hand.name)+' <span class="cast-hand-level">· Level '+esc(hand.level)+'</span>';
  }
  function renderSelection(){
    const view=selected.size?CW.preview(run,selectedInPlayOrder()):null;
    const baseHand=view && CW.HANDS?.[view.name];
    const baseLv=view ? Math.max(1,view.level ?? run.levels?.[view.name] ?? 1) : 1;
    const baseChips=view ? (view.baseChips ?? (baseHand ? baseHand.chips + (baseLv - 1) * baseHand.chipStep : null)) : null;
    const baseMult=view ? (view.baseMult ?? (baseHand ? baseHand.mult + (baseLv - 1) * baseHand.multStep : null)) : null;
    if(baseChips!=null && baseMult!=null){
      const chipsText=compact(baseChips), multText=compact(baseMult);
      $('chips').textContent=chipsText;
      $('mult').textContent=multText;
      $('chips').style.setProperty('--score-digits',chipsText.length);
      $('mult').style.setProperty('--score-digits',multText.length);
    }else{
      $('chips').textContent=$('mult').textContent='\u2014';
      for(const id of ['chips','mult']) $(id).style.removeProperty('--score-digits');
    }
    $('selected-count').innerHTML=Array.from({length:5},(_,i)=>'<i class="pick-slot'+(i<selected.size?' filled':'')+'" aria-hidden="true"></i>').join('')+'<span class="visually-hidden">'+selected.size+' of 5 selected</span>';
    const area=$('cast-prompt');
    area.classList.remove('scoring');
    let prompt=view ? '<h3>'+handTitleMarkup(view)+'</h3>' : '';
    if(run.playtest){
      const deal=CWPlaytest.deals[run.playtest];
      const used=run.stats.itemUses?.[run.playtest];
      const hint=used ? deal.done : deal.hint;
      if(!view) prompt='<h3>'+esc(CW.item(run.playtest).name)+'</h3>';
      prompt+='<p class="practice-hint">'+esc(hint)+'</p>';
    }
    area.innerHTML=prompt || '<div class="cast-ornament">'+icon('cards')+'</div><h3>Pick up to 5</h3>';
    for(const card of $('hand').children){
      const id=card.dataset.card;
      card.classList.toggle('will-score',!!view?.scoring?.includes(id));
      card.querySelector('.boss-partial')?.remove();
      const part=view?.suppressed?.[id];
      if(part){
        const note=part==='rank'?'Rank chips disabled':'Enhancement disabled';
        card.querySelector(part==='rank'?'.corner-rank':'.card-enhance')?.insertAdjacentHTML('beforeend',
          '<span class="boss-partial" aria-label="'+note+'" title="'+note+'">&times;</span>');
      }
    }
    for(const card of $('hand').children) card.setAttribute('aria-pressed',String(selected.has(card.dataset.card)));
    updateOrderTools();
  }
  function updateOrderTools(){
    const i=currentHand.findIndex(c=>c.id===orderCardId);
    const canMove=!busy && run.phase==='play' && i>=0;
    for(const control of document.querySelectorAll('[data-move]')){
      const next=i+Number(control.dataset.move);
      control.disabled=!canMove || next<0 || next>=currentHand.length;
    }
    for(const card of $('hand').children) card.classList.toggle('order-target',canMove && card.dataset.card===orderCardId);
  }
  function renderHand(){
    currentHand=sortedHand();
    run.hand=currentHand;
    if(!currentHand.some(c=>c.id===orderCardId))orderCardId=null;
    const hand=$('hand');
    hand.style.setProperty('--cards',Math.max(8,currentHand.length));
    hand.innerHTML=currentHand.map((c,i)=>cardMarkup(c,i,currentHand.length)).join('');
    $('hand-count').textContent=run.hand.length+' / '+CW.handSize(run);
    document.querySelectorAll('[data-sort]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.sort===(run.cardOrderMode || prefs.sort))));
  }
  function render(shouldSave=true){
    CWP.dismissPreview();
    CWP.dismissSell();
    const info=CW.blindInfo(run), capacity=CW.capacity(run);
    selected.forEach(id=>{if(!run.hand.some(c=>c.id===id))selected.delete(id);});
    $('blind-name').textContent=info.name;$('blind-type').textContent=['Opening blind','Second blind','Boss blind'][run.blind];$('blind-token').className=['','big','boss'][run.blind];
    $('practice-tools').hidden=!run.playtest;
    if(run.playtest) $('blind-type').textContent='Practice deal';
    $('target').textContent=compact(run.target);$('reward').textContent='$'+info.reward;
    $('boss-rule').hidden=run.blind!==2;$('boss-rule').textContent=run.blind===2?info.description:'';
    if(run.blind===2) window.CWContent.colorStats($('boss-rule'));
    $('round-score').textContent=compact(run.score);$('score-progress').style.width=Math.min(100,100*run.score/run.target)+'%';
    const progress=$('score-progress').parentElement;progress.setAttribute('aria-valuemax',run.target);progress.setAttribute('aria-valuenow',Math.min(run.score,run.target));
    $('hands').textContent=run.hands;$('discards').textContent=run.discards;$('money').textContent='$'+num(run.money);
    $('ante').textContent=run.ante;$('round').textContent=run.round;
    $('ante-limit').textContent=' / '+(run.rules?.anteLimit || run.anteLimit || 8);
    const stake=CW.STAKES?.[run.stakeId]?.name;
    const deck=CW.DECKS?.[run.deckId]?.name || 'Arcane Deck';
    $('deck-name').textContent=[deck,stake].filter(Boolean).join(' · ');
    $('run-status').textContent=showLobby?'Main menu':run.playtest?'Familiar playtest':['lost','won'].includes(run.phase)?'Run complete':run.phase==='shop'?'At market':'Run active';
    trackFamiliarUpgrades();
    $('familiars').innerHTML=itemSlots('familiars',capacity.familiars);$('spells').innerHTML=itemSlots('consumables',capacity.consumables);
    $('familiar-count').textContent=run.familiars.length+' / '+capacity.familiars;$('spell-count').textContent=run.consumables.length+' / '+capacity.consumables;describeFamiliar(run.familiars[0]);
    const counts={S:0,H:0,C:0,D:0};
    for(const card of run.draw) if(card.enhancement!=='stone') counts[card.suit]++;
    $('deck-suits').innerHTML=Object.entries(counts).map(([suit,n])=>
      '<span data-suit="'+suit+'" aria-label="'+suits[suit].name+': '+n+'">'+pip(suit)+'<b>'+n+'</b>'+(run.phase==='play' && CW.debuffed(run,{suit})?CWCardTip.cross:'')+'</span>').join('');
    $('deck-count').textContent=run.draw.length+' / '+run.deck.length;
    renderHand();
    document.querySelector('[data-action="play"]').disabled=busy || run.phase!=='play';
    document.querySelector('[data-action="discard"]').disabled=busy || run.phase!=='play' || run.discards<=0;
    renderSelection();
    if(shouldSave)save();
    const atTable = !showLobby && (run.phase === 'select' || run.phase === 'play');
    const bossFight = run.phase === 'play' && run.blind === 2;
    const ended = !showLobby && ['lost','won'].includes(run.phase);
    const scene = ended ? 'curtain' : atTable ? (bossFight ? 'boss' : 'play') : 'menu';
    if(scene!==lastViewKey){
      audio.setCurtain(ended);
      if(!ended) audio.setScene(scene);
      lastViewKey=scene;
    }
    if(!busy) CWP.sync();
  }
  function toggle(c){
    if(busy || run.phase!=='play' || !c)return;
    orderCardId=c.id;
    if(selected.has(c.id)){selected.delete(c.id);audio.event('deselect');}
    else if(selected.size<5){selected.add(c.id);audio.event('select',selected.size-1);}
    else{toast('You can select up to 5 cards.');audio.event('error');return;}
    renderSelection();
  }
  function moveCard(id,position,restoreFocus=false){
    if(busy || CWP.isOpen() || run.phase!=='play')return false;
    const old=currentHand.findIndex(card=>card.id===id);
    if(old<0 || position<0 || position>=currentHand.length || old===position)return false;
    const order=[...currentHand];
    order.splice(position,0,order.splice(old,1)[0]);
    run.cardOrderMode='manual';
    run.hand=order;
    orderCardId=id;
    renderHand();
    renderSelection();
    save();
    if(restoreFocus)focusCard(id);
    $('announce').textContent=cardName(order[position])+' moved to position '+(position+1)+'.';
    audio.event('select',position);
    return true;
  }
  function focusCard(id){
    [...$('hand').children].find(card=>card.dataset.card===id)?.focus({preventScroll:true});
  }
  function familiarSlot(ref, panel) {
    const index=run.familiars.indexOf(ref);
    if(index<0)return null;
    return panel ? panel.querySelector('[data-companion="'+index+'"]') : $('familiars').children[index];
  }
  const frameTimers=new WeakMap();
  function familiarCue(fact, anchors, speed=prefs.speed, still=prefs.reducedMotion) {
    if(!fact?.familiarId || !anchors.source)return false;
    const id=CWMarket.splitVariant(fact.familiarId).id;
    const drew=CWFamiliarScoreFX.play(id,{...anchors,speed,reducedMotion:still,facts:fact});
    if(drew){
      const frame=anchors.source.matches?.('[data-familiar-frame]') ? anchors.source : anchors.source.querySelector?.('[data-familiar-frame]');
      if(frame){
        if(fact.charge){
          const item=CW.ownedItem(run,'familiars',run.familiars.indexOf(fact.familiarId));
          if(item?.charge){
            const trim=frame.querySelector('.cw-familiar-trim');
            if(trim)trim.outerHTML=CWFamiliarFrames.ornament({...item,charge:{...item.charge,value:fact.charge.after}});
            const badge=frame.querySelector('.familiar-stack');
            if(badge && item.stackAmount)badge.textContent=item.stackAmount;
          }
        }
        clearTimeout(frameTimers.get(frame));
        frame.setAttribute('data-proc-active','');
        frame.setAttribute('data-proc-event',fact.event);
        if(id==='alabaster_finch' && fact.mult)frame.setAttribute('data-proc-solo','');
        if(id==='lattice_toad' && fact.contributors)frame.setAttribute('data-proc-ranks',fact.contributors.map((_,i)=>i+1).join(' '));
        if(id==='veil_firefly' && fact.contributors)frame.setAttribute('data-proc-suits',fact.contributors.map(entry=>entry.suit).join(' '));
        frameTimers.set(frame,setTimeout(()=>{
          for(const attr of ['data-proc-active','data-proc-event','data-proc-solo','data-proc-ranks','data-proc-suits'])frame.removeAttribute(attr);
        },480/speed));
      }
    }
    return drew;
  }
  const marketProcEvents={
    brass_lantern:['shop'], mire_printer:['sell'], silken_broker:['packOpen','cast'],
    granite_tinker:['packOpen'], shopbell_sprite:['shop','reroll'], vault_maggot:['reroll']
  };
  function visibleProcTarget(node){
    if(!node)return null;
    const rect=node.getBoundingClientRect();
    if(!rect.width || !rect.height)return null;
    const body=node.closest?.('.cw-body')?.getBoundingClientRect();
    const x=rect.left+rect.width/2, y=rect.top+rect.height/2;
    return x>=Math.max(0,body?.left ?? 0) && x<=Math.min(window.innerWidth ?? Infinity,body?.right ?? Infinity)
      && y>=Math.max(0,body?.top ?? 0) && y<=Math.min(window.innerHeight ?? Infinity,body?.bottom ?? Infinity) ? node : null;
  }
  function growthText(growth){
    const value=Number(growth.after.toFixed(2));
    if(growth.stat==='xmult')return '×'+value+' Mult';
    return '+'+value+(growth.stat==='chips'?' Chips':' Mult');
  }
  function procWitness(rack, item, label, value, stat){
    const tile=document.createElement('div');
    tile.className='familiar-proc-witness';
    const icon=document.createElement('span');
    if(item){
      icon.className='proc-witness-portrait';
      const portrait=document.createElement('img');
      portrait.src=CWContent.portrait(item.art);
      portrait.alt='';
      icon.append(portrait);
      if(item.kind==='familiar'){
        icon.setAttribute('data-familiar-frame',CWMarket.splitVariant(item.id).id);
        if(item.edition)icon.setAttribute('data-familiar-edition',item.edition);
        icon.insertAdjacentHTML('beforeend',CWFamiliarFrames.ornament(item));
      }
    }else icon.className='proc-witness-purse';
    const caption=document.createElement('span');
    caption.textContent=label;
    if(value){
      const amount=document.createElement('strong');
      amount.setAttribute('data-stat',stat);
      amount.textContent=value;
      caption.append(amount);
    }
    tile.append(icon,caption);
    rack.append(tile);
    return tile;
  }
  async function playFamiliarEvents(card, discardCards=[]) {
    const events=CW.drainFamiliarEvents(run);
    if(!events.length)return;
    const panel=document.querySelector('.cw-backdrop:not([hidden]) .cw-dialog');
    const messages=[];
    let discardBeat=false, marketBeat=0, rack, wallet;
    function witness(...args){
      if(!rack){
        rack=document.createElement('div');
        rack.className='familiar-proc-witnesses';
        rack.setAttribute('aria-hidden','true');
        panel.querySelector('.familiar-proc-witnesses')?.remove();
        panel.append(rack);
        setTimeout(()=>rack.remove(),Math.max(1100,1500/prefs.speed));
      }
      return procWitness(rack,...args);
    }
    for(const fact of events){
      const id=CWMarket.splitVariant(fact.familiarId).id;

      const market=marketProcEvents[id]?.includes(fact.event);
      if(!market && !(fact.event==='discard' && discardCards.length))continue;
      let source=familiarSlot(fact.familiarId,panel);
      const spell=fact.created?.find(entry=>entry.category==='consumables');
      let consumable=spell && (panel ? panel.querySelector('[data-owned-category="consumables"][data-slot="'+spell.index+'"]') : $('spells').children[spell.index]);
      let money=panel ? null : $('table-purse');
      if(panel && !visibleProcTarget(source)){
        const item=CW.ownedItem(run,'familiars',run.familiars.indexOf(fact.familiarId));
        if(!item)continue;
        const value=fact.growth ? growthText(fact.growth) : fact.money ? '+$'+fact.money : '';
        source=witness(item,item.name,value,fact.growth ? (fact.growth.stat==='chips'?'chips':'mult') : 'money');
      }
      if(panel && fact.money){
        wallet ||= visibleProcTarget(panel.querySelector('.pack-purse')) || visibleProcTarget(panel.querySelector('.cw-purse'))
          || witness(null,'Coin purse','$'+run.money.toLocaleString(),'money');
        money=wallet;
      }
      if(panel && spell && !visibleProcTarget(consumable)){
        const created=CW.item(spell.id);
        consumable=witness(created,created.name);
      }
      const startDelay=market && !prefs.reducedMotion ? Math.min(240,marketBeat*110) : 0;
      if(!familiarCue(fact,{source,card,cards:discardCards,consumable,money,startDelay}))continue;
      if(market)marketBeat++;
      let soundStep=0;
      if(market){
        const double=(id==='brass_lantern' && spell) || (id==='silken_broker' && fact.event==='packOpen')
          || (id==='shopbell_sprite' && fact.event==='reroll');
        soundStep=double ? 2 : 1;
      }
      const sound=(fact.charge?'charge-':'proc-')+id;
      if(startDelay)setTimeout(()=>{if(source?.isConnected)audio.event(sound,soundStep);},startDelay/prefs.speed);
      else audio.event(sound,soundStep);
      const name=CW.item(fact.familiarId).name;
      if(fact.money)messages.push(name+' earned $'+fact.money+'.');
      if(spell)messages.push(name+' created '+CW.item(spell.id).name+'.');
      if(fact.growth)messages.push(name+' grew to '+growthText(fact.growth)+'.');
      if(fact.charge){
        const amount=Number(fact.charge.after.toFixed(2));
        const next=fact.charge.stat==='retriggers' ? 'a repeat' :
          fact.charge.stat==='chips' ? '+'+amount+' Chips' : '×'+amount+' Mult';
        messages.push(name+' has '+next+' ready for the next hand.');
      }
      if(discardCards.length && !prefs.reducedMotion){
        discardBeat=true;
        await wait(120);
      }
    }
    if(discardBeat)await wait(200);
    if(messages.length){
      const live=panel?.querySelector('.cw-familiar-announcement') || $('announce');
      live.textContent=(discardCards.length ? live.textContent+' ' : '')+messages.join(' ');
    }
  }
  function animateCards(ids,discarding){
    const lane = $('cast-prompt').querySelector('.cw-fx-lane');
    const nodes = [...$('hand').children];
    const moving = !prefs.reducedMotion && typeof Element.prototype.animate === 'function';
    if(discarding && !moving)return [];
    const count = ids.length;
    const laneWidth = lane?.clientWidth || 0;
    const width = lane ? Math.max(15, Math.min(74, lane.clientHeight * .55, laneWidth / (1 + (count - 1) * .53))) : 0;
    const spread = Math.min(width + 4, (laneWidth - width) / Math.max(1, count - 1));
    const rowWidth = width + (count - 1) * spread;
    return ids.map((id,i)=>{
      const source = nodes.find(node=>node.dataset.card === String(id));
      if(!source || (!lane && !moving)) return null;
      const start = source.getBoundingClientRect();
      const ghost = source.cloneNode(true);
      ghost.removeAttribute('data-card');
      ghost.removeAttribute('aria-pressed');
      ghost.removeAttribute('draggable');
      ghost.setAttribute('aria-hidden','true');
      ghost.tabIndex = -1;
      ghost.disabled = true;
      ghost.classList.add('card-fly');
      source.style.visibility = 'hidden';
      let animation;
      if(discarding){
        Object.assign(ghost.style,{left:start.left+'px',top:start.top+'px',height:start.height+'px',width:start.width+'px',maxHeight:'none',transform:'none'});
        document.body.append(ghost);
        const pile=document.querySelector('[data-action="discard"]').getBoundingClientRect();
        const dx=pile.left+pile.width/2-start.left-start.width/2;
        const dy=pile.top+pile.height/2-start.top-start.height/2;
        animation=ghost.animate([
          {transform:'none',opacity:1},
          {transform:'translateY(-14px) rotate(-6deg)',offset:.24},
          {transform:'translate('+dx+'px,'+dy+'px) rotate(22deg) scale(.16)',opacity:0}
        ],{duration:fxTime(285),delay:fxTime(i*30),easing:'ease-in',fill:'both'});
      }else{
        const height = width / .707;
        ghost.classList.add('cw-fx-card');
        Object.assign(ghost.style,{left:((laneWidth-rowWidth)/2+i*spread)+'px',top:((lane.clientHeight-height)/2)+'px',height:height+'px',width:width+'px',zIndex:String(i+1)});
        ghost.style.setProperty('--fx-rank',Math.max(8,width*.29)+'px');
        lane.append(ghost);
        if(moving){
          const end = ghost.getBoundingClientRect();
          const flyFrom = 'translate('+(start.left-end.left)+'px,'+(start.top-end.top)+'px) scale('+(start.width/end.width)+','+(start.height/end.height)+')';
          animation = ghost.animate([{transform:flyFrom},{transform:'none'}],{duration:fxTime(195),delay:fxTime(i*12),easing:'cubic-bezier(.2,.77,.3,1)',fill:'backwards'});
        }
      }
      return {id,ghost,animation};
    }).filter(Boolean);
  }
  function dismissGhosts(ghosts){
    for(const {ghost,animation} of ghosts){animation?.cancel();ghost.remove();}
  }
  async function dimTableForRewards(){
    const dusk=document.createElement('div');
    dusk.className='rewards-dissolve';
    dusk.setAttribute('aria-hidden','true');
    document.body.append(dusk);
    const timing={duration:fxTime(210),easing:'ease-in-out',fill:'both'};
    const fade=dusk.animate([{opacity:0},{opacity:1}],timing);
    await fade.finished.catch(()=>{});
    return ()=>{
      const reveal=dusk.animate([{opacity:1},{opacity:0}],{...timing,duration:fxTime(340)});
      reveal.finished.then(()=>dusk.remove(),()=>dusk.remove());
    };
  }
  function showHandFireworks(){
    const layer=document.createElement('div');
    layer.className='hand-fireworks';
    layer.setAttribute('aria-hidden','true');
    layer.innerHTML=['sapphire','ruby','gold'].map((color,index)=>{
      const rays=Array.from({length:18},(_,i)=>{
        const angle=(i/18+index/48)*Math.PI*2;
        const length=i%2===0?43:31;
        const x=Math.cos(angle)*length, y=Math.sin(angle)*length;
        const endX=x.toFixed(1), endY=(y+7).toFixed(1);
        return '<path pathLength="1" d="M0 0 Q'+(x*.55).toFixed(1)+' '+(y*.55-2).toFixed(1)+' '+endX+' '+endY+'"/>'+
          '<circle cx="'+endX+'" cy="'+endY+'" r="'+(i%3===0?1.5:.9)+'"/>';
      }).join('');
      return '<div class="hand-burst '+color+'"><svg viewBox="-52 -52 104 110"><g>'+rays+'</g></svg></div>';
    }).join('');
    $('cast-zone').append(layer);
    return layer;
  }
  async function commit(discarding=false){
    if(busy || run.phase!=='play' || CWP.isOpen())return;
    if(!selected.size){toast(discarding?'Select cards to discard.':'Select up to 5 cards first.');return;}
    if(discarding && !run.discards){toast('No discards left this blind.');return;}
    const ids=selectedInPlayOrder();
    const held=new Set(currentHand.map(card=>String(card.id)));
    const area=$('cast-prompt');
    const moving=!prefs.reducedMotion && typeof Element.prototype.animate === 'function';
    const pulse=(node,keyframes,duration)=>{
      if(moving && node)node.animate(keyframes,{duration:fxTime(duration),easing:'ease-out'});
    };
    const blindTarget=run.target;
    const walletBefore=run.money;
    const discardCards=discarding ? [...$('hand').children].filter(el=>selected.has(el.dataset.card)).map(el=>el.getBoundingClientRect()) : [];
    const counters=$('chips').closest('.score-components');
    let revealRewards,fireworks;
    let ghosts=[];
    busy=true;
    CWP.dismissSell();
    try{
      const result=discarding?CW.discard(run,ids):CW.play(run,ids);
      if(!result){toast('That action is unavailable.');return;}
      selected.clear();
      save();
      document.querySelectorAll('.action-btn').forEach(el=>el.disabled=true);
      $('selected-count').textContent=discarding?'Discarding…':'Scoring…';
      audio.event(discarding?'discard':'play');
      if(discarding){
        ghosts=animateCards(ids,true);
        $('discards').textContent=run.discards;
        if(moving)await wait(285+30*(ids.length-1));
        $('announce').textContent=ids.length+' discarded. '+run.discards+' discards left.';
        // A newly woven spell needs its actual destination before its thread flies.
        $('spells').innerHTML=itemSlots('consumables',CW.capacity(run).consumables);
        await playFamiliarEvents(discardCards[0],discardCards);
        return;
      }
      area.classList.add('scoring','cw-fx-cast');
      area.innerHTML='<div class="cw-fx-lane" aria-hidden="true"></div><div class="cw-fx-receipt" aria-hidden="true"><div class="cw-fx-name"></div><div class="cw-fx-equation"><div class="potion-value score-vessel vessel-chips">'+vesselArt+'<b class="cw-fx-chips"></b></div><span>×</span><div class="potion-value score-vessel vessel-mult">'+vesselArt+'<b class="cw-fx-mult"></b></div></div><div class="cw-fx-call"></div></div>';
      const receipt=area.querySelector('.cw-fx-receipt');
      const title=area.querySelector('.cw-fx-name');
      const equation=area.querySelector('.cw-fx-equation');
      const chipText=area.querySelector('.cw-fx-chips');
      const multText=area.querySelector('.cw-fx-mult');
      const call=area.querySelector('.cw-fx-call');
      title.innerHTML=handTitleMarkup(result);
      ghosts=animateCards(ids,false);
      const scoring=new Set(result.scoring);
      const cardNodes=new Map([...$('hand').children].map(node=>[node.dataset.card,node]));
      for(const {id,ghost} of ghosts)cardNodes.set(id,ghost);
      for(const card of ghosts){if(!scoring.has(card.id))card.ghost.classList.add('cw-fx-quiet');}
      const steps=result.steps;
      let peak=-1, importance=0;
      for(let i=1;i<steps.length;i++){
        const factors=[...steps[i].text.matchAll(/[×x]\s*([\d.]+)\s*mult/gi)];
        const factor=factors.reduce((value,match)=>value*Number(match[1]),1);
        const gain=(steps[i].mult||0)-(steps[i-1].mult||0);
        const strength=factor>1?1000+factor:gain;
        if(strength>importance){
          peak=i;importance=strength;

        }
      }
      const cleared=run.phase==='payout' || run.phase==='won';
      const singleHandClear=cleared && result.total>=blindTarget;
      const rewardsHoldMs=moving?2000:450;
      const count=(chips,mult)=>{
        chipText.textContent=$('chips').textContent=compact(chips);
        multText.textContent=$('mult').textContent=compact(mult);
        $('chips').style.setProperty('--score-digits',chipText.textContent.length);
        $('mult').style.setProperty('--score-digits',multText.textContent.length);
        equation.style.setProperty('--fx-digits',chipText.textContent.length+multText.textContent.length+2);
      };
      $('hands').textContent=run.hands;
      count(steps[0]?.chips??0,steps[0]?.mult??0);
      call.textContent=result.blocked?steps[0]?.label:'Base hand';
      const shine=[{filter:'brightness(1)'},{filter:'brightness(1.22) drop-shadow(0 0 4px #edc174)',offset:.29},{filter:'brightness(1)'}];
      const featured=new Set();
      const bridgedRanks=new Set();
      const creditTimers=new WeakMap();
      function showProc(step,still){
        const fact=step.fact;
        if(!fact?.familiarId)return false;
        const first=!featured.has(fact.familiarId);
        const id=CWMarket.splitVariant(fact.familiarId).id;
        const matchingRank=id==='moss_badger' && fact.contributors?.[0]?.rank;
        const groupKey=matchingRank && fact.familiarId+'-'+matchingRank;
        const newGroup=Boolean(groupKey && !bridgedRanks.has(groupKey));
        if(!first && still && !newGroup)return false;
        const card=cardNodes.get(fact.cardId);
        const cards=fact.contributors?.map(entry=>cardNodes.get(entry.cardId));
        const face=fact.retriggers && currentHand.find(c=>c.id===fact.cardId);
        const handSlot=fact.returnCard && $('hand').querySelector('[data-card="'+fact.returnCard+'"]');
        let holdMs=260;
        const triggered=familiarCue(fact,{
          source:familiarSlot(fact.familiarId), card,cards,newGroup,handSlot,
          // Let the last scoop or wave reach the counter before showing its new total.
          onTiming:duration=>{
            if((cards && !fact.copiedFrom) || id==='alabaster_finch')holdMs=Math.max(260,Math.min(750,duration-120));
          },
          cardFace:face && {rank:face.rank,suit:face.suit,stone:face.enhancement==='stone'},
          neighbor:fact.copiedFrom && familiarSlot(fact.copiedFrom),
          chips:chipText,mult:multText,money:$('table-purse')
        },prefs.speed*(first?1:2),still);
        if(triggered){
          if(handSlot && card && !still){
            const from=card.getBoundingClientRect(), to=handSlot.getBoundingClientRect();
            card.classList.remove('cw-fx-quiet');
            card.animate([{transform:'none'},{transform:'translate('+(to.left-from.left)+'px,'+(to.top-from.top)+'px)'}],
              {duration:fxTime(360),fill:'forwards',easing:'ease-in-out'});
            holdMs=390;
          }
          featured.add(fact.familiarId);
          if(newGroup)bridgedRanks.add(groupKey);
          if(cards && !fact.copiedFrom){
            // Brighten the actual cards supplying this reward during its cue.
            const credited=new Set(cards);
            if(matchingRank)credited.add(card);
            for(const node of credited){
              if(!node)continue;
              clearTimeout(creditTimers.get(node));
              node.setAttribute('data-proc-credit',fact.mult?'mult':fact.retriggers || fact.skippedRank?'rule':'chips');
              const hold=first?Math.max(520,holdMs):300;
              creditTimers.set(node,setTimeout(()=>node.removeAttribute('data-proc-credit'),fxTime(hold)));
            }
          }
        }
        return triggered && {id,first,holdMs};
      }
      if(moving){
        await wait(180);
        const beat=Math.min(115,Math.floor(1250/Math.max(1,steps.length-1)));
        let wallet=walletBefore;
        for(let i=1;i<steps.length;i++){
          const step=steps[i],last=steps[i-1],strongest=i===peak;
          const signature=showProc(step,false);
          if(signature && signature.first){
            audio.event('proc-'+signature.id,Number(signature.id==='alabaster_finch' && Boolean(step.fact.mult)));
            await wait(signature.holdMs);
          }
          count(step.chips??0,step.mult??0);
          if(step.fact?.money){wallet+=step.fact.money;$('money').textContent='$'+num(wallet);}
          call.textContent=step.fact?.familiarId || step.fact?.event==='tally' ? step.label+' · '+step.text : step.text;
          window.CWContent.colorStats(call);
          call.classList.toggle('cw-fx-peak',strongest);
          let source=ghosts.find(c=>c.id===step.cardId)?.ghost;
          if(!source && step.cardId)source=[...$('hand').children].find(c=>c.dataset.card===String(step.cardId));
          if(step.familiarId)source=[...$('familiars').children].find(c=>c.dataset.item===step.familiarId || c.dataset.baseItem===step.familiarId);
          if(!signature)pulse(source,shine,190);
          if(source && !signature){
            const multGain=step.mult-last.mult;
            const chipGain=step.chips-last.chips;
            const badge=document.createElement('b');
            badge.className='score-ticket'+(multGain?' mult-ticket':'');
            const chipsLabel=chipGain?'+'+compact(chipGain)+' Chips':'';
            const multLabel=multGain?(step.text.match(/[×x]\s*[\d.]+\s*mult/i)?.[0] || '+'+compact(multGain)+' Mult'):'';
            badge.textContent=[chipsLabel,multLabel].filter(Boolean).join(' · ');
            window.CWContent.colorStats(badge);
            const box=source.getBoundingClientRect();
            badge.style.left=(box.left+box.width/2)+'px';
            badge.style.top=(box.top+4)+'px';
            if(multGain || chipGain){
              document.body.append(badge);
              badge.animate([{opacity:0,transform:'translate(-50%,0) scale(.7)'},{opacity:1,transform:'translate(-50%,-12px) scale(1.13)',offset:.22},{opacity:1,offset:.68},{opacity:0,transform:'translate(-50%,-33px)'}],{duration:fxTime(460)}).onfinish=()=>badge.remove();
            }
            pulse(source,[{translate:'0 0'},{translate:'0 -8px',rotate:'-3deg',offset:.3},{translate:'0 0'}],210);
          }
          if(last.chips!==step.chips)pulse(chipText,[{scale:'1.16'},{scale:'1'}],135);
          if(last.mult!==step.mult)pulse(multText,[{scale:strongest?'1.31':'1.16'},{scale:'1'}],190);
          if(!signature && (i<=6 || strongest || i===steps.length-1))audio.event('score',Math.min(8,i));
          await wait(beat+(strongest?210:0));
        }
      }else{
        for(const step of steps)showProc(step,true);
      }
      count(result.chips,result.mult);
      if(cleared)title.textContent=singleHandClear?'One-hand clear':'Blind cleared';
      call.classList.remove('cw-fx-peak');
      const handTotal='+'+compact(result.total);
      if(cleared){
        call.textContent=handTotal;
        call.classList.add('cw-winning-total');
        if(singleHandClear){
          if(moving)fireworks=showHandFireworks();
          for(const group of [equation,counters]){
            group.style.setProperty('--brew-cycle',fxTime(rewardsHoldMs)+'ms');
            group.classList.add('potion-eruption');
          }
        }
      }else{
        if(result.blocked)call.textContent=steps[0]?.text || 'Blocked by the blind';
        else if(peak>0){call.textContent=steps[peak].text;window.CWContent.colorStats(call);}
        else call.textContent=compact(result.chips)+' x '+compact(result.mult);
        equation.classList.add('cw-fx-total');
        equation.textContent=handTotal;
        equation.style.setProperty('--fx-digits',handTotal.length);
      }
      receipt.classList.toggle('cw-fx-cleared',cleared);
      $('round-score').textContent=compact(run.score);
      $('score-progress').style.width=Math.min(100,100*run.score/run.target)+'%';
      $('score-progress').parentElement.setAttribute('aria-valuenow',Math.min(run.score,run.target));
      if(moving){
        $('round-score').classList.add('score-pop');
        pulse(cleared?call:equation,[{scale:'.94'},{scale:'1.04',offset:.4},{scale:'1'}],260);
      }
      const activated=[...featured].map(ref=>CW.item(ref).name).join(', ');
      const tallyNotice=run.tallyPerPlay?' Each played card banked '+num(run.tallyPerPlay)+' Chips.':'';
      $('announce').textContent=result.name+', '+num(result.total)+' chips. Round score '+num(run.score)+'.'+tallyNotice+(activated?' Activated '+activated+'.':'')+(cleared?' Blind cleared.':'');
      if(cleared)audio.event('win');
      if(run.phase==='lost')audio.event('lose');
      const toRewards=moving && run.phase==='payout';
      if(cleared)await wait(rewardsHoldMs);
      else await wait(moving?380:160);
      if(toRewards)revealRewards=await dimTableForRewards();
    }finally{
      fireworks?.remove();
      counters.classList.remove('potion-eruption');
      dismissGhosts(ghosts);
      area.classList.remove('cw-fx-cast','scoring');
      $('round-score').classList.remove('score-pop');
      busy=false;
      render(false);
      revealRewards?.();
      if(run.phase==='play'){
        audio.event('deal');
        if(discarding && moving){
          const deck=document.querySelector('.deck-art').getBoundingClientRect();
          const incoming=[...$('hand').children].filter(node=>!held.has(node.dataset.card));
          incoming.forEach((node,i)=>{
            const slot=node.getBoundingClientRect();
            node.animate([
              {translate:(deck.left-slot.left)+'px '+(deck.top-slot.top)+'px',scale:'.4',rotate:'14deg',opacity:0},
              {opacity:1,offset:.28},
              {translate:'0 0',scale:'1',rotate:'0deg',opacity:1}
            ],{duration:fxTime(295),delay:fxTime(i*32),fill:'backwards',easing:'cubic-bezier(.18,.8,.28,1)'});
          });
        }
      }
    }
  }
  function startPractice(id){
    if(busy)return;
    const practice=CWPlaytest.start(id);
    if(!practice)return;
    if(!suspendedRun)suspendedRun={run,selected:[...selected],orderCardId,note:$('save-note').innerHTML};
    run=practice;
    selected.clear();
    orderCardId=null;
    showLobby=false;
    audio.event('deal');
    render();
    $('hand').querySelector('button')?.focus({preventScroll:true});
  }
  function restart(deckId,seed,stakeId,challengeId){
    suspendedRun=null;
    selected.clear();
    orderCardId=null;
    run=CW.newRun(seed,deckId || 'arcane',{stakeId,challengeId,unlocked:profileStore.getProgress().unlocked});
    hasRun=true;
    showLobby=false;
    busy=false;
    audio.event('deal');
    render();
  }
  function showMenu(){
    if(busy)return false;
    if(suspendedRun){
      run=suspendedRun.run;
      selected.clear();
      suspendedRun.selected.forEach(id=>selected.add(id));
      orderCardId=suspendedRun.orderCardId;
      $('save-note').innerHTML=suspendedRun.note;
      suspendedRun=null;
    }
    showLobby=true;
    render(false);
    return true;
  }
  function continueRun(){
    if(!hasRun)return false;
    if(showLobby){
      profileStore.resumeRun(run);
      announceUnlocks();
    }
    showLobby=false;
    render(false);
    return true;
  }
  function changeProfile(result){
    if(!result)return null;
    clearTimeout(unlockTimer);
    unlockTimer=null;
    unlockQueue.length=0;
    $('familiar-unlock').hidden=true;
    selected.clear();
    orderCardId=null;
    applyCardStyle();
    run=loadRun();
    hasRun=Boolean(run);
    showLobby=true;
    if(!run)run=CW.newRun(undefined,'arcane');
    render();
    return result;
  }
  function openPanel(name,id){if(!busy)CWP.open(name,id);}
  for(const name of ['pointerover','focusin'])$('familiars').addEventListener(name,e=>{const item=e.target.closest('[data-item]');if(item)describeFamiliar(item.dataset.item);});
  $('familiars').addEventListener('pointerleave',()=>describeFamiliar(run.familiars[0]));
  document.addEventListener('pointerdown',()=>audio.unlock(),{capture:true,once:true});
  document.addEventListener('keydown',()=>audio.unlock(),{capture:true,once:true});
  const hand=$('hand');
  hand.addEventListener('focusin',e=>{
    const card=e.target.closest('[data-card]');
    if(card && orderCardId!==card.dataset.card){
      orderCardId=card.dataset.card;
      updateOrderTools();
    }
  });
  // Capture the pointer so overlapping cards and gaps remain valid drop positions.
  let drag=null, longPress=null, suppressClick=false;
  const movable='#hand [data-card], #familiars [data-item], .companion-slots [data-companion]';
  function clearLongPress(){if(longPress){clearTimeout(longPress.timer);longPress=null;}}
  document.addEventListener('dragstart',e=>{if(e.target.closest(movable))e.preventDefault();});
  document.addEventListener('contextmenu',e=>{if(CWCardTip.mobile && e.target.closest('#hand [data-card]'))e.preventDefault();});
  document.addEventListener('pointerdown',e=>{
    suppressClick=false;
    clearLongPress();
    const card=e.target.closest(movable);
    if(!card || busy || !e.isPrimary || e.button!==0 || drag)return;
    if((CWCardTip.mobile || e.pointerType==='touch') && card.dataset.card!==undefined){
      const id=e.pointerId, x=e.clientX, y=e.clientY;
      longPress={id,x,y,timer:setTimeout(()=>{
        longPress=null;
        if(busy || CWP.isOpen() || !card.isConnected)return;
        if(drag && !drag.active && drag.card===card)drag=null;
        const handCard=currentHand.find(c=>String(c.id)===card.dataset.card);
        if(!handCard)return;
        suppressClick=true;
        CWP.inspectSelection(card,()=>toggle(handCard),selected.size>=5 && !selected.has(handCard.id));
      },450)};
    }
    const cards=[...card.parentElement.children].filter(el=>el.matches(movable));
    if(cards.length<2)return;
    const slots=cards.map(el=>({
      x:el.offsetLeft+el.offsetWidth/2, y:el.offsetTop+el.offsetHeight/2,
      rotation:el.style.getPropertyValue('--rot'), arc:el.style.getPropertyValue('--arc')
    }));
    const from=cards.indexOf(card);
    drag={card,cards,slots,id:e.pointerId,x:e.clientX,y:e.clientY,from,to:from,active:false};
    card.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove',e=>{
    if(longPress && longPress.id===e.pointerId && Math.hypot(e.clientX-longPress.x,e.clientY-longPress.y)>=6)clearLongPress();
    if(!drag || drag.id!==e.pointerId)return;
    const {card,cards,slots,from}=drag, dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    if(!drag.active && Math.hypot(dx,dy)<6)return;
    clearLongPress();
    drag.active=true;
    card.classList.add('lifted');
    card.style.translate=dx+'px '+dy+'px';
    const distances=slots.map(slot=>Math.hypot(slot.x-slots[from].x-dx,slot.y-slots[from].y-dy));
    const to=distances.indexOf(Math.min(...distances));
    if(to===drag.to)return;
    drag.to=to;
    const order=cards.slice();
    order.splice(to,0,order.splice(from,1)[0]);
    order.forEach((el,position)=>{
      if(el===card)return;
      const origin=slots[cards.indexOf(el)], target=slots[position];
      el.classList.add('reorder-preview');
      el.style.translate=(target.x-origin.x)+'px '+(target.y-origin.y)+'px';
      if(target.rotation)el.style.setProperty('--rot',target.rotation);
      if(target.arc)el.style.setProperty('--arc',target.arc);
    });
  });
  function endDrag(e){
    if(longPress && longPress.id===e.pointerId)clearLongPress();
    if(!drag || drag.id!==e.pointerId)return;
    const {card,cards,slots,from,to,active}=drag;
    drag=null;
    if(!active)return;
    cards.forEach((el,i)=>{
      el.classList.remove('lifted','reorder-preview');
      el.style.translate='';
      if(slots[i].rotation)el.style.setProperty('--rot',slots[i].rotation);
      if(slots[i].arc)el.style.setProperty('--arc',slots[i].arc);
    });
    suppressClick=true;
    if(e.type!=='pointerup' || from===to || busy)return;
    if(card.dataset.card)moveCard(card.dataset.card,to,true);
    else if(CW.reorder(run,from,to))render();
  }
  for(const event of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(event,endDrag);
  document.addEventListener('click',e=>{
    if(suppressClick && e.detail){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}
  },true);
  document.addEventListener('click',e=>{
    if(CWP.isOpen())return;
    const button=e.target.closest('button');if(!button || button.disabled)return;
    if(button.dataset.card!==undefined){
      const card=currentHand.find(c=>String(c.id)===button.dataset.card);
      return toggle(card);
    }
    if(button.dataset.move){
      const i=currentHand.findIndex(c=>c.id===orderCardId);
      if(moveCard(orderCardId,i+Number(button.dataset.move)) && button.disabled)focusCard(orderCardId);
      return;
    }
    if(button.dataset.sort && !busy){
      run.cardOrderMode=prefs.sort=button.dataset.sort;
      store(prefKey,prefs);
      audio.event('select');
      return render();
    }
    if(button.dataset.item && !busy)return CWP.toggleSell(button,Number(button.dataset.slot),button.closest('#spells')?'consumables':'familiars');
    const a=button.dataset.action;
    if(a==='deck' && CWCardTip.mobile && !busy){
      const counts=Array.from($('deck-suits').children,node=>node.getAttribute('aria-label')+(node.querySelector('.boss-cross')?' (debuffed)':''));
      return CWP.inspect(button,[{label:'View deck',run:()=>openPanel('deck')}],{text:['Draw pile',$('deck-count').textContent+' cards',...counts].join('\n')});
    }
    if(a==='mute')setSetting('muted',!prefs.muted);
    else if(a==='retry-practice' && run.playtest)startPractice(run.playtest);
    else if(a==='menu')showMenu();
    else if(a==='play' || a==='discard')void commit(a==='discard');
    else if(a)openPanel(a);
  });
  document.addEventListener('keydown',e=>{
    if(CWP.isOpen() || busy || e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey)return;
    if(e.altKey){
      const card=e.target.closest?.('[data-card]');
      if(card && ['ArrowLeft','ArrowRight'].includes(e.key)){
        e.preventDefault();
        const i=currentHand.findIndex(c=>c.id===card.dataset.card);
        moveCard(card.dataset.card,i+(e.key==='ArrowLeft'?-1:1),true);
      }
      return;
    }
    const k=e.key.toLowerCase();
    if(/^[1-9]$/.test(k)){e.preventDefault();toggle(currentHand[Number(k)-1]);}
    else if(k==='enter' && (!document.activeElement?.closest('button') || document.activeElement.matches('.playing-card,[data-action="play"]'))){e.preventDefault();void commit();}
    else if(k==='d'){e.preventDefault();void commit(true);}
    else if(k==='escape'){selected.clear();renderSelection();}
    else if(k==='h')openPanel('guide');
    else if(k==='m')showMenu();
  });
  function moveFocus(direction){
    const scope=document.querySelector('.moon-preview[open]') || document.querySelector('.cw-backdrop:not([hidden])') || document.querySelector('.game');
    const controls=[...scope.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary')].filter(el=>el.getClientRects().length);
    const active=document.activeElement;
    if(!controls.includes(active)){controls[0]?.focus();return;}
    const horizontal=direction>=14;
    const sign=direction===12 || direction===14?-1:1;
    if(active instanceof HTMLSelectElement && horizontal){
      const enabled=Array.from(active.options).flatMap((option,i)=>option.disabled?[]:[i]);
      const next=enabled[enabled.indexOf(active.selectedIndex)+sign];
      if(next!==undefined){
        active.selectedIndex=next;
        active.dispatchEvent(new Event('change',{bubbles:true}));
      }
      return;
    }
    if(active.matches('input[type="range"]') && horizontal){
      if(sign<0)active.stepDown();
      else active.stepUp();
      active.dispatchEvent(new Event('input',{bubbles:true}));
      active.dispatchEvent(new Event('change',{bubbles:true}));
      return;
    }
    const center=el=>{
      const box=el.getBoundingClientRect();
      return [box.left+box.width/2,box.top+box.height/2];
    };
    const [x,y]=center(active);
    let neighbor, distance=Infinity;
    for(const control of controls){
      const [cx,cy]=center(control);
      const step=(horizontal?cx-x:cy-y)*sign;
      const across=Math.abs(horizontal?cy-y:cx-x);
      if(step<=1 || step+across*3>=distance)continue;
      neighbor=control;
      distance=step+across*3;
    }
    neighbor?.focus();
  }
  let pollHandle=0, pressed=new Set();
  function pollGamepad(){
    const pad=[...(navigator.getGamepads?.() || [])].find(c=>c && c.mapping==='standard');
    if(!pad){pollHandle=0;pressed.clear();return;}
    const active=new Set([...pad.buttons].flatMap((button,i)=>button.pressed?[i]:[]));
    if(pad.axes[0]<-.55)active.add(14);
    if(pad.axes[0]>.55)active.add(15);
    if(pad.axes[1]<-.55)active.add(12);
    if(pad.axes[1]>.55)active.add(13);
    if(!document.hidden)for(const code of active){
      if(pressed.has(code))continue;
      if(code>=12 && code<=15)moveFocus(code);
      else if(code===0)document.activeElement?.click?.();
      else if(code===1)document.activeElement?.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,cancelable:true,key:'Escape'}));
      else if(code===2 || code===3)void commit(code===2);
      else if(code===4 || code===5){
        const i=currentHand.findIndex(c=>c.id===orderCardId);
        moveCard(orderCardId,i+(code===4?-1:1),true);
      }else if(code===9)showMenu();
    }
    pressed=active;
    pollHandle=requestAnimationFrame(pollGamepad);
  }
  window.addEventListener('gamepadconnected',()=>{if(!pollHandle)pollGamepad();});
  CWP.configure({
    cardPreview:(c,packTarget,layout)=>cardMarkup(c,layout?.index ?? 0,layout?.total ?? 1,true,packTarget,layout?.theme || null),
    getState:()=>run,
    getSelection:spell=>['rankCopy','suitCopy'].includes(spell?.effect) ? [...selected] : selectedInPlayOrder(),
    getSettings:()=>({...prefs}),
    getProgress:()=>profileStore.getProgress(),
    equipCardStyle:id=>{
      if(!profileStore.equipCardStyle(id))return false;
      applyCardStyle();
      render(false);
      return true;
    },
    equipCardSet:id=>{
      if(!profileStore.equipCardSet(id))return false;
      applyCardStyle();
      render(false);
      return true;
    },
    setDeckDifficulty:(deckId,stakeId)=>profileStore.setDeckDifficulty(deckId,stakeId),
    getProfiles:()=>profileStore.profiles(),
    changeProfile:id=>changeProfile(profileStore.switchProfile(id)),
    createProfile:name=>changeProfile(profileStore.createProfile(name)),
    wantsLobby:()=>showLobby,
    hasSavedRun:()=>hasRun,
    hasRun:()=>hasRun,
    showMenu,continueRun,setSetting,restart,startPractice,
    upgradeAge,saveRun:save,toast,onChange:render,playFamiliarEvents,
    playSound:(name,step)=>audio.event(name,step)
  });
  updatePrefs();render();
})();
