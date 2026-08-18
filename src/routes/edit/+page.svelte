<script lang="ts">
import Edit,{newPackageCode,updateEditorDoc,type FileInfoType} from "$lib/components/Edit.svelte"; 
import { EditorView } from '@codemirror/view'; 

import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc" 
const FileInfo:FileInfoType = {
    path:"",
    name:"./index.js" 
} 
const channel = new BroadcastChannel('code-preview');
const ConnMap = new Map<string,RTCDataChannel>()
function sendCodeToPreview(msg:any) {
    channel.postMessage(msg);
    console.log("send",msg)
    if (msg.name){
        //const k = encodeURIComponent(msg.name)
        FileInfo.DirHandle?.getFileHandle(encodeURIComponent(msg.name)).then(h=>{
            h.getFile().then((f)=>{
                f.arrayBuffer().then(db=>{
                    const conn = ConnMap.get(msg.name)
                    conn?.send(db)
                    conn?.send("close")
                })
            })
        })
    } 
}
const initWebrtcConn =async (reqdb:{id:string,host:string,path:string},cm_view: EditorView)=>{
    FileInfo.path = reqdb.path 
    const root = await navigator.storage.getDirectory();
    FileInfo.DirHandle =await root.getDirectoryHandle(reqdb.path+"_"+reqdb.id,{create:true})
    createWebrtcConnFromCenterUrl(reqdb,(conn)=>{
        conn.pc.ondatachannel = async (e)=>{
            FileInfo.FileHandle =await FileInfo.DirHandle?.getFileHandle(
                e.channel.label,{create:true});
                FileInfo.name = decodeURIComponent(e.channel.label)
            const w = (await FileInfo.FileHandle?.createWritable())?.getWriter()
            //w?.getWriter()
            ConnMap.set(FileInfo.name,e.channel)
            e.channel.onmessage =async (ev)=>{
                //w?.write(ev.data)
                if ( ev.data ==="close"){
                    //w?.close()
                    //e.channel.close()
                    await w?.close()

                    if (FileInfo.name ==="./index.js"){
                        const f = await FileInfo.FileHandle?.getFile() 
                        updateEditorDoc(cm_view,await f?.text() ||newPackageCode)
                    }
                    return
                }
                if (!w){
                    return
                }
                if (w && w.desiredSize && w.desiredSize <= 0) {
                    await w.ready; 
                }
                await w.write(ev.data);
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
  
  