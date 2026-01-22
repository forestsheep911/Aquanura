import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  // 图表类 (6)
  AreaChart,
  BarChart,
  DonutChart,
  LineChart,
  // 可视化元素 (6)
  BarList,
  CategoryBar,
  ProgressBar,
  ProgressCircle,
  Tracker,
  DeltaBar,
  // 迷你图 (3)
  SparkAreaChart,
  SparkBarChart,
  SparkLineChart,
  // 文本/指标
  Metric,
  Callout,
  Legend,
  // 徽章
  BadgeDelta,
} from '@tremor/react';

import '../styles/app.css';
import { Badge } from '../components/badge.jsx';
import { Button } from '../components/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card.jsx';
import { Input } from '../components/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/select.jsx';
import { Switch } from '../components/switch.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/tabs.jsx';
import { automationVolume, usageTrend } from '../data/demoData.js';

const PLUGIN_ID = typeof kintone !== 'undefined' ? kintone.$PLUGIN_ID : '';

const logger = window.PluginLogger || {
  info: () => {},
  error: () => {},
  file: () => {},
};

// ============ Tremor 演示数据 ============

// BarList 数据
const barListData = [
  { name: '数据导入', value: 456 },
  { name: '自动审批', value: 351 },
  { name: '通知推送', value: 271 },
  { name: '报表生成', value: 191 },
  { name: '数据同步', value: 91 },
];

// Tracker 数据
const trackerData = [
  { color: 'emerald', tooltip: '运行中' },
  { color: 'emerald', tooltip: '运行中' },
  { color: 'emerald', tooltip: '运行中' },
  { color: 'yellow', tooltip: '等待中' },
  { color: 'emerald', tooltip: '运行中' },
  { color: 'red', tooltip: '失败' },
  { color: 'emerald', tooltip: '运行中' },
  { color: 'emerald', tooltip: '运行中' },
  { color: 'emerald', tooltip: '运行中' },
  { color: 'emerald', tooltip: '运行中' },
  { color: 'yellow', tooltip: '等待中' },
  { color: 'emerald', tooltip: '运行中' },
];

// CategoryBar 数据
const categoryBarData = [
  { name: '成功', percentage: 65 },
  { name: '警告', percentage: 20 },
  { name: '失败', percentage: 15 },
];

// Spark 数据
const sparkData = [
  { month: '1月', value: 120 },
  { month: '2月', value: 150 },
  { month: '3月', value: 180 },
  { month: '4月', value: 140 },
  { month: '5月', value: 200 },
  { month: '6月', value: 230 },
];

// LineChart 数据
const lineChartData = [
  { date: '周一', API调用: 2890, 缓存命中: 2400 },
  { date: '周二', API调用: 1890, 缓存命中: 1398 },
  { date: '周三', API调用: 3890, 缓存命中: 2980 },
  { date: '周四', API调用: 2780, 缓存命中: 2108 },
  { date: '周五', API调用: 4890, 缓存命中: 4300 },
  { date: '周六', API调用: 1390, 缓存命中: 1200 },
  { date: '周日', API调用: 980, 缓存命中: 850 },
];

// 柱状图数据
const barChartData = [
  { name: '数据导入', 完成: 45, 待处理: 12 },
  { name: '自动审批', 完成: 78, 待处理: 8 },
  { name: '通知推送', 完成: 120, 待处理: 23 },
  { name: '报表生成', 完成: 56, 待处理: 5 },
];

