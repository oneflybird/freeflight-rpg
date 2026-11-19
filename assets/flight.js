/* A five-second close tracking shot, drawn directly from one photograph. */
(()=>{
'use strict';
const limit=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
function smooth(a,b,x){const t=limit((x-a)/(b-a));return t*t*(3-2*t)}
function hermite(t,keys,col){
  if(t<=keys[0][0])return keys[0][col];
  for(let i=1;i<keys.length;i++){
    const b=keys[i];if(t>b[0])continue;
    const a=keys[i-1],before=keys[Math.max(0,i-2)],after=keys[Math.min(keys.length-1,i+1)];
    const span=b[0]-a[0],u=(t-a[0])/span,p=u*u,q=p*u;
    const m=(b[col]-before[col])/(b[0]-before[0])*span, n=(after[col]-a[col])/(after[0]-a[0])*span;
    return (2*q-3*p+1)*a[col]+(q-2*p+u)*m+(-2*q+3*p)*b[col]+(q-p)*n;
  }
  return keys[keys.length-1][col];
}
// Offset of the spirit from the sun, and its apparent size along the route.
const route=[
 [-.4,-.56,.53,1.18],[0,-.29,.32,1.81],[.20,-.245,.263,2.05],
 [.48,-.105,.158,2.55],[.82,.110,.127,2.05],[1.12,.174,.109,1.87],
 [1.45,.054,.090,1.87],[1.88,-.147,.109,1.95],[2.13,-.175,.114,1.93],
 [2.52,-.027,.087,1.87],[2.93,.145,.065,1.73],[3.27,.110,.087,1.66],
 [3.60,-.040,.058,1.55],[3.86,-.090,.038,1.32],[4.10,-.043,.016,1.00],
 [4.32,.008,.003,.62],[4.52,.012,-.003,.24],[4.72,.004,-.002,.061],[5,0,0,.005]
];
const X=t=>hermite(t,route,1),Y=t=>hermite(t,route,2),size=t=>hermite(t,route,3);
const surfaces=new WeakMap();
function setup(ctx,img,W,H){
 let s=surfaces.get(ctx);
 const key=img.currentSrc||img.src;
 if(s&&img===s.img&&key===s.key&&s.w===W&&s.h===H)return s;
 let photo=document.createElement('canvas'),ph=photo.getContext('2d',{alpha:false});
 let scale=Math.min(1,4096/img.naturalWidth,4096/img.naturalHeight);
 photo.width=Math.round(img.naturalWidth*scale);photo.height=Math.round(img.naturalHeight*scale);
 ph.imageSmoothingQuality='high';ph.drawImage(img,0,0,photo.width,photo.height);
 let plane=document.createElement('canvas');plane.width=W;plane.height=H;
 s={key,img,w:W,h:H,photo,plane,pc:plane.getContext('2d',{alpha:false})};surfaces.set(ctx,s);return s;
}
function camera(t,amp){
 // Follow the last third of a second of flight, then release the pan into the light.
 const gaze=(get)=>.55*get(t-.14)+.33*get(t-.25)+.12*get(t-.39);
 const pickup=smooth(.10,.74,t),land=1-smooth(3.91,4.85,t);
 const x=gaze(X)*.72*pickup*land;
 const y=(gaze(Y)-.070)*.57*pickup*land;
 const bank=limit((X(t-.10)-X(t-.34))*.23,-.043,.043)*pickup*land;
 // Cover more distance throughout the pursuit, including the final approach.
 const launch=smooth(.06,1.02,t),travel=smooth(.12,4.80,t),arrival=smooth(3.52,4.91,t);
 const advance=.23*launch+.61*travel+.16*arrival;
 const zoom=1.20+(.99+.57*amp)*(.08*launch+.66*travel+.26*arrival);
 return {x,y,bank,advance,zoom};
}

const photoDetails=new WeakMap();
function lookAtPixels(img){
 const key=img.currentSrc||img.src, old=photoDetails.get(img);
 if(old&&old.key===key)return old;
 const c=document.createElement('canvas'),n=96;c.width=c.height=n;
 const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0,n,n);
 const pixels=g.getImageData(0,0,n,n).data;
 let transparent=0,x0=n,y0=n,x1=0,y1=0;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const alpha=pixels[(y*n+x)*4+3];if(alpha<32)transparent++;
  if(alpha>48){x0=Math.min(x,x0);x1=Math.max(x,x1);y0=Math.min(y,y0);y1=Math.max(y,y1)}
 }
 const w=img.naturalWidth,h=img.naturalHeight;
 const cut=transparent>n*n*.025&&x1>=x0;
 const box=cut?[w*x0/n,h*y0/n,w*(x1-x0+1)/n,h*(y1-y0+1)/n]:[0,0,w,h];
 const result={key,cut,box};photoDetails.set(img,result);return result;
}
function cover(g,img,x,y,w,h){
 const ratio=w/h,iw=img.naturalWidth,ih=img.naturalHeight,sw=Math.min(iw,ih*ratio),sh=sw/ratio;
 g.drawImage(img,(iw-sw)/2,(ih-sh)/2,sw,sh,x,y,w,h);
}
function wing(g,side,flap,phase,upload){
 g.save();g.scale(side,1);g.translate(15,2);
 const rise=-22-22*flap,reach=43+12*(1-flap*flap)+4*flap;
 g.rotate(.075+.09*Math.sin(phase-.3));
 if(upload&&lookAtPixels(upload).cut){
   const info=lookAtPixels(upload),[sx,sy,sw,sh]=info.box;
   const width=56,height=Math.max(20,Math.min(66,width*sh/sw));
   g.rotate(-.26-.32*flap);g.scale(.98+.02*flap,.88+.12*flap);
   g.drawImage(upload,sx,sy,sw,sh,-2,-height*.76,width,height);g.restore();return;
 }
 const shape=new Path2D();shape.moveTo(-3,8);
 shape.bezierCurveTo(-2,-5,9,-14,21,rise*.61);shape.bezierCurveTo(32,rise*.75,reach-5,rise-3,reach,rise-4);
 shape.bezierCurveTo(reach+4,rise+2,reach-3,rise+9,reach-11,rise+16);
 shape.bezierCurveTo(reach-8,rise+15,reach-5,rise+14,reach-3,rise+13);
 shape.bezierCurveTo(reach+1,rise+16,reach-9,rise+27,reach-18,rise+29);
 shape.bezierCurveTo(reach-12,rise+28,reach-12,rise+26,reach-10,rise+27);
 shape.bezierCurveTo(reach-10,rise+35,reach-23,rise+39,reach-29,rise+38);
 shape.bezierCurveTo(15,14,7,19,-3,12);shape.closePath();
 if(upload){
   g.save();g.clip(shape);cover(g,upload,-5,rise-6,reach+12,Math.max(33,29-rise));
   let rim=g.createLinearGradient(0,16,reach,rise);
   rim.addColorStop(0,'rgba(251,204,153,.28)');rim.addColorStop(.4,'rgba(224,245,255,.04)');rim.addColorStop(1,'rgba(236,251,255,.26)');
   g.fillStyle=rim;g.fill(shape);g.restore();g.strokeStyle='#f6e3c7';g.lineWidth=1.7;g.stroke(shape);
 }else{
   const k=g.createLinearGradient(0,9,reach,rise);
   k.addColorStop(0,'#92d6d0');k.addColorStop(.26,'#f8f7de');k.addColorStop(.79,'#fffdf3');k.addColorStop(1,'#b6ebe9');
   g.fillStyle=k;g.fill(shape);g.strokeStyle='rgba(53,108,117,.83)';g.lineWidth=1.25;g.stroke(shape);
 }
 g.strokeStyle=upload?'rgba(242,240,227,.88)':'rgba(118,167,169,.67)';g.lineWidth=.95;g.beginPath();
 g.moveTo(4,8);g.quadraticCurveTo(20,0,reach-6,rise+5);g.moveTo(9,8);g.quadraticCurveTo(22,7,reach-10,rise+20);g.stroke();g.restore();
}
// Canvas local space. The figure occupies roughly 59 x 68 units inside the existing 143-unit wingspan.
function paintStickBack(g,t,phase){
  const drift=Math.sin(3.2*t+.4),kick=Math.sin(5.1*t-.5),wingBeat=Math.sin(phase-.65);
  const hip=[-.5+.85*drift,9],nape=[.5+.55*drift,-12.1];
  const leftShoulder=[-5.5,-7.2],rightShoulder=[5.6,-7.8];
  const fill='#37323a',rim='#f5cd91',shadow='#30282b';
  const limbs=[];
  function bone(a,b,len,c,d){const p=new Path2D();p.moveTo(a[0],a[1]);p.bezierCurveTo(b[0],b[1],c[0],c[1],d[0],d[1]);limbs.push([p,len]);}
  // The nearer leg trails low. The foreshortened foot of the other leg bends toward the viewer.
  bone(hip,[-1,14],5.2,[-4+drift,17],[-5.5+kick,20.5]);
  bone([-5.5+kick,20.5],[-6,25.2],4.7,[-7.3+kick,28.9],[-10+kick,30.6]);
  bone([-10+kick,30.6],[-11.2,31.2],4.35,[-12+kick,31.7],[-13+kick,31.8]);
  bone(hip,[2.4,14],5.35,[6.4,17.4],[8.1-kick,18.8]);
  bone([8.1-kick,18.8],[11.0,20.3],4.8,[11.8-kick,22.0],[13.2-kick,22.3]);
  bone([13.2-kick,22.3],[14.9,22.9],4.3,[15.9-kick,22.8],[16.5-kick,22.5]);
  bone(nape,[.3,-4.0],6.15,[.4,4.6],hip);
  bone(leftShoulder,[-10,-7.2],4.45,[-13.5,-5.8+wingBeat],[-17.7,-4.6+wingBeat]);
  bone([-17.7,-4.6+wingBeat],[-21,-4.0],3.9,[-23.7,-5.5+wingBeat*.6],[-26.2,-6.5+wingBeat*.8]);
  bone(rightShoulder,[10.5,-8.5],4.5,[13.8,-9.1+wingBeat*.7],[17.6,-10.4+wingBeat*.7]);
  bone([17.6,-10.4+wingBeat*.7],[21,-11.1],3.95,[23.8,-12.5+wingBeat*.5],[25.2,-13.2+wingBeat*.6]);
  const shoulders=new Path2D();shoulders.moveTo(-6,-7.2);shoulders.quadraticCurveTo(0,-10.1,6,-8.0);limbs.push([shoulders,5.25]);
  g.lineCap='round';g.lineJoin='round';
  for(const [stroke,extra] of [[shadow,2.05],[rim,1.03],[fill,0]]){
    g.strokeStyle=stroke;
    for(const [p,w] of limbs){g.lineWidth=w+extra;g.stroke(p);}
  }
  // A continuous unmarked back of the head and the short nape make the rear view explicit.
  g.save();g.translate(nape[0],-21.5+.29*drift);g.rotate(-.055+.035*drift);
  const head=new Path2D();head.moveTo(.1,-11.6);
  head.bezierCurveTo(6.5,-11.6,10.1,-7.5,10.0,-1.8);head.bezierCurveTo(9.9,4.2,6.9,9.6,2.6,10.6);
  head.bezierCurveTo(-1.6,11.5,-7.4,8.3,-9.1,3.4);head.bezierCurveTo(-11.7,-3.5,-8.3,-11.7,.1,-11.6);head.closePath();
  const hair=g.createLinearGradient(-6,9,5,-10);hair.addColorStop(0,'#2c2831');hair.addColorStop(.63,'#453b40');hair.addColorStop(1,'#756057');
  g.fillStyle=hair;g.fill(head);g.strokeStyle=shadow;g.lineWidth=1.65;g.stroke(head);
  const light=new Path2D();light.moveTo(-7.7,-7.4);light.bezierCurveTo(-3.6,-13,4.9,-12.3,8.1,-7.4);
  g.strokeStyle=rim;g.lineWidth=1.25;g.stroke(light);
  const n=new Path2D();n.moveTo(-4.3,8.6);n.quadraticCurveTo(-.6,10.7,3.4,9.4);g.strokeStyle='#9a7b68';g.lineWidth=.92;g.stroke(n);g.restore();
}
function paintActor(g,x,y,scale,t,roll,options={}){
  const mode=options.actorMode==='empty'?'empty':options.actorMode==='photo'?'photo':'stick';
  const ready=img=>!!(img&&img.complete&&img.naturalWidth);
  const actor=options.actorImage||options.cat;
  const material=ready(options.wings)?options.wings:null;
  const phase=t*16.2+.56*Math.sin(2.4*t),flap=Math.sin(phase);
  g.save();g.translate(x,y);g.rotate(roll);g.scale(scale,scale);
  const glow=g.createRadialGradient(0,0,0,0,0,55);
  glow.addColorStop(0,'rgba(255,232,187,.15)');glow.addColorStop(1,'rgba(255,232,187,0)');
  if(mode!=='empty'){g.fillStyle=glow;g.fillRect(-58,-58,116,116);}
  g.translate(0,-Math.sin(phase-.28));
  g.save();
  // Bring the inherited wing pivots to the figure's shoulder blades.
  if(mode==='stick'||mode==='empty')g.translate(0,-6);
  for(const side of [-1,1]){
    g.save();
    if(mode==='stick'||mode==='empty')g.translate(-side*(mode==='stick'?8:14),0);
    wing(g,side,flap,phase+(side===1?.07:0),material);
    g.restore();
  }
  g.restore();
  if(mode==='stick'){
    paintStickBack(g,t,phase);
  }else if(mode==='photo'&&ready(actor)){
    const info=lookAtPixels(actor);
    if(info.cut){
      const [sx,sy,sw,sh]=info.box,fit=Math.min(78/sw,67/sh),w=sw*fit,h=sh*fit;
      g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
      g.drawImage(actor,sx,sy,sw,sh,-w/2,-h/2+2,w,h);
    }else{
      const circle=new Path2D();circle.arc(0,0,32,0,Math.PI*2);
      g.save();g.clip(circle);cover(g,actor,-32,-32,64,64);g.restore();
      g.lineWidth=1.8;g.strokeStyle='#fff1cb';g.stroke(circle);
    }
  }
  g.restore();
}
// Neutral, transparent thumbnail; this is the exact flight renderer at a readable wing phase.
window.paintFlightActorPreview=function(g,options={}){
  const w=g.canvas.width,h=g.canvas.height;
  g.save();g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,w,h);
  paintActor(g,w*.5,h*.54,Math.min(w/153,h/97),.057,-.036,options);g.restore();
};

