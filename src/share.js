/* ===== Compartir ramas (links de solo lectura) ===== */
(()=>{
const T=(es,it)=>CX.lang==='it'?it:es, C=CX.cfg;
const hdr={apikey:C&&C.key,'Content-Type':'application/json'}; if(C&&C.key&&C.key.indexOf('eyJ')===0) hdr.Authorization='Bearer '+C.key;
const rpc=async(fn,body)=>{const r=await fetch(C.url+'/rest/v1/rpc/'+fn,{method:'POST',headers:hdr,body:JSON.stringify(body)}); if(!r.ok) throw new Error(fn+' '+r.status); return r.json()};
/* --- modo link compartido: abre directo la presentación --- */
if(CX.share){
  if(data.__opts&&data.__opts.hideSteps) document.documentElement.classList.add('cx-nosteps');
  document.querySelectorAll('#logoutBtn,#tourBtn,#guideLink').forEach(e=>e.remove());
  try{ goDirect(Math.max(0,idxOf(data.starts[0].root))); setView('pres') }catch(e){}
  return;
}
if(CX.role!=='editor'||!C||!C.key||!CX.hash) return;
/* --- armar el recorte con las jugadas elegidas --- */
function subsetFor(roots,opts){
  const keep=new Set(); roots.forEach(r=>{const i=idxOf(r); if(i>=0) subtreeIds(i).forEach(id=>keep.add(id))});
  const rootSet=new Set(data.starts.map(s=>s.root));
  const out=steps.filter(s=>keep.has(s.id)).map(s=>JSON.parse(JSON.stringify(s)));
  out.forEach(s=>{
    s.options.forEach(o=>{ if(o.to&&!keep.has(o.to)) o.to='' });
    if(typeof s.next==='string'&&!keep.has(s.next)) s.next=null;
  });
  const starts=data.starts.filter(st=>roots.includes(st.root)).map(st=>JSON.parse(JSON.stringify(st)));
  const lo={}; if(data.layoutOff) Object.keys(data.layoutOff).forEach(d=>{lo[d]={}; Object.keys(data.layoutOff[d]).forEach(k=>{ if(keep.has(k)||starts.some(st=>'start:'+st.id===k)) lo[d][k]=data.layoutOff[d][k] })});
  return {version:3,title:data.title||'',starts,steps:out,mapDir:data.mapDir,layoutOff:lo,__roots:roots,__opts:opts||{}};
}
const getShare=async t=>{try{return await rpc('cx_share_get',{p_token:t,p_log:false})}catch(e){return await rpc('cx_share_get',{p_token:t})}};
const urlFor=t=>location.origin+location.pathname.replace(/index\.html$/,'')+'?s='+t+(CX.lang==='it'?'&lang=it':'');
const who=()=>localStorage.getItem('cx.who')||'editor';
function esc(t){return String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
async function open(){
  document.querySelectorAll('.cxshare').forEach(n=>n.remove());
  const ov=document.createElement('div'); ov.className='modal cxshare'; const bx=document.createElement('div'); bx.className='box wide'; bx.style.cssText='max-width:720px;max-height:88vh;overflow:auto';
  const counts=data.starts.map(st=>{const i=idxOf(st.root); return i<0?0:subtreeIds(i).size});
  bx.innerHTML='<h3 style="margin-top:0">🔗 '+T('Compartir jugadas','Condividi schemi')+'</h3><p class="hint">'+T('Elegí una o varias jugadas (inicios). Se genera un link de <b>solo lectura</b> que muestra únicamente esas ramas, sin pedir clave. El link tiene una copia: si después cambiás algo, tocá <b>Actualizar</b>.','Scegli uno o più schemi (inizi). Viene generato un link di <b>sola lettura</b> che mostra solo quei rami, senza password. Il link contiene una copia: se poi modifichi qualcosa, premi <b>Aggiorna</b>.')+'</p><div id="shPick"></div><label class="field" style="margin-top:8px">'+T('Nombre del link','Nome del link')+'<input id="shName" placeholder="'+T('Ej.: Touche a 4 y a 5','Es.: Touche a 4 e a 5')+'"></label><label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" id="shHide"> <span>'+T('Ocultar la lista «Pasos de la jugada» (para jugadas que no son una progresión)','Nascondi l\'elenco «Passi dello schema» (per schemi che non sono una progressione)')+'</span></label><div class="row2"><button id="shMake" class="primary">'+T('Crear link','Crea link')+'</button></div><h4 style="margin:16px 0 6px">'+T('Links creados','Link creati')+'</h4><div id="shList" class="hint">…</div><div class="row2"><button class="cl">'+T('Cerrar','Chiudi')+'</button></div>';
  const pick=bx.querySelector('#shPick');
  data.starts.forEach((st,k)=>{const l=document.createElement('label'); l.style.cssText='display:flex;gap:8px;align-items:center;padding:3px 0'; l.innerHTML='<input type="checkbox" value="'+esc(st.root)+'"> <span>'+esc(st.name)+' <span class="hint">· '+counts[k]+' '+T('escenas','scene')+'</span></span>'; pick.appendChild(l)});
  async function refresh(){
    const box=bx.querySelector('#shList'); let list=[]; try{list=await rpc('cx_share_list',{p_hash:CX.hash})}catch(e){box.textContent=T('Sin conexión.','Offline.'); return}
    if(!list.length){box.textContent=T('Todavía no creaste links.','Non hai ancora creato link.'); return}
    box.innerHTML=''; list.forEach(it=>{
      const row=document.createElement('div'); row.style.cssText='border:1px solid #323c52;border-radius:10px;padding:8px 10px;margin:6px 0';
      row.innerHTML='<div><b>'+esc(it.name)+'</b> <span class="hint">· '+T('actualizado','aggiornato')+' '+new Date(it.updated_at).toLocaleString(CX.lang==='it'?'it-IT':'es-AR')+'</span></div><div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><input readonly value="'+urlFor(it.token)+'" style="flex:1;min-width:220px"><button class="cp">'+T('Copiar','Copia')+'</button><button class="up">'+T('Actualizar','Aggiorna')+'</button><button class="op">'+T('Abrir','Apri')+'</button><button class="dl">'+T('Eliminar','Elimina')+'</button></div><label class="hint" style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" class="hs"> '+T('Ocultar la lista «Pasos de la jugada»','Nascondi l\'elenco «Passi dello schema»')+'</label>';
      getShare(it.token).then(g=>{ if(g.ok) row.querySelector('.hs').checked=!!(g.data.__opts&&g.data.__opts.hideSteps) }).catch(()=>{});
      row.querySelector('.hs').onchange=async e=>{ const g=await getShare(it.token); if(!g.ok) return; g.data.__opts=Object.assign({},g.data.__opts,{hideSteps:e.target.checked}); const r=await rpc('cx_share_update',{p_hash:CX.hash,p_token:it.token,p_data:g.data}); toast(r.ok?T('Listo: el link ya refleja el cambio.','Fatto: il link riflette già la modifica.'):'Error') };
      const inp=row.querySelector('input'); inp.onclick=()=>inp.select();
      row.querySelector('.cp').onclick=async()=>{try{await navigator.clipboard.writeText(inp.value); toast(T('Link copiado.','Link copiato.'))}catch(e){inp.select(); document.execCommand('copy'); toast(T('Link copiado.','Link copiato.'))}};
      row.querySelector('.op').onclick=()=>window.open(inp.value,'_blank','noopener');
      row.querySelector('.up').onclick=async()=>{
        const roots=(it.roots||[]).filter(r=>idxOf(r)>=0); if(!roots.length) return toast(T('Las jugadas de este link ya no existen.','Gli schemi di questo link non esistono più.'));
        const cur=await getShare(it.token); const r=await rpc('cx_share_update',{p_hash:CX.hash,p_token:it.token,p_data:subsetFor(roots,(cur.data&&cur.data.__opts)||{})}); toast(r.ok?T('Link actualizado con los cambios actuales.','Link aggiornato con le modifiche attuali.'):'Error'); refresh()};
      row.querySelector('.dl').onclick=async()=>{ if(!confirm(T('¿Eliminar este link? Quien lo tenga ya no podrá abrirlo.','Eliminare questo link? Chi lo ha non potrà più aprirlo.'))) return; await rpc('cx_share_delete',{p_hash:CX.hash,p_token:it.token}); refresh()};
      box.appendChild(row)});
  }
  bx.querySelector('#shMake').onclick=async()=>{
    const roots=[...pick.querySelectorAll('input:checked')].map(i=>i.value); if(!roots.length) return toast(T('Elegí al menos una jugada.','Scegli almeno uno schema.'));
    const name=bx.querySelector('#shName').value.trim()||roots.map(r=>(data.starts.find(s=>s.root===r)||{}).name).join(' + ');
    const r=await rpc('cx_share_create',{p_hash:CX.hash,p_who:who(),p_name:name,p_data:subsetFor(roots,{hideSteps:bx.querySelector('#shHide').checked})});
    if(!r.ok) return toast(T('No se pudo crear (¿corriste shares.sql en Supabase?).','Impossibile creare (hai eseguito shares.sql in Supabase?).'));
    const u=urlFor(r.token); try{await navigator.clipboard.writeText(u); toast(T('Link creado y copiado.','Link creato e copiato.'))}catch(e){toast(u)}
    bx.querySelector('#shName').value=''; pick.querySelectorAll('input').forEach(i=>i.checked=false); refresh();
  };
  bx.querySelector('.cl').onclick=()=>ov.remove(); ov.onclick=e=>{if(e.target===ov) ov.remove()};
  ov.appendChild(bx); document.body.appendChild(ov); refresh();
}
const tb=document.getElementById('tourBtn'), b=document.createElement('button'); b.id='shareBtn'; b.textContent='🔗 '+T('Compartir','Condividi'); b.title=T('Crear un link de solo lectura con una o más jugadas','Crea un link di sola lettura con uno o più schemi');
if(tb) tb.parentNode.insertBefore(b,tb); b.onclick=open;
})();
