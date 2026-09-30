import {
  clearCurrent,
  handleCurrentMsg,
  getCurrent,
  objUrlMap,type currentObj} from '$lib/function/ImportParser'
import {getCsgObjArray} from '$lib/function/csgChange' 
import {sendGeometry} from '$lib/function/geoSend'
const includeImport:{[key:string]:string} = {
  "@jscad/modeling": "./lib/modeling.esm.js",
  //"csgChange": "./lib/csgChange.js",
  "manifold-3d":"./lib/manifold/manifold.js"
}
import {parseError} from '$lib/utils/parseError';
import {type DirInfoType,createDirInfo} from "$lib/function/fileHandle"
/*
import {type csgObj } from "$lib/function/csg2Three";
  const sendGeometry = (
    channel: {send:(db:any)=>void},
    obj: csgObj,
    options: { smooth?: boolean } = {}
  )=>{
    console.log(1)
  }*/
const globalOption:{

  //basename?:string
  Option?:any
  DirHandle?:DirInfoType
} = {
 
}

const postMessage = async (e:any)=>{ 
  console.log("postMsg",e.path)
  if (e.path){  
    try{ 
      //const name = 
      const handle =globalOption.DirHandle?.DirHandle?.getFileHandle(
        encodeURIComponent(e.path),
      ) 
      if (handle){
        const db = await handle.read()
        
        handleCurrentMsg({ db,name:e.path },postMessage)  
      }
      
    }catch(err){  
      //console.error(err,globalOption,e)
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
//  console.log("listen worker")
const runCode = async (indexCurrent:currentObj,update?:string)=>{
  globalOption.DirHandle?.channeldb?.removeEventListener("message",runHandle)
  const u = await indexCurrent.getUri() 
  const src = await  import(/* @vite-ignore */u) 
  const fnlist = Object.keys(src)
  if (!fnlist){
    throw "not have function"
  }
  const fnlistSet = new Set(fnlist) 
  //const module = {list:fnlist,path:globalOption.DirHandle?.path} 
  //self.postMessage({module,update})  
  const workerHandle =async (ev:MessageEvent<{
    type:string,run?:string,key:string,msg:any,end:boolean}>)=>{
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
        //console.log("worker open")
        await getCsgObjArray(tmpDB,async(msg:any)=>{ 
          
          // console.log(msg)
          if (msg.type==="mesh") 
            await sendGeometry({send:(db)=>{ 
              globalOption.DirHandle?.channeldb?.postMessage({
                key:globalOption.DirHandle.key,
                update,
                type:"workerData",mesh:true,run:ev.data.run,msg:{db} 
              })  
            }},msg as any)
          else  
            globalOption.DirHandle?.channeldb?.postMessage({
              key:globalOption.DirHandle.key,
              update,
              type:"workerData",run:ev.data.run,msg 
            })
        })  
        globalOption.DirHandle?.channeldb?.postMessage({
          update,
          key:globalOption.DirHandle.key,
          type:"workerData",run:ev.data.run,  end: true })
        break;
      case "workerData":
        if (!ev.data.run || !fnlistSet.has(ev.data.run)){
          return
        }
        if (ev.data.end){ 
          fnlistSet.delete(ev.data.run)
        }
        //self.postMessage(Object.assign(ev.data.msg,{tag:ev.data.run}),getArrayBufferList(ev.data.msg) )
        break
      default:
        return
    }

    if (fnlistSet.size>0){
      /*
      globalOption.DirHandle?.channeldb?.postMessage({
        type:"worker", 
        update,
        key:globalOption.DirHandle.key
      })*/
      return
    }
    globalOption.DirHandle?.channeldb?.removeEventListener(
      "message",workerHandle) 
    self.postMessage({ stopTicker: true }); 
    globalOption.DirHandle?.channeldb?.addEventListener("message",runHandle)
  }
  globalOption.DirHandle?.channeldb?.addEventListener("message",workerHandle)
  return {fnlistSet,src}
}
const RunCode =async (
  indexCurrent:currentObj,
  initOption:boolean = true,
  update?:string  ,
  postMsg?:(db:any)=>void,
)=>{
  
  try{ 
    const {fnlistSet,src} = await runCode(indexCurrent,update)
 
    if (initOption ){
      if (fnlistSet.has("default")){
        globalOption.Option = src['default']()
        if (globalOption.Option.then){
          globalOption.Option = await globalOption.Option
        } 
        fnlistSet.delete("default")
      }
      const db = {
        key:globalOption.DirHandle?.key,
        type:"workerInit",
        list:[...fnlistSet],
        name:indexCurrent.name,
        update,
        Option:globalOption.Option 
      }
      postMsg?.(db)
      //console.log(db)
      //globalOption.DirHandle?.channeldb?.postMessage(db)
    }else{
      if (fnlistSet.has("main")){
        fnlistSet.delete("main")
      }
      postMsg?.({
              type:"worker",
              //run:true,
              update,//:e.data.update,//?true:false,
              //list:e.data.list,
              //path:globalOption.DirHandle.path,
              key:globalOption.DirHandle?.key
            })
    }
    const module = {list:[...fnlistSet],path:globalOption.DirHandle?.path} 
    self.postMessage({module,update}) 
  }catch(err){
    //globalOption.indexCurrent=undefined
    self.postMessage({err:parseError(err as Error,objUrlMap)})
    //throw err 
    console.error(err)
  } 
  //globalOption.DirHandle?.channeldb?.addEventListener("message",runHandle)
}

const runHandle =(e:MessageEvent<{
  list:any,type:string,name:string,update?:string,Option:any}>)=>{
  switch (e.data.type){  
    case "workerInit":
      if (!e.data.list){
        return;
      }
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
          console.log("run",e.data)
          RunCode(cur,false,e.data.update,(db)=>{ 
            globalOption.DirHandle?.channeldb?.postMessage(db)
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
      
    }
    self.postMessage({type:"init"})
    //return;
  }
  if (event.data.name ){
    if (!event.data.update){
      clearCurrent()
    }
    //console.log("run code")
    await RunCode(
      await getCurrent(event.data.name,postMessage),
      true,
      event.data.update ,
      (db)=>{
        //console.log("main",db)
        globalOption.DirHandle?.channeldb?.postMessage(db)
      }
    ); 
  }  else{
    globalOption.DirHandle?.channeldb?.addEventListener("message",runHandle)
  }
};
 

export {};