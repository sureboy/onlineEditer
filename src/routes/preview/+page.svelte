<script lang="ts">
//import {Dialog} from '$lib/components/Dialog.svelte'
import { Canvas } from '@threlte/core'
import Menu,{SetEditingHashInfo} from '$lib/components/Menu.svelte'   
import { csg2Geo } from "$lib/function/csg2Three"; 
import { onMount } from 'svelte'; 
import {  Vector3,WebGLRenderer } from 'three';
import OrthoScene,{refreshCamera,refreshCameraInit,type ConfigType}  from '$lib/components/OrthoScene.svelte'; 
import DownMenu from "$lib/components/DownMenu.svelte";
//import {parseError} from "$lib/utils/parseError"
import Camera,{toggleCamera}  from "$lib/components/Camera.svelte";
import MainMenu ,{moduleInit} from "$lib/components/MainMenu.svelte";  
import Exchange,{getDialogDiv,QRCodeHandle,previewHandle } from '$lib/components/Exchange.svelte'; 
//let geometrys:{geometry:any,material:any,type:string}[] =$state([]) 

const solidControlConfig:ConfigType = $state({
  //title:"welcome",
  //Fullscreen:false,
  geometrys: [],
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
  previewHandle({basename},onmessageListen)

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
const onmessageListen =async (e:MessageEvent  )=>{
  if (e.data.err ){
    
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
    return;
  }else{
    if (errHtml)
    errHtml.innerHTML=""
  }
  console.log("get worker data",e.data )
  if (e.data.module){
    //console.log(e.data.module)
    moduleInit(Object.assign({
      Clickhandle:ClickhandleWithMainMenu
    }, e.data.module))
    solidControlConfig.geometrys = []
    solidControlConfig.GridSize=10
    solidControlConfig.MaxSize.set(10,10,10)
    return
  }
  if (e.data.start){
    

    return
    //meshRef?.clear()
    //console.log("start")
  }
  if (e.data.end){ 
    
    refreshCameraInit(solidControlConfig  )
    solidControlConfig.show = true
    //console.log("end",solidControlConfig)
    return
 
  }
  if ('index' in e.data){ 
    const geo = csg2Geo(e.data,{} )
    if (geo){ 
      
      solidControlConfig.geometrys.push(geo)
      console.log('index',e.data.index,solidControlConfig.geometrys.length)
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
      /*
      const broadPage = new BroadcastChannel(path+"_page")
      broadPage.onmessage = (ev:MessageEvent< string>)=>{
        console.log(ev.data)
        switch(ev.data){
          case "focus":
            window.focus();
            broadPage.postMessage("close");
            return;
          case "close":
            try {
                window.close();
            } catch(e) {
              console.log(e)
            } 
            broadPage.close()
            setTimeout(function() {
                //location.href = 'about:blank';
                console.log("blank")
            }, 100);
            return
        }
      }
      broadPage.postMessage("focus")
      */
      solidControlConfig.title = path
      SetEditingHashInfo({path})
      previewHandle({path },onmessageListen)
      
    } 
    /*
    return () => { 
      terminateWorker(); 
    };*/
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
let editBtn:HTMLAnchorElement
</script>
<div   class="preview">
<Canvas   >
 <OrthoScene  {solidControlConfig}  {getContext} ></OrthoScene>
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
  }} >webRTC P2P</button>     
</DownMenu>
 
<Exchange {solidControlConfig}  > 
</Exchange>
  <div style="color:white;text-align: left;">
  <a target="editPopup" bind:this={editBtn}  onclick={(e)=>{
    openEditPage()
  }}
  style="color:white;cursor: pointer;height:48px;text-align: left;line-height: 48px;"  
   href="/edit#{encodeURIComponent(JSON.stringify({path:solidControlConfig.title}))}" > {solidControlConfig.title?'Edit':'New'} </a>
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
</style>