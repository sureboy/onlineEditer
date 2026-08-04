<script lang="ts">
  import { Canvas } from '@threlte/core'
  import Menu from '$lib/components/Menu.svelte' 
  import {moduleInit} from "$lib/components/MainMenu.svelte";
  import Dialog,{openModal,closeModal} from '$lib/components/Dialog.svelte';
  import { csg2Geo } from "$lib/function/csg2Three";
  //import MyWorker from '$lib/worker/worker?worker';
  import { getWorker,terminateWorker } from '$lib/worker/globalWorker';
  import { onMount } from 'svelte';
  import { T } from '@threlte/core'
  import { OrbitControls } from '@threlte/extras' 
  import * as THREE from 'three';
   
  const channel = new BroadcastChannel('code-preview');
  channel.onmessage = (event) => {
    // 防止自己发给自己导致死循环（可加 source 判断，但这里忽略）
    if (event.data.Modal ) {
      //document.body.innerHTML = event.data.payload.html;
      // 通知编辑器“我已更新”
      //channel.postMessage({ type: 'RENDER_READY' });
      DialogDiv.innerHTML=''
      const p = document.createElement("p")
      p.textContent = `'${event.data.name}' has been changed.`
      DialogDiv.append(p)
      DialogDiv.append(createBtnStartPreview(event.data,"Preview"))
      openModal() 
      
    }else{
      closeModal();
      getWorker(onmessageListen).then( w=>{ 
        w?.postMessage( event.data) 
        closeModal()
      }) 
    }
  };
  let geometrys:{geometry:any,material:any}[] =$state([])
  let DialogDiv:HTMLDivElement
  const solidControlConfig:{[k:string]:any} = $state({axes:true,grid:true,main:[]})
  const ClickhandleWithMainMenu = (basename:string)=>{
    getWorker().then(w=>{
      w.postMessage({basename})
    })
  }
  const Clickhandle=(k:string|{[k:string]:any})=>{
    if (typeof k === 'string'){
        console.log(k)
        return
    }
    if (k.id in solidControlConfig){
        solidControlConfig[k.id] = k.checked
    }
}
const onmessageListen =async (e:MessageEvent)=>{
  if (e.data.module){
    console.log(e.data.module)
    moduleInit(Object.assign({Clickhandle:ClickhandleWithMainMenu}, e.data.module))
    return
  }
  if (e.data.start){
    geometrys = []
    return
    //meshRef?.clear()
    //console.log("start")
  }
  if (e.data.end){
    //geometrys = []
    //meshRef?.clear()
    console.log("end")
    return
    //getSize()
  }
  if ('index' in e.data){
    //console.log(e.data)
    const geo = csg2Geo(e.data,{} )
    if (geo){
      geometrys.push(geo)
      geo.geometry.computeBoundingBox();
      const box = geo.geometry.boundingBox;
      const size = new THREE.Vector3();
      //;
      console.log(box?.getSize(size))
      
    } 
  }
}
/*
  const LocalStorageHandle = (e:StorageEvent)=>{
    if (!e.key)return; 
    //HTMLParagraphElement
    DialogDiv.innerHTML=''
    const p = document.createElement("p")
    p.textContent = `'${e.key}' has been changed.`
    DialogDiv.append(p)
    DialogDiv.append(createBtnStartPreview(e.key,"Preview"))
    openModal() 
  } */
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
    const path = window.location.hash.slice(1)
    DialogDiv.innerHTML=''
    if (path){

      getWorker(onmessageListen).then( w=>{ 
        w?.postMessage({path })
        console.log(path)  
      })
      //const db = JSON.parse(decodeURIComponent(k))
     
      /*
      navigator.storage.getDirectory().then(root=>{
        root.getDirectoryHandle(k).then(async dir=>{
          for await(const [k,f] of dir.entries()){
            if (f.kind==='file'){
              
            }
          }
        })
      })*/
    }


    //window.addEventListener("storage",LocalStorageHandle)
    return () => {
      //worker?.terminate();
      //worker = null;
      terminateWorker();
      //window.removeEventListener("storage",LocalStorageHandle)
    };
  });
</script>
<Canvas>
   <T.PerspectiveCamera makeDefault position={[10, 10, 10]}
    oncreate={(ref:any) => {
        ref.lookAt(0, 1, 0)
    }}>
    <!-- 2. 将 OrbitControls 作为相机的子组件 -->
    <OrbitControls />
  </T.PerspectiveCamera>
 
  <T.AmbientLight args={[0x404040, 0.3]} />

  <T.DirectionalLight args={[0xffffff, 1]} position={[5, 10, 7]}   />
  <T.DirectionalLight args={[0xffffff, 0.3]} position={[-5, 5, -5]}/>
  <T.DirectionalLight args={[0xffffff, 0.4]} position={[0, 5, -10]}/>
{#if solidControlConfig.grid}
  <T.GridHelper args={[10, 10]} /> 
  {/if}
  {#if solidControlConfig.axes}
  <T.AxesHelper args={[5]} />
  {/if}
  {#if geometrys} 
  {#each geometrys as {geometry,material}} 
    <T.Mesh {geometry} {material}> 
    </T.Mesh>
  {/each}  
{/if}
</Canvas> 
<Dialog title = {"welcome"}><div bind:this={DialogDiv}>test</div></Dialog>
<Menu {Clickhandle}></Menu>
<style>
  :root {
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