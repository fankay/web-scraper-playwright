# 网页抓取服务 (Web Scraper Service)

基于 Express 和 Playwright 的网页抓取服务，支持在 Docker 环境中运行。

## 功能特性

- 🚀 高性能网页抓取，使用 Playwright 浏览器自动化
- 🔄 智能重试机制，提高抓取成功率
- 🎭 用户代理池，模拟不同浏览器
- 🧹 智能内容提取，自动移除广告和噪音元素
- 🛡️ 反爬虫策略，包括滚动、点击展开等
- 🐳 Docker 支持，易于部署和扩展
- 📊 健康检查和错误处理

## 快速开始

### 使用 Docker Compose（推荐）

```bash
# 克隆项目
git clone <your-repo-url>
cd web-scrpy-playwright

# 构建并启动服务
docker-compose up --build

# 后台运行
docker-compose up -d --build
```

### 使用 Docker

```bash
# 构建镜像
docker build -t web-scraper .

# 运行容器
docker run -p 3000:3000 --shm-size=2g web-scraper
```

### 本地开发

```bash
# 安装依赖
npm install

# 安装 Playwright 浏览器
npx playwright install chromium

# 启动开发服务器
npm run dev

# 或启动生产服务器
npm start
```

## API 使用

### 网页抓取接口

**端点:** `POST /api/web-scrape`

**请求参数:**
```json
{
  "url": "https://example.com"
}
```

**成功响应:**
```json
{
  "code": 0,
  "data": "抓取的网页文本内容...",
  "title": "网页标题",
  "url": "https://example.com"
}
```

**错误响应:**
```json
{
  "code": 1,
  "error": "错误描述"
}
```

### 健康检查接口

**端点:** `GET /health`

**响应:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

## 使用示例

### cURL

```bash
# 抓取网页内容
curl -X POST http://localhost:3000/api/web-scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# 健康检查
curl http://localhost:3000/health
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

async function scrapePage(url) {
  try {
    const response = await axios.post('http://localhost:3000/api/web-scrape', {
      url: url
    });
    
    if (response.data.code === 0) {
      console.log('抓取成功:', response.data.data);
    } else {
      console.error('抓取失败:', response.data.error);
    }
  } catch (error) {
    console.error('请求失败:', error.message);
  }
}

scrapePage('https://example.com');
```

### Python

```python
import requests

def scrape_page(url):
    try:
        response = requests.post(
            'http://localhost:3000/api/web-scrape',
            json={'url': url}
        )
        
        data = response.json()
        if data['code'] == 0:
            print('抓取成功:', data['data'])
        else:
            print('抓取失败:', data['error'])
            
    except Exception as e:
        print('请求失败:', str(e))

scrape_page('https://example.com')
```

## 配置选项

### 环境变量

- `PORT`: 服务端口（默认: 3000）
- `NODE_ENV`: 运行环境（development/production）

### Docker 配置

建议的 Docker 运行配置：

```bash
docker run -p 3000:3000 \
  --shm-size=2g \
  --memory=2g \
  --security-opt seccomp=unconfined \
  web-scraper
```

重要配置说明：
- `--shm-size=2g`: 为 Chromium 提供足够的共享内存
- `--memory=2g`: 限制内存使用
- `--security-opt seccomp=unconfined`: 允许 Chromium 沙箱正常工作

## 技术架构

### 核心组件

- **Express Server**: RESTful API 服务器
- **Playwright**: 浏览器自动化和网页抓取
- **Cheerio**: HTML 解析和内容提取
- **用户代理池**: 模拟不同浏览器类型
- **智能重试**: 多种策略的重试机制

### 抓取策略

1. **用户代理轮换**: 随机选择不同的浏览器标识
2. **资源阻断**: 阻止图片、CSS 等资源加载以提高速度
3. **页面交互**: 自动滚动、点击展开按钮等
4. **内容提取**: 智能识别主要内容区域
5. **噪音过滤**: 移除广告、导航等无关元素

## 故障排除

### 常见问题

1. **浏览器启动失败**
   ```
   解决方案: 确保使用正确的 Docker 配置，特别是 shm-size
   ```

2. **内存不足**
   ```
   解决方案: 增加容器内存限制至少 2GB
   ```

3. **版本不匹配错误**
   ```
   解决方案: 确保 package.json 中的 Playwright 版本与 Docker 镜像版本一致
   ```

4. **抓取失败**
   ```
   解决方案: 检查目标网站是否有反爬虫机制，尝试调整重试策略
   ```

### 日志查看

```bash
# Docker Compose
docker-compose logs -f web-scraper

# Docker
docker logs -f <container-id>
```

## 性能优化

- 使用资源阻断减少不必要的网络请求
- 合理设置超时时间
- 使用连接池复用浏览器实例（生产环境建议）
- 监控内存使用情况

## 安全注意事项

- 仅在受信任的环境中使用
- 避免抓取恶意网站
- 定期更新 Playwright 版本
- 遵守目标网站的 robots.txt 和使用条款

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！ 