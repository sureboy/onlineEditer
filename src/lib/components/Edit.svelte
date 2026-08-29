<script lang="ts" module> 
import {type FileInfoType, 
     newPackageCode} from "$lib/function/fileHandle"
let value = $state(newPackageCode) 
export const setValue = (v:string)=>{
    value = v
}
let manager: FullscreenWakeLockManager | undefined;
export const getFullscreenManager = ()=> manager;
</script>
<script lang="ts">
 
import FullscreenWakeLockManager from '$lib/utils/FullscreenWakeLockManager';
import CodeMirror from "$lib/components/CodeMirror.svelte";
import { javascript } from "@codemirror/lang-javascript"; 
import { EditorView } from '@codemirror/view'; 
import { helpPanel } from "$lib/function/helpPanel";  
import {jscadModelingCompletionSource,getImportAliases} from "$lib/function/parsingCode"
import { autocompletion } from '@codemirror/autocomplete';  
import {initEditorView,initPanel} from '$lib/components/panel.svelte'
//import {initDoc,diffUpdate} from '$lib/utils/yjs'
//    import type { RGBA_ASTC_10x10_Format } from "three";

const {initWebrtcConn,
    saveFile,
    FileInfo}:{
        saveFile:(v:string,FileInfo:FileInfoType)=>void,
        FileInfo:FileInfoType,
        initWebrtcConn:(db:any )=>Promise<boolean>} = $props()

//let channel:BroadcastChannel|undefined=undefined
let timeout: number;
const StopTimeOut = ()=>{
    if (timeout===0)return;
    clearTimeout(timeout) 
    timeout=0
}
  
const ready =async ( )=>{
    const hashPath = window.location.hash.slice(1);
    if (hashPath){
        const reqdb = JSON.parse(decodeURIComponent(hashPath)) 
        if (reqdb.id && reqdb.host && reqdb.path){
            if (!await initWebrtcConn(reqdb )){
                await initPanel(FileInfo)
                return
            } 
        }else{
            Object.assign(
                FileInfo , 
                reqdb
            ) 
        } 
        await initEditorView(
            //cm_view,
            FileInfo) 
        

    } else{
        await initPanel(FileInfo)
    }
    if (FileInfo.path){ 
        FileInfo.channel = new BroadcastChannel(FileInfo.path ); 
        FileInfo.channel.onmessage=(event:any)=>{
            //console.log(event.data)
            if (event.data.name && event.data.name===FileInfo.name){
                FileInfo.DirHandle?.getFileHandle(encodeURIComponent(FileInfo.name)).read().then(db=>{
                    setValue(db)
                })
            }
        }
    }
    
} 
const saveKeymap = {
    // 键名使用小写，用连字符连接
    key: "Mod-s", // Mod 键在 Windows/Linux 下代表 Ctrl，macOS 下代表 Cmd
    run: (editorView:EditorView) => { 
        if (timeout===0)return true;
        StopTimeOut() 
        saveFile(editorView.state.doc.toString(),FileInfo) 
        timeout=0
        return true;
    }
}

     

let firstChange = false;
</script>


<CodeMirror  
lineWrapping={true}
    {value}
    extensions={[helpPanel(),autocompletion({
            override:[ 
                jscadModelingCompletionSource
        ]
        }), ]}
    keybindings= {[saveKeymap]}
    lang={javascript()}
    styles={{
    "& .cm-editor": { padding: "0",border: "none" },  
    }} 
    
    onready = {(cm_view)=>{   
        manager = new FullscreenWakeLockManager();
        ready()
        //.then(()=>{
        //    initPanel(FileInfo) 
        //})   
    }}
    bounce={0} 
    onchange = {(v)=>{ 
        if (!FileInfo.name){
            return
        } 
        if (!firstChange){
            firstChange=true 
            getImportAliases(v,FileInfo.name)
            //console.log(aliases)
            //jscadKey = getJscadImportAliases(v)
            //fetch("/api").then(r=>{
            //    r.json().then(v=>{
            //        jscadCompletionsOption = v['modeling'] as any[]
            //    })
            //})
            return
        }
        //console.log("change")
        //if (timeout!==0){
            StopTimeOut() ;
        timeout = window.setTimeout(() => {
            if (FileInfo.name)
            getImportAliases(v,FileInfo.name)
            //jscadKey= getJscadImportAliases(v)
            saveFile(v,FileInfo) 
            timeout=0
        },5000) 
    }} 
 />