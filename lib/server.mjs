import {initializeApp,cert,getApps,getApp} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {createHash} from 'node:crypto';
export {FieldValue};
export const MAX_FILE=20*1024*1024, MAX_CHUNK=4*1024*1024, MAX_CHUNKS=8;
export const ZIP_EXT=['jar','zip','mcpack','mcaddon','mcworld','mctemplate','mrpack'], ALLOWED_EXT=[...ZIP_EXT,'7z'];
export const adminEmails=()=>String(process.env.ADMIN_EMAILS||'atarafatyt1@gmail.com').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
export const isAdminEmail=e=>!!e&&adminEmails().includes(String(e).toLowerCase());
export class HttpError extends Error{constructor(s,m){super(m);this.status=s}}
export const json=(o,s=200,h={})=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json','cache-control':'no-store',...h}});
// Turns common Firestore / credential failures into a readable message instead of a bare "Server error" (the real error is still logged in Vercel > Logs).
const hint=e=>{const m=String(e&&e.message||'');
 if(e&&e.code===5&&!/No document to update/i.test(m))return'Firestore database not found. Firebase Console > Build > Firestore Database > Create database.';
 if(e&&e.code===7)return'Firestore access denied. Enable the Cloud Firestore API and check that FIREBASE_SERVICE_ACCOUNT_JSON belongs to this project.';
 if(/DECODER routines|PEM|private key|Invalid PEM|invalid_grant|Getting metadata from plugin/i.test(m))return'FIREBASE_SERVICE_ACCOUNT_JSON is invalid (private key could not be read). Paste the full service account JSON again.';
 return null};
export const handle=async fn=>{try{return await fn()}catch(e){if(e instanceof HttpError)return json({error:e.message},e.status);console.error(e);return json({error:hint(e)||'Server error'},500)}};
let app,fs;
// Service account: accepts the JSON as-is, wrapped in quotes, with raw line breaks, or base64. Or use the 3 separate variables FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.
export function loadServiceAccount(){
 let sa=null;const raw0=String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||'').trim();
 if(raw0){let raw=raw0.replace(/^'([\s\S]*)'$/,'$1');
  if(!raw.startsWith('{')&&!raw.startsWith('"')){try{raw=Buffer.from(raw,'base64').toString('utf8')}catch(e){}}
  for(const t of [raw,raw.replace(/\r?\n/g,'\\n')]){try{let j=JSON.parse(t);if(typeof j==='string')j=JSON.parse(j);if(j&&typeof j==='object'){sa=j;break}}catch(e){}}}
 if(!sa&&process.env.FIREBASE_PROJECT_ID&&process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY)sa={project_id:process.env.FIREBASE_PROJECT_ID,client_email:process.env.FIREBASE_CLIENT_EMAIL,private_key:process.env.FIREBASE_PRIVATE_KEY};
 if(sa&&sa.private_key)sa.private_key=String(sa.private_key).replace(/\\n/g,'\n');
 return sa}
// Firestore (Admin SDK). Bypasses security rules, so every handler checks the caller itself.
export function db(){if(!fs){const sa=loadServiceAccount();
 if(!sa||!sa.private_key||!sa.client_email)throw new HttpError(500,'Server is not configured (FIREBASE_SERVICE_ACCOUNT_JSON missing or not valid JSON)');
 app=getApps().length?getApp():initializeApp({credential:cert(sa),projectId:sa.project_id});
 fs=getFirestore(app);try{fs.settings({ignoreUndefinedProperties:true})}catch(e){}}return fs}
export const auth=()=>{db();return getAuth(app)};
// Verifies the Firebase ID token and loads the role from the database. The role is NEVER taken from the client.
export async function authUser(req,{dev=false,admin:needAdmin=false,verified=false}={}){
 const m=/^Bearer (.+)$/.exec(req.headers.get('authorization')||'');if(!m)throw new HttpError(401,'Login required');
 const A=auth();let t;try{t=await A.verifyIdToken(m[1],true)}catch(e){throw new HttpError(401,'Invalid or expired session')}
 const u=(await db().doc('users/'+t.uid).get()).data()||{};if(u.suspended===true)throw new HttpError(403,'Account suspended');
 let role=['admin','developer'].includes(u.role)?u.role:'user';
 // Admin emails (ADMIN_EMAILS) are admin without OTP/email verification. Register that account yourself right away so nobody else can.
 if(isAdminEmail(t.email))role='admin';
 if(verified&&!t.email_verified&&role!=='admin')throw new HttpError(403,'Verify your email first');
 if(needAdmin&&role!=='admin')throw new HttpError(403,'Admin only');
 if(dev&&!['admin','developer'].includes(role))throw new HttpError(403,'Developer approval required');
 return{uid:t.uid,role,email:t.email,emailVerified:!!t.email_verified}}
export async function ownsProject(u,pid){if(u.role==='admin')return true;const o=(await db().doc('projects/'+pid).get()).get('ownerUid');return o===u.uid}
export const safeId=s=>/^[A-Za-z0-9_-]{1,64}$/.test(s||'');
export const safeName=n=>String(n||'').replace(/[^A-Za-z0-9._-]/g,'_').replace(/^\.+/,'').slice(0,100);
export const ext=n=>(String(n).split('.').pop()||'').toLowerCase();
export function checkFile(name,buf){const e=ext(name);if(!ALLOWED_EXT.includes(e))throw new HttpError(415,'File type not allowed');
 if(buf.length<4||buf.length>MAX_FILE)throw new HttpError(413,'File must be 1 byte to 20 MB');
 const zip=buf[0]===0x50&&buf[1]===0x4b&&buf[2]<=0x07&&buf[3]<=0x08, z7=buf[0]===0x37&&buf[1]===0x7a&&buf[2]===0xbc&&buf[3]===0xaf;
 if(e==='7z'?!z7:!zip)throw new HttpError(415,'File content does not match its extension')}
