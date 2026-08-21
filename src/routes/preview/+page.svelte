<script lang="ts">
import { Canvas } from '@threlte/core'
import Menu,{SetEditingHashInfo} from '$lib/components/Menu.svelte'  
import {openModal,closeModal} from '$lib/components/Dialog.svelte';
import { csg2Geo } from "$lib/function/csg2Three"; 
import { getWorker,terminateWorker } from '$lib/worker/globalWorker';
import { onMount } from 'svelte';
import {refreshCamera,refreshCameraInit} from '$lib/components/OrthoScene.svelte' 
import {  Vector3 } from 'three';
import OrthoScene from '$lib/components/OrthoScene.svelte'; 
import DownMenu from "$lib/components/DownMenu.svelte";
import Camera,{toggleCamera}  from "$lib/components/Camera.svelte";
import MainMenu ,{moduleInit} from "$lib/components/MainMenu.svelte"; 
import {jsonToForm,collectFormData} from '$lib/utils/jsonToForm'   
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc"
import QRCode from 'qrcode';
import Exchange,{getDialogDiv } from '$lib/components/Exchange.svelte';
//let DialogDiv = getDialogDiv()
const previewHandle =async (data: any)=>{
  const w = await getWorker(onmessageListen) 
  w?.postMessage( data) 
   
}
  let geometrys:{geometry:any,material:any}[] =$state([])

  const solidControlConfig:{[k:string]:any} = $state({
    //title:"welcome",
    Light:true,
    Axes:true,Grid:true,main:[],
    isOrthographic:false,
    MaxSize :new Vector3(),
    GridSize:10,
    show:false
    //getAspect:()=>{return aspect},
  })
  const ClickhandleWithMainMenu = (basename:string)=>{
    previewHandle({basename})
 
  }
  const Clickhandle=(k:string|{[k:string]:any}|null)=>{
    if (!k)return;
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
  //if (e.data.err){
  //  console.log(e.data.err)
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
      refreshCameraInit(solidControlConfig as any)
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
    await fn(solidControlConfig['getContext']?.()) 
    solidControlConfig.Axes=Axes;
    solidControlConfig.Grid=Grid; 
  }) 
}
const QRCodeClick = (e:any)=>{ 
    ShowSubmit(getDialogDiv(),getConnHostJsonStr(),(db)=>{
      //console.log(db)
       
      let url = `${window.location.protocol}//${window.location.host}/edit#${encodeURIComponent(
        JSON.stringify({
          path:solidControlConfig.title,
          id:db.id,
          host:db.host})
      )}`
      console.log(url)
        QRCode.toDataURL(url,{
          width: 200, 
          color: {
            dark: '#3b82f6',
            light: '#ffffff'
          }
        }).then(src=>{
          getDialogDiv().innerHTML=`<h2>${db.id}</h2>`
          const img = document.createElement("img")
          img.src = src
          getDialogDiv().append(img)
        })
      createWebrtcConnFromCenterUrl(db,async (conn)=>{
        const mesh = {conn,files:new Map()}
        addMesh(mesh)
        const root = await navigator.storage.getDirectory();
        const dir = await  root.getDirectoryHandle(solidControlConfig.title)
        for await(let [k,v] of dir.entries()){
          if (v.kind==="file"){
            const f = await v.getFile() 
            //const fdb =await f()
            const fileCHannel = conn.pc.createDataChannel(k)
            mesh.files.set(k,fileCHannel);
            /*
            fileCHannel.onmessage = (e)=>{
              const fh = await FileInfo.DirHandle?.getFileHandle(
              e.channel.label ); 
              const w =await fh?.createWriteStream() 
              meshList.forEach(m=>{

              })
              //channel.onmessage?.({data:{name:k}})
            }*/
            fileCHannel.onopen=async ()=>{ 
              const buf = await f.arrayBuffer()  
              fileCHannel.send(buf) 
              fileCHannel.send("close")
               
            }

          }
        }
        

        closeModal()
      })
    }); 
    //DialogDiv.innerHTML=''
    //const p = document.createElement("p")
    //p.textContent = `'${"test"}' has been changed.`
   // DialogDiv?.append(p)
   

  openModal()
}
import type {connType} from "$lib/utils/webRTCPool"
type meshInfoType = {
    conn:connType, 
    files:Map<string,RTCDataChannel>
    //remoteStream?: MediaStream,
    //video?:HTMLVideoElement,
    //main?:string,
    //setSender?:(obj:any)=>void, 
} 
const meshList:(meshInfoType|null)[] =$state([])
export const addMesh = (m:meshInfoType)=>{ 
    for (let i=0;i<meshList.length;i++){
        const v = meshList[i]
        if (v && v.conn.id ===m.conn.id){
            meshList[i] = m
            return
        }
    }
    const len = meshList.length;
    m.conn.onClose = ()=>{
        if (meshList[len]) meshList[len] = null
        console.log("----",m)
    }
    meshList.push(m)
}
const getConnHostJsonStr = ()=>{
    return  {
        _comment:"跨网信令交换服务",
        id:Date.now().toString(32).slice(4),
        id_comment:"[加入]端需要输入[生成]端的id",
        create:true,
        create_comment:"[生成/加入]WebRtc会话",
        host_comment:"信令交换服务公共网址",
        host:"https://www.zaddone.com/rtc"
    }  
} 
const ShowSubmit = (content:HTMLDivElement,db:any,hand:(db:any)=>void)=>{ 
    jsonToForm(db ,content)  
    const btn = document.createElement('button');
    btn.textContent = '确定';
    Object.assign(btn.style, {
        marginTop: '1rem',
        padding: '0.5rem 1rem',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    });
    btn.onclick = () => { 
        hand(collectFormData(content)) 
    };
    content.appendChild(btn); 
}
</script>
<div   class="preview">
<Canvas   >
 <OrthoScene  {solidControlConfig} {geometrys} ></OrthoScene>
</Canvas> 
<Exchange {solidControlConfig} {previewHandle}  > 
</Exchange>
 <Menu    >
<MainMenu  show={solidControlConfig.show}   ></MainMenu>
<Camera {Clickhandle} ></Camera>
  <DownMenu  
  show={solidControlConfig.show} title = {solidControlConfig.title||""} {DownHandle}
  >
  <button 
  style="height:48:px;line-height:48px;cursor: pointer;" 
  onclick={QRCodeClick} >QRCode</button>     
</DownMenu>
{#each meshList as mesh,k }
{#if mesh}
  <details    >
    <summary   style="cursor: pointer; text-align: left;height:48px; line-height: 48px;"  >
        {mesh.conn.id}
    </summary>
    <div   style="color:white;text-align: center;" >
        <button onclick={(e)=>{
            mesh.conn.dc?.send(JSON.stringify({  
                name:"local" ,
                msg: 0,
                 
            })) 
        }}>reload </button> 
    </div>
</details>
{/if}
{/each}

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