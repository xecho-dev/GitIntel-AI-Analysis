import { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Avatar,
  Button,
  Tabs,
  Input,
} from 'antd';
import {
  LinkOutlined,
  EditOutlined,
  StopOutlined,
  CrownOutlined,
  DownloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { getUserList, updateUser } from '@/api';
import type { AdminUserItem, AdminUserListResponse } from '@/types';
import { THEME_COLORS } from '@/constants';

const growthData = [
  { name: '1', value: 30 },
  { name: '2', value: 45 },
  { name: '3', value: 40 },
  { name: '4', value: 60 },
  { name: '5', value: 55 },
  { name: '6', value: 75 },
  { name: '7', value: 70 },
  { name: '8', value: 90 },
  { name: '9', value: 65 },
  { name: '10', value: 50 },
  { name: '11', value: 40 },
  { name: '12', value: 35 },
];

export default function Users() {
  const [data, setData] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [page, pageSize]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res: AdminUserListResponse = await getUserList({ page, pageSize });
      setData(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error('加载用户列表失败', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (user: AdminUserItem) => {
    try {
      await updateUser(user.id, { disabled: true });
      loadData();
    } catch {
      console.error('操作失败');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  const columns: ColumnsType<AdminUserItem> = [
    {
      title: 'UID / 用户名',
      key: 'user',
      render: (_, record: AdminUserItem) => (
        <div className="flex items-center gap-3">
          <Avatar
            src={record.avatar_url || undefined}
            shape="square"
            className="bg-[#262a31] text-[#acc7ff] font-bold"
          >
            {record.name ? getInitials(record.name) : record.login?.[0]?.toUpperCase()}
          </Avatar>
          <div>
            <div className="text-sm font-bold text-white">
              {record.name || record.login}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              @{record.login || 'unknown'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (email: string | null) => (
        <span
          className={`text-xs ${email ? 'text-slate-400' : 'text-[#ffb4ab]'}`}
        >
          {email || '未公开'}
        </span>
      ),
    },
    {
      title: 'GitHub',
      dataIndex: 'login',
      key: 'github',
      render: (login: string | null) => (
        <div
          className={`flex items-center gap-2 ${login ? 'text-slate-400' : 'text-[#ffb4ab]'}`}
        >
          <LinkOutlined className="text-sm" />
          <span className="text-xs font-mono">{login || '未关联'}</span>
        </div>
      ),
    },
    {
      title: '订阅等级',
      key: 'level',
      render: (_: unknown, record: AdminUserItem) => {
        const level = record.public_repos > 50 ? 'Enterprise' : record.public_repos > 10 ? 'Pro' : 'Free';
        return (
          <Tag
            color={
              level === 'Enterprise'
                ? 'rgba(168, 117, 252, 0.1)'
                : level === 'Pro'
                ? 'rgba(172, 199, 255, 0.1)'
                : 'rgba(255, 255, 255, 0.05)'
            }
            className="text-[10px] font-bold border-none"
            style={{
              color:
                level === 'Enterprise'
                  ? THEME_COLORS.tertiary
                  : level === 'Pro'
                  ? THEME_COLORS.primary
                  : '#666',
            }}
          >
            {level === 'Enterprise' && <CrownOutlined className="mr-1" />}
            {level}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      align: 'right' as const,
      render: (_: unknown, record: AdminUserItem) => (
        <div className="flex justify-end gap-2">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined className="text-slate-400 hover:text-[#acc7ff]" />}
          />
          <Button
            type="text"
            size="small"
            icon={<StopOutlined className="text-slate-400 hover:text-[#ffb4ab]" />}
            onClick={() => handleDisable(record)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            用户实体管理
          </h2>
          <p className="text-slate-400 text-sm">
            监控全球部署的 AI 代理交互与订阅状态
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-[#1c2026] px-4 py-2 rounded-lg border border-white/5">
            <div className="text-[10px] uppercase text-slate-500">
              活动节点
            </div>
            <div className="text-[#f4fff5] font-bold">1,402</div>
          </div>
          <div className="bg-[#1c2026] px-4 py-2 rounded-lg border border-white/5">
            <div className="text-[10px] uppercase text-slate-500">
              API 吞吐
            </div>
            <div className="text-[#acc7ff] font-bold">84k/min</div>
          </div>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card className="bg-[#181c22] border-white/5">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-sm font-bold text-white uppercase font-mono">
                  用户增长趋势
                </h3>
                <p className="text-[10px] text-slate-500">
                  过去 30 天内活跃代理分布情况
                </p>
              </div>
              <div className="flex gap-2">
                <Tag color="blue" className="text-[10px] border-none">
                  MONTHLY
                </Tag>
                <Tag className="text-[10px] bg-white/5 text-slate-400 border-none">
                  WEEKLY
                </Tag>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthData}>
                  <Bar dataKey="value">
                    {growthData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index === 7
                            ? THEME_COLORS.primary
                            : 'rgba(172, 199, 255, 0.2)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <div className="space-y-6">
            <Card className="bg-[#262a31] border-white/5">
              <Statistic
                title={
                  <span className="text-slate-500 text-[10px] uppercase">
                    付费用户占比
                  </span>
                }
                value={32.8}
                precision={1}
                suffix="%"
                valueStyle={{ color: '#fff', fontWeight: 'bold' }}
              />
              <div className="text-[#f4fff5] text-[10px] font-bold mt-2">
                +12.4%
              </div>
            </Card>
            <Card className="bg-[#262a31] border-l-2 border-[#a875fc]">
              <Statistic
                title={
                  <span className="text-slate-500 text-[10px] uppercase">
                    Enterprise 节点
                  </span>
                }
                value={124}
                suffix={
                  <span className="text-xs text-slate-500 ml-1">UNITS</span>
                }
                valueStyle={{ color: '#fff', fontWeight: 'bold' }}
              />
              <div className="text-[#d5bbff] text-[10px] font-bold mt-2">
                VIP
              </div>
            </Card>
          </div>
        </Col>
      </Row>

      <Card className="bg-[#181c22] border-white/5 overflow-hidden">
        <Tabs
          defaultActiveKey="1"
          className="px-6"
          tabBarExtraContent={
            <div className="flex gap-2 mb-2">
              <Input.Search
                placeholder="搜索用户..."
                className="w-48"
              />
              <Button
                type="text"
                icon={<FilterOutlined className="text-slate-400" />}
              />
              <Button
                type="text"
                icon={<DownloadOutlined className="text-slate-400" />}
              />
            </div>
          }
          items={[
            { key: '1', label: '全部用户' },
            { key: '2', label: '企业版' },
            { key: '3', label: '试用中' },
            { key: '4', label: '已禁用' },
          ]}
        />
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
    </div>
  );
}
