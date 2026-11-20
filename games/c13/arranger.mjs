import {arrange} from './engine.mjs';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,rows:arrange(data.hand,data.profile)})}catch(e){self.postMessage({id:data.id,error:e.message})}};
