// One-time copy of the old Realtime Database data into Cloud Firestore.
// Run locally:  npm i  &&  FIREBASE_SERVICE_ACCOUNT_JSON='{...}' FIREBASE_DATABASE_URL=https://<project>-default-rtdb.firebaseio.com node scripts/migrate-rtdb-to-firestore.mjs
// Safe to run twice (it overwrites the same documents). It never deletes anything from the Realtime Database.
import {initializeApp,cert} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';
import {getFirestore} from 'firebase-admin/firestore';
import {loadServiceAccount} from '../lib/server.mjs';
const sa=loadServiceAccount();
if(!sa||!process.env.FIREBASE_DATABASE_URL){console.error('Set FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_DATABASE_URL first.');process.exit(1)}
const app=initializeApp({credential:cert(sa),projectId:sa.project_id,databaseURL:process.env.FIREBASE_DATABASE_URL});
const rt=getDatabase(app),fs=getFirestore(app);fs.settings({ignoreUndefinedProperties:true});
const w=fs.bulkWriter();let n=0;
const put=(path,data)=>{n++;return w.set(fs.doc(path),data&&typeof data==='object'?data:{v:data})};
const get=async p=>(await rt.ref(p).get()).val()||{};
const each=(o,f)=>Object.entries(o||{}).forEach(([k,v])=>f(k,v));

each(await get('users'),(uid,u)=>{
  const {favorites,following,notifications,downloads,...rest}=u||{};
  put(`users/${uid}`,rest);
  each(favorites,(k)=>put(`users/${uid}/favorites/${k}`,{v:true}));
  each(following,(k)=>put(`users/${uid}/following/${k}`,{v:true}));
  each(notifications,(k,v)=>put(`users/${uid}/notifications/${k}`,v));
  each(downloads,(k,v)=>put(`users/${uid}/downloads/${k}`,v));
});
each(await get('usernames'),(name,uid)=>put(`usernames/${name}`,{uid}));
each(await get('publicProfiles'),(k,v)=>put(`publicProfiles/${k}`,v));
each(await get('developerApplications'),(k,v)=>put(`developerApplications/${k}`,v));
const site=await get('site');
if(site.brand)put('site/brand',site.brand);
each(site.banners,(k,v)=>put(`banners/${k}`,v));
each(site.socials,(k,v)=>put(`socials/${k}`,v));
const cat=await get('catalog');
each(cat.categories,(k,v)=>put(`catalogCategories/${k}`,v));
each(cat.platforms,(k,v)=>put(`catalogPlatforms/${k}`,v));
each(cat.mcVersions,(k,v)=>put(`catalogMcVersions/${k}`,v));
each(await get('projects'),(k,v)=>put(`projects/${k}`,v));
each(await get('projectsPublic'),(k,v)=>put(`projectsPublic/${k}`,v));
each(await get('projectVersions'),(pid,vs)=>each(vs,(vid,v)=>put(`projectVersions/${pid}/items/${vid}`,v)));
each(await get('projectFiles'),(pid,vs)=>each(vs,(vid,fl)=>each(fl,(fid,v)=>put(`projectFiles/${pid}/versions/${vid}/files/${fid}`,v))));
each(await get('reviews'),(pid,rs)=>each(rs,(uid,v)=>put(`reviews/${pid}/items/${uid}`,v)));
each(await get('reviewVotes'),(pid,by)=>each(by,(ruid,vs)=>each(vs,(voter,val)=>put(`reviewVotes/${pid}/items/${ruid}__${voter}`,{ruid,voter,helpful:!!val}))));
each(await get('comments'),(pid,cs)=>each(cs,(cid,v)=>put(`comments/${pid}/items/${cid}`,v)));
each(await get('reports'),(k,v)=>put(`reports/${k}`,v));
await w.close();
console.log('Done. Documents written:',n);
process.exit(0);
