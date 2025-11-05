// API配置 - 根据环境自动选择
// 开发环境使用本地，生产环境使用环境变量或默认值
const API_BASE_URL = (() => {
    console.log('🔍 开始检测API地址配置...');
    console.log('当前域名:', window.location.hostname);
    
    // 如果是在本地开发环境
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('✅ 检测到本地环境，使用本地API');
        return 'http://localhost:3000/api';
    }
    
    // 方法1：优先从 window 对象读取（Vercel 可以通过构建时注入）
    if (window.API_BASE_URL) {
        console.log('✅ 使用 window.API_BASE_URL:', window.API_BASE_URL);
        return window.API_BASE_URL;
    }
    
    // 方法2：尝试从 localStorage 读取配置的 URL
    const savedApiUrl = localStorage.getItem('API_BASE_URL');
    if (savedApiUrl) {
        console.log('✅ 使用保存的 API URL:', savedApiUrl);
        return savedApiUrl;
    }
    
    // 方法3：从 meta 标签读取（如果配置了）
    const metaApiUrl = document.querySelector('meta[name="api-base-url"]');
    console.log('🔍 检查 meta 标签:', metaApiUrl);
    if (metaApiUrl && metaApiUrl.content) {
        console.log('✅ 使用 meta 标签的 API URL:', metaApiUrl.content);
        return metaApiUrl.content;
    } else {
        console.warn('⚠️ 未找到 meta[name="api-base-url"] 标签');
    }
    
    // 方法4：使用默认的 Render URL（需要替换为你的实际 URL）
    const defaultUrl = 'https://feifeimeimeiwebsite.onrender.com/api';
    console.log('✅ 使用默认 API URL:', defaultUrl);
    
    // 如果是第一次访问且 URL 是占位符，提示用户配置
    if (defaultUrl.includes('your-backend-url')) {
        console.error('❌ 后端 API URL 未配置！');
        console.warn('请使用以下方法之一配置：');
        console.warn('1. 在浏览器控制台执行：localStorage.setItem("API_BASE_URL", "你的Render后端URL/api")');
        console.warn('2. 或者在 index.html 的 <head> 中添加：<meta name="api-base-url" content="你的Render后端URL/api">');
        alert('后端API地址未配置！\n\n请在浏览器控制台执行：\nlocalStorage.setItem("API_BASE_URL", "你的Render后端URL/api")\n\n然后刷新页面。');
    }
    
    return defaultUrl;
})();

// 输出最终使用的API地址
console.log('🎯 最终使用的 API_BASE_URL:', API_BASE_URL);

// 全局状态
let selectedFiles = [];
let currentMediaList = [];
let currentMediaIndex = 0;
let allTags = [];
let currentUser = null; // 当前登录用户
let currentEditingTag = null; // 正在编辑的标签

// ========== 获取请求头（包含用户ID） ==========
function getAuthHeaders() {
    const headers = {};
    if (currentUser && currentUser.id) {
        headers['x-user-id'] = currentUser.id.toString();
    }
    return headers;
}

// ========== API函数 ==========
async function uploadFiles(files, tags = [], description = '') {
    // 检查是否登录
    if (!currentUser) {
        throw new Error('请先登录后再上传');
    }

    const formData = new FormData();
    
    for (let file of files) {
        formData.append('files', file);
    }
    
    if (tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
    }
    
    if (description) {
        formData.append('description', description);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('上传错误:', error);
        throw error;
    }
}

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

async function getMediaByTag(tagId) {
    try {
        const response = await fetch(`${API_BASE_URL}/media?tagId=${tagId}`);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('获取媒体错误:', error);
        throw error;
    }
}

async function getMediaStats() {
    try {
        const timelineResult = await getTimeline();
        const tagsResult = await getTags();
        
        if (timelineResult.success && tagsResult.success) {
            const media = timelineResult.data || [];
            const photos = media.filter(m => m.fileType === 'image').length;
            const videos = media.filter(m => m.fileType === 'video').length;
            const categories = tagsResult.data?.length || 0;
            
            return { photos, videos, categories };
        }
        return { photos: 0, videos: 0, categories: 0 };
    } catch (error) {
        console.error('获取统计错误:', error);
        return { photos: 0, videos: 0, categories: 0 };
    }
}

// 删除媒体
async function deleteMedia(mediaId) {
    if (!currentUser) {
        throw new Error('请先登录后再删除照片');
    }
    try {
        const response = await fetch(`${API_BASE_URL}/media/${mediaId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('删除媒体错误:', error);
        throw error;
    }
}

// 创建标签
async function createTag(name, color) {
    if (!currentUser) {
        throw new Error('请先登录后再创建标签');
    }
    try {
        const response = await fetch(`${API_BASE_URL}/tags`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ name, color })
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('创建标签错误:', error);
        throw error;
    }
}

// 备忘录API
async function getMemos() {
    try {
        const response = await fetch(`${API_BASE_URL}/memos`);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('获取备忘录错误:', error);
        throw error;
    }
}

async function createMemo(title, content) {
    if (!currentUser) {
        throw new Error('请先登录后再创建备忘录');
    }
    try {
        const response = await fetch(`${API_BASE_URL}/memos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ title, content })
        });
        
        // 检查响应类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('服务器返回非JSON响应:', text.substring(0, 200));
            throw new Error(`服务器返回错误: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('创建备忘录错误:', error);
        throw error;
    }
}

async function updateMemo(id, title, content) {
    if (!currentUser) {
        throw new Error('请先登录后再更新备忘录');
    }
    try {
        const response = await fetch(`${API_BASE_URL}/memos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ title, content })
        });
        
        // 检查响应类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('服务器返回非JSON响应:', text.substring(0, 200));
            throw new Error(`服务器返回错误: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('更新备忘录错误:', error);
        throw error;
    }
}

async function deleteMemo(id) {
    if (!currentUser) {
        throw new Error('请先登录后再删除备忘录');
    }
    try {
        const response = await fetch(`${API_BASE_URL}/memos/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('删除备忘录错误:', error);
        throw error;
    }
}

