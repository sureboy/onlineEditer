<script lang="ts">  
import {getDirHandle,newPackageCode,initFileHandle} from "$lib/function/fileHandle"
import Edit,{type FileInfoType} from "$lib/components/Edit.svelte";  
//import {initDoc,diffUpdate} from '$lib/utils/yjs' 
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc" 
import {getImportAliases} from "$lib/function/parsingCode"  
const getFileHandle = (FileInfo:FileInfoType) =>{  
    if (!FileInfo.DirHandle || FileInfo.create){ 
        initFileHandle(FileInfo)
    }
    return FileInfo.DirHandle?.getFileHandle(
        encodeURIComponent(FileInfo.name)
    ) 
}

const FileInfo:FileInfoType =$state( {
    getFileBroadcastChannel:function(name?:string){ 
        if (!name)name = this.name
        console.log(name)
        let broadcastCh = this.fileBroadcastChannelMap.get(name)
        if (!broadcastCh){
            broadcastCh = new BroadcastChannel(name) 
            broadcastCh.onmessage=null
            this.fileBroadcastChannelMap.set(name,broadcastCh) 
        } 
        if (name===this.name){
            if (this.CurrentBroadcastChannel){
                if(this.CurrentBroadcastChannel.name !== name ){
                    this.CurrentBroadcastChannel.onmessage=null 
                }
            }
            this.CurrentBroadcastChannel = broadcastCh 
            if (!broadcastCh.onmessage){ 
                broadcastCh.onmessage = (  ev: MessageEvent<{db:string,update:any,origin:string}>)=>{ 
                    console.log(ev.data)
                    if (ev.data.origin && decodeURIComponent(ev.data.origin).includes(name)){ 
                        this.value = ev.data.db 
                    } 
                }
            }

        }
        return broadcastCh
    },
    fileBroadcastChannelMap:new Map(),
    path:"",
    name:"./index.js" ,
    value:"",
    //CurrentBroadcastChannel:undefined,
    initEditorView:async function(){ 
        this.getFileBroadcastChannel() 
        const handle =  getFileHandle(this) 
        try{
            this.value = await handle?.read()! || newPackageCode
            getImportAliases(this.value,this.name) 
            
        }catch(err){ 
            this.value = newPackageCode
        }  
    }
} as FileInfoType)

const saveFile =async (v:string,FileInfo:FileInfoType)=>{ 
    const handle = getFileHandle(FileInfo)  
    await handle?.write({db:v})  
} 
const initWebrtcConn =async (reqdb:{id:string,host:string,path:string} )=>{
    const ok  = await createWebrtcConnFromCenterUrl(reqdb,(conn)=>{
        console.log(conn)
        conn.pc.ondatachannel = async (e)=>{
            const filename = e.channel.label.slice(0,e.channel.label.lastIndexOf("_"))
            //console.log(filename)
            const broadcastCh = FileInfo.getFileBroadcastChannel(decodeURIComponent(filename))
            const fh =  FileInfo.DirHandle?.getFileHandle(filename) ; 
            const bhandle =  (  ev: MessageEvent<{update:any,origin:string}>)=>{
                if (ev.data.origin !== e.channel.label){
                    e.channel.send(ev.data.update)
                }
            }
            broadcastCh.addEventListener("message",bhandle)
            e.channel.onclose = ()=>{
                broadcastCh.removeEventListener("message",bhandle)
            }
            e.channel.onmessage=(ev)=>{
                const data = {db:ev.data,origin:e.channel.label}
                //console.log(data)
                fh?.write(data)
                //console.log("end",data)
                //if (filename.includes("index")  && typeof data.db ==="string"){
                //    FileInfo.value =data.db
                //    getImportAliases(data.db,FileInfo.name)  
                //}
            }
            /*
            initDoc(filename,e.channel,(db)=>{
                console.log("write",filename)
                fh?.write(db).then(()=>{
                    const msg = {Modal:true,path:FileInfo.path,name:filename}
                    FileInfo.channel?.postMessage(msg);
                    if (filename.includes("index")  ){
                        FileInfo.value =db
                        getImportAliases(db,FileInfo.name)  
                    }
                })
            })*/
        }            
    }) 
    if (ok){
        FileInfo.path = reqdb.path +"_"+reqdb.id 
        FileInfo.DirHandle = getDirHandle(FileInfo.path) 
    }
    return ok
    
}


const ready =async ()=>{
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
        await FileInfo.initEditorView()
         
    }else{
        FileInfo.value = newPackageCode
    }
    //setTimeout(()=>initPanel(FileInfo))
     
} 
</script> 
<Edit {ready} {saveFile}  {FileInfo}></Edit>   