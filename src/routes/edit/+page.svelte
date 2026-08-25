<script lang="ts">
import { updateEditorDoc} from "$lib/function/panel"
import {type FileInfoType,getDirHandle} from "$lib/function/fileHandle"
import Edit from "$lib/components/Edit.svelte"; 
import { EditorView } from '@codemirror/view'; 
import {initDoc,diffUpdate} from '$lib/utils/yjs'
import * as Y from 'yjs'

//import type {connType} from "$lib/utils/webRTCPool";
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc" 
const FileInfo:FileInfoType = {
    path:"",
    name:"./index.js" 
}  
const ConnMap = new Map<string,{origin:string,ydoc:Y.Doc}>()
//const ConnList:Map<string,{conn:connType,map:Map<string,RTCDataChannel>}> = new Map()
const channel = new BroadcastChannel('code-preview');
channel.onmessage=(event)=>{
    console.log(event.data)
}
function sendCodeToPreview(msg:any) {
    try{ 
        channel?.postMessage(msg);
    }catch(err){
        console.log(err)
    } 
    //console.log("send",msg)
    if (msg.name){
        //const k = encodeURIComponent(msg.name)
        FileInfo.DirHandle?.getFileHandle( encodeURIComponent(msg.name)).read().then(db=>{ 
            const conn= ConnMap.get(msg.name)
            if (!conn)return;
            const {origin,ydoc}  = conn
            //Y.applyUpdate(ydoc, db,'local');  
            //const ytext = ydoc?.getText("content")
            //ytext?.delete(0, ytext.length);
            //ytext?.insert(0,db)
            diffUpdate(db,ydoc,origin)
        
            //conn?.send("close")
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
            const fh =  FileInfo.DirHandle?.getFileHandle(
                encodeURIComponent(e.channel.label) ); 
            //const w =await fh?.createWriteStream() 
            const filename = e.channel.label.slice(0,e.channel.label.lastIndexOf("_"))

            const ydoc = initDoc(filename,e.channel,(db)=>{
                fh?.write(db).then(()=>{
                    if (e.channel.label.includes("index")  ){
                        updateEditorDoc(db ,cm_view) 
                    }
                })
                
            } )
            ConnMap.set(filename,{origin, ydoc:ydoc!})
            /*
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
            }*/
 
        }
            
    })
}
</script>

<Edit {initWebrtcConn} {sendCodeToPreview}  {FileInfo}></Edit>  
  
  