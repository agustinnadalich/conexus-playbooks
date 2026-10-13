import json,re,os,base64,hashlib,sys
import pathlib
ROOT=pathlib.Path(__file__).resolve().parent.parent
SRC=str(ROOT/'src'/'app.html')
OUT=str(ROOT/'docs'/'index.html')
s=open(SRC,encoding='utf8').read()
def rep(x,y,cnt=1):
    global s
    assert x in s,'NO MATCH: '+x[:100]
    s=s.replace(x,y,cnt)

# ---- tabla de traducción ----
exact=[];rules=[]
for line in open(str(ROOT/'src'/'it_table.txt')):
    line=line.rstrip('\n')
    if not line.strip() or line.startswith('#') or ' ⟫ ' not in line: continue
    if line.startswith('R: '):
        a,b=line[3:].split(' ⟫ ',1); rules.append([a,b.replace('\\n','\n')])
    else:
        a,b=line.split(' ⟫ ',1); exact.append([a.replace('\\n','\n').strip(),b.replace('\\n','\n')])
print(len(exact),'exactas',len(rules),'reglas')

# ---- cabecera / metas ----
logo=re.search(r'<div class="brand"><img alt="Conexus" src="(data:image/svg\+xml;base64,[^"]+)"',s).group(1)
rep('<title>Conexus · Plan de juego (timeline)</title>','<title>Conexus · Plan de juego</title>\n<meta name="robots" content="noindex,nofollow">\n<link rel="icon" href="'+logo+'">')
rep('<div class="brand"><img alt="Conexus" src=','<div class="brand"><img id="brandLogo" alt="Conexus" src=')
rep('<span>Plan de juego · Rugby · timeline</span>','<span>Plan de juego · Rugby</span>')
rep('<select id="startSel"></select></div>','<select id="startSel"></select>\n    <span id="langSel" class="flags"><button data-l="es" title="Español"></button><button data-l="it" title="Italiano"></button></span>\n    <button id="tourBtn" title="Tutorial interactivo paso a paso">🎓 Tutorial</button>\n    <a id="guideLink" class="btnlink" href="guia.html" target="_blank" rel="noopener" title="Abrir la guía de uso">📖 Guía</a>\n    <button id="logoutBtn" title="Salir de este espacio">⎋ Salir</button></div>')
rep('<div class="tools"><button id="uUndo"','<div class="tools"><span id="wsBadge" class="wsb"></span><button id="uUndo"')
# ---- CSS ----
rep('</style>','''
.wsb{font-weight:700;font-size:12px;color:var(--pri);border:1px solid var(--pri);border-radius:99px;padding:2px 10px;margin-right:6px;white-space:nowrap}
.tools .flags{display:inline-flex;gap:4px}
.tools .flags button,#cxLogin .lg button{padding:4px 6px;line-height:0;border-radius:8px;opacity:.55}
.tools .flags button.on,#cxLogin .lg button.on{opacity:1;border-color:#4fd1e5;background:#252f47}
#cxLogin .lg button.on{background:#252f47;color:inherit}
#cxLogin input[type=password]{color:#f1f5f9}
html.cx-viewer body.view-map .side{display:none}
html.cx-share #vMap,html.cx-share #vList,html.cx-share #vBoard,html.cx-share #vPres{display:none!important}
html.cx-viewer body.view-map .app{grid-template-columns:minmax(0,1fr)}
html.cx-viewer #vList,html.cx-viewer #vBoard,html.cx-viewer #uUndo,html.cx-viewer #uRedo,html.cx-viewer #mAuto,html.cx-viewer .mnode .addh,html.cx-viewer .mnode .open,html.cx-viewer .mghost button,html.cx-viewer #tOpen,html.cx-viewer #jsonBtn,html.cx-viewer .startpanel,html.cx-viewer .wsedit{display:none!important}
.primary{background:#4fd1e5;color:#072029;border-color:#4fd1e5;font-weight:700}
#tourSpot{position:fixed;z-index:900;border-radius:12px;box-shadow:0 0 0 9999px rgba(8,12,22,.62),0 0 0 3px #4fd1e5;pointer-events:none;transition:all .25s ease}
#tourCard{position:fixed;z-index:901;background:#1d2435;border:1px solid #4fd1e5;border-radius:16px;padding:14px 16px;box-shadow:0 20px 60px rgba(0,0,0,.6);font-size:14px;line-height:1.5;max-height:calc(100vh - 24px);overflow:auto}
#tourCard .tt{font-weight:700;font-size:16px;color:#4fd1e5;margin-bottom:6px}
#tourCard .ta{display:flex;gap:8px;margin:10px 0 0;flex-wrap:wrap}
#tourCard .tf{display:flex;gap:8px;align-items:center;margin-top:12px;border-top:1px solid #323c52;padding-top:10px}
#tourCard .sp{flex:1}#tourCard .tn{font-size:12px;color:#b3bdcc}
.modal.cxconf{z-index:950}
#syncBar{position:fixed;left:8px;bottom:8px;max-width:calc(100vw - 16px);z-index:60;background:#1d2435;border:1px solid #323c52;border-radius:999px;padding:4px 12px;font-size:12px;color:#b3bdcc;box-shadow:0 6px 18px rgba(0,0,0,.4)}
#presWarn{position:fixed;left:50%;transform:translateX(-50%);top:62px;z-index:70;background:#3b1d22;border:1px solid #e7555f;color:#fecaca;border-radius:12px;padding:8px 14px;font-size:13px;display:none;max-width:90vw}
.wsb{max-width:56vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wsb{font-size:12px;color:#b3bdcc;border:1px solid #323c52;border-radius:999px;padding:3px 10px;white-space:nowrap}
.btnlink{display:inline-block;text-decoration:none;color:var(--fg);background:var(--card2);border:1px solid var(--line);border-radius:10px;padding:6px 11px;font-size:13px;white-space:nowrap}
.btnlink:hover{border-color:var(--pri)}
.tools button#logoutBtn{padding:6px 10px;font-size:12.5px}
body.cx-locked>header,body.cx-locked>main{display:none}
#cxLogin{position:fixed;inset:0;display:grid;place-items:center;background:radial-gradient(900px 500px at 80% -10%,#202c4a 0,transparent 60%),#181e2f;z-index:500;padding:16px}
#cxLogin .lbox{width:min(380px,100%);background:#1d2435;border:1px solid #323c52;border-radius:18px;padding:28px 26px;display:flex;flex-direction:column;gap:12px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.55)}
#cxLogin img{width:64px;height:64px;margin:0 auto}
#cxLogin h2{margin:0;font-size:19px}
#cxLogin p{margin:0;color:#b3bdcc;font-size:13.5px}
#cxLogin input[type=password]{text-align:center;font-size:16px;padding:11px}
#cxLogin .rem{display:flex;gap:8px;align-items:center;justify-content:center;font-size:12.5px;color:#b3bdcc}
#cxLogin .rem input{width:auto;accent-color:#4fd1e5}
#cxLogin .go{background:#4fd1e5;color:#072029;border-color:#4fd1e5;font-weight:700;padding:11px}
#cxLogin .err{min-height:18px;color:#e7555f;font-size:12.5px}
#cxLogin .lg{display:flex;gap:6px;justify-content:center}
#cxLogin .lg button{padding:5px 14px;font-size:12.5px}
#cxLogin .lg button.on{background:#4fd1e5;color:#072029;border-color:#4fd1e5}
.mnode .vid{position:absolute;left:8px;bottom:6px;font-size:12px}
</style>''')
# ---- script: envoltorio de arranque ----
rep('<script>\n(()=>{\nconst NS=','<script>\nwindow.__startApp=async()=>{\n'+'''{const K0='cx.'+CX.ws+'.plan'; if(!localStorage.getItem(K0)){
  const t=await (async()=>{try{const r=await fetch('data/'+CX.ws+'.json',{cache:'no-store'}); return r.ok?await r.text():null}catch(e){return null}})();
  if(t){try{JSON.parse(t); localStorage.setItem(K0,t)}catch(e){}} }}
if(CX.share&&CX.cfg&&CX.cfg.key){ try{
  const rs=await fetch(CX.cfg.url+'/rest/v1/rpc/cx_share_get',{method:'POST',headers:Object.assign({apikey:CX.cfg.key,'Content-Type':'application/json'},CX.cfg.key.indexOf('eyJ')===0?{Authorization:'Bearer '+CX.cfg.key}:{}),body:JSON.stringify({p_token:CX.share})});
  const js=await rs.json();
  if(!js.ok){ document.body.innerHTML='<div style="display:grid;place-items:center;height:100vh;color:#f1f5f9;font:16px Montserrat,system-ui,sans-serif;text-align:center;padding:24px">'+CX.tr('Este link no es válido o fue eliminado.')+'</div>'; return }
  localStorage.setItem('cx.'+CX.ws+'.plan',JSON.stringify(js.data)); CX.wsName=js.name; const bg=document.getElementById('wsBadge'); if(bg) bg.textContent=js.name;
}catch(e){CX.offline=true} }
if(CX.cfg&&CX.cfg.key&&CX.hash){ try{
  const r0=await fetch(CX.cfg.url+'/rest/v1/rpc/cx_get',{method:'POST',headers:Object.assign({apikey:CX.cfg.key,'Content-Type':'application/json'},CX.cfg.key.indexOf('eyJ')===0?{Authorization:'Bearer '+CX.cfg.key}:{}),body:JSON.stringify({p_hash:CX.hash})});
  const j0=await r0.json();
  if(j0.ok){ CX.rv=j0.version; if(j0.data&&Array.isArray(j0.data.steps)&&j0.data.steps.length) localStorage.setItem('cx.'+CX.ws+'.plan',JSON.stringify(j0.data)); }
  else if(j0.error==='auth'){ CX.logout(); return }
}catch(e){CX.offline=true} }
const NS=''')
rep('})();\n</script>\n</body>','};\n</script>\n@@GATE@@\n</body>')
rep("const KEY='rugbyBoard.tl1';","const KEY='cx.'+CX.ws+'.plan', CLIPKEY='cx.'+CX.ws+'.clip';")
s=s.replace("'rugbyBoard.clip'","CLIPKEY")
rep("  try{const raw=localStorage.getItem('rugbyBoard.v2'); if(raw) return normalize(JSON.parse(raw));}catch(e){}\n","")
# ---- semilla traducible ----
rep("const s={id:d.id,title:d.title,text:d.text,players,ball,","const s={id:d.id,title:CX.tr(d.title),text:CX.tr(d.text),players,ball,")
rep("paths:clone(d.paths||{})};\n    if(d.next===null) s.next=null;","paths:clone(d.paths||{})};\n    s.options.forEach(o=>{o.label=CX.tr(o.label)});\n    if(d.next===null) s.next=null;")
rep("return {version:3,title:'Plan de juego',starts:[{id:'st1',kind:'lineout',name:'Lineout izquierda',root:'s1'}],steps:out};","return {version:3,title:CX.tr('Plan de juego'),starts:[{id:'st1',kind:'lineout',name:CX.tr('Lineout izquierda'),root:'s1'}],steps:out};")
# ---- nombres por defecto en el idioma activo ----
rep("const optName=k=>'Opción '+String.fromCharCode(65+k);","const optName=k=>CX.tr('Opción')+' '+String.fromCharCode(65+k);")
rep("blankFrom(c,'Paso nuevo')","blankFrom(c,CX.tr('Paso nuevo'))")
rep("blankFrom(c,'Rama nueva')","blankFrom(c,CX.tr('Rama nueva'))")
rep("blankFrom(a,'Opciones · '+(a.title||'escena'))","blankFrom(a,CX.tr('Opciones')+' · '+(a.title||CX.tr('Escena')))")
rep("name=$('#nsName').value.trim()||KINDS[kind].n;","name=$('#nsName').value.trim()||CX.tr(KINDS[kind].n);")
rep("title:'Inicio · '+name,","title:CX.tr('Inicio')+' · '+name,")
rep("blankFrom(c,o.label||'Escena nueva')","blankFrom(c,o.label||CX.tr('Escena nueva'))")
rep("type:'text',x:28,y:33,text:'Texto',","type:'text',x:28,y:33,text:CX.tr('Texto'),")
# ---- video por escena ----
rep('      <label class="field">Explicación<textarea id="fText"></textarea></label>','''      <label class="field">Explicación<textarea id="fText"></textarea></label>
      <label class="field">Video (link)<input id="fVideo" type="url" placeholder="https://www.youtube.com/watch?v=…"></label>
      <p class="hint" style="margin:-4px 0 8px">Pegá el link de YouTube, Vimeo u otro sitio. En la presentación aparece el botón «🎬 Video».</p>''')
