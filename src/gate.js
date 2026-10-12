/* ===== Conexus · idioma, acceso y espacios de trabajo ===== */
(function(){
  'use strict';
  /* ---------- espacios (la clave se compara como hash; para cambiarlas ver README) ---------- */
  var WORKSPACES={
    sanluis:{id:'sanluis',name:'San Luis'},
    pescara:{id:'pescara',name:'Pescara Rugby'},
    tucuman:{id:'tucuman',name:'Tucumán Rugby'}
  };
  /* clave (hash) → espacio + rol. viewer = solo ver y presentar; editor = puede modificar */
  var ACCESS=[
    {ws:'sanluis',role:'viewer',hash:'@@H_SL_V@@'},
    {ws:'sanluis',role:'editor',hash:'@@H_SL_E@@'},
    {ws:'pescara',role:'viewer',hash:'@@H_PE_V@@'},
    {ws:'pescara',role:'editor',hash:'@@H_PE_E@@'},
    {ws:'tucuman',role:'viewer',hash:'@@H_TU_V@@'},
    {ws:'tucuman',role:'editor',hash:'@@H_TU_E@@'}
  ];
  var SALT='conexus-play|';
  /* ---------- banderas (SVG, para que se vean igual en Windows) ---------- */
  var FLAG={
    es:'<svg viewBox="0 0 30 20" width="26" height="17" aria-hidden="true"><rect width="30" height="20" fill="#74acdf"/><rect y="6.7" width="30" height="6.6" fill="#fff"/><circle cx="15" cy="10" r="2" fill="#f6b40e"/></svg>',
    it:'<svg viewBox="0 0 30 20" width="26" height="17" aria-hidden="true"><rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ce2b37"/></svg>'
  };
  /* ---------- idioma ---------- */
  var L=localStorage.getItem('cx.lang');
  if(L!=='es'&&L!=='it') L=(navigator.language||'es').toLowerCase().indexOf('it')===0?'it':'es';
  var EX=new Map(), RULES=[], cache=new Map();
  var IT_EXACT=@@IT_EXACT@@;
  var IT_RULES=@@IT_RULES@@;
  if(L==='it'){
    IT_EXACT.forEach(function(p){EX.set(p[0],p[1])});
    IT_RULES.forEach(function(r){try{RULES.push([new RegExp(r[0],'g'),r[1]])}catch(e){}});
  }
  function trCore(c){
    if(EX.has(c)) return EX.get(c);
    var o=c; for(var i=0;i<RULES.length;i++) o=o.replace(RULES[i][0],RULES[i][1]); return o;
  }
  function tr(s){
    if(L!=='it'||typeof s!=='string'||!s) return s;
    var h=cache.get(s); if(h!==undefined) return h;
    var m=s.match(/^(\s*)([\s\S]*?)(\s*)$/), core=m[2]; if(!core) return s;
    var out;
    if(EX.has(core)) out=EX.get(core);
    else if(core.indexOf(' · ')>=0) out=core.split(' · ').map(trCore).join(' · ');
    else out=trCore(core);
    var res=m[1]+out+m[3]; cache.set(s,res); return res;
  }
  var SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1};
  function trAttr(el){
    ['title','placeholder','aria-label'].forEach(function(a){
      var v=el.getAttribute&&el.getAttribute(a); if(v){var t=tr(v); if(t!==v) el.setAttribute(a,t)}
    });
  }
  function trNode(n){
    if(n.nodeType===3){var v=n.nodeValue; if(v&&v.trim()){var t=tr(v); if(t!==v) n.nodeValue=t} return}
    if(n.nodeType!==1) return;
    trAttr(n);
    if(SKIP[n.tagName]) return;
    for(var c=n.firstChild;c;c=c.nextSibling) trNode(c);
  }
  var CX=window.CX={cfg:@@CFG@@,hash:null,flag:FLAG,ws:null,wsName:'',role:'viewer',lang:L,tr:tr,
    setLang:function(l){localStorage.setItem('cx.lang',l); location.reload()},
    logout:function(){['cx.ws','cx.role','cx.h'].forEach(function(k){sessionStorage.removeItem(k); localStorage.removeItem(k)}); location.reload()},
    workspaces:WORKSPACES};
  document.documentElement.lang=L;
  if(L==='it'){
    document.title=tr(document.title);
    var obs=new MutationObserver(function(muts){
      muts.forEach(function(m){
        if(m.type==='childList') m.addedNodes.forEach(trNode);
        else if(m.type==='characterData'){ if(!SKIP[m.target.parentNode&&m.target.parentNode.tagName]) trNode(m.target) }
        else if(m.type==='attributes') trAttr(m.target);
      });
    });
    obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','placeholder']});
    var oc=window.confirm, op=window.prompt, oa=window.alert;
    window.confirm=function(m){return oc.call(window,tr(m))};
    window.prompt=function(m,d){return op.call(window,tr(m),d)};
    window.alert=function(m){return oa.call(window,tr(m))};
  }
  /* ---------- SHA-256 (respaldo si crypto.subtle no está disponible) ---------- */
  function sha256js(ascii){
    function rr(v,a){return(v>>>a)|(v<<(32-a))}
    var mp=Math.pow,mw=mp(2,32),i,j,result='',words=[],bl=ascii.length*8,hash=[],k=[],pc=0,ic={};
    for(var c=2;pc<64;c++){ if(!ic[c]){ for(i=0;i<313;i+=c) ic[i]=c; hash[pc]=(mp(c,.5)*mw)|0; k[pc++]=(mp(c,1/3)*mw)|0 } }
    ascii+='\x80'; while(ascii.length%64-56) ascii+='\x00';
    for(i=0;i<ascii.length;i++){ j=ascii.charCodeAt(i); if(j>>8) return ''; words[i>>2]|=j<<((3-i)%4)*8 }
    words[words.length]=((bl/mw)|0); words[words.length]=bl;
    for(j=0;j<words.length;){
      var w=words.slice(j,j+=16), old=hash; hash=hash.slice(0,8);
      for(i=0;i<64;i++){
        var w15=w[i-15],w2=w[i-2],a=hash[0],e=hash[4];
        var t1=hash[7]+(rr(e,6)^rr(e,11)^rr(e,25))+((e&hash[5])^((~e)&hash[6]))+k[i]+(w[i]=(i<16)?w[i]:(w[i-16]+(rr(w15,7)^rr(w15,18)^(w15>>>3))+w[i-7]+(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0);
        var t2=(rr(a,2)^rr(a,13)^rr(a,22))+((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));
        hash=[(t1+t2)|0].concat(hash); hash[4]=(hash[4]+t1)|0;
      }
      for(i=0;i<8;i++) hash[i]=(hash[i]+old[i])|0;
    }
    for(i=0;i<8;i++) for(j=3;j+1;j--){ var b=(hash[i]>>(j*8))&255; result+=((b<16)?0:'')+b.toString(16) }
    return result;
  }
  function sha256(str){
    var bytes=unescape(encodeURIComponent(str));
    if(window.crypto&&crypto.subtle&&window.isSecureContext){
      var buf=new Uint8Array(bytes.length); for(var i=0;i<bytes.length;i++) buf[i]=bytes.charCodeAt(i);
      return crypto.subtle.digest('SHA-256',buf).then(function(d){return Array.prototype.map.call(new Uint8Array(d),function(x){return('0'+x.toString(16)).slice(-2)}).join('')});
    }
    return Promise.resolve(sha256js(bytes));
  }
  function norm(p){return String(p||'').toLowerCase().replace(/\s+/g,'')}
  function findWs(pw){
    return sha256(SALT+norm(pw)).then(function(h){
      for(var i=0;i<ACCESS.length;i++) if(ACCESS[i].hash===h) return ACCESS[i];
      return null;
    });
  }
  /* ---------- arranque ---------- */
  function start(ws,role,hash){ CX.hash=hash||null;
    CX.ws=ws.id; CX.wsName=ws.name; CX.role=role==='editor'?'editor':'viewer';
    if(CX.role==='viewer') document.documentElement.classList.add('cx-viewer');
    var gate=document.getElementById('cxLogin'); if(gate) gate.remove();
    document.body.classList.remove('cx-locked');
    var badge=document.getElementById('wsBadge'); if(badge){badge.textContent=ws.name+' · '+tr(CX.role==='editor'?'✎ Edición':'👁 Solo lectura')}
    if(window.__startApp) window.__startApp();
  }
  function showLogin(){
    document.body.classList.add('cx-locked');
    var d=document.createElement('div'); d.id='cxLogin';
    d.innerHTML='<form class="lbox" autocomplete="off">'
      +'<img alt="Conexus" src="'+(document.getElementById('brandLogo')?document.getElementById('brandLogo').src:'')+'">'
      +'<h2>Conexus · Plan de juego</h2>'
      +'<p>Ingresá la clave de tu espacio.</p>'
      +'<input id="cxPw" type="password" placeholder="Clave" autocomplete="current-password" autofocus>'
      +'<label class="rem"><input id="cxRem" type="checkbox" checked> Recordarme en este dispositivo</label>'
      +'<button type="submit" class="go">Ingresar</button>'
      +'<div id="cxErr" class="err"></div>'
      +'<a class="gl" href="guia.html?lang='+L+'" target="_blank" rel="noopener" style="color:#4fd1e5;font-size:13px">📖 '+tr('Guía')+'</a>'
      +'<div class="lg"><button type="button" data-l="es" title="Español"'+(L==='es'?' class="on"':'')+'>'+FLAG.es+'</button><button type="button" data-l="it" title="Italiano"'+(L==='it'?' class="on"':'')+'>'+FLAG.it+'</button></div>'
      +'</form>';
    document.body.appendChild(d);
    if(L==='it') trNode(d);
    d.querySelectorAll('.lg button').forEach(function(b){b.onclick=function(){CX.setLang(b.getAttribute('data-l'))}});
    var form=d.querySelector('form'), pw=d.querySelector('#cxPw'), err=d.querySelector('#cxErr');
    form.onsubmit=function(e){
      e.preventDefault();
      findWs(pw.value).then(function(acc){
        var ws=acc&&WORKSPACES[acc.ws];
        if(!ws){ err.textContent=tr('Clave incorrecta. Revisá mayúsculas y espacios.'); pw.select(); return }
        var store=d.querySelector('#cxRem').checked?localStorage:sessionStorage;
        store.setItem('cx.ws',ws.id); store.setItem('cx.role',acc.role); store.setItem('cx.h',acc.hash); start(ws,acc.role,acc.hash);
      });
    };
    setTimeout(function(){pw.focus()},50);
  }
  function boot(){
    if(L==='it') trNode(document.body);
    var id=sessionStorage.getItem('cx.ws')||localStorage.getItem('cx.ws'), role=sessionStorage.getItem('cx.role')||localStorage.getItem('cx.role');
    var hh=sessionStorage.getItem('cx.h')||localStorage.getItem('cx.h');
    if(id&&WORKSPACES[id]&&(role==='viewer'||role==='editor')&&hh) start(WORKSPACES[id],role,hh); else showLogin();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
