(function (root) {
  "use strict";

  // Animate a small patch of the painted banner, in its original art coordinates.
  const width = 400, height = 256, step = 16;
  const cols = width / step + 1, rows = height / step + 1;
  const idleFrames = new Map();
  let scene, surface, brush, portrait, vertices, scheduled = false, lastPaint = -Infinity;
  let saleVisit = "", swipeStart = -Infinity, swipePending = false;

  function influence(x,y,cx,cy,rx,ry) {
    const t = Math.max(0,1 - ((x-cx)/rx)**2 - ((y-cy)/ry)**2);
    return t*t;
  }
  function vertex(x,y) {
    return {x,y,dx:x,dy:y,head:influence(x,y,148,105,133,98),tail:influence(x,y,338,151,69,76),
      paw:influence(x,y,105,226,45,35) + .25*influence(x,y,73,206,37,36)};
  }
  function triangle(a,b,c) {
    const mx=(a.dx+b.dx+c.dx)/3, my=(a.dy+b.dy+c.dy)/3;
    brush.save();
    brush.beginPath();
    // Slightly overlap the painted triangles to keep antialiasing off their seams.
    brush.moveTo(mx+(a.dx-mx)*1.06,my+(a.dy-my)*1.06);
    brush.lineTo(mx+(b.dx-mx)*1.06,my+(b.dy-my)*1.06);
    brush.lineTo(mx+(c.dx-mx)*1.06,my+(c.dy-my)*1.06);
    brush.closePath();
    brush.clip();
    const scaleX=(b.dx-a.dx)/(b.x-a.x), skewY=(b.dy-a.dy)/(b.x-a.x);
    const skewX=(c.dx-a.dx)/(c.y-a.y), scaleY=(c.dy-a.dy)/(c.y-a.y);
    brush.setTransform(scaleX,skewY,skewX,scaleY,a.dx-scaleX*a.x-skewX*a.y,a.dy-skewY*a.x-scaleY*a.y);
    const x=Math.max(0,Math.min(a.x,b.x)-1), y=Math.max(0,Math.min(a.y,c.y)-1);
    const w=Math.min(width-x,step+2), h=Math.min(height-y,step+2);
    brush.drawImage(portrait,x,y,w,h,x,y,w,h);
    brush.restore();
  }
  function eyelid(x,y,wide,angle,blink,breathe) {
    brush.save();
    const motion=influence(x,y,148,105,133,98)*breathe;
    brush.translate(x+motion*.8,y+motion*2);
    brush.rotate(angle);
    brush.beginPath();
    brush.moveTo(-wide,0);
    brush.bezierCurveTo(-wide*.68,-13,wide*.64,-14,wide,0);
    brush.quadraticCurveTo(wide*.82,8,0,8);
    brush.quadraticCurveTo(-wide*.8,8,-wide,0);
    brush.clip();
    const line=-13+24*blink;
    brush.fillStyle="#9954ba";
    brush.fillRect(-wide-1,-15,wide*2+2,line+15);
    brush.beginPath();brush.moveTo(-wide,line-1);
    brush.quadraticCurveTo(0,line+4,wide,line-1);
    brush.strokeStyle="#42204e";brush.lineWidth=2.5;brush.stroke();
    brush.restore();
  }
  function swipeGlints(progress) {
    const reach=Math.min(1,progress*4), fade=Math.min(1,(1-progress)*2.2);
    brush.save();
    brush.globalAlpha=fade;
    brush.shadowColor="#ffb242";brush.shadowBlur=4;
    brush.strokeStyle="#ffe8a8";brush.lineWidth=2;brush.lineCap="round";
    for (let i=0;i<3;i++) {
      const x=98-i*4, y=215+i*3;
      brush.beginPath();brush.moveTo(x,y);
      brush.quadraticCurveTo(x-32*reach,y-4*reach,x-(53+i*2)*reach,y-(27-i*2)*reach);
      brush.stroke();
    }
    brush.fillStyle="#fff1bb";
    for (let i=0;i<5;i++) {
      const x=45-i*6+Math.sin(i*4)*8, y=193-i*3-progress*(10+i);
      const r=2.5+Math.sin(i+progress*7)*1.5;
      brush.beginPath();brush.moveTo(x,y-r*1.8);brush.lineTo(x+r*.4,y-r*.4);
      brush.lineTo(x+r,y);brush.lineTo(x+r*.3,y+r*.4);brush.lineTo(x,y+r*1.8);
      brush.lineTo(x-r*.4,y+r*.3);brush.lineTo(x-r,y);brush.lineTo(x-r*.3,y-r*.4);
      brush.closePath();brush.fill();
    }
    brush.restore();
  }
  function paintPose(tail,breathe,paw) {
    brush.drawImage(portrait,0,0);
    for (const p of vertices) {
      p.dx=p.x+p.head*breathe*.8+p.tail*tail*8-p.paw*paw*15;
      p.dy=p.y+p.head*breathe*2-p.tail*tail*4-p.paw*paw*17;
    }
    for (let j=0;j<rows-1;j++) for (let i=0;i<cols-1;i++) {
      const k=j*cols+i, a=vertices[k], b=vertices[k+1], c=vertices[k+cols], d=vertices[k+cols+1];
      if (a.dx===a.x && b.dx===b.x && c.dx===c.x && d.dx===d.x) continue;
      triangle(a,b,c);triangle(d,c,b);
    }
  }
  function draw(time) {
    const pose=Math.round(Math.sin(time/870)*8), tail=pose/8;
    const breathe=.2*(1-tail*tail)-tail*.8;
    const elapsed=(time-swipeStart)/1000;
    const paw=elapsed<.3 ? 0 : elapsed<.58 ? Math.sin((elapsed-.3)/.28*Math.PI/2) :
      elapsed<1.22 ? (1+Math.cos((elapsed-.58)/.64*Math.PI))/2 : 0;
    if (!paw && idleFrames.has(pose)) brush.drawImage(idleFrames.get(pose),0,0);
    else {
      paintPose(tail,breathe,paw);
      if (!paw) {
        const frame=document.createElement("canvas");
        frame.width=width;frame.height=height;frame.getContext("2d").drawImage(surface,0,0);
        idleFrames.set(pose,frame);
      }
    }
    const blink=Math.max(0,1-Math.abs((time%5670)-4320)/145);
    if (blink>0) {
      eyelid(120,101,14,-.2,blink,breathe);
      eyelid(178,112,16,.25,blink,breathe);
    }
    if (elapsed>.49 && elapsed<1.55) swipeGlints((elapsed-.49)/1.06);
  }
  const still = () => document.body.classList.contains("still") || root.matchMedia("(prefers-reduced-motion:reduce)").matches;
  function tick(now) {
    scheduled=false;
    if (!scene?.isConnected || !portrait) return;
    if (swipePending) { swipeStart=now;swipePending=false; }
    if (still()) { brush.drawImage(portrait,0,0); return; }
    if (now-lastPaint>=55) { draw(now);lastPaint=now; }
    schedule();
  }
  function schedule() {
    if (!scheduled && portrait && scene?.isConnected) { scheduled=true;root.requestAnimationFrame(tick); }
  }
  function prepare() {
    const painting=scene.firstElementChild, image=new Image();
    // The downloadable game embeds the same CSS texture as a data URL.
    const url=root.getComputedStyle(painting).backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
    if (!url) return;
    image.onload=()=>{
      portrait=document.createElement("canvas");
      portrait.width=width;portrait.height=height;
      portrait.getContext("2d").drawImage(image,1040,120,width,height,0,0,width,height);
      surface=painting.querySelector("canvas");
      brush=surface.getContext("2d");
      vertices=Array.from({length:cols*rows},(_,i)=>vertex(i%cols*step,Math.floor(i/cols)*step));
      schedule();
    };
    image.src=url;
  }
  function mount(header,run) {
    const first=!scene;
    if (first) {
      scene=document.createElement("div");
      scene.className="moon-stall-scene";scene.setAttribute("aria-hidden","true");
      scene.innerHTML='<div class="moon-stall-painting"><canvas width="400" height="256"></canvas></div>';
      root.matchMedia("(prefers-reduced-motion:reduce)").addEventListener("change",schedule);
    }
    header.append(scene);
    if (first) prepare();
    if (run.catSale) {
      const visit=run.runId+":"+run.shopsVisited;
      if (saleVisit!==visit) {
        saleVisit=visit;
        try {
          swipePending=root.sessionStorage.getItem("cw-last-cat-sale")!==visit;
          root.sessionStorage.setItem("cw-last-cat-sale",visit);
        } catch { swipePending=true; }
      }
      const label=document.createElement("span");
      label.className="moon-cat-sale";label.textContent="Cat’s favor · 50% off";
      label.title="All stock and paid rerolls are half price this visit, rounded down to a minimum of $1.";
      header.firstElementChild.append(label);
    } else { swipeStart=-Infinity;swipePending=false; }
    schedule();
  }
  root.CWShopCat={mount,syncMotion:schedule};
})(window);
