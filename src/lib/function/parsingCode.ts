import { autocompletion,CompletionContext } from '@codemirror/autocomplete'; 
//import jscadCompletions from '$lib/assets/jscadCompletions.json';
import { snippets } from '@codemirror/lang-javascript';
import type {CompletionResult} from '@codemirror/autocomplete'
import { javascriptLanguage, } from '@codemirror/lang-javascript';
//import {TreeCursor}  from '@codemirror/lang-javascript'
import { type TreeCursor } from '@lezer/common'; 
let cadImport:{[k:string]:any} = {}
let VariableList:any[] = []
const ImportVarList:{[k:string]:{doc:string,tree:TreeCursor,list:any[]}}  = {}
export function jscadModelingCompletionSource (context:CompletionContext): CompletionResult | null  {
    let word = context.matchBefore(/[\w.]+/);
    if (!word || (word.from == word.to && !context.explicit)) return null; 
    let opt = cadImport[word.text.slice(0,word.text.indexOf('.'))] as any[]
    if (opt){
        const lastd =word.text.lastIndexOf(".")
        
        const k = word.text.slice(lastd+1)
        //console.log(lastd,k)
        opt = opt.filter(item => item.label.startsWith(word.text))
        if (k){
            return { 
                from: word.from , 
                options: opt,
                validFor: /^[\w.]*$/ 
            };
        }else{
            //return null
            return { 
                from: word.from , 
                options: opt.filter(item =>  item.label.lastIndexOf(".") ===lastd ) ,
                validFor: /^[\w.]*$/ 
            };
        }
    }else{
         
        if (ImportVarList){
            for (const [k,v] of Object.entries(ImportVarList)){
                VariableList.push(...v.list )
                v.list = []
                //while (v.list.length) VariableList.push(v.list.shift())
              
            }
            //VariableList.push(...ImportVarList)
            //ImportVarList.length = 0; 
        }
        //console.log(VariableList)
        opt = VariableList.filter(item=>item.label.startsWith(word.text))
        //opt = opt.concat(...ImportVarList.filter(item=>item.label.startsWith(word.text)));
        if (opt.length>0)
        return { 
            from: word.from , 
            options: opt  ,
            validFor: /^[\w.]*$/ 
        };
        //else{
            
        //}
    }
 
    return {
        from: word.from,
        options:snippets 
    };
   
};
//const baseExtensions = 

export function getImportAliases(doc: string,name:string) { 

    const tree = javascriptLanguage.parser.parse(doc); 
    let iter = tree.cursor();
    let val = ImportVarList[name]
    if (!val){
        val = {doc,tree:iter,list:[]}
    }else{
        val.list=[]
        val.doc= doc
        val.tree = iter;
    }

    VariableList=[]
    do {
        switch (iter.name as string){
            case "ImportDeclaration":
                if (iter.firstChild())
                    handleTreeCursorImport (iter,doc) 
                break;
                
            case "VariableDeclaration":
                if (iter.firstChild()){
                    VariableList.push(handleTreeCursorVariable (iter,doc) )
                //}else{
                    //console.log(doc.slice(iter.from, iter.to))
                }
                break;
            case "FunctionDeclaration":
                if (iter.firstChild()){
                    VariableList.push(handleTreeCursorFunction(iter,doc))
                }
                break;
            case "ClassDeclaration": 
                if (iter.firstChild()){
                    VariableList.push( handleTreeCursorClass(iter,doc))
                }
                break
            //case "ExportDeclaration":
            //    console.log( "e",iter.name, doc.slice(iter.from, iter.to));
            //    break;
            //default:
            //    console.log("--",iter.name, doc.slice(iter.from, iter.to));
        }

    } while (iter.next());
    //VariableList = ImportVarList
    //VariableList = Array.from(new Set(VariableList))

    //return jscadKey
    //return aliases;
}

