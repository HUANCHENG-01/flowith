// ===== ArtFlow - AI Image Generation Platform =====

// API Configuration - 通过后端代理调用
const API_CONFIG = {
    baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : window.location.origin
};

// Current selected model - 使用 gemini-3-pro-image-preview
let currentModel = 'gemini';

// DOM Elements
const promptInput = document.getElementById('promptInput');
const charCount = document.getElementById('charCount');
const generateBtn = document.getElementById('generateBtn');
const resultsSection = document.getElementById('resultsSection');
const resultsGrid = document.getElementById('resultsGrid');
const galleryGrid = document.getElementById('galleryGrid');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modelSelect = document.getElementById('modelSelect');

// ===== 通过后端代理生成图片 =====
async function generateWithWhatAI(prompt, count = 1) {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/generate/image`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            count: count
        })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || data.message || '生成失败');
    }
    
    if (data.images && data.images.length > 0) {
        const images = data.images.map(img => ({
            url: img.url,
            prompt: img.prompt || prompt,
            model: img.model || 'whatai',
            timestamp: new Date().toISOString()
        }));
        
        generatedImages = [...images, ...generatedImages];
        displayGeneratedImages();
        return images;
    }
    
    return [];
}

// Sample Images (using placeholder images for demo)
const sampleImages = [
    {
        url: 'https://picsum.photos/seed/art1/600/600',
        prompt: '梦幻森林中的精灵城堡，魔法光芒，细节丰富',
        likes: 1234,
        category: 'fantasy'
    },
    {
        url: 'https://picsum.photos/seed/art2/600/600',
        prompt: '未来都市夜景，霓虹灯，赛博朋克风格',
        likes: 2341,
        category: 'realistic'
    },
    {
        url: 'https://picsum.photos/seed/art3/600/600',
        prompt: '可爱的动漫少女，樱花背景，柔和色调',
        likes: 3456,
        category: 'anime'
    },
    {
        url: 'https://picsum.photos/seed/art4/600/600',
        prompt: '壮丽的山脉日落，金色阳光，史诗风景',
        likes: 1876,
        category: 'landscape'
    },
    {
        url: 'https://picsum.photos/seed/art5/600/600',
        prompt: '古老的魔法图书馆，漂浮的书籍，神秘氛围',
        likes: 2654,
        category: 'fantasy'
    },
    {
        url: 'https://picsum.photos/seed/art6/600/600',
        prompt: '太空站窗外的地球，细节写实，4K画质',
        likes: 4532,
        category: 'realistic'
    },
    {
        url: 'https://picsum.photos/seed/art7/600/600',
        prompt: '帅气的动漫男主角，战斗姿态，特效光芒',
        likes: 2134,
        category: 'anime'
    },
    {
        url: 'https://picsum.photos/seed/art8/600/600',
        prompt: '宁静的日式庭院，秋天红叶，禅意',
        likes: 1987,
        category: 'landscape'
    }
];

// Generated images storage
let generatedImages = [];
let currentImageUrl = '';

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    initCharCounter();
    initGallery();
    initFilterButtons();
    initNavigation();
    initModelSelector();
    checkApiStatus();
});

// ===== Character Counter =====
function initCharCounter() {
    if (promptInput) {
        promptInput.addEventListener('input', () => {
            const length = promptInput.value.length;
            charCount.textContent = `${length}/500`;
            
            if (length > 500) {
                charCount.style.color = 'var(--error)';
            } else if (length > 400) {
                charCount.style.color = 'var(--warning)';
            } else {
                charCount.style.color = 'var(--text-muted)';
            }
        });
    }
}

// ===== Add Suggestion to Prompt =====
function addSuggestion(text) {
    if (promptInput) {
        const currentValue = promptInput.value.trim();
        if (currentValue) {
            promptInput.value = currentValue + '，' + text;
        } else {
            promptInput.value = text;
        }
        // Trigger input event to update char count
        promptInput.dispatchEvent(new Event('input'));
        promptInput.focus();
    }
}

// ===== Initialize Model Selector =====
function initModelSelector() {
    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            currentModel = e.target.value;
            console.log(`切换到模型: ${currentModel}`);
            showNotification(`已切换到 ${getModelDisplayName(currentModel)}`, 'info');
        });
    }
}

// ===== Get Model Display Name =====
function getModelDisplayName(model) {
    const names = {
        'openai': 'OpenAI DALL-E 3',
        'gemini': 'Google Imagen 3',
        'gemini-flash': 'Gemini 2.0 Flash',
        'demo': '演示模式'
    };
    return names[model] || model;
}

// ===== Check API Status =====
async function checkApiStatus() {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/api/health`);
        const data = await response.json();
        console.log('API 状态:', data);
        
        if (data.whatai) {
            showNotification('API 已就绪，可以开始生成图片', 'success');
        } else {
            showNotification('API 未配置，请检查服务器设置', 'warning');
        }
    } catch (error) {
        console.warn('API 服务器未运行');
        showNotification('无法连接到服务器', 'error');
    }
}

