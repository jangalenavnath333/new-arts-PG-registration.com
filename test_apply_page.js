const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`Console Error: ${msg.text()}`);
    });
    page.on('pageerror', err => errors.push(`Page Error: ${err.message}`));
    
    await page.goto('http://localhost:3000/student/apply.html', { waitUntil: 'networkidle2' });
    
    if (errors.length > 0) {
      console.log("ERRORS FOUND:");
      console.log(errors.join('\n'));
    } else {
      console.log("No console errors found. Page loaded successfully.");
    }
    
    await browser.close();
  } catch (err) {
    console.error("Script failed:", err);
  }
})();
