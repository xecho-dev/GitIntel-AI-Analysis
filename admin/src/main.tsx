import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntApp, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import App from './App';
import './index.css';
import { THEME_COLORS } from './constants';

dayjs.locale('zh-cn');

const darkTheme: React.ComponentProps<typeof ConfigProvider>['theme'] = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: THEME_COLORS.primary,
    colorBgBase: THEME_COLORS.background,
    colorBgContainer: THEME_COLORS.surfaceContainer,
    colorTextBase: THEME_COLORS.onBackground,
    borderRadius: 4,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    Layout: {
      siderBg: THEME_COLORS.background,
      headerBg: 'transparent',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: 'rgba(255, 255, 255, 0.05)',
      itemSelectedColor: THEME_COLORS.primary,
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={darkTheme} locale={zhCN}>
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
