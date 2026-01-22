import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AreaChart, BarChart, DonutChart } from '@tremor/react';

import '../styles/app.css';
import { Badge } from '../components/badge.jsx';
import { Button } from '../components/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card.jsx';
import { Input } from '../components/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/select.jsx';
import { Switch } from '../components/switch.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/tabs.jsx';
import { automationVolume, recentRuns, teamActivity, usageTrend } from '../data/demoData.js';

const PLUGIN_ID = typeof kintone !== 'undefined' ? kintone.$PLUGIN_ID : '';

function usePluginConfig() {
  if (!PLUGIN_ID || !kintone?.plugin?.app) {
    return {};
  }
  return kintone.plugin.app.getConfig(PLUGIN_ID);
}

function ConfigApp() {
  const savedConfig = usePluginConfig();
  const [projectName, setProjectName] = useState(savedConfig.projectName || 'AI 导入助理');
  const [dataMode, setDataMode] = useState(savedConfig.dataMode || 'mock');
  const [autoSync, setAutoSync] = useState(savedConfig.autoSync === 'true');
  const [notifyOnError, setNotifyOnError] = useState(savedConfig.notifyOnError !== 'false');

  const successRate = useMemo(() => {
    const total = usageTrend.reduce((acc, item) => acc + item.requests, 0);
    const success = usageTrend.reduce((acc, item) => acc + item.success, 0);
    return Math.round((success / total) * 100);
  }, []);

  const handleSave = () => {
    if (!PLUGIN_ID || !kintone?.plugin?.app) return;
    kintone.plugin.app.setConfig(
      {
        projectName,
        dataMode,
        autoSync: autoSync ? 'true' : 'false',
        notifyOnError: notifyOnError ? 'true' : 'false',
      },
      () => {
        alert('配置已保存，返回应用设置页。');
        window.location.href = `/k/admin/app/flow?app=${kintone.app.getId()}`;
      }
    );
  };

  const handleCancel = () => {
    window.location.href = `/k/admin/app/${kintone.app.getId()}/plugin/`;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Aquanura 开箱即用演示</h1>
            <p className="text-sm text-muted-foreground">
              基于 Shadcn UI + Tremor，快速搭建 Kintone 插件配置页
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Demo</Badge>
            <Badge>已启用</Badge>
          </div>
        </header>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="settings">配置</TabsTrigger>
            <TabsTrigger value="activity">活动</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardDescription>成功率</CardDescription>
                  <CardTitle>{successRate}%</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  本周自动化流程整体成功率
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>本周处理量</CardDescription>
                  <CardTitle>11,830</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  较上周提升 18%，负载稳定
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>平均耗时</CardDescription>
                  <CardTitle>1m 42s</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  近 30 次任务统计
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>请求趋势</CardTitle>
                  <CardDescription>模拟数据，展示 Tremor 图表能力</CardDescription>
                </CardHeader>
                <CardContent>
                  <AreaChart
                    className="h-64"
                    data={usageTrend}
                    index="date"
                    categories={['requests', 'success']}
                    colors={['indigo', 'emerald']}
                    valueFormatter={(value) => `${value.toLocaleString()} 次`}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>自动化占比</CardTitle>
                  <CardDescription>流程类型分布</CardDescription>
                </CardHeader>
                <CardContent>
                  <DonutChart
                    className="h-64"
                    data={automationVolume}
                    category="value"
                    index="name"
                    valueFormatter={(value) => `${value}%`}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>基础配置</CardTitle>
                  <CardDescription>这些设置会保存到插件配置中</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">项目名称</label>
                    <Input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">数据模式</label>
                    <Select value={dataMode} onValueChange={setDataMode}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择数据源" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mock">模拟数据（演示）</SelectItem>
                        <SelectItem value="api">API 接入</SelectItem>
                        <SelectItem value="manual">手动导入</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>自动化策略</CardTitle>
                  <CardDescription>开箱即用的推荐策略</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">自动同步结果</p>
                      <p className="text-xs text-muted-foreground">完成后自动写入 Kintone 记录</p>
                    </div>
                    <Switch checked={autoSync} onCheckedChange={setAutoSync} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">错误提醒</p>
                      <p className="text-xs text-muted-foreground">流程失败时发送通知</p>
                    </div>
                    <Switch checked={notifyOnError} onCheckedChange={setNotifyOnError} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} className="flex-1">
                      保存配置
                    </Button>
                    <Button variant="outline" onClick={handleCancel} className="flex-1">
                      取消
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>团队提交量</CardTitle>
                  <CardDescription>按部门统计</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChart
                    className="h-64"
                    data={teamActivity}
                    index="name"
                    categories={['submissions']}
                    colors={['cyan']}
                    valueFormatter={(value) => `${value} 次`}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>最近任务</CardTitle>
                  <CardDescription>模拟数据展示列表组件</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentRuns.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">{item.id}</p>
                        <p className="text-xs text-muted-foreground">{item.owner}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{item.duration}</p>
                        <Badge variant={item.status === '完成' ? 'secondary' : 'outline'}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function renderConfig() {
  const container = document.getElementById('aquanura-config-root');
  if (!container) return;
  const root = createRoot(container);
  root.render(<ConfigApp />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderConfig);
} else {
  renderConfig();
}
