import {clearCurrent,handleCurrentMsg,getCurrent,objUrlMap,type currentObj} from '$lib/function/ImportParser'
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
//import { Array } from 'yjs';

const globalOption:{

  //basename?:string
  Option?:any
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
const runCode = async (indexCurrent:currentObj,update?:string)=>{
    const u = await indexCurrent.getUri() 
    const src = await  import(/* @vite-ignore */u) 
    const fnlist = Object.keys(src)
    if (!fnlist){
      throw "not have function"
    }
    const fnlistSet = new Set(fnlist) 
    const module = {list:fnlist,path:globalOption.DirHandle?.path} 
    self.postMessage({module,update})  
    const workerHandle =async (ev:MessageEvent<{type:string,run?:string,key:string,msg:any}>)=>{
      switch (ev.data.type){
        case "workerRun":
          if (ev.data.key !== globalOption.DirHandle?.key  ){ 
            return;
          }
          if (!ev.data.run ){
            return
          }
          if (!fnlistSet.has(ev.data.run)){
            return
          }
          //globalOption.DirHandle?.channeldb?.postMessage({type:"workerData",run:ev.data.run,msg:{ start: true }})
          fnlistSet.delete(ev.data.run)  
          //console.log(ev.data,globalOption.DirHandle?.key) 
          let tmpDB = src[ev.data.run](globalOption.Option)
          if (tmpDB.then){
            tmpDB = await tmpDB
          }    
          await getCsgObjArray(tmpDB,async(msg)=>{ 
            globalOption.DirHandle?.channeldb?.postMessage({
              update,
              type:"workerData",run:ev.data.run,msg 
            }) 
          })  
          globalOption.DirHandle?.channeldb?.postMessage({
            update,
            type:"workerData",run:ev.data.run,msg:{ end: true }})
          break;
        case "workerData":
          if (!ev.data.run || !fnlistSet.has(ev.data.run)){
            return
          }
          if (ev.data.msg.end){ 
            fnlistSet.delete(ev.data.run)
          }
          //self.postMessage(Object.assign(ev.data.msg,{tag:ev.data.run}),getArrayBufferList(ev.data.msg) )
          break
        default:
          return
      }
      if (fnlistSet.size>0){
        globalOption.DirHandle?.channeldb?.postMessage({
          type:"worker", 
          key:globalOption.DirHandle.key
        })
        return
      }
      globalOption.DirHandle?.channeldb?.removeEventListener(
        "message",workerHandle) 
      self.postMessage({ stopTicker: true }); 
    }
    globalOption.DirHandle?.channeldb?.addEventListener("message",workerHandle)
    return {fnlistSet,src}
}
const RunCode =async (
  indexCurrent:currentObj,
  initOption:boolean = true,
  update?:string  
)=>{
  globalOption.DirHandle?.channeldb?.removeEventListener("message",runHandle)
  try{ 
    const {fnlistSet,src} = await runCode(indexCurrent,update)
    if (initOption ){
      if (fnlistSet.has("main")){
        globalOption.Option = src['main']()
        if (globalOption.Option.then){
          globalOption.Option = await globalOption.Option
        } 
        fnlistSet.delete("main")
      }
      
      const db = {
        key:globalOption.DirHandle?.key,
        type:"worker",
        list:[...fnlistSet],
        name:indexCurrent.name,
        update,
        Option:globalOption.Option 
      }
      //console.log(db)
      globalOption.DirHandle?.channeldb?.postMessage(db)
    }else{
      if (fnlistSet.has("main")){
        fnlistSet.delete("main")
      }
    }
  }catch(err){
    //globalOption.indexCurrent=undefined
    self.postMessage({err:parseError(err as Error,objUrlMap)})
    //throw err 
    console.error(err)
  } 
  globalOption.DirHandle?.channeldb?.addEventListener("message",runHandle)
}

const runHandle =(e:MessageEvent<{
  list:any,type:string,name:string,update?:string,Option:any}>)=>{
  switch (e.data.type){  
    case "worker":
      //console.log(e.data)
      if (e.data.Option && !globalOption.Option){
        globalOption.Option = e.data.Option
      }
      if (e.data.name){
        //handleCurrentMsg({})
        if (!e.data.update){
          clearCurrent()
        }
        getCurrent(e.data.name,postMessage).then(cur=>{
          //console.log(e.data)
          RunCode(cur,false,e.data.update ).then(()=>{ 
            globalOption.DirHandle?.channeldb?.postMessage({
              type:"worker",
              run:true,
              update:e.data.update,//?true:false,
              //list:e.data.list,
              //path:globalOption.DirHandle.path,
              key:globalOption.DirHandle.key
            })
          })
          
        })
      }      
      return;
  }
}
self.onmessage   = async (event: MessageEvent) => {  
  if ( event.data.path){ 
    if (!globalOption.DirHandle || globalOption.DirHandle.path!==event.data.path ){  
      globalOption.DirHandle = createDirInfo(event.data.path);  
      globalOption.DirHandle.channeldb?.addEventListener("message",runHandle)
    }
    self.postMessage({type:"init"})
  }
  if (event.data.name ){
    if (!event.data.update){
      clearCurrent()
    }
    await RunCode(
      await getCurrent(event.data.name,postMessage),
      true,
      event.data.update 
    ); 
  }  
};
 

export {};