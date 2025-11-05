// 前端上传功能集成
// 这个文件可以集成到现有的HTML中

const API_BASE_URL = 'http://localhost:3000/api';

// 上传文件
async function uploadFiles(files, tags = [], description = '') {
  const formData = new FormData();
  
  // 添加文件
  for (let file of files) {
    formData.append('files', file);
  }
  
  // 添加标签
  if (tags.length > 0) {
    formData.append('tags', JSON.stringify(tags));
  }
  
  // 添加描述
  if (description) {
    formData.append('description', description);
  }
  
  // 添加用户ID（可以从登录状态获取）
  formData.append('userId', '1');

  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || '上传失败');
    }
  } catch (error) {
    console.error('上传错误:', error);
    throw error;
  }
}

// 获取媒体列表
async function getMediaList(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page);
  if (params.pageSize) queryParams.append('pageSize', params.pageSize);
  if (params.fileType) queryParams.append('fileType', params.fileType);
  if (params.tagId) queryParams.append('tagId', params.tagId);

  try {
    const response = await fetch(`${API_BASE_URL}/media?${queryParams}`);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('获取媒体列表错误:', error);
    throw error;
  }
}

// 获取时间线
async function getTimeline() {
  try {
    const response = await fetch(`${API_BASE_URL}/media/timeline`);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('获取时间线错误:', error);
    throw error;
  }
}

// 获取标签列表
async function getTags() {
  try {
    const response = await fetch(`${API_BASE_URL}/tags`);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('获取标签错误:', error);
    throw error;
  }
}

// 导出函数（如果使用模块化）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    uploadFiles,
    getMediaList,
    getTimeline,
    getTags
  };
}