// ===== Scroll to Generator =====
function scrollToGenerator() {
    const generator = document.getElementById('generator');
    if (generator) {
        generator.scrollIntoView({ behavior: 'smooth' });
        promptInput.focus();
    }
}

// ===== Generate Images =====
async function generateImages() {
    const prompt = promptInput.value.trim();
    
    if (!prompt) {
        showNotification('请输入图片描述', 'warning');
        promptInput.focus();
        return;
    }
    
    const count = parseInt(document.getElementById('countSelect').value);
    const style = document.getElementById('styleSelect').value;
    
    // 组合提示词
    const fullPrompt = style !== 'default' ? `${prompt}，${style}风格` : prompt;
    
    // Show loading state
    generateBtn.classList.add('loading');
    generateBtn.disabled = true;
    
    // Show skeleton loaders
    showSkeletonLoaders(count);
    
    try {
        const images = await generateWithWhatAI(fullPrompt, count);
        
        if (images.length > 0) {
            showNotification(`成功生成 ${images.length} 张图片！`, 'success');
        } else {
            showNotification('未能生成图片，请重试', 'warning');
        }
    } catch (error) {
        showNotification(error.message || '生成失败，请重试', 'error');
        console.error('Generation error:', error);
        displayGeneratedImages(); // 显示之前的结果
    } finally {
        generateBtn.classList.remove('loading');
        generateBtn.disabled = false;
    }
}

// ===== Generate with OpenAI DALL-E =====
async function generateWithOpenAI(prompt, size, quality, count) {
    const images = [];
    
    // DALL-E 3 只支持一次生成一张，需要循环
    for (let i = 0; i < count; i++) {
        showNotification(`正在生成第 ${i + 1}/${count} 张图片...`, 'info');
        
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.openai}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                size: size,
                quality: quality,
                n: 1
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '生成失败');
        }
        
        if (data.images && data.images.length > 0) {
            images.push({
                url: data.images[0].url,
                prompt: data.images[0].revised_prompt || prompt,
                model: 'dall-e-3',
                timestamp: new Date().toISOString()
            });
        }
    }
    
    generatedImages = [...images, ...generatedImages];
    displayGeneratedImages();
    return images;
}

// ===== Generate with Google Imagen =====
async function generateWithGemini(prompt, size, count) {
    // 转换尺寸为宽高比
    const aspectRatioMap = {
        '1024x1024': '1:1',
        '1024x768': '4:3',
        '768x1024': '3:4',
        '1280x720': '16:9',
        '720x1280': '9:16'
    };
    const aspectRatio = aspectRatioMap[size] || '1:1';
    
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.gemini}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            aspectRatio: aspectRatio,
            n: count
        })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || '生成失败');
    }
    
    const images = data.images.map(img => ({
        url: img.url,
        prompt: prompt,
        model: 'imagen-3.0',
        timestamp: new Date().toISOString()
    }));
    
    generatedImages = [...images, ...generatedImages];
    displayGeneratedImages();
    return images;
}

// ===== Generate with Gemini Flash =====
async function generateWithGeminiFlash(prompt, count) {
    const images = [];
    
    for (let i = 0; i < count; i++) {
        showNotification(`正在生成第 ${i + 1}/${count} 张图片...`, 'info');
        
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.geminiFlash}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                n: 1
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '生成失败');
        }
        
        if (data.images && data.images.length > 0) {
            images.push({
                url: data.images[0].url,
                prompt: prompt,
                model: 'gemini-2.0-flash',
                timestamp: new Date().toISOString()
            });
        }
    }
    
    generatedImages = [...images, ...generatedImages];
    displayGeneratedImages();
    return images;
}

// ===== Simulate Image Generation (Demo Mode) =====
async function simulateGeneration(count, prompt) {
    // Simulate network delay
    await delay(2000 + Math.random() * 1000);
    
    // Generate random images using picsum
    const newImages = [];
    for (let i = 0; i < count; i++) {
        const seed = Date.now() + i;
        newImages.push({
            url: `https://picsum.photos/seed/${seed}/600/600`,
            prompt: prompt,
            model: 'demo',
            timestamp: new Date().toISOString()
        });
    }
    
    generatedImages = [...newImages, ...generatedImages];
    displayGeneratedImages();
    return newImages;
}

// ===== Show Skeleton Loaders =====
function showSkeletonLoaders(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += '<div class="result-skeleton"></div>';
    }
    resultsGrid.innerHTML = html;
}

