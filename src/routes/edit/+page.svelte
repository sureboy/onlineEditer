<script lang="ts">
import { updateEditorDoc} from "$lib/function/panel"
import {type FileInfoType,getDirHandle,newPackageCode} from "$lib/function/fileHandle"
import Edit from "$lib/components/Edit.svelte"; 
import { EditorView } from '@codemirror/view'; 
import {initDoc} from '$lib/utils/yjs'
import * as Y from 'yjs'
//import type {connType} from "$lib/utils/webRTCPool";
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc" 
const FileInfo:FileInfoType = {
    path:"",
    name:"./index.js" 
}  
const ConnMap = new Map<string,Y.Doc>()
//const ConnList:Map<string,{conn:connType,map:Map<string,RTCDataChannel>}> = new Map()
function sendCodeToPreview(msg:any) {
    try{
        const channel = new BroadcastChannel('code-preview');
        channel?.postMessage(msg);
    }catch(err){
        console.log(err)
    } 
    //console.log("send",msg)
    if (msg.name){
        //const k = encodeURIComponent(msg.name)
        FileInfo.DirHandle?.getFileHandle( encodeURIComponent(msg.name)).read().then(db=>{ 
            const conn = ConnMap.get(msg.name)
            conn?.getText("content").insert(0,msg.db)
            //conn?.send("close")
        })             
       
    } 
}

const initWebrtcConn =async (reqdb:{id:string,host:string,path:string},cm_view: EditorView)=>{
    FileInfo.path = reqdb.path 
    //const root = await navigator.storage.getDirectory();
    FileInfo.DirHandle = getDirHandle( reqdb.path ) //await root.getDirectoryHandle(reqdb.path+"_"+reqdb.id,{create:true})
    createWebrtcConnFromCenterUrl(reqdb,(conn)=>{
        const key = conn.dc?.label
        if (!key){
            return
        } 
        conn.pc.ondatachannel = async (e)=>{
            FileInfo.name = decodeURIComponent(e.channel.label)
            const fh =  FileInfo.DirHandle?.getFileHandle(
                e.channel.label ); 
            const w =await fh?.createWriteStream() 
            

            const ydoc = initDoc(e.channel)
            ConnMap.set(FileInfo.name,ydoc)
            e.channel.onmessage =async (ev)=>{
                //w?.write(ev.data)
                if ( ev.data ==="close"){
                    //w?.close()
                    //e.channel.close()
                    await w?.close()
                    const db = await fh?.read()||newPackageCode
                    //broadcastForwarding({name:e.channel.label,db,Exclude:[key]})
                    if (FileInfo.name ==="./index.js"){
                        //const f = await FileInfo.FileHandle?.getFile() 
                        updateEditorDoc(db ,cm_view)
                    }

                    return
                } 
                await w?.write(ev.data);
            }
 
        }
            
    })
}
</script>

<Edit {initWebrtcConn} {sendCodeToPreview}  {FileInfo}></Edit>  
  
  