
export function uid(prefix="id"){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}
export function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
export function ballsToOvers(balls){
  const o = Math.floor(balls/6);
  const b = balls%6;
  return `${o}.${b}`;
}
export function oversToBalls(oversStr){
  const s = (oversStr??"0").toString().trim();
  if(!s) return 0;
  const [o,b] = s.split(".").map(x=>parseInt(x||"0",10));
  return (o||0)*6 + (b||0);
}
export function fmtDateInput(d=new Date()){
  const pad=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
export async function sha256Hex(text){
  const enc = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
export function downloadText(filename, text){
  const blob = new Blob([text], {type:"application/json;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
export function readFileAsText(file){
  return new Promise((resolve, reject)=>{
    const fr = new FileReader();
    fr.onload = ()=>resolve(String(fr.result||""));
    fr.onerror = ()=>reject(fr.error);
    fr.readAsText(file);
  });
}
export function el(tag, attrs={}, children=[]){
  const e = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs||{})){
    if(k==="class") e.className = v;
    else if(k==="html") e.innerHTML = v;
    else if(k.startsWith("on") && typeof v==="function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for(const c of (children||[])){
    if(c==null) continue;
    if(typeof c==="string") e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  }
  return e;
}
export function byId(id){ return document.getElementById(id); }
export function q(sel, root=document){ return root.querySelector(sel); }
export function qa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