window.paintCatFlight=function(ctx,img,point,f,strength=.67,options={}){
 const W=ctx.canvas.width,H=ctx.canvas.height,t=limit(f)*5,amp=limit(strength);
 if(!img.naturalWidth)return;
 const s=setup(ctx,img,W,H), im=s.photo, p=s.pc;
 const iw=im.width,ih=im.height,cw=Math.min(iw,ih*W/H),ch=cw*H/W;
 const ox=limit(point[0]*iw-cw*.5,0,Math.max(0,iw-cw)),oy=limit(point[1]*ih-ch*.46,0,Math.max(0,ih-ch));
 const ax=(point[0]*iw-ox)/cw,ay=(point[1]*ih-oy)/ch;
 const cam=camera(t,amp);
 // Reverse-project an advancing camera over a sea-level plane. The travel
 // starts immediately. Distant pixels near the horizon receive little flow.
 const horizon=limit(ay+.033,.035,.97);
 const skyZoom=1.15+.085*smooth(0,1.72,t)+.065*smooth(2.0,4.95,t);
 // Match the first two seconds of the established take, then ease toward a gentle cruise.
 const tail=Math.max(0,t-2);
 const distance=t<=2?t*(2.20+.83*smooth(0,1.2,t))
   :6.06+.57*tail+2.46*1.25*(1-Math.exp(-tail/1.25));
 const travel=distance*amp/.67;
 const lookX=.038*(1-smooth(0,1.6,t));
 // Constrain the whole view once for users who tap the outer edge of the image.
 const minAim=1-(iw-ox-cw*ax)*skyZoom/cw;
 const maxAim=(ox+cw*ax)*skyZoom/cw;
 const vanishingX=limit(ax+lookX,minAim,maxAim);
 const horizonOnFilm=ay+(horizon-ay)*skyZoom;
 function row(v){
   const rise=v-horizonOnFilm;
   const near=Math.max(0,rise)/(1-horizon);
   const q=1/(skyZoom+near*travel);
   return [q,horizon+rise*q];
 }
 p.imageSmoothingEnabled=true;p.imageSmoothingQuality='high';
 const band=Math.max(2,Math.round(H/480));
 for(let y=0;y<H;y+=band){
   const bottom=Math.min(y+band,H),a=row(y/H),b=row(bottom/H),q=(a[0]+b[0])*.5;
   const sourceWidth=cw*q;
   const sourceX=ox+cw*(ax-vanishingX*q);
   const sourceY=oy+ch*a[1],sourceHeight=(b[1]-a[1])*ch;
   p.drawImage(im,sourceX,sourceY,sourceWidth,sourceHeight,0,y,W,bottom-y);
 }
 ctx.save();ctx.translate(W*.5,H*.5);ctx.scale(1.059,1.059);ctx.drawImage(s.plane,-W*.5,-H*.5);ctx.restore();
 function screen(dx,dy){
  const px=((ax+dx-cam.x)-.5)*W*1.059,py=((ay+dy-cam.y)-.5)*H*1.059;
  return [W*.5+px*Math.cos(cam.bank)+py*Math.sin(cam.bank),H*.5-px*Math.sin(cam.bank)+py*Math.cos(cam.bank)];
 }
 const offsetY=.004*size(t)*Math.sin(t*12.7),loc=screen(X(t),Y(t)+offsetY),units=W/720;
 // Motes stay on the route they were released from, producing a short curved wake.
 const visibility=(1-smooth(4.40,4.92,t));
 ctx.save();ctx.globalCompositeOperation='screen';
 for(let i=0;i<19;i++){
   const age=((t*2.25+i*.1618034)%1),back=age*(.12+.09*smooth(.20,1.18,t)),tt=t-back;
   const dx=(Math.sin(i*12.0+age*4.1))*.009*age*size(t),dy=Math.cos(i*5.41+age*2)*.005*age*size(t);
   const xy=screen(X(tt)+dx,Y(tt)+dy+.013*age*size(t)),rad=(1.1+1.3*((i*.32)%1))*units*(1-.55*age)*size(t);
   ctx.fillStyle='rgba(200,253,234,'+(visibility*.68*(1-age))+')';ctx.beginPath();ctx.arc(xy[0],xy[1],Math.max(.2,rad),0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
 const roll=limit((X(t+.075)-X(t-.075))*1.55,-.28,.28)-cam.bank*.48;
 paintActor(ctx,loc[0],loc[1],1.45*size(t)*units,t,roll,options);
};
})();
