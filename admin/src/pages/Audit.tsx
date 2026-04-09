import { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  Progress,
  Tooltip,
} from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { getAnalysisHistory, deleteAnalysisRecord } from '@/api';
import type {
  AdminAnalysisItem,
  AdminHistoryListResponse,
} from '@/types';
import { THEME_COLORS } from '@/constants';

const loadData = [
  { time: '00:00', load: 40 },
  { time: '04:00', load: 60 },
  { time: '08:00', load: 45 },
  { time: '12:00', load: 90 },
  { time: '16:00', load: 70 },
  { time: '20:00', load: 30 },
  { time: '23:59', load: 15 },
];

export default function Audit() {
  const [data, setData] = useState<AdminAnalysisItem[]>([]);
  const [stats, setStats] = useState<AdminHistoryListResponse['stats'] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDataFn();
  }, [page, pageSize]);

  const loadDataFn = async () => {
    setLoading(true);
    try {
      const res = await getAnalysisHistory({ page, pageSize });
      setData(res.items || []);
      setTotal(res.total || 0);
      setStats(res.stats || null);
    } catch (e) {
      console.error('加载分析记录失败', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record: AdminAnalysisItem) => {
    try {
      await deleteAnalysisRecord(record.id);
      loadDataFn();
    } catch {
      console.error('删除失败');
    }
  };

  const columns: ColumnsType<AdminAnalysisItem> = [
    {
      title: '分析仓库',
      dataIndex: 'repo_name',
      key: 'repo',
      render: (name: string, record: AdminAnalysisItem) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              record.health_score && record.health_score < 40
                ? 'bg-[#ffb4ab]'
                : 'bg-[#00e297]'
            }`}
          />
          <div>
            <a
              href={record.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-white hover:text-[#acc7ff]"
            >
              {name}
            </a>
            <div className="text-[10px] font-mono text-slate-500">
              分支: {record.branch}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '健康分',
      dataIndex: 'health_score',
      key: 'score',
      width: 140,
      render: (score: number | null) => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress
            percent={score ?? 0}
            size="small"
            showInfo={false}
            strokeColor={
              score && score < 40
                ? THEME_COLORS.error
                : THEME_COLORS.secondaryFixedDim
            }
          />
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
        </div>
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'risk_level',
      key: 'risk',
      render: (level: string | null) => (
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
          {level || '极低'}
        </Tag>
      ),
    },
    {
      title: '质量评级',
      dataIndex: 'quality_score',
      render: (s: string | null) => (
        <span
          className="text-xs"
          style={{ color: s ? THEME_COLORS.primary : '#666' }}
        >
          {s || '未评级'}
        </span>
      ),
    },
    {
      title: '分析时间',
      dataIndex: 'created_at',
      key: 'date',
      render: (time: string) => (
        <span className="text-xs text-slate-500">
          {new Date(time).toLocaleString('zh-CN')}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      align: 'right' as const,
      width: 100,
      render: (_: unknown, record: AdminAnalysisItem) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              size="small"
              icon={<EyeOutlined className="text-[#acc7ff]" />}
              type="text"
            />
          </Tooltip>
          <Tooltip title="删除记录">
            <Button
              size="small"
              icon={<DeleteOutlined className="text-[#ffb4ab]" />}
              type="text"
              danger
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            全站分析记录审计
          </h2>
          <p className="text-slate-400 text-sm">
            实时监控全站 AI Agent 的分析动态与代码质量反馈
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            icon={<ExportOutlined />}
            className="bg-[#31353c] border-none text-white font-bold text-xs"
          >
            导出报表
          </Button>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-[#181c22] border-white/5">
            <Statistic
              title={
                <span className="text-slate-500 text-xs uppercase">
                  总分析次数
                </span>
              }
              value={stats?.total_scans ?? '-'}
              valueStyle={{ color: THEME_COLORS.primary, fontWeight: 'bold' }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-[#181c22] border-white/5">
            <Statistic
              title={
                <span className="text-slate-500 text-xs uppercase">高危项目</span>
              }
              value={stats?.high_risk_count ?? '-'}
              valueStyle={{ color: THEME_COLORS.error, fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-[#181c22] border-white/5">
            <Statistic
              title={
                <span className="text-slate-500 text-xs uppercase">中等风险</span>
              }
              value={stats?.medium_risk_count ?? '-'}
              valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="bg-[#181c22] border-white/5">
            <Statistic
              title={
                <span className="text-slate-500 text-xs uppercase">
                  平均健康分
                </span>
              }
              value={stats?.avg_health_score ?? '-'}
              suffix="%"
              valueStyle={{
                color: THEME_COLORS.secondaryFixedDim,
                fontWeight: 'bold',
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span className="text-slate-300 font-bold text-xs uppercase tracking-widest">
            分析记录列表
          </span>
        }
        className="bg-[#181c22] border-white/5"
        extra={<Tag color="blue" className="text-[10px] font-bold">LIVE</Tag>}
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          className="bg-transparent"
          rowClassName="hover:bg-white/[0.02] transition-colors"
        />
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <span className="text-slate-400 text-xs uppercase">
                全站分析负载监控
              </span>
            }
            className="bg-[#181c22] border-white/5"
          >
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loadData}>
                  <Bar
                    dataKey="load"
                    fill={THEME_COLORS.primary}
                    radius={[2, 2, 0, 0]}
                  />
                  <XAxis dataKey="time" hide />
                  <YAxis hide />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{
                      backgroundColor: '#1c2026',
                      border: 'none',
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between mt-4 text-[10px] font-mono text-slate-600 uppercase">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:59</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <span className="text-slate-400 text-xs uppercase">
                风险分布
              </span>
            }
            className="bg-[#181c22] border-white/5"
          >
            <div className="space-y-4">
              {[
                { label: '高危项目', val: stats?.high_risk_count ?? 0, color: THEME_COLORS.error },
                { label: '中等风险', val: stats?.medium_risk_count ?? 0, color: '#faad14' },
                { label: '安全项目', val: (stats?.total_scans ?? 0) - (stats?.high_risk_count ?? 0) - (stats?.medium_risk_count ?? 0), color: THEME_COLORS.secondaryFixedDim },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white font-bold">{item.label}</span>
                    <span style={{ color: item.color }}>{item.val}%</span>
                  </div>
                  <Progress
                    percent={
                      stats?.total_scans
                        ? Math.round((item.val / stats.total_scans) * 100)
                        : 0
                    }
                    showInfo={false}
                    strokeColor={item.color}
                    size="small"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
