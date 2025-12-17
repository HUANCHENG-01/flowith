const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '..')));

// API Keys from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// WhatAI API 配置
const WHATAI_API_URL = process.env.WHATAI_API_URL || 'https://api.whatai.cc';
const WHATAI_API_KEY = process.env.WHATAI_API_KEY;
const WHATAI_MODEL = process.env.WHATAI_MODEL || 'gemini-3-pro-image-preview';

// ===== WhatAI 图片生成代理 =====
app.post('/api/generate/image', async (req, res) => {
    try {
        const { prompt, count = 1 } = req.body;

        if (!WHATAI_API_KEY) {
            return res.status(500).json({ 
                error: '未配置 WhatAI API 密钥',
                message: '请在 server/.env 文件中设置 WHATAI_API_KEY'
            });
        }

        if (!prompt) {
            return res.status(400).json({ error: '请提供图片描述' });
        }

        console.log(`[WhatAI] 生成图片: "${prompt.substring(0, 50)}..."`);

        const images = [];
        
        for (let i = 0; i < count; i++) {
            const response = await fetch(`${WHATAI_API_URL}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${WHATAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: WHATAI_MODEL,
                    messages: [
                        {
                            role: 'user',
                            content: `Generate an image: ${prompt}`
                        }
                    ]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[WhatAI] API 错误:', data.error);
                throw new Error(data.error?.message || '生成失败');
            }

            // 解析返回的图片
            const imageUrl = extractImageFromResponse(data);
            if (imageUrl) {
                images.push({
                    url: imageUrl,
                    prompt: prompt,
                    model: WHATAI_MODEL
                });
            }
        }

        console.log(`[WhatAI] 生成成功: ${images.length} 张图片`);
        res.json({
            success: true,
            images: images,
            model: WHATAI_MODEL
        });

    } catch (error) {
        console.error('[WhatAI] 服务器错误:', error);
        res.status(500).json({ 
            error: '生成失败',
            message: error.message 
        });
    }
});

// ===== WhatAI 表情包生成代理 =====
app.post('/api/generate/sticker', async (req, res) => {
    try {
        const { description, expressions, style = 'line', referenceImage } = req.body;

        if (!WHATAI_API_KEY) {
            return res.status(500).json({ 
                error: '未配置 WhatAI API 密钥'
            });
        }

        if (!description && !referenceImage) {
            return res.status(400).json({ error: '请提供角色描述或参考图片' });
        }

        if (!expressions || expressions.length === 0) {
            return res.status(400).json({ error: '请选择至少一个表情' });
        }

        console.log(`[WhatAI] 生成表情包: ${expressions.length} 个`);

        const stickers = [];
        const styleMap = {
            'line': 'LINE sticker style, simple cute',
            'chibi': 'chibi anime style',
            'emoji': 'simple emoji style',
            'watercolor': 'watercolor hand-drawn style'
        };

        for (let i = 0; i < expressions.length; i++) {
            const expr = expressions[i];
            console.log(`[WhatAI] 生成表情 ${i + 1}/${expressions.length}: "${expr}"`);

            try {
                let prompt = `Generate a cute chibi sticker image with text "${expr}" displayed prominently. `;
                prompt += `Style: ${styleMap[style] || styleMap.line}. `;
                prompt += `White or transparent background. `;
                
                if (description) {
                    prompt += `Character description: ${description}. `;
                }
                
                prompt += `The expression/emotion should match the text "${expr}". High quality, cute, expressive.`;

                const requestBody = {
                    model: WHATAI_MODEL,
                    messages: [
                        {
                            role: 'user',
                            content: referenceImage ? [
                                { type: 'text', text: prompt },
                                { type: 'image_url', image_url: { url: referenceImage } }
                            ] : prompt
                        }
                    ]
                };

                const response = await fetch(`${WHATAI_API_URL}/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${WHATAI_API_KEY}`
                    },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error?.message || '生成失败');
                }

                const imageUrl = extractImageFromResponse(data);
                stickers.push({
                    expression: expr,
                    url: imageUrl,
                    success: !!imageUrl
                });

            } catch (err) {
                console.error(`[WhatAI] 生成 "${expr}" 失败:`, err.message);
                stickers.push({
                    expression: expr,
                    url: null,
                    success: false,
                    error: err.message
                });
            }
        }

        const successCount = stickers.filter(s => s.success).length;
        console.log(`[WhatAI] 表情包生成完成: ${successCount}/${stickers.length}`);

        res.json({
            success: true,
            stickers: stickers,
            model: WHATAI_MODEL
        });

    } catch (error) {
        console.error('[WhatAI] 服务器错误:', error);
        res.status(500).json({ 
            error: '生成失败',
            message: error.message 
        });
    }
});

// ===== WhatAI 生成随机表情文字 =====
app.post('/api/generate/expressions', async (req, res) => {
    try {
        const { count = 16 } = req.body;

        if (!WHATAI_API_KEY) {
            return res.status(500).json({ error: '未配置 API 密钥' });
        }

        const response = await fetch(`${WHATAI_API_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${WHATAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'user',
                        content: `生成${count}个适合表情包的中文短语，包括日常问候、网络meme、情绪表达等。每行一个，只输出短语，不要编号和其他内容。`
                    }
                ],
                max_tokens: 300
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || '生成失败');
        }

        const content = data.choices?.[0]?.message?.content || '';
        const expressions = content
            .split('\n')
            .map(e => e.trim())
            .filter(e => e && e.length <= 10);

        res.json({
            success: true,
            expressions: expressions.slice(0, count)
        });

    } catch (error) {
        console.error('[WhatAI] 生成表情文字失败:', error);
        res.status(500).json({ 
            error: '生成失败',
            message: error.message 
        });
    }
});

