<script lang="ts">  
import {newPackageCode,initFileHandle} from "$lib/function/fileHandle"
import Edit,{type FileInfoType} from "$lib/components/Edit.svelte";  
//import {initDoc,diffUpdate} from '$lib/utils/yjs' 
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc" 
import {getImportAliases} from "$lib/function/parsingCode"  
import {encodeMessage,sendChunked,channelMessage} from '$lib/function/rtcDataToBroadData'
    import { onDestroy, onMount, untrack } from "svelte";
    import { getWorker,terminateWorker } from '$lib/worker/globalWorker';
const getFileHandle = (FileInfo:FileInfoType) =>{  
    if (!FileInfo.DirHandle || FileInfo.create){ 
        initFileHandle(FileInfo)
    }
    return FileInfo.DirHandle?.getFileHandle(
        encodeURIComponent(FileInfo.name)
    ) 
}
const Originkey =  Date.now().toString(32).slice(4);
let value = $state(newPackageCode)
const FileInfo:FileInfoType =$state( {
    setView(cmView) {
        this.cmView = cmView
    },
    getFileBroadcastChannel:function(_name?:string){ 
        let name = _name;
        if (!name)name =encodeURIComponent( this.name)
        console.log(name)
        let broadcastCh = this.fileBroadcastChannelMap.get(name)
        if (!broadcastCh){
            broadcastCh = new BroadcastChannel(name) 
            broadcastCh.onmessage=null
            this.fileBroadcastChannelMap.set(name,broadcastCh) 
        } 
        if (!_name ){
            if (this.CurrentBroadcastChannel){
                if(this.CurrentBroadcastChannel.name !== name ){
                    this.CurrentBroadcastChannel.onmessage=null 
                }
            }
            this.CurrentBroadcastChannel = broadcastCh 
            if (!broadcastCh.onmessage){ 
                broadcastCh.onmessage = (  ev: MessageEvent<{db:string,update:any,origin:string}>)=>{ 
                    //console.log(ev.data)
                    if (ev.data.origin && ev.data.origin!==Originkey){ 
                        console.log("update edit",ev.data.origin)
                        value = ev.data.db 
                    } 
                }
            }
        }
        return broadcastCh
    },
    fileBroadcastChannelMap:new Map(),
    path:"",
    name:"./index.js" ,
   // value:"",
    //CurrentBroadcastChannel:undefined,
    initEditorView:async function(){ 
        this.getFileBroadcastChannel() 
        //const handle =  getFileHandle(this) 
        try{
            value = await getFileHandle(this)?.read()! || newPackageCode
            getImportAliases(value,this.name) 
            
        }catch(err){ 
            value = newPackageCode
        }  
    }
} as FileInfoType)

const saveFile =async (v:string,FileInfo:FileInfoType)=>{ 
    const handle = getFileHandle(FileInfo)  
    //console.log("save edit")
    if (!handle)return
    //const data = {db:v,origin:Originkey}
    //console.log(await navigator.storage.estimate())
    const w = handle.writeAndBroad ||handle.write
    await w({db:v,origin:Originkey})  
} 
const initWebrtcConn =async (reqdb:{id:string,host:string,path:string} )=>{
    const ok  = await createWebrtcConnFromCenterUrl(reqdb,(conn)=>{
        console.log(conn)
        conn.pc.ondatachannel = (e)=>{
            if (e.channel.label ==="worker"){ 
                e.channel.onmessage = (ev:MessageEvent)=>{
                    channelMessage(ev,(obj)=>{
                        //console.log("rtc get",obj)
                        FileInfo.channeldb?.postMessage(obj)
                    }) 
                }
                const oldHandle = FileInfo.workerHandle
                FileInfo.workerHandle=async(data:{type:string})=>{ 
                    if (data.type.startsWith("worker")){
                        //console.log("send rtc",data)
                        await sendChunked(e.channel,encodeMessage(data))
                    }
                }
                e.channel.onerror = (ev)=>{
                    console.error(ev)
                    FileInfo.workerHandle = oldHandle
                }
                e.channel.onclose=()=>{
                    FileInfo.workerHandle = oldHandle
                }
                return
            }
            const filename = e.channel.label.slice(0,e.channel.label.lastIndexOf("_")) 
            const broadcastCh = FileInfo.getFileBroadcastChannel(filename) 
            const bhandle =  (  ev: MessageEvent<{update:any,origin:string}>)=>{
                if (ev.data.origin !== e.channel.label){
                    e.channel.send(ev.data.update)
                }
            }
            broadcastCh.addEventListener("message",bhandle)
            e.channel.onclose = ()=>{
                broadcastCh.removeEventListener("message",bhandle)
            }
            e.channel.onmessage= (ev)=>{
                const data = {db:ev.data,origin:e.channel.label} 
                const handle = FileInfo.DirHandle?.getFileHandle(filename)
                if (handle){
                    (handle.writeAndBroad ||handle.write)(data) 
                } 
            } 
        }            
    }) 
    if (ok){
        FileInfo.path = reqdb.path +"_"+reqdb.id 
        initFileHandle(FileInfo) 
    }
    return ok
    
}


const ready =async ()=>{
    const hashPath = window.location.hash.slice(1);
    if (hashPath){


        const reqdb = JSON.parse(decodeURIComponent(hashPath)) 
        if (reqdb.id && reqdb.host && reqdb.path){
            if (!await initWebrtcConn(reqdb )){ 
                return
            } 
        }else{
            Object.assign(
                FileInfo , 
                reqdb
            ) 
        } 
        await FileInfo.initEditorView()
        const w = await getWorker()
        w.postMessage({path:FileInfo.path})
         
    }else{
        value = newPackageCode
    }
    //setTimeout(()=>initPanel(FileInfo))
     
} 
onDestroy(()=>{
    terminateWorker()
})
</script> 
<Edit {ready} {saveFile} {value} {FileInfo}></Edit>   