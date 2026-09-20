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

  //basename?:string
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
const getArrayBufferList = (msg:any)=>{
  const buf:Transferable[] = [];
  if ('index' in msg    ){                
    const keys = Object.keys(msg); 
    for (const k of keys){ 
      if (msg[k] && msg[k].buffer){ 
        msg[k] = msg[k].buffer
        buf.push(msg[k])  
      }
    };   
  }  
  return buf
}
const runCode =async (cur:currentObj  )=>{
  globalOption.DirHandle?.channeldb?.removeEventListener("message",runHandle)
  try{ 
    const indexCurrent = getIndex(cur)
    const u = await indexCurrent.getUri() 
    const src = await  import(/* @vite-ignore */u) 
    const fnlist = Object.keys(src)
    if (!fnlist){
      throw "not have function"
    }
    const fnlistSet = new Set(fnlist)
     
    const module = {list:fnlist,basename:globalOption.DirHandle?.path} 
    self.postMessage({module}) 
    //let isBroadcast=false
    const workerHandle =async (ev:MessageEvent<{type:string,run?:string,key:string,msg:any}>)=>{

      switch (ev.data.type){
        case "workerRun":
          if (ev.data.key !== globalOption.DirHandle?.key  ){ 
            break;
          }
          if (!ev.data.run ){
            break
          }
          if (!fnlistSet.has(ev.data.run)){
            break
          }
          //globalOption.DirHandle?.channeldb?.postMessage({type:"workerData",run:ev.data.run,msg:{ start: true }})
          fnlistSet.delete(ev.data.run)  
          console.log(ev.data,globalOption.DirHandle?.key) 
          let tmpDB = src[ev.data.run]()
          if (tmpDB.then){
            tmpDB = await tmpDB
          }    
          await getCsgObjArray(tmpDB,async(msg)=>{ 
            globalOption.DirHandle?.channeldb?.postMessage({type:"workerData",run:ev.data.run,msg }) 
           
            self.postMessage(Object.assign(msg,{tag:ev.data.run}),getArrayBufferList(msg) ) 
          }) 
          self.postMessage({ end: true })
          globalOption.DirHandle?.channeldb?.postMessage({type:"workerData",run:ev.data.run,msg:{ end: true }})
          break;
        case "workerData":
          console.log("get worker Data",ev.data,globalOption.DirHandle?.key)
          if (!ev.data.run || !fnlistSet.has(ev.data.run)){
            break
          }
          if (ev.data.msg.end){ 
            fnlistSet.delete(ev.data.run)
          }//else{ 
          self.postMessage(Object.assign(ev.data.msg,{tag:ev.data.run}),getArrayBufferList(ev.data.msg) )
          //} 
      }
     
      if (fnlistSet.size>0){
        globalOption.DirHandle?.channeldb?.postMessage({
          type:"worker",
           //list:fnlist,
           key:globalOption.DirHandle.key})
        return
      }
      globalOption.DirHandle?.channeldb?.removeEventListener("message",workerHandle)
      //console.log("worker remove",ev.data) 
      self.postMessage({ stopTicker: true }); 
    }
    globalOption.DirHandle?.channeldb?.addEventListener("message",workerHandle)
    globalOption.DirHandle?.channeldb?.postMessage({type:"worker",path:globalOption.DirHandle?.path,list:fnlist,key:globalOption.DirHandle.key})

    
   
  }catch(err){
    //globalOption.indexCurrent=undefined
    self.postMessage({err:parseError(err as Error,objUrlMap)})
    //throw err 
    console.error(err)
  } 
  globalOption.DirHandle?.channeldb?.addEventListener("message",runHandle)
}  
 
const runHandle =(e:MessageEvent<{type:string,name:string}>)=>{
    if (e.data.type==="writeRes"){ 
      globalOption.DirHandle?.DirHandle?.getFileHandle( e.data.name).read().then(db=>{ 
        //console.log(db)
        const cur = handleCurrentMsg({
          db ,
          name:decodeURIComponent( e.data.name) 
        })
        if (cur)
          runCode(cur)
      })
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
      await runCode( cur );
    }
  }else if (event.data.basename ){ 
    await runCode( await getCurrent("./index.js") );
  } 
 
};
 

export {};