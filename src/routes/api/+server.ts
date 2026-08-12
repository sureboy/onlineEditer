import type { RequestHandler } from './$types';
import modeling from '@jscad/modeling';
import  * as manifold from 'manifold-3d';
import { error,json } from '@sveltejs/kit'; 
//import { mod } from 'three/tsl';
//const Manifold = await  manifold()
//Manifold.setup()
const importMap:{[k:string]:any} = {
    '@jscad/modeling':modeling,
    'manifold-3d':manifold}
export const OPTIONS = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
};
//const tmpModelingMap = new Map<string,any>()
const getFunction = (obj:object,func:(value:any )=>void,parent:string[]=[])=>{
    //const obj_ = obj as {[k:string]:any} 
    Object.keys(obj).forEach(k=>{
        const val = ( obj as {[k:string]:any})[k] 
        const p = [...parent,k]
        const _type = typeof val
        if (_type === "object" ){
            if (Array.isArray(val)){
                func({label:p.join("."),type:'variable',info: val.join("\n")})
            }else{
                
                func({label:p.join("."),type:'property',info: Object.keys(val).join("\n")})
                getFunction(val,func,p)
            }
        }else{

            func({label:p.join("."),type: _type,info:val.toString()})
        } 
    })
}
export const GET: RequestHandler =async (e) => { 
    const key = e.url.searchParams.get("key")  
    if (!key  ){
        error(404); 
    }
         
    const mod = importMap[key]
    if (!mod){
        error(404); 
    }
    const as = e.url.searchParams.get("as")  || ""
    //const jscad = modeling as {[k:string]:any}
    importMap[key]
    const list:any[] = []
    getFunction(typeof mod==="function"?mod():mod,(value)=>{
        //console.log(f,typeof f,p )
        list.push(value)
    },[as])

    return json({ 
        key,
        list
    },{headers:{
    "Access-Control-Allow-Origin":"*",
    }}) 
         
    
    
};