// ========== 用户认证API ==========
async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        // 检查响应状态
        if (!response.ok) {
            const errorText = await response.text();
            console.error('登录请求失败:', response.status, errorText);
            throw new Error(`登录失败: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('登录错误:', error);
        // 如果是网络错误，提供更友好的提示
        if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
            throw new Error('无法连接到服务器，请检查后端 API URL 是否正确配置');
        }
        throw error;
    }
}

// ========== 评论API ==========
async function getComments(mediaId) {
    try {
        const response = await fetch(`${API_BASE_URL}/comments/media/${mediaId}`);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('获取评论错误:', error);
        throw error;
    }
}

async function createComment(mediaId, content) {
    if (!currentUser) {
        throw new Error('请先登录后再评论');
    }
    try {
        const response = await fetch(`${API_BASE_URL}/comments`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ mediaId, content })
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('创建评论错误:', error);
        throw error;
    }
}

// ========== 媒体标签管理API ==========
async function addTagsToMedia(mediaId, tagIds) {
    if (!currentUser) {
        throw new Error('请先登录后再添加标签');
    }
    try {
        const response = await fetch(`${API_BASE_URL}/media/${mediaId}/tags`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ tagIds })
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('添加标签错误:', error);
        throw error;
    }
}

async function removeTagFromMedia(mediaId, tagId) {
    if (!currentUser) {
        throw new Error('请先登录后再删除标签');
    }
    try {
        const response = await fetch(`${API_BASE_URL}/media/${mediaId}/tags/${tagId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('删除标签错误:', error);
        throw error;
    }
}

// ========== 标签更新API ==========
async function updateTag(tagId, name, color) {
    if (!currentUser) {
        throw new Error('请先登录后再更新标签');
    }
    try {
        const response = await fetch(`${API_BASE_URL}/tags/${tagId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ name, color })
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('更新标签错误:', error);
        throw error;
    }
}

// ========== 标签编辑模态框 ==========
function openTagEditModal(tag) {
    currentEditingTag = tag;
    const modal = document.getElementById('tagEditModal');
    const tagNameInput = document.getElementById('editTagName');
    const tagColorInput = document.getElementById('editTagColor');
    
    if (tagNameInput) tagNameInput.value = tag.name || '';
    if (tagColorInput) tagColorInput.value = tag.color || '#4A90E2';
    if (modal) modal.style.display = 'flex';
}

function closeTagEditModal() {
    const modal = document.getElementById('tagEditModal');
    if (modal) modal.style.display = 'none';
    currentEditingTag = null;
}

// ========== 格式化函数 ==========
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getContrastColor(bgColor) {
    if (!bgColor) return '#1976d2';
    if (bgColor.includes('#e3f2fd') || bgColor.includes('#f3e5f5') || bgColor.includes('#e8eaf6')) {
        return '#1976d2';
    }
    return '#ffffff';
}

// ========== 加载统计数据 ==========
async function loadStats() {
    const stats = await getMediaStats();
    document.getElementById('statPhotos').textContent = stats.photos;
    document.getElementById('statVideos').textContent = stats.videos;
    document.getElementById('statCategories').textContent = stats.categories;
}

// ========== 加载和渲染时间线 ==========
async function loadTimeline() {
    try {
        const result = await getTimeline();
        if (result.success && result.data) {
            currentMediaList = result.data;
            renderTimeline(result.data);
        }
    } catch (error) {
        console.error('加载时间线失败:', error);
    }
}

function renderTimeline(mediaList) {
    const container = document.getElementById('timelineMediaGrid');
    const axis = document.getElementById('timelineAxis');
    if (!container || !axis) return;
    
    container.innerHTML = '';
    axis.innerHTML = '';
    
    // 按月份分组
    const groupedByMonth = {};
    mediaList.forEach(media => {
        const date = new Date(media.uploadTime);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!groupedByMonth[monthKey]) {
            groupedByMonth[monthKey] = [];
        }
        groupedByMonth[monthKey].push(media);
    });
    
    // 渲染时间轴
    const months = Object.keys(groupedByMonth).sort().reverse();
    months.forEach((month, index) => {
        const axisItem = document.createElement('div');
        axisItem.className = 'timeline-axis-item';
        const [year, monthNum] = month.split('-');
        axisItem.innerHTML = `
            <div class="axis-dot"></div>
            <div class="axis-label">${year}年${parseInt(monthNum)}月</div>
            <div class="axis-count">${groupedByMonth[month].length}张</div>
        `;
        axisItem.addEventListener('click', () => {
            // 滚动到对应月份
            const monthContainer = document.querySelector(`[data-month="${month}"]`);
            if (monthContainer) {
                monthContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        axis.appendChild(axisItem);
    });
    
    // 渲染媒体
    months.forEach(month => {
        const monthSection = document.createElement('div');
        monthSection.className = 'timeline-month-section';
        monthSection.setAttribute('data-month', month);
        
        const monthHeader = document.createElement('div');
        monthHeader.className = 'timeline-month-header';
        const [year, monthNum] = month.split('-');
        monthHeader.textContent = `${year}年${parseInt(monthNum)}月`;
        monthSection.appendChild(monthHeader);
        
        const monthGrid = document.createElement('div');
        monthGrid.className = 'media-grid';
        
        groupedByMonth[month].forEach(media => {
            const card = createMediaCard(media);
            monthGrid.appendChild(card);
        });
        
        monthSection.appendChild(monthGrid);
        container.appendChild(monthSection);
    });
}

function createMediaCard(media) {
    const card = document.createElement('div');
    card.className = 'media-card';
    
    // 处理图片URL：如果已经是完整URL（http/https开头），直接使用；否则拼接后端地址
    const imageUrl = media.thumbnailPath || media.filePath;
    let fullUrl = imageUrl;
    
    // 如果URL不是以http开头，说明是相对路径，需要拼接后端地址
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        // 判断是本地开发还是生产环境
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // 本地开发：使用localhost
            fullUrl = `http://localhost:3000${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
        } else {
            // 生产环境：使用后端API地址（去掉/api，因为这是文件路径）
            const backendBaseUrl = API_BASE_URL.replace('/api', '');
            fullUrl = `${backendBaseUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
        }
    }
    
    console.log('🖼️ 图片URL:', fullUrl);
    
    card.innerHTML = `
        <div class="media-thumbnail">
            <img src="${fullUrl}" alt="${media.originalName}" onerror="this.onerror=null; this.src='https://via.placeholder.com/300?text=加载失败'; console.error('图片加载失败:', '${fullUrl}');">
            <div class="media-type">${media.fileType === 'image' ? '照片' : '视频'}</div>
        </div>
        <div class="media-info">
            <div class="media-tags">
                ${media.tags && media.tags.length > 0 ? media.tags.map(tag => 
                    `<span class="tag" style="background: ${tag.color || '#e3f2fd'}; color: ${getContrastColor(tag.color || '#e3f2fd')};">${tag.name}</span>`
                ).join('') : ''}
            </div>
            <div class="media-date">${formatDate(media.uploadTime)}</div>
            <div class="media-author">
                <span>${media.user?.nickname || '用户'}</span>
            </div>
        </div>
    `;
    
    // 点击查看大图
    card.addEventListener('click', () => {
        openMediaViewer(media);
    });
    
    return card;
}

// ========== 图片查看器 ==========
function openMediaViewer(media) {
    const modal = document.getElementById('mediaViewerModal');
    const viewerImage = document.getElementById('viewerImage');
    const viewerVideo = document.getElementById('viewerVideo');
    
    // 找到当前媒体在列表中的索引
    currentMediaIndex = currentMediaList.findIndex(m => m.id === media.id);
    if (currentMediaIndex === -1) currentMediaIndex = 0;
    
    if (media.fileType === 'image') {
        // 处理图片URL：如果已经是完整URL，直接使用；否则拼接后端地址
        let imageUrl = media.filePath;
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                imageUrl = `http://localhost:3000${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
            } else {
                const backendBaseUrl = API_BASE_URL.replace('/api', '');
                imageUrl = `${backendBaseUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
            }
        }
        console.log('🖼️ 查看器图片URL:', imageUrl);
        viewerImage.src = imageUrl;
        viewerImage.style.display = 'block';
        viewerVideo.style.display = 'none';
    } else {
        // 处理视频URL：如果已经是完整URL，直接使用；否则拼接后端地址
        let videoUrl = media.filePath;
        if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                videoUrl = `http://localhost:3000${videoUrl.startsWith('/') ? videoUrl : '/' + videoUrl}`;
            } else {
                const backendBaseUrl = API_BASE_URL.replace('/api', '');
                videoUrl = `${backendBaseUrl}${videoUrl.startsWith('/') ? videoUrl : '/' + videoUrl}`;
            }
        }
        console.log('🎬 查看器视频URL:', videoUrl);
        viewerVideo.src = videoUrl;
        viewerVideo.style.display = 'block';
        viewerImage.style.display = 'none';
    }
    
    // 更新信息
    document.getElementById('viewerTitle').textContent = media.originalName;
    document.getElementById('viewerDate').textContent = formatDateTime(media.uploadTime);
    document.getElementById('viewerAuthor').textContent = media.user?.nickname || '用户';
    
    // 更新标签（可删除）
    const viewerTags = document.getElementById('viewerTags');
    viewerTags.innerHTML = '';
    if (media.tags && media.tags.length > 0) {
        media.tags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag';
            tagEl.style.background = tag.color || '#e3f2fd';
            tagEl.style.color = getContrastColor(tag.color);
            tagEl.textContent = tag.name;
            tagEl.dataset.tagId = tag.id;
            
            // 添加删除按钮
            const deleteBtn = document.createElement('span');
            deleteBtn.innerHTML = ' ×';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.fontWeight = 'bold';
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`确定要删除标签"${tag.name}"吗？`)) {
                    try {
                        const result = await removeTagFromMedia(media.id, tag.id);
                        if (result.success) {
                            tagEl.remove();
                            // 重新加载媒体信息以更新标签
                            await loadMediaDetails(media.id);
                        }
                    } catch (error) {
                        alert('删除标签失败：' + error.message);
                    }
                }
            });
            tagEl.appendChild(deleteBtn);
            viewerTags.appendChild(tagEl);
        });
    } else {
        viewerTags.innerHTML = '<span style="color: var(--text-secondary);">无标签</span>';
    }
    
    // 加载标签选择器
    renderViewerTagSelector(media);
    
    // 加载评论
    loadCommentsForMedia(media.id);
    
    // 保存当前媒体ID用于删除
    modal.dataset.mediaId = media.id;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// 加载媒体详情（用于刷新标签）
