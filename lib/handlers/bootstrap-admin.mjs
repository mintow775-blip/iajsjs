import {db,auth,json,handle,authUser,HttpError} from '../server.mjs';
// POST (Bearer token). If the caller's VERIFIED email is in ADMIN_EMAILS (default: atarafatyt1@gmail.com), persist role=admin in the database and as a custom claim. Idempotent.
export default req=>handle(async()=>{
 if(req.method!=='POST')throw new HttpError(405,'POST only');
 const u=await authUser(req);
 if(u.role!=='admin')return json({admin:false});
 const ref=db().doc('users/'+u.uid);
 if((await ref.get()).get('role')!=='admin'){await ref.set({role:'admin'},{merge:true});await auth().setCustomUserClaims(u.uid,{role:'admin'})}
 return json({admin:true})});