// ===== 从 API 响应中提取图片 =====
function extractImageFromResponse(data) {
    if (!data.choices?.[0]?.message) return null;
    
    const message = data.choices[0].message;
    const content = message.content;

    // 检查 parts 格式 (Gemini 风格)
    if (message.parts) {
        for (const part of message.parts) {
            if (part.inline_data?.data) {
                const mimeType = part.inline_data.mime_type || 'image/png';
                return `data:${mimeType};base64,${part.inline_data.data}`;
            }
        }
    }

    // 检查数组格式（多模态返回）
    if (Array.isArray(content)) {
        for (const part of content) {
            if (part.type === 'image_url') {
                return part.image_url?.url;
            }
            if (part.type === 'image' && part.source?.data) {
                const mimeType = part.source.media_type || 'image/png';
                return `data:${mimeType};base64,${part.source.data}`;
            }
        }
    }

    // 检查字符串内容
    if (typeof content === 'string') {
        // Base64 图片
        if (content.includes('data:image')) {
            const match = content.match(/data:image[^"'\s]+/);
            if (match) return match[0];
        }
        // Markdown 图片链接
        const imgMatch = content.match(/!\[.*?\]\((.*?)\)/);
        if (imgMatch) return imgMatch[1];
        // 纯 URL
        const urlMatch = content.match(/https?:\/\/[^\s"']+\.(png|jpg|jpeg|gif|webp)/i);
        if (urlMatch) return urlMatch[0];
    }

    return null;
}

// ===== API 状态检查 =====
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        whatai: !!WHATAI_API_KEY,
        openai: !!OPENAI_API_KEY,
        gemini: !!GEMINI_API_KEY,
        model: WHATAI_MODEL
    });
});

// ===== OpenAI DALL-E Image Generation =====
app.post('/api/generate/openai', async (req, res) => {
    try {
        const { prompt, size = '1024x1024', quality = 'standard', n = 1 } = req.body;

        if (!OPENAI_API_KEY) {
            return res.status(500).json({ 
                error: '未配置 OpenAI API 密钥',
                message: '请在 server/.env 文件中设置 OPENAI_API_KEY'
            });
        }

        if (!prompt) {
            return res.status(400).json({ error: '请提供图片描述' });
        }

        console.log(`[OpenAI] 生成图片: "${prompt.substring(0, 50)}..."`);

        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: prompt,
                n: Math.min(n, 1), // DALL-E 3 only supports n=1
                size: size,
                quality: quality,
                response_format: 'url'
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('[OpenAI] API 错误:', data.error);
            return res.status(400).json({ 
                error: data.error.message || '生成失败',
                code: data.error.code
            });
        }

        console.log(`[OpenAI] 生成成功`);
        res.json({
            success: true,
            images: data.data.map(img => ({
                url: img.url,
                revised_prompt: img.revised_prompt
            })),
            model: 'dall-e-3'
        });

    } catch (error) {
        console.error('[OpenAI] 服务器错误:', error);
        res.status(500).json({ 
            error: '服务器错误',
            message: error.message 
        });
    }
});

