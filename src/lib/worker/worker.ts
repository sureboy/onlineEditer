import {handleCurrentMsg} from '$lib/function/ImportParser'
import type {currentObj} from '$lib/function/ImportParser'
//import { javascript } from '@codemirror/lang-javascript';
import {getCsgObjArray} from '$lib/function/csgChange'
//import {getFileHandleFromOPFS} from "$lib/function/OPFS";
//import modeling from '@jscad/modeling'
const includeImport:{[key:string]:string} = {
  "@jscad/modeling": "./lib/modeling.esm.js",
  //"csgChange": "./lib/csgChange.js",
  "manifold-3d":"./lib/manifold/manifold.js"
}
//const {handleCurrentMsg} = await import('$lib/function/ImportParser')
const globalOption:{
  indexCurrent?:currentObj,
  root?:FileSystemDirectoryHandle,
  DirHandle?:FileSystemDirectoryHandle} = { 
  //root : await navigator.storage.getDirectory(),
}
//const encoder = new TextEncoder();
//let root = await navigator.storage.getDirectory()
const postMessage = async (e:any)=>{
 

  
  if (e.path){ 
    //let name = e.path as string 
    //if (name.endsWith(".js")){
    //    name = e.path // (e.path as string).split("/").pop() || e.path
    //}
  
    //console.log(name,e.path,globalOption.DirHandle)
     // setTimeout( async()=>{
    try{
     
      const f =await globalOption.DirHandle?.getFileHandle(
        encodeURIComponent(e.path),
        //name ,
        {create:false})
      //const {f,d} = await getFileHandleFromOPFS(e.path,{create:false,root:globalOption.root}) 
      
      const _f = await  f?.getFile() 
      const db = await _f?.text()
      //console.log(db)
      //setTimeout(()=>{
        //console.log("t",name,e.path)
        const cur = handleCurrentMsg({db ,name:e.path },postMessage) 
        console.log("time ",cur)
      //})
    }catch(err){ 
      console.error(err)
      //setTimeout(()=>{
        handleCurrentMsg({name:e.path})!.getUri = async ()=>new URL(
        includeImport[e.path] ||e.path  ,
        new URL(import.meta.url).origin).toString();     
      //})
    }
      // })
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
const getCurrentObjFromFileSystem = async (fh: FileSystemFileHandle,name:string)=>{
  const f = await fh.getFile()
  const db =  await f.text()
  return handleCurrentMsg({db,name },postMessage ); 
  
}
self.onmessage =async (event: MessageEvent) => { 
  console.log("get msg",event.data)
  if ( event.data.path){
    if (!globalOption.DirHandle || globalOption.DirHandle.name!==event.data.path ){
      try{
        if (!globalOption.root)globalOption.root=await navigator.storage.getDirectory();
        globalOption.DirHandle = await globalOption.root.getDirectoryHandle(event.data.path);
      }catch(err){
        console.error(err)
      }

    }
  }
  if ( globalOption.DirHandle){
    const name = event.data.name || "./index.js"
    try{ 
      const fh = await globalOption.DirHandle.getFileHandle(encodeURIComponent(name))
      const cur = await getCurrentObjFromFileSystem(fh,name)
      if (cur){
        await runCode( cur);
      }  
    }catch(err){
      console.error(err)
    }
  }
    
    /*
    const {f,d} =await getFileHandleFromOPFS(event.data.name,{create:true})
    const h = await f.createSyncAccessHandle()

    const writeBuffer = encoder.encode(event.data.db);
    h.write(writeBuffer,{at:0});
    h.truncate(writeBuffer.byteLength);
    h.flush()*/
 
  if (globalOption.indexCurrent && event.data.basename){
    runCode(globalOption.indexCurrent,event.data.basename)
  } 
};
//console.log("run")
//self.postMessage({start:true})
// 导出空对象以适配 TypeScript 模块要求
export {};