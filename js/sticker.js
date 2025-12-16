// ===== ArtFlow Sticker Generator =====

// 自动检测 API 地址：本地开发用 localhost:3000，部署后用当前域名
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : window.location.origin;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const uploadPreview = document.getElementById('uploadPreview');
const previewImage = document.getElementById('previewImage');
const characterDescription = document.getElementById('characterDescription');
const expressionsGrid = document.getElementById('expressionsGrid');
const generateBtn = document.getElementById('generateBtn');
const stickerGrid = document.getElementById('stickerGrid');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const stickerModal = document.getElementById('stickerModal');
const modalStickerImage = document.getElementById('modalStickerImage');
const modalExpression = document.getElementById('modalExpression');
const progressText = document.getElementById('progressText');

// State
let referenceImageBase64 = null;
let generatedStickers = [];
let currentStickerIndex = 0;

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    initUpload();
    initDefaultExpressions();
});

// ===== Default Expressions =====
const defaultExpressions = [
    // 日常问候
    "早安", "晚安", "你好", "拜拜", "谢谢", "好的", "收到", "了解",
    // 网络meme
    "绝了", "笑死", "无语", "裂开", "破防了", "emo了", "社死", "害",
    "摸鱼中", "躺平", "卷起来", "好耶", "冲鸭", "awsl", "yyds", "respect",
    // 情绪表达
    "开心", "难过", "生气", "惊讶", "爱你", "抱抱", "呜呜", "嘿嘿",
    // 回复语
    "可以", "不行", "救命", "加油", "辛苦了", "没问题", "？？？", "!!!"
];

function initDefaultExpressions() {
    renderExpressions(defaultExpressions.slice(0, 16), 8);
}

function renderExpressions(expressions, selectedCount = 8) {
    const grid = document.getElementById('expressionsGrid');
    grid.innerHTML = '';
    
    expressions.forEach((expr, index) => {
        const isSelected = index < selectedCount;
        const chip = document.createElement('label');
        chip.className = `expression-chip${isSelected ? ' selected' : ''}`;
        chip.innerHTML = `<input type="checkbox" value="${expr}"${isSelected ? ' checked' : ''}> ${expr}`;
        chip.addEventListener('click', () => {
            chip.classList.toggle('selected');
            chip.querySelector('input').checked = chip.classList.contains('selected');
        });
        grid.appendChild(chip);
    });
}

// ===== AI Generate Random Expressions =====
async function generateRandomExpressions() {
    const btn = document.querySelector('.expressions-header .btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE}/api/generate/expressions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: 16, style: 'mixed' })
        });
        
        const data = await response.json();
        
        if (data.success && data.expressions?.length > 0) {
            renderExpressions(data.expressions, 8);
            showNotification(`已生成 ${data.expressions.length} 个表情文字！`, 'success');
        } else {
            throw new Error(data.error || '生成失败');
        }
    } catch (error) {
        console.error('生成表情文字失败:', error);
        showNotification('生成失败，使用默认表情', 'warning');
        // 随机打乱默认表情
        const shuffled = [...defaultExpressions].sort(() => Math.random() - 0.5);
        renderExpressions(shuffled.slice(0, 16), 8);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ===== Select/Clear All Expressions =====
function selectAllExpressions() {
    const chips = expressionsGrid.querySelectorAll('.expression-chip');
    chips.forEach(chip => {
        chip.classList.add('selected');
        chip.querySelector('input').checked = true;
    });
}

function clearAllExpressions() {
    const chips = expressionsGrid.querySelectorAll('.expression-chip');
    chips.forEach(chip => {
        chip.classList.remove('selected');
        chip.querySelector('input').checked = false;
    });
}

// ===== Image Upload =====
function initUpload() {
    uploadArea.addEventListener('click', () => imageInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
    });
    
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageFile(file);
        }
    });
}

function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        referenceImageBase64 = e.target.result;
        previewImage.src = referenceImageBase64;
        uploadPlaceholder.style.display = 'none';
        uploadPreview.style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    referenceImageBase64 = null;
    previewImage.src = '';
    uploadPlaceholder.style.display = 'flex';
    uploadPreview.style.display = 'none';
    imageInput.value = '';
}

// ===== Expression Chips (kept for compatibility) =====
function initExpressionChips() {
    // Now handled by initDefaultExpressions
}

function addCustomExpression() {
    const input = document.getElementById('customExpression');
    const value = input.value.trim();
    
    if (!value) return;
    
    // Check if already exists
    const existing = expressionsGrid.querySelector(`input[value="${value}"]`);
    if (existing) {
        showNotification('该表情已存在', 'warning');
        return;
    }
    
    const chip = document.createElement('label');
    chip.className = 'expression-chip selected';
    chip.innerHTML = `<input type="checkbox" value="${value}" checked> ${value}`;
    chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
        chip.querySelector('input').checked = chip.classList.contains('selected');
    });
    
    expressionsGrid.appendChild(chip);
    input.value = '';
}

