import { defineConfig } from 'umi';

export default defineConfig({
  npmClient: 'pnpm',

  routes: [
    {
      path: '/',
      component: '@/layouts',
      routes: [
        { path: '/', redirect: '/dashboard' },
        { path: '/dashboard', component: '@/pages/dashboard' },
        { path: '/users', component: '@/pages/users' },
        { path: '/audit', component: '@/pages/audit' },
        { path: '/settings', component: '@/pages/settings' },
      ],
    },
  ],

  alias: {
    '@': '@/',
  },

  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },

  tailwindcss: {},

  cssLoader: {},

  Define: {
    'process.env.API_BASE_URL': 'http://localhost:8000',
  },

  model: {},
  initialState: {},

  request: {},

  antd: {
    dark: true,
  },

  theme: {
    '@primary-color': '#acc7ff',
  },
});