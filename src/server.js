const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { scrapePage } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 网页抓取接口
app.post('/api/web-scrape', async (req, res) => {
  try {
    const { url } = req.body;

    // 验证输入
    if (!url) {
      return res.status(400).json({
        code: 1,
        error: 'URL 参数是必需的'
      });
    }

    // 验证 URL 格式
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        code: 1,
        error: '无效的 URL 格式'
      });
    }

    console.log(`收到抓取请求: ${url}`);

    // 执行网页抓取
    const result = await scrapePage(url);

    if (result.success) {
      res.json({
        code: 0,
        data: result.content,
        title: result.title || '',
        url: url
      });
    } else {
      res.status(500).json({
        code: 1,
        error: result.error || '抓取失败'
      });
    }

  } catch (error) {
    console.error('抓取过程中发生错误:', error);
    res.status(500).json({
      code: 1,
      error: '服务器内部错误'
    });
  }
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    code: 1,
    error: '接口不存在'
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('全局错误处理:', err);
  res.status(500).json({
    code: 1,
    error: '服务器内部错误'
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`抓取接口: POST http://localhost:${PORT}/api/web-scrape`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，准备关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，准备关闭服务器...');
  process.exit(0);
}); 