function getSelectedExpressions() {
    const checkboxes = expressionsGrid.querySelectorAll('input:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// ===== Generate Stickers =====
async function generateStickers() {
    const description = characterDescription.value.trim();
    const expressions = getSelectedExpressions();
    const style = document.getElementById('styleSelect').value;
    const layout = document.getElementById('layoutSelect').value;
    
    if (!description && !referenceImageBase64) {
        showNotification('请上传参考图片或输入角色描述', 'warning');
        return;
    }
    
    if (expressions.length === 0) {
        showNotification('请至少选择一个表情', 'warning');
        return;
    }
    
    // Show loading state
    generateBtn.classList.add('loading');
    generateBtn.disabled = true;
    downloadAllBtn.disabled = true;
    
    // Show skeleton loaders
    showSkeletonLoaders(expressions);
    
    try {
        let response;
        
        if (referenceImageBase64) {
            // 使用图片生成
            response = await fetch(`${API_BASE}/api/generate/sticker-from-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    referenceImageBase64,
                    characterDescription: description,
                    expressions,
                    count: expressions.length
                })
            });
        } else {
            // 纯文本描述生成
            response = await fetch(`${API_BASE}/api/generate/sticker`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterDescription: description,
                    expressions,
                    style,
                    count: expressions.length
                })
            });
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '生成失败');
        }
        
        // Display results
        generatedStickers = data.stickers;
        displayStickers(data.stickers);
        
        const successCount = data.stickers.filter(s => s.success).length;
        showNotification(`成功生成 ${successCount}/${data.stickers.length} 个表情包！`, 'success');
        
        if (successCount > 0) {
            downloadAllBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('Generation error:', error);
        showNotification(error.message || '生成失败，请重试', 'error');
        stickerGrid.innerHTML = `
            <div class="sticker-placeholder">
                <i class="fas fa-exclamation-circle"></i>
                <p>生成失败: ${error.message}</p>
            </div>
        `;
    } finally {
        generateBtn.classList.remove('loading');
        generateBtn.disabled = false;
    }
}

// ===== Show Skeleton Loaders =====
function showSkeletonLoaders(expressions) {
    let html = '';
    expressions.forEach((expr, i) => {
        html += `
            <div class="sticker-skeleton">
                <div class="skeleton-text"></div>
            </div>
        `;
        // Update progress text
        setTimeout(() => {
            progressText.textContent = `生成中 ${i + 1}/${expressions.length}...`;
        }, i * 1000);
    });
    stickerGrid.innerHTML = html;
}

// ===== Display Stickers =====
function displayStickers(stickers) {
    let html = '';
    
    stickers.forEach((sticker, index) => {
        if (sticker.success) {
            html += `
                <div class="sticker-item" onclick="openStickerModal(${index})">
                    <img src="${sticker.url}" alt="${sticker.expression}" loading="lazy">
                    <span class="expression-label">${sticker.expression}</span>
                    <div class="sticker-actions">
                        <button onclick="event.stopPropagation(); downloadSticker(${index})" title="下载">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="sticker-failed">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>${sticker.expression}</span>
                </div>
            `;
        }
    });
    
    stickerGrid.innerHTML = html;
}

// ===== Modal =====
function openStickerModal(index) {
    currentStickerIndex = index;
    const sticker = generatedStickers[index];
    
    modalStickerImage.src = sticker.url;
    modalExpression.textContent = sticker.expression;
    stickerModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeStickerModal() {
    stickerModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on escape or background click
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stickerModal.classList.contains('active')) {
        closeStickerModal();
    }
});

stickerModal.addEventListener('click', (e) => {
    if (e.target === stickerModal) {
        closeStickerModal();
    }
});

// ===== Download =====
function downloadSticker(index) {
    const sticker = generatedStickers[index];
    downloadBase64Image(sticker.url, `sticker-${sticker.expression}.png`);
}

function downloadCurrentSticker() {
    downloadSticker(currentStickerIndex);
}

async function downloadAll() {
    const successStickers = generatedStickers.filter(s => s.success);
    
    if (successStickers.length === 0) {
        showNotification('没有可下载的表情包', 'warning');
        return;
    }
    
    showNotification(`开始下载 ${successStickers.length} 个表情包...`, 'info');
    
    for (let i = 0; i < successStickers.length; i++) {
        const sticker = successStickers[i];
        await downloadBase64Image(sticker.url, `sticker-${i + 1}-${sticker.expression}.png`);
        await delay(500); // Small delay between downloads
    }
    
    showNotification('下载完成！', 'success');
}

// 下载 base64 图片
function downloadBase64Image(dataUrl, filename) {
    return new Promise((resolve) => {
        try {
            // 创建一个临时的 canvas 来处理图片
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // 转换为 blob 并下载
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    resolve();
                }, 'image/png');
            };
            img.onerror = function() {
                // 如果 canvas 方法失败，尝试直接下载
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                resolve();
            };
            img.src = dataUrl;
        } catch (e) {
            console.error('Download error:', e);
            // 备用方法：直接下载
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            resolve();
        }
    });
}

function downloadImage(url, filename) {
    return downloadBase64Image(url, filename);
}

// ===== Utilities =====
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
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
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px 24px;
        background: #16161f;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        z-index: 3000;
        animation: slideIn 0.3s ease;
        color: white;
    `;
    
    const colors = {
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#8b5cf6'
    };
    notification.style.borderLeftColor = colors[type];
    notification.style.borderLeftWidth = '4px';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
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

console.log('🎭 ArtFlow Sticker Generator Loaded');
