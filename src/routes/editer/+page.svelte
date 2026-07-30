<script lang="ts">
    import CodeMirror,{debounce} from "$lib/components/CodeMirror.svelte";
    import { javascript } from "@codemirror/lang-javascript";
    import {getFileHandleFromOPFS} from "$lib/function/OPFS";
    //import { getWorker } from '$lib/worker/globalWorker';
    //import { keymap } from "@codemirror/view";
    import { EditorView } from '@codemirror/view';
    //import { CatmullRomCurve3 } from "three";
    //import { onMount } from 'svelte';
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
    let tmpPathName = "BasicTemplate/index.js"
    let FileHandle:FileSystemFileHandle|undefined = undefined
 

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
            // 在这里实现你的保存逻辑
            //console.log("执行保存操作，当前代码：", );
            //value=editorView.state.doc.toString()
            //clearTimeout(tmpTimer)
            //window.localStorage.setItem(tmpPathName,value);
            // 例如，可以调用外部保存函数
            // saveCode(editorView.state.doc.toString());
            
            // 返回 true 表示该快捷键已被处理，可阻止浏览器默认行为
            clearTimeout(timeout)
            sendCodeToPreview({name:tmpPathName,db:editorView.state.doc.toString()})
            return true;
        }
    }
    const getFileHandle = async() =>{
        try{
            if (FileHandle){
                return {h:FileHandle,f:await FileHandle.getFile()}
            }
            FileHandle = await getFileHandleFromOPFS(tmpPathName,{create:true})
            return {h:FileHandle,f:await FileHandle.getFile()}
        }catch(err){
            throw err
        }
    }
let timeout: number ;
</script>

<CodeMirror 
    //bind:value={value} 
    keybindings= {[saveKeymap]}
    lang={javascript()}
    styles={{
    "& .cm-editor": { padding: "0",border: "none" },  
    }} 
    onready = {(cm_view)=>{  
        //eView = cm_view
        const hashPath = window.location.hash.slice(1);
        if (hashPath){
            tmpPathName = decodeURIComponent(hashPath)  
        } 
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
            getFileHandle().then(({h})=>{
                h.createWritable().then(w=>{
                    w.write(v).then(()=>{
                        sendCodeToPreview({name:tmpPathName,db:v,Modal:true})
                    })
                })
            })
            //timeout=null
        },5000)
            
            //window.localStorage.setItem(tmpPathName,value);
        //},1000)()
        
    }}
   
 />
 
  