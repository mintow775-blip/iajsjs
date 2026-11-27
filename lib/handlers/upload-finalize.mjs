import {randomBytes} from 'node:crypto';
import {db,json,authUser,ownsProject,safeId,safeName,checkFile,sha256,b2Put,b2Get,b2Delete,HttpError,MAX_CHUNKS} from '../server.mjs';
// POST {uploadId,chunks,projectId,versionId,filename}. Assembles the chunks, validates the file, stores it in B2 and records it in Firebase.
// The result is also written to /uploads/{uid}/{uploadId} (the browser polls it).
export default async req=>{
 let u,id,b;try{u=await authUser(req,{dev:true});b=await req.json();id=String(b.uploadId||'')}catch(e){return json({error:e instanceof HttpError?e.message:'Bad request'},e instanceof HttpError?e.status:400)}
 const st=o=>db().doc(`uploads/${u.uid}/items/${id}`).set({...o,at:Date.now()}),n=Number(b.chunks),tmp=i=>`tmp/${u.uid}/${id}/${i}`;
 try{
  if(!/^[a-f0-9-]{16,40}$/.test(id)||!safeId(b.projectId)||!safeId(b.versionId)||!Number.isInteger(n)||n<1||n>MAX_CHUNKS)throw new HttpError(400,'Bad request');
  await st({state:'processing'});
  if(!(await ownsProject(u,b.projectId)))throw new HttpError(403,'Not your project');
  const ver=(await db().doc(`projectVersions/${b.projectId}/items/${b.versionId}`).get()).data();if(!ver)throw new HttpError(404,'Create the version first');
  const parts=[];for(let i=0;i<n;i++){try{parts.push(await b2Get(tmp(i)))}catch(e){throw new HttpError(400,'Missing chunk '+i)}}
  const buf=Buffer.concat(parts),name=safeName(b.filename);checkFile(name,buf);
  const fid=randomBytes(12).toString('hex'),key=`projects/${b.projectId}/${b.versionId}/${fid}/${name}`,fref=db().collection(`projectFiles/${b.projectId}/versions/${b.versionId}/files`);
  const olds=await fref.get();for(const d of olds.docs){const m=d.data();if(m&&m.name===name){if(m.key)await b2Delete(m.key).catch(()=>{});await d.ref.delete()}}
  await b2Put(key,buf);
  await fref.doc(fid).set({key,name,size:buf.length,sha256:sha256(buf),uploadedBy:u.uid,uploadedAt:Date.now()});
  await st({state:'done',assetKey:fid,name,size:buf.length});
  return json({ok:true,assetKey:fid})
 }catch(e){const msg=e instanceof HttpError?e.message:'Upload failed';await st({state:'error',message:msg}).catch(()=>{});if(!(e instanceof HttpError))console.error(e);return json({error:msg},e instanceof HttpError?e.status:500)}
 finally{for(let i=0;i<MAX_CHUNKS;i++)await b2Delete(tmp(i)).catch(()=>{})}};
