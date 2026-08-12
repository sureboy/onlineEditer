<script lang="ts" module>
//import {useThrelte} from "@threlte/core"
import { OrbitControls as Orb } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    Vector3,
    OrthographicCamera,
    PerspectiveCamera, 
     WebGLRenderer
} from 'three';
let camera:OrthographicCamera|PerspectiveCamera|undefined = $state(undefined)
let Controls :Orb|undefined = $state(undefined) ;
//const useT= useThrelte()
//let rSize  = $derived(()=>{
//  return useT.size.current
//})
let QviewDistance = 15;
//let isOrthographic = $state(false);
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
 
function getSizeVector  ( position:Vector3,MaxSize:Vector3){
	const p = new Vector3(position.x&1^1,position.y&1^1,position.z&1^1); 
	const size = MaxSize.clone().multiply(p).length(); 
	const fov =  ((camera as PerspectiveCamera|undefined )?.fov || 1)*(Math.PI /180); 	 
	const z = size /2/Math.tan(fov/2); 
	return position.multiplyScalar(z);
};
export const refreshCameraInit =(opt:{
  MaxSize:Vector3,isOrthographic:boolean,getAspect:()=>number})=>{
  if (!camera){
      return
  }
  const {MaxSize,isOrthographic,getAspect} = opt
  //const {size} = useThrelte()
  //size.subscribe
  //const width = 200
  //const height = 100
  const groupSize = (MaxSize.length() || 10)

  //const k =  width/ height;
  const aspect = getAspect()
  //  console.log(groupSize,aspect,Controls)
  if (isOrthographic){
    
   
    const s = groupSize/2;
    const cam = (camera as OrthographicCamera )
    cam.left = -s *aspect;
    cam.right = s*aspect;
    cam.top = s;
    cam.bottom = -s;
    cam.position.set(0,0,-s); 
    cam.up.set(0,1,0)
    QviewDistance = s;
  }else{
    //isOrthographic=false;
			//if (camera){
			//	camera.clear();
			//}
			//camera =new PerspectiveCamera(40, 1, 0.1, 2000);
			//const  size = getSize(group);
			//cameraFov = camera.fov;
    const cam = (camera as PerspectiveCamera )
    const fov =  (cam.fov )*(Math.PI /180); 	 
    cam.position.setZ( groupSize /2/Math.tan(fov/2)); 	
    //viewDistance =  camera.position.z;	
    cam.aspect = aspect	;
    console.log("fov",fov,cam.position,cam.fov)
  }
  //console.log("qv",QviewDistance)
  camera.updateProjectionMatrix();
  
  //setTimeout(()=>{
    console.log("show ")
    camera?.lookAt(0,0,0) ;
    Controls?.target.set(0, 0, 0);
    Controls?.update();
  //},100)

  //switchView("front");

}

export const refreshCamera = (direction:string,isOrthographic:boolean,MaxSize:Vector3)=>{
    //camera?.position.copy(isOrthographic?view.position:getSizeVector(view.position.clone()) );
  const views = isOrthographic ? orthographicViews : perspectiveViews;
	const view = views[direction];
	//console.log(direction,view);
      console.log(direction,isOrthographic)
	if (view) {
    //console.log(camera,Controls)
    //return
		// 直接设置相机位置和朝向
    
		camera?.position.copy(isOrthographic?view.position:getSizeVector(view.position.clone(),MaxSize) );
		camera?.up.copy( view.up);
		camera?.lookAt(0,0,0) ;
		//if (!isOrthographic){cameraP.aspect = el.width/el.height	;}
		// 更新控制器
    
		Controls?.target.set(0, 0, 0);
		Controls?.update();
	//}else{
    //    refreshCameraInit(MaxSize,isOrthographic)
    }
}
</script>
<script lang="ts">
  import { T,useThrelte } from '@threlte/core'
  import { OrbitControls } from '@threlte/extras' 
//import {useThrelte} from "@threlte/core"
  import { onMount } from 'svelte';
 
  const {
    //MaxSize,
    geometrys,
    //GridSize,
    //getCamera,getControls,
    solidControlConfig}:{
    //MaxSize:Vector3,
    solidControlConfig:{[k:string]:any},
    //getCamera:(ref:any)=>void,
    //getControls:(ref:any)=>void,
    //GridSize:number,
    //isOrthographic:boolean,
    geometrys:{geometry:any,material:any}[] 
} = $props()
const Context= useThrelte()
const getContext = ()=>{
  return Context
}
onMount(()=>{
  const {size} = Context
  solidControlConfig['getContext']=getContext
   solidControlConfig["getAspect"]=()=>{
    console.log(size.current)
    return size.current.width/size.current.height
  }
})

 
//let QviewDistance = 15;
//let isOrthographic = $state(false);
//let camera:OrthographicCamera|PerspectiveCamera|undefined = $state(undefined)
//let Controls :Orb|undefined = $state(undefined) ;
//const solidControlConfig:{[k:string]:any} = $state({axes:true,grid:true,main:[]})
//let GridSize = $state(10)
//let geometrys:{geometry:any,material:any}[] =$state([])
//let camera:OrthographicCamera|PerspectiveCamera|undefined = $state(undefined)
//let Controls :Orb|undefined = $state(undefined) ;

</script>


{#if solidControlConfig.isOrthographic}
<T.OrthographicCamera bind:ref={(camera as OrthographicCamera | undefined)}
 args={[0,0,0,0,0.1,2000]} makeDefault  >
  <OrbitControls bind:ref={Controls}   target={[0,0,0]} />
</T.OrthographicCamera>
{:else}
   <T.PerspectiveCamera  args={[40, 1, 0.1, 2000]}
    makeDefault 
   //up={[PerspectiveCameraT.up.x,PerspectiveCameraT.up.y,PerspectiveCameraT.up.z]}  
   position={[10,10,10]} 
    bind:ref={(camera as PerspectiveCamera | undefined)}> 
    <OrbitControls bind:ref={Controls}  target={[0,0,0]} />
  </T.PerspectiveCamera>
 {/if}
 <T.HemisphereLight args={[0xffffbb, // 天空颜色
	0xffffbb, // 地面颜色
	0.6  ]} />
  <T.AmbientLight args={[0x404040, 0.3]} />
 
  <T.DirectionalLight args={[0xffffff, 1]} position={[5, 10, 7]}   />
  <T.DirectionalLight args={[0xffffff, 0.3]} position={[-5, 5, -5]}/>
  <T.DirectionalLight args={[0xffffff, 0.4]} position={[0, 5, -10]}/>
{#if solidControlConfig.grid}
  <T.GridHelper args={[solidControlConfig.GridSize,solidControlConfig.GridSize]} /> 
  {/if}
  {#if solidControlConfig.axes}
  <T.AxesHelper args={[solidControlConfig.GridSize/2]} />
  {/if}
  {#if geometrys} 
  {#each geometrys as {geometry,material}} 
    <T.Mesh {geometry} {material}  > 
    </T.Mesh>
  {/each}  
{/if}