rep('          <button id="bReset">⟲ Inicio</button>','          <button id="bReset">⟲ Inicio</button>\n          <button id="bVideo" style="display:none" title="Ver el video de esta escena">🎬 Video</button>')
rep("$('#bStop').disabled=!(animating||playing); $('#bReplay').disabled=animating||isRoot(cur)||typeOf(cur)==='decision';","$('#bStop').disabled=!(animating||playing); $('#bReplay').disabled=animating||isRoot(cur)||typeOf(cur)==='decision';\n  $('#bVideo').style.display=s.video?'':'none';")
rep("$('#fVideo')" if False else "    $('#fTitle').value=s.title; $('#fText').value=s.text; $('#fStatus').value=s.status||'';","    $('#fTitle').value=s.title; $('#fText').value=s.text; $('#fStatus').value=s.status||''; $('#fVideo').value=s.video||'';")
rep("$('#fStatus').onchange=e=>{setStatus(cur,e.target.value)};","$('#fStatus').onchange=e=>{setStatus(cur,e.target.value)};\n$('#fVideo').oninput=e=>{const v=e.target.value.trim(); if(v) steps[cur].video=v; else delete steps[cur].video; save(); $('#bVideo').style.display=v?'':'none'};\n$('#bVideo').onclick=()=>{const sc=steps[cur]; if(sc.video) openVideo(sc.video)};")
rep("    if(s.status){const sb=document.createElement('div'); sb.className='stb';","    if(s.video){const vb=document.createElement('div'); vb.className='vid'; vb.textContent='🎬'; vb.title='Esta escena tiene video'; d.appendChild(vb)}\n    if(s.status){const sb=document.createElement('div'); sb.className='stb';")
rep("tipo.textContent=typeText(r.i);","tipo.textContent=typeText(r.i)+(r.s.video?' 🎬':'');")
rep('<option value="draft">Sin hacer (borrador)</option>','<option value="video">🎬 Con video</option><option value="draft">Sin hacer (borrador)</option>')
rep("if(ff==='ref'&&!r.root) return false;","if(ff==='ref'&&!r.root) return false; if(ff==='video'&&!r.s.video) return false;")
rep("delete n.status; delete n.draft; n.draft=sceneSig(n); return n;","delete n.status; delete n.draft; delete n.video; n.draft=sceneSig(n); return n;")
rep("/* ---------- nuevo inicio ---------- */",r'''/* ---------- video ---------- */
function videoInfo(url){
  try{
    const u=new URL(url), h=u.hostname.replace(/^www\./,'');
    const tp=v=>{if(!v) return 0; if(/^\d+$/.test(v)) return +v; const m=v.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/); return (+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0)};
    let id=null, start=0;
    if(h==='youtu.be'){id=u.pathname.slice(1); start=tp(u.searchParams.get('t')||u.searchParams.get('start'))}
    else if(h.endsWith('youtube.com')){
      if(u.pathname==='/watch') id=u.searchParams.get('v'); else {const m=u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/); if(m) id=m[1]}
      start=tp(u.searchParams.get('t')||u.searchParams.get('start'));
    }
    if(id) return {embed:`https://www.youtube-nocookie.com/embed/${id}?rel=0&start=${start}`,url:u.href};
    if(h==='vimeo.com'||h==='player.vimeo.com'){const m=u.pathname.match(/(\d+)/); if(m) return {embed:`https://player.vimeo.com/video/${m[1]}`,url:u.href}}
    if(u.protocol==='http:'||u.protocol==='https:') return {embed:null,url:u.href};
  }catch(e){}
  return null;
}
function openVideo(url){
  const v=videoInfo(url); if(!v){toast('El link del video no es válido.'); return}
  if(!v.embed){window.open(v.url,'_blank','noopener'); return}
  const ov=document.createElement('div'); ov.className='modal';
  const bx=document.createElement('div'); bx.className='box wide'; bx.style.maxWidth='900px';
  bx.innerHTML='<div class="vwrap" style="position:relative;padding-top:56.25%;border-radius:10px;overflow:hidden;background:#000"><iframe style="position:absolute;inset:0;width:100%;height:100%;border:0" allowfullscreen allow="fullscreen; picture-in-picture; encrypted-media"></iframe></div><div class="row2" style="margin-top:10px"><a class="btnlink" target="_blank" rel="noopener">Abrir en una pestaña nueva ↗</a><button class="cl">Cerrar</button></div>';
  bx.querySelector('iframe').src=v.embed; bx.querySelector('a').href=v.url;
  bx.querySelector('.cl').onclick=()=>ov.remove(); ov.onclick=e=>{if(e.target===ov) ov.remove()};
  ov.appendChild(bx); document.body.appendChild(ov);
}

/* ---------- nuevo inicio ---------- */''')
rep("Object.entries(KINDS).forEach(([k,v])=>$('#nsKind').add(new Option(`${v.g}  ${v.n}`,k)));","Object.entries(KINDS).forEach(([k,v])=>$('#nsKind').add(new Option(`${v.g}  ${CX.tr(v.n)}`,k)));")
tour=open(str(ROOT/'src'/'tour.js'),encoding='utf8').read()+'\n'+open(str(ROOT/'src'/'sync.js'),encoding='utf8').read()+'\n'+open(str(ROOT/'src'/'share.js'),encoding='utf8').read()
rep("lastSnap=JSON.stringify(data);\n$('#uUndo').onclick=undo;","lastSnap=JSON.stringify(data);\n$('#uUndo').onclick=undo;\n"+tour)
# ---- modo solo lectura ----
rep("function setView(v){\n  view=v;","function setView(v){\n  if(CX.share) v='pres'; else if(CX.role==='viewer'&&(v==='list'||v==='board')) v='map';\n  view=v;")
rep("function openBoard(i){history=[]; if(i!==undefined&&i>=0){cur=i} playT=dur(cur); setView('board')}","function openBoard(i){history=[]; if(i!==undefined&&i>=0){cur=i} playT=dur(cur); setView(CX.role==='viewer'?'pres':'board')}")
rep("    if(e.button!==0||e.target.closest('button,input')) return;\n    let kind=null, ps=null;","    if(CX.role==='viewer'||e.button!==0||e.target.closest('button,input')) return;\n    let kind=null, ps=null;")
rep("d.oncontextmenu=e=>{e.preventDefault();","d.oncontextmenu=e=>{e.preventDefault(); if(CX.role==='viewer') return;")
rep("    t.ondblclick=e=>{\n      e.stopPropagation();","    t.ondblclick=e=>{\n      e.stopPropagation(); if(CX.role==='viewer') return;")
# ---- plan publicado + idioma/salida ----
rep('        <button id="jReset">Restablecer ejemplo</button>','        <button id="jPub" title="Reemplaza lo que tenés en este espacio por el plan publicado por el equipo (podés deshacerlo con ↶)">↻ Cargar plan publicado</button>\n        <button id="jReset">Restablecer ejemplo</button>')
rep("$('#jReset').onclick=","""$('#jPub').onclick=async()=>{
  let t=null; try{const r=await fetch('data/'+CX.ws+'.json',{cache:'no-store'}); if(r.ok) t=await r.text()}catch(e){}
  if(!t) return msg('No hay plan publicado para este espacio.');
  if(!confirm('Esto reemplaza lo que tenés en este espacio por el plan publicado. Podés deshacerlo con ↶. ¿Seguir?')) return;
  try{ data=normalize(JSON.parse(t)); steps=data.steps; migrateLegacy(); history=[]; save(); mapFitted=false; goDirect(idxOf(data.starts[0].root)); setView(view); msg('Plan publicado cargado.') }
  catch(err){ msg('Archivo inválido: '+err.message) }
};
$('#jReset').onclick=""")
rep('<p class="hint" id="jMsg" style="margin-top:6px"></p>','<p class="hint" id="jMsg" style="margin-top:6px"></p>\n      <p class="hint">Tus cambios se guardan en este navegador y solo los ves vos. Para compartirlos usá «Copiar JSON» o «Descargar».</p>')
rep("lastSnap=JSON.stringify(data);\n$('#uUndo').onclick=undo;","document.querySelectorAll('#langSel button').forEach(bt=>{bt.innerHTML=CX.flag[bt.dataset.l]; bt.classList.toggle('on',bt.dataset.l===CX.lang); bt.onclick=()=>{if(bt.dataset.l!==CX.lang) CX.setLang(bt.dataset.l)}}); $('#logoutBtn').onclick=()=>CX.logout(); $('#guideLink').href='guia.html?lang='+CX.lang;\nlastSnap=JSON.stringify(data);\n$('#uUndo').onclick=undo;")

# ---- puerta de acceso + i18n ----
gate=open(str(ROOT/'src'/'gate.js')).read()
H=lambda k:hashlib.sha256(('conexus-play|'+k).encode()).hexdigest()
gate=gate.replace('@@CFG@@',json.dumps(json.load(open(str(ROOT/'src'/'config.json'))))).replace('@@H_SL_V@@',H('sanluis')).replace('@@H_SL_E@@',H('sanluisedit')).replace('@@H_PE_V@@',H('pescararugby')).replace('@@H_PE_E@@',H('pescararugbyedit')).replace('@@H_TU_V@@',H('tucumanrugby')).replace('@@H_TU_E@@',H('tucumanrugbyedit'))
gate=gate.replace('@@IT_EXACT@@',json.dumps(exact,ensure_ascii=False)).replace('@@IT_RULES@@',json.dumps(rules,ensure_ascii=False))
s=s.replace('@@GATE@@','<script>\n'+gate+'</script>')
open(OUT,'w',encoding='utf8').write(s)
print('OK',OUT,len(s))
