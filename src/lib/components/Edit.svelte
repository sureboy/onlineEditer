 
<script lang="ts">
import {type FileInfoType,
  //  getDirHandle,newPackageCode
     } from "$lib/function/fileHandle"
//import { updateEditorDoc} from "$lib/function/edit"
import CodeMirror from "$lib/components/CodeMirror.svelte";
import { javascript } from "@codemirror/lang-javascript"; 
import { EditorView } from '@codemirror/view'; 
import { helpPanel } from "$lib/function/helpPanel";  
import {jscadModelingCompletionSource,getImport,getImportAliases} from "$lib/function/parsingCode"
import { autocompletion } from '@codemirror/autocomplete';  
import {getFileHandle,initEditorView,initPanel} from '$lib/function/panel'
//    import type { RGBA_ASTC_10x10_Format } from "three";
const {initWebrtcConn,
    sendCodeToPreview,
    FileInfo}:{
        sendCodeToPreview:(msg:any)=>void,
        FileInfo:FileInfoType,
        initWebrtcConn:(db:any,cm_view: EditorView)=>void} = $props()


const saveFile = (v:string,FileInfo:FileInfoType)=>{
    getFileHandle(FileInfo).then(({write})=>{
        //h.createSyncAccessHandle()
        write(v).then(()=>{
            sendCodeToPreview( {Modal:true,path:FileInfo.path,name:FileInfo.name}) 
        })
    }).catch(err=>{
        console.error(err)
    })
} 

const ready =async (cm_view: EditorView)=>{
    const hashPath = window.location.hash.slice(1);
    if (hashPath){
        const reqdb = JSON.parse(decodeURIComponent(hashPath))
        if (reqdb.id && reqdb.host && reqdb.path){
            initWebrtcConn(reqdb,cm_view )
            //return
        }
        Object.assign(
            FileInfo , 
            reqdb
        ) 
        //FileInfo.cm_view = cm_view;
        await initEditorView(cm_view,FileInfo) 
    } 
    
} 
const saveKeymap = {
    // 键名使用小写，用连字符连接
    key: "Mod-s", // Mod 键在 Windows/Linux 下代表 Ctrl，macOS 下代表 Cmd
    run: (editorView:EditorView) => { 
        if (timeout===0)return true;
        clearTimeout(timeout) 
        saveFile(editorView.state.doc.toString(),FileInfo) 
        timeout=0
        return true;
    }
}

     
let timeout: number;
let firstChange = false;
</script>


<CodeMirror  
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
        ready(cm_view).then(()=>{
            initPanel(cm_view,FileInfo) 
        })   
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
        if (timeout!==0){
            clearTimeout(timeout) }
        timeout = window.setTimeout(() => {
            if (FileInfo.name)
            getImportAliases(v,FileInfo.name)
            //jscadKey= getJscadImportAliases(v)
            saveFile(v,FileInfo) 
            timeout=0
        },5000) 
    }} 
 />