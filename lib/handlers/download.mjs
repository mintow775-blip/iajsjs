import {db,FieldValue,json,handle,authUser,safeId,b2Url,HttpError} from '../server.mjs';
// GET /api/download?p=<projectId>&v=<versionId>&a=<fileId>  (Bearer Firebase token) -> {url,name}. The url is a private 5-minute Backblaze link.
export default req=>handle(async()=>{
 const u=await authUser(req),q=new URL(req.url).searchParams,p=q.get('p'),v=q.get('v'),a=q.get('a');
 if(![p,v,a].every(safeId))throw new HttpError(400,'Bad request');
 const meta=(await db().doc(`projectFiles/${p}/versions/${v}/files/${a}`).get()).data();if(!meta||!meta.key)throw new HttpError(404,'File not found');
 const pub=(await db().doc(`projectsPublic/${p}`).get()).exists,owner=(await db().doc(`projects/${p}`).get()).get('ownerUid')===u.uid;
 if(!pub&&!owner&&u.role!=='admin')throw new HttpError(403,'Project is not published');
 const url=await b2Url(meta.key,meta.name);
 if(pub){await Promise.all([db().doc(`projectsPublic/${p}`).update({downloads:FieldValue.increment(1)}).catch(()=>{}),
  db().collection(`users/${u.uid}/downloads`).add({projectId:p,versionId:v,name:meta.name,at:Date.now()}).catch(()=>{})])}
 return json({url,name:meta.name})});
