<script lang="ts">
import {type FileInfoType,getDirHandle,updateEditorDoc,newPackageCode} from "$lib/function/edit"

import Edit from "$lib/components/Edit.svelte"; 
import { EditorView } from '@codemirror/view'; 
import type {connType} from "$lib/utils/webRTCPool";
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc" 
const FileInfo:FileInfoType = {
    path:"",
    name:"./index.js" 
}  
//const ConnMap = new Map<string,RTCDataChannel>()
const ConnList:Map<string,{conn:connType,map:Map<string,RTCDataChannel>}> = new Map()
function sendCodeToPreview(msg:any) {
    try{
        const channel = new BroadcastChannel('code-preview');
        channel?.postMessage(msg);
    }catch(err){
        console.log(err)
    } 
    console.log("send",msg)
    if (msg.name){
        //const k = encodeURIComponent(msg.name)
        FileInfo.DirHandle?.getFileHandle(
            encodeURIComponent(msg.name)).then(({read})=>{
            read().then(db=>{
                ConnList.forEach(v=>{
                    const s = v.map.get(msg.name)
                    s?.send(db)
                    s?.send("close")
                })
                //const conn = ConnMap.get(msg.name)
                //conn?.send(db)
                //conn?.send("close")
            })             
        })
    } 
}
const broadcastForwarding = (msg:{name:string,db:string,Exclude:string[]})=>{
    ConnList.forEach((v,k)=>{
        if (msg.Exclude.includes(k)){
            return
        }
        const s = v.map.get(msg.name)
        s?.send(msg.db)
        s?.send("close")
    })
}
const initWebrtcConn =async (reqdb:{id:string,host:string,path:string},cm_view: EditorView)=>{
    FileInfo.path = reqdb.path 
    //const root = await navigator.storage.getDirectory();
    FileInfo.DirHandle = await getDirHandle( reqdb.path ) //await root.getDirectoryHandle(reqdb.path+"_"+reqdb.id,{create:true})
    createWebrtcConnFromCenterUrl(reqdb,(conn)=>{
        const key = conn.dc?.label
        if (!key){
            return
        }
        let cm = ConnList.get(key)
        if (!cm){
            cm = {conn,map:new Map()}
            ConnList.set(key,cm)
        }else{
            cm.conn = conn
        }
        conn.pc.ondatachannel = async (e)=>{
            FileInfo.name = decodeURIComponent(e.channel.label)
            const fh = await FileInfo.DirHandle?.getFileHandle(
                e.channel.label ); 
            const w =await fh?.createWriteStream() 
            cm.map.set(FileInfo.name,e.channel)
            e.channel.onmessage =async (ev)=>{
                //w?.write(ev.data)
                if ( ev.data ==="close"){
                    //w?.close()
                    //e.channel.close()
                    await w?.close()
                    const db = await fh?.read()||newPackageCode
                    broadcastForwarding({name:e.channel.label,db,Exclude:[key]})
                    if (FileInfo.name ==="./index.js"){
                        //const f = await FileInfo.FileHandle?.getFile() 
                        updateEditorDoc(db ,cm_view)
                    }

                    return
                } 
                await w?.write(ev.data);
            }
            /*
            e.channel.onclose =async ()=>{
                console.log(e.channel.label,"close")
                
                await w?.close()
                //e.channel.close()
                const f = await FileInfo.FileHandle?.getFile()
        
                updateEditorDoc(cm_view,await f?.text() ||newPackageCode)
            } */
        }
            
    })
}
 
 
</script>

<Edit {initWebrtcConn} {sendCodeToPreview}  {FileInfo}></Edit>  
  
  