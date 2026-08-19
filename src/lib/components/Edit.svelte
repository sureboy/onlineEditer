<script lang="ts" module >
import type {EntryInfo,ListDirectoryOptions,WriteStream} from "$lib/storage-adapter/types"
import {createStorage} from '$lib/storage-adapter/factory'  
import {StorageAdapter} from '$lib/storage-adapter/adapter'
export const newPackageCode:string = `/*
import modeling from '@jscad/modeling';
import  manifold from 'manifold-3d';
const Manifold = await  manifold()
Manifold.setup()
export const manifold_main= (opt)=>{   
  const option = Object.assign({size:2},opt);   
  const box = Manifold.Manifold.cube(option.size,true);    
  const sphere = Manifold.Manifold.sphere(1.2, 48);     
  const sphereTranslated = sphere.translate([0.8, 0.8, 0.8]); 
  const result = box.subtract(sphereTranslated);
  const meshData = result.getMesh();
  const vertices= meshData.vertProperties;
  const indices = meshData.triVerts;   
  box.delete();
  sphere.delete();
  sphereTranslated.delete();
  result.delete();
  return [{vertices,indices},option]
}
export const main=(opt)=>{
  const option = Object.assign({size:10},opt)
  return [modeling.primitives.cube(option),option]
}
*/`
type myFileHandleType = {
    write:(db:string )=>Promise<void>,
    read:()=>Promise<string>,
    del:()=>Promise<void>,
    createWriteStream(): Promise<WriteStream>
    //list:()=>Promise<EntryInfo[]>
}
type DirHandleType = {
  getFileHandle:(name:string)=>Promise<myFileHandleType>,
  name:string,
  //root:StorageAdapter,
  files:EntryInfo[]
}
export type FileInfoType  = {
    create?:boolean,
    name:string,
    path:string,
    //FileHandle?:FileSystemFileHandle,
    DirHandle?:DirHandleType
} 
export const getDirHandle =async (name:string,create?:ListDirectoryOptions)=>{
  const root = createStorage()
  const files =await root.listFilesInDirectory(name,create)
  //const name = p
  const getFileHandle =async (file:string ) => {
    const p = `${name}/${file}`
    /*
    if (!await root.fileExists(p) && create.create){
        root.writeFile
    }*/
   console.log(p)
    return {
        createWriteStream:()=>{
            return root.createWriteStream(p)
        },
        write:async (db:string )=>{
            return await root.writeFile(p,db)
        },
        read:async ()=>{
            return await root.readFile(p,'utf8') as string
        },
        del:()=>{
            return root.deleteFile(p)
        }
    } as myFileHandleType
  }
  return {files,name,getFileHandle} as DirHandleType
}
export const updateEditorDoc =async (editorView:EditorView,value:string )=>{
    
    editorView.dispatch({
        changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert:value
        }
    });
    
}


</script>
<script lang="ts">
import CodeMirror from "$lib/components/CodeMirror.svelte";
import { javascript } from "@codemirror/lang-javascript"; 
import { EditorView } from '@codemirror/view'; 
import { helpPanel,appendChildToDom } from "$lib/function/helpPanel";  
import {jscadModelingCompletionSource,getImport,getImportAliases} from "$lib/function/parsingCode"
import { autocompletion } from '@codemirror/autocomplete';  
const {initWebrtcConn,
    sendCodeToPreview,
    FileInfo}:{
        sendCodeToPreview:(msg:any)=>void,
        FileInfo:FileInfoType,
        initWebrtcConn:(db:any,cm_view: EditorView)=>void} = $props()
const getFileHandle = async(FileInfo:FileInfoType) =>{
    try{
        if (!FileInfo.DirHandle){
            //const root = await navigator.storage.getDirectory(); 
            FileInfo.DirHandle = await getDirHandle(
                FileInfo.path,{create:FileInfo.create})
        }
        return await FileInfo.DirHandle.getFileHandle(encodeURIComponent(FileInfo.name))
 
        /*
        if (!FileInfo.FileHandle  ){ 
            FileInfo.FileHandle = await FileInfo.DirHandle?.getFileHandle(
            encodeURIComponent(FileInfo.name),{create:true})  
            
        } 
        return {h:FileInfo.FileHandle,f:await FileInfo.FileHandle?.getFile()}
        */
    }catch(err){
        throw err
    }
}

