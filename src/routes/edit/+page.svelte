<script lang="ts">
import { initEditorView} from "$lib/components/panel.svelte"
import {type FileInfoType,getDirHandle} from "$lib/function/fileHandle"
import Edit,{setValue} from "$lib/components/Edit.svelte"; 
import { EditorView } from '@codemirror/view'; 
import {initDoc,diffUpdate} from '$lib/utils/yjs'
//import * as Y from 'yjs'
//import {onMount} from 'svelte'
//import type {connType} from "$lib/utils/webRTCPool";
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc" 
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

const initWebrtcConn =async (reqdb:{id:string,host:string,path:string},cm_view: EditorView)=>{
    FileInfo.path = reqdb.path +"_"+reqdb.id
    //const root = await navigator.storage.getDirectory();
    FileInfo.DirHandle = getDirHandle(FileInfo.path) //await root.getDirectoryHandle(reqdb.path+"_"+reqdb.id,{create:true})
    createWebrtcConnFromCenterUrl(reqdb,(conn)=>{
        const origin = conn.dc?.label
        if (!origin){
            return
        } 
        conn.pc.ondatachannel = async (e)=>{
            //const name = e.channel.label
            
            //const w =await fh?.createWriteStream() 
            const filename = e.channel.label.slice(0,e.channel.label.lastIndexOf("_"))
            const fh =  FileInfo.DirHandle?.getFileHandle(
                encodeURIComponent(filename) ); 
            initDoc(filename,e.channel,(db)=>{
                console.log("write",filename)
                fh?.write(db).then(()=>{
                    if (filename.includes("index")  ){
                        setValue(db);
                        initEditorView(FileInfo)
                         
                        //updateEditorDoc(db ,cm_view).then(()=>{
                        //    StopTimeOut()
                        //})
                    }
                })
            } )
            //ConnMap.set(filename,{origin, ydoc:ydoc!})
        }
            
    })
}
</script>

<Edit {initWebrtcConn} {sendCodeToPreview}  {FileInfo}></Edit>  
  
  