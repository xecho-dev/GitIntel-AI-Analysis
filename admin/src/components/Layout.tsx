import React from 'react';
import { Layout as AntdLayout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  AuditOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { THEME_COLORS } from '@/constants';

const { Sider, Content } = AntdLayout;

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '全局概览',
  },
  {
    key: '/users',
    icon: <UserOutlined />,
    label: '用户管理',
  },
  {
    key: '/audit',
    icon: <AuditOutlined />,
    label: '分析审计',
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '系统设置',
  },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

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
          onClick={handleMenuClick}
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
