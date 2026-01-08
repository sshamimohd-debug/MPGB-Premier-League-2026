const APP=(()=>{const KEY="mpgb_cricket_app_v1",ADMIN_KEY="mpgb_cricket_admin_pin_hash_v1";
const nowISO=()=>new Date().toISOString();
const uid=(p="id")=>`${p}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
function loadState(){try{const raw=localStorage.getItem(KEY);if(!raw)return{createdAt:nowISO(),updatedAt:nowISO(),matches:{},teams:{},players:{},points:{},meta:{}};const s=JSON.parse(raw);s.matches||={};s.teams||={};s.players||={};s.points||={};s.meta||={};return s;}catch(e){return{createdAt:nowISO(),updatedAt:nowISO(),matches:{},teams:{},players:{},points:{},meta:{}}}}
function saveState(s){s.updatedAt=nowISO();localStorage.setItem(KEY,JSON.stringify(s));}
async function loadJSON(path){const r=await fetch(path,{cache:"no-store"});if(!r.ok)throw new Error(`Failed to load ${path}`);return await r.json();}
function textHash(str){const enc=new TextEncoder().encode(str);return crypto.subtle.digest("SHA-256",enc).then(buf=>Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("")); }
async function setAdminPin(pin){const h=await textHash(pin.trim());localStorage.setItem(ADMIN_KEY,h);}
function hasAdminPin(){return !!localStorage.getItem(ADMIN_KEY);}
async function verifyAdminPin(pin){const h=await textHash(pin.trim());const stored=localStorage.getItem(ADMIN_KEY);return stored&&h===stored;}
function fmtOverBalls(b){const o=Math.floor(b/6),bb=b%6;return `${o}.${bb}`;}
function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
return{KEY,loadState,saveState,loadJSON,uid,setAdminPin,verifyAdminPin,hasAdminPin,fmtOverBalls,clamp};})();