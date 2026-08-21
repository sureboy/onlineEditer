<script lang="ts" module>
let DialogDiv:HTMLDivElement
export const getDialogDiv = ()=>{
  return DialogDiv
}
</script>
<script lang="ts">
import type {connType} from "$lib/utils/webRTCPool"
import Dialog,{openModal,closeModal} from '$lib/components/Dialog.svelte';
const {solidControlConfig,previewHandle}:{ 
    previewHandle:(db:any)=>Promise<void>,
    solidControlConfig:{[k:string]:any} ,
    //children?:any,
    
} = $props()
//let DialogDiv:HTMLDivElement 
let showModal = true
type meshInfoType = {
    conn:connType, 
    files:Map<string,RTCDataChannel>
    //remoteStream?: MediaStream,
    //video?:HTMLVideoElement,
    //main?:string,
    //setSender?:(obj:any)=>void, 
} 
const meshList:(meshInfoType|null)[] =$state([])

const channel = new BroadcastChannel('code-preview'); 
channel.onmessage = (event) => { 
    previewModule(event.data)
    
};
const previewModule = (data:{Modal?:boolean,
  name: string; db: string; path: string;})=>{
  if (data.Modal&&showModal ) { 
      if (DialogDiv){
        DialogDiv.innerHTML=''
        const p = document.createElement("p")
        p.textContent = `'${data.name}' has been changed.`
        const p1 = document.createElement("p")
        const check = document.createElement("input")
        check.type="checkbox"
        check.checked = false
        check.onclick = (e)=>{
          showModal = !check.checked
        }
        const label = document.createElement("label")
        label.textContent = "Do not display"
        p1.append(check,label)

        DialogDiv.append(p,p1,createBtnStartPreview(data,"Preview"))
        
        //DialogDiv.append()
        openModal() 
      } 
    }else{
      closeModal();
      previewHandle(data)
      //getWorker(onmessageListen).then( w=>{ 
      //  w?.postMessage( data) 
      //  closeModal()
      //}) 
    }
}
  const createBtnStartPreview = (msg:{name:string,db:string,path:string},btnName?:string)=>{
    const btn = document.createElement("button")
    btn.textContent =btnName || msg.name
    //tmpList.push(window.localStorage.key(i))
    btn.onclick = ()=>{
        //previewHandle()
      previewHandle(msg) .then(()=>{ 
        //w?.postMessage(msg) 
        closeModal()
      }) 
    }
    return btn
  }
</script>
<Dialog title = {solidControlConfig.title||""}  >
  
     <div bind:this={DialogDiv}>test</div> 
 </Dialog>
{#each meshList as mesh,k }
{#if mesh}
  <details    >
    <summary   style="cursor: pointer; text-align: left;height:48px; line-height: 48px;"  >
        {mesh.conn.id}
    </summary>
    <div   style="color:white;text-align: center;" >
        <button onclick={(e)=>{
            mesh.conn.dc?.send(JSON.stringify({  
                name:"local" ,
                msg: 0,
                 
            })) 
        }}>reload </button> 
    </div>
</details>
{/if}
{/each}