// ===== Display Generated Images =====
function displayGeneratedImages() {
    if (generatedImages.length === 0) {
        resultsGrid.innerHTML = `
            <div class="result-placeholder">
                <i class="fas fa-image"></i>
                <p>您的创意作品将在这里显示</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    generatedImages.forEach((image, index) => {
        const modelBadge = image.model ? `<span class="model-badge">${image.model}</span>` : '';
        html += `
            <div class="result-item" onclick="openImageModal('${image.url}')">
                <img src="${image.url}" alt="Generated Image ${index + 1}" loading="lazy">
                ${modelBadge}
                <div class="result-overlay">
                    <div class="result-actions">
                        <button onclick="event.stopPropagation(); downloadImageFromUrl('${image.url}')" title="下载">
                            <i class="fas fa-download"></i>
                        </button>
                        <button onclick="event.stopPropagation(); copyPrompt('${image.prompt}')" title="复制提示词">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button onclick="event.stopPropagation(); shareImage('${image.url}')" title="分享">
                            <i class="fas fa-share"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    resultsGrid.innerHTML = html;
}

// ===== Clear Results =====
function clearResults() {
    generatedImages = [];
    displayGeneratedImages();
    showNotification('已清空生成结果', 'info');
}

// ===== Initialize Gallery =====
function initGallery() {
    if (galleryGrid) {
        displayGalleryImages(sampleImages);
    }
}

// ===== Display Gallery Images =====
function displayGalleryImages(images) {
    let html = '';
    images.forEach((image, index) => {
        html += `
            <div class="gallery-item" data-category="${image.category}" onclick="openImageModal('${image.url}')">
                <img src="${image.url}" alt="Gallery Image ${index + 1}" loading="lazy">
                <div class="gallery-item-overlay">
                    <p class="gallery-item-prompt">${image.prompt}</p>
                    <div class="gallery-item-meta">
                        <span><i class="fas fa-heart"></i> ${formatNumber(image.likes)}</span>
                        <span><i class="fas fa-eye"></i> ${formatNumber(image.likes * 3)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    galleryGrid.innerHTML = html;
}

// ===== Initialize Filter Buttons =====
function initFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Filter images
            const filter = btn.dataset.filter;
            filterGallery(filter);
        });
    });
}

// ===== Filter Gallery =====
function filterGallery(filter) {
    const items = document.querySelectorAll('.gallery-item');
    
    items.forEach(item => {
        if (filter === 'all' || item.dataset.category === filter) {
            item.style.display = 'block';
            item.style.animation = 'fadeIn 0.3s ease';
        } else {
            item.style.display = 'none';
        }
    });
}

// ===== Image Modal =====
function openImageModal(url) {
    currentImageUrl = url;
    modalImage.src = url;
    imageModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    imageModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && imageModal.classList.contains('active')) {
        closeModal();
    }
});

// Close modal on background click
imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
        closeModal();
    }
});

// ===== Download Image =====
function downloadImage() {
    downloadImageFromUrl(currentImageUrl);
}

function downloadImageFromUrl(url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `artflow-${Date.now()}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('图片下载中...', 'info');
}

// ===== Regenerate Image =====
function regenerateImage() {
    closeModal();
    generateImages();
}

// ===== Copy Prompt =====
function copyPrompt(prompt) {
    navigator.clipboard.writeText(prompt).then(() => {
        showNotification('提示词已复制', 'success');
    }).catch(() => {
        showNotification('复制失败', 'error');
    });
}

// ===== Share Image =====
function shareImage(url) {
    if (navigator.share) {
        navigator.share({
            title: 'ArtFlow 创作',
            text: '看看我用 AI 生成的图片！',
            url: url
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(url).then(() => {
            showNotification('链接已复制', 'success');
        });
    }
}

// ===== Navigation =====
function initNavigation() {
    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Navbar scroll effect
    let lastScroll = 0;
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            navbar.style.background = 'rgba(10, 10, 15, 0.95)';
        } else {
            navbar.style.background = 'rgba(10, 10, 15, 0.8)';
        }
        
        lastScroll = currentScroll;
    });
}

// ===== Notification System =====
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px 24px;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    
    // Set border color based on type
    const colors = {
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#8b5cf6'
    };
    notification.style.borderLeftColor = colors[type];
    notification.style.borderLeftWidth = '4px';
    
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== Utility Functions =====
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// ===== Add Animation Keyframes =====
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
    }
    
    @keyframes slideIn {
        from { opacity: 0; transform: translateX(100px); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes slideOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100px); }
    }
`;
document.head.appendChild(style);

// ===== Service Worker Registration (for PWA support) =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Optionally register service worker for offline support
        // navigator.serviceWorker.register('/sw.js');
    });
}

console.log('🎨 ArtFlow - AI Image Generation Platform');
console.log('Version: 1.0.0');
