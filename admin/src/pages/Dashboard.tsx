import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Avatar,
  List,
} from 'antd';
import {
  DatabaseOutlined,
  PlusOutlined,
  UserOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { getOverviewStats, getAnalysisHistory } from '@/api';
import type { AdminAnalysisItem, AdminOverviewStats } from '@/types';
import { THEME_COLORS } from '@/constants';

const trafficData = [
  { time: '12:00', requests: 400, compute: 240 },
  { time: '13:00', requests: 300, compute: 139 },
  { time: '14:00', requests: 200, compute: 980 },
  { time: '15:00', requests: 278, compute: 390 },
  { time: '16:00', requests: 189, compute: 480 },
  { time: '17:00', requests: 239, compute: 380 },
  { time: '18:00', requests: 349, compute: 430 },
];

const recentUsers = [
  { name: 'Zhang Wei', role: 'Enterprise Developer', time: '2m ago', active: true },
  { name: 'Li Na', role: 'Security Auditor', time: '14m ago', active: false },
  { name: 'Arthur Morgan', role: 'Elite Member', time: '1h ago', active: false, premium: true },
];

const recentLogs = [
  { time: '18:42:01', module: 'ANALYSIS_CORE', event: 'Repository analysis completed.', status: 'SUCCESS', resp: '1,244ms' },
  { time: '18:41:58', module: 'AUTH_PROVIDER', event: 'New high-priority seat allocation.', status: 'PROVISIONED', resp: '12ms' },
  { time: '18:41:42', module: 'GIT_FETCHER', event: 'API Rate limit exceeded.', status: 'ERROR', resp: '--' },
];

export default function Dashboard() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [recentRecords, setRecentRecords] = useState<AdminAnalysisItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, historyRes] = await Promise.all([
        getOverviewStats(),
        getAnalysisHistory({ page: 1, pageSize: 5 }),
      ]);
      setStats(statsRes);
      setRecentRecords(historyRes.items || []);
    } catch (e) {
      console.error('加载概览数据失败', e);
    } finally {
      setLoading(false);
    }
  };

  const recentColumns: ColumnsType<AdminAnalysisItem> = [
    {
      title: '仓库',
      dataIndex: 'repo_name',
      render: (name: string, record: AdminAnalysisItem) => (
        <a
          href={record.repo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-white hover:text-[#acc7ff]"
        >
          {name}
        </a>
      ),
    },
    {
      title: '分支',
      dataIndex: 'branch',
    },
    {
      title: '健康分',
      dataIndex: 'health_score',
      render: (score: number | null) => (
        <span
          className="text-xs font-bold"
          style={{
            color:
              score && score < 40
                ? THEME_COLORS.error
                : THEME_COLORS.secondaryFixedDim,
          }}
        >
          {score != null ? `${score}%` : '-'}
        </span>
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'risk_level',
      render: (level: string | null) => {
        return level ? (
          <Tag
            className="text-[10px] font-bold border-none"
            color={
              level === '高危'
                ? 'rgba(255, 180, 171, 0.1)'
                : level === '中等'
                ? 'rgba(250, 173, 20, 0.1)'
                : 'rgba(0, 226, 151, 0.1)'
            }
            style={{
              color:
                level === '高危'
                  ? THEME_COLORS.error
                  : level === '中等'
                  ? '#faad14'
                  : THEME_COLORS.secondaryFixedDim,
            }}
          >
            {level}
          </Tag>
        ) : (
          '-'
        );
      },
    },
    {
      title: '分析时间',
      dataIndex: 'created_at',
      render: (time: string) => (
        <span className="text-xs text-slate-500">
          {new Date(time).toLocaleString('zh-CN')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">
          全局概览
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          实时监控 GitIntel 分布式分析集群的状态与性能指标。
        </p>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-[#181c22] border-white/5">
            <Statistic
              title={
                <span className="text-slate-400 text-xs uppercase tracking-widest">
                  总分析仓库数
                </span>
              }
              value={stats?.total_analysis ?? 1248592}
              prefix={<DatabaseOutlined className="text-[#acc7ff]" />}
              valueStyle={{ color: '#fff', fontWeight: 'bold' }}
            />
            <div className="mt-4 text-[10px] text-[#acc7ff] bg-[#acc7ff]/10 px-2 py-0.5 rounded inline-block">
              +12.4%
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-[#181c22] border-white/5">
            <Statistic
              title={
                <span className="text-slate-400 text-xs uppercase tracking-widest">
                  今日新增仓库
                </span>
              }
              value={stats?.today_analysis ?? 14302}
              prefix={<PlusOutlined className="text-[#00e297]" />}
              valueStyle={{ color: '#fff', fontWeight: 'bold' }}
            />
            <div className="mt-4 text-[10px] text-[#00e297] bg-[#00e297]/10 px-2 py-0.5 rounded inline-block">
              +{stats?.today_analysis ?? 284} Today
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-[#181c22] border-white/5">
            <Statistic
              title={
                <span className="text-slate-400 text-xs uppercase tracking-widest">
                  当前在线用户
                </span>
              }
              value={stats?.total_users ?? 856}
              prefix={<UserOutlined className="text-[#d5bbff]" />}
              valueStyle={{ color: '#fff', fontWeight: 'bold' }}
            />
            <div className="mt-4 text-[10px] text-[#d5bbff] bg-[#d5bbff]/10 px-2 py-0.5 rounded inline-block">
              Active Now
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-[#181c22] border-white/5">
            <Statistic
              title={
                <span className="text-slate-400 text-xs uppercase tracking-widest">
                  高风险项目
                </span>
              }
              value={stats?.high_risk_count ?? 0}
              prefix={<ThunderboltOutlined className="text-[#ffb4ab]" />}
              valueStyle={{ color: '#fff', fontWeight: 'bold' }}
            />
            <div className="mt-4 text-[10px] text-[#ffb4ab] bg-[#ffb4ab]/10 px-2 py-0.5 rounded inline-block">
              HIGH RISK
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <span className="text-white font-bold">实时分析流量监控</span>
            }
            className="bg-[#181c22] border-white/5 h-full"
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData}>
                  <defs>
                    <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={THEME_COLORS.primary}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={THEME_COLORS.primary}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />
                  <XAxis dataKey="time" stroke="#666" fontSize={10} />
                  <YAxis stroke="#666" fontSize={10} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#1c2026',
                      border: 'none',
                      borderRadius: 8,
                    }}
                    itemStyle={{ fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke={THEME_COLORS.primary}
                    fillOpacity={1}
                    fill="url(#colorReq)"
                  />
                  <Area
                    type="monotone"
                    dataKey="compute"
                    stroke={THEME_COLORS.tertiary}
                    fill="transparent"
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={<span className="text-white font-bold">最近登录用户</span>}
            className="bg-[#181c22] border-white/5 h-full"
          >
            <List
              itemLayout="horizontal"
              dataSource={recentUsers}
              renderItem={(item) => (
                <List.Item className="border-white/5">
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.name}`}
                      />
                    }
                    title={
                      <span className="text-white text-xs font-bold">
                        {item.name}
                      </span>
                    }
                    description={
                      <span className="text-slate-500 text-[10px]">
                        {item.role}
                      </span>
                    }
                  />
                  <div className="text-right">
                    <div className="text-[10px] text-[#acc7ff]">{item.time}</div>
                    <div
                      className={`w-1.5 h-1.5 rounded-full ml-auto mt-1 ${
                        item.active ? 'bg-[#00e297]' : 'bg-slate-700'
                      }`}
                    />
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card
            title={<span className="text-white font-bold">最近分析记录</span>}
            className="bg-[#181c22] border-white/5"
          >
            <Table
              columns={recentColumns}
              dataSource={recentRecords}
              rowKey="id"
              loading={loading}
              pagination={false}
              size="small"
              className="bg-transparent"
              rowClassName="hover:bg-white/[0.02] transition-colors"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<span className="text-white font-bold">系统实时日志</span>}
            className="bg-[#181c22] border-white/5"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2">时间</th>
                    <th className="px-4 py-2">模块</th>
                    <th className="px-4 py-2">事件</th>
                    <th className="px-4 py-2">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentLogs.map((log, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-white/5 transition-colors ${
                        log.status === 'ERROR' ? 'bg-red-500/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-400 font-mono">
                        {log.time}
                      </td>
                      <td className="px-4 py-3">
                        <Tag
                          color={log.status === 'ERROR' ? 'error' : 'processing'}
                          className="text-[10px] border-none"
                        >
                          {log.module}
                        </Tag>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{log.event}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            log.status === 'ERROR'
                              ? 'text-[#ffb4ab]'
                              : 'text-[#00e297]'
                          }
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