// ===== Google Gemini (Imagen) Image Generation =====
app.post('/api/generate/gemini', async (req, res) => {
    try {
        const { prompt, aspectRatio = '1:1', n = 1 } = req.body;

        if (!GEMINI_API_KEY) {
            return res.status(500).json({ 
                error: '未配置 Gemini API 密钥',
                message: '请在 server/.env 文件中设置 GEMINI_API_KEY'
            });
        }

        if (!prompt) {
            return res.status(400).json({ error: '请提供图片描述' });
        }

        console.log(`[Gemini] 生成图片: "${prompt.substring(0, 50)}..."`);

        // 使用 Gemini 的 Imagen 3 模型生成图片
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    instances: [{ prompt: prompt }],
                    parameters: {
                        sampleCount: Math.min(n, 4),
                        aspectRatio: aspectRatio,
                        safetyFilterLevel: "BLOCK_MEDIUM_AND_ABOVE",
                        personGeneration: "ALLOW_ADULT"
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            console.error('[Gemini] API 错误:', data.error);
            return res.status(400).json({ 
                error: data.error.message || '生成失败',
                code: data.error.code
            });
        }

        // 处理返回的 base64 图片
        const images = [];
        if (data.predictions) {
            for (const prediction of data.predictions) {
                if (prediction.bytesBase64Encoded) {
                    images.push({
                        url: `data:image/png;base64,${prediction.bytesBase64Encoded}`,
                        mimeType: prediction.mimeType || 'image/png'
                    });
                }
            }
        }

        if (images.length === 0) {
            return res.status(400).json({ 
                error: '未能生成图片',
                details: data
            });
        }

        console.log(`[Gemini] 生成成功, ${images.length} 张图片`);
        res.json({
            success: true,
            images: images,
            model: 'imagen-3.0'
        });

    } catch (error) {
        console.error('[Gemini] 服务器错误:', error);
        res.status(500).json({ 
            error: '服务器错误',
            message: error.message 
        });
    }
});

// ===== 使用 Gemini 2.0 Flash 生成图片 (实验性) =====
app.post('/api/generate/gemini-flash', async (req, res) => {
    try {
        const { prompt, n = 1 } = req.body;

        if (!GEMINI_API_KEY) {
            return res.status(500).json({ 
                error: '未配置 Gemini API 密钥',
                message: '请在 server/.env 文件中设置 GEMINI_API_KEY'
            });
        }

        if (!prompt) {
            return res.status(400).json({ error: '请提供图片描述' });
        }

        console.log(`[Gemini Flash] 生成图片: "${prompt.substring(0, 50)}..."`);

        // 使用 Gemini 2.0 Flash 实验性图片生成
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `Generate an image: ${prompt}` }]
                    }],
                    generationConfig: {
                        responseModalities: ["image", "text"],
                        responseMimeType: "image/png"
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            console.error('[Gemini Flash] API 错误:', data.error);
            return res.status(400).json({ 
                error: data.error.message || '生成失败',
                code: data.error.code
            });
        }

        // 提取图片
        const images = [];
        if (data.candidates) {
            for (const candidate of data.candidates) {
                if (candidate.content && candidate.content.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.inlineData) {
                            images.push({
                                url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                                mimeType: part.inlineData.mimeType
                            });
                        }
                    }
                }
            }
        }

        if (images.length === 0) {
            return res.status(400).json({ 
                error: '未能生成图片，请尝试其他模型',
                details: data
            });
        }

        console.log(`[Gemini Flash] 生成成功`);
        res.json({
            success: true,
            images: images,
            model: 'gemini-2.0-flash-exp'
        });

    } catch (error) {
        console.error('[Gemini Flash] 服务器错误:', error);
        res.status(500).json({ 
            error: '服务器错误',
            message: error.message 
        });
    }
});

// ===== 健康检查 =====
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        openai: !!OPENAI_API_KEY,
        gemini: !!GEMINI_API_KEY,
        timestamp: new Date().toISOString()
    });
});

