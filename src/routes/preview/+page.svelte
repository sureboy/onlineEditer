<script lang="ts"> 
import { Canvas } from '@threlte/core'
import Menu from '$lib/components/Menu.svelte'   
import { csg2Geo } from "$lib/function/csg2Three"; 
import { onMount } from 'svelte'; 
import {  Vector3,WebGLRenderer } from 'three';
import OrthoScene,{refreshCamera,refreshCameraInit,type ConfigType}  from '$lib/components/OrthoScene.svelte'; 
import DownMenu from "$lib/components/DownMenu.svelte"; 
import Camera,{toggleCamera}  from "$lib/components/Camera.svelte";
import MainMenu ,{moduleInit} from "$lib/components/MainMenu.svelte";  
import Exchange,{QRCodeHandle } from '$lib/components/Exchange.svelte'; 
import { createDirInfo,type DirInfoType } from '$lib/function/fileHandle';  
import {type ThrelteContext } from '@threlte/core'
import { getWorker,terminateWorker } from '$lib/worker/globalWorker';
let DirInfo:DirInfoType|undefined =$state(undefined)
let geometrys:{geometry:any,material:any,type:string,show:boolean,tag:string}[] = $state([])
let stopTicker = $state(false) 
let showMenu = $state(false) 
const solidControlConfig:ConfigType = $state({  
  Light:true,
  Axes:true,Grid:true,main:[],
  isOrthographic:false,
  MaxSize :new Vector3(),
  GridSize:10, 
  getAspect:()=>{
    if (!solidControlConfig.Context)return 1
    const {size} = solidControlConfig.Context
    return size.current.width/size.current.height
  } 
})
let beginTime =  0
let showRunTime = $state(0)
const tickRunTime = ()=>{
  let t = ( Date.now() - beginTime)/1000
  if (stopTicker){
    showRunTime=t
    return;
  }
  if ((t|0) !== (showRunTime|0)){
    showRunTime =t
  }
  
  requestAnimationFrame(tickRunTime);
}

 
const Clickhandle=(k:string|{[key:string]:any}|null)=>{
  if (!k)return;
  if (typeof k === 'string'){
      //console.log(k)
      switchView(k)
      return
  }
  if (k.id in solidControlConfig){
      (solidControlConfig as {[key:string]:any})[k.id] = k.checked
  }
}
let errHtml:HTMLElement
const openEditPage = ()=>{
  const width =window.screen.width/2;
  const height =window.screen.height ;
  const left = width ;
  const top =0;
  window.open('',
  "editPopup",
  `width=${width},height=${height},left=${left},top=${top}`)
}
const errMessageHandle = (e:MessageEvent<{err:any}>)=>{
  if (e.data.err.message){
    const p = document.createElement("p")
    p.textContent = e.data.err.message
    p.style.color="red"
    errHtml.appendChild(p)
  }
  if (e.data.err.parsedStack){
    const p = document.createElement("p")
    
    errHtml.appendChild(p);
    (e.data.err.parsedStack as any[]).forEach(v=>{
        const a =editBtn.cloneNode() as HTMLAnchorElement
        // document.createElement("a")
        a.style.color="red"
        const textContent=JSON.stringify(Object.assign(v,{path:solidControlConfig.title}))
        a.href=`/edit#${encodeURIComponent(textContent)}`
        a.textContent=`edit ${v.name} {${v.lineNumber}:${v.columnNumber}}${v.functionName}`
        a.onclick = openEditPage
        p.appendChild(a)
    })
  } 
}
const handleWorkerData = (ev:MessageEvent<{update?:string,type:string,msg:any,run:string}>)=>{
  if (ev.data.type !=="workerData"){
    return
  }
  if (ev.data.update && ev.data.update!==DirInfo?.key){
    //console.log(ev.data,DirInfo?.key)
    return
  }
  if (ev.data.msg.start){
    return
  }
  if (ev.data.msg.end){ 
    refreshCameraInit(solidControlConfig  ) 
    if (!showMenu) showMenu = true
    return 
  }
  //console.log(ev.data)
  updateGeometrys(Object.assign(ev.data.msg,{tag:ev.data.run}))

}
const updateGeometrys = (data:any)=>{
  const geo = csg2Geo(data,{} )
  if (geo){ 
    geometrys.push(Object.assign({tag:data.tag,show:true},geo)) 
    geo.geometry.computeBoundingBox();
    const box = geo.geometry.boundingBox;
    const size = new Vector3(); 
    box?.getSize(size) 
    if (size.x>solidControlConfig.MaxSize.x) solidControlConfig.MaxSize.setX(size.x)
    if (size.y>solidControlConfig.MaxSize.y) solidControlConfig.MaxSize.setY(size.y)
    if (size.z>solidControlConfig.MaxSize.z) solidControlConfig.MaxSize.setZ(size.z)

    let helpSize = size.x>size.z?size.x:size.z;
    if (size.y>helpSize){
      helpSize =size.y
    }
    if (helpSize>solidControlConfig.GridSize ){
      solidControlConfig.GridSize  = Math.ceil(helpSize )+1 
    } 
  }  
}
const onmessageListen =async (e:MessageEvent  )=>{
  //console.log(e.data)
  if (e.data.err ){
    errMessageHandle(e) 
    return;
  }else{
    if (errHtml)
    errHtml.innerHTML=""
  } 
  if (e.data.module){  
    //handleWorkerData
    if (e.data.update && e.data.update!== DirInfo?.key){
      return
    }
    geometrys = []
    solidControlConfig.GridSize=10
    solidControlConfig.MaxSize.set(10,10,10)
    showMenu=false
    stopTicker=false
    beginTime=Date.now() 
    tickRunTime() 
    moduleInit(Object.assign({
      geometrys, 
    }, e.data.module))
    return
  }
  if (e.data.stopTicker){
    stopTicker=true
    //if (DirInfo){
    // DirInfo.channeldb?.removeEventListener("message",handleWorkerData)
    // DirInfo.Preview = undefined
    //}
  }
  if (e.data.end){ 
    refreshCameraInit(solidControlConfig  ) 
    if (!showMenu) showMenu = true
    return
 
  }
  if ('index' in e.data){  
    try{
      updateGeometrys(e.data) 
    }catch(err){
      console.error(err)
    }    
  }
}  
 
