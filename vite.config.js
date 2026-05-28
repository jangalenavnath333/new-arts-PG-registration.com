import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
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
        studentResult: resolve(__dirname, 'student/result.html'),
        studentReceipt: resolve(__dirname, 'student/receipt.html')
      }
    }
  },
  server: {
    port: 5173
  }
});
