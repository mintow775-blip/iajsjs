import {run} from '../lib/adapter.mjs';
import h from '../lib/handlers/mc-versions.mjs';
export default (req,res)=>run(h,req,res);