async function loadMediaDetails(mediaId) {
    try {
        const response = await fetch(`${API_BASE_URL}/media/${mediaId}`);
        const result = await response.json();
        if (result.success && result.data) {
            // 更新当前媒体信息
            const currentMedia = currentMediaList.find(m => m.id === mediaId);
            if (currentMedia) {
                currentMedia.tags = result.data.tags;
            }
            // 重新打开查看器以更新显示
            openMediaViewer(result.data);
        }
    } catch (error) {
        console.error('加载媒体详情失败:', error);
    }
}

// 渲染查看器中的标签选择器
function renderViewerTagSelector(media) {
    const tagSelector = document.getElementById('viewerTagSelector');
    if (!tagSelector) return;
    
    tagSelector.innerHTML = '';
    const currentTagIds = media.tags ? media.tags.map(t => t.id) : [];
    
    allTags.forEach(tag => {
        const isSelected = currentTagIds.includes(tag.id);
        const label = document.createElement('label');
        label.className = 'tag-checkbox';
        label.innerHTML = `
            <input type="checkbox" value="${tag.id}" ${isSelected ? 'checked disabled' : ''}>
            <span style="background: ${tag.color || '#e3f2fd'}; color: ${getContrastColor(tag.color || '#e3f2fd')};">${tag.name}</span>
        `;
        tagSelector.appendChild(label);
    });
}

