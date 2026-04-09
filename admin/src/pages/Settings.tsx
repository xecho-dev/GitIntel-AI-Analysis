import { Card, Typography } from 'antd';

const { Title, Text } = Typography;

export default function Settings() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">
          系统设置
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          配置 GitIntel 管理后台的系统参数与功能开关。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#181c22] border-white/5">
          <Title level={4} className="text-white !mb-4">基础配置</Title>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <Text className="text-slate-400">API 端点</Text>
              <Text className="text-white font-mono text-sm">http://localhost:8000</Text>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <Text className="text-slate-400">前端地址</Text>
              <Text className="text-white font-mono text-sm">http://localhost:3000</Text>
            </div>
            <div className="flex justify-between items-center py-2">
              <Text className="text-slate-400">调试模式</Text>
              <Text className="text-[#00e297] font-bold">已开启</Text>
            </div>
          </div>
        </Card>

        <Card className="bg-[#181c22] border-white/5">
          <Title level={4} className="text-white !mb-4">Agent 配置</Title>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <Text className="text-slate-400">最大并发数</Text>
              <Text className="text-white font-mono text-sm">5</Text>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <Text className="text-slate-400">超时时间</Text>
              <Text className="text-white font-mono text-sm">300s</Text>
            </div>
            <div className="flex justify-between items-center py-2">
              <Text className="text-slate-400">分析深度</Text>
              <Text className="text-white font-mono text-sm">Standard</Text>
            </div>
          </div>
        </Card>

        <Card className="bg-[#181c22] border-white/5">
          <Title level={4} className="text-white !mb-4">系统状态</Title>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <Text className="text-slate-400">系统版本</Text>
              <Text className="text-[#acc7ff] font-mono text-sm">v2.4.0-Stable</Text>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <Text className="text-slate-400">构建时间</Text>
              <Text className="text-white font-mono text-sm">2023.10.27</Text>
            </div>
            <div className="flex justify-between items-center py-2">
              <Text className="text-slate-400">运行环境</Text>
              <Text className="text-[#00e297] font-mono text-sm">Production</Text>
            </div>
          </div>
        </Card>

        <Card className="bg-[#181c22] border-white/5">
          <Title level={4} className="text-white !mb-4">权限配置</Title>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <Text className="text-slate-400">当前角色</Text>
              <Text className="text-[#d5bbff] font-bold text-sm">SUPER USER</Text>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <Text className="text-slate-400">用户 ID</Text>
              <Text className="text-white font-mono text-sm">UID-00001-A</Text>
            </div>
            <div className="flex justify-between items-center py-2">
              <Text className="text-slate-400">访问令牌</Text>
              <Text className="text-[#ffb4ab] font-mono text-sm">已配置</Text>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