// ===== AI 生成表情文字 =====
app.post('/api/generate/expressions', async (req, res) => {
    try {
        const { count = 12, style = 'mixed' } = req.body;

        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: '未配置 Gemini API 密钥' });
        }

        console.log(`[Expressions] 生成 ${count} 个表情文字`);

        const prompt = `你是一个创意表情包文字生成器。请生成 ${count} 个适合用作表情包的短语/文字。

要求：
1. 涵盖日常聊天常用语句（问候、感谢、道歉、告别等）
2. 包含一些流行的网络meme和梗（如"绝绝子"、"yyds"、"摸鱼"、"社死"等）
3. 包含一些可爱/搞笑的情绪表达
4. 每个短语要简短有力，1-4个字最佳，最长不超过6个字
5. 要有趣、接地气、符合年轻人聊天风格
6. 可以包含一些表情符号

请直接返回JSON数组格式，不要有其他文字，例如：
["早安", "晚安", "谢谢", "绝了", "笑死", "摸鱼中", "社死", "emo了", "冲鸭", "好耶"]`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: 500
                    }
                })
            }
        );

        const data = await response.json();
        
        let expressions = [];
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = data.candidates[0].content.parts[0].text;
            // 尝试解析 JSON
            try {
                const jsonMatch = text.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    expressions = JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                // 如果解析失败，用默认值
                console.error('[Expressions] JSON解析失败:', e.message);
            }
        }

        // 如果AI生成失败，使用丰富的默认列表
        if (expressions.length === 0) {
            expressions = [
                "早安", "晚安", "谢谢", "好的", "收到", "了解",
                "绝了", "笑死", "无语", "裂开", "破防了", "emo了",
                "摸鱼中", "社死", "好耶", "冲鸭", "加油", "fighting",
                "可以", "不行", "救命", "害", "呜呜", "嘿嘿",
                "？？？", "!!!", "6", "respect", "awsl", "yyds"
            ];
        }

        console.log(`[Expressions] 生成成功: ${expressions.length} 个`);
        res.json({ success: true, expressions: expressions.slice(0, count) });

    } catch (error) {
        console.error('[Expressions] 错误:', error);
        res.status(500).json({ error: '生成失败', message: error.message });
    }
});

// ===== 表情包生成 - 使用 Gemini 2.0 Flash =====
app.post('/api/generate/sticker', async (req, res) => {
    try {
        const { 
            characterDescription, 
            referenceImage,
            expressions = ['开心', '难过', '生气', '惊讶', '爱心', '再见'],
            style = 'Q版LINE风格',
            layout = '4x6',
            count = 8
        } = req.body;

        if (!GEMINI_API_KEY) {
            return res.status(500).json({ 
                error: '未配置 Gemini API 密钥',
                message: '请在 server/.env 文件中设置 GEMINI_API_KEY'
            });
        }

        if (!characterDescription) {
            return res.status(400).json({ error: '请提供角色描述' });
        }

        console.log(`[Sticker] 生成表情包: "${characterDescription.substring(0, 50)}..."`);

        const results = [];
        
        // 使用 Gemini 2.0 Flash 生成每个表情
        for (let i = 0; i < Math.min(expressions.length, count); i++) {
            const expression = expressions[i];
            const prompt = `Generate a cute ${style} sticker image:
Character: ${characterDescription}
Expression/Emotion: ${expression}
Style requirements:
- Chibi/Q-version style with big head and small body
- LINE sticker aesthetic, kawaii style
- Pure white background
- Cute and expressive character
- Add text label "${expression}" at the bottom in cute font
- Clean design, single character centered
- Colorful hand-drawn illustration style
- High quality sticker design`;
            
            console.log(`[Sticker] 生成表情 ${i + 1}/${Math.min(expressions.length, count)}: ${expression}`);
            
            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{ text: prompt }]
                            }],
                            generationConfig: {
                                responseModalities: ["IMAGE", "TEXT"]
                            }
                        })
                    }
                );

                const data = await response.json();

                // 提取图片
                let imageData = null;
                if (data.candidates?.[0]?.content?.parts) {
                    for (const part of data.candidates[0].content.parts) {
                        if (part.inlineData) {
                            imageData = part.inlineData;
                            break;
                        }
                    }
                }

                if (imageData) {
                    results.push({
                        expression: expression,
                        url: `data:${imageData.mimeType};base64,${imageData.data}`,
                        success: true
                    });
                } else {
                    console.error(`[Sticker] 表情 ${expression} 生成失败:`, data.error || 'No image in response');
                    results.push({
                        expression: expression,
                        error: data.error?.message || '未能生成图片',
                        success: false
                    });
                }
            } catch (err) {
                console.error(`[Sticker] 表情 ${expression} 请求错误:`, err.message);
                results.push({
                    expression: expression,
                    error: err.message,
                    success: false
                });
            }
            
            // 添加延迟避免 API 限流
            if (i < count - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`[Sticker] 生成完成: ${successCount}/${results.length} 成功`);

        res.json({
            success: true,
            stickers: results,
            totalRequested: count,
            successCount: successCount,
            model: 'gemini-3-pro-image-preview'
        });

    } catch (error) {
        console.error('[Sticker] 服务器错误:', error);
        res.status(500).json({ 
            error: '服务器错误',
            message: error.message 
        });
    }
});

