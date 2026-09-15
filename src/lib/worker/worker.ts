import {handleCurrentMsg,getCurrent,objUrlMap,type currentObj} from '$lib/function/ImportParser'
//import type {currentObj} from '$lib/function/ImportParser'
//import { javascript } from '@codemirror/lang-javascript';
import {getCsgObjArray} from '$lib/function/csgChange'
//import * as Y from 'yjs'
//import {Doc} from 'yjs'
//import {getFileHandleFromOPFS} from "$lib/function/OPFS";
//import modeling from '@jscad/modeling'
const includeImport:{[key:string]:string} = {
  "@jscad/modeling": "./lib/modeling.esm.js",
  //"csgChange": "./lib/csgChange.js",
  "manifold-3d":"./lib/manifold/manifold.js"
}
import {parseError} from '$lib/utils/parseError';
import {type DirInfoType,createDirInfo} from "$lib/function/fileHandle"

const globalOption:{
 
  basename?:string
  DirHandle?:DirInfoType
} = {
 
}
  
const postMessage = async (e:any)=>{ 
  if (e.path){  
    try{ 
      //const name = 
      const handle =globalOption.DirHandle?.DirHandle?.getFileHandle(
        encodeURIComponent(e.path),
      ) 
      if (handle){
        const cur = handleCurrentMsg({db:await handle?.read() ,name:e.path },postMessage)  
      }
      
    }catch(err){  
        handleCurrentMsg({name:e.path})!.getUri = async ()=>new URL(
        includeImport[e.path] ||e.path  ,
        new URL(import.meta.url).origin).toString();    
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
const runCode =async (cur:currentObj,basename?:string )=>{
  globalOption.DirHandle?.channeldb?.removeEventListener("message",runHandle)
  try{ 
    const indexCurrent = getIndex(cur)
    const u = await indexCurrent.getUri() 
    const src = await  import(/* @vite-ignore */u) 
    const list = Object.keys(src)
    if (list.length){ 
      if (basename){
        globalOption.basename = basename 
      }
      if (!globalOption.basename || !list.includes(globalOption.basename)){
        globalOption.basename = list[0] 
      }
      const module = {list,basename:globalOption.basename} 
      self.postMessage({module}) 
 
      const workerHandle =async (ev:MessageEvent<{type:string,basename:string,key:string,msg:any}>)=>{
        switch (ev.data.type){
          case "worker":
            if (ev.data.key !== globalOption.DirHandle?.key || ev.data.basename !== basename){
              return;
            }
            let tmpDB = src[module.basename]()
            if (tmpDB.then){
              tmpDB = await tmpDB
            }
            //console.log(tmpDB)
            await getCsgObjArray(tmpDB,(msg)=>{ 
              globalOption.DirHandle?.channeldb?.postMessage({type:"workerData",basename,msg})
              
              const buf:Transferable[] = [];
              if ('index' in msg ){ 
                const keys = Object.keys(msg); 
                for (const k of keys){ 
                  if (msg[k] && msg[k].buffer){ 
                    msg[k] = msg[k].buffer
                    buf.push(msg[k])//  = await navigator.storage.getDirectory(); 
                  }
                };  
              }  
              self.postMessage(msg,buf )
              
            })
            break;
          case "workerData":
            console.log("get worker Data",ev.data)
            if (ev.data.basename !== basename){
              return;
            }
            self.postMessage(ev.data.msg )
            if (ev.data.msg.end){
              break
            }else{
              return;
            } 
        }
        globalOption.DirHandle?.channeldb?.removeEventListener("message",workerHandle)
        console.log("worker remove",ev.data)
      }
      globalOption.DirHandle?.channeldb?.addEventListener("message",workerHandle)
      globalOption.DirHandle?.channeldb?.postMessage({type:"worker",basename,key:globalOption.DirHandle.key})

    }
   
  }catch(err){
    //globalOption.indexCurrent=undefined
    self.postMessage({err:parseError(err as Error,objUrlMap)})
    throw err 
  } 
  globalOption.DirHandle?.channeldb?.addEventListener("message",runHandle)
}  
const run = (name:string,basename?:string)=>{
  globalOption.DirHandle?.DirHandle?.getFileHandle( name).read().then(db=>{ 
    //console.log(db)
    const cur = handleCurrentMsg({
      db ,
      name:decodeURIComponent( name) 
    })
    if (cur)
      runCode(cur, basename)
  })
}
const runHandle =(e:MessageEvent<{type:string,name:string}>)=>{
    if (e.data.type==="writeRes"){
      run(e.data.name,globalOption.basename) 
    }
}
self.onmessage   =async (event: MessageEvent) => {  
  if ( event.data.path){ 
    if (!globalOption.DirHandle || globalOption.DirHandle.path!==event.data.path ){  
      globalOption.DirHandle = createDirInfo(event.data.path);  
    }
    const name = event.data.name||"./index.js"
    const db = event.data.db || await globalOption.DirHandle.DirHandle?.getFileHandle(encodeURIComponent(name)).read()
    const cur =    handleCurrentMsg({ db,name },postMessage ); // getCurrentObjFromFileSystem(fh,name)
    if (cur  ){ 
      await runCode( cur,event.data.basename);
    }
  }else if (event.data.basename ){ 
    await runCode( await getCurrent("./index.js"),event.data.basename);
  } 
 
};
 

export {};