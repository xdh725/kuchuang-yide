// 阿里云 OSS 直传：Workers 生成 PostObject 签名策略，浏览器拿签名后直传——
// 文件不过 Workers（100MB 限制解除、零 Worker CPU）。
// 参考协议：https://help.aliyun.com/zh/oss/developer-guide/postobject

function b64(str) {
  return btoa(String.fromCharCode(...new Uint8Array(new TextEncoder().encode(str))));
}
function b64bytes(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}
async function hmacSha1(key, msg) {
  const c = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', c, new TextEncoder().encode(msg)));
}

// 生成 PostObject 上传签名。返回给前端的字段直接塞进 FormData。
import { OSS_BUCKET, OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET } from './config.js';

export async function signUpload(contentType, sizeLimit = 100 * 1024 * 1024) {
  const bucket = OSS_BUCKET;
  const region = OSS_REGION;
  const dir = 'kb/';
  const expire = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 分钟有效

  const policy = {
    expiration: expire,
    conditions: [
      { bucket },
      ['starts-with', '$key', dir],
      ['content-length-range', 1, sizeLimit],
      ...(contentType ? [{ 'Content-Type': contentType }] : []),
    ],
  };
  const policyB64 = b64(JSON.stringify(policy));
  const sig = b64bytes(await hmacSha1(
    new TextEncoder().encode(OSS_ACCESS_KEY_SECRET), policyB64
  ));

  return {
    host: `https://${bucket}.${region}.aliyuncs.com`,
    keyPrefix: dir,
    policy: policyB64,
    signature: sig,
    accessKeyId: OSS_ACCESS_KEY_ID,
    expireAt: expire,
    // 上传后的公开访问 URL 前端拼：host/key（桶公共读或绑定域名）
  };
}
