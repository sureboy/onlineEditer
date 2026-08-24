<script lang="ts">
//import {downloadOpfsAsTarGz} from '$lib/function/OPFS'
import type { ThrelteContext } from '@threlte/core'
import {  WebGLRenderer } from 'three';
import {createPng} from '$lib/function/localImg'
import { exportTo3MF } from 'three-3mf-exporter'; 
import {STLExporter} from "three/addons/exporters/STLExporter.js" ; 
import { createTarPacker,createTarDecoder } from 'modern-tar';
import {getFileList} from '$lib/components/Exchange.svelte'
//let Details:HTMLDetailsElement

const {title,DownHandle,show,children } :{  
  DownHandle:  (fn:(e:ThrelteContext<WebGLRenderer>)=>any)=>void, 
  title:string,show:boolean,children?:any,
} = $props()
const downSTLclick=()=>{
  DownHandle( ( e )=>{
    const { scene} = e
    const res = new STLExporter().parse(scene,{binary: true});
    const blob = new Blob([res.buffer as ArrayBuffer], { type: 'application/octet-stream' })
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    //console.log(workermsg)
    link.download = `${title}.stl`; 
    link.click();
    URL.revokeObjectURL(link.href); 
  })
}
const down3MFclick=()=>{
  DownHandle(async ( e )=>{
    const { scene} = e
    const blob = await exportTo3MF(scene)
    // const blob = new Blob(data,{ type: mimeType3mf } )
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    console.log(blob,link.href)
    link.download = `${title}.3mf`; 
    link.click();
    URL.revokeObjectURL(link.href);      
  })
}
const downPngClick=()=>{
  //const context = await DownHandle()
  DownHandle( ( e )=>{
    const {renderer:mainRenderer,scene,camera} = e 
    const width = mainRenderer.domElement.width;
    const height = mainRenderer.domElement.height;
    const pixelRatio = mainRenderer.getPixelRatio();

    // 1. 创建离屏渲染器（不添加到 DOM）
    const offscreenRenderer = new WebGLRenderer({
      preserveDrawingBuffer: true, // 关键！
      antialias: true, // 可选，保持抗锯齿
      alpha: true, // 如果需要透明背景，可设为 true
    });
    offscreenRenderer.setSize(width, height);
    offscreenRenderer.setPixelRatio(pixelRatio);
    offscreenRenderer.render(scene, camera.current); 
    const screenCanvas = createPng(offscreenRenderer.domElement) 
    let aTag = document.createElement('a'); 
    aTag.download = `${title}.png`;  
    aTag.href = screenCanvas?.toDataURL()||"";
    aTag.click();
    //screenImgList.add(href)
    URL.revokeObjectURL(aTag.href);  
    offscreenRenderer.dispose(); 
  })
}
async function downloadOpfsAsTarGz(path:string, archiveName = 'archive.tar.gz') {
  // 1. 创建 tar 打包器
  const { readable, controller } = createTarPacker();

  // 2. 异步遍历目录并添加文件到 tar 包
  (async () => {
    try {
      await getFileList(path,async(db)=>{
        const fileStream = controller.add({name:db.name,size:db.db.length,type: 'file'})
        const writer = fileStream.getWriter();
 
        await writer.write(new TextEncoder().encode(db.db));
        await writer.close();
      })
       
    } finally {
      // 所有文件添加完成后，必须 finalize
      controller.finalize();
    }
  })();

  // 3. 使用浏览器原生 API 进行 gzip 压缩
  const compressedStream = readable.pipeThrough(new CompressionStream('gzip'));

  // 4. 将压缩流转换为 Blob 并触发下载
  const reader = compressedStream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const blob = new Blob(chunks, { type: 'application/gzip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = archiveName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>
<details    style="display:{show?"inline":'none'};"   >
    <summary style="cursor:pointer;height:48px;text-align:left;line-height: 48px;" >
       Function
    </summary>
    <div >
    <button style="height:48:px;line-height:48px;cursor: pointer;" onclick={async(e)=>{
      console.log(e)
      const fileName = `${title}.tar.gz`
      try{
 
        if (window.confirm(`Download ${fileName}  now?`)){ 
          await downloadOpfsAsTarGz(title,fileName) 
        }
      }catch(err){
        
        console.error(err)
        window.alert(err)
      }
    }} >Gzip</button>  
          <button style="height:48:px;line-height:48px;cursor: pointer;" onclick={downPngClick} >Png</button>      

          <button style="height:48:px;line-height:48px;cursor: pointer;" onclick="{downSTLclick}" >STL</button>  
      <button style="height:48:px;line-height:48px;cursor: pointer;" onclick="{down3MFclick}" >3MF</button>  
{@render children?.()} 
   


        </div> 
 
</details>

 