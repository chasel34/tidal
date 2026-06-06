# Tidal 个人资产看板

一款运行在浏览器中的个人投资组合看板，无需注册、无需服务器，数据保存在本地。支持 A 股、ETF、场外基金等品种的持仓管理与行情自选。

## 下载

菜单栏看板（macOS，Apple Silicon）：[Releases 页面](https://github.com/chasel34/tidal/releases)

下载 `.dmg` 安装包或 `.zip` 压缩包，目前仅支持 Apple Silicon（arm64）。

> **macOS 安全提示**
>
> 本应用未经 Apple 公证，首次打开时系统会提示"无法打开，因为无法验证开发者"。绕过方式：
>
> **方式一（推荐）**：在 Finder 中右键点击应用图标 → 选择「打开」→ 再次点击「打开」确认。
>
> **方式二**：在「系统设置 → 隐私与安全性」底部点击「仍要打开」。
>
> **方式三**：终端执行 `xattr -cr /Applications/Tidal.app`，随后正常双击打开。

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

### 截图导入持仓
- 截取券商 App 的持仓页面截图，AI 自动识别并解析持仓信息，免去手动录入
- 导入前可预览和编辑识别结果，确认后写入持仓
- 需在设置中填入自己的 Claude API Key（BYOK），支持自定义 base URL 与模型 ID
- Web 端与菜单栏看板均支持

### 菜单栏看板（Electron）
- 常驻 macOS 菜单栏的轻量看板（`apps/menubar`），随时查看持仓与行情
- 基于 electron-vite 构建，与 Web 端共享 `stock-sdk` 行情与 `@tidal/core` 持仓/行情归一化规则

### 其他
- 亮色 / 暗色主题切换
- 所有数据持久化至 `localStorage`，刷新不丢失
- 支持一键清空全部数据

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | [Next.js](https://nextjs.org) (App Router) |
| 菜单栏看板 | [Electron](https://www.electronjs.org)（electron-vite，常驻 macOS 菜单栏） |
| 语言 | TypeScript |
| 样式 | 内联 `style` 属性 + Tailwind CSS（仅 base reset） |
| 状态 | Zustand（客户端） + TanStack Query（服务端数据） |
| 行情 | `stock-sdk`（A 股 / ETF / 指数实时行情、K 线） |
| 基金数据 | 天天基金（`fund.eastmoney.com`）净值 / 详情 API |
| 包管理 | pnpm monorepo（`apps/web` + `apps/menubar` + `packages/core`） |

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动 Web 开发服务器
pnpm dev

# 启动菜单栏看板（Electron）
pnpm dev:menubar
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用 Web 端。

```bash
# 构建生产版本（递归构建所有应用）
pnpm build

# 代码检查（递归）
pnpm lint

# 运行测试（递归）
pnpm test

# 打包菜单栏看板（macOS，dmg + zip）
pnpm dist:menubar
# 仅出某种产物：pnpm -F @tidal/menubar dist:dmg | dist:zip | dist:dir
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
├── tsconfig.json        # extends ../../tsconfig.base.json
├── eslint.config.mjs
└── package.json
apps/menubar/            # Electron 菜单栏应用（electron-vite）
├── src/
│   ├── main/            # 主进程（菜单栏 tray、窗口）
│   ├── preload/         # 预加载脚本
│   ├── renderer/        # 渲染进程（React 看板 UI）
│   └── shared/          # 主进程 / 渲染进程共享代码
├── electron.vite.config.ts
├── tsconfig.json        # extends ../../tsconfig.base.json
├── eslint.config.mjs
└── package.json
packages/core/           # Web 与菜单栏共享的领域逻辑
├── src/
│   ├── portfolio.ts     # 持仓派生、汇总、配置与排序
│   ├── portfolio-history.ts
│   ├── quote-normalizer.ts
│   └── types.ts
└── package.json
tsconfig.base.json       # 共享 TS 编译选项
eslint.config.base.mjs   # 共享 eslint 忽略规则
pnpm-workspace.yaml      # workspace + 依赖 catalog（共享版本）
docs/adr/                # 架构决策记录
```

## 发布流程（菜单栏看板）

1. 更新 `apps/menubar/package.json` 中的 `version` 字段
2. 提交变更：`git commit -am "chore: bump menubar version to x.y.z"`
3. 打标签并推送：`pnpm release:menubar`
4. GitHub Actions 自动构建并创建 Draft Release（约 2 分钟）
5. 在 [Releases 页面](https://github.com/chasel34/tidal/releases) 补充 Release Notes，确认产物无误后点击「Publish release」

标签格式为 `menubar-vX.Y.Z`，产物包含 `.dmg` 和 `.zip` 两种格式。

## 数据说明

- 行情数据每 **15 秒**自动刷新
- 场外基金显示盘中估算净值，收盘后更新为结算净值
- 配色遵循 A 股惯例：**红涨绿跌**
- 所有用户数据（持仓、自选、现金）仅存储在本地，不上传任何服务器
