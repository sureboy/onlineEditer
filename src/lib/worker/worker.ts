import {handleCurrentMsg} from '$lib/function/ImportParser'
import type {currentObj} from '$lib/function/ImportParser'
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
//import {createStorage} from '$lib/storage-adapter/factory'  
//import type {EntryInfo} from "$lib/storage-adapter/types"
//const {handleCurrentMsg} = await import('$lib/function/ImportParser')
import {type DirHandleType,getDirHandle} from "$lib/function/fileHandle"

const globalOption:{
  indexCurrent?:currentObj,
 
  DirHandle?:DirHandleType
} = { 
 
}
let  channel:BroadcastChannel|undefined = undefined// = new BroadcastChannel(solidControlConfig.title); 
const initBroadcastChannel = (name:string)=>{
  if (channel)return
  channel = new BroadcastChannel(name+"_db"); 
  channel.postMessage({type:"init"})
  channel.onmessage =async (event:MessageEvent<{basename:string,key?:string,type?:string,name?:string,db?:string}>) => { 
    console.log("worker broadcase",event.data) 
    if (globalOption.indexCurrent && event.data.basename){
       console.log("worker show",globalOption.indexCurrent)
      runCode(globalOption.indexCurrent,event.data.basename)
      //return
    } 
    if (!event.data.name || !event.data.type){
      channel?.postMessage(event.data)
      return 
    } 

    switch (event.data.type){
      case "read":
        const db = await globalOption.DirHandle?.getFileHandle(event.data.name).read() 
        channel?.postMessage(Object.assign(event.data,{db}))
        return;
      case "write":
        await globalOption.DirHandle?.getFileHandle(event.data.name).write(event.data.db!) 
        globalOption.indexCurrent = getIndex(handleCurrentMsg({db:event.data.db,name:event.data.name } )!)
        channel?.postMessage({type:event.data.type,key:event.data.key})
        
        return;
      case "del":
        await globalOption.DirHandle?.getFileHandle(event.data.name).del()
        channel?.postMessage(event.data)
        return;
      default:
        channel?.postMessage(event.data)
        return 
    } 
  }; 
}



const postMessage = async (e:any)=>{
 

  
  if (e.path){  
    try{ 

      const handle =globalOption.DirHandle?.getFileHandle(
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
const runCode =async (cur:currentObj,basename:string )=>{
 try{
    globalOption.indexCurrent = getIndex(cur)
    const u = await globalOption.indexCurrent.getUri() 
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
            buf.push(msg[k])//  = await navigator.storage.getDirectory(); 
          }
        }; 
        self.postMessage(msg,buf )
      }else{
        self.postMessage(msg )
      }      
    })
  }catch(err){
    throw err 
  } 
}  
self.onmessage =async (event: MessageEvent) => { 
  //console.log("get msg",event.data)
  if ( event.data.path){
    initBroadcastChannel(event.data.path)
    if (!globalOption.DirHandle || globalOption.DirHandle.name!==event.data.path ){
      try{
        //if (!globalOption.root)globalOption.root=await navigator.storage.getDirectory();
        globalOption.DirHandle = getDirHandle(event.data.path);
      }catch(err){
        console.error(err)
      }
    }
    if (event.data.files){
      self.postMessage({path:event.data.path,files:(await globalOption.DirHandle?.files())})
    }
  }
  //if ( globalOption.DirHandle){
  const name = event.data.name || "./index.js"
  const fileName= encodeURIComponent(name)
  let db = event.data.db
  const handle = globalOption.DirHandle?.getFileHandle(fileName)  
  try{  
    if (!db){     
      db = await  handle?.read()  
      if (event.data.src){
        self.postMessage({db,name,fileName})
        return
      }
    }else{ 
      await handle?.write(db) 
    } 
    const cur =    handleCurrentMsg({db,name },postMessage ); // getCurrentObjFromFileSystem(fh,name)
   
    if (cur){ 
      if (event.data.basename){
        await runCode( cur,event.data.basename);
        return
      }
    }  
  }catch(err){
    //self.postMessage({err})
    console.error(err)
  } 
  if (globalOption.indexCurrent && event.data.basename){
    runCode(globalOption.indexCurrent,event.data.basename)
  } 
};
//console.log("run")
//self.postMessage({start:true})
// 导出空对象以适配 TypeScript 模块要求
export {};