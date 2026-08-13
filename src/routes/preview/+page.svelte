<script lang="ts">
  import { Canvas } from '@threlte/core'
  import Menu,{SetEditingHashInfo} from '$lib/components/Menu.svelte' 
  import {moduleInit} from "$lib/components/MainMenu.svelte";
  import Dialog,{openModal,closeModal} from '$lib/components/Dialog.svelte';
  import { csg2Geo } from "$lib/function/csg2Three";
  import {toggleCamera} from "$lib/components/Camera.svelte"
  //import MyWorker from '$lib/worker/worker?worker';
  import { getWorker,terminateWorker } from '$lib/worker/globalWorker';
  import { onMount } from 'svelte';
  import {refreshCamera,refreshCameraInit} from '$lib/components/OrthoScene.svelte' 
  import {
    Vector3, 
  } from 'three';
  import OrthoScene from '$lib/components/OrthoScene.svelte'; 
  const channel = new BroadcastChannel('code-preview');
    let DialogDiv:HTMLDivElement|undefined=undefined
  channel.onmessage = (event) => { 
    if (event.data.Modal ) { 
      if (DialogDiv){
        DialogDiv.innerHTML=''
        const p = document.createElement("p")
        p.textContent = `'${event.data.name}' has been changed.`
        DialogDiv.append(p)
        DialogDiv.append(createBtnStartPreview(event.data,"Preview"))
        openModal() 
      } 
    }else{
      closeModal();
      getWorker(onmessageListen).then( w=>{ 
        w?.postMessage( event.data) 
        closeModal()
      }) 
    }
  };
  let geometrys:{geometry:any,material:any}[] =$state([])

  const solidControlConfig:{[k:string]:any} = $state({
    title:"welcome",
    axes:true,grid:true,main:[],
    isOrthographic:false,
    MaxSize :new Vector3(),
    GridSize:10,
    show:false
    //getAspect:()=>{return aspect},
  })
  const ClickhandleWithMainMenu = (basename:string)=>{
    getWorker().then(w=>{
      w.postMessage({basename})
    })
  }
  const Clickhandle=(k:string|{[k:string]:any})=>{
    if (typeof k === 'string'){
        //console.log(k)
        switchView(k)
        return
    }
    if (k.id in solidControlConfig){
        solidControlConfig[k.id] = k.checked
    }
  }
const onmessageListen =async (e:MessageEvent)=>{
  if (e.data.module){
    console.log(e.data.module)
    moduleInit(Object.assign({

      Clickhandle:ClickhandleWithMainMenu
    }, e.data.module))
    return
  }
  if (e.data.start){
    geometrys = []
    solidControlConfig.GridSize=10
    solidControlConfig.MaxSize.set(10,10,10)
    return
    //meshRef?.clear()
    //console.log("start")
  }
  if (e.data.end){ 
    refreshCameraInit(solidControlConfig as any)
    solidControlConfig.show = true
    return
 
  }
  if ('index' in e.data){
    //console.log(e.data)
    const geo = csg2Geo(e.data,{} )
    if (geo){
      geometrys.push(geo)
      geo.geometry.computeBoundingBox();
      const box = geo.geometry.boundingBox;
      const size = new Vector3(); 
      box?.getSize(size)
      //MaxSize.max()
      if (size.x>solidControlConfig.MaxSize.x) solidControlConfig.MaxSize.setX(size.x)
      if (size.y>solidControlConfig.MaxSize.y) solidControlConfig.MaxSize.setY(size.y)
      if (size.z>solidControlConfig.MaxSize.z) solidControlConfig.MaxSize.setZ(size.z)

      let helpSize = size.x>size.z?size.x:size.z;
      if (size.y>helpSize){
        helpSize =size.y
      }
      if (helpSize>solidControlConfig.GridSize ){
        solidControlConfig.GridSize  = Math.ceil(helpSize )+1
        //GridSize[0] =GridSize[1]
      }
      //console.log(box,size ,GridSize)
      
    } 
  }
} 
  const createBtnStartPreview = (msg:{name:string,db:string,path:string},btnName?:string)=>{
    const btn = document.createElement("button")
    btn.textContent =btnName || msg.name
    //tmpList.push(window.localStorage.key(i))
    btn.onclick = ()=>{
      getWorker(onmessageListen).then( w=>{ 
        w?.postMessage(msg) 
        closeModal()
      }) 
    }
    return btn
  }
  onMount(() => {
    //worker = new MyWorker();
    try{

   
    let path =decodeURIComponent(window.location.hash.slice(1))
    if (DialogDiv)DialogDiv.innerHTML=''
    if (path){
      solidControlConfig.title = path
      SetEditingHashInfo({path})
      getWorker(onmessageListen).then( w=>{ 
        w?.postMessage({path })
        console.log(path)  
        //window.location.hash=""
      }) 
    } 
    return () => { 
      terminateWorker(); 
    };
    }catch(err){
      console.error(err)
    }
  });
 
function switchView(direction:string) {
  if (direction==="camera"){ 
    solidControlConfig.isOrthographic = toggleCamera()==='Orthographic'
    setTimeout(()=>{
      refreshCameraInit(solidControlConfig as any)
    })
    return;
  } 
  refreshCamera(direction,solidControlConfig.isOrthographic,solidControlConfig.MaxSize)
}  
const DownHandle = (fn:(e:any)=>Promise<void>|void)=>{
  const {axes,grid } = solidControlConfig 
  solidControlConfig.axes=false;
  solidControlConfig.grid=false;
  setTimeout(async ()=>{
    await fn(solidControlConfig['getContext']?.()) 
    solidControlConfig.axes=axes;
    solidControlConfig.grid=grid; 
  }) 
}
</script>
<div   class="preview">
<Canvas   >
 <OrthoScene  {solidControlConfig} {geometrys} ></OrthoScene>
</Canvas> 

<Dialog title = {solidControlConfig.title}><div bind:this={DialogDiv}>test</div></Dialog>
<Menu show={solidControlConfig.show} {Clickhandle}  {DownHandle} ></Menu>
</div>
<style>
.preview {
  width: 100vw; 
  height: 100vh;
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 1);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>