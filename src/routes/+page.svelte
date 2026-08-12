<script lang="ts">
import NavMenu from '$lib/website/NavMenu.svelte'; 
import List from '$lib/website/List.svelte';
import type {itemType} from '$lib/website/List.svelte'
//import {getFileHandleFromOPFS} from "$lib/function/OPFS"; 
import { extractTarStreamToOPFS } from '$lib/function/OPFS'; 

const getLocaldb =async () => {
    const localList:itemType[]= []
    const root = await navigator.storage.getDirectory()  
    for await (const k of root.keys()){
        const l = localList.length;
        const item = {
            title:k,
            url:"/preview#"+encodeURIComponent(k),del:()=>{ 
            if (!window.confirm("delete "+k))return;
            root.removeEntry(k,{recursive:true})
            //window.location.reload(); 
        }}
        localList.push(item) 
    } 
    return localList
} 
</script>
<svelte:head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</svelte:head>
<div style="display: block;  "> 
<NavMenu />
<div style=" padding:25px 5px 5px 5px;"> 
<div><h1>SolidJScad </h1>
   
<p> 高性能几何内核 + 模块化编程 + 完整工具链。
从浏览器在线编辑到本地 IDE 插件，让实体建模如编写 JavaScript 一样自然。</p> 
 <p>在 VS Code 扩展商店中搜索 SolidJSCAD ,
    <a href="https://marketplace.visualstudio.com/items?itemName=WeijieZhao.solidjscad" rel="noopener noreferrer" target="_blank">安装 VSCode 插件</a>
,开始本地化建模创作。
</p>

<p>
    <input type="file" id="uploadTarGzFile" onchange={(event)=>{
        const files = (event.target as HTMLInputElement).files;
        if (!files)return; 
        const file = files[0]
        console.log(file,files)
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