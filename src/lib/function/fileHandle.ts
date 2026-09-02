import type {EntryInfo,ListDirectoryOptions,WriteStream} from "$lib/storage-adapter/types"
import {createStorage} from '$lib/storage-adapter/factory' 
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
    createWriteStream(): Promise<WriteStream>
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
    //cm_view?: EditorView
    //FileHandle?:  myFileHandleType,
    DirHandle?:DirHandleType,
    initEditorView:()=>any,
    value?:string,
} 
export const getDirHandle =(name:string,create?:ListDirectoryOptions)=>{
  const root = createStorage()
  //const files =await root.listFilesInDirectory(name,create)
  //const name = p
  const getFileHandle = (file:string ) => {
    const p = `${name}/${file}`
    /*
    if (!await root.fileExists(p) && create.create){
        root.writeFile
    }*/
    //console.log(p)
    return {
        createWriteStream:()=>{
            return root.createWriteStream(p)
        },
        write:async (db:string )=>{
            return await root.writeFile(p,db)
        },
        read:async ()=>{
            //try{
                return await root.readFile(p,'utf8') as string
            //}catch(err){
            //    throw err
                //console.log(err)
                //return newPackageCode
            //}
            
        },
        del:()=>{
            return root.deleteFile(p)
        }
    } as myFileHandleType
  }
  return {files:()=>root.listFilesInDirectory(name,create),name,getFileHandle} as DirHandleType
}