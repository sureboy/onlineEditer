// ========== 类型定义 ==========

/** 支持的二进制字段类型 */
export type BinaryValue =
  | ArrayBuffer
  | Float32Array
  | Uint16Array
  | Uint32Array
  | Uint8Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Float64Array;

/** 编码时二进制字段的占位符 */
interface BufferRef {
  __buf: number;
}

/** 编码时内部收集的 buffer 描述 */
interface BufferEntry {
  index: number;
  type: BinaryTypeName;
  byteLength: number;
  view: Uint8Array;
}

/** 可序列化的类型名 */
type BinaryTypeName =
  | 'ArrayBuffer'
  | 'Float32Array'
  | 'Uint16Array'
  | 'Uint32Array'
  | 'Uint8Array'
  | 'Int8Array'
  | 'Int16Array'
  | 'Int32Array'
  | 'Float64Array';

/** 类型名 -> 构造器 的白名单映射 */
const TYPED_ARRAY_CTORS = {
  Float32Array,
  Uint16Array,
  Uint32Array,
  Uint8Array,
  Int8Array,
  Int16Array,
  Int32Array,
  Float64Array,
} as const;

type TypedArrayName = keyof typeof TYPED_ARRAY_CTORS;

const isTypedArrayName = (name: string): name is TypedArrayName =>
  name in TYPED_ARRAY_CTORS;

/** 判断是否为受支持的二进制类型 */
function isBinaryValue(value: unknown): value is BinaryValue {
  return value instanceof ArrayBuffer || ArrayBuffer.isView(value);
}

/** 获取二进制类型名 */
function getBinaryTypeName(value: BinaryValue): BinaryTypeName {
  if (value instanceof ArrayBuffer) return 'ArrayBuffer';
  const name = value.constructor.name;
  if (isTypedArrayName(name)) return name;
  throw new TypeError(`Unsupported binary type: ${name}`);
}

// ========== 编码 ==========

/**
 * 将含二进制字段的对象打包为 ArrayBuffer
 * 布局：[metaLen(4)] [meta(JSON)] [len(4) + data]...
 */
 const CHUNK_SIZE = 16 * 1024; // 16KB
const BUFFER_LOW_THRESHOLD = 256 * 1024;  
// ========== 发送端：分块 ==========
export function sendChunked_bak(channel: RTCDataChannel, buffer: ArrayBuffer) {
  if (channel.readyState !== 'open') return;
  channel.send(JSON.stringify({ type: 'start', total: buffer.byteLength }));
  let offset = 0;
  while (offset < buffer.byteLength) {
    const end = Math.min(offset + CHUNK_SIZE, buffer.byteLength);
    channel.send(buffer.slice(offset, end));
    offset = end;
  }
  channel.send(JSON.stringify({ type: 'end' }));
}
export function sendChunked(
  channel: RTCDataChannel,
  buffer: ArrayBuffer
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (channel.readyState !== 'open') {
      reject(new Error('DataChannel is not open'));
      return;
    }

    channel.bufferedAmountLowThreshold = BUFFER_LOW_THRESHOLD;
    channel.send(JSON.stringify({ type: 'start', total: buffer.byteLength }));

    let offset = 0;

    const cleanup = () => {
      channel.removeEventListener('bufferedamountlow', onLow);
      channel.removeEventListener('close', onClose);
      channel.removeEventListener('error', onError);
    };

    const onLow = () => pump();
    const onClose = () => { cleanup(); reject(new Error('DataChannel closed')); };
    const onError = (e: Event) => { cleanup(); reject(e); };

    const pump = () => {
      if (channel.readyState !== 'open') {
        cleanup();
        reject(new Error('DataChannel closed'));
        return;
      }

      while (offset < buffer.byteLength) {
        if (channel.bufferedAmount > channel.bufferedAmountLowThreshold) {
          channel.addEventListener('bufferedamountlow', onLow, { once: true });
          return;
        }
        const end = Math.min(offset + CHUNK_SIZE, buffer.byteLength);
        channel.send(buffer.slice(offset, end));
        offset = end;
      }

      channel.send(JSON.stringify({ type: 'end' }));
      cleanup();
      resolve();
    };

    channel.addEventListener('close', onClose, { once: true });
    channel.addEventListener('error', onError, { once: true });
    pump();
  });
}
let receivedChunks: ArrayBuffer[] = [];

