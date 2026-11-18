import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const publicKey = 'bcd755b5deafa9e8ac274e374645dd69216908626d6058addbdff5e9903eb5f4';
const relays = ['wss://relay.damus.io','wss://relay.primal.net','wss://nos.lol','wss://nostr.mom',
  'wss://relay.nostr.net','wss://nostr.wine','wss://offchain.pub','wss://relay.snort.social'];

export function verifyAnnouncement(event, schnorr, key = publicKey) {
  if (event?.kind !== 0 || event.pubkey !== key || !Array.isArray(event.tags) || event.tags.length ||
      !Number.isSafeInteger(event.created_at) || event.created_at <= 0 || event.created_at > Date.now()/1000+300 ||
      typeof event.content !== 'string' || event.content.length > 16384 || !/^[0-9a-f]{128}$/.test(event.sig || '')) return null;
  const bytes = JSON.stringify([0,key,event.created_at,0,[],event.content]);
  const digest = createHash('sha256').update(bytes).digest();
  if (digest.toString('hex') !== event.id || !schnorr.verify(Buffer.from(event.sig,'hex'),digest,Buffer.from(key,'hex'))) return null;
  const {website} = JSON.parse(event.content);
  if (!/^https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com\/studio\/$/.test(website || '')) return null;
  return {id:event.id, timestamp:event.created_at, origin:new URL(website).origin};
}
function readRelay(address,schnorr) {
  return new Promise(resolve=>{
    const socket = new WebSocket(address);
    let latest = null;
    const finish = () => {clearTimeout(timeout);resolve(latest);try{socket.close();}catch{}};
    const timeout = setTimeout(finish,7000);
    socket.addEventListener('open',()=>socket.send(JSON.stringify(['REQ','checkout',{authors:[publicKey],kinds:[0],limit:1}])));
    socket.addEventListener('message',({data})=>{
      try {
        if(typeof data !== 'string' || data.length>65536) return finish();
        const [type,id,event]=JSON.parse(data);
        if(id!=='checkout')return;
        if(type==='EOSE'||type==='CLOSED')return finish();
        if(type==='EVENT') {
          const valid=verifyAnnouncement(event,schnorr);
          if(valid&&(!latest||valid.timestamp>latest.timestamp))latest=valid;
        }
      }catch{finish();}
    });
    socket.addEventListener('close',finish);socket.addEventListener('error',finish);
  });
}
export function commonAnnouncement(readings) {
  const verified=readings.filter(Boolean).sort((a,b)=>b.timestamp-a.timestamp || a.id.localeCompare(b.id));
  if(!verified.length || verified.filter(v=>v.id===verified[0].id).length<2) throw Error('The current studio address could not be verified on two independent relays.');
  return verified[0];
}
export async function checkoutOrigin() {
  const {schnorr}=await import('@noble/curves/secp256k1.js').catch(()=>{throw Error('Install the verification dependency with npm install --no-save --package-lock=false @noble/curves@2.0.1');});
  const result=commonAnnouncement(await Promise.all(relays.map(address=>readRelay(address,schnorr))));
  const metadata=await fetch(result.origin+'/clips',{redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!metadata.ok||!metadata.headers.get('content-type')?.includes('application/json'))throw Error('Studio checkout is offline.');
  const terms=await metadata.json(), payment=terms.payment;
  if(!terms.product?.startsWith('Three vertical MP4')||terms.price!=='9 USDC'||payment?.network!=='eip155:8453'||
      payment?.amount!=='9000000'||payment?.payTo?.toLowerCase()!=='0xe91cba11475edce32a1e346ab6548556fe624aad'||
      payment?.asset?.toLowerCase()!=='0x833589fcd6edb6e08f4c7c32d4f71b54bda02913')throw Error('The checkout could not be verified.');
  return new URL(result.origin);
}
async function main() {
const { positionals, values } = parseArgs({allowPositionals:true,options:{'check-directory':{type:'boolean',default:false}}});
if(values['check-directory']) {
  if(positionals.length)throw Error('Use --check-directory on its own.');
  console.log(new URL('/studio/',await checkoutOrigin()).href);return;
}
if (positionals.length !== 1 || process.stdin.isTTY) throw Error('Pass an output directory and provide the private token through standard input.');
const chunks = [];let inputBytes=0;
for await (const chunk of process.stdin) {
  inputBytes+=chunk.length;if(inputBytes>4096)throw Error('Expected one short recovery token.');
  chunks.push(chunk);
}
const secret = Buffer.concat(chunks).toString('utf8').trim();
const token = secret.match(/\bc1\.\d{13}\.[\w-]{43}\.[\w-]{43}(?![\w-])/)?.[0];
if (!token) throw Error('Recovery token missing.');
const origin=await checkoutOrigin();
function call(route, method='GET') {
  if (!/^\/clips\/orders(?:\/[a-zA-Z0-9./-]+)?$/.test(route) || route.includes('..')) throw Error('Unexpected order path.');
  return fetch(new URL(route, origin), {method, redirect:'error', signal:AbortSignal.timeout(60000), headers:{authorization:'Bearer '+token}});
}
const r = await call('/clips/orders','POST');
if (r.status===402) throw Error('This order has no confirmed payment.');
if (!r.ok) throw Error('Checkout status '+r.status);
const order = await r.json();
if (order.state !== 'ready') {
  console.log('Order state:',order.state);
  return;
}
const dir = path.resolve(positionals[0]);
await fs.mkdir(dir,{recursive:true,mode:0o700});
if ((await fs.readdir(dir)).length) throw Error('Choose an empty output directory.');
if (!Array.isArray(order.files) || order.files.length!==6) throw Error('Incomplete delivery.');
for(const f of order.files) {
  if (!/^clip-0[1-3](?:-vertical\.mp4|\.srt)$/.test(f.name) || f.url!=='/clips/orders/'+order.id+'/files/'+f.name) throw Error('Unexpected filename.');
  const result=await call(f.url);
  if (!result.ok) throw Error('File download failed. Status '+result.status);
  const content=Buffer.from(await result.arrayBuffer());
  if (content.length!==f.bytes) throw Error('Incomplete download.');
  await fs.writeFile(path.join(dir,f.name),content,{flag:'wx',mode:0o600});
  console.log(f.name,f.bytes+' bytes');
}
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url) {
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
