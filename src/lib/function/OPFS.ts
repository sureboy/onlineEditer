import { createTarPacker,createTarDecoder } from 'modern-tar';

import {type DirHandleType,getDirHandle} from "$lib/function/fileHandle"

export async function extractTarStreamToOPFS( tarFile:File) { 
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
    const dirHandle = getDirHandle(PathName,{create:true})
     
    //const root = await navigator.storage.getDirectory();
    //const dirHandle =await root.getDirectoryHandle(PathName,{create:true})
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
              const handle = dirHandle.getFileHandle(encodeURIComponent(entry.header.name) )
              //dirHandle.getFileHandle()
              //const f =await getFileHandleFromOPFS( entry.header.name,{create:true,root}) 
              const w =await  handle.createWriteStream()//.createWritable() 
              const reader = entry.body.getReader() 
              while (true) {
                const { done, value } = await reader.read(); // value 是 Uint8Array
                if (done) break;
                await w.write(value)
               // result += decoder.decode(value, { stream: true }); // 逐块解码为字符串
              }
              await w.close()
              
              //await entry.body.pipeTo(w); 
            }
        }
    } finally {
        reader.releaseLock();
    } 
}
type TarFileEntry = {
  header: {
    name: string;
    size: number;
    type: 'file'; // 这里固定为 'file'，因为只产出文件
  };
  body: Uint8Array;
};
  /**
 * 递归遍历 OPFS 目录，生成所有文件条目
 */
async function* walkDirectory(dirHandle:FileSystemDirectoryHandle, path = ''):AsyncGenerator<TarFileEntry, void, unknown> {
  for await (const [name, handle] of dirHandle.entries()) {
    const entryPath =decodeURIComponent(name) // path ? `${path}/${name}` : name;
    if (handle.kind === 'file') {
      // 如果是目录，递归遍历

      //yield* walkDirectory(handle, entryPath);
    //} else {
      // 如果是文件，读取内容并生成条目
      const file = await handle.getFile();
      const arrayBuffer = await file.arrayBuffer();
      yield {
        header: {
          name: entryPath,
          size: file.size,
          type: 'file',
        },
        body: new Uint8Array(arrayBuffer),
      };
    }
  }
}

/**
 * 打包 OPFS 目录为 tar.gz 并下载
 */
export async function downloadOpfsAsTarGz(rootDirHandle:FileSystemDirectoryHandle, archiveName = 'archive.tar.gz') {
  // 1. 创建 tar 打包器
  const { readable, controller } = createTarPacker();

  // 2. 异步遍历目录并添加文件到 tar 包
  (async () => {
    try {
      for await (const entry of walkDirectory(rootDirHandle)) {
        const fileStream = controller.add(entry.header);
        const writer = fileStream.getWriter();
        await writer.write(entry.body);
        await writer.close();
      }
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
/*
async function getDirectoryHandleFromOPFS(pathStr:string, opt:{ create:boolean, root?:FileSystemDirectoryHandle }  = {create:false}) {
    // 1. 获取根目录句柄
    const rootHandle = opt.root || await navigator.storage.getDirectory();

    // 2. 处理空路径或根路径
    if (!pathStr || pathStr === '/' || pathStr === '') {
        return rootHandle;
    }

    // 3. 规范化路径：移除首尾空格，移除开头的 '/'
    const normalized = pathStr.trim().replace(/^\/+/, '');
    if (!normalized) {
        return rootHandle;
    }

    // 4. 按 '/' 分割成路径段
    const segments = normalized.split('/').filter(seg => seg.length > 0);
    if (segments.length === 0) {
        return rootHandle;
    }

    // 5. 从根目录开始逐级遍历
    let currentHandle = rootHandle;
    console.log(segments)
    for (const segment of segments) {
        //if (segment==="."){
        //    continue
        //}
        try {
        // 尝试获取下一级目录
        currentHandle = await currentHandle.getDirectoryHandle(segment, {create:opt.create });
        } catch (error:any) {
        // 如果创建失败或目录不存在，抛出更清晰的错误
        if (error.name === 'NotFoundError' && ! opt.create) {
            throw new Error(`目录 "${segment}" 不存在(路径：${pathStr})`);
        }
        // 其他错误直接抛出
        throw error;
        }
    }

    return currentHandle;
}
export async function getFileHandleFromOPFS_(filePath:string,opt:{ create:boolean, root?:FileSystemDirectoryHandle }  = {create:false}) {
    // 1. 解析路径
    //filePath.indexOf()
    const lastSlashIndex = filePath.lastIndexOf("/");
    const fileName = filePath.substring(lastSlashIndex + 1);
    const dirPath = filePath.substring(0, lastSlashIndex);

    // 2. 获取父目录句柄（不存在时可根据 create 参数决定是否创建）
    const directoryHandle = await getDirectoryHandleFromOPFS(dirPath, opt);

    // 3. 在父目录下获取文件句柄
    return  await directoryHandle.getFileHandle(fileName, { create:opt.create }) 
} 

*/