import { EditorView } from '@codemirror/view'; 
import {type FileInfoType,
    getDirHandle,
     newPackageCode} from "$lib/function/fileHandle"
import { appendChildToDom } from "$lib/function/helpPanel";  
import { getImport } from "$lib/function/parsingCode"
export const updateEditorDoc =async (value:string,
    editorView:EditorView,
 )=>{
    //console.log(value,editorView)
    editorView.dispatch({
        changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert:value
        }
    });
    
}
export    const initEditorView =async ( editorView: EditorView,FileInfo:FileInfoType)=>{
    const handle =  getFileHandle(FileInfo) 
    try{ 
        updateEditorDoc(await handle.read()  ,editorView) 
    }catch(err){ 
        console.error(err) 
        updateEditorDoc(newPackageCode,editorView)
    }
}
export const getFileHandle = (FileInfo:FileInfoType) =>{
    //console.log("get",FileInfo)
    try{
        if (!FileInfo.DirHandle || FileInfo.create){
            //const root = await navigator.storage.getDirectory(); 
            FileInfo.DirHandle = getDirHandle(
                FileInfo.path,{create:FileInfo.create})
        }
        return FileInfo.DirHandle.getFileHandle(
            encodeURIComponent(FileInfo.name)
        )
 
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
export const initPanel =async (cm_view: EditorView,FileInfo: FileInfoType )=>{
    if (!FileInfo.DirHandle){
        const input = createInputElement(cm_view,FileInfo)
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
    appendChildToDom(createButton("Delete","X",(e)=>{
        //const fileName = FileInfo.name
        if (!FileInfo.name)return
        if (window.confirm(`Delete ${FileInfo.name} ?`)){
            const handle = FileInfo.DirHandle?.getFileHandle(encodeURIComponent(FileInfo.name)) 
            handle?.del().then(()=>{
                console.log("del",FileInfo)
                FileInfo.name = "./index.js"
                initEditorView(cm_view,FileInfo).then(()=>{
                    initPanel(cm_view,FileInfo) 
                }) 
                
                
            })
        } 
    }),...createSelect(cm_view,FileInfo),run)        
}


const createSelect = (cm_view: EditorView,FileInfo: FileInfoType)=>{
 //const files:string[] = []
    const select = document.createElement("select")
    const firstOpt = document.createElement("option");
    firstOpt.textContent="--New file--"
    const content = document.createElement("span");
    content.style.marginRight = '6px';
    //select.on
    select.appendChild(firstOpt); 
    selectClickHandle(select,FileInfo).then(()=>{
        for (const child of select.childNodes.values()){
            const opt = (child as HTMLOptionElement)
            if (opt.value === (FileInfo.name ||'./index.js')){
                opt.defaultSelected = true
                break
            }
        }
    })
    
    select.onchange=(e)=>{
        if (!select.value)return;
        switch (select.value) {
        case firstOpt.textContent:
            console.log("new file") 
            content.append(createInputElement(cm_view,FileInfo))
            
            //input.focus()
            //appendChildToDom(input)
            return
        default:
            FileInfo.name = select.value;
            initEditorView(cm_view,FileInfo)
            //window.location.hash = encodeURIComponent(
            //JSON.stringify({name:select.value ,path:FileInfo.path})) 
            //window.location.reload()
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
const selectClickHandle =async (
    select: HTMLSelectElement,FileInfo: FileInfoType)=>{
    if (!FileInfo.DirHandle){ 
        return
    };
    const oldItem:string[] =[] 
    for (let i = 1; i<select.childNodes.length;i++){
        oldItem.push((select.childNodes.item(i) as HTMLOptionElement).value)
    }
    const files = await FileInfo.DirHandle?.files() ||[]
    if ( !oldItem.includes(FileInfo.name)){
        let opt = document.createElement("option");
        opt.textContent = FileInfo.name; 
        opt.value = FileInfo.name
        opt.defaultSelected=true
        oldItem.push(FileInfo.name)
        select.appendChild(opt);
        //return
    }
    //console.log("select click",files,FileInfo)
    for  (const f of  files){ 
        //console.log("l1",f)
        if (f.isDirectory){
            continue;
        }
        const k = decodeURIComponent(f.name)
        if (oldItem.includes(k)){
            continue
        }
        let opt = document.createElement("option");
        opt.textContent = k; 
        opt.value = k
        //opt.defaultSelected=k===(FileInfo.name ) 
        const handle = FileInfo.DirHandle?.getFileHandle(f.name) 
        handle?.read().then(doc=>{
            getImport(doc,k) 
        })
      
        select.appendChild(opt);
    }
    //select.childNodes.values()
}


const createInputElement = (cm_view: EditorView,FileInfo: FileInfoType)=>{
    const input = document.createElement("input")
    input.type = "text"
    input.placeholder="./index.js"
    input.autofocus
    input.onkeydown = (e)=>{
        if (e.key === 'Enter' && input.value){
            if (!FileInfo.path){
                FileInfo.path = input.value
                FileInfo.create = true
                //window.location.hash = encodeURIComponent(
                //    JSON.stringify({path:input.value,create:true  }))  
            }else{
                let name = input.value
                if (!name.startsWith("./")){
                    name = "./"+name
                }
                if (!name.endsWith(".js")){
                    name += ".js"
                } 
                //FileInfo.path = path
                FileInfo.name = name
                //window.location.hash = encodeURIComponent(
                //    JSON.stringify({name ,path  })) 
            }
            //getDirHandle(FileInfo.path)
            //window.location.reload() 
            initEditorView(cm_view,FileInfo).then(()=>{
                initPanel(cm_view,FileInfo) 
            })
        }
    }
    return input
}
