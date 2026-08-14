import modeling from '@jscad/modeling'; 
import * as fs from "fs"
import * as path from "path"
const getFunction = (obj,func ,parent=[] )=>{
    //const obj_ = obj as {[k:string]:any} 
    Object.keys(obj).forEach(k=>{
        const val = obj[k] 
        const p = [...parent,k]
        const _type = typeof val
        if (_type === "object" ){
            if (Array.isArray(val)){
                func({label:p.join("."),type:'variable',info: val.join("\n")})
            }else{
                
                func({label:p.join("."),type:'property', info:  Object.keys(val).join("\n")})
                getFunction(val,func,p)
            }
        }else{

            func({label:p.join("."),type: _type,info:val.toString()})
        } 
    })
}
const main = ()=>{
    const db = {'@jscad/modeling':[]}
    const file = path.join("static",`${"@jscad/modeling".replace(/[^a-zA-Z0-9\-_]/g, '')}.json`)
    //fs.rmSync(file)

    
    getFunction(modeling,(v)=>{
        db['@jscad/modeling'].push(v)
        console.log(v) 
    })
    fs.writeFile(file,JSON.stringify(db,undefined,2),(err) => {
        if (err) {
            console.error('写入文件失败:', err);
        } else {
            console.log('文件内容已被成功覆盖！');
        }
    });
}
main()
console.log("test")