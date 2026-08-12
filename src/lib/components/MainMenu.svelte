<script lang="ts" module>
//let Details:HTMLDetailsElement
let menu:HTMLElement
let tmpDiv:HTMLButtonElement 
let solidName:HTMLElement;
 
export const moduleInit = (opt:{
  //moduleInfo?:any,
  list:string[],
  basename:string,
  Clickhandle?:(name:string)=>void} )=>{ 
  menu.innerHTML="" 
 
  //Details.style.display="inline"
  solidName.textContent = opt.basename 
  //console.log("change Main name",solidName)
  opt.list.forEach(m=>{
    const div = tmpDiv.cloneNode(true) as HTMLButtonElement
    div.style.display='inline'
    div.onclick = (e)=>{
      solidName.textContent=m
      opt.Clickhandle?.(m)
    }
    div.textContent = m;
    menu.appendChild(div)
  }) 
  //menu.append(tmpDiv)
}
</script>
<script lang="ts">
  const { show } :{  
   show:boolean
} = $props()
</script>
<details   style="display:{show?"inline":'none'};"  >
  <summary bind:this={solidName} style="cursor: pointer;height:48px;text-align: left;line-height: 48px;"  >
...
</summary> 
<div  style="color:white;text-align: center;" id="module_list" bind:this={menu}     > 
  <button bind:this={tmpDiv}    style="display:none;height:48:px;line-height:48px;cursor: pointer;" >
    ...
  </button> 
</div> 

</details>
 
 
 