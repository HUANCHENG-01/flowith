# ArtFlow - AI 图片生成平台

🎨 一个类似 Flowith 的 AI 图片生成网站，支持图片生成和表情包制作。

## ✨ 功能特点

- **AI 图片生成** - 支持 OpenAI DALL-E 3 和 Google Gemini 模型
- **AI 表情包生成** - 根据角色图片/描述自动生成 Q版 LINE 风格表情包
- **AI 表情文字** - 自动生成网络热梗和常用聊天语句
- **现代化 UI** - 深色主题，渐变效果，响应式设计

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript (原生)
- **后端**: Node.js, Express
- **AI 模型**: 
  - OpenAI DALL-E 3
  - Google Gemini 3 Pro Image
  - Google Gemini 2.0 Flash

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/HUANCHENG-01/flowith.git
cd flowith
```

### 2. 安装依赖
```bash
cd server
npm install
```

### 3. 配置 API 密钥
复制 `server/.env.example` 为 `server/.env`，填入您的 API 密钥：
```env
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
```

### 4. 启动服务
```bash
npm start
```

访问 http://localhost:3000 即可使用！

## 📁 项目结构

```
flowith/
├── index.html          # 主页 - 图片生成
├── sticker.html        # 表情包生成页面
├── css/
│   ├── style.css       # 主样式
│   └── sticker.css     # 表情包页面样式
├── js/
│   ├── app.js          # 主页 JavaScript
│   └── sticker.js      # 表情包页面 JavaScript
└── server/
    ├── server.js       # Express 后端服务
    ├── package.json    # Node.js 依赖
    └── .env            # API 密钥配置
```

## 🔑 API 密钥获取

- **OpenAI**: https://platform.openai.com/api-keys
- **Google Gemini**: https://aistudio.google.com/app/apikey

## 📄 License

MIT License

## 🙏 致谢

灵感来源于 [Flowith.io](https://flowith.io/)
