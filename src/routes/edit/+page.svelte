<script lang="ts">
import {onMount} from 'svelte'
import FullscreenWakeLockManager from '$lib/utils/FullscreenWakeLockManager'; 
import {getFileHandle, initEditorView} from "$lib/components/panel.svelte"
import {type FileInfoType,getDirHandle} from "$lib/function/fileHandle"
import Edit,{setValue} from "$lib/components/Edit.svelte";  
import {initDoc,diffUpdate} from '$lib/utils/yjs' 
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc" 
//import {getFileHandle,initEditorView,initPanel} from '$lib/components/panel.svelte'

let manager: FullscreenWakeLockManager | undefined;
onMount(() => {
    manager = new FullscreenWakeLockManager();
    return ()=>{
        manager?.destroy();
    }
});

 
//    import { preview } from "vite";
const FileInfo:FileInfoType = {
    path:"",
    name:"./index.js" 
}  
//const ConnMap = new Map<string,{origin:string,ydoc:Y.Doc}>() 
function sendCodeToPreview(msg:any) { 
    if (!msg.name){
        return
    }
    const handle = initDoc(msg.name)
    if (handle){
        console.log("preview",msg)
        //const k = encodeURIComponent(msg.name)
        FileInfo.DirHandle?.getFileHandle( encodeURIComponent(msg.name)).read().then(db=>{ 
            const {ydoc} = handle
            //const handle = initDoc(msg.name)

            //const conn= ConnMap.get(msg.name)
            //if (!conn)return;
            //const {origin,ydoc}  = conn 
            diffUpdate(db,ydoc) 
        })    
    } 
}
const saveFile =async (v:string,FileInfo:FileInfoType)=>{

    const handle = getFileHandle(FileInfo)  
    await handle.write(v) 
    const msg = {Modal:true,path:FileInfo.path,name:FileInfo.name}
    try{ 
        FileInfo.channel?.postMessage(msg);
        sendCodeToPreview(msg) 
    }catch(err){
        console.log(err)
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
                    const msg = {Modal:true,path:FileInfo.path,name:FileInfo.name}
                    FileInfo.channel?.postMessage(msg);
                    if (filename.includes("index")  ){
                        setValue(db);
                        initEditorView(FileInfo)
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
</script>

<Edit {initWebrtcConn} {saveFile}  {FileInfo}></Edit>  
  
  