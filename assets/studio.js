'use strict';
const el=id=>document.getElementById(id), cv=el('preview'), ctx=cv.getContext('2d',{alpha:false});
const T=5, clip=n=>Math.max(0,Math.min(1,n)), defaultPoint=[.699,.503];
const labels={background:'海边落日',cat:'火柴人背影',wings:'羽翼'};
const images={background:null,cat:null,wings:null}, defaults={}, changes={}, pending={background:0,cat:0,wings:0};
const tabs=[...document.querySelectorAll('.slot')];
let slot='cat',actorMode='stick',sun=[...defaultPoint],p=0,ready=false,running=false,busy=false,starting=false,token=0;
let engine=null, sound=null, sourceNode=null, exportFile=null, exportUrl='',recorder=null;
function status(s){el('state').textContent=s}
function clearResult(){
 if(exportUrl)URL.revokeObjectURL(exportUrl);exportUrl='';exportFile=null;el('result').hidden=true;
 el('download').removeAttribute('href');el('share').hidden=true;
}
function loadImage(url){
 return new Promise((ok,no)=>{const im=new Image();im.onload=()=>{if(im.naturalWidth&&im.naturalHeight)ok(im);else no(Error('empty image'))};im.onerror=()=>no(Error('image load failed'));im.src=url});
}
function actorOptions(){return {actorMode,actorImage:images.cat,wings:images.wings}}
function restoreAvailable(){return slot==='cat'?actorMode!=='stick':!!changes[slot]}
function frame(f){
 if(!ready)return;p=clip(f);
 window.paintCatFlight(ctx,images.background,sun,p,+el('meter').value/100,actorOptions());
 el('scrub').value=String(Math.round(p*1000));el('clk').textContent='0:0'+Math.min(5,Math.floor((p+.001)*T));
}
function stopSound(){
 if(sourceNode){try{sourceNode.stop()}catch{}sourceNode.disconnect();sourceNode=null}
}
function cancel(){
 token++;stopSound();running=false;el('play').classList.remove('is-playing');el('play').textContent='出发';
}
function showPoint(){
 if(!ready||slot!=='background')return;
 const m=el('map'),im=images.background,s=Math.min(m.clientWidth/im.naturalWidth,m.clientHeight/im.naturalHeight);
 const w=im.naturalWidth*s,h=im.naturalHeight*s;
 el('cross').style.left=(.5*(m.clientWidth-w)+sun[0]*w)+'px';
 el('cross').style.top=(.5*(m.clientHeight-h)+sun[1]*h)+'px';
}
function renderSlot(){
 for(const b of tabs)b.setAttribute('aria-pressed',String(b.dataset.slot===slot));
 el('assetName').textContent=slot==='cat'?(actorMode==='photo'?changes.cat?.name:actorMode==='empty'?'仅翅膀':'火柴人背影'):(changes[slot]?.name||labels[slot]);
 el('actorModes').hidden=slot!=='cat';el('replace').hidden=slot==='cat';
 for(const mode of ['stick','empty','photo'])el('mode-'+mode).setAttribute('aria-pressed',String(mode===actorMode));
 window.paintFlightActorPreview(el('thumb-cat').getContext('2d'),actorOptions());
 el('restore').disabled=busy||!restoreAvailable();
 const showMap=slot==='background';el('mapArea').hidden=!showMap;
 el('assetHelp').hidden=showMap;el('assetHelp').textContent=slot==='cat'?'透明图保留轮廓，普通照片会做成圆形贴纸。':'选一张翅膀图，会在主角两侧镜像展开。';
 for(const k of ['background','wings']){
  const t=el('thumb-'+k);if(images[k]){if(t.src!==images[k].src)t.src=images[k].src;t.hidden=false}else{t.hidden=true;t.removeAttribute('src')}
 }
 el('wingDefault').hidden=!!images.wings;
 if(images.background&&el('source').src!==images.background.src)el('source').src=images.background.src;
 el('credit').hidden=!!changes.background;
 showPoint();
}
for(const mode of ['stick','empty','photo']){
 el('mode-'+mode).onclick=()=>{
  if(!ready||busy)return;
  if(mode==='photo'){el('load').click();return}
  ++pending.cat;cancel();clearResult();actorMode=mode;renderSlot();frame(editPose());status('');
 };
}
for(const b of tabs)b.onclick=()=>{if(!busy){slot=b.dataset.slot;renderSlot()}};
function changePoint(x,y){
 if(busy||!ready)return;cancel();clearResult();sun=[clip(x),clip(y)];showPoint();frame(0);status('');
}
el('map').onpointerdown=e=>{
 if(busy||!ready)return;
 const m=el('map'),im=images.background,b=m.getBoundingClientRect(),s=Math.min(m.clientWidth/im.naturalWidth,m.clientHeight/im.naturalHeight),w=im.naturalWidth*s,h=im.naturalHeight*s;
 const x=(e.clientX-b.left-m.clientLeft-(m.clientWidth-w)*.5)/w,y=(e.clientY-b.top-m.clientTop-(m.clientHeight-h)*.5)/h;
 if(x>=0&&x<=1&&y>=0&&y<=1)changePoint(x,y);
};
el('map').onkeydown=e=>{
 const mov={ArrowLeft:[-.01,0],ArrowRight:[.01,0],ArrowUp:[0,-.01],ArrowDown:[0,.01]}[e.key];
 if(mov){e.preventDefault();changePoint(sun[0]+mov[0],sun[1]+mov[1])}
};
if(window.ResizeObserver)new ResizeObserver(showPoint).observe(el('map'));else addEventListener('resize',showPoint);
el('source').onload=showPoint;
const editPose=()=>p>.75||p<.015?.13:p;
el('replace').onclick=()=>{if(!busy)el('load').click()};
el('load').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file||busy)return;
 const key=slot,id=++pending[key],url=URL.createObjectURL(file);
 try{
  const img=await loadImage(url);
  if(id!==pending[key]||busy){URL.revokeObjectURL(url);return}
  cancel();clearResult();if(changes[key])URL.revokeObjectURL(changes[key].url);
  changes[key]={url,name:file.name};images[key]=img;
  if(key==='background')sun=[.5,.48];if(key==='cat')actorMode='photo';
  renderSlot();frame(editPose());
  status(key==='background'?'背景已更换，可在原图上点选太阳。':'图片已更换。');
 }catch{URL.revokeObjectURL(url);if(id===pending[key])status('图片无法读取，请换一张 JPG、PNG 或 WebP。')}
};
el('restore').onclick=()=>{
 if(busy||!restoreAvailable())return;
 ++pending[slot];cancel();clearResult();if(changes[slot])URL.revokeObjectURL(changes[slot].url);delete changes[slot];if(slot==='cat')actorMode='stick';images[slot]=defaults[slot];
 if(slot==='background')sun=[...defaultPoint];renderSlot();frame(editPose());status('已恢复默认。');
};
el('meter').oninput=()=>{if(!busy){cancel();clearResult();el('val').value=el('meter').value+'%';frame(p>.08&&p<.8?p:.35);status('')}};
el('scrub').oninput=()=>{if(!busy){cancel();frame(+el('scrub').value/1000)}};
function lock(v){
 busy=v;for(const n of ['replace','load','play','save','meter','scrub'])el(n).disabled=v;
 for(const b of [...tabs,...el('actorModes').querySelectorAll('button')])b.disabled=v;el('restore').disabled=v||!restoreAvailable();
}
async function getSound(){
 const C=window.AudioContext||window.webkitAudioContext;if(!C)throw Error('audio unsupported');
 if(!engine)engine=new C();await engine.resume();
 if(!sound){
  sound=fetch(el('source-sound').href).then(response=>{
   if(!response.ok) throw new Error('Audio could not be loaded');
   return response.arrayBuffer();
  }).then(bytes=>new Promise((ok,no)=>engine.decodeAudioData(bytes,ok,no))).catch(e=>{sound=null;throw e});
 }
 return sound;
}
function animate(buffer,destination,onDone){
 const serial=++token,src=engine.createBufferSource();stopSound();sourceNode=src;src.buffer=buffer;
 src.connect(engine.destination);if(destination)src.connect(destination);
 const begin=engine.currentTime+.03;src.start(begin);running=true;
 const draw=()=>{if(serial!==token)return;const t=clip((engine.currentTime-begin)/T);frame(t);
  if(t<1)requestAnimationFrame(draw);else{stopSound();running=false;onDone()}};
 frame(0);requestAnimationFrame(draw);
}
el('play').onclick=async()=>{
 if(!ready||busy||starting)return;if(running){cancel();return}
 const id=++token;starting=true;
 try{const buffer=await getSound();if(id!==token)return;
  status('');el('play').textContent='停止预览';el('play').classList.add('is-playing');
  animate(buffer,null,()=>{el('play').classList.remove('is-playing');el('play').textContent='再飞一次'});
 }catch{status('声音未能开启，请再点一次出发。')}finally{starting=false}
};
el('share').onclick=async()=>{
 if(!exportFile||!navigator.share)return;
 try{await navigator.share({files:[exportFile],title:'如果我能自由翱翔'})}catch(e){if(e.name!=='AbortError')status('可以点“保存视频”下载。')}
};
el('save').onclick=async()=>{
 if(busy||!ready)return;
 if(!cv.captureStream||typeof MediaRecorder==='undefined'){status('当前浏览器不支持视频导出，请用 Safari、Chrome 或 Edge 打开。');return}
 const types=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
 const mime=types.find(t=>MediaRecorder.isTypeSupported(t));if(!mime){status('当前浏览器没有可用的视频编码器。');return}
 cancel();lock(true);clearResult();frame(0);status('正在导出，请保持页面在前台约 5 秒。');
 let stream=null,dest=null;
 function release(){cancel();if(stream)stream.getTracks().forEach(t=>t.stop());if(dest)dest.disconnect();recorder=null;lock(false)}
 try{
  const buffer=await getSound();dest=engine.createMediaStreamDestination();stream=cv.captureStream(30);
  dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  const chunks=[],rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000,audioBitsPerSecond:128000});recorder=rec;
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  rec.onerror=()=>{release();status('导出未完成，请重新尝试。')};
  rec.onstop=()=>{
   if(recorder!==rec)return;release();if(!chunks.length){status('没有录到画面，请重试。');return}
   const blob=new Blob(chunks,{type:rec.mimeType||mime});exportUrl=URL.createObjectURL(blob);
   const name='如果我能自由翱翔.'+(blob.type.includes('/mp4')?'mp4':'webm'),link=el('download');
   link.href=exportUrl;link.download=name;el('result').hidden=false;
   try{exportFile=new File([blob],name,{type:blob.type.split(';')[0]});el('share').hidden=!(navigator.canShare&&navigator.canShare({files:[exportFile]}))}catch{el('share').hidden=true}
   status('视频已生成。');if(!matchMedia('(pointer:coarse)').matches)link.click();
  };
  rec.start();animate(buffer,dest,()=>rec.stop());
 }catch{release();status('本次有声导出未能开始，请换 Safari、Chrome 或 Edge 重试。')}
};
lock(true);
loadImage(el('source-background').href).then(bg=>{
 Object.assign(defaults,{background:bg,cat:null,wings:null});Object.assign(images,defaults);
 ready=true;lock(false);renderSlot();frame(0);
}).catch(()=>{status('示例图片未能载入，请重新打开页面。')});