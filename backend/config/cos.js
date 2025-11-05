import COS from 'cos-nodejs-sdk-v5';

// 腾讯云COS配置
export const cosConfig = {
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY,
  Region: process.env.COS_REGION || 'ap-beijing', // 你的Bucket地域
  Bucket: process.env.COS_BUCKET_NAME, // 你的Bucket名称
  Domain: process.env.COS_DOMAIN || '', // 自定义域名（可选）
  AccessType: process.env.COS_ACCESS_TYPE || 'public', // 'public' 或 'private'
};

// 初始化COS客户端
export const cosClient = new COS({
  SecretId: cosConfig.SecretId,
  SecretKey: cosConfig.SecretKey,
});

// 生成文件URL（公共读模式）
export function getFileUrl(key) {
  if (cosConfig.Domain) {
    // 使用自定义域名
    return `https://${cosConfig.Domain}/${key}`;
  }
  // 使用默认域名
  return `https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/${key}`;
}

// 生成签名URL（私有读写模式）
export async function getSignedUrlSync(key, expires = 3600) {
  return new Promise((resolve, reject) => {
    cosClient.getObjectUrl({
      Bucket: cosConfig.Bucket,
      Region: cosConfig.Region,
      Key: key,
      Expires: expires,
      Sign: true,
    }, (err, data) => {
      if (err) {
        console.error('生成签名URL失败:', err);
        reject(err);
      } else {
        resolve(data.Url);
      }
    });
  });
}

// 获取文件URL（根据配置自动选择）
export async function getMediaUrl(key) {
  if (cosConfig.AccessType === 'private') {
    // 私有读写：生成签名URL（1小时有效期）
    return await getSignedUrlSync(key, 3600);
  } else {
    // 公共读：直接返回公共URL
    return getFileUrl(key);
  }
}

export default cosClient;

