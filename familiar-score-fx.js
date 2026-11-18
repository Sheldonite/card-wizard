(function (root) {
  "use strict";

  const svgNS = "http://www.w3.org/2000/svg";
  const scenes = new Map();
  const active = new Map();
  let layer;

  function svg(tag, attributes = {}) {
    const node = document.createElementNS(svgNS, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    return node;
  }
  function anchor(value) {
    if (!value) return null;
    const rect = value.getBoundingClientRect ? value.getBoundingClientRect() : value;
    const width = rect.width ?? rect.w ?? 0;
    const height = rect.height ?? rect.h ?? 0;
    const x = rect.left == null ? rect.x : rect.left + width / 2;
    const y = rect.top == null ? rect.y : rect.top + height / 2;
    if (![x, y].every(Number.isFinite) || (value.getBoundingClientRect && (!width || !height))) return null;
    return {x, y, w:width, h:height};
  }
  function point(at, dx = 0, dy = 0) {
    return at && {x:at.x + dx, y:at.y + dy, w:0, h:0};
  }
  function remove(group) {
    clearTimeout(active.get(group));
    active.delete(group);
    for (const animation of group.getAnimations?.({subtree:true}) || []) animation.cancel();
    group.remove();
    if (!active.size) { layer?.remove(); layer = null; }
  }
  function clear() {
    for (const group of [...active.keys()]) remove(group);
  }
  function attachment() {
    // The game's panels are ordinary fixed layers. A native modal, if present,
    // owns its top layer and therefore also owns any overlay above its contents.
    return document.querySelector("dialog:modal") || document.body;
  }
  function play(id, options = {}) {
    const draw = scenes.get(id);
    const source = anchor(options.source);
    if (!draw || !source) return false;
    const host = attachment();
    if (!host) return false;
    if (layer && layer.parentNode !== host) clear();
    if (active.size >= 12) remove(active.keys().next().value);
    if (!layer) {
      layer = svg("svg", {class:"familiar-proc-layer", "aria-hidden":"true", focusable:"false"});
      host.append(layer);
    }
    const group = svg("g", {"data-familiar-proc":id});
    layer.append(group);
    const speed = Math.min(4, Math.max(.35, Number(options.speed) || 1));
    const leadIn = Math.min(240, Math.max(0, Number(options.startDelay) || 0));
    const still = options.reducedMotion || root.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !group.animate;
    const fx = {source, point, still, cardFace:options.cardFace, newGroup:options.newGroup};
    // A single Wild can occupy several suit slots. Preserve their positions even
    // when another contributor has no visible card in this layout.
    if (Array.isArray(options.cards)) fx.cards = options.cards.map(anchor);
    // Extra anchor names allow shop and consumable effects to share this layer.
    for (const [name, value] of Object.entries(options)) {
      if (name === "facts" || name === "source" || name === "cards" || name === "cardFace" || !value || typeof value !== "object") continue;
      const location = anchor(value);
      if (location) fx[name] = location;
    }
    let lifespan = 0;
    let elements = 0;
    function motion(node, frames, delay, duration) {
      delay = (leadIn + Math.min(1000, Math.max(0, delay))) / speed;
      duration = Math.min(1100, Math.max(65, duration)) / speed;
      lifespan = Math.max(lifespan, delay + duration);
      node.animate(frames, {delay, duration, fill:"both", easing:"linear"});
    }
    fx.sprite = (markup, cssClass, from, to = from, settings = {}) => {
      if (!from || !to || elements >= 26 || (still && elements)) return;
      const {size = 32, arc = 0, rotation = 0, delay = 0, duration = 420, scale = 1} = settings;
      elements++;
      const sprite = svg("g", {class:"familiar-proc-mark " + cssClass});
      const glyph = svg("svg", {x:-size/2,y:-size/2,width:size,height:size,viewBox:"0 0 32 32",overflow:"visible"});
      // Only authored SVG paths from locally registered scenes reach this call.
      glyph.innerHTML = markup;
      sprite.append(glyph);
      group.append(sprite);
      if (still) {
        sprite.setAttribute("transform", "translate(" + from.x + " " + from.y + ")");
        lifespan = 280;
        return;
      }
      const frames = [0, .16, .36, .55, .77, .9, 1].map(t => {
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t - 4 * arc * t * (1 - t);
        const zoom = t < .16 ? .65 : t > .9 ? .72 : 1;
        return {offset:t, transform:"translate("+x+"px,"+y+"px) rotate("+(rotation*t)+"deg) scale("+(zoom*scale)+")", opacity:t === 0 || t === 1 ? 0 : 1};
      });
      motion(sprite, frames, delay, duration);
    };
    fx.trail = (from, to, {color = "#f9dea4", arc = 0, delay = 0, duration = 370, width = 3} = {}) => {
      if (still || !from || !to || elements >= 26) return;
      elements++;
      const midX = (from.x + to.x)/2, midY = (from.y + to.y)/2 - 2*arc;
      const path = svg("path", {
        class:"familiar-proc-trail", d:"M"+from.x+" "+from.y+" Q"+midX+" "+midY+" "+to.x+" "+to.y,
        fill:"none", stroke:color, "stroke-width":width, "stroke-linecap":"round", pathLength:100,
        "stroke-dasharray":"24 120"
      });
      group.append(path);
      motion(path, [{strokeDashoffset:"24",opacity:0},{offset:.12,opacity:.95},{offset:.85,opacity:.8},{strokeDashoffset:"-100",opacity:0}],delay,duration);
    };
    fx.burst = (at,{color = "#ffd787", count = 5, reach = 20, delay = 0, duration = 280} = {}) => {
      if (still || !at) return;
      count = Math.max(1,Math.min(9,count));
      for (let i=0;i<count;i++) {
        const angle = -Math.PI/2 + i*2*Math.PI/count;
        const end = point(at,Math.cos(angle)*reach,Math.sin(angle)*reach);
        fx.sprite('<path fill="'+color+'" d="M12 2h8v9h9v9h-9v10h-8V20H3v-9h9z"/>',"proc-speck",at,end,{size:i%2 ? 5 : 8,delay,duration,rotation:45});
      }
    };
    try {
      draw(fx, options.facts || {});
    } finally {
      active.set(group, setTimeout(()=>remove(group), lifespan + 35));
    }
    if (!elements) remove(group);
    else if (!still) options.onTiming?.(lifespan * speed);
    return elements > 0;
  }

  const ink = "#282035";
  const minnow = '<path fill="'+ink+'" d="M1 10l8 3 4-6h11l7 7v4l-7 5H13l-5-5-7 5z"/><path fill="#4194bc" d="m3 13 7 2 5-5h8l6 5-7 5h-8l-4-4-7 4z"/><path fill="#b9fff2" d="m11 15 5-4h6l4 3-9 3h-5z"/><path fill="#eec879" d="m13 10 2-5 6 4zm3 10 1 5 5-5z"/><path fill="'+ink+'" d="M23 12h3v3h-3z"/>';
  const pebble = '<path fill="#233d64" d="M5 11l7-6h11l5 6v11l-6 5H11l-6-5z"/><path fill="#47a5d2" d="m8 13 6-5h8l3 5v8l-5 3h-7l-5-4z"/><path fill="#d7ffee" d="m9 14 6-5h5v3l-7 4z"/>';
  const bell = '<path fill="'+ink+'" d="M13 2h6v3l6 5v9l4 4v3H3v-3l4-4v-9l6-5z"/><path fill="#b7ccdb" d="M10 11l5-4h3l5 4v8l3 4H6l4-4z"/><path fill="#fcdf92" d="M14 3h4v4h-4zM6 22h20v3H6zm7 4h6l-2 4h-3z"/><path fill="#fff2c9" d="M12 10h4v3h-3v6h-3v-6h2z"/><path fill="#627889" d="M19 11h3v8h-3z"/>';
  const ring = '<g fill="none" stroke-linecap="square"><ellipse cx="16" cy="16" rx="10" ry="12" stroke="#5f778c" stroke-width="4"/><ellipse cx="16" cy="16" rx="11" ry="13" stroke="#ffdf90" stroke-width="2"/><path d="m2 5 3 2m22 18 3 2" stroke="#fff5ca" stroke-width="2"/></g>';
  const press = '<path fill="'+ink+'" d="M6 27v-5h9v-3h-4v-5l2-5 9-7h7l-1 7-9 8h-2v5h9v5z"/><path fill="#c57e49" d="M8 23h16v3H8zm5-9 2-4 8-6h4l-1 4-8 7-5 2z"/><path fill="#ffe1a0" d="m14 16 10-10 2-1-9 11zM9 23h14v1H9z"/>';
  const stamp = '<circle cx="16" cy="16" r="12" fill="#8e4b32" stroke="#ffda85" stroke-width="2"/><circle cx="16" cy="16" r="9" fill="none" stroke="#e8aa65"/><path fill="#ffeab4" d="m9 20 5-9 8-3-3 9-5 1-4 5z"/>';
  const coin = '<path fill="#805329" stroke="#3c2931" stroke-width="2" d="m7 5 14-2 5 4v17l-5 5-14-1-3-4V10z"/><path fill="#eeb34a" d="m8 7 11-2 4 3v14l-5 4-10-1-2-4V11z"/><path fill="none" stroke="#ffeaa4" stroke-width="2" d="m10 10 7-2 3 2v10l-3 3-6-1-2-3z"/><path fill="#fff1bc" d="m14 11 4 4-4 5-3-4z"/>';

  scenes.set("daybreak_minnow", (fx, facts) => {
    if (facts.event !== "heldCard" || !facts.chips) return;
    const card = fx.card || fx.source;
    const chips = fx.chips || card;
    const double = facts.chips === 14;
    fx.sprite(minnow,"proc-minnow",fx.source,card,{size:41,arc:34,duration:330});
    fx.trail(fx.source,card,{color:"#75dee5",arc:34,duration:330,width:4});
    fx.burst(card,{color:double?"#fff0a5":"#b9ffff",delay:230,reach:15,count:5});
    const drops = double ? 2 : 1;
    for (let i=0;i<drops;i++) {
      const from = point(card,i ? 9 : -5,0);
      fx.sprite(pebble,"proc-pebble",from,chips,{size:18,arc:26+i*14,rotation:i ? -45 : 35,delay:245+i*65,duration:320});
      fx.trail(from,chips,{color:i ? "#ffe39b" : "#8ae9f4",arc:26+i*14,delay:250+i*65,duration:320,width:2});
    }
  });
  scenes.set("tin_echo", (fx, facts) => {
    if (facts.event !== "scoredCard" || !facts.retriggers) return;
    const card = fx.card || fx.source;
    const left = point(fx.source,-9,-6), right = point(fx.source,9,-6);
    fx.sprite(bell,"proc-bell",left,point(left,-3,-2),{size:27,rotation:-23,duration:350});
    fx.sprite(bell,"proc-bell",right,point(right,3,-2),{size:27,rotation:23,delay:48,duration:350});
    for (let i=0;i<2;i++) {
      const origin = i ? right : left;
      fx.trail(origin,card,{color:i ? "#ffe19a" : "#b8e6f5",arc:20-i*14,delay:95+i*60,width:3});
      fx.sprite(ring,"proc-wave",origin,card,{size:21+i*8,arc:20-i*14,delay:95+i*60,duration:350});
    }
    fx.burst(card,{color:"#ffe5ab",count:6,reach:19,delay:420});
  });
  scenes.set("copper_plover", (fx,facts) => {
    if (facts.event !== "scoredCard" || !facts.chips) return;
    const card = fx.card || fx.source;
    fx.sprite(press,"proc-press",fx.source,point(card,0,-7),{size:43,arc:35,duration:230,rotation:-9});
    fx.sprite(stamp,"proc-stamp",card,card,{size:34,delay:180,duration:255});
    fx.trail(card,fx.chips || card,{color:"#b8e8ff",arc:18,delay:195,width:4});
    fx.burst(card,{color:"#e5a666",count:5,reach:24,delay:185});
    if (facts.money > 0) {
      const purse = fx.money || fx.source;
      fx.sprite(coin,"proc-coin",card,purse,{size:27,arc:48,delay:225,duration:495,rotation:35});
      fx.trail(card,purse,{color:"#ffda72",arc:48,delay:225,duration:495,width:3});
      fx.burst(purse,{color:"#ffe39e",count:4,reach:13,delay:660,duration:180});
    }
  });
  root.CWFamiliarScoreFX = {play,clear,register:(id,draw)=>scenes.set(id,draw)};
})(window);
