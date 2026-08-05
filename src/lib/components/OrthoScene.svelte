<script lang="ts" module>
import {useThrelte} from "@threlte/core"
import { OrbitControls as Orb } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    Vector3,
    OrthographicCamera,
    PerspectiveCamera, 
} from 'three';
let camera:OrthographicCamera|PerspectiveCamera|undefined// = $state(undefined)
let Controls :Orb|undefined //= $state(undefined) ;
// const { size } = useThrelte()
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
	//const  sizeM = getSceneSize(obj);
	const size = MaxSize.clone().multiply(p).length();
	//console.log("pz",size,position);
	//HelperGroupUpdate(size/2);
  //const cam = (camera as PerspectiveCamera|undefined )
	const fov =  ((camera as PerspectiveCamera|undefined )?.fov || 1)*(Math.PI /180); 	 
	const z = size /2/Math.tan(fov/2); 
	return position.multiplyScalar(z);
};
export const refreshCameraInit = (MaxSize:Vector3,isOrthographic:boolean)=>{
    if (!camera){
        return
    }
 
  const {size} = useThrelte()
  const groupSize = (MaxSize.length() || 10)
 const k = size.current.width/size.current.height;
  if (isOrthographic){
    
   
    const s =groupSize/2;
    const cam = (camera as OrthographicCamera )
    cam.left = -s *k;
    cam.right = s*k;
    cam.top = s;
    cam.bottom = -s;
    cam.position.set(0,0,-s); 
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
			const fov =  (cam?.fov||1)*(Math.PI /180); 	 
			cam.position.setZ( groupSize /2/Math.tan(fov/2)); 	
			//viewDistance =  camera.position.z;	
			cam.aspect = k	;
  }
  		Controls?.target.set(0, 0, 0);
		Controls?.update();

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
  import { T } from '@threlte/core'
  import { OrbitControls } from '@threlte/extras' 


 
  const {
    //MaxSize,
    geometrys,isOrthographic,GridSize,
    //getCamera,getControls,
    solidControlConfig}:{
    //MaxSize:Vector3,
    solidControlConfig:{[k:string]:any},
    //getCamera:(ref:any)=>void,
    //getControls:(ref:any)=>void,
    GridSize:number,
    isOrthographic:boolean,
    geometrys:{geometry:any,material:any}[] 
} = $props()
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


{#if isOrthographic}
<T.OrthographicCamera makeDefault oncreate={(ref) =>{
    camera = ref
} }>
  <OrbitControls   oncreate={ (ref) =>{
    Controls = ref
} } target={[0,0,0]} />
</T.OrthographicCamera>
{:else}
   <T.PerspectiveCamera  args={[40, 1, 0.1, 2000]}
    makeDefault 
   //up={[PerspectiveCameraT.up.x,PerspectiveCameraT.up.y,PerspectiveCameraT.up.z]}  
   position={[10,10,10]} 
    oncreate={(ref) =>{
    camera = ref
}}> 
    <OrbitControls   oncreate={(ref) =>{
    Controls = ref
}} target={[0,0,0]} />
  </T.PerspectiveCamera>
 {/if}
  <T.AmbientLight args={[0x404040, 0.3]} />

  <T.DirectionalLight args={[0xffffff, 1]} position={[5, 10, 7]}   />
  <T.DirectionalLight args={[0xffffff, 0.3]} position={[-5, 5, -5]}/>
  <T.DirectionalLight args={[0xffffff, 0.4]} position={[0, 5, -10]}/>
{#if solidControlConfig.grid}
  <T.GridHelper args={[GridSize,GridSize]} /> 
  {/if}
  {#if solidControlConfig.axes}
  <T.AxesHelper args={[GridSize/2]} />
  {/if}
  {#if geometrys} 
  {#each geometrys as {geometry,material}} 
    <T.Mesh {geometry} {material}> 
    </T.Mesh>
  {/each}  
{/if}