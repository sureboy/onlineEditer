<script lang="ts">
import Camera from "./Camera.svelte";
import MainMenu,{moduleInit} from "./MainMenu.svelte";
const {Clickhandle}:{Clickhandle:(name:string|{[k:string]:any})=>void } = $props()
//    const {solidControlConfig}:{solidControlConfig:any} = $props()
    //let {grid,axes} = solidControlConfig;

</script>
<div style="position: absolute;left:5px;top:5px;z-index: 11;cursor: pointer;" class="pointer-events-auto" >
<details    >
    <summary  style="cursor: pointer;height:48px;text-align: left;line-height: 48px;"  >
test
</summary>
<div  style="color:white;text-align: center;"> 

      <button   style="height:48:px;line-height:48px;cursor: pointer;" >
    btdd
  </button> 
</div> 
</details>
    <MainMenu     ></MainMenu>
<Camera {Clickhandle} ></Camera>
</div>