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
export async function getFileHandleFromOPFS(filePath:string,opt:{ create:boolean, root?:FileSystemDirectoryHandle }  = {create:false}) {
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