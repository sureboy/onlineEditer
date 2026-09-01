<script lang="ts" module>
import {
  //jsonToForm,
  //collectFormData,
  ShowSubmit} from '$lib/utils/jsonToForm'   
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc"
import { getWorker } from '$lib/worker/globalWorker';
import QRCode from 'qrcode';
import {getFileList,getFileData} from "$lib/function/tar"
import {initDoc,diffUpdate} from "$lib/utils/yjs"
import * as Y from 'yjs'

type meshInfoType = {
    conn:connType, 
    files:Map<string,{d:RTCDataChannel,y:Y.Doc}>
} 
let channel:BroadcastChannel|undefined=$state(undefined)
const meshList:(meshInfoType|null)[] =$state([])
const addMesh = (m:meshInfoType)=>{ 
  for (let i=0;i<meshList.length;i++){
    const v = meshList[i]
    if (v && v.conn.id ===m.conn.id){
      meshList[i] = m
      return
    }
  }
  const len = meshList.length;
  m.conn.onClose = ()=>{
    if (meshList[len]) meshList[len] = null
    console.log("----",m)
  }
  meshList.push(m)
}
let DialogDiv:HTMLDivElement
let showModal = false
export const getDialogDiv = ()=>{
  return DialogDiv
}
export const previewHandle =async (data: any,onmessage?: (e: MessageEvent) => void)=>{
  if (!data.basename){
    data.basename="main"
  }
  //console.log(data,onmessage)
  const w = await getWorker(onmessage) 
  w?.postMessage( data) 
   
}
const previewModule = (data:{Modal?:boolean,
  name: string; db: string; path?: string;} )=>{
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
        const btn = document.createElement("button")
        btn.textContent =  data.name ||"Preview"
    //tmpList.push(window.localStorage.key(i))
        btn.onclick = ()=>{
            //previewHandle()
          previewHandle(data) .then(()=>{ 
            //w?.postMessage(msg) 
            closeModal()
          }) 
        }

        DialogDiv.append(p,p1,btn)
        
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
 
const getConnHostJsonStr = ()=>{
    return  {
        _comment:"跨网信令交换服务",
        id:Date.now().toString(32).slice(4),
        id_comment:"[加入]端需要输入[生成]端的id",
        create:true,
        create_comment:"[生成/加入]WebRtc会话",
        host_comment:"信令交换服务公共网址",
        host:"https://www.zaddone.com/rtc"
    }  
} 

 
export const QRCodeHandle = (path:string)=>{ 
  ShowSubmit(getDialogDiv(),getConnHostJsonStr(),(db)=>{  
    createWebrtcConnFromCenterUrl(db,async (conn)=>{
      const mesh = {conn,files:new Map()}
      getFileList(path,(data,w)=>{
        //const k =  data.name
        const fileCHannel = conn.pc.createDataChannel(`${data.name}_${conn.dc?.label}`)
        fileCHannel.addEventListener("close",(e)=>{
          console.log(data.name,"pc close")
        })
        const {ydoc} =initDoc(data.name,fileCHannel,(text)=>{
          const postdb = {name:data.name,db:text} 
          console.log(channel,postdb)
          channel?.postMessage(postdb)
          previewModule(postdb) 
        } )!
        
        mesh.files.set(data.name,{d:fileCHannel,y:ydoc}); 
        fileCHannel.onopen=async ()=>{   
          //ydoc.getText("content").insert(0, data.db);
          const ytext = ydoc?.getText("content")
          if (ytext?.length===0){
            ytext.insert(0,data.db)
          }
          //const tempDoc = new Y.Doc();
          //tempDoc.getText('content').insert(0, data.db);
          const update = Y.encodeStateAsUpdate(ydoc!);
          fileCHannel.send(update as Uint8Array<ArrayBuffer>)
          //Y.applyUpdate(ydoc, update,(conn.dc?.label||"preview")+'_edit');  
        }
      })
       
      addMesh(mesh)
      

      closeModal()
    }).then(ok=>{
      if (!ok){
        return
      }
      ShowQRImg(db,path)
    })
  }); 


  openModal()
}
const ShowQRImg = (db:any,path:string)=>{
  let url = `${window.location.protocol}//${window.location.host}/edit#${encodeURIComponent(
    JSON.stringify({
      path,
      id:db.id,
      host:db.host})
  )}`
  console.log(url)
  QRCode.toDataURL(url,{
    width: 200, 
    color: {
      dark: '#3b82f6',
      light: '#ffffff'
    }
  }).then(src=>{
    getDialogDiv().innerHTML=`<h2>${db.id}</h2>`
    const img = document.createElement("img")
    img.src = src
    getDialogDiv().append(img)
  }) 
}

</script>
<script lang="ts">
import type {connType} from "$lib/utils/webRTCPool"
import type {ConfigType} from "$lib/components/OrthoScene.svelte"
import Dialog,{openModal,closeModal} from '$lib/components/Dialog.svelte'; 
//import {onMount} from 'svelte'
const {
  solidControlConfig, 
}:{ 
  solidControlConfig:ConfigType     
} = $props() 

$effect(() => {
  if (!solidControlConfig.title || channel){
    return;
  }
  channel = new BroadcastChannel(solidControlConfig.title); 
  //console.log(title,channel)
  channel.onmessage = (event) => { 
    //console.log(event.data)
    previewModule(event.data) 
    const handle = initDoc(event.data.name)
    if (handle){
      getFileData(event.data.name).then(db=>{ 
        diffUpdate(db.db,handle.ydoc) 
      })
    }
  }; 
})


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
          console.log(e)
          return;
            mesh?.conn.dc?.send(JSON.stringify({  
                name:"local" ,
                msg: 0,
                 
            })) 
        }}>reload </button> 
    </div>
</details>
{/if}
{/each}