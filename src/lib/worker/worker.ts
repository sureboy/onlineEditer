import {handleCurrentMsg} from '$lib/function/ImportParser'
import type {currentObj} from '$lib/function/ImportParser'
//import { javascript } from '@codemirror/lang-javascript';
import {getCsgObjArray} from '$lib/function/csgChange'
import {getFileHandleFromOPFS} from "$lib/function/OPFS";
//import modeling from '@jscad/modeling'
const includeImport:{[key:string]:string} = {
  "@jscad/modeling": "./lib/modeling.esm.js",
  //"csgChange": "./lib/csgChange.js",
  "manifold-3d":"./lib/manifold/manifold.js"
}
//const {handleCurrentMsg} = await import('$lib/function/ImportParser')
let indexCurrent:currentObj|undefined = undefined
const postMessage =async (e:any)=>{

  if (e.path){
    try{
      const f = await getFileHandleFromOPFS(e.path) 
      const _f = await  f.getFile()
       
      handleCurrentMsg({db:await _f.text() ,name:e.path},postMessage)
        
         
       
    }catch(err){
      //console.log("opfs err")
      //console.error(err)
      //setTimeout(()=>{
        handleCurrentMsg({name:e.path})!.getUri = async ()=>new URL(
        includeImport[e.path] ||e.path  ,
        new URL(import.meta.url).origin).toString();
      //})       
    }
    
  }
}
const getIndex = (c:currentObj )=>{
 
  if (c.persons && c.persons.size>0){
    const li:currentObj[] = []
    c.persons.forEach(_c=>{
      const _c_ = getIndex(_c)
      if (li.includes(_c_)){
        return
      }
      li.push(_c_) 
    })
    return li[0] 
  }else{
    //li.add(c)
    return c
  } 
}
const runCode =async (cur:currentObj,basename:string="main")=>{
  try{
    indexCurrent = getIndex(cur)
    const u = await indexCurrent.getUri() 
    const src=await  import(/* @vite-ignore */u) 
    const list = Object.keys(src)
    if (!list.length){
      return
    }
    const module = {list,basename:(list.includes(basename))?basename:list[0]} 
    self.postMessage({module}) 
    const tmpDB = src[module.basename]()
    getCsgObjArray(tmpDB,(msg)=>{ 
      if ('index' in msg ){
        const buf:Transferable[] = [];
        const keys = Object.keys(msg); 
        for (const k of keys){ 
          if (msg[k] && msg[k].buffer){ 
            msg[k] = msg[k].buffer
            buf.push(msg[k]) 
          }
        }; 
        self.postMessage(msg,buf )
      }else{
        self.postMessage(msg )
      }      
    })
  }catch(err){
    throw err
    //console.error(err)
  }
   
   
}
//console.log("run1")
self.onmessage = (event: MessageEvent) => { 
  console.log("get msg",event.data)
  if (event.data.name && event.data.db){
    const cur = handleCurrentMsg(event.data,postMessage ); 
    if (cur){
      runCode( cur);
    }
    return;
  }
  if (indexCurrent && event.data.basename){
    runCode(indexCurrent,event.data.basename)
  }
 
};
//console.log("run")
//self.postMessage({start:true})
// 导出空对象以适配 TypeScript 模块要求
export {};