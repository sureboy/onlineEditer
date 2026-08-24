<script lang="ts">
import { Canvas } from '@threlte/core'
import Menu,{SetEditingHashInfo} from '$lib/components/Menu.svelte'   
import { csg2Geo } from "$lib/function/csg2Three"; 
import { getWorker,terminateWorker } from '$lib/worker/globalWorker';
import { onMount } from 'svelte'; 
import {  Vector3,WebGLRenderer } from 'three';
import OrthoScene,{refreshCamera,refreshCameraInit,type ConfigType}  from '$lib/components/OrthoScene.svelte'; 
import DownMenu from "$lib/components/DownMenu.svelte";
import Camera,{toggleCamera}  from "$lib/components/Camera.svelte";
import MainMenu ,{moduleInit} from "$lib/components/MainMenu.svelte"; 
 
//import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc"

import Exchange,{getDialogDiv,QRCodeHandle } from '$lib/components/Exchange.svelte';
//let DialogDiv = getDialogDiv()

 
const previewHandle =async (data: any)=>{
  if (!data.basename){
    data.basename="main"
  }
  const w = await getWorker(onmessageListen) 
  w?.postMessage( data) 
  //console.log(data) 
}
  let geometrys:{geometry:any,material:any}[] =$state([])
 
  const solidControlConfig:ConfigType = $state({
    //title:"welcome",
    Light:true,
    Axes:true,Grid:true,main:[],
    isOrthographic:false,
    MaxSize :new Vector3(),
    GridSize:10,
    show:false,
    getAspect:()=>{
              if (!solidControlConfig.Context)return 1
          const {size} = solidControlConfig.Context
          return size.current.width/size.current.height
        }
    //getAspect:()=>{return aspect},
  })
  const ClickhandleWithMainMenu = (basename:string)=>{
    previewHandle({basename})
 
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
const onmessageListen =async (e:MessageEvent)=>{
  //if (e.data.err){
  //  console.log(e.data)
  //}
  if (e.data.module){
    //console.log(e.data.module)
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
    refreshCameraInit(solidControlConfig  )
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
onMount(() => { 
  try{
    const {path} = JSON.parse(decodeURIComponent(window.location.hash.slice(1)))
    //let path =
    getDialogDiv().innerHTML=''
    if (path){
      solidControlConfig.title = path
      SetEditingHashInfo({path})
      previewHandle({path })
      
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
  import {type ThrelteContext } from '@threlte/core'

const getContext = (Context: ThrelteContext<WebGLRenderer>)=>{
  solidControlConfig.Context = Context
}


 
</script>
<div   class="preview">
<Canvas   >
 <OrthoScene  {solidControlConfig} {geometrys} {getContext} ></OrthoScene>
</Canvas> 

 <Menu    >
<MainMenu  show={solidControlConfig.show}   ></MainMenu>
<Camera {Clickhandle} ></Camera>
  <DownMenu  
  show={solidControlConfig.show} title = {solidControlConfig.title||""} {DownHandle}
  >
  <button 
  style="height:48:px;line-height:48px;cursor: pointer;" 
  onclick={(e)=>{
     QRCodeHandle(solidControlConfig.title||"")
  }} >QRCode</button>     
</DownMenu>
 
<Exchange title ={solidControlConfig.title}  > 
</Exchange>
  <div style="color:white;text-align: left;">
  <a target="editPopup"  onclick={(e)=>{
    const width =window.screen.width/2;
    const height =window.screen.height ;
    const left = width ;
    const top =0;
    window.open('',
    "editPopup",
    `width=${width},height=${height},left=${left},top=${top}`)
  }}
  style="color:white;cursor: pointer;height:48px;text-align: left;line-height: 48px;"  
   href="/edit#{encodeURIComponent(JSON.stringify({path:solidControlConfig.title}))}" > {solidControlConfig.title?'Edit':'New'} </a>
   </div>
 
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
</style>