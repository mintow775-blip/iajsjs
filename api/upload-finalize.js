import {run} from '../lib/adapter.mjs';
import h from '../lib/handlers/upload-finalize.mjs';
export default (req,res)=>run(h,req,res);
