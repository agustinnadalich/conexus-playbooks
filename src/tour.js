/* ===== Tutorial interactivo (recorre las pantallas reales con una jugada de práctica) ===== */
(()=>{
const T=(es,it)=>CX.lang==='it'?it:es, editor=CX.role==='editor';
const prac=()=>steps.filter(s=>s.practice);
const pById=k=>steps.find(s=>s.practice&&s.tkey===k)||null;
function mv(s,id,dx,dy){const q=s.players[id]; if(q) s.players[id]=[Math.max(0,Math.min(70,r1(q[0]+dx))),Math.max(29,Math.min(62,r1(q[1]+dy)))]}
function makePractice(){
  if(prac().length) return;
  const L=startLayout('lineout'), rid=newId();
  const root={id:rid,title:T('Inicio · Práctica','Inizio · Pratica'),text:'',players:L.players,ball:L.ball,highlight:[],marks:L.marks,options:[],paths:{},next:null,practice:true,tkey:'root'};
  steps.push(root); data.starts.push({id:'st'+Date.now(),kind:'lineout',name:T('🎓 Práctica','🎓 Pratica'),root:rid,practice:true});
  const D=blankFrom(root,T('Decisión: ¿qué hago?','Decisione: cosa faccio?')); D.type='decision'; delete D.draft; delete D.auto; D.practice=true; D.tkey='dec';
  D.text=T('Escena de decisión de práctica. Tiene dos opciones; cada una lleva a una animación.','Scena di decisione di pratica. Ha due opzioni; ognuna porta a un\'animazione.');
  steps.push(D); root.next=D.id;
  const A=blankFrom(D,T('Abrir al 10','Aprire al 10')); A.type='anim'; delete A.draft; delete A.auto; A.practice=true; A.tkey='A'; A.duration=3;
  mv(A,'10',6,-6); mv(A,'12',10,-9); mv(A,'13',12,-8); mv(A,'9',-2,-3); A.ball={holder:'10',x:0,y:0};
  A.tracks={'12':[[1.5,(A.players['12'][0]+D.players['12'][0])/2+2,(A.players['12'][1]+D.players['12'][1])/2+4]]};
  A.text=T('Animación de práctica: el 9 pasa al 10 y el 12 corre en curva (fotograma ◆ a 1,5 s).','Animazione di pratica: il 9 passa al 10 e il 12 corre in curva (fotogramma ◆ a 1,5 s).');
  steps.push(A);
  const B=blankFrom(D,'Pick & go'); B.type='anim'; delete B.draft; delete B.auto; B.practice=true; B.tkey='B'; B.duration=3;
  mv(B,'9',2,-9); mv(B,'8',3,-7); B.ball={holder:'9',x:0,y:0};
  B.text=T('Animación de práctica: el 9 sale por el costado cerrado.','Animazione di pratica: il 9 parte sul lato chiuso.');
  steps.push(B);
  D.options=[mkOpt(T('Abrir al 10','Aprire al 10'),A.id,0),mkOpt('Pick & go',B.id,1)]; D.options[0].receivers=['10']; D.options[1].receivers=['9']; delete D.next;
  save(); sideCur=-1; renderStarts&&renderStarts();
}
function removePractice(){
  const ids=new Set(prac().map(s=>s.id)); if(!ids.size) return;
  removeIds(ids); data.starts=data.starts.filter(st=>!ids.has(st.root)); if(!data.starts.length) return;
  save(); sideCur=-1; goDirect(Math.max(0,idxOf(data.starts[0].root))); setView('map'); renderStarts&&renderStarts();
}
const go=(k)=>{const s=pById(k); if(s){history=[]; goDirect(idxOf(s.id))}};
const board=(k)=>{go(k); setView('board')};
const ST=editor?[
 {t:T('Bienvenido/a: vamos a practicar','Benvenuto/a: facciamo pratica'),d:T('En unos minutos recorrés <b>cada pantalla real</b> con una jugada de práctica. No toca tu plan: queda en un inicio llamado <b>🎓 Práctica</b>, que podés borrar al final.<br><br>Apretá el botón para crearla y seguí con <b>Siguiente</b>.','In pochi minuti percorri <b>ogni schermata reale</b> con uno schema di pratica. Non tocca il tuo piano: resta in un inizio chiamato <b>🎓 Pratica</b>, che puoi eliminare alla fine.<br><br>Premi il pulsante per crearlo e continua con <b>Avanti</b>.'),
  act:()=>[[prac().length?T('✔ Ya está creada','✔ Già creata'):T('Crear jugada de práctica','Crea schema di pratica'),()=>{makePractice(); setView('map'); ensureVisible(); render()},!prac().length]]},
 {t:T('1 · El mapa','1 · La mappa'),view:'map',pre:()=>{makePractice(); setView('map'); fitMap()},target:()=>$('#mapVp'),d:T('Acá ves <b>todo el plan</b>. Cada carril es un inicio (lineout, scrum…); cada caja, una escena; cada línea de color, una opción.<br><b>Probá:</b> arrastrá el fondo para moverte y la rueda para el zoom.','Qui vedi <b>tutto il piano</b>. Ogni corsia è un inizio (touche, mischia…); ogni casella una scena; ogni linea colorata un\'opzione.<br><b>Prova:</b> trascina lo sfondo per spostarti e la rotella per lo zoom.')},
 {t:T('2 · Ordenar las cajas','2 · Ordinare le caselle'),view:'map',target:()=>$('.maptools'),d:T('<b>Probá:</b> arrastrá cualquier caja de la práctica y soltala donde quieras (con <b>Shift</b> arrastra también lo que cuelga). <b>↺ Orden automático</b> descarta tus posiciones y vuelve al acomodo original. También: zoom, ajustar y buscar.','<b>Prova:</b> trascina una qualsiasi casella della pratica e rilasciala dove vuoi (con <b>Shift</b> trascini anche ciò che ne dipende). <b>↺ Ordine automatico</b> scarta le tue posizioni e torna alla disposizione originale. Inoltre: zoom, adatta e cerca.')},
 {t:T('3 · Escenas en el mapa','3 · Scene nella mappa'),view:'map',pre:()=>{setView('map'); go('dec'); ensureVisible()},target:()=>{const s=pById('dec'); return s&&nodeEls.get(s.id)},d:T('Esta caja es una <b>escena de decisión</b> (con 2 opciones). Un clic la selecciona; <b>doble clic</b> la abre en el tablero. El <b>＋</b> al costado agrega opciones o pasos. Las líneas de colores llevan a las animaciones.','Questa casella è una <b>scena di decisione</b> (con 2 opzioni). Un clic la seleziona; <b>doppio clic</b> la apre nella lavagna. Il <b>＋</b> accanto aggiunge opzioni o passi. Le linee colorate portano alle animazioni.')},
 {t:T('4 · Panel de la escena','4 · Pannello della scena'),view:'map',target:()=>$('#side .v-mapboard'),d:T('Con una escena seleccionada, acá editás <b>título</b>, <b>explicación</b>, <b>estado</b> y <b>tipo</b>. Más abajo están las opciones.','Con una scena selezionata, qui modifichi <b>titolo</b>, <b>spiegazione</b>, <b>stato</b> e <b>tipo</b>. Più in basso ci sono le opzioni.')},
 {t:T('5 · Tablero: escena de decisión','5 · Lavagna: scena di decisione'),pre:()=>board('dec'),target:()=>$('#field'),d:T('Esta es la <b>cancha</b> de la escena de decisión. <b>Probá:</b> arrastrá un jugador; dibujá un rectángulo (o Shift + clic) para mover varios. Acá no hay animación: solo acomodás la formación.','Questo è il <b>campo</b> della scena di decisione. <b>Prova:</b> trascina un giocatore; disegna un rettangolo (o Shift + clic) per spostarne vari. Qui non c\'è animazione: sistemi solo la formazione.')},
 {t:T('6 · Tipo de escena','6 · Tipo di scena'),pre:()=>board('dec'),target:()=>$('#fTypeWrap'),d:T('<b>Decisión</b> = foto con opciones. <b>Animación</b> = película con línea de tiempo. <b>Mixta</b> = ambas. El patrón recomendado: decisión → animación → decisión.','<b>Decisione</b> = foto con opzioni. <b>Animazione</b> = filmato con timeline. <b>Mista</b> = entrambe. Lo schema consigliato: decisione → animazione → decisione.')},
 {t:T('7 · Opciones y receptores','7 · Opzioni e ricevitori'),pre:()=>board('dec'),target:()=>$('#optsEd'),d:T('Cada opción tiene <b>texto</b>, <b>color</b> y <b>destino</b> (la animación que la ejecuta; hay buscador y botones para crearla). <b>Probá:</b> cambiá el texto de la primera opción.','Ogni opzione ha <b>testo</b>, <b>colore</b> e <b>destinazione</b> (l\'animazione che la esegue; c\'è un cercatore e dei pulsanti per crearla). <b>Prova:</b> cambia il testo della prima opzione.')},
 {t:T('8 · Receptores','8 · Ricevitori'),pre:()=>board('dec'),target:()=>$('#optsEd .optcard'),d:T('Los <b>receptores</b> son los jugadores a los que puede ir la pelota en esa opción: se marcan con aros del color de la opción en la cancha. <b>Probá:</b> agregá o quitá un receptor en la lista de la opción.','I <b>ricevitori</b> sono i giocatori a cui può andare il pallone con quell\'opzione: sul campo sono segnati con anelli del colore dell\'opzione. <b>Prova:</b> aggiungi o togli un ricevitore nell\'elenco dell\'opzione.')},
 {t:T('9 · Animación y línea de tiempo','9 · Animazione e timeline'),pre:()=>board('A'),target:()=>$('#tline'),d:T('Esta es una <b>animación</b>. La barra es el tiempo: en <b>0</b> está el inicio, al final la posición final. <b>Probá:</b> mové la barra a 1,5 s y arrastrá al 12: se crea un <b>◆ fotograma</b>. Después ▶ Reproducir.','Questa è un\'<b>animazione</b>. La barra è il tempo: a <b>0</b> c\'è l\'inizio, alla fine la posizione finale. <b>Prova:</b> porta la barra a 1,5 s e trascina il 12: si crea un <b>◆ fotogramma</b>. Poi ▶ Riproduci.')},
 {t:T('10 · Fotogramas y velocidad','10 · Fotogrammi e velocità'),pre:()=>board('A'),target:()=>$('.tl-tools'),d:T('<b>◆ Fijar</b> congela posiciones en ese instante, <b>✕ Quitar</b> las borra, y se pueden copiar/pegar fotogramas. Para pausas, fijá el mismo punto en dos instantes.','<b>◆ Fissa</b> congela le posizioni in quell\'istante, <b>✕ Rimuovi</b> le cancella, e si possono copiare/incollare i fotogrammi. Per le pause, fissa lo stesso punto in due istanti.')},
 {t:T('11 · ⏸ Mantener hasta el final','11 · ⏸ Mantieni fino alla fine'),pre:()=>board('A'),target:()=>$('#kHold'),d:T('Para que <b>nadie se mueva solo</b>: con la barra en 0 apretá este botón y todos quedan quietos. Luego activá <i>«mantener tras el último fotograma»</i> y movés solo a quien querés.','Perché <b>nessuno si muova da solo</b>: con la barra a 0 premi questo pulsante e restano tutti fermi. Poi attiva <i>«mantieni dopo l\'ultimo fotogramma»</i> e sposti solo chi vuoi.')},
 {t:T('12 · Video','12 · Video'),pre:()=>board('A'),target:()=>$('#fVideo'),d:T('Pegá acá un link de <b>YouTube/Vimeo</b>. En la presentación y en el tablero aparece el botón <b>🎬 Video</b>; en el mapa, una insignia.','Incolla qui un link <b>YouTube/Vimeo</b>. Nella presentazione e nella lavagna compare il pulsante <b>🎬 Video</b>; nella mappa, un badge.')},
 {t:T('13 · Presentar','13 · Presentare'),pre:()=>{go('dec'); setView('pres')},target:()=>$('#capOpts'),d:T('Así lo ve el jugador: un botón por opción, con su color. <b>Probá:</b> tocá una opción y mirá la animación; después ◀ Atrás.','Così lo vede il giocatore: un pulsante per opzione, con il suo colore. <b>Prova:</b> tocca un\'opzione e guarda l\'animazione; poi ◀ Indietro.')},
 {t:T('14 · Guardar y compartir','14 · Salvare e condividere'),pre:()=>{setView('map'); const t=$('#jDown'); const dt=t&&t.closest('details'); if(dt) dt.open=true},target:()=>$('#jDown')&&($('#jDown').closest('details')||$('#jDown')),d:T('Todo se guarda solo en este navegador. <b>Descargar</b> baja un archivo .json (tu copia de seguridad); <b>Cargar…</b> lo recupera. ↶ ↷ deshacen y rehacen.','Tutto si salva da solo in questo browser. <b>Scarica</b> scarica un file .json (la tua copia di sicurezza); <b>Carica…</b> lo recupera. ↶ ↷ annullano e ripristinano.')},
 {t:T('¡Listo!','Fatto!'),pre:()=>setView('map'),d:T('Ya conocés todas las pantallas. Podés <b>dejar la práctica</b> para seguir probando o <b>borrarla</b> ahora. Podés repetir este tutorial con <b>🎓 Tutorial</b> y consultar la <b>📖 Guía</b> cuando quieras.','Ora conosci tutte le schermate. Puoi <b>lasciare la pratica</b> per continuare a provare o <b>eliminarla</b> adesso. Puoi ripetere questo tutorial con <b>🎓 Tutorial</b> e consultare la <b>📖 Guida</b> quando vuoi.'),
  act:()=>[[T('🗑 Borrar la práctica','🗑 Elimina la pratica'),()=>{removePractice(); closeTour()},!!prac().length]]}
]:[
 {t:T('¡Bienvenido!','Benvenuto!'),d:T('Este es el plan de juego. Te muestro cómo recorrerlo en 3 pasos.','Questo è il piano di gioco. Ti mostro come percorrerlo in 3 passi.')},
 {t:T('1 · El mapa','1 · La mappa'),pre:()=>{setView('map'); fitMap()},target:()=>$('#mapVp'),d:T('Cada caja es una escena y cada línea de color, una opción. Arrastrá el fondo para moverte, rueda para zoom. <b>Doble clic</b> en una caja la presenta.','Ogni casella è una scena e ogni linea colorata un\'opzione. Trascina lo sfondo per spostarti, rotella per lo zoom. <b>Doppio clic</b> su una casella la presenta.')},
 {t:T('2 · Presentación','2 · Presentazione'),pre:()=>{setView('pres')},target:()=>$('#capOpts')||$('#vPres'),d:T('Elegí una opción tocando su botón de color: la jugada avanza. <b>◀ Atrás</b> vuelve; <b>▶ Repetir paso</b> la vuelve a mostrar; a la derecha está el listado de pasos.','Scegli un\'opzione toccando il suo pulsante colorato: lo schema avanza. <b>◀ Indietro</b> torna; <b>▶ Ripeti passo</b> la rivede; a destra c\'è l\'elenco dei passi.')},
 {t:T('3 · Videos y más','3 · Video e altro'),pre:()=>{},d:T('Si una escena tiene video, aparece <b>🎬 Video</b>. Usá las banderas para cambiar de idioma y <b>📖 Guía</b> si necesitás ayuda.','Se una scena ha un video, compare <b>🎬 Video</b>. Usa le bandiere per cambiare lingua e <b>📖 Guida</b> se ti serve aiuto.')}
];
let ti=-1, spot=null, card=null;
const clamp0=(v,a,b)=>Math.max(a,Math.min(b,v));
function ensureUI(){
  if(spot) return;
  spot=document.createElement('div'); spot.id='tourSpot'; document.body.appendChild(spot);
  card=document.createElement('div'); card.id='tourCard'; document.body.appendChild(card);
}
function render(){
  if(ti<0) return; ensureUI(); const s=ST[ti];
  const acts=s.act?s.act():[];
  card.innerHTML='<div class="tt"></div><div class="tb"></div><div class="ta"></div><div class="tf"><button class="tx" title="Esc">✕</button><span class="tn"></span><span class="sp"></span><button class="tp">◀</button><button class="tg primary"></button></div>';
  card.querySelector('.tt').textContent=s.t; card.querySelector('.tb').innerHTML=s.d;
  const ta=card.querySelector('.ta'); acts.forEach(a=>{const b=document.createElement('button'); b.className=a[2]?'primary':''; b.textContent=a[0]; b.disabled=a[2]===false; b.onclick=a[1]; ta.appendChild(b)});
  card.querySelector('.tn').textContent=(ti+1)+' / '+ST.length;
  const nx=card.querySelector('.tg'); nx.textContent=ti===ST.length-1?T('Terminar','Fine'):T('Siguiente ▶','Avanti ▶');
  card.querySelector('.tp').textContent=T('◀ Anterior','◀ Indietro'); card.querySelector('.tp').disabled=ti===0;
  card.querySelector('.tp').onclick=()=>step(-1); nx.onclick=()=>step(1); card.querySelector('.tx').onclick=closeTour;
  place();
}
function place(){
  if(ti<0||!card) return; const s=ST[ti]; let el=s.target?s.target():null;
  if(el&&!el.offsetParent&&el.tagName!=='svg'&&!(el.getBoundingClientRect().width)) el=null;
  const vw=innerWidth, vh=innerHeight, cw=Math.min(380,vw-24);
  card.style.width=cw+'px';
  if(!el){spot.style.display='none'; card.style.left=Math.max(12,(vw-cw)/2)+'px'; card.style.top=Math.max(12,vh*.28)+'px'; return}
  el.scrollIntoView({block:'nearest',inline:'nearest'});
  const r=el.getBoundingClientRect(), pad=6;
  spot.style.display='block'; spot.style.left=(r.left-pad)+'px'; spot.style.top=(r.top-pad)+'px'; spot.style.width=(r.width+pad*2)+'px'; spot.style.height=(r.height+pad*2)+'px';
  const ch=card.offsetHeight||220; let x,y;
  if(vh-r.bottom>=ch+16){y=r.bottom+14; x=clamp0(r.left,12,vw-cw-12)}
  else if(r.top>=ch+16){y=r.top-ch-14; x=clamp0(r.left,12,vw-cw-12)}
  else if(vw-r.right>=cw+16){x=r.right+14; y=clamp0(r.top,12,vh-ch-12)}
  else if(r.left>=cw+16){x=r.left-cw-14; y=clamp0(r.top,12,vh-ch-12)}
  else {x=vw-cw-16; y=vh-ch-16}
  card.style.left=x+'px'; card.style.top=y+'px';
}
function step(d){
  const n=ti+d; if(n<0) return; if(n>=ST.length) return closeTour();
  ti=n; const s=ST[ti]; try{ if(s.pre) s.pre() }catch(e){console.warn(e)}
  render(); setTimeout(place,250); setTimeout(place,700);
}
function closeTour(){ti=-1; if(spot) spot.style.display='none'; if(card) card.remove(); card=null; if(spot) spot.remove(); spot=null; try{localStorage.setItem('cx.tour.'+CX.role,'1')}catch(e){}}
function startTour(){ti=-1; closeTour(); ti=0; ensureUI(); const s=ST[0]; render(); setTimeout(place,200)}
window.addEventListener('resize',place); window.addEventListener('keydown',e=>{if(ti>=0&&e.key==='Escape') closeTour()});
const tb=$('#tourBtn'); if(tb) tb.onclick=startTour;
try{ if(!localStorage.getItem('cx.tour.'+CX.role)) setTimeout(startTour,1200) }catch(e){}
})();