export const sha256=b=>createHash('sha256').update(b).digest('hex');
const OWNER=()=>process.env.GITHUB_OWNER,REPO=()=>process.env.GITHUB_REPO;
export const repoPath=()=>`/repos/${OWNER()}/${REPO()}`;
export async function gh(path,{method='GET',body,headers={},manual=false,base='https://api.github.com'}={}){
 if(!process.env.GITHUB_TOKEN||!OWNER()||!REPO())throw new HttpError(500,'Server is not configured (GitHub env vars missing)');
 return fetch(base+path,{method,body,redirect:manual?'manual':'follow',headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'ar-x-mine-functions',Accept:'application/vnd.github+json',...headers}})}
export async function ensureRelease(tag,name){let r=await gh(`${repoPath()}/releases/tags/${encodeURIComponent(tag)}`);
 if(r.status===404){r=await gh(`${repoPath()}/releases`,{method:'POST',body:JSON.stringify({tag_name:tag,name,draft:false,prerelease:false,body:'Managed by AR X Mine'})});}
 if(!r.ok)throw new HttpError(502,'GitHub release error ('+r.status+')');return r.json()}

// ---- Backblaze B2 (S3-compatible) file storage. Credentials come ONLY from Vercel env vars. No SDK: plain AWS Signature V4 with node:crypto. ----
import {createHmac} from 'node:crypto';
const hm=(k,d)=>createHmac('sha256',k).update(d).digest(),hx=d=>createHash('sha256').update(d).digest('hex');
const enc=x=>encodeURIComponent(x).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
const encPath=p=>p.split('/').map(enc).join('/');
export function b2cfg(){
 const ep=String(process.env.B2_ENDPOINT||'').replace(/^https?:\/\//,'').replace(/\/+$/,''),id=process.env.B2_KEY_ID,secret=process.env.B2_APPLICATION_KEY,bucket=process.env.B2_BUCKET;
 if(!ep||!id||!secret||!bucket)throw new HttpError(500,'Server is not configured (B2 env vars missing)');
 return{host:ep,id,secret,bucket,region:(/s3\.([^.]+)\.backblazeb2\.com/.exec(ep)||[])[1]||'us-east-005'}}
const skey=(secret,d8,region)=>hm(hm(hm(hm('AWS4'+secret,d8),region),'s3'),'aws4_request');
const stamp=(now=new Date())=>now.toISOString().replace(/[:-]|\.\d{3}/g,'');
// presigned URL (query-string auth). Exported for tests.
export function presign({method='GET',host,path,query={},id,secret,region,expires=300,now=new Date()}){
 const t=stamp(now),d8=t.slice(0,8),scope=`${d8}/${region}/s3/aws4_request`;
 const q={...query,'X-Amz-Algorithm':'AWS4-HMAC-SHA256','X-Amz-Credential':`${id}/${scope}`,'X-Amz-Date':t,'X-Amz-Expires':String(expires),'X-Amz-SignedHeaders':'host'};
 const cq=Object.keys(q).sort().map(k=>enc(k)+'='+enc(q[k])).join('&');
 const creq=[method,encPath(path),cq,`host:${host}\n`,'host','UNSIGNED-PAYLOAD'].join('\n');
 const sts=['AWS4-HMAC-SHA256',t,scope,hx(creq)].join('\n');
 const sig=createHmac('sha256',skey(secret,d8,region)).update(sts).digest('hex');
 return `https://${host}${encPath(path)}?${cq}&X-Amz-Signature=${sig}`}
async function b2Call(method,key,body){
 const c=b2cfg(),path=`/${c.bucket}/${key}`,t=stamp(),d8=t.slice(0,8),scope=`${d8}/${c.region}/s3/aws4_request`,ph=hx(body||'');
 const ch=`host:${c.host}\nx-amz-content-sha256:${ph}\nx-amz-date:${t}\n`,sh='host;x-amz-content-sha256;x-amz-date';
 const creq=[method,encPath(path),'',ch,sh,ph].join('\n'),sts=['AWS4-HMAC-SHA256',t,scope,hx(creq)].join('\n');
 const sig=createHmac('sha256',skey(c.secret,d8,c.region)).update(sts).digest('hex');
 const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),25000);
 try{const r=await fetch(`https://${c.host}${encPath(path)}`,{method,body,signal:ac.signal,headers:{'x-amz-date':t,'x-amz-content-sha256':ph,Authorization:`AWS4-HMAC-SHA256 Credential=${c.id}/${scope}, SignedHeaders=${sh}, Signature=${sig}`}});
  if(!r.ok&&!(method==='DELETE'&&r.status===404)){console.error('b2',method,r.status,(await r.text().catch(()=>'')).slice(0,300));throw new HttpError(502,'File storage error (HTTP '+r.status+')')}return r}
 catch(e){if(e instanceof HttpError)throw e;throw new HttpError(504,'File storage unreachable')}finally{clearTimeout(tm)}}
export const b2Put=(key,buf)=>b2Call('PUT',key,buf);
export const b2Delete=key=>b2Call('DELETE',key);
export const b2Get=async key=>Buffer.from(await (await b2Call('GET',key)).arrayBuffer());
export async function b2Url(key,name){const c=b2cfg();return presign({host:c.host,path:`/${c.bucket}/${key}`,query:{'response-content-disposition':`attachment; filename="${safeName(name)}"`},id:c.id,secret:c.secret,region:c.region,expires:300})}
