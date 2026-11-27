import {db,json,handle,b2cfg,loadServiceAccount} from '../server.mjs';
// GET /api/health : shows (Firestore) which environment variables the server can see (true/false only, never the values) and whether Firebase answers.
export default req=>handle(async()=>{
 const names=['ADMIN_EMAILS','ADMIN_PASSWORD','FIREBASE_SERVICE_ACCOUNT_JSON','B2_ENDPOINT','B2_BUCKET','B2_KEY_ID','B2_APPLICATION_KEY'];
 const env=Object.fromEntries(names.map(n=>[n,!!process.env[n]]));
 let sa='missing';try{const j=loadServiceAccount();sa=!j?(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?'not valid JSON':'missing'):(j.private_key&&j.client_email?'valid':'incomplete')}catch(e){sa='error'}
 let firebase='ok';try{await db().doc('site/brand').get()}catch(e){firebase=String(e&&e.message||e).slice(0,140)}
 let b2='configured';try{b2cfg()}catch(e){b2='missing variables'}
 return json({ok:firebase==='ok',env,serviceAccountJson:sa,firebase,b2})});
