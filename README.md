# Tidal 个人资产看板

一款运行在浏览器中的个人投资组合看板，无需注册、无需服务器，数据保存在本地。支持 A 股、ETF、场外基金等品种的持仓管理与行情自选。

## 功能

### 今日总览
- 实时展示当日盈亏（金额 + 涨跌幅）和累计盈亏
- 账户总资产（持仓市值 + 现金）汇总
- 资产配置环形图（按股票/ETF/基金/现金分类）
- 资产走势面积图，支持 1D / 1W / 1M / 3M / 1Y 时间范围
- 侧边栏大盘指数（上证、深证、沪深300 等）实时行情

### 持仓管理
- 按名称、市值、今日涨跌、持仓盈亏排序
- 点击持仓查看详情：K 线图、成本均价、持仓数量、仓位占比
- 场外基金详情：净值走势、资产配置、重仓股、基金经理信息
- 添加 / 编辑 / 删除持仓，支持股数和成本价录入

### 自选列表
- 搜索并添加任意标的（股票、ETF、指数、场外基金）
- 展示现价、今日涨跌、近月走势迷你图

### 其他
- 亮色 / 暗色主题切换
- 所有数据持久化至 `localStorage`，刷新不丢失
- 支持一键清空全部数据

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | [Next.js](https://nextjs.org) (App Router) |
| 语言 | TypeScript |
| 样式 | 内联 `style` 属性 + Tailwind CSS（仅 base reset） |
| 状态 | Zustand（客户端） + TanStack Query（服务端数据） |
| 行情 | `stock-sdk`（A 股 / ETF / 指数实时行情、K 线） |
| 基金数据 | 天天基金（`fund.eastmoney.com`）净值 / 详情 API |
| 包管理 | pnpm monorepo（`apps/web`） |

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

```bash
# 构建生产版本
pnpm build

# 代码检查
pnpm lint

# 运行测试
pnpm test
```

## 项目结构

```
apps/web/                # Next.js Web 应用
├── src/
│   ├── app/
│   │   ├── api/         # 服务端 API 路由（行情、K 线、基金净值等，带内存缓存）
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── charts/      # AreaChart、CandleChart、Donut、Spark 等图表组件
│   │   ├── modals/      # 添加持仓、添加自选弹窗
│   │   ├── panes/       # 今日总览、持仓、自选三个主视图
│   │   ├── ui/          # 通用 UI 组件
│   │   ├── Sidebar.tsx
│   │   └── TidalApp.tsx
│   ├── hooks/           # 数据获取 hooks（行情、K 线、基金详情等）
│   ├── lib/             # 类型定义、工具函数、主题、格式化
│   └── store/
│       └── useStore.tsx # 全局状态（Zustand + localStorage 持久化）
├── public/
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
└── package.json
docs/adr/                # 架构决策记录
```

## 数据说明

- 行情数据每 **15 秒**自动刷新
- 场外基金显示盘中估算净值，收盘后更新为结算净值
- 配色遵循 A 股惯例：**红涨绿跌**
- 所有用户数据（持仓、自选、现金）仅存储在本地，不上传任何服务器
