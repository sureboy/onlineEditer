<script lang="ts">
import Camera from "./Camera.svelte";
import MainMenu  from "./MainMenu.svelte";
const {Clickhandle}:{Clickhandle:(name:string|{[k:string]:any})=>void } = $props()
//    const {solidControlConfig}:{solidControlConfig:any} = $props()
    //let {grid,axes} = solidControlConfig;

</script>
<div style="position: absolute;left:5px;top:5px;z-index: 11;cursor: pointer;" class="pointer-events-auto" >
 
<MainMenu     ></MainMenu>
<Camera {Clickhandle} ></Camera>
</div>