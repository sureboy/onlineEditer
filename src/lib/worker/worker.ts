import {handleCurrentMsg,objUrlMap,type currentObj} from '$lib/function/ImportParser'
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
  indexCurrent?:currentObj, 
  DirHandle?:DirInfoType
} = {
}
//let  channel:BroadcastChannel|undefined = undefined// = new BroadcastChannel(solidControlConfig.title); 

const messageChannelListen = async (event:MessageEvent<{
    basename?:string,
    key?:string,type?:string,name?:string,data?:{db:string|ArrayBuffer,origin?:string}}>) => { 
    
    const  channel = globalOption.DirHandle?.channeldb
    if (!event.data.name || !event.data.type){
      channel?.postMessage(event.data)
      //return 
    } else{
      switch (event.data.type){ 
        case "read":
          const db = await globalOption.DirHandle?.DirHandle?.getFileHandle(event.data.name).read() 
          channel?.postMessage(Object.assign(event.data,{db}))
          break;
        case "write":
          await globalOption.DirHandle?.DirHandle?.getFileHandle(event.data.name).write(event.data.data!) 
          if (typeof event.data.data?.db ==="string"){
            //globalOption.indexCurrent = getIndex(handleCurrentMsg({db:event.data.data?.db,name:event.data.name } )!)
            const cur = handleCurrentMsg({
              db:event.data.data?.db,
              name:decodeURIComponent(event.data.name) 
            })
            if (cur)
              runCode(cur,event.data.basename)
          }
          //else
          channel?.postMessage({type:event.data.type,key:event.data.key}) 
          break;
        case "del":
          await globalOption.DirHandle?.DirHandle?.getFileHandle(event.data.name).del()
          channel?.postMessage(event.data)
          break;
        default:
          //channel?.postMessage(event.data)
          break 
      } 
    } 
    /*
    if (globalOption.indexCurrent 
      //&& event.data.basename
    ){
      // console.log("worker show",globalOption.indexCurrent)
      runCode(globalOption.indexCurrent,event.data.basename)
      //return
    } */
  }; 

  /*
const initBroadcastChannel = (name:string)=>{
  if (channel)return
  channel = new BroadcastChannel(name+"_db"); 
  channel.postMessage({type:"init"})
  channel.onmessage =(e)=>{
    if (e.data.type ==="init"){

    }
    console.log("worker broadcase",e.data) 
    messageChannelListen(e)
  }
}*/



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
  try{
    globalOption.indexCurrent = getIndex(cur)
    const u = await globalOption.indexCurrent.getUri() 
    const src = await  import(/* @vite-ignore */u) 
    const list = Object.keys(src)
    if (!list.length){
      return
    }
    const module = {list,basename:basename||list[0]} 
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

    self.postMessage({err:parseError(err as Error,objUrlMap)})
    throw err 
  } 
}  

self.onmessage =async (event: MessageEvent) => { 
  if ( event.data.path){ 
    if (!globalOption.DirHandle || globalOption.DirHandle.path!==event.data.path ){  
      globalOption.DirHandle = createDirInfo(event.data.path,messageChannelListen); 

      const channel = globalOption.DirHandle.channeldb
      if (channel){
        channel.addEventListener("message",(e:MessageEvent<{type:string}>)=>{
          switch(e.data.type){
            case "init":
              channel.postMessage({type:"close"});
              return;
            case "close":
              channel.onmessage =  (e)=>{
                if (e.data.type==="write" && event.data.name){
                  setTimeout(()=>{
                    const name =decodeURIComponent(event.data.name)
                    globalOption.DirHandle?.DirHandle?.getFileHandle(
                      encodeURIComponent(event.data.name)
                    ).read().then(db=>{
                      const cur = handleCurrentMsg({db,name } )
                      if (cur){
                        runCode(cur,event.data.basename)
                      }
                    })
                  },100)
                }
              }
          }
          if (e.data.type==="init"){
            channel.postMessage({type:"close"})
          }
        })
      }

      
    }
    //if (event.data.files){
    //  self.postMessage({path:event.data.path,files:(await globalOption.DirHandle?.files())})
    //}
    const name = event.data.name||"./index.js"
    const db = event.data.db || await globalOption.DirHandle.DirHandle?.getFileHandle(encodeURIComponent(name)).read()
    const cur =    handleCurrentMsg({ db,name },postMessage ); // getCurrentObjFromFileSystem(fh,name)
    if (cur  ){ 
      //globalOption.indexCurrent = getIndex(cur)
      await runCode( cur,event.data.basename);
    }
  }


  //messageChannelListen(event)
  //return
   
};
//console.log("run")
//self.postMessage({start:true})
// 导出空对象以适配 TypeScript 模块要求
export {};