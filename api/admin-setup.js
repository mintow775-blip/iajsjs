import {run} from '../lib/adapter.mjs';
import h from '../lib/handlers/admin-setup.mjs';
export default (req,res)=>run(h,req,res);
