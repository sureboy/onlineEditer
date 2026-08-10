
<script lang="ts" module>
let editingHashInfo = $state("")
    export const SetEditingHashInfo = (opt:any)=>{
  editingHashInfo =encodeURIComponent(JSON.stringify(opt))
}
</script>
<script lang="ts">
import Camera from "./Camera.svelte";
import MainMenu  from "./MainMenu.svelte";
const {Clickhandle}:{Clickhandle:(name:string|{[k:string]:any})=>void } = $props()
//    const {solidControlConfig}:{solidControlConfig:any} = $props()
    //let {grid,axes} = solidControlConfig;

</script>
<div style="position: absolute;left:5px;top:5px;z-index: 11;cursor: pointer;" class="pointer-events-auto" >
 <div style="color:white;text-align: left;"> 
   <a style="color:white;cursor: pointer;height:48px;text-align: left;line-height: 48px;"  
     href="/">Home</a>
    <a style="color:white;cursor: pointer;height:48px;text-align: left;line-height: 48px;" 
    href="/docs/" data-sveltekit-reload >Docs</a>
</div>
<MainMenu     ></MainMenu>
<Camera {Clickhandle} ></Camera>

<div style="color:white;text-align: left;">
  <a  
  style="color:white;cursor: pointer;height:48px;text-align: left;line-height: 48px;"  
   href="/edit#{editingHashInfo}" target="_blank"> {editingHashInfo?'Edit':'New'} </a>
   </div>
</div>