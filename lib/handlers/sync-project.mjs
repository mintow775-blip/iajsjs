import {db,FieldValue,json,handle,authUser,safeId,HttpError} from '../server.mjs';
// POST {projectId}. Recomputes DERIVED public fields (supported MC versions/platforms, version count, rating) of a published project.
// Safe for any signed-in user: values are computed server-side from stored data, never taken from the request.
export default req=>handle(async()=>{
 if(req.method!=='POST')throw new HttpError(405,'POST only');
 await authUser(req);const b=await req.json().catch(()=>({}));if(!safeId(b.projectId))throw new HttpError(400,'Bad request');
 const pid=b.projectId,pub=db().doc('projectsPublic/'+pid);if(!(await pub.get()).exists)return json({ok:true,published:false});
 const vs=(await db().collection(`projectVersions/${pid}/items`).get()).docs.map(d=>d.data()),mc={},platforms={};let latest=0,count=0;
 for(const v of vs){count++;for(const k of Object.keys(v.mc||{}))mc[k]=true;for(const k of Object.keys(v.platforms||{}))platforms[k]=true;latest=Math.max(latest,Number(v.createdAt)||0)}
 const rv=(await db().collection(`reviews/${pid}/items`).get()).docs.map(d=>d.data()),st=rv.map(r=>Number(r.stars)||0).filter(Boolean);
 const rating=st.length?Math.round(st.reduce((a,c)=>a+c,0)/st.length*10)/10:0;
 const o={mc:Object.keys(mc).length?mc:FieldValue.delete(),platforms:Object.keys(platforms).length?platforms:FieldValue.delete(),versionCount:count,rating,reviewCount:st.length};
 if(latest)o.updatedAt=latest;
 await pub.update(o);return json({ok:true,published:true})});
