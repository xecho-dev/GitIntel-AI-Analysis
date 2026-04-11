import React from 'react';
import { Link, useLocation, Outlet } from 'umi';
import { Layout as AntdLayout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  AuditOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Sider, Content } = AntdLayout;

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: <Link to="/dashboard">全局概览</Link>,
  },
  {
    key: '/users',
    icon: <UserOutlined />,
    label: <Link to="/users">用户管理</Link>,
  },
  {
    key: '/audit',
    icon: <AuditOutlined />,
    label: <Link to="/audit">分析审计</Link>,
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: <Link to="/settings">系统设置</Link>,
  },
];

const THEME_COLORS = {
  primary: '#acc7ff',
  primaryContainer: '#498fff',
  secondary: '#f4fff5',
  secondaryFixedDim: '#00e297',
  tertiary: '#d5bbff',
  tertiaryContainer: '#a875fc',
  error: '#ffb4ab',
  background: '#10141a',
  surface: '#10141a',
  surfaceContainer: '#1c2026',
  surfaceContainerLow: '#181c22',
  surfaceContainerLowest: '#0a0e14',
  surfaceContainerHigh: '#262a31',
  surfaceContainerHighest: '#31353c',
  onBackground: '#dfe2eb',
  onSurface: '#dfe2eb',
  onSurfaceVariant: '#c1c6d6',
  outline: '#8b909f',
  outlineVariant: '#414754',
};

export default function Layout() {
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <AntdLayout className="min-h-screen" style={{ background: THEME_COLORS.background }}>
      <Sider
        width={220}
        style={{
          background: THEME_COLORS.background,
          borderRight: `1px solid ${THEME_COLORS.outlineVariant}`,
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          overflow: 'auto',
        }}
      >
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <div className="text-white font-bold text-lg tracking-tight">
            GitIntel
            <span className="text-[#acc7ff] ml-1">Admin</span>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{
            background: 'transparent',
            border: 'none',
            marginTop: 8,
          }}
          theme="dark"
        />
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <div className="text-[10px] text-slate-600 font-mono">
            v1.0.0 • Production
          </div>
        </div>
      </Sider>
      <AntdLayout style={{ marginLeft: 220, background: THEME_COLORS.background }}>
        <Content
          style={{
            padding: 24,
            minHeight: '100vh',
            background: THEME_COLORS.background,
          }}
        >
          <div
            style={{
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              minHeight: '100%',
            }}
            className="p-6"
          >
            <Outlet />
          </div>
        </Content>
      </AntdLayout>
    </AntdLayout>
  );
}