import {db,auth,json,handle,adminEmails,HttpError} from '../server.mjs';
// POST (no login). Makes sure the owner admin account exists and is admin: email = first ADMIN_EMAILS entry, password = ADMIN_PASSWORD env var.
// The password is never in the website code; callers cannot choose it. Called automatically by the login form when the admin email cannot sign in yet.
export default req=>handle(async()=>{
 if(req.method!=='POST')throw new HttpError(405,'POST only');
 const email=adminEmails()[0],pw=process.env.ADMIN_PASSWORD;
 if(!email||!pw||String(pw).length<6)throw new HttpError(500,'Server is not configured (ADMIN_PASSWORD missing)');
 const A=auth();let u;
 try{u=await A.getUserByEmail(email);await A.updateUser(u.uid,{password:pw,disabled:false,emailVerified:true})}
 catch(e){if(!e||e.code!=='auth/user-not-found')throw e;u=await A.createUser({email,password:pw,emailVerified:true,displayName:'Admin'})}
 const D=db(),uref=D.doc('users/'+u.uid),cur=(await uref.get()).data()||{},b=D.batch(),o={role:'admin',email,suspended:false};
 if(!cur.username){let un='admin';const taken=await D.doc('usernames/'+un).get();if(taken.exists&&taken.get('uid')!==u.uid)un='admin'+u.uid.slice(0,4).toLowerCase().replace(/[^a-z0-9]/g,'0');
  Object.assign(o,{username:un,displayName:'Admin',createdAt:Date.now()});b.set(D.doc('usernames/'+un),{uid:u.uid});b.set(D.doc('publicProfiles/'+u.uid),{username:un,displayName:'Admin'})}
 b.set(uref,o,{merge:true});await b.commit();await A.setCustomUserClaims(u.uid,{role:'admin'});
 return json({ok:true})});
