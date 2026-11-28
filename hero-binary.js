/* HBN1 asset loader. Explicit async integration required. */
window.HeroBinary = (() => {
 const packs = new Map(), urls = new Map();
 const base = 'heros/';
 const path = (slug,name) => base + encodeURIComponent(slug) + '/' + name.split('/').map(encodeURIComponent).join('/');
 function load(slug) {
   if (!packs.has(slug)) packs.set(slug, (async () => {
     const r = await fetch(path(slug,slug+'.bin')); if (!r.ok) throw Error('HTTP '+r.status);
     const b = await r.arrayBuffer(); if(b.byteLength<8 || new TextDecoder().decode(b.slice(0,4))!=='HBN1') throw Error('Bad magic');
     const n = new DataView(b).getUint32(4,true); if(n>b.byteLength-8) throw Error('Bad header');
     const h = JSON.parse(new TextDecoder().decode(b.slice(8,8+n))); if(h.version!==1 || h.hero!==slug) throw Error('Bad pack');
     return {b,h,start:8+n};
   })().catch(e=>{packs.delete(slug); throw e;}));
   return packs.get(slug);
 }
 async function url(slug,name) {
   const key=slug+'/'+name;
   try { const p=await load(slug); if(urls.has(key)) return urls.get(key); const e=p.h.files[name];
     if(!Object.prototype.hasOwnProperty.call(p.h.files,name)||!Number.isSafeInteger(e.offset)||!Number.isSafeInteger(e.size)||e.offset<0||e.size<0||e.offset+e.size>p.b.byteLength-p.start) throw Error('Missing or invalid asset');
     const u=URL.createObjectURL(new Blob([p.b.slice(p.start+e.offset,p.start+e.offset+e.size)],{type:e.mime})); urls.set(key,u); return u;
   } catch(e) {return path(slug,name);}
 }
 function release(slug){for(const [k,u] of urls) if(k.startsWith(slug+'/')) {URL.revokeObjectURL(u);urls.delete(k);} packs.delete(slug);}
 return {load,url,release};
})();
