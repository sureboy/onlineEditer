<script lang="ts">
    import CodeMirror from "$lib/components/CodeMirror.svelte";
    import { javascript } from "@codemirror/lang-javascript"; 
    import { EditorView } from '@codemirror/view'; 
       import { helpPanel } from "$lib/function/helpPanel"; 
    const newPackageCode:string = `import modeling from '@jscad/modeling';
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
}`
    //let value =  "";
    const FileInfo:{name:string,path:string,FileHandle?:FileSystemFileHandle,DirHandle?:FileSystemDirectoryHandle} = {
        path:"BasicTemplate",
        name:"./index.js" 
    } 
    const updateEditorDoc = (editorView:EditorView,value:string )=>{
        editorView.dispatch({
          changes: {
            from: 0,
            to: editorView.state.doc.length,
            insert:value
          }
        });
    }
    //const onchange = (v)=>{

    //}
    const channel = new BroadcastChannel('code-preview');
    function sendCodeToPreview(msg:any) {
        channel.postMessage(msg);
        console.log("send",msg)
    }
    const saveKeymap = {
        // 键名使用小写，用连字符连接
        key: "Mod-s", // Mod 键在 Windows/Linux 下代表 Ctrl，macOS 下代表 Cmd
        run: (editorView:EditorView) => { 
            clearTimeout(timeout) 
            saveFile(editorView.state.doc.toString()) 
            return true;
        }
    }
    const saveFile = (v:string)=>{
        getFileHandle().then(({h})=>{
            //h.createSyncAccessHandle()
            h.createWritable().then(w=>{
                w.write(v).then(()=>{
                    w.close();
                    sendCodeToPreview( {Modal:true,...FileInfo})
                })
            })
        })  
    }
    const getFileHandle = async() =>{
        try{
            if (!FileInfo.DirHandle){
                FileInfo.DirHandle  = await navigator.storage.getDirectory(); 
                FileInfo.DirHandle = await FileInfo.DirHandle.getDirectoryHandle(
                    FileInfo.path,{create:true})
            }
            if (!FileInfo.FileHandle){ 
                FileInfo.FileHandle = await FileInfo.DirHandle.getFileHandle(
                encodeURIComponent(FileInfo.name),{create:true})  
            } 
            //return {h:FileInfo.FileHandle,f:await FileHandle.getFile()}
            return {h:FileInfo.FileHandle,f:await FileInfo.FileHandle.getFile()}
        }catch(err){
            throw err
        }
    }
let timeout: number ;
</script>

<CodeMirror 
    //bind:value={value} 
     extensions={[helpPanel()]}
    keybindings= {[saveKeymap]}
    lang={javascript()}
    styles={{
    "& .cm-editor": { padding: "0",border: "none" },  
    }} 
    onready = {(cm_view)=>{  
        //eView = cm_view
        const hashPath = window.location.hash.slice(1);
        if (hashPath){
            Object.assign(
                FileInfo , 
                JSON.parse(decodeURIComponent(hashPath))
            )
        } 
        //const i = tmpPathName.indexOf("/")
        //tmpPathName.
        getFileHandle().then(({f})=>{
            f.text().then(db=>{
                //value = db ||newPackageCode
                updateEditorDoc(cm_view,db ||newPackageCode)
            })
        }).catch((res)=>{
            console.error(res)
            //value = newPackageCode
            updateEditorDoc(cm_view,newPackageCode)
        })
 
    }}
    bounce={0}
    //nodebounce={true}
    onchange = {(v)=>{

        //SaveTmpDBToLocal() 
        //debounce(()=>{
            //value = v;
        //if (timeout){
        clearTimeout(timeout)
        //}
        timeout = setTimeout(() => {
            saveFile(v) 
        },5000)
            
            //window.localStorage.setItem(tmpPathName,value);
        //},1000)()
        
    }}
   
 />
 
  