onMount(() => {  
  try{
    const {path} = JSON.parse(decodeURIComponent(window.location.hash.slice(1)))  
    if (path){ 
      solidControlConfig.title = path;
      DirInfo  = createDirInfo(path)  ;
      DirInfo.channeldb?.addEventListener("message",handleWorkerData)
      DirInfo.Preview = handleWorkerData
      getWorker( onmessageListen).then(w=>{
        const init = (e:MessageEvent<{type:string}>)=>{
          if (e.data.type==="init"){
            w.removeEventListener("message",init)
          }
        }
        w.addEventListener("message",init)
        w.postMessage({path,name:"./index.js",update:DirInfo?.key })    
      })
      //previewHandle({path },onmessageListen) 
    }  
  }catch(err){
    console.error(err)
  }
  return ()=>{
    terminateWorker()
  }
});
function switchView(direction:string) {
  if (direction==="camera"){ 
    solidControlConfig.isOrthographic = toggleCamera()==='Orthographic'
    setTimeout(()=>{
      refreshCameraInit(solidControlConfig )
    })
    return;
  }  
  refreshCamera(direction,solidControlConfig.isOrthographic,solidControlConfig.MaxSize)
}  
const DownHandle = (fn:(e:any)=>Promise<void>|void)=>{
  const {Axes,Grid } = solidControlConfig 
  solidControlConfig.Axes=false;
  solidControlConfig.Grid=false;
  setTimeout(async ()=>{
    await fn(solidControlConfig.Context) 
    solidControlConfig.Axes=Axes;
    solidControlConfig.Grid=Grid; 
  }) 
}
  

const getContext = (Context: ThrelteContext<WebGLRenderer>)=>{
  solidControlConfig.Context = Context
}
let editBtn:HTMLAnchorElement
</script>
<svelte:head><title>{solidControlConfig.title||"SolidJScad"}</title></svelte:head>
<div   class="preview"> 
<Canvas   >
 <OrthoScene {geometrys} {solidControlConfig}  {getContext} ></OrthoScene>
</Canvas>  
 
 <Menu    >
<MainMenu show={showMenu}  ></MainMenu>
{#if showMenu}
<Camera {Clickhandle}   ></Camera>
  <DownMenu  {DirInfo}
    title = {solidControlConfig.title||""} {DownHandle}
  >
  <button 
  style="height:48:px;line-height:48px;cursor: pointer;" 
  onclick={(e)=>{
    if (solidControlConfig.title)
     QRCodeHandle(solidControlConfig.title ,DirInfo)
  }} >webRTC P2P</button>     
</DownMenu>
{/if}
{#if !stopTicker}
  <div style="color:white;text-align: left;"  ><p class="spinner" >...</p><p>{showRunTime}s</p></div>
 {/if}
<Exchange {solidControlConfig}  > 
</Exchange>
  <div style="color:white;text-align: left;">
  <a target="editPopup" bind:this={editBtn}  onclick={(e)=>{
    openEditPage()
  }}
  style="color:white;cursor: pointer;height:48px;text-align: left;line-height: 48px;"  
   href="/edit#{encodeURIComponent(JSON.stringify({path:solidControlConfig.title}))}" > {solidControlConfig.title?'Edit':'New'} </a>

   {#if stopTicker}<p>{showRunTime}s</p>{/if}
  </div>
 <div style="color:white;text-align: left;" bind:this={errHtml}></div>
</Menu>


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
 
.spinner {
  width: 24px; height: 24px;
  border: 3px solid #eee;
  border-top-color: #333;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>