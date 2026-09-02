<script lang="ts" > 
import FullscreenWakeLockManager from '$lib/utils/FullscreenWakeLockManager';
import CodeMirror from "$lib/components/CodeMirror.svelte";
import { javascript } from "@codemirror/lang-javascript"; 
import { EditorView } from '@codemirror/view'; 
import { helpPanel } from "$lib/function/helpPanel";  
import {jscadModelingCompletionSource,getImportAliases,wordHover} from "$lib/function/parsingCode"
import { autocompletion } from '@codemirror/autocomplete';    
import {type FileInfoType} from "$lib/function/fileHandle"
import { appendChildToDom,createButton,createPackage,createSelect } from "$lib/function/helpPanel";  
let manager: FullscreenWakeLockManager | undefined; 
const {ready,
    saveFile,
    FileInfo
}:{
        saveFile:(v:string,FileInfo:FileInfoType)=>void,
        FileInfo:FileInfoType,
        ready:()=>any} = $props() 
let timeout: number;
const initPanel =async (  )=>{
    if (!FileInfo.DirHandle){
        createPackage(FileInfo) 
        return;
    } 
    const run  = document.createElement('a')
    run.textContent="Preview"
    run.href = "/preview#"+encodeURIComponent(JSON.stringify({path:FileInfo.path}))
    run.style.marginRight = '6px';
    run.target="previewPopup" 
    run.style.float = "right" 
    appendChildToDom(createButton("Delete","X",(e)=>{
        //const fileName = FileInfo.name
        if (!FileInfo.name)return
        if (window.confirm(`Delete ${FileInfo.name} ?`)){
            const handle = FileInfo.DirHandle?.getFileHandle(encodeURIComponent(FileInfo.name)) 
            handle?.del().then(()=>{
                console.log("del",FileInfo)
                FileInfo.name = "./index.js"
                FileInfo.initEditorView()
            })
        } 
    }),...createSelect(FileInfo),createButton("screen","[]",(e)=>{
        const btn = (e!.target as HTMLButtonElement)
        if (btn.textContent==="[]"){
            manager?.enterFullscreen();
            btn.textContent="]["
        }else{
            btn.textContent="[]";
            manager?.exitFullscreen();
        } 
    }),run)        
} 

const StopTimeOut = ()=>{
    if (timeout===0)return;
    clearTimeout(timeout) 
    timeout=0
}
//$derived()
$effect(()=>{
    //console.log(value)
    if (FileInfo.value)
    initPanel() 
})
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
</script>


<CodeMirror  
lineWrapping={true}
    value={FileInfo.value}
    extensions={[
        wordHover,
        helpPanel(),autocompletion({
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