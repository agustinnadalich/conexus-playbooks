/* ===== Sincronización con Supabase: plan compartido, conflictos, quién edita qué, historial ===== */
(()=>{
const C=CX.cfg; if(!C||!C.url||!C.key||!CX.hash) return;
const T=(es,it)=>CX.lang==='it'?it:es, editor=CX.role==='editor';
const hdr={apikey:C.key,'Content-Type':'application/json'}; if(C.key.indexOf('eyJ')===0) hdr.Authorization='Bearer '+C.key;
const rpc=async(fn,body)=>{const r=await fetch(C.url+'/rest/v1/rpc/'+fn,{method:'POST',headers:hdr,body:JSON.stringify(body)}); if(!r.ok) throw new Error(fn+' '+r.status); return r.json()};
let who=localStorage.getItem('cx.who')||'';
if(editor&&!who){who=(prompt(T('¿Cómo te llamás? (así te ven los demás editores)','Come ti chiami? (così ti vedono gli altri editor)'))||'').trim()||('Editor '+(100+Math.floor(Math.random()*900))); try{localStorage.setItem('cx.who',who)}catch(e){}}
if(!who) who='viewer';
let base=JSON.stringify(data), rv=CX.rv||0, dirty=false, applying=false, pushing=false, timer=null, pendingRemote=null, down=false, others=[];
window.addEventListener('pointerdown',()=>{down=true},true); window.addEventListener('pointerup',()=>{down=false},true);
/* ---- barra de estado ---- */
const bar=document.createElement('div'); bar.id='syncBar'; document.body.appendChild(bar);
const warn=document.createElement('div'); warn.id='presWarn'; document.body.appendChild(warn);
function setStatus(k,extra){
  const m={ok:['☁ '+T('Guardado','Salvato')+' · v'+rv,'#34d399'],pending:['⏳ '+T('Guardando…','Salvataggio…'),'#facc15'],off:['⚠ '+T('Sin conexión: reintentando','Offline: nuovo tentativo'),'#f7ae59'],ro:['👁 '+T('Solo lectura · v','Sola lettura · v')+rv,'#b3bdcc'],conf:['⚠ '+T('Hay cambios de otra persona','Ci sono modifiche di un\'altra persona'),'#e7555f'],err:['⚠ '+T('No se pudo guardar','Impossibile salvare'),'#e7555f']}[k];
  bar.innerHTML='<span style="color:'+m[1]+'">'+m[0]+'</span>'+(others.length?' · 👥 '+others.map(o=>o.who).join(', '):'')+(extra||'');
}
/* ---- aplicar un plan remoto ---- */
function applyRemote(d,v){
  applying=true;
  try{
    const curId=steps[cur]&&steps[cur].id;
    data=normalize(JSON.parse(JSON.stringify(d))); steps=data.steps; migrateLegacy(); undoStack=[]; redoStack=[]; history=[];
    mapDir=data.mapDir==='v'?'v':'h'; if($('#kHoldAuto')) $('#kHoldAuto').checked=!!data.holdEnd;
    save(); mapFitted=false; const ix=idxOf(curId); goDirect(ix>=0?ix:Math.max(0,idxOf(data.starts[0].root))); setView(view);
    rv=v; dirty=false; pendingRemote=null; base=JSON.stringify(data);
  }finally{applying=false}
}
/* ---- guardar ---- */
const _save=save;
save=function(){_save.apply(null,arguments); if(!applying&&editor){dirty=true; clearTimeout(timer); timer=setTimeout(push,1500); setStatus('pending')}};
async function push(force){
  if(!editor||pushing||!dirty) return; pushing=true; const snap=JSON.stringify(data);
  try{
    const r=await rpc('cx_save',{p_hash:CX.hash,p_who:who,p_base:rv,p_data:JSON.parse(snap)});
    if(r.ok){rv=r.version; base=snap; dirty=JSON.stringify(data)!==snap; pendingRemote=null; setStatus('ok'); if(dirty){clearTimeout(timer); timer=setTimeout(push,800)}}
    else if(r.conflict){pendingRemote=r; resolve(r)}
    else setStatus('err',' ('+(r.error||'?')+')');
  }catch(e){setStatus('off'); clearTimeout(timer); timer=setTimeout(push,8000)}
  pushing=false;
}
/* ---- combinar cambios (por escena) ---- */
const J=x=>JSON.stringify(x);
function mergeList(bl,ml,tl,onConf){
  const idx=a=>{const o={}; (a||[]).forEach(x=>o[x.id]=x); return o}, B=idx(bl),M=idx(ml),seen=new Set(),out=[];
  (tl||[]).forEach(t=>{seen.add(t.id); const b=B[t.id], m=M[t.id];
    if(!b){ if(m&&J(m)!==J(t)) onConf(t.id,m,t); out.push(t); return }
    const mc=!m||J(m)!==J(b), tc=J(t)!==J(b);
    if(!m){ if(tc) onConf(t.id,null,t); else return; out.push(t); return }
    if(mc&&!tc) out.push(m); else if(!mc||J(m)===J(t)) out.push(t); else { onConf(t.id,m,t); out.push(t) }
  });
  (ml||[]).forEach(m=>{ if(seen.has(m.id)) return; const b=B[m.id]; if(!b||J(m)!==J(b)) out.push(m) }); // nuevas mías, o cambiadas por mí aunque otro las borró
  return out;
}
function mergePlans(b,m,t){
  const conflicts=[], res=JSON.parse(J(t));
  res.steps=mergeList(b.steps,m.steps,t.steps,(id,mine,theirs)=>conflicts.push({id,mine,theirs}));
  res.starts=mergeList(b.starts,m.starts,t.starts,()=>{});
  const keys=new Set([...Object.keys(m),...Object.keys(t)]); keys.delete('steps'); keys.delete('starts');
  keys.forEach(k=>{
    if(k==='layoutOff'){ const lo=JSON.parse(J(t.layoutOff||{})); const ml=m.layoutOff||{}, bl=b.layoutOff||{};
      Object.keys(ml).forEach(d=>Object.keys(ml[d]||{}).forEach(id=>{ if(J(ml[d][id])!==J((bl[d]||{})[id])){ lo[d]=lo[d]||{}; lo[d][id]=ml[d][id] } })); res.layoutOff=lo; return }
    if(J(m[k])!==J(b[k])&&J(t[k])===J(b[k])) res[k]=m[k];
  });
  return {data:res,conflicts};
}
function finishMerge(d,ver){ applyRemote(d,ver); base=J(JSON.parse(J(pendingRemote&&pendingRemote.data||d))); dirty=true; pendingRemote=null; push() }
function resolve(r){
  let res; try{res=mergePlans(JSON.parse(base),JSON.parse(J(data)),r.data)}catch(e){return conflictBasic(r)}
  base=J(r.data);
  if(!res.conflicts.length){ applyRemote(res.data,r.version); base=J(r.data); dirty=true; pendingRemote=null; toast(T('Se combinaron tus cambios con los de '+(r.updated_by||'otra persona')+'.','Le tue modifiche sono state unite a quelle di '+(r.updated_by||'un\'altra persona')+'.')); setTimeout(push,300); return }
  setStatus('conf'); document.querySelectorAll('.cxconf').forEach(n=>n.remove());
  const names=res.conflicts.map(c=>((c.theirs||c.mine||{}).title||c.id));
  const ov=document.createElement('div'); ov.className='modal cxconf'; const bx=document.createElement('div'); bx.className='box';
  bx.innerHTML='<h3 style="margin-top:0">⚠ '+T('Tocaron la misma escena que vos','Hanno modificato la tua stessa scena')+'</h3><p>'+T('<b>'+(r.updated_by||'Alguien')+'</b> y vos cambiaron estas escenas a la vez:','<b>'+(r.updated_by||'Qualcuno')+'</b> e tu avete modificato queste scene contemporaneamente:')+'</p><ul>'+names.map(n=>'<li>'+n.replace(/</g,'&lt;')+'</li>').join('')+'</ul><p class="hint">'+T('Lo demás de ambos ya se combinó. Elegí con cuál versión te quedás en estas escenas (la otra queda en el historial).','Il resto di entrambi è già stato unito. Scegli quale versione tenere per queste scene (l\'altra resta nello storico).')+'</p><div class="row2" style="flex-direction:column;align-items:stretch;gap:8px"><button class="a">'+T('Me quedo con la mía','Tengo la mia')+'</button><button class="b">'+T('Me quedo con la suya','Tengo la sua')+'</button></div>';
  const done=mine=>{ ov.remove(); res.conflicts.forEach(c=>{ const i=res.data.steps.findIndex(x=>x.id===c.id); if(mine){ if(c.mine){ if(i>=0) res.data.steps[i]=c.mine; else res.data.steps.push(c.mine) } else if(i>=0) res.data.steps.splice(i,1) } }); applyRemote(res.data,r.version); base=J(r.data); dirty=true; pendingRemote=null; setTimeout(push,300) };
  bx.querySelector('.a').onclick=()=>done(true); bx.querySelector('.b').onclick=()=>done(false);
  ov.appendChild(bx); document.body.appendChild(ov);
}
function conflictBasic(r){ applyRemote(r.data,r.version); toast(T('Se cargó la versión de '+(r.updated_by||'otra persona'),'Caricata la versione di '+(r.updated_by||'un\'altra persona'))) }
/* ---- ver cambios de otros ---- */
async function poll(){
  try{
    const v=await rpc('cx_version',{p_hash:CX.hash});
    if(v.ok&&v.version>rv&&!pendingRemote){
      if(dirty||pushing){pendingRemote={version:v.version,updated_by:v.updated_by}; setStatus('conf')}
      else if(!down&&!animating&&!/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||'')){
        const g=await rpc('cx_get',{p_hash:CX.hash}); if(g.ok&&g.version>rv){applyRemote(g.data,g.version); toast(T('Plan actualizado por ','Piano aggiornato da ')+(g.updated_by||'?')); setStatus(editor?'ok':'ro')}
      }
    } else if(!dirty&&!pushing&&!pendingRemote) setStatus(editor?'ok':'ro');
  }catch(e){setStatus('off')}
}
setInterval(poll,8000);
/* ---- quién está en qué escena ---- */
async function presence(){
  if(!editor) return;
  try{
    const sc=(steps[cur]&&steps[cur].id)||''; others=await rpc('cx_presence',{p_hash:CX.hash,p_who:who,p_scene:sc});
    const same=others.filter(o=>o.scene===sc);
    warn.style.display=(same.length&&view==='board')?'block':'none';
    warn.textContent='⚠ '+same.map(o=>o.who).join(', ')+' '+T(same.length>1?'están editando esta escena':'está editando esta escena','sta modificando questa scena')+'. '+T('Coordinen para no pisarse.','Coordinatevi per non sovrascrivervi.');
    if(!dirty&&!pushing) setStatus('ok');
  }catch(e){}
}
if(editor){setInterval(presence,5000); setTimeout(presence,800)}
/* ---- historial de versiones ---- */
if(editor){
  const jd=$('#jDown'); if(jd){
    const b=document.createElement('button'); b.textContent='🕘 '+T('Versiones guardadas','Versioni salvate'); b.title=T('Recuperar una versión anterior del plan','Recupera una versione precedente del piano'); jd.parentNode.appendChild(b);
    b.onclick=async()=>{
      let list=[]; try{list=await rpc('cx_history',{p_hash:CX.hash})}catch(e){return toast(T('Sin conexión','Offline'))}
      const ov=document.createElement('div'); ov.className='modal'; const bx=document.createElement('div'); bx.className='box'; bx.style.maxHeight='80vh'; bx.style.overflow='auto';
      bx.innerHTML='<h3 style="margin-top:0">🕘 '+T('Versiones guardadas','Versioni salvate')+'</h3><p class="hint">'+T('Se guardan las últimas 40. Restaurar crea una versión nueva (no borra nada).','Si conservano le ultime 40. Ripristinare crea una nuova versione (non cancella nulla).')+'</p><div id="hv"></div><div class="row2"><button class="cl">'+T('Cerrar','Chiudi')+'</button></div>';
      const hv=bx.querySelector('#hv'); if(!list.length) hv.textContent=T('Todavía no hay versiones.','Non ci sono ancora versioni.');
      list.forEach(it=>{const row=document.createElement('div'); row.style.cssText='display:flex;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid #323c52'; const d=new Date(it.saved_at);
        row.innerHTML='<span style="flex:1">v'+it.version+' · '+d.toLocaleString(CX.lang==='it'?'it-IT':'es-AR')+' · '+(it.saved_by||'?')+'</span>'; const rb=document.createElement('button'); rb.textContent=T('Restaurar','Ripristina');
        rb.onclick=async()=>{if(!confirm(T('¿Restaurar la versión '+it.version+'? Pasa a ser la versión actual.','Ripristinare la versione '+it.version+'? Diventa la versione attuale.'))) return; const g=await rpc('cx_history_get',{p_hash:CX.hash,p_version:it.version}); if(!g.ok) return toast('Error'); ov.remove(); applyRemote(g.data,rv); dirty=true; push(); toast(T('Versión restaurada.','Versione ripristinata.'))};
        row.appendChild(rb); hv.appendChild(row)});
      bx.querySelector('.cl').onclick=()=>ov.remove(); ov.onclick=e=>{if(e.target===ov) ov.remove()}; ov.appendChild(bx); document.body.appendChild(ov);
    };
  }
}
if(editor){bar.style.cursor='pointer'; bar.title=T('Clic para cambiar tu nombre','Clic per cambiare il tuo nome'); bar.onclick=()=>{const n=(prompt(T('Tu nombre (lo ven los demás editores):','Il tuo nome (lo vedono gli altri editor):'),who)||'').trim(); if(n){who=n.slice(0,40); try{localStorage.setItem('cx.who',who)}catch(e){} presence()}}}
setStatus(editor?'ok':'ro');
if(CX.offline) setStatus('off');
})();
