import type {EntryInfo,ListDirectoryOptions,WriteStream} from "$lib/storage-adapter/types"
import {createStorage} from '$lib/storage-adapter/factory' 
import {initDoc,diffUpdate,updateDoc,initDocEasy} from '$lib/utils/yjs' 
export const newPackageCode:string = `/*
import modeling from '@jscad/modeling';
import  manifold from 'manifold-3d';

export const manifold_main= async (opt)=>{   
  const Manifold = await  manifold()
  Manifold.setup()
  const option = Object.assign({size:2},opt);   
  const box = Manifold.Manifold.cube(option.size,true);    
  const sphere = Manifold.Manifold.sphere(1.2, 48);     
  const sphereTranslated = sphere.translate([0.8, 0.8, 0.8]); 
  const result = box.subtract(sphereTranslated);
  const meshData = result.getMesh();
  const vertices= meshData.vertProperties;
  const indices = meshData.triVerts;   
  box.delete();
  sphere.delete();
  sphereTranslated.delete();
  result.delete();
  return [{vertices,indices},option]
}
export const main=(opt)=>{
  const option = Object.assign({size:10},opt)
  return [modeling.primitives.cube(option),option]
}
*/`
type myFileHandleType = {
    write:(data:{db:string|ArrayBuffer,origin?:string} )=>Promise<void>,
    writeAndBroad?:(data:{db:string|ArrayBuffer,origin?:string} )=>Promise<void>,
    read:()=>Promise<string>,
    del:()=>Promise<void>,
    createWriteStream(): Promise<WriteStream>
    //list:()=>Promise<string[]>
}
export type DirHandleType = {
    getFileHandle:(name:string)=>myFileHandleType,
    name:string,
    //root:StorageAdapter,
    files:()=>Promise<EntryInfo[]>
}
export type DirInfoType = {
    create?:boolean,
    path:string,
    channeldb?:BroadcastChannel,
    DirHandle?:DirHandleType,
    key?:string
    workerHandle?:(data:any)=>any
    //islocal?:boolean
    Preview?:(data:any)=>any
}

export const getDirHandle =(name:string,create?:ListDirectoryOptions)=>{
  const root = createStorage() 
  const getFileHandle = (file:string ) => {
    const p = `${name}/${file}`  
    return { 
        createWriteStream:()=>{
            return root.createWriteStream(p)
        },
         
        write:async function (data:{db:string|ArrayBuffer,origin?:string} ){
            const handle = initDocEasy(file)
            if (typeof data.db ==="string"){ 
                if (handle){ 
                    diffUpdate(data.db,handle.ydoc,data.origin)
                }
                await  root.writeFile(p,data.db)
            }else{ 
                if (handle){
                    updateDoc(data.db,handle.ydoc,data.origin||"")
                    data.db = handle.ydoc.getText("content").toString()
                    await root.writeFile(p,data.db)
                }
            }
            
        },
        read:async function (){ 
            return await root.readFile(p,'utf8') as string 
        },
        del:function(){
            return root.deleteFile(p)
        }
    } as myFileHandleType
  }
  return {files:()=>root.listFilesInDirectory(name,create),name,getFileHandle} as DirHandleType
}
 
export const createDirInfo = (path:string )=>{
    const f:DirInfoType = {path}
    initFileHandle(f)
    return f
}
const messageChannelListenClient = (FileInfo:DirInfoType )=>{
    const oldHandle = FileInfo.DirHandle!.getFileHandle
    FileInfo.DirHandle!.getFileHandle =function(name:string){ 
        return Object.assign({},oldHandle.call(this,name), {
            write: (data:{db:string|ArrayBuffer,origin?:string})=>{ 
                return new Promise<void>((resolve,reject)=>{ 
                    function w(e:MessageEvent<{type:string,key:string}>){
                        if (e.data.type ==="writeRes" && e.data.key ===FileInfo.key){
                            clearTimeout(timeOut)
                            resolve()
                            FileInfo.channeldb?.removeEventListener("message",w)
                        }                            
                    }
                    const timeOut = setTimeout(()=>{ 
                        FileInfo.DirHandle?.getFileHandle(name).write(data)
                        FileInfo.DirHandle = undefined; 
                        initFileHandle(FileInfo) 
                    },500)
                    FileInfo.channeldb?.addEventListener("message",w)
                    FileInfo.channeldb?.postMessage({name,key:FileInfo.key,data,type:"write"}) 
                })
            },         
        });
    }
}
export const initFileHandle = (FileInfo:DirInfoType) =>{ 
    
    if (!FileInfo.path)return; 
    if (FileInfo.DirHandle && FileInfo.DirHandle.name === FileInfo.path){
        return
    }
    FileInfo.key =  Date.now().toString(32).slice(4);
    FileInfo.DirHandle = getDirHandle(
        FileInfo.path,{create:FileInfo.create},) 
    if (FileInfo.channeldb)FileInfo.channeldb.close();
    FileInfo.channeldb = new BroadcastChannel(FileInfo.path+"_db" ); 
    let workerSet:string[] = [] 
    const workerTmp:any[] = []
 
    FileInfo.workerHandle = (data:{
        list?:string[],
        run:string,
        type:string,
        key:string})=>{
        switch (data.type){
            case "worker":  
                if (workerTmp.length>0 && data.list){
                    workerTmp.forEach(v=>{ 
                        FileInfo.channeldb?.postMessage(v)  
                    })
                    return
                } 
                if (workerSet.length===0 ){ 
                    if (data.list){
                        workerSet =  data.list
                    }else{
                        return
                    }
                }
                const run = workerSet.shift() 
                if (run){
                    workerTmp.push({type:"workerData",run,msg:{ start: true }})
                    FileInfo.channeldb?.postMessage({
                        key:data.key,run ,type:"workerRun"}) 
                    
 
                }
                return
            case "workerData":
                workerTmp.push(data) 
        }
        
    }
    FileInfo.channeldb.addEventListener("message",(ev)=>{ 
        FileInfo.workerHandle?.(ev.data) 
    })
    const oldHandle = FileInfo.DirHandle!.getFileHandle
    FileInfo.DirHandle!.getFileHandle=function(name:string){ 
        const old = oldHandle.call(this,name)
        return Object.assign({}, old, {
            writeAndBroad: async (data:{db:string|ArrayBuffer,origin?:string})=>{ 
                await old.write(data);
                workerTmp.length = 0
                FileInfo.channeldb?.postMessage({
                    type:"writeRes",
                    key:FileInfo.key,
                    name 
                })  
            }
        })
    } 

    const initHandle =async (ev:MessageEvent<{type:string,list:string[],data:any,name:string,key:string}>)=>{  
        switch (ev.data.type){
            case "write":
                if(ev.data.data && ev.data.name){ 
                    await FileInfo.DirHandle?.getFileHandle(ev.data.name).write?.(ev.data.data)  
                    workerTmp.length = 0
                    FileInfo.channeldb?.postMessage({
                        type:"writeRes",
                        key:ev.data.key,
                        name:ev.data.name
                    })  
                }
                return; 
            case "init":
                if (ev.data.key === FileInfo.key){ 
                    messageChannelListenClient(FileInfo) 
                    FileInfo.workerHandle  = undefined;
                    FileInfo.channeldb?.removeEventListener("message",initHandle)
                }else{
                    FileInfo.channeldb?.postMessage(ev.data)
                } 
                return
           

        }    
        
    }
    FileInfo.channeldb.addEventListener("message",initHandle)
    
    FileInfo.channeldb.postMessage({type:"init",key:FileInfo.key}) 
}