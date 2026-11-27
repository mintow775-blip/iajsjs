// Runs a Web-standard handler (Request -> Response) inside a Vercel Node function.
const SKIP=new Set(['host','connection','content-length','transfer-encoding','keep-alive','upgrade']);
export async function run(handler,req,res){
 try{
  const chunks=[];for await(const c of req)chunks.push(c);
  const hasBody=!['GET','HEAD'].includes(req.method)&&chunks.length>0;
  const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(!SKIP.has(k)&&typeof v==='string')headers.set(k,v);
  const url=`${req.headers['x-forwarded-proto']||'https'}://${req.headers.host||'localhost'}${req.url}`;
  const out=await handler(new Request(url,{method:req.method,headers,body:hasBody?Buffer.concat(chunks):undefined}));
  res.statusCode=out.status;out.headers.forEach((v,k)=>res.setHeader(k,v));
  res.end(Buffer.from(await out.arrayBuffer()));
 }catch(e){console.error(e);res.statusCode=500;res.setHeader('content-type','application/json');res.end(JSON.stringify({error:'Server error'}))}}