export const channelMessage =async (ev: MessageEvent,postMessage:(obj:any)=>void|Promise<void>) => {
  const data = ev.data;

  // 控制消息
  if (typeof data === 'string') {
    const msg = JSON.parse(data);
    if (msg.type === 'start') {
      receivedChunks = [];
    } else if (msg.type === 'end') {
      const total = receivedChunks.reduce((s, c) => s + c.byteLength, 0);
      const full = new Uint8Array(total);
      let pos = 0;
      for (const c of receivedChunks) {
        full.set(new Uint8Array(c), pos);
        pos += c.byteLength;
      }
      receivedChunks = [];
      const obj = decodeMessage(full.buffer);
      await postMessage(obj);
    }
    return;
  }

  // 二进制块
  if (data instanceof ArrayBuffer) {
    receivedChunks.push(data);
  }
};
export function encodeMessage(obj: unknown): ArrayBuffer {
  const buffers: BufferEntry[] = [];

  // 1. 序列化，二进制字段替换为占位符
  const meta = JSON.parse(
    JSON.stringify(obj, (_key, value: unknown) => {
      if (isBinaryValue(value)) {
        const view =
          value instanceof ArrayBuffer
            ? new Uint8Array(value)
            : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

        const index = buffers.length;
        buffers.push({
          index,
          type: getBinaryTypeName(value),
          byteLength: view.byteLength,
          view,
        });

        const ref: BufferRef = { __buf: index };
        return ref;
      }
      return value;
    })
  );

  // 2. 计算总大小
  const metaBytes = new TextEncoder().encode(JSON.stringify(meta));
  let total = 4 + metaBytes.byteLength;
  for (const b of buffers) total += 4 + b.byteLength;

  // 3. 写入
  const out = new ArrayBuffer(total);
  const view = new DataView(out);
  let offset = 0;

  view.setUint32(offset, metaBytes.byteLength, true);
  offset += 4;
  new Uint8Array(out, offset, metaBytes.byteLength).set(metaBytes);
  offset += metaBytes.byteLength;

  for (const b of buffers) {
    view.setUint32(offset, b.byteLength, true);
    offset += 4;
    new Uint8Array(out, offset, b.byteLength).set(b.view);
    offset += b.byteLength;
  }

  return out;
}

// ========== 解码 ==========

/** 判断是否为占位符 */
function isBufferRef(node: unknown): node is BufferRef {
  return (
    typeof node === 'object' &&
    node !== null &&
    '__buf' in node &&
    typeof (node as BufferRef).__buf === 'number'
  );
}

/**
 * 将 ArrayBuffer 还原为原始对象
 * @param buffer 编码后的数据
 * @param copy 是否复制二进制数据（默认 true，避免共享大包内存）
 */
export function decodeMessage<T = unknown>(
  buffer: ArrayBuffer,
  copy = true
): T {
  const view = new DataView(buffer);
  let offset = 0;

  const metaLen = view.getUint32(offset, true);
  offset += 4;
  const meta = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, offset, metaLen))
  ) as unknown;
  offset += metaLen;

  const restore = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(restore);

    if (node !== null && typeof node === 'object') {
      if (isBufferRef(node)) {
        const len = view.getUint32(offset, true);
        offset += 4;
        const slice = new Uint8Array(buffer, offset, len);
        offset += len;

        const bytes = copy ? slice.slice() : slice;

        // 需要知道类型：占位符里没存类型，所以类型信息必须从 meta 结构里还原
        // —— 见下方说明，这里改为读取编码时写入的类型
        return bytes.buffer;
      }

      const result: Record<string, unknown> = {};
      for (const key of Object.keys(node)) {
        result[key] = restore((node as Record<string, unknown>)[key]);
      }
      return result;
    }

    return node;
  };

  return restore(meta) as T;
}