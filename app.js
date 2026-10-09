const $ = id => document.getElementById(id);
const STATUS = {pending:{label:"Pendente",color:"#ef4b58"},doing:{label:"Em andamento",color:"#f5b928"},done:{label:"Concluída",color:"#18a66a"}};
const STORAGE_KEY = "controleCoberturaItabata_v1";
let data = loadData(), selectedId = null, map, markers = {}, chosenLatLng = null, installPrompt = null;

function loadData(){try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY));if(x&&Array.isArray(x.territories)&&Array.isArray(x.blocks))return x}catch(e){}return {territories:[{id:"t1",name:"Território 1",color:"#2878e8"}],blocks:[]};}
function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}
function safe(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function territoryName(id){return data.territories.find(t=>t.id===id)?.name||"Sem território";}
function statusText(s){return STATUS[s]?.label||"Pendente";}
function filteredBlocks(){const t=$("territorySelect").value;return data.blocks.filter(b=>t==="all"||b.territoryId===t);}
function render(){
  const tsel=$("territorySelect"), old=tsel.value;
  tsel.innerHTML='<option value="all">Todos os territórios</option>'+data.territories.map(t=>`<option value="${safe(t.id)}">${safe(t.name)}</option>`).join("");
  if([...tsel.options].some(o=>o.value===old))tsel.value=old;
  const blocks=filteredBlocks(), total=data.blocks.length, done=data.blocks.filter(b=>b.status==="done").length, doing=data.blocks.filter(b=>b.status==="doing").length, pending=total-done-doing;
  const pct=total?Math.round(data.blocks.reduce((sum,b)=>sum+(b.status==="done"?100:(b.status==="doing"?Number(b.percent||0):0)),0)/total):0;
  $("overallPct").textContent=pct+"%";$("overallBar").style.width=pct+"%";$("blockCount").textContent=total+" quadras";$("doneCount").textContent=done;$("doingCount").textContent=doing;$("pendingCount").textContent=pending;
  $("blockList").innerHTML=blocks.map(b=>`<div class="block-item" data-id="${safe(b.id)}"><span class="dot ${b.status==="done"?"green":b.status==="doing"?"yellow":"red"}"></span><div class="block-info"><b>${safe(b.name)}</b><small>${safe(territoryName(b.territoryId))} · ${b.status==="done"?100:Number(b.percent||0)}% de cobertura</small></div><span class="status-label ${safe(b.status)}">${safe(statusText(b.status))}</span></div>`).join("");
  $("emptyState").style.display=blocks.length?"none":"block";
  document.querySelectorAll(".block-item").forEach(el=>el.addEventListener("click",()=>openEditor(el.dataset.id)));
  renderMarkers();
}
function initMap(){
  if(!window.L){$("map").innerHTML='<p style="padding:16px">Não foi possível carregar o mapa. Verifique a conexão com a internet.</p>';return;}
  map=L.map("map").setView([-18.08,-39.88],14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  map.on("click",e=>{chosenLatLng={lat:e.latlng.lat,lng:e.latlng.lng};const name=$("newBlockName").value.trim();if(!name){$("newBlockName").focus();alert("Digite o nome/número da quadra e toque no mapa novamente.");return;}addBlock(name,chosenLatLng);$("newBlockName").value="";});
  setTimeout(()=>map.invalidateSize(),250);
}
function renderMarkers(){
  if(!map)return;
  Object.values(markers).forEach(m=>map.removeLayer(m));markers={};
  data.blocks.forEach(b=>{if(!Number.isFinite(b.lat)||!Number.isFinite(b.lng))return;const c=STATUS[b.status]?.color||STATUS.pending.color;
    const marker=L.circleMarker([b.lat,b.lng],{radius:10,color:"#fff",weight:2,fillColor:c,fillOpacity:.95}).addTo(map);
    marker.bindTooltip(safe(b.name)+" · "+safe(territoryName(b.territoryId)));
    marker.on("click",()=>openEditor(b.id));markers[b.id]=marker;
  });
}
function addBlock(name,loc){
  const tid=$("territorySelect").value==="all"?(data.territories[0]?.id):$("territorySelect").value;
  if(!tid){alert("Crie um território primeiro.");return;}
  const b={id:"b"+Date.now()+Math.random().toString(16).slice(2,6),name,territoryId:tid,status:"pending",percent:0,notes:"",...(loc||{})};
  data.blocks.push(b);persist();render();openEditor(b.id);
}
function openEditor(id){
  const b=data.blocks.find(x=>x.id===id);if(!b)return;selectedId=id;
  $("editor").classList.add("open");$("editorTitle").textContent=b.name+" · "+territoryName(b.territoryId);$("blockStatus").value=b.status;$("blockPct").value=b.status==="done"?100:Number(b.percent||0);$("pctLabel").textContent=$("blockPct").value+"%";$("blockNotes").value=b.notes||"";
  $("editor").scrollIntoView({behavior:"smooth",block:"nearest"});
}
function saveEditor(){
  const b=data.blocks.find(x=>x.id===selectedId);if(!b)return;
  b.status=$("blockStatus").value;b.percent=b.status==="done"?100:Number($("blockPct").value);b.notes=$("blockNotes").value.trim();
  persist();render();openEditor(b.id);
}
$("addTerritoryBtn").addEventListener("click",()=>{const name=prompt("Nome do novo território (ex.: Território 2):");if(!name||!name.trim())return;const n=data.territories.length+1;const colors=["#2878e8","#18a66a","#f28c28","#9254de","#e0b000","#13a8a8","#ef4b58","#64748b"];data.territories.push({id:"t"+Date.now(),name:name.trim(),color:colors[(n-1)%colors.length]});persist();render();$("territorySelect").value=data.territories[data.territories.length-1].id;render();});
$("addBlockBtn").addEventListener("click",()=>{const name=$("newBlockName").value.trim();if(!name){alert("Digite um nome/número para a quadra.");return;}addBlock(name,chosenLatLng);$("newBlockName").value="";});
$("territorySelect").addEventListener("change",render);
$("blockPct").addEventListener("input",()=>{$("pctLabel").textContent=$("blockPct").value+"%";if($("blockPct").value==="100")$("blockStatus").value="done";else if($("blockPct").value!=="0"&&$("blockStatus").value==="pending")$("blockStatus").value="doing";});
$("blockStatus").addEventListener("change",()=>{if($("blockStatus").value==="done"){$("blockPct").value=100;$("pctLabel").textContent="100%";}else if($("blockStatus").value==="pending"){$("blockPct").value=0;$("pctLabel").textContent="0%";}});
$("saveBlockBtn").addEventListener("click",saveEditor);
$("closeEditorBtn").addEventListener("click",()=>$("editor").classList.remove("open"));
$("deleteBlockBtn").addEventListener("click",()=>{const b=data.blocks.find(x=>x.id===selectedId);if(!b)return;if(confirm("Excluir "+b.name+"? Essa ação não pode ser desfeita.")){data.blocks=data.blocks.filter(x=>x.id!==selectedId);selectedId=null;persist();render();$("editor").classList.remove("open");}});
$("exportBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="backup-controle-cobertura.json";a.click();URL.revokeObjectURL(a.href);});
$("locateBtn").addEventListener("click",()=>{if(!navigator.geolocation){alert("Este navegador não oferece GPS.");return;}navigator.geolocation.getCurrentPosition(pos=>{const ll=[pos.coords.latitude,pos.coords.longitude];map.setView(ll,17);L.circleMarker(ll,{radius:8,color:"#fff",weight:2,fillColor:"#1769d2",fillOpacity:1}).addTo(map).bindPopup("Você está aqui").openPopup();},()=>alert("Não foi possível obter a localização. Confira a permissão de localização do navegador."),{enableHighAccuracy:true,timeout:10000});});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("installBtn").classList.remove("hidden");});
$("installBtn").addEventListener("click",async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("installBtn").classList.add("hidden");});
if("serviceWorker" in navigator && location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}
initMap();render();
