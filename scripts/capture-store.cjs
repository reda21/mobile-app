// Run with Playwright available on NODE_PATH and a local Chrome executable.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || 'dist-perf');
const output = path.resolve('assets/store');
const types = { '.js': 'application/javascript', '.html': 'text/html', '.ttf': 'font/ttf', '.png': 'image/png', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const requested = path.resolve(root, `.${new URL(req.url, 'http://localhost').pathname}`);
  if (!requested.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  const file = fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(root, 'index.html');
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

(async () => {
  fs.mkdirSync(output, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
    const page = await context.newPage();
    for (const route of ['categories', 'settings']) {
      await page.goto(`${base}/${route}`, { waitUntil: 'networkidle' });
      await page.getByText(route === 'categories' ? 'كل الأقسام والأندية' : 'إدارة التخزين والذاكرة المؤقتة', { exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(output, `${route}-web.png`) });
    }
    const analyticsSwitch = page.getByRole('switch', { name: 'مقاييس الاستخدام الاختيارية', exact: true });
    await analyticsSwitch.check();
    if (!await analyticsSwitch.isChecked()) throw new Error('Analytics consent switch did not update.');
    await analyticsSwitch.uncheck();
    await page.getByText('سياسة الخصوصية', { exact: true }).click();
    await page.getByText('البيانات المحلية', { exact: false }).waitFor();
    await context.close();
    const graphic = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
    await graphic.setContent(`<html lang="ar" dir="rtl"><body style="margin:0;background:#173C2C;color:#FAFBF8;font-family:Tahoma,Arial,sans-serif;display:flex;align-items:center;height:500px"><div style="padding:64px;flex:1"><div style="color:#C6B782;font-size:24px">شغف واحد. عالم كامل.</div><h1 style="font-size:56px;line-height:1.7;margin:20px 0">أخبار الكرة العالمية</h1><div style="font-size:26px">أقسام وأندية • محفوظات • قراءة دون اتصال</div></div><div style="margin-left:64px;width:150px;height:150px;border:3px solid #98BD91;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:80px">⚽</div></body></html>`);
    await graphic.screenshot({ path: path.join(output, 'feature-graphic.png') });
    process.stdout.write('Captured two 1080x1920 web previews and a 1024x500 feature graphic.\n');
  } finally { await browser.close(); server.close(); }
})().catch(error => { process.stderr.write(`${error.message}\n`); server.close(); process.exitCode = 1; });