// 加载评论
async function loadCommentsForMedia(mediaId) {
    const commentsList = document.getElementById('commentsList');
    if (!commentsList) return;
    
    try {
        const result = await getComments(mediaId);
        if (result.success && result.data) {
            commentsList.innerHTML = '';
            if (result.data.length === 0) {
                commentsList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">暂无评论</div>';
            } else {
                result.data.forEach(comment => {
                    const commentEl = document.createElement('div');
                    commentEl.className = 'comment-item';
                    commentEl.innerHTML = `
                        <div class="comment-author">${comment.user_nickname || comment.username || '用户'}</div>
                        <div class="comment-text">${comment.content}</div>
                        <div class="comment-time">${formatDateTime(comment.created_at)}</div>
                    `;
                    commentsList.appendChild(commentEl);
                });
            }
        }
    } catch (error) {
        console.error('加载评论失败:', error);
        commentsList.innerHTML = '<div style="text-align: center; color: red; padding: 20px;">加载评论失败</div>';
    }
}

function closeMediaViewer() {
    const modal = document.getElementById('mediaViewerModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    const viewerVideo = document.getElementById('viewerVideo');
    viewerVideo.pause();
}

function showPrevMedia() {
    if (currentMediaList.length === 0) return;
    currentMediaIndex = (currentMediaIndex - 1 + currentMediaList.length) % currentMediaList.length;
    openMediaViewer(currentMediaList[currentMediaIndex]);
}

function showNextMedia() {
    if (currentMediaList.length === 0) return;
    currentMediaIndex = (currentMediaIndex + 1) % currentMediaList.length;
    openMediaViewer(currentMediaList[currentMediaIndex]);
}

// ========== 加载标签 ==========
async function loadTags() {
    try {
        const result = await getTags();
        if (result.success && result.data && result.data.length > 0) {
            allTags = result.data;
            renderTagCloud(result.data);
            renderTagSelector(result.data);
        } else {
            // 如果没有标签，先创建默认标签
            console.log('没有标签，尝试创建默认标签...');
            await createDefaultTags();
            // 重新加载标签
            const retryResult = await getTags();
            if (retryResult.success && retryResult.data) {
                allTags = retryResult.data;
                renderTagCloud(retryResult.data);
                renderTagSelector(retryResult.data);
            }
        }
    } catch (error) {
        console.error('加载标签失败:', error);
        // 即使失败也尝试创建默认标签
        try {
            await createDefaultTags();
            const retryResult = await getTags();
            if (retryResult.success && retryResult.data) {
                allTags = retryResult.data;
                renderTagCloud(retryResult.data);
                renderTagSelector(retryResult.data);
            }
        } catch (e) {
            console.error('创建默认标签也失败:', e);
        }
    }
}

// 创建默认标签
async function createDefaultTags() {
    const defaultTags = [
        { name: '肥肥美美', color: '#FF6B9D' },
        { name: '狗娃儿之家', color: '#4ECDC4' },
        { name: '证件照', color: '#95E1D3' },
        { name: '旅游', color: '#4A90E2' },
        { name: '吃吃喝喝', color: '#F39C12' },
        { name: '花花', color: '#E74C3C' },
        { name: '公主的眼影', color: '#9B59B6' },
        { name: '日常', color: '#3F51B5' }
    ];
    
    for (const tag of defaultTags) {
        try {
            const response = await fetch(`${API_BASE_URL}/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tag)
            });
            const result = await response.json();
            if (result.success) {
                console.log(`✅ 创建标签: ${tag.name}`);
            }
        } catch (error) {
            // 忽略已存在的标签错误
            console.log(`标签 ${tag.name} 可能已存在`);
        }
    }
}

function renderTagCloud(tags) {
    const tagCloud = document.querySelector('.tag-cloud');
    if (!tagCloud) return;
    
    tagCloud.innerHTML = '';
    
    tags.forEach(tag => {
        const tagEl = document.createElement('span');
        // 根据媒体数量决定大小（使用真实的mediaCount）
        const mediaCount = tag.mediaCount || 0;
        const size = mediaCount > 20 ? 'large' : mediaCount > 10 ? 'medium' : 'small';
        tagEl.className = `tag-cloud-item ${size}`;
        tagEl.style.background = `linear-gradient(135deg, ${tag.color || '#e3f2fd'} 0%, ${tag.color || '#e3f2fd'}80 100%)`;
        tagEl.style.color = getContrastColor(tag.color || '#e3f2fd');
        tagEl.style.position = 'relative';
        tagEl.style.paddingRight = '24px';
        tagEl.dataset.tagId = tag.id;
        
        // 标签文本
        const tagText = document.createElement('span');
        tagText.textContent = `${tag.name} (${mediaCount})`;
        tagEl.appendChild(tagText);
        
        // 编辑按钮（右键点击或悬停显示）
        const editBtn = document.createElement('span');
        editBtn.innerHTML = ' ✏️';
        editBtn.style.position = 'absolute';
        editBtn.style.right = '4px';
        editBtn.style.cursor = 'pointer';
        editBtn.style.fontSize = '12px';
        editBtn.title = '编辑标签';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTagEditModal(tag);
        });
        tagEl.appendChild(editBtn);
        
        tagEl.addEventListener('click', async () => {
            // 移除其他标签的选中状态
            document.querySelectorAll('.tag-cloud-item').forEach(item => {
                item.classList.remove('selected');
            });
            // 添加当前标签的选中状态
            tagEl.classList.add('selected');
            
            const result = await getMediaByTag(tag.id);
            if (result.success && result.data) {
                renderMediaGrid(result.data, document.getElementById('categoryMediaGrid'));
                document.getElementById('selectedTag').style.display = 'block';
                document.getElementById('selectedTagName').textContent = `当前分类：${tag.name}`;
            } else {
                // 如果没有照片，显示提示
                const grid = document.getElementById('categoryMediaGrid');
                if (grid) {
                    grid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">该标签下暂无照片</p>';
                }
            }
        });
        
        tagCloud.appendChild(tagEl);
    });
}

function renderMediaGrid(mediaList, container) {
    if (!container) return;
    
    container.innerHTML = '';
    
    mediaList.forEach(media => {
        const card = createMediaCard(media);
        container.appendChild(card);
    });
}

function renderTagSelector(tags) {
    const tagOptions = document.getElementById('tagOptions');
    if (!tagOptions) {
        console.warn('tagOptions元素不存在');
        return;
    }
    
    if (!tags || tags.length === 0) {
        tagOptions.innerHTML = '<p style="color: var(--text-secondary); padding: 16px;">暂无标签，请先创建标签</p>';
        return;
    }
    
    tagOptions.innerHTML = '';
    
    tags.forEach(tag => {
        const label = document.createElement('label');
        label.className = 'tag-checkbox';
        label.innerHTML = `
            <input type="checkbox" value="${tag.id}">
            <span style="background: ${tag.color || '#e3f2fd'}; color: ${getContrastColor(tag.color || '#e3f2fd')};">${tag.name}</span>
        `;
        tagOptions.appendChild(label);
    });
    
    console.log(`✅ 已渲染 ${tags.length} 个标签到选择器`);
}

// ========== 上传功能 ==========
function setupUpload() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*,video/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    const uploadDropzone = document.getElementById('uploadDropzone');
    const selectFilesBtn = document.getElementById('selectFilesBtn');
    const filePreviewArea = document.getElementById('filePreviewArea');
    const filePreviewList = document.getElementById('filePreviewList');
    const uploadActions = document.getElementById('uploadActions');
    const uploadBtn = document.getElementById('uploadBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    // 选择文件
    selectFilesBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        fileInput.click();
    });
    
    uploadDropzone.addEventListener('click', (e) => {
        // 如果点击的是按钮或SVG，不处理
        if (e.target === selectFilesBtn || e.target.closest('button') || e.target.closest('svg')) {
            return;
        }
        // 只有点击空白区域才打开文件选择
        fileInput.click();
    });

    // 拖拽上传
    uploadDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadDropzone.style.borderColor = 'var(--primary-blue)';
        uploadDropzone.style.background = 'var(--light-blue)';
    });

    uploadDropzone.addEventListener('dragleave', () => {
        uploadDropzone.style.borderColor = 'var(--light-blue)';
        uploadDropzone.style.background = 'var(--bg-light)';
    });

    uploadDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadDropzone.style.borderColor = 'var(--light-blue)';
        uploadDropzone.style.background = 'var(--bg-light)';
        
        const files = Array.from(e.dataTransfer.files);
        handleFileSelect(files);
    });

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFileSelect(files);
    });

    function handleFileSelect(files) {
        if (files.length === 0) return;
        
        selectedFiles = files;
        
        // 显示文件预览
        filePreviewList.innerHTML = '';
        files.forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'file-preview-item';
            
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="${file.name}">
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            } else {
                previewItem.innerHTML = `
                    <div class="file-icon">🎬</div>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                `;
            }
            
            filePreviewList.appendChild(previewItem);
        });
        
        filePreviewArea.style.display = 'block';
        uploadActions.style.display = 'block';
    }

    // 上传按钮
    uploadBtn.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;

        // 检查登录状态
        if (!currentUser) {
            alert('请先登录后再上传照片');
            openAuthModal();
            return;
        }

        const selectedTags = Array.from(document.querySelectorAll('#tagOptions input:checked'))
            .map(input => parseInt(input.value));

        uploadBtn.textContent = '上传中...';
        uploadBtn.disabled = true;

        try {
            const result = await uploadFiles(selectedFiles, selectedTags);
            
            if (result.success) {
                alert(`成功上传 ${result.files.length} 个文件！`);
                // 重置
                selectedFiles = [];
                filePreviewArea.style.display = 'none';
                uploadActions.style.display = 'none';
                fileInput.value = '';
                // 重新加载（包括标签，更新数量）
                await loadTags();
                await loadTimeline();
                await loadStats();
            } else {
                alert('上传失败：' + (result.error || '未知错误'));
            }
        } catch (error) {
            alert('上传失败：' + error.message);
        } finally {
            uploadBtn.textContent = '开始上传';
            uploadBtn.disabled = false;
        }
    });

    // 取消按钮
    cancelBtn.addEventListener('click', () => {
        selectedFiles = [];
        filePreviewArea.style.display = 'none';
        uploadActions.style.display = 'none';
        fileInput.value = '';
    });

    // 添加新标签功能
    const addNewTagBtn = document.getElementById('addNewTagBtn');
    const newTagInput = document.getElementById('newTagInput');
    const confirmNewTagBtn = document.getElementById('confirmNewTagBtn');
    const cancelNewTagBtn = document.getElementById('cancelNewTagBtn');
    const newTagName = document.getElementById('newTagName');
    const newTagColor = document.getElementById('newTagColor');

    if (addNewTagBtn && newTagInput) {
        addNewTagBtn.addEventListener('click', () => {
            newTagInput.style.display = 'block';
            newTagName.value = '';
            newTagColor.value = '#4A90E2';
        });

        cancelNewTagBtn.addEventListener('click', () => {
            newTagInput.style.display = 'none';
            newTagName.value = '';
        });

        confirmNewTagBtn.addEventListener('click', async () => {
            const name = newTagName.value.trim();
            const color = newTagColor.value;

            if (!name) {
                alert('请输入标签名称');
                return;
            }

            try {
                const result = await createTag(name, color);
                if (result.success) {
                    // 重新加载标签（更新标签云和选择器）
                    await loadTags();
                    // 重置输入
                    newTagInput.style.display = 'none';
                    newTagName.value = '';
                    alert('标签创建成功！');
                } else {
                    alert('创建失败：' + (result.error || '未知错误'));
                }
            } catch (error) {
                alert('创建失败：' + error.message);
            }
        });
    }
}

// ========== 封面图替换 ==========
function setupCoverImage() {
    const changeCoverBtn = document.getElementById('changeCoverBtn');
    const heroCoverImage = document.getElementById('heroCoverImage');
    
    if (!changeCoverBtn || !heroCoverImage) return;
    
    changeCoverBtn.addEventListener('click', () => {
        // 打开文件选择器
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    heroCoverImage.src = event.target.result;
                    // 保存到 localStorage
                    localStorage.setItem('coverImage', event.target.result);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    });
    
    // 加载保存的封面图
    const savedCover = localStorage.getItem('coverImage');
    if (savedCover) {
        heroCoverImage.src = savedCover;
    }
}

// ========== 主函数 ==========
console.log('脚本开始加载...');

// 添加全局错误处理
window.addEventListener('error', function(e) {
    console.error('JavaScript错误:', e.message, e.filename, e.lineno);
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded 已触发');
    
    try {
    
    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const href = anchor.getAttribute('href');
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 导航栏高亮
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // 图片查看器
    const modal = document.getElementById('mediaViewerModal');
    const modalClose = document.getElementById('modalClose');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const deleteMediaBtn = document.getElementById('deleteMediaBtn');
    
    if (modal && modalClose && modalBackdrop && prevBtn && nextBtn) {
        modalClose.addEventListener('click', closeMediaViewer);
        modalBackdrop.addEventListener('click', closeMediaViewer);
        prevBtn.addEventListener('click', showPrevMedia);
        nextBtn.addEventListener('click', showNextMedia);
    }
    
    // 删除按钮
    if (deleteMediaBtn) {
        deleteMediaBtn.addEventListener('click', async () => {
            const mediaId = modal?.dataset.mediaId;
            if (!mediaId) return;
            
            if (confirm('确定要删除这张照片吗？此操作不可恢复！')) {
                try {
                    const result = await deleteMedia(mediaId);
                    if (result.success) {
                        closeMediaViewer();
                        // 重新加载数据
                        await loadTimeline();
                        await loadStats();
                        // 重新加载标签（更新数量）
                        await loadTags();
                        // 如果当前在分类页面，重新加载标签数据
                        if (document.getElementById('categoryMediaGrid')) {
                            const selectedTag = document.querySelector('.tag-cloud-item.selected');
                            if (selectedTag) {
                                const tagId = selectedTag.dataset.tagId;
                                const mediaResult = await getMediaByTag(tagId);
                                if (mediaResult.success && mediaResult.data) {
                                    renderMediaGrid(mediaResult.data, document.getElementById('categoryMediaGrid'));
                                } else {
                                    // 如果没有照片了，显示提示
                                    const grid = document.getElementById('categoryMediaGrid');
                                    if (grid) {
                                        grid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">该标签下暂无照片</p>';
                                    }
                                }
                            }
                        }
                        alert('删除成功！');
                    } else {
                        alert('删除失败：' + (result.error || '未知错误'));
                    }
                } catch (error) {
                    alert('删除失败：' + error.message);
                }
            }
        });
    }
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (modal && modal.style.display === 'flex') {
            if (e.key === 'Escape') closeMediaViewer();
            if (e.key === 'ArrowLeft') showPrevMedia();
            if (e.key === 'ArrowRight') showNextMedia();
        }
    });

    // 评论功能
    const submitCommentBtn = document.getElementById('submitCommentBtn');
    if (submitCommentBtn) {
        submitCommentBtn.addEventListener('click', async () => {
            const commentInput = document.getElementById('commentInput');
            if (!currentUser) {
                alert('请先登录后再评论');
                return;
            }
            
            const comment = commentInput.value.trim();
            if (!comment) {
                alert('请输入评论内容');
                return;
            }
            
            const mediaId = parseInt(document.getElementById('mediaViewerModal')?.dataset.mediaId);
            if (!mediaId) {
                alert('无法获取媒体ID');
                return;
            }
            
            try {
                const result = await createComment(mediaId, comment);
                if (result.success) {
                    commentInput.value = '';
                    await loadCommentsForMedia(mediaId);
                    alert('评论发表成功！');
                } else {
                    alert('评论失败：' + (result.error || '未知错误'));
                }
            } catch (error) {
                alert('评论失败：' + error.message);
            }
        });
    }
    
    // 添加标签到媒体
    const addTagsToMediaBtn = document.getElementById('addTagsToMediaBtn');
    if (addTagsToMediaBtn) {
        addTagsToMediaBtn.addEventListener('click', async function() {
            const mediaId = parseInt(document.getElementById('mediaViewerModal')?.dataset.mediaId);
            if (!mediaId) {
                alert('无法获取媒体ID');
                return;
            }
            
            const selectedTags = Array.from(document.querySelectorAll('#viewerTagSelector input:checked:not(:disabled)'))
                .map(input => parseInt(input.value));
            
            if (selectedTags.length === 0) {
                alert('请至少选择一个标签');
                return;
            }
            
            try {
                const result = await addTagsToMedia(mediaId, selectedTags);
                if (result.success) {
                    alert('标签添加成功！');
                    await loadMediaDetails(mediaId);
                } else {
                    alert('添加标签失败：' + (result.error || '未知错误'));
                }
            } catch (error) {
                alert('添加标签失败：' + error.message);
            }
        });
    }
    
    // ========== 用户认证功能 ==========
    function updateUserUI() {
        const userNotLoggedIn = document.getElementById('userNotLoggedIn');
        const userLoggedIn = document.getElementById('userLoggedIn');
        const currentUsername = document.getElementById('currentUsername');
        
        if (currentUser) {
            userNotLoggedIn.style.display = 'none';
            userLoggedIn.style.display = 'flex';
            currentUsername.textContent = currentUser.nickname || currentUser.username || '用户';
            
            // 启用评论输入
            const commentInput = document.getElementById('commentInput');
            const submitCommentBtn = document.getElementById('submitCommentBtn');
            if (commentInput) {
                commentInput.disabled = false;
                commentInput.placeholder = '写下你的评论...';
            }
            if (submitCommentBtn) {
                submitCommentBtn.disabled = false;
            }
        } else {
            userNotLoggedIn.style.display = 'flex';
            userLoggedIn.style.display = 'none';
            
            // 禁用评论输入
            const commentInput = document.getElementById('commentInput');
            const submitCommentBtn = document.getElementById('submitCommentBtn');
            if (commentInput) {
                commentInput.disabled = true;
                commentInput.placeholder = '请先登录后再评论...';
            }
            if (submitCommentBtn) {
                submitCommentBtn.disabled = true;
            }
        }
    }
    
    // 登录模态框
    const authModal = document.getElementById('authModal');
    const authModalBackdrop = document.getElementById('authModalBackdrop');
    const authModalClose = document.getElementById('authModalClose');
    const loginForm = document.getElementById('loginForm');
    
    function openAuthModal() {
        console.log('openAuthModal 被调用');
        if (authModal) {
            console.log('找到 authModal 元素，显示模态框');
            authModal.style.display = 'flex';
        } else {
            console.error('未找到 authModal 元素');
        }
    }
    
    function closeAuthModal() {
        if (authModal) {
            authModal.style.display = 'none';
        }
    }
    
    // 登录按钮
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    console.log('检查登录按钮:', {
        loginBtn: !!loginBtn,
        logoutBtn: !!logoutBtn
    });
    
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('登录按钮被点击');
            openAuthModal();
        });
        console.log('登录按钮事件监听器已添加');
    } else {
        console.error('未找到登录按钮元素');
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            currentUser = null;
            localStorage.removeItem('currentUser');
            updateUserUI();
            alert('已退出登录');
        });
    }
    
    if (authModalBackdrop) {
        authModalBackdrop.addEventListener('click', closeAuthModal);
    }
    if (authModalClose) {
        authModalClose.addEventListener('click', closeAuthModal);
    }
    
    // 登录提交
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', async () => {
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            if (!username || !password) {
                alert('请输入用户名和密码');
                return;
            }
            
            // 验证用户名是否为"肥肥"或"美美"
            if (username !== '肥肥' && username !== '美美') {
                alert('用户名只能是"肥肥"或"美美"');
                return;
            }
            
            try {
                const result = await login(username, password);
                if (result.success && result.data) {
                    currentUser = result.data;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    updateUserUI();
                    closeAuthModal();
                    alert('登录成功！');
                    document.getElementById('loginUsername').value = '';
                    document.getElementById('loginPassword').value = '';
                } else {
                    alert('登录失败：' + (result.error || '用户名或密码错误'));
                }
            } catch (error) {
                alert('登录失败：' + error.message);
            }
        });
    }
    
    // 恢复登录状态
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updateUserUI();
        } catch (error) {
            console.error('恢复用户状态失败:', error);
        }
    } else {
        updateUserUI();
    }
    
    // ========== 标签重命名功能 ==========
    const tagEditModal = document.getElementById('tagEditModal');
    const tagEditModalBackdrop = document.getElementById('tagEditModalBackdrop');
    const tagEditModalClose = document.getElementById('tagEditModalClose');
    const cancelTagEditBtn = document.getElementById('cancelTagEditBtn');
    const saveTagEditBtn = document.getElementById('saveTagEditBtn');
    
    if (tagEditModalBackdrop) {
        tagEditModalBackdrop.addEventListener('click', closeTagEditModal);
    }
    if (tagEditModalClose) {
        tagEditModalClose.addEventListener('click', closeTagEditModal);
    }
    if (cancelTagEditBtn) {
        cancelTagEditBtn.addEventListener('click', closeTagEditModal);
    }
    if (saveTagEditBtn) {
        saveTagEditBtn.addEventListener('click', async () => {
            if (!currentEditingTag) return;
            
            const newName = document.getElementById('editTagName').value.trim();
            const newColor = document.getElementById('editTagColor').value;
            
            if (!newName) {
                alert('请输入标签名称');
                return;
            }
            
            try {
                const result = await updateTag(currentEditingTag.id, newName, newColor);
                if (result.success) {
                    alert('标签更新成功！');
                    closeTagEditModal();
                    await loadTags(); // 重新加载标签
                } else {
                    alert('更新失败：' + (result.error || '未知错误'));
                }
            } catch (error) {
                alert('更新失败：' + error.message);
            }
        });
    }

    // 初始化上传功能
    setupUpload();
    
    // 初始化封面图
    setupCoverImage();

    // 备忘录功能
    const createMemoBtn = document.getElementById('createMemoBtn');
    const memoModal = document.getElementById('memoModal');
    const memoModalBackdrop = document.getElementById('memoModalBackdrop');
    const memoModalClose = document.getElementById('memoModalClose');
    const memoCancelBtn = document.getElementById('memoCancelBtn');
    const memoSaveBtn = document.getElementById('memoSaveBtn');
    
    if (createMemoBtn) {
        createMemoBtn.addEventListener('click', () => {
            openMemoEditor();
        });
    }
    
    if (memoModalBackdrop) {
        memoModalBackdrop.addEventListener('click', closeMemoEditor);
    }
    
    if (memoModalClose) {
        memoModalClose.addEventListener('click', closeMemoEditor);
    }
    
    if (memoCancelBtn) {
        memoCancelBtn.addEventListener('click', closeMemoEditor);
    }
    
    if (memoSaveBtn) {
        // 保存按钮的点击事件在每次打开编辑器时重新绑定
        memoSaveBtn.addEventListener('click', handleMemoSave);
    }

    // 加载数据（确保标签先加载，因为上传页面需要）
    loadTags().then(() => {
        console.log('标签加载完成');
    });
    loadTimeline();
    loadStats();
    loadMemos();

    // 主题色选择功能
    const themeToggle = document.getElementById('themeToggle');
    const themeOptions = document.getElementById('themeOptions');
    
    if (themeToggle && themeOptions) {
        // 加载保存的主题
        const savedTheme = localStorage.getItem('theme') || 'blue';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // 切换主题选项显示
        themeToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            themeOptions.style.display = themeOptions.style.display === 'none' ? 'block' : 'none';
        });
        
        // 点击外部关闭
        document.addEventListener('click', () => {
            themeOptions.style.display = 'none';
        });
        
        // 选择主题
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const theme = option.dataset.theme;
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('theme', theme);
                themeOptions.style.display = 'none';
            });
        });
    }
    
    } catch (error) {
        console.error('DOMContentLoaded 处理函数出错:', error);
        console.error('错误堆栈:', error.stack);
    }
    
    console.log('DOMContentLoaded 处理完成');
});

function handleMemoSave() {
    const titleInput = document.getElementById('memoTitleInput');
    const contentInput = document.getElementById('memoContentInput');
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    
    if (!title || !content) {
        alert('标题和内容不能为空');
        return;
    }
    
    // 保存按钮文字改为"保存中..."
    const memoSaveBtn = document.getElementById('memoSaveBtn');
    const originalText = memoSaveBtn.textContent;
    memoSaveBtn.textContent = '保存中...';
    memoSaveBtn.disabled = true;
    
    (async () => {
        try {
            let result;
            if (currentEditingMemo) {
                result = await updateMemo(currentEditingMemo.id, title, content);
            } else {
                result = await createMemo(title, content);
            }
            
            if (result && result.success) {
                closeMemoEditor();
                await loadMemos();
            } else {
                const errorMsg = result?.error || error?.message || '未知错误';
                alert('保存失败：' + errorMsg);
                console.error('保存备忘录失败:', result, error);
            }
        } catch (error) {
            console.error('保存备忘录异常:', error);
            alert('保存失败：' + (error.message || '网络错误，请检查服务器是否运行'));
        } finally {
            memoSaveBtn.textContent = originalText;
            memoSaveBtn.disabled = false;
        }
    })();
}

// ========== 备忘录功能 ==========
async function loadMemos() {
    try {
        const result = await getMemos();
        if (result.success && result.data) {
            renderMemos(result.data);
        }
    } catch (error) {
        console.error('加载备忘录失败:', error);
    }
}

function renderMemos(memos) {
    const memoGrid = document.getElementById('memoGrid');
    if (!memoGrid) return;
    
    memoGrid.innerHTML = '';
    
    if (!memos || memos.length === 0) {
        memoGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">暂无备忘录，点击"新建备忘录"创建第一个</p>';
        return;
    }
    
    memos.forEach(memo => {
        const memoCard = document.createElement('div');
        memoCard.className = 'memo-card';
        
        // 截取内容预览（前100个字符）
        const contentPreview = memo.content.length > 100 
            ? memo.content.substring(0, 100) + '...' 
            : memo.content;
        
        memoCard.innerHTML = `
            <div class="memo-header">
                <h3 class="memo-title">${memo.title}</h3>
                <div class="memo-actions">
                    <button class="memo-action-btn edit-btn" data-id="${memo.id}" title="编辑">✏️</button>
                    <button class="memo-action-btn delete-btn" data-id="${memo.id}" title="删除">🗑️</button>
                </div>
            </div>
            <div class="memo-content">${contentPreview.replace(/\n/g, '<br>')}</div>
            <div class="memo-footer">
                <span class="memo-date">${formatDateTime(memo.updatedAt || memo.createdAt)}</span>
                <span class="memo-author">${memo.user?.nickname || '用户'}</span>
            </div>
        `;
        
        // 点击卡片查看详情
        memoCard.addEventListener('click', (e) => {
            // 如果点击的是按钮，不触发查看
            if (e.target.closest('.memo-actions')) return;
            openMemoViewer(memo);
        });
        
        // 编辑按钮
        const editBtn = memoCard.querySelector('.edit-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openMemoEditor(memo);
        });
        
        // 删除按钮
        const deleteBtn = memoCard.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('确定要删除这个备忘录吗？')) {
                try {
                    const result = await deleteMemo(memo.id);
                    if (result.success) {
                        await loadMemos();
                    } else {
                        alert('删除失败：' + (result.error || '未知错误'));
                    }
                } catch (error) {
                    alert('删除失败：' + error.message);
                }
            }
        });
        
        memoGrid.appendChild(memoCard);
    });
}

let currentEditingMemo = null;

function openMemoEditor(memo = null) {
    const modal = document.getElementById('memoModal');
    const titleInput = document.getElementById('memoTitleInput');
    const contentInput = document.getElementById('memoContentInput');
    const editorTitle = document.getElementById('memoEditorTitle');
    const memoSaveBtn = document.getElementById('memoSaveBtn');
    
    currentEditingMemo = memo;
    
    if (memo) {
        editorTitle.textContent = '编辑备忘录';
        titleInput.value = memo.title;
        contentInput.value = memo.content;
        titleInput.readOnly = false;
        contentInput.readOnly = false;
    } else {
        editorTitle.textContent = '新建备忘录';
        titleInput.value = '';
        contentInput.value = '';
        titleInput.readOnly = false;
        contentInput.readOnly = false;
    }
    
    // 确保保存按钮状态正确
    if (memoSaveBtn) {
        memoSaveBtn.textContent = '保存';
        memoSaveBtn.disabled = false;
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeMemoEditor() {
    const modal = document.getElementById('memoModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    currentEditingMemo = null;
}

function openMemoViewer(memo) {
    // 直接打开编辑器（点击卡片时默认进入编辑模式）
    openMemoEditor(memo);
}