const saveFile = (v:string,FileInfo:FileInfoType)=>{
    getFileHandle(FileInfo).then(({write})=>{
        //h.createSyncAccessHandle()
        write(v).then(()=>{
            sendCodeToPreview( {Modal:true,...FileInfo})
            
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
        await getFileHandle(FileInfo).then(({read})=>{
            read().then(db=>{ 
                updateEditorDoc(cm_view,db ||newPackageCode)
            })
        }).catch((res)=>{
            console.error(res) 
            updateEditorDoc(cm_view,newPackageCode)
        })
    } 
    
}

const createInputElement = (path?:string)=>{
    const input = document.createElement("input")
    input.type = "text"
    input.placeholder="./index.js"
    input.autofocus
    input.onkeydown = (e)=>{
        if (e.key === 'Enter' && input.value){
            if (!path){
                window.location.hash = encodeURIComponent(
                    JSON.stringify({path:input.value,create:true  }))  
            }else{
                let name = input.value
                if (!name.startsWith("./")){
                    name = "./"+name
                }
                if (!name.endsWith(".js")){
                    name += ".js"
                } 
                window.location.hash = encodeURIComponent(
                    JSON.stringify({name ,path  })) 
            }
            
            window.location.reload() 
        }
    }
    return input
}
 
const createSelect = ()=>{
 //const files:string[] = []
    const select = document.createElement("select")
    const firstOpt = document.createElement("option");
    firstOpt.textContent="--New file--"
    const content = document.createElement("span");
    content.style.marginRight = '6px';
    //select.on
    select.appendChild(firstOpt); 
    select.onclick =async ()=>{ 
        //select.innerHTML=""

        //let isSelect = false
        if (!FileInfo.DirHandle)return;
        //ImportVarList.length = 0
        const oldItem = select.childNodes.values()
        outerLoop: for  (const f of  FileInfo.DirHandle.files){
            //files.push(decodeURIComponent(k))
             
            if (f.isDirectory){
                continue;
            }
            const k = decodeURIComponent(f.name)
            for (const child of oldItem){
                if ((child as HTMLOptionElement).value === k){
                    continue outerLoop
                }
            }
            
            let opt = document.createElement("option");
            opt.textContent = k; 
            opt.value = k
            opt.defaultSelected=k===(FileInfo.name )
            //if (!opt.defaultSelected){
                FileInfo.DirHandle.getFileHandle(f.name).then(({read})=>{
                    read().then(doc=>{
                         getImport(doc,k) 
                    })
                })
                
            //}
            //console.log(k,FileInfo.name,opt.defaultSelected)
            //if (!isSelect)
            //    isSelect = opt.defaultSelected
            select.appendChild(opt);
        }
        //if (!isSelect){
        //    (select.lastChild as HTMLOptionElement).defaultSelected = true;
            //console.log("end select");
            //(select.children.item(select.children.length-1) as HTMLOptionElement).defaultSelected = true
        //} 
    }
    select.click()
    for (const child of select.childNodes.values()){
        const opt = (child as HTMLOptionElement)
        if (opt.value === (FileInfo.name ||'./index.js')){
            opt.defaultSelected = true
            break
        }
    }
    select.onchange=(e)=>{
        if (!select.value)return;
        switch (select.value) {
        case firstOpt.textContent:
            console.log("new file") 
            content.append(createInputElement(FileInfo.path))
            
            //input.focus()
            //appendChildToDom(input)
            return
        default:
            window.location.hash = encodeURIComponent(JSON.stringify({name:select.value ,path:FileInfo.path})) 
            window.location.reload()
        }
    }
    return [select,content]
}
function createButton(id:string,name?:string,onclick?:(e?:any)=>void){
    const but = document.createElement("button")
    but.id=id
    but.textContent=name||id
    but.onclick=(e)=>{
        onclick?.(e)
    }
    but.style.marginRight = '6px';
    return but
}
const initPanel =async ( )=>{
    if (!FileInfo.DirHandle){
        const input = createInputElement()
        if (FileInfo.path){
            input.value = FileInfo.path 
        }else{
            input.placeholder="create a project"
        }
        appendChildToDom(input,createButton("create","create",(e)=>{
            if (input.value){
                    window.location.hash = encodeURIComponent(
                JSON.stringify({path:input.value,create:true  }))  
                window.location.reload() 
            }                
        }))
        return;
    }
   
    const run  = document.createElement('a')
    run.textContent="Preview"
    run.href = "/preview#"+encodeURIComponent(JSON.stringify({path:FileInfo.path}))
    run.style.marginRight = '6px';
    run.target="previewPopup" 
    run.style.float = "right"
    run.onclick = ()=>{
        //window.open('',"myPopup",'width=400,height=600')
        //if (timeout===0)return;
        //clearTimeout(timeout) 
        //saveFile(editorView.state.doc.toString()) 
        //timeout = 0
    }
    appendChildToDom(createButton("Delete","X",(e)=>{
        //const fileName = FileInfo.name
        if (!FileInfo.name)return
        if (window.confirm(`Delete ${FileInfo.name} ?`)){
            FileInfo.DirHandle?.getFileHandle(encodeURIComponent(FileInfo.name)).then(({del})=>{
                del().then(()=>{
                    console.log("del",FileInfo)
                    window.location.hash = encodeURIComponent(JSON.stringify({path:FileInfo.path})) 
                    window.location.reload()
                })
                
            })
        } 
    }),...createSelect(),run)        
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
            initPanel() 
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