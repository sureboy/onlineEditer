
<script lang="ts" module>
let editingHashInfo = $state("")
let title= $state("SolidJScad")
export const SetEditingHashInfo = (opt:any)=>{
  if (opt.path){
    title = opt.path
  }
  editingHashInfo =encodeURIComponent(JSON.stringify(opt))
}
</script>
<script lang="ts"> 
import MainMenu  from "./MainMenu.svelte";  
const {
  
  children,
}:{
  children?:any,
 
} = $props() 
</script>
<svelte:head><title>{title}</title></svelte:head>
<div style="position: absolute;left:5px;top:5px;z-index: 11;cursor: pointer;" class="pointer-events-auto" >
 <div style="color:white;text-align: left;"> 
   <a style="color:white;cursor: pointer;height:48px;text-align: left;line-height: 48px;"  
     href="/">Home</a>
    <a style="color:white;cursor: pointer;height:48px;text-align: left;line-height: 48px;" 
    href="/docs/" data-sveltekit-reload >Docs</a>
</div>


{@render children?.()} 
<div style="color:white;text-align: left;">
  <a  
  style="color:white;cursor: pointer;height:48px;text-align: left;line-height: 48px;"  
   href="/edit#{editingHashInfo}" > {editingHashInfo?'Edit':'New'} </a>
   </div>
</div>