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
    import {getFileHandleFromOPFS} from "$lib/function/OPFS";

import { createTarDecoder } from 'modern-tar'; 
  //  import Dialog from '$lib/components/Dialog.svelte';
  async function extractTarStreamToOPFS( tarFile:File) {
    // 注意：modern-tar 的 unpackTar 函数期望的是未压缩的 TAR 数据[reference:9]
    // 因此需要先使用 DecompressionStream 解压 GZIP 部分[reference:10]
        const fileStream = tarFile.stream();
    // 假设是 .tar.gz，先解压 GZIP
    //if (tarFile.name.endsWith(".gz"))
    const decompressedStream = fileStream.pipeThrough(new DecompressionStream('gzip'));
    // 如果确定是 .tar，用 fileStream 替代 decompressedStream
    const tarStream = decompressedStream.pipeThrough(createTarDecoder());
    //const PathName = tarFile.name.split('.').join('_')
    //const decompressedStream = tarFile.stream()
    //    .pipeThrough(new DecompressionStream('gzip'));
    
    // 将解压后的流（TAR 数据）转换为 Uint8Array
    //const tarBuffer = new Uint8Array(await new Response(decompressedStream).arrayBuffer());
    //const tarStream = decompressedStream.pipeThrough(createTarDecoder());
    // 使用 modern-tar 解包 TAR 数据
    //const entries = await unpackTar(tarBuffer);
    const root = await navigator.storage.getDirectory();
    const reader = tarStream.getReader();
    try {
        while (true) {
            const { value: entry, done } = await reader.read();
            if (done) break;

            //const path = entry.header.name.replace(/^\.?\/?/, '');
            //const lastSlash = path.lastIndexOf('/');
            //const parentDir = lastSlash !== -1 ? path.substring(0, lastSlash) : '';

            if (entry.header.type === 'file') { 
              console.log(entry)
              const f =await getFileHandleFromOPFS( entry.header.name,{create:true,root}) 
              const w =await  f.createWritable() 
              await entry.body.pipeTo(w); 
            }
        }
    } finally {
        reader.releaseLock();
    }
    //return tarFile.name.split('.')[0]
 
}
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
  const createBtnStartPreview = (msg:{name:string,db:string},btnName?:string)=>{
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
    const k = window.location.hash.slice(1)
    DialogDiv.innerHTML=''
    if (k){ 
      //const db = JSON.parse(decodeURIComponent(k))
      console.log(k) 
    }else{
      //const tmpList = []
      
      //for(let i=0;i<window.localStorage.length;i++){
      //  DialogDiv.append(createBtnStartPreview(window.localStorage.key(i)||'Preview'))
         
      //} 
      navigator.storage.getDirectory().then(async root=>{
        //root.entries()
        for await (const k of root.keys()){
          const tagA = document.createElement("a")
          tagA.textContent = k;
          DialogDiv.append(tagA)
          tagA.href=window.location.href+ "#"+k
        }
        //root.keys().next()
      })
      const openFile = document.createElement('input')
      openFile.type = "file"
      //openFile.webkitdirectory =true
      //openFile.multiple = true
      openFile.accept=".tar,.gz,.tar.gz"
      openFile.textContent="open"
      openFile.addEventListener('change',(event)=>{
        const files = (event.target as HTMLInputElement).files;
        if (!files)return; 
        const file = files[0]
        console.log(file,files)
        extractTarStreamToOPFS(file).then(()=>{
          window.location.reload();
        })         
      })
      DialogDiv.append(openFile)
      openModal()
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