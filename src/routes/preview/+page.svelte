<script lang="ts">
  import { Canvas } from '@threlte/core'
  import Menu from '$lib/components/Menu.svelte' 
  import {moduleInit,SetEditingHashInfo} from "$lib/components/MainMenu.svelte";
  import Dialog,{openModal,closeModal} from '$lib/components/Dialog.svelte';
  import { csg2Geo } from "$lib/function/csg2Three";
  import {toggleCamera} from "$lib/components/Camera.svelte"
  //import MyWorker from '$lib/worker/worker?worker';
  import { getWorker,terminateWorker } from '$lib/worker/globalWorker';
  import { onMount } from 'svelte';
  import {refreshCamera,refreshCameraInit} from '$lib/components/OrthoScene.svelte'
 
  import {
    Vector3,
  
    //OrbitControls
  } from 'three';
    import OrthoScene from '$lib/components/OrthoScene.svelte';
//    import { booleans } from '@jscad/modeling';
  //const {Vector3} = THREE;
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
  const solidControlConfig:{[k:string]:any} = $state({
    axes:true,grid:true,main:[],
    isOrthographic:false,
    MaxSize :new Vector3(),
    GridSize:10,
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
      //;
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
//let GridSize = $state(10)
//const MaxSize =new Vector3()
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
  });

//let QviewDistance = 15;
//let isOrthographic = $state(false);  
/*
//let cameraFov:number = 1;// =cameraP.fov;
const perspectiveViews:{[k:string]:any}  = {
	front:  { position: new  Vector3(0, 0, 1), up: new Vector3(0, 1, 0) },
	back:   { position: new Vector3(0, 0, -1),  up: new Vector3(0, 1, 0) },
	left:   { position: new Vector3(-1, 0, 0),  up: new Vector3(0, 1, 0) },
	right:  { position: new Vector3(1, 0, 0),  up: new Vector3(0, 1, 0) },
	top:    { position: new Vector3(0, 1, 0),  up: new Vector3(0, 0, -1) },
	bottom: { position: new Vector3(0, -1, 0),  up: new Vector3(0, 0, 1) },
	//isometric: { position: new Vector3(8, 8, 8),  up: new Vector3(0, 1, 0) }
};
const orthographicViews:{[k:string]:any} = {
	front:  { position: new Vector3(0, 0, QviewDistance), up: new Vector3(0, 1, 0) },
	back:   { position: new Vector3(0, 0, -QviewDistance), up: new Vector3(0, 1, 0) },
	left:   { position: new Vector3(-QviewDistance, 0, 0), up: new Vector3(0, 1, 0) },
	right:  { position: new Vector3(QviewDistance, 0, 0), up: new Vector3(0, 1, 0) },
	top:    { position: new Vector3(0, QviewDistance, 0), up: new Vector3(0, 0, -1) },
	bottom: { position: new Vector3(0, -QviewDistance, 0), up: new Vector3(0, 0, 1) },
	//isometric: { position: new Vector3(10, 10, 10), up: new Vector3(0, 1, 0) }
};
function getSizeVector  ( position:Vector3){
	const p = new Vector3(position.x&1^1,position.y&1^1,position.z&1^1);
	//const  sizeM = getSceneSize(obj);
	const size = MaxSize.clone().multiply(p).length();
	console.log("pz",size,position);
	//HelperGroupUpdate(size/2);
  //const cam = (camera as PerspectiveCamera|undefined )
	const fov =  ((camera as PerspectiveCamera|undefined )?.fov || 1)*(Math.PI /180); 	 
	const z = size /2/Math.tan(fov/2); 
	return position.multiplyScalar(z);
};*/
// const { camera } = useThrelte()
//let camera:OrthographicCamera|PerspectiveCamera|undefined = $state(undefined)
//let Controls :Orb|undefined = $state(undefined) ;
 /*
const refresh = ()=>{
 
  const size = useSize()
  const groupSize = (MaxSize.length() || 10)
  if (isOrthographic){
    
    const k = size.width/size.height;
    const s =groupSize/2;
    if (camera){
      camera.clear();
    }
    camera = new OrthographicCamera(0,0,0,0,0.1,2000); 
    camera.left = -s *k;
    camera.right = s*k;
    camera.top = s;
    camera.bottom = -s;
    camera.position.set(0,0,-s); 
    QviewDistance = s;
  }else{
    isOrthographic=false;
			if (camera){
				camera.clear();
			}
			camera =new PerspectiveCamera(40, 1, 0.1, 2000);
			//const  size = getSize(group);
			//cameraFov = camera.fov;
			const fov =  camera.fov*(Math.PI /180); 	 
			camera.position.z = groupSize /2/Math.tan(fov/2); 	
			//viewDistance =  camera.position.z;	
			camera.aspect = size.width/size.height	;
  }
  		Controls?.target.set(0, 0, 0);
		Controls?.update();

}*/
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
//let OrbControlsTarget = [0,0,0]


</script>
<div style="width: 100vw; height: 100vh;">
<Canvas  >
 <OrthoScene  {solidControlConfig} {geometrys} ></OrthoScene>
</Canvas> 
</div>
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