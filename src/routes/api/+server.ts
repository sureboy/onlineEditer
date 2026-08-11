import type { RequestHandler } from './$types';
import modeling from '@jscad/modeling';
import { error,json } from '@sveltejs/kit';
import { label } from 'three/tsl';
//import { mod } from 'three/tsl';
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
    //const jscad = modeling as {[k:string]:any}
    const list:any[] = []
    getFunction(modeling,(value)=>{
        //console.log(f,typeof f,p )
        list.push(value)
    },[])
   
    return json({ 
      modeling:list
    },{headers:{
      "Access-Control-Allow-Origin":"*",
    }}) 
};