import {run} from '../lib/adapter.mjs';
import h from '../lib/handlers/sync-project.mjs';
export default (req,res)=>run(h,req,res);
