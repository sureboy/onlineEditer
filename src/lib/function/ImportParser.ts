import { initSync, parse } from 'es-module-lexer';

initSync()
type messageObj = {
    name:string,
    db?:ArrayBuffer | string | any
}
export type currentObj = { 
    url?:string;
    persons:Set<currentObj>;
    srcList:((()=>Promise<currentObj> )|string)[]
    getUri:()=>Promise<string>;

} & messageObj
const currentMap = new Map<string,currentObj>();
const waitGetMap = new Map<string,(c:currentObj)=>void>();
const decoder = new TextDecoder();

const updateCurrent = (c:currentObj)=>{
    //console.log("update",c.name);
    if (!c.url){
        return;
    }
    //objUrlMap.delete(c.url);
    URL.revokeObjectURL(c.url);
    c.url = '';
    
    c.persons.forEach((p:currentObj)=>{
        updateCurrent(p);
    });
};
const reloadCurrent =async (c:currentObj,msg:messageObj,postMessage?:(e:any)=>void)=>{
    updateCurrent(c);

    //this.code = ;
    //this.src = [];
    c.srcList = [];
    if (!msg.db){
        return;
    }
    let src = "";
    if (typeof msg.db ==="string"){
        src = msg.db;
    }else if ( msg.db instanceof ArrayBuffer){
        src = decoder.decode(msg.db);
    }else{
        console.log(msg,typeof msg.db);
        return;
    } 
    let tmpEndPos:number = 0; 
    
    const [imports,exports] = parse(src, msg.name);
    imports.forEach(val=>{
        //val.s 
        if (val.n){        
            c.srcList!.push( src.slice(tmpEndPos,val.s) );
            c.srcList!.push( ()=>getCurrent(val.n||"",postMessage) );
            tmpEndPos = val.e;
        }
    })
    /*
    importParser(src).forEach(p=>{
        c.srcList!.push( src.slice(tmpEndPos,p.startPosition) );
        c.srcList!.push( ()=>getCurrent(p.moduleName,postMessage) );
        tmpEndPos = p.endPosition;
    });*/
    c.srcList.push( src.slice(tmpEndPos) ); 
};
const getCurrent = (name:string,reqMessage?:(e:{type:"req",path:string})=>void )=>{
    return new Promise<currentObj>((resolve, reject)=>{
        if (currentMap.has(name)){
            resolve(currentMap.get(name)!);
            return ;
        }
        if (!reqMessage ){
            //console.log("not reqmsg",name);
            resolve(InitCurrentMap({name})); 
            return;
        }
        reqMessage({type:"req",path:name});
        //console.log("getCur",name)
        const t = setTimeout(()=>{
            waitGetMap.delete(name);
            //console.log("timeOUt")
            resolve(InitCurrentMap({name}));
        }, 2000);
        waitGetMap.set(name,(c:currentObj)=>{
            clearTimeout(t);
            resolve(c);   
            waitGetMap.delete(name);
        });     
        //console.log("getCur",name)   
    }); 
};
const InitCurrentMap = (v:messageObj)=>{
    // v.code = decoder.decode(v.db)
    const cur = {
        persons:new Set<currentObj>(),
        getUri:async ()=>{
            return toStringCurrent(cur);     
        },  
        srcList:[]   ,   
        ...v
    } as currentObj;
    return cur;
};
const toStringCurrent = async (c:currentObj)=>{
    //console.log(new URL(import.meta.url).origin);
    if (c.url){
        return c.url;
    }
    if (c.srcList.length===0){
        return new URL(c.name,new URL(import.meta.url).origin).toString();
    }
    let code ="";
    for (const src of c.srcList){ 
        if (typeof src ==="string"){
            code+=src;
        }else{
            const obj =await src();
            code += await obj.getUri();
            if (typeof obj !=="string" && obj.persons){
                obj.persons.add(c);
            }
        }
    };
    if (!code){
        //return c.name;
        return new URL(c.name,new URL(import.meta.url).origin).toString();
    }
    
    c.url = URL.createObjectURL(new Blob([code],{type:'application/javascript'}));
    //console.log(code);
    //objUrlMap.set(c.url,c.name) 
    return c.url;  
};


export const handleCurrentMsg =(
    message:messageObj,
    postMessage?:(e:any)=>void
)=>{
    if (!message.name){         
        return;
    }  
    let cur:currentObj;
    if (!currentMap.has(message.name)){
        cur = InitCurrentMap(message);
        currentMap.set(message.name,cur);
    }else{
        cur = currentMap.get(message.name)!;        
    }
    reloadCurrent(cur,message,postMessage);
    //if (waitGetMap.has(message.name)){
        
    waitGetMap.get(message.name)?.(cur);  
    //}
    return cur
};