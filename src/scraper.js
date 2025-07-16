const { chromium } = require('playwright');
const cheerio = require('cheerio');

// 用户代理池 - 模拟不同的浏览器
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
];

// 内容选择器优先级列表
const CONTENT_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '.main-content',
  '.content',
  '.post-content',
  '.entry-content',
  '.article-content',
  '.page-content',
  '#main',
  '#content',
  '.container',
  'body'
];

// 需要移除的元素选择器
const NOISE_SELECTORS = [
  'script',
  'style',
  'nav',
  'header',
  'footer',
  '.navigation',
  '.nav',
  '.header',
  '.footer',
  '.sidebar',
  '.ads',
  '.advertisement',
  '.cookie-banner',
  '.popup',
  '.modal',
  '.overlay',
  '.share-buttons',
  '.social-share',
  '.comments',
  '.comment',
  '.related-posts',
  '.suggested',
  '.breadcrumb',
  '.pagination',
  '[class*="ad-"]',
  '[id*="ad-"]',
  '[class*="advertisement"]',
  '[class*="banner"]'
];

async function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function extractMainContent(html) {
  const $ = cheerio.load(html);
  
  // 首先移除噪音元素
  NOISE_SELECTORS.forEach(selector => {
    $(selector).remove();
  });
  
  let mainText = '';
  
  // 按优先级尝试不同的内容选择器
  for (const selector of CONTENT_SELECTORS) {
    const content = $(selector).first().text();
    if (content && content.trim().length > 100) { // 至少要有100个字符
      mainText = content;
      break;
    }
  }
  
  if (!mainText) {
    // 如果所有选择器都失败，尝试提取所有文本但排除常见的噪音区域
    $('header, footer, nav, aside, .header, .footer, .nav, .sidebar').remove();
    mainText = $('body').text();
  }
  
  // 清理文本
  mainText = mainText
    .replace(/\s+/g, ' ') // 多个空白字符替换为单个空格
    .replace(/\n\s*\n/g, '\n') // 多个换行替换为单个换行
    .trim();
  
  return mainText;
}

async function scrapePage(url, options = {}) {
  const {
    maxRetries = 3,
    timeout = 60000,
    waitStrategy = 'domcontentloaded',
    enableJavaScript = true,
    blockImages = true,
    blockCSS = true
  } = options;

  let browser = null;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`尝试抓取 (${attempt}/${maxRetries}): ${url}`);

      // 启动浏览器
      const isDev = process.env.NODE_ENV === "development";
      
      let browserLaunchOptions;
      
      if (isDev) {
        browserLaunchOptions = {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        };
      } else {
        // Docker 环境配置
        browserLaunchOptions = {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        };
      }

      browser = await chromium.launch(browserLaunchOptions);

      const context = await browser.newContext({
        userAgent: await getRandomUserAgent(),
        viewport: { width: 1920, height: 1080 },
        // 阻止图片和CSS以提高速度
        ...(blockImages && {
          extraHTTPHeaders: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        })
      });

      // 可选：阻止资源加载以提高速度
      if (blockImages || blockCSS) {
        await context.route('**/*', (route) => {
          const resourceType = route.request().resourceType();
          if (
            (blockImages && resourceType === 'image') ||
            (blockCSS && resourceType === 'stylesheet') ||
            resourceType === 'font'
          ) {
            route.abort();
          } else {
            route.continue();
          }
        });
      }

      const page = await context.newPage();

      // 禁用JavaScript（如果需要）
      if (!enableJavaScript) {
        await context.setExtraHTTPHeaders({
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        });
      }

      // 导航到页面
      console.log(`正在加载页面: ${url}`);
      await page.goto(url, { 
        waitUntil: waitStrategy, 
        timeout 
      });

      // 等待页面稳定
      await page.waitForTimeout(Math.min(3000, timeout / 10));

      // 尝试处理常见的反爬虫机制
      try {
        // 检查是否有验证码或阻拦页面
        const possibleCaptcha = await page.locator('text=/captcha|验证|blocked|robot/i').count();
        if (possibleCaptcha > 0) {
          console.warn("检测到可能的验证码或阻拦页面");
        }

        // 尝试滚动以触发懒加载
        await page.evaluate(() => {
          if (document.body) {
            // 缓慢滚动到底部
            const totalHeight = document.body.scrollHeight;
            let currentPosition = 0;
            const step = Math.max(100, totalHeight / 10);
            
            const scroll = () => {
              window.scrollTo(0, currentPosition);
              currentPosition += step;
              if (currentPosition < totalHeight) {
                setTimeout(scroll, 200);
              }
            };
            
            scroll();
          }
        });

        // 等待动态内容加载
        await page.waitForTimeout(2000);

        // 尝试点击"显示更多"或类似按钮
        const expandButtons = page.locator('text=/show more|显示更多|展开|查看更多|read more/i');
        const buttonCount = await expandButtons.count();
        if (buttonCount > 0) {
          try {
            await expandButtons.first().click({ timeout: 5000 });
            await page.waitForTimeout(1000);
          } catch (clickError) {
            console.warn("无法点击展开按钮:", clickError);
          }
        }

      } catch (scrollError) {
        console.warn("滚动或交互操作失败，继续处理:", scrollError);
      }

      // 获取页面标题
      const title = await page.title().catch(() => '');
      console.log(`页面标题: ${title}`);

      // 获取最终的HTML内容
      const html = await page.content();
      
      // 提取主要内容
      const mainContent = await extractMainContent(html);

      if (!mainContent || mainContent.length < 50) {
        throw new Error("提取的内容太少，可能页面未正确加载");
      }

      console.log(`成功提取内容，长度: ${mainContent.length} 字符`);

      // 关闭浏览器
      await browser.close();
      browser = null;

      return {
        success: true,
        content: mainContent,
        title: title
      };

    } catch (error) {
      console.error(`第 ${attempt} 次尝试失败:`, error.message);
      
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.warn("关闭浏览器失败:", closeError);
        }
        browser = null;
      }

      // 如果还有重试机会，等待一段时间后继续
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * attempt, 5000); // 递增延迟，最多5秒
        console.log(`等待 ${delay}ms 后进行第 ${attempt + 1} 次重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // 尝试不同的策略
        if (attempt === 2) {
          options.waitStrategy = 'networkidle';
          options.enableJavaScript = false;
        }
      }
    }
  }

  return {
    success: false,
    error: `Failed to scrape webpage after ${maxRetries} attempts`
  };
}

module.exports = {
  scrapePage,
  extractMainContent,
  getRandomUserAgent
}; 