// ===== 根据参考图生成表情包 =====
app.post('/api/generate/sticker-from-image', async (req, res) => {
    try {
        const { 
            referenceImageBase64,
            characterDescription,
            expressions = ['早安!', '晚安~', '谢谢!', '好的!', '不客气!', '抱歉...', '生气', '再见'],
            count = 8
        } = req.body;

        if (!GEMINI_API_KEY) {
            return res.status(500).json({ 
                error: '未配置 Gemini API 密钥'
            });
        }

        console.log(`[Sticker-Image] 根据图片生成表情包`);

        // 使用 Gemini 2.0 Flash 分析参考图片
        let characterAnalysis = characterDescription || '';
        
        if (referenceImageBase64 && !characterDescription) {
            // 先用 Gemini 分析图片中的角色
            try {
                const analysisResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: "Please describe this character's appearance in detail, including hair style, hair color, eye color, clothing, accessories, and any distinctive features. Describe in English for image generation." },
                                    { 
                                        inlineData: { 
                                            mimeType: "image/png", 
                                            data: referenceImageBase64.replace(/^data:image\/\w+;base64,/, '')
                                        } 
                                    }
                                ]
                            }]
                        })
                    }
                );
                
                const analysisData = await analysisResponse.json();
                if (analysisData.candidates?.[0]?.content?.parts?.[0]?.text) {
                    characterAnalysis = analysisData.candidates[0].content.parts[0].text;
                    console.log(`[Sticker-Image] 角色分析完成: ${characterAnalysis.substring(0, 100)}...`);
                }
            } catch (err) {
                console.error('[Sticker-Image] 角色分析失败:', err.message);
                characterAnalysis = 'a cute anime character';
            }
        }

        // 生成表情包
        const results = [];
        const maxCount = Math.min(expressions.length, count);
        
        for (let i = 0; i < maxCount; i++) {
            const expression = expressions[i];
            const prompt = `Generate a cute chibi/Q-version LINE sticker image:
Character description: ${characterAnalysis}
Expression/Text: ${expression}

Style requirements:
- Cute chibi style with oversized head and small body
- LINE sticker format
- Pure white background (#FFFFFF)
- Bold colorful outline
- Text "${expression}" displayed at bottom in cute Chinese font style
- Single sticker design, character centered
- Kawaii/cute aesthetic
- High quality illustration
- Expressive and emotional`;

            console.log(`[Sticker-Image] 生成表情 ${i + 1}/${maxCount}: ${expression}`);

            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{ text: prompt }]
                            }],
                            generationConfig: {
                                responseModalities: ["IMAGE", "TEXT"]
                            }
                        })
                    }
                );

                const data = await response.json();

                // 提取图片
                let imageData = null;
                if (data.candidates?.[0]?.content?.parts) {
                    for (const part of data.candidates[0].content.parts) {
                        if (part.inlineData) {
                            imageData = part.inlineData;
                            break;
                        }
                    }
                }

                if (imageData) {
                    results.push({
                        expression,
                        url: `data:${imageData.mimeType};base64,${imageData.data}`,
                        success: true
                    });
                    console.log(`[Sticker-Image] ✓ ${expression} 生成成功`);
                } else {
                    console.error(`[Sticker-Image] ✗ ${expression} 无图片数据`);
                    results.push({ expression, success: false, error: '未能生成图片' });
                }
            } catch (err) {
                console.error(`[Sticker-Image] ✗ ${expression} 错误:`, err.message);
                results.push({ expression, success: false, error: err.message });
            }

            // 延迟避免限流
            if (i < maxCount - 1) {
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`[Sticker-Image] 完成: ${successCount}/${results.length} 成功`);

        res.json({
            success: true,
            stickers: results,
            characterAnalysis,
            successCount,
            model: 'gemini-3-pro-image-preview'
        });

    } catch (error) {
        console.error('[Sticker-Image] 错误:', error);
        res.status(500).json({ error: '服务器错误', message: error.message });
    }
});

// ===== 启动服务器 =====
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║         ArtFlow AI 图片生成服务器                      ║
╠═══════════════════════════════════════════════════════╣
║  服务器地址: http://localhost:${PORT}                    ║
║  OpenAI API: ${OPENAI_API_KEY ? '✓ 已配置' : '✗ 未配置'}                            ║
║  Gemini API: ${GEMINI_API_KEY ? '✓ 已配置' : '✗ 未配置'}                            ║
╚═══════════════════════════════════════════════════════╝
    `);
});
