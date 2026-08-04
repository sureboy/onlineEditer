<script lang="ts">
import NavMenu from '$lib/website/NavMenu.svelte'; 
import List from '$lib/website/List.svelte';
import type {itemType} from '$lib/website/List.svelte'
//import {getFileHandleFromOPFS} from "$lib/function/OPFS"; 
import { createTarDecoder } from 'modern-tar'; 

async function extractTarStreamToOPFS( tarFile:File) { 
    const fileStream = tarFile.stream(); 
    const decompressedStream = fileStream.pipeThrough(new DecompressionStream('gzip')); 
    const tarStream = decompressedStream.pipeThrough(createTarDecoder());
    const PathName = tarFile.name.split('.')[0]
    //const decompressedStream = tarFile.stream()
    //    .pipeThrough(new DecompressionStream('gzip'));
    
    // 将解压后的流（TAR 数据）转换为 Uint8Array
    //const tarBuffer = new Uint8Array(await new Response(decompressedStream).arrayBuffer());
    //const tarStream = decompressedStream.pipeThrough(createTarDecoder());
    // 使用 modern-tar 解包 TAR 数据
    //const entries = await unpackTar(tarBuffer);
    const root = await navigator.storage.getDirectory();
    const dirHandle =await root.getDirectoryHandle(PathName,{create:true})
    const reader = tarStream.getReader();
    try {
        while (true) {
            const { value: entry, done } = await reader.read();
            if (done) break;

            //const path = entry.header.name.replace(/^\.?\/?/, '');
            //const lastSlash = path.lastIndexOf('/');
            //const parentDir = lastSlash !== -1 ? path.substring(0, lastSlash) : '';

            if (entry.header.type === 'file') { 
              console.log(entry)
              const f = await dirHandle.getFileHandle(encodeURIComponent(entry.header.name),{create:true})
              //dirHandle.getFileHandle()
              //const f =await getFileHandleFromOPFS( entry.header.name,{create:true,root}) 
              const w =await  f.createWritable() 
              await entry.body.pipeTo(w); 
            }
        }
    } finally {
        reader.releaseLock();
    } 
  }

const getLocaldb =async () => {
    const localList:itemType[]= []
    const root = await navigator.storage.getDirectory()  
    for await (const k of root.keys()){
        const l = localList.length;
        const item = {
            title:k,
            url:"/preview#"+k,del:()=>{ 
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
</p>
</div>
<h1>实例</h1>
{#await getLocaldb() then localList}
    <List list={localList} ></List>  
{/await} 
</div>

</div>