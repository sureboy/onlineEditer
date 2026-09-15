<script lang="ts" module>
//let Details:HTMLDetailsElement
let menu:HTMLElement
let tmpDiv:HTMLButtonElement 
let solidName:HTMLElement;
let basename:string
//let spinner:HTMLElement;
export const moduleInit = (opt:{ 
  //show:boolean,
  list:string[],
  basename:string,
  Clickhandle?:(name:string)=>void} )=>{ 
  if (menu)menu.innerHTML="" 
 
  //Details.style.display="inline"
  if (solidName)solidName.textContent = opt.basename 
  basename = opt.basename
  //console.log("change Main name",solidName)
  opt.list.forEach(m=>{
    const div = tmpDiv.cloneNode(true) as HTMLButtonElement
    div.style.display='inline'
    //div.disabled=!opt.show
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
 const {show}:{show:boolean}  = $props() 
</script>
 
<details      >
  <summary bind:this={solidName} style="cursor: pointer;height:48px;text-align: left;line-height: 48px;"  >
...
</summary> 

<div  style="color:white;text-align: center;{show?"":"display:none;"}" id="module_list" bind:this={menu}     >  
  <button bind:this={tmpDiv}    style="display:none;height:48:px;line-height:48px;cursor: pointer;" >
    ...
  </button> 
</div> 

</details>

 
 