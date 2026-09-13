const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../service-worker.js'),'utf8');
function fixture(){
 const listeners={},stores=new Map(),deleted=[];
 const caches={keys:async()=>[...stores.keys()],delete:async k=>{deleted.push(k);return stores.delete(k)},open:async key=>{if(!stores.has(key))stores.set(key,new Map());const m=stores.get(key);return {addAll:async paths=>paths.forEach(p=>m.set(p,new Response(p))),put:async(k,v)=>m.set(typeof k==='string'?k:k.url,v),match:async k=>m.get(typeof k==='string'?k:k.url)}}};
 const self={registration:{scope:'https://example.test/caja/'},addEventListener:(k,f)=>listeners[k]=f,skipWaiting:async()=>{},clients:{claim:async()=>{}}};
 const context={self,caches,URL,Response,fetch:async request=>new Response(request.url||request)};vm.createContext(context);vm.runInContext(source,context);
 async function event(type,request){let response;const waits=[];listeners[type]({request,waitUntil:p=>waits.push(p),respondWith:p=>{response=p}});if(response)response=await response;await Promise.all(waits);return response;}
 return {stores,deleted,context,event};
}
test('activation only removes old Caja Clara caches',async()=>{const f=fixture();f.stores.set('caja-clara-v2',new Map());f.stores.set('another-app-cache',new Map());await f.event('install');await f.event('activate');assert.deepEqual(f.deleted,['caja-clara-v2']);assert.ok(f.stores.has('another-app-cache'));});
test('app shell caches all versioned JS including core',async()=>{const f=fixture();await f.event('install');assert.ok(f.stores.get('caja-clara-v3').has('core.js?v=3'));assert.ok(f.stores.get('caja-clara-v3').has('app.js?v=3'));});
test('offline navigation serves shell; missing scripts never serve HTML',async()=>{const f=fixture();await f.event('install');f.context.fetch=async()=>{throw new Error('offline')};const response=await f.event('fetch',{url:'https://example.test/caja/',method:'GET',mode:'navigate'});assert.equal(await response.text(),'index.html');await assert.rejects(f.event('fetch',{url:'https://example.test/caja/missing.js',method:'GET',mode:'cors'}),/offline/);});
test('requests outside app scope and writes are left alone',async()=>{const f=fixture();assert.equal(await f.event('fetch',{url:'https://example.test/frigo/',method:'GET',mode:'navigate'}),undefined);assert.equal(await f.event('fetch',{url:'https://example.test/caja/',method:'POST',mode:'cors'}),undefined);});
