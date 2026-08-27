<script lang="ts">
 
import NavMenu from '$lib/components/NavMenu.svelte'; 
import List from '$lib/website/List.svelte';
import type {itemType} from '$lib/website/List.svelte'
 
import { extractTarStreamToOPFS } from '$lib/function/tar'; 
import { onMount } from 'svelte';
import {createStorage} from '$lib/storage-adapter/factory' 
import Dialog,{openModal,closeModal} from '$lib/components/Dialog.svelte'; 
import {jsonToForm,collectFormData,ShowSubmit} from '$lib/utils/jsonToForm'    
let DialogDiv:HTMLDivElement
let title = ""
const getConnHostJsonStr = ()=>{
    return  {
        _comment:"webRTC P2P",
        id:"",
        id_comment:"输入识别id",
        path:"SolidJSCAD",
        path_comment:"模型名称",
        //create:true,
        //create_comment:"[生成/加入]WebRtc会话",
        host_comment:"信令交换服务公共网址",
        host:"https://www.zaddone.com/rtc"
    }  
} 
onMount(() => {

    
    
});
const webRTCP2P = ()=>{
    openModal()
    ShowSubmit(DialogDiv,getConnHostJsonStr(),(db)=>{  
        console.log(db)
        if (!db.id){
            alert("id is NULL!! ")
            return
        }
        if (!db.host){
            db.host = 'https://www.zaddone.com/rtc'
        }
        //DialogDiv.innerHTML=""
        const editPage = document.createElement("a")
        editPage.href = "/edit#"+encodeURIComponent(JSON.stringify(db))
        editPage.textContent = db.path
        DialogDiv.appendChild(editPage)
        editPage.click()

    })
    
}
const getLocaldb =async () => {
    const storage = createStorage()
    const localList:itemType[]= []
    //createStorage().listFiles()
    //const root = await navigator.storage.getDirectory()  
    for (const path of await storage.listDirectories()){
        const l = localList.length;
        const item = {
            title:path,
            url:"/preview#"+encodeURIComponent(JSON.stringify({path})),del:()=>{ 
            if (!window.confirm("delete "+path))return;
            //root.removeEntry(path,{recursive:true})
            storage.deleteDirectory(path)
            //window.location.reload(); 
        }}
        localList.push(item) 
    } 
    return localList
} 
</script>
 
<div style="display: block;  "> 
<NavMenu menuItems = {[
     { key: 'webRTC', label: 'P2P连接',url:"/#webRTC", click:()=>{
        const btn = document.getElementById("webRTC")

        btn?.click()
    } },
    { key: 'start', label: '开始',url:"/edit/" },
    { key: 'open', label: '打开',url:"/#open", click:()=>{
        const btn = document.getElementById("open")
        btn?.click()
    } },
    { key: 'help', label: '文档',url:"/docs/" }
  ]} />
<div style=" padding:25px 5px 5px 5px;"> 
<div><h1>SolidJScad </h1>
   
<p> 高性能几何内核 + 模块化编程 + 完整工具链。
从浏览器在线编辑到本地 IDE 插件，让实体建模如编写 JavaScript 一样自然。</p> 
 <p>在 VS Code 扩展商店中搜索 SolidJSCAD ,
    <a href="https://marketplace.visualstudio.com/items?itemName=WeijieZhao.solidjscad" rel="noopener noreferrer" target="_blank">安装 VSCode 插件</a>
,开始本地化建模创作。
</p>
<p>
    <button id="webRTC" onclick={(e)=>{
        console.log("Open")
        webRTCP2P()
    }}>P2P连接</button>
    <a href="/edit">Create a project</a>
</p>
<p>
    <input type="file" id="open"  onchange={(event)=>{
        const files = (event.target as HTMLInputElement).files;
        if (!files)return; 
        const file = files[0]
        //console.log(file,files)
        extractTarStreamToOPFS(file).then(()=>{
          window.location.reload();
        })         
    }} />
    <a href="/edit">Create a project</a>
</p>
</div>
<h1>实例</h1>
{#await getLocaldb() then localList}
    <List list={localList} ></List>  
{/await} 
</div>

</div>
<Dialog title = {title }  >
  
     <div bind:this={DialogDiv}>test</div> 
 </Dialog>