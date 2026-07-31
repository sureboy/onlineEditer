<script lang="ts" module>
   export type itemType ={
        img?:string,
        expiration?:number,
        email?:string,
        title:string, 
        save?:(e:any)=>void,
        del?:(e:any)=>void,
        update?:number,
        url?:string
    }
</script>
<script lang="ts">
//import {imgStorage} from "$lib/website/localImg"


let { list }: { list:itemType[]}  = $props();

const getItemImg =async (item:itemType)=>{
    if (item.img){
        return item.img
    }
    //const img = (await imgStorage.get(item.url)) as Blob|null
    //const img =null
    //console.log(item.url,img)
    //if (img){
    //    item.img =URL.createObjectURL(img)
    //}else{
        item.img = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+CiAgPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHg9IjEwIiB5PSIxMCIgZmlsbD0iI2Y4ZjlmYyIgc3Ryb2tlPSIjZDBkNWRjIiBzdHJva2Utd2lkdGg9IjIiIHJ4PSI4Ii8+CiAgPHBhdGggZD0iTTQwIDUwIEw1MCA2MCBMNzAgMzAiIHN0cm9rZT0iIzljYTNhZiIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjcwIiByPSI4IiBmaWxsPSIjZTBlMGUwIi8+CiAgPHJlY3QgeD0iNjAiIHk9IjUwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiNlMGUwZTAiLz4KICA8cGF0aCBkPSJNNDUgODAgTDc1IDUwIiBzdHJva2U9IiNjY2MiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4="
    //}
    return item.img

}
//let dataPromise = fetch('/api/data').then(r => r.json());
</script>

 
<div class="gallery"> 
{#each  list as item,i }

 <figure  >
    {#await getItemImg(item) then url }
    {#if url}
     <img src={url} alt="{item.title}" width="800" height="600"/>

        {/if}
    {/await }
    
   
    <figcaption> 
        <h3> <a href="{item.url?.startsWith("/")?item.url:`/#${item.url}`}"   >{ item.title||item.url}</a></h3>
        {#if item.email}<p> {item.email}</p>{/if}
        {#if item.update}<p>begin:{new Date(item.update).toLocaleDateString()}</p>{/if}
        {#if item.expiration}<p>end:{new Date(Number(item.expiration)*1000).toLocaleDateString()}</p>{/if} 
        {#if item.save}
            <button  onclick={item.save}>save</button>
              {/if}
        {#if item.del}
            <button onclick={item.del}>X</button>
        {/if}
    </figcaption>
</figure>
{/each} 
</div>
 
<style>
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
        
    
    /* 图片网格布局 - 使用CSS Grid，原生支持 */
    .gallery {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
        max-width: 1400px;
        margin-left: auto;
        margin-right: auto;
    }
    
    figure {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        transition: transform 0.3s ease;
    }
    
    figure:hover {
        transform: translateY(-5px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.15);
    }
    
    img {
        width: 100%;
        height: 250px;
        object-fit: cover;
        display: block;
        border-bottom: 1px solid #eee;
    }
    
    figcaption {
        padding: 15px;
        text-align: center;
    }
    
    figcaption h3 {
        margin-bottom: 8px;
        color: #2c3e50;
    }
    
    figcaption p {
        color: #666;
        font-size: 0.9rem;
    }
    
        
    
    /* 响应式设计 */
    @media (max-width: 768px) {
        .gallery {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        }
        
        
    }
    
    @media (max-width: 480px) {
        .gallery {
            grid-template-columns: 1fr;
        }
        
        
    }
</style>