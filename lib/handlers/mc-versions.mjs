import {json,handle,HttpError} from '../server.mjs';
// Java versions from Mojang's official launcher manifest. There is no trusted official Bedrock API: manage those in Admin > Catalog.
export default req=>handle(async()=>{
 const r=await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');if(!r.ok)throw new HttpError(502,'Version source unavailable');
 const m=await r.json(),snap=new URL(req.url).searchParams.get('snapshots')==='1';
 return json({source:'mojang',latest:m.latest,versions:m.versions.filter(v=>v.type==='release'||(snap&&v.type==='snapshot')).map(v=>({id:v.id,type:v.type,releaseTime:v.releaseTime}))},200,{'cache-control':'public, max-age=3600'})});
