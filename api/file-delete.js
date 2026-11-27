import {run} from '../lib/adapter.mjs';
import h from '../lib/handlers/file-delete.mjs';
export default (req,res)=>run(h,req,res);
