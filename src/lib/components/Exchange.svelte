<script lang="ts" module>
import {jsonToForm,collectFormData} from '$lib/utils/jsonToForm'   
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc"
import { getWorker } from '$lib/worker/globalWorker';
import QRCode from 'qrcode';

//import type {connType} from "$lib/utils/webRTCPool"
type meshInfoType = {
    conn:connType, 
    files:Map<string,RTCDataChannel>
    //remoteStream?: MediaStream,
    //video?:HTMLVideoElement,
    //main?:string,
    //setSender?:(obj:any)=>void, 
} 
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
let showModal = true
export const getDialogDiv = ()=>{
  return DialogDiv
}
const previewHandle =async (data: any)=>{
  if (!data.basename){
    data.basename="main"
  }
  const w = await getWorker() 
  w?.postMessage( data) 
   
}
export const previewModule = (data:{Modal?:boolean,
  name: string; db: string; path: string;},previewHandle:(db:any)=>Promise<void>)=>{
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
const ShowSubmit = (content:HTMLDivElement,db:any,hand:(db:any)=>void)=>{ 
  jsonToForm(db ,content)  
  const btn = document.createElement('button');
  btn.textContent = '确定';
  Object.assign(btn.style, {
      marginTop: '1rem',
      padding: '0.5rem 1rem',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
  });
  btn.onclick = () => { 
      hand(collectFormData(content)) 
  };
  content.appendChild(btn); 
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

export const getFileList =async (path:string,getFile:(db:{name:string,db:string})=>void)=>{
  const w =await getWorker()
  await new Promise((resolve,reject)=>{
    const files = new Set<string>() 
    const handleFiles = (e:any)=>{
      console.log("get list",e.data,files)
      if (e.data.path && e.data.files){
        e.data.files.forEach((f:any) => {
          w.postMessage({name:decodeURIComponent(f.name),src:true})
          files.add(f.name)
        });
        console.log(e.data)
      }
      if (e.data.name && e.data.db){
        getFile(e.data)
        files.delete(e.data.fileName || encodeURIComponent(e.data.name) )
        if (files.size===0){
          files.clear()
          
          w.removeEventListener("message",handleFiles)
          resolve(undefined)
        }
      }
    }
    w?.addEventListener("message",handleFiles)
    w?.postMessage({path,files:true})
  }) 
  
}

export const QRCodeHandle = (path:string)=>{ 
  ShowSubmit(getDialogDiv(),getConnHostJsonStr(),(db)=>{  
    createWebrtcConnFromCenterUrl(db,async (conn)=>{
      const mesh = {conn,files:new Map()}
      getFileList(path,(data)=>{
        const k = encodeURIComponent(data.name)
        const fileCHannel = conn.pc.createDataChannel(k)
        mesh.files.set(k,fileCHannel);
        let getdb = ""
        fileCHannel.onmessage = (e)=>{
          if (e.data==="close"){
            console.log("rtc update",getdb)
            previewHandle({name:e.data.name,db:getdb})
            getdb=""
            return
          } 
          getdb += e.data
        }
        fileCHannel.onopen=async ()=>{   
          fileCHannel.send(data.db) 
          fileCHannel.send("close") 
        }
      })
       
      addMesh(mesh)
      

      closeModal()
    }).then(r=>{
      if (!r.ok){
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
import Dialog,{openModal,closeModal} from '$lib/components/Dialog.svelte';
const {solidControlConfig,
  //previewHandle
}:{ 
    //previewHandle:(db:any)=>Promise<void>,
    solidControlConfig:{[k:string]:any} ,
    //children?:any,
    
} = $props()
//let DialogDiv:HTMLDivElement  
 
const channel = new BroadcastChannel('code-preview'); 
channel.onmessage = (event) => { 
    previewModule(event.data,previewHandle)
    
}; 

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