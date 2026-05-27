import { defineConfig } from 'vite';
import { resolve } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load env vars
dotenv.config();

// Custom Vite plugin to handle /api routes locally
const apiPlugin = () => ({
  name: 'api-server-middleware',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url.startsWith('/api/send-email')) {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          req.body = body;
          try {
            // Clear require cache to ensure fresh code on every request during dev
            const modulePath = resolve(__dirname, './api/send-email.js');
            delete require.cache[require.resolve(modulePath)];
            const handler = require(modulePath);
            
            // Mock Vercel res methods
            res.status = (code) => { res.statusCode = code; return res; };
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            };
            
            await handler(req, res);
          } catch (err) {
            console.error('API Error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [apiPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        adminLogin: resolve(__dirname, 'admin/login.html'),
        adminDashboard: resolve(__dirname, 'admin/dashboard.html'),
        studentLogin: resolve(__dirname, 'student/login.html'),
        studentApply: resolve(__dirname, 'student/apply.html'),
        studentDashboard: resolve(__dirname, 'student/dashboard.html'),
        studentExam: resolve(__dirname, 'student/exam.html'),
        studentResult: resolve(__dirname, 'student/result.html')
      }
    }
  }
});
