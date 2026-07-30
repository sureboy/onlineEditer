<script lang="ts" module>
let menu:HTMLElement
let tmpDiv:HTMLButtonElement 
let solidName:HTMLElement;
export const moduleInit = (modulelist:{list:string[],basename:string,Clickhandle?:(name:string)=>void} )=>{
    menu.innerHTML="" 
    solidName.textContent = modulelist.basename 
    //console.log("change Main name",solidName)
    modulelist.list.forEach(m=>{
      const div = tmpDiv.cloneNode(true) as HTMLButtonElement
      div.onclick = (e)=>{
        solidName.textContent=m
        modulelist.Clickhandle?.(m)
      }
      div.textContent = m;
      menu.appendChild(div)
    }) 
}
</script>
<script lang="ts" > 
  //const {Clickhandle}:{Clickhandle:(name:string)=>void} = $props()
  
</script>
 
<details    >
    <summary bind:this={solidName} style="cursor: pointer;height:48px;text-align: left;line-height: 48px;"  >
...
</summary> 
<div  style="color:white;text-align: center;" id="module_list" bind:this={menu}     > 
  <button bind:this={tmpDiv}  style="height:48:px;line-height:48px;cursor: pointer;" >
    ...
  </button> 
</div> 
</details>
 