function DesktopApp() {
  const [switchOn, setSwitchOn] = useState(true);
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="w-full rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* 顶部标题栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Aquanura 组件演示</h2>
            <Badge variant="default">Shadcn</Badge>
            <Badge variant="secondary">Tremor</Badge>
            <BadgeDelta deltaType="increase" size="sm">+12.5%</BadgeDelta>
          </div>
          <p className="text-sm text-muted-foreground">
            完整的 UI 组件展示 · 15+ Tremor 组件 · 7 Shadcn 组件
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">导出</Button>
          <Button size="sm">创建任务</Button>
        </div>
      </div>

      {/* Tabs 组件展示 */}
      <Tabs defaultValue="charts" className="mt-4">
        <TabsList>
          <TabsTrigger value="charts">📊 图表</TabsTrigger>
          <TabsTrigger value="visual">📈 可视化</TabsTrigger>
          <TabsTrigger value="forms">📝 表单</TabsTrigger>
          <TabsTrigger value="components">🧩 组件</TabsTrigger>
        </TabsList>

        {/* ==================== 图表 Tab ==================== */}
        <TabsContent value="charts">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* 1. AreaChart - 面积图 */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">1. AreaChart 面积图</CardTitle>
                <CardDescription>展示趋势数据的填充区域图</CardDescription>
              </CardHeader>
              <CardContent>
                <AreaChart
                  className="h-44"
                  data={usageTrend}
                  index="date"
                  categories={['requests', 'success']}
                  colors={['indigo', 'emerald']}
                  valueFormatter={(v) => v.toLocaleString()}
                  showLegend={true}
                  yAxisWidth={48}
                />
              </CardContent>
            </Card>

            {/* 2. DonutChart - 环形图 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">2. DonutChart 环形图</CardTitle>
                <CardDescription>展示占比分布</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <DonutChart
                  className="h-40 w-40"
                  data={automationVolume}
                  category="value"
                  index="name"
                  valueFormatter={(v) => `${v}%`}
                  showLabel={true}
                  colors={['blue', 'cyan', 'indigo', 'violet']}
                />
              </CardContent>
            </Card>

            {/* 3. LineChart - 折线图 */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">3. LineChart 折线图</CardTitle>
                <CardDescription>API 调用与缓存命中对比</CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart
                  className="h-44"
                  data={lineChartData}
                  index="date"
                  categories={['API调用', '缓存命中']}
                  colors={['blue', 'amber']}
                  valueFormatter={(v) => `${v.toLocaleString()}`}
                  showLegend={true}
                  yAxisWidth={48}
                />
              </CardContent>
            </Card>

            {/* 4. BarChart - 柱状图 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">4. BarChart 柱状图</CardTitle>
                <CardDescription>任务完成对比</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  className="h-44"
                  data={barChartData}
                  index="name"
                  categories={['完成', '待处理']}
                  colors={['emerald', 'amber']}
                  showLegend={true}
                  yAxisWidth={32}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== 可视化 Tab ==================== */}
        <TabsContent value="visual">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* 5. BarList - 条形列表 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">5. BarList 条形列表</CardTitle>
                <CardDescription>带数值的横向条形图</CardDescription>
              </CardHeader>
              <CardContent>
                <BarList data={barListData} className="mt-2" color="indigo" />
              </CardContent>
            </Card>

            {/* 6. Tracker - 状态追踪器 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">6. Tracker 状态追踪</CardTitle>
                <CardDescription>展示连续状态序列</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tracker data={trackerData} className="mt-2" />
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> 运行中
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" /> 等待中
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> 失败
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 7. ProgressBar - 进度条 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">7. ProgressBar 进度条</CardTitle>
                <CardDescription>线性进度指示</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>数据迁移</span>
                    <span>72%</span>
                  </div>
                  <ProgressBar value={72} color="blue" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>文件上传</span>
                    <span>45%</span>
                  </div>
                  <ProgressBar value={45} color="emerald" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>处理队列</span>
                    <span>89%</span>
                  </div>
                  <ProgressBar value={89} color="amber" />
                </div>
              </CardContent>
            </Card>

            {/* 8. ProgressCircle - 环形进度 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">8. ProgressCircle 环形进度</CardTitle>
                <CardDescription>圆形进度指示器</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <ProgressCircle value={75} size="md" color="blue">
                      <span className="text-sm font-medium">75%</span>
                    </ProgressCircle>
                    <p className="mt-2 text-xs text-muted-foreground">CPU</p>
                  </div>
                  <div className="text-center">
                    <ProgressCircle value={42} size="md" color="emerald">
                      <span className="text-sm font-medium">42%</span>
                    </ProgressCircle>
                    <p className="mt-2 text-xs text-muted-foreground">内存</p>
                  </div>
                  <div className="text-center">
                    <ProgressCircle value={91} size="md" color="rose">
                      <span className="text-sm font-medium">91%</span>
                    </ProgressCircle>
                    <p className="mt-2 text-xs text-muted-foreground">磁盘</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 9. CategoryBar - 分类条 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">9. CategoryBar 分类条</CardTitle>
                <CardDescription>多分类占比展示</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CategoryBar
                  values={[65, 20, 15]}
                  colors={['emerald', 'yellow', 'rose']}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> 成功 65%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" /> 警告 20%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> 失败 15%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 10. DeltaBar - 增量条 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">10. DeltaBar 增量条</CardTitle>
                <CardDescription>正负变化可视化</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-1 text-sm">销售增长 +25%</p>
                  <DeltaBar value={25} className="mt-1" />
                </div>
                <div>
                  <p className="mb-1 text-sm">成本变化 -12%</p>
                  <DeltaBar value={-12} className="mt-1" />
                </div>
                <div>
                  <p className="mb-1 text-sm">持平 0%</p>
                  <DeltaBar value={0} className="mt-1" />
                </div>
              </CardContent>
            </Card>

            {/* 11-13. Spark Charts - 迷你图 */}
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">11-13. SparkChart 迷你图系列</CardTitle>
                <CardDescription>紧凑的趋势指示器 - Area / Line / Bar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">SparkAreaChart</span>
                      <BadgeDelta deltaType="increase" size="xs">+18%</BadgeDelta>
                    </div>
                    <Metric className="mt-1">$12,450</Metric>
                    <SparkAreaChart
                      data={sparkData}
                      categories={['value']}
                      index="month"
                      colors={['emerald']}
                      className="mt-2 h-10"
                    />
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">SparkLineChart</span>
                      <BadgeDelta deltaType="moderateIncrease" size="xs">+5%</BadgeDelta>
                    </div>
                    <Metric className="mt-1">8,234</Metric>
                    <SparkLineChart
                      data={sparkData}
                      categories={['value']}
                      index="month"
                      colors={['blue']}
                      className="mt-2 h-10"
                    />
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">SparkBarChart</span>
                      <BadgeDelta deltaType="decrease" size="xs">-3%</BadgeDelta>
                    </div>
                    <Metric className="mt-1">1,423</Metric>
                    <SparkBarChart
                      data={sparkData}
                      categories={['value']}
                      index="month"
                      colors={['amber']}
                      className="mt-2 h-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 14. Metric - 指标数字 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">14. Metric 指标数字</CardTitle>
                <CardDescription>突出显示关键数据</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">总收入</span>
                  <Metric>$71,465</Metric>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">活跃用户</span>
                  <Metric>12,847</Metric>
                </div>
              </CardContent>
            </Card>

            {/* 15. Callout - 提示框 */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">15. Callout 提示框</CardTitle>
                <CardDescription>重要信息提醒</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Callout title="系统通知" color="blue">
                  新版本已发布，包含性能优化和 Bug 修复。
                </Callout>
                <Callout title="警告" color="yellow">
                  API 配额即将用尽，请及时升级套餐。
                </Callout>
                <Callout title="错误" color="rose">
                  数据同步失败，请检查网络连接。
                </Callout>
              </CardContent>
            </Card>

            {/* 16. Legend - 图例 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">16. Legend 图例</CardTitle>
                <CardDescription>图表说明标签</CardDescription>
              </CardHeader>
              <CardContent>
                <Legend
                  categories={['成功', '警告', '失败', '处理中']}
                  colors={['emerald', 'yellow', 'rose', 'blue']}
                  className="mt-2"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== 表单 Tab ==================== */}
        <TabsContent value="forms">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">输入框 (Input)</CardTitle>
                <CardDescription>Shadcn 输入控件</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">文本输入</label>
                  <Input
                    placeholder="请输入内容..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">邮箱</label>
                  <Input type="email" placeholder="user@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">密码</label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">禁用状态</label>
                  <Input disabled placeholder="不可编辑" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">下拉选择 (Select)</CardTitle>
                <CardDescription>Shadcn 选项列表</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">选择流程类型</label>
                  <Select defaultValue="import">
                    <SelectTrigger>
                      <SelectValue placeholder="请选择..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="import">数据导入</SelectItem>
                      <SelectItem value="export">数据导出</SelectItem>
                      <SelectItem value="sync">双向同步</SelectItem>
                      <SelectItem value="notify">消息通知</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">选择优先级</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择优先级" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">🔴 高优先级</SelectItem>
                      <SelectItem value="medium">🟡 中优先级</SelectItem>
                      <SelectItem value="low">🟢 低优先级</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== 组件 Tab ==================== */}
        <TabsContent value="components">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Badge + BadgeDelta */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">徽章 (Badge / BadgeDelta)</CardTitle>
                <CardDescription>状态与增量标签</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">默认</Badge>
                  <Badge variant="secondary">次要</Badge>
                  <Badge variant="outline">轮廓</Badge>
                  <Badge variant="destructive">警告</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <BadgeDelta deltaType="increase">+12.5%</BadgeDelta>
                  <BadgeDelta deltaType="moderateIncrease">+5.2%</BadgeDelta>
                  <BadgeDelta deltaType="unchanged">0%</BadgeDelta>
                  <BadgeDelta deltaType="moderateDecrease">-3.1%</BadgeDelta>
                  <BadgeDelta deltaType="decrease">-8.7%</BadgeDelta>
                </div>
              </CardContent>
            </Card>

            {/* Button */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">按钮 (Button)</CardTitle>
                <CardDescription>Shadcn 交互按钮</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm">小按钮</Button>
                  <Button>默认</Button>
                  <Button size="lg">大按钮</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="default">主要</Button>
                  <Button variant="secondary">次要</Button>
                  <Button variant="outline">轮廓</Button>
                  <Button variant="ghost">幽灵</Button>
                  <Button variant="destructive">危险</Button>
                </div>
              </CardContent>
            </Card>

            {/* Switch */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">开关 (Switch)</CardTitle>
                <CardDescription>Shadcn 切换控制</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">启用自动同步</span>
                  <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">开启通知</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">深色模式</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">禁用状态</span>
                  <Switch disabled />
                </div>
              </CardContent>
            </Card>

            {/* 统计卡片 */}
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm">卡片 (Card) + 统计数据</CardTitle>
                <CardDescription>内容容器组件展示</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                    <div className="text-2xl font-bold text-primary">128</div>
                    <div className="text-xs text-muted-foreground">今日处理</div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-600">98.5%</div>
                    <div className="text-xs text-muted-foreground">成功率</div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                    <div className="text-2xl font-bold text-amber-600">3</div>
                    <div className="text-xs text-muted-foreground">待处理</div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">24</div>
                    <div className="text-xs text-muted-foreground">活跃流程</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function mount(container) {
  if (!container) return;
  if (!container.__aquanuraRoot) {
    container.__aquanuraRoot = createRoot(container);
  }
  container.__aquanuraRoot.render(<DesktopApp />);
}

function initForRecordDetail(event) {
  const header = kintone.app.record.getHeaderMenuSpaceElement();
  if (!header) {
    logger.error('Header space element not found');
    return event;
  }

  let container = header.querySelector('#aquanura-desktop-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'aquanura-desktop-root';
    container.className = 'w-full';
    header.appendChild(container);
  }

  mount(container);
  return event;
}

function initForRecordList(event) {
  const header = kintone.app.getHeaderSpaceElement();
  if (!header) {
    logger.error('Header space element not found on list page');
    return event;
  }

  let container = header.querySelector('#aquanura-desktop-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'aquanura-desktop-root';
    container.className = 'w-full';
    header.appendChild(container);
  }

  mount(container);
  return event;
}

if (PLUGIN_ID) {
  kintone.events.on(['app.record.detail.show'], initForRecordDetail);
  kintone.events.on(['app.record.index.show'], initForRecordList);
}

logger.file('Demo UI mounted', { source: 'ui/desktop/index.jsx' });
