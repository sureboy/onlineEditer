import type {EntryInfo,ListDirectoryOptions,WriteStream} from "$lib/storage-adapter/types"
import {createStorage} from '$lib/storage-adapter/factory' 
import {initDoc,diffUpdate} from '$lib/utils/yjs' 
export const newPackageCode:string = `/*
import modeling from '@jscad/modeling';
import  manifold from 'manifold-3d';
const Manifold = await  manifold()
Manifold.setup()
export const manifold_main= (opt)=>{   
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
    write:(db:string )=>Promise<void>,
    read:()=>Promise<string>,
    del:()=>Promise<void>,
    //createWriteStream(): Promise<WriteStream>
    //list:()=>Promise<EntryInfo[]>
}
export type DirHandleType = {
    getFileHandle:(name:string)=>myFileHandleType,
    name:string,
    //root:StorageAdapter,
    files:()=>Promise<EntryInfo[]>
}
export type FileInfoType  = {
    create?:boolean,
    name:string,
    path:string,
    channel?:BroadcastChannel,
    channeldb?:BroadcastChannel,
    //cm_view?: EditorView
    //FileHandle?:  myFileHandleType,
    DirHandle?:DirHandleType,
    initEditorView:()=>any,
    value?:string,
} 
 
export const getDirHandle =(name:string,create?:ListDirectoryOptions)=>{
  const root = createStorage() 
  const getFileHandle = (file:string ) => {
    const p = `${name}/${file}` 
    
    return { 
        write: function (db:string ){
            const handle = initDoc(file)
            if (handle){
                diffUpdate(db,handle.ydoc)
            }
            return   root.writeFile(p,db)
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

export const initFileHandle = (FileInfo:FileInfoType) =>{ 
    if (!FileInfo.path)return; 
    const key =  Date.now().toString(32).slice(4);
    FileInfo.DirHandle = getDirHandle(
        FileInfo.path,{create:FileInfo.create})
    FileInfo.channel = new BroadcastChannel(FileInfo.path ); 
    FileInfo.channel.onmessage=(event:any)=>{
        //console.log(event.data,FileInfo)
        if (event.data.name && event.data.db ){
            const ydoc = initDoc(event.data.name)
            if (ydoc){
                diffUpdate(event.data.db,ydoc.ydoc)
            }
            if(event.data.name===FileInfo.name ){
                FileInfo.value = event.data.db
            }
        }
    }
    FileInfo.channeldb = new BroadcastChannel(FileInfo.path+"_db" ); 

    FileInfo.channeldb.onmessage=(event:any)=>{
        //console.log("get",event.data,FileInfo)
        //if (event)
        const oldHandle = FileInfo.DirHandle!.getFileHandle
        FileInfo.DirHandle!.getFileHandle =(name:string)=>{
            
            return {
                write: (db:string)=>{
                    //console.log("write chhanneldb")
                    return new Promise((resolve,reject)=>{
                        function w(e:MessageEvent<{type:string,key:string}>){
                            if (e.data.type ==="write" && e.data.key ===key){
                                resolve()
                                FileInfo.channeldb?.removeEventListener("message",w)
                            }                            
                        }
                        FileInfo.channeldb?.addEventListener("message",w)
                        FileInfo.channeldb?.postMessage({name,key,db,type:"write"}) 
                    })
                    //}catch(err){
                    //    return oldHandle(name).write(db)
                    //}                    
                },
                read:()=>{
                    return new Promise((resolve,reject)=>{
                        function h(e:MessageEvent<{type:string,key:string,db:string}>){
                            if (e.data.type ==="read" && e.data.key ===key){
                                resolve(e.data.db)
                                FileInfo.channeldb?.removeEventListener("message",h)
                            }                            
                        }
                        FileInfo.channeldb?.addEventListener("message",h)
                        FileInfo.channeldb?.postMessage({name,key,type:"read"}) 
                    })
                    //return ""
                },
                del:()=>{
                    return new Promise((resolve,reject)=>{
                        function h(e:MessageEvent<{type:string,key:string}>){
                            if (e.data.type ==="del"&& e.data.key ===key){
                                resolve()
                                FileInfo.channeldb?.removeEventListener("message",h)
                            }                            
                        }
                        FileInfo.channeldb?.addEventListener("message",h)
                        FileInfo.channeldb?.postMessage({name,key,type:"del"}) 
                    })
                }
            }
        }
    }
    FileInfo.channeldb.postMessage({key}) 
}