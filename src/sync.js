/* ===== Sincronización con Supabase: plan compartido, conflictos, quién edita qué, historial ===== */
(()=>{
const C=CX.cfg; if(!C||!C.url||!C.key||!CX.hash) return;
const T=(es,it)=>CX.lang==='it'?it:es, editor=CX.role==='editor';
const hdr={apikey:C.key,'Content-Type':'application/json'}; if(C.key.indexOf('eyJ')===0) hdr.Authorization='Bearer '+C.key;
const rpc=async(fn,body)=>{const r=await fetch(C.url+'/rest/v1/rpc/'+fn,{method:'POST',headers:hdr,body:JSON.stringify(body)}); if(!r.ok) throw new Error(fn+' '+r.status); return r.json()};
let who=localStorage.getItem('cx.who')||'';
if(editor&&!who){who=(prompt(T('¿Cómo te llamás? (así te ven los demás editores)','Come ti chiami? (così ti vedono gli altri editor)'))||'').trim()||('Editor '+(100+Math.floor(Math.random()*900))); try{localStorage.setItem('cx.who',who)}catch(e){}}
if(!who) who='viewer';
let rv=CX.rv||0, dirty=false, applying=false, pushing=false, timer=null, pendingRemote=null, down=false, others=[];
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
    rv=v; dirty=false; pendingRemote=null;
  }finally{applying=false}
}
/* ---- guardar ---- */
const _save=save;
save=function(){_save.apply(null,arguments); if(!applying&&editor){dirty=true; clearTimeout(timer); timer=setTimeout(push,1500); setStatus('pending')}};
async function push(force){
  if(!editor||pushing||!dirty) return; pushing=true; const snap=JSON.stringify(data);
  try{
    const r=await rpc('cx_save',{p_hash:CX.hash,p_who:who,p_base:rv,p_data:JSON.parse(snap)});
    if(r.ok){rv=r.version; dirty=JSON.stringify(data)!==snap; pendingRemote=null; setStatus('ok'); if(dirty){clearTimeout(timer); timer=setTimeout(push,800)}}
    else if(r.conflict){pendingRemote=r; conflict(r)}
    else setStatus('err',' ('+(r.error||'?')+')');
  }catch(e){setStatus('off'); clearTimeout(timer); timer=setTimeout(push,8000)}
  pushing=false;
}
function conflict(r){
  setStatus('conf'); document.querySelectorAll('.cxconf').forEach(n=>n.remove());
  const ov=document.createElement('div'); ov.className='modal cxconf'; const bx=document.createElement('div'); bx.className='box';
  bx.innerHTML='<h3 style="margin-top:0">⚠ '+T('Otra persona guardó antes que vos','Un\'altra persona ha salvato prima di te')+'</h3><p>'+T('<b>'+(r.updated_by||'Alguien')+'</b> guardó cambios mientras editabas. Elegí qué hacer:','<b>'+(r.updated_by||'Qualcuno')+'</b> ha salvato modifiche mentre stavi modificando. Scegli cosa fare:')+'</p><div class="row2" style="flex-direction:column;align-items:stretch;gap:8px"><button class="a">'+T('Cargar su versión (descarto mis cambios sin guardar)','Carica la sua versione (scarto le mie modifiche non salvate)')+'</button><button class="b">'+T('Guardar la mía igual (reemplaza la suya; queda en el historial)','Salva la mia comunque (sostituisce la sua; resta nello storico)')+'</button><button class="c">'+T('Decidir después','Decidi dopo')+'</button></div>';
  bx.querySelector('.a').onclick=()=>{ov.remove(); applyRemote(r.data,r.version); setStatus('ok')};
  bx.querySelector('.b').onclick=()=>{ov.remove(); rv=r.version; dirty=true; push()};
  bx.querySelector('.c').onclick=()=>ov.remove();
  ov.appendChild(bx); document.body.appendChild(ov);
}
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
setStatus(editor?'ok':'ro');
if(CX.offline) setStatus('off');
})();