const handleTreeCursorImport  = (iter:TreeCursor,doc: string)=>{
    const importInfo = {as:'',key:''}
    do {
        switch (iter.name as string){
            case "VariableDefinition":
                importInfo.as = doc.slice(iter.from, iter.to)
                VariableList.push({type:'variable',label:importInfo.as})
                break;
            case "String":
                importInfo.key = doc.slice(iter.from, iter.to)
                break;
        }
    } while (iter.nextSibling());
    iter.parent()
    fetch(`/${importInfo.key.replace(/[^a-zA-Z0-9\-_]/g, '')}.json`).then(r=>{
        if (!r.ok)return;
        r.json().then(v=>{
            
            cadImport[importInfo.as] = v.list.map((l:any)=>{
                l.oriLabel = l.label 
                l.label = importInfo.as +'.'+l.oriLabel
                const info = l.info
                l.info = ()=>{
                    const dom = document.createElement("textarea")
                    dom.value = info
                    dom.readOnly=true
                    dom.rows = 10 
                    return {dom}
                }
                return l
            })
            //cadImport[importInfo.as] = v.list
        })
    }) 
}
const handleTreeCursorVariable  = (iter:TreeCursor,doc: string)=>{
    const Variable = {type:'variable',label:''}
    do {
        
        switch (iter.name as string){
            case "VariableDefinition":
                Variable.label=doc.slice(iter.from, iter.to);
                break
            case "ArrowFunction":
                Variable.type = "function"
                break
            //default:
                //console.log(iter.name, doc.slice(iter.from, iter.to));
        }

     } while (iter.nextSibling());
     //VariableList.push(Variable)
     iter.parent()
     return Variable
}
const handleTreeCursorClass  = (iter:TreeCursor,doc: string)=>{
    const Variable = {type:'class',label:''}
    do {     
        console.log(iter.name,doc.slice(iter.from,iter.to))
        if (iter.name === "VariableDefinition"){
            Variable.label=doc.slice(iter.from, iter.to);
            break
        } 
     } while (iter.nextSibling());
     //VariableList.push(Variable)
     iter.parent()
     return Variable
}
const handleTreeCursorFunction  = (iter:TreeCursor,doc: string)=>{
    const Variable = {type:'function',label:''}
    do {     

        if (iter.name === "VariableDefinition"){
            Variable.label=doc.slice(iter.from, iter.to);
            break
        } 
     } while (iter.nextSibling());
     //VariableList.push(Variable)
     iter.parent()
     return Variable
}
const handleTreeCursorExport  = (iter:TreeCursor,doc: string,getVar:(vari:any)=>void)=>{
    //const Variable = {type:'function',label:''}
    do {     
        switch (iter.name as string){
            case "VariableDeclaration":
                if (iter.firstChild()){
                    getVar(  handleTreeCursorVariable (iter,doc))
               
                }
                break;
            case "FunctionDeclaration":
                if (iter.firstChild()){
                    getVar(  handleTreeCursorFunction(iter,doc))
                }
                break;
            case "ClassDeclaration":
                
                if (iter.firstChild()){
                    getVar( handleTreeCursorClass(iter,doc))
                }
                break
            case "ExportGroup":
                if (iter.firstChild()){
                    do {    
                        if ("VariableName" ===iter.name) {
                            const vari = {type:'function',label:''}
                            vari.label = doc.slice(iter.from,iter.to)
                            getVar( vari)
                        }
                        console.log("ExportGroup",iter.name,doc.slice(iter.from,iter.to))
                    } while (iter.nextSibling());
                    //VariableList.push(Variable)
                    iter.parent()
                }
                break
            default:
                console.log(iter.name,doc.slice(iter.from,iter.to))
        }
     } while (iter.nextSibling());
     //VariableList.push(Variable)
     iter.parent()
     //return Variable
}
export function getImport(doc:string,fileName:string){
    
    const tree = javascriptLanguage.parser.parse(doc); 
    let iter = tree.cursor();
    const list:any[] = []
    do {
        if ("ExportDeclaration"=== iter.name){
            if (iter.firstChild()){
                handleTreeCursorExport(iter,doc,(v)=>{
                    v.detail = fileName
                    list.push(v)
                })
            }
        } 
    } while (iter.next());
    //console.log("import",importList)
    ImportVarList[fileName] = {doc,tree:iter,list}
    //return importList
}