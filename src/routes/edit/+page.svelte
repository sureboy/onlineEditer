<script lang="ts">
//import {onMount} from 'svelte'
//import FullscreenWakeLockManager from '$lib/utils/FullscreenWakeLockManager'; 
//import {getFileHandle,initPanel} from "$lib/components/panel.svelte"
import {type FileInfoType,getDirHandle,newPackageCode} from "$lib/function/fileHandle"
import Edit from "$lib/components/Edit.svelte";  
import {initDoc,diffUpdate} from '$lib/utils/yjs' 
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc" 
import {getImportAliases} from "$lib/function/parsingCode"
//import {getFileHandle,initEditorView,initPanel} from '$lib/components/panel.svelte'

 
 
//    import { preview } from "vite";
const FileInfo:FileInfoType =$state( {
    path:"",
    name:"./index.js" ,
    initEditorView:async function(){
        const handle =  initFileHandle(this) 
        try{
            this.value = await handle.read()
        }catch(err){
            //console.error(err)
            this.value = newPackageCode
        }
        
    }
} as FileInfoType  )

const saveFile =async (v:string,FileInfo:FileInfoType)=>{

    const handle = initFileHandle(FileInfo)  
    await handle.write(v) 
    const msg = {Modal:true,path:FileInfo.path,name:FileInfo.name}
    try{ 
        FileInfo.channel?.postMessage(msg);
        //sendCodeToPreview(msg) 
    }catch(err){
        console.log(err)
    }  

    const yhandle = initDoc(msg.name)
    if (yhandle){
        const {ydoc} = yhandle
 
        diffUpdate(v,ydoc)
    }
     
} 
const initWebrtcConn =async (reqdb:{id:string,host:string,path:string} )=>{
    const ok  = await createWebrtcConnFromCenterUrl(reqdb,(conn)=>{
        console.log(conn)
        conn.pc.ondatachannel = async (e)=>{
            const filename = e.channel.label.slice(0,e.channel.label.lastIndexOf("_"))
            const fh =  FileInfo.DirHandle?.getFileHandle(
                encodeURIComponent(filename) ); 
            initDoc(filename,e.channel,(db)=>{
                console.log("write",filename)
                fh?.write(db).then(()=>{
                    const msg = {Modal:true,path:FileInfo.path,name:filename}
                    FileInfo.channel?.postMessage(msg);
                    if (filename.includes("index")  ){
                        FileInfo.value =db
                        getImportAliases(db,FileInfo.name) 
                        //setTimeout(()=>initPanel(FileInfo))
                        //setValue(db);
                        //initEditorView(FileInfo)
                    }
                })
            })
        }            
    }) 
    if (ok){
        FileInfo.path = reqdb.path +"_"+reqdb.id 
        FileInfo.DirHandle = getDirHandle(FileInfo.path) 
    }
    return ok
    
}
const initFileHandle = (FileInfo:FileInfoType) =>{ 
    try{
        if (!FileInfo.DirHandle || FileInfo.create){ 
            FileInfo.DirHandle = getDirHandle(
                FileInfo.path,{create:FileInfo.create})
        }
        return FileInfo.DirHandle.getFileHandle(
            encodeURIComponent(FileInfo.name)
        )
    }catch(err){
        throw err
    }
}

const ready =async ( )=>{
    const hashPath = window.location.hash.slice(1);
    if (hashPath){
        const reqdb = JSON.parse(decodeURIComponent(hashPath)) 
        if (reqdb.id && reqdb.host && reqdb.path){
            if (!await initWebrtcConn(reqdb )){
                //await initPanel(FileInfo)
                return
            } 
        }else{
            Object.assign(
                FileInfo , 
                reqdb
            ) 
        } 
        const fh = initFileHandle(FileInfo) 
        try{
            const v = await fh.read() 
            //setValue(v)
            FileInfo.value =v
            //if (FileInfo.name){
            getImportAliases(v,FileInfo.name) 
            //} 
        }catch(err){
            FileInfo.value = newPackageCode
            console.error(err)
        }
    }else{
        FileInfo.value = newPackageCode
    }
    //setTimeout(()=>initPanel(FileInfo))
     
    if (FileInfo.path){ 
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
    } 
} 
</script> 
<Edit {ready} {saveFile}  {FileInfo}></Edit>   