import {handle,json,authUser,HttpError,MAX_CHUNK,MAX_CHUNKS,b2Put} from '../server.mjs';
// POST one chunk (<= 4 MB; Vercel's request limit is 4.5 MB). Chunks are parked in the B2 bucket under tmp/ until upload-finalize assembles them.
export default req=>handle(async()=>{
 if(req.method!=='POST')throw new HttpError(405,'POST only');
 const u=await authUser(req,{dev:true});
 const id=req.headers.get('x-upload-id')||'',i=Number(req.headers.get('x-chunk-index'));
 if(!/^[a-f0-9-]{16,40}$/.test(id)||!Number.isInteger(i)||i<0||i>=MAX_CHUNKS)throw new HttpError(400,'Bad upload headers');
 const buf=Buffer.from(await req.arrayBuffer());if(!buf.length||buf.length>MAX_CHUNK)throw new HttpError(413,'Chunk too large');
 await b2Put(`tmp/${u.uid}/${id}/${i}`,buf);return json({ok:true})});
