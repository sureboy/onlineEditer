let globalWorker: Worker | null = null; 
 
export async function getWorker(onmessage?:(e:MessageEvent)=>void) {

  if (!globalWorker) {
    // 注意：这里使用了 Vite 的 ?worker，如果需要在浏览器环境外使用请做判断
    try{ 
      globalWorker = new (await import(`$lib/worker/worker?worker`)).default() || null; 
      if (globalWorker && onmessage){
        globalWorker.onmessage = onmessage;
      }
    }catch(err){
      console.error(err)
      throw err;
      
    }
  }
  return globalWorker;
}

export function terminateWorker() {
  globalWorker?.terminate();
  globalWorker = null;
}