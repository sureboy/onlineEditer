
import * as Y from 'yjs'
import diff from 'fast-diff'; 

export const diffUpdate=(text:string,ydoc:Y.Doc,origin:string)=>{
    const ytext = ydoc.getText('content');
    // 2. 获取当前文本
    const oldText = ytext.toString();
    //const newText = "这是只修改了几个字的新句子";
    const diffs = diff(oldText, text);
    const delta = diffs.map(([op, value]) => {
        if (op === diff.INSERT) {
            return { insert: value };
        } else if (op === diff.DELETE) {
            return { delete: value.length };
        } else { // op === diff.EQUAL
            return { retain: value.length };
        }
    });
    ydoc.transact(() => {
        ytext.applyDelta(delta);
    },origin);
}

export const initDoc = (fileCHannel: RTCDataChannel,getText:(t:string)=>void,_origin:string  )=>{
    const ydoc =new Y.Doc()
    ydoc.on("update",(update,origin)=>{
        //console.log("ydoc on update",origin)
        if (origin===_origin)return;
        if (fileCHannel.readyState==="open"){
            const safeUpdate = new Uint8Array(update);
            fileCHannel.send(safeUpdate)
        }
    })
    fileCHannel.onmessage = (event)=>{  
        console.log(event)
        updateDoc(event.data,ydoc,_origin)
        getText(ydoc.getText("content").toString())
    }
    return ydoc
}
const updateDoc = (data:any,ydoc:Y.Doc,_origin:string)=>{

    if (data == null) {
        console.warn('Received null/undefined data, ignoring');
        return;
    }
  // 2. 如果是 string（可能是 Base64 或 JSON），需要转换
    if (typeof data === 'string') {
    // 假设你的发送端将 Uint8Array 编码为了 Base64 字符串
    try {
        const binaryString = atob(data); // 解码 Base64
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        Y.applyUpdate(ydoc, bytes, _origin);
    } catch (e) {
        console.error('Failed to decode Base64 string:', e);
    }
    return;
    }
    if (data instanceof Blob) {
    // 如果 binaryType 是 'blob'，需要异步读取
    const reader = new FileReader();
    reader.onload = () => {
        const update = new Uint8Array(reader.result  as ArrayBuffer);
        Y.applyUpdate(ydoc, update, _origin);
    };
    reader.readAsArrayBuffer(data);
    return;
    }
    
    if (data instanceof ArrayBuffer) {
    const update = new Uint8Array(data);
    Y.applyUpdate(ydoc, update, _origin);
    return;
    }

    console.warn('Unsupported data type received:', typeof data);
}