# Novel Forge

![Novel Forge project hero](assets/project-hero.png)


> 一个面向长篇小说创作的 AI 辅助编辑室：让故事先成形，再成为作品。

Novel Forge 是一个全栈小说创作工作台，围绕“项目—世界观—人物—大纲—章节正文”的创作链路组织工作。它将趋势观察、版本档案和续写计划放到独立页面，同时让主工作台专注于创作与编辑。

## 主要能力

- **小说项目管理**：创建、编辑和删除作品，记录书名、题材、简介、目标字数与项目状态。
- **编辑室式创作工作台**：在章节大纲、世界与人物、正文编辑三个核心区域中持续完善作品。
- **AI 辅助生成**：支持大纲、世界背景、人物设定、核心冲突、风格指令和正文续写等分区生成；AI 结果先回填到可编辑区域，由作者审核后保存。
- **手动续写**：续写由用户明确点击触发，不执行后台自动生成。
- **简介优化**：用户可以先输入简单想法，再由 AI 协助整理为可编辑的作品简介。
- **多平台题材趋势库**：以表格方式展示番茄、抖音和 B 站的公开趋势观察样本，并支持筛选、排序和用户标签维护。
- **版本档案**：保存大纲和正文生成历史，支持查看、对比和回滚到编辑器。
- **导出**：支持将完整作品导出为 TXT 或 Markdown。
- **安全与可靠性**：项目资源归属校验、Origin/CSRF 防护、输入长度限制、生成配额、跨实例并发锁以及脱敏错误提示。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 19、Vite、Tailwind CSS 4、shadcn/ui、TanStack Query |
| 服务端 | Express 4、tRPC 11、TypeScript |
| 数据层 | Drizzle ORM、MySQL/TiDB |
| AI | Manus Forge LLM API |
| 身份认证 | Manus OAuth |
| 测试 | Vitest、TypeScript 类型检查 |

## 本地运行

### 环境要求

- Node.js 22+
- pnpm 9+
- MySQL 或 TiDB 数据库
- Manus OAuth 与 Forge API 所需环境变量

### 安装依赖

```bash
pnpm install
```

### 环境变量

请在本地创建 `.env`，不要将它提交到 Git。实际变量名称和用途以部署环境提供的配置为准，常见配置包括：

```bash
DATABASE_URL="mysql://user:password@host:3306/database"
JWT_SECRET="replace-with-a-local-secret"
VITE_APP_TITLE="Novel Forge 小说创作工作台"
```

AI、OAuth、对象存储和其他平台能力依赖部署环境注入的服务配置。请勿把真实 API Key、OAuth Secret 或数据库密码写入源码、README、测试数据或提交记录。

### 开发与验证

```bash
pnpm dev
pnpm check
pnpm test
pnpm build
```

开发服务默认通过 Express 承载 Vite 中间件。公开 HTTPS 预览使用 WSS/443 连接 HMR；生产构建显式使用 `NODE_ENV=production`，以避免开发版 JSX 和调试代码进入发布包。

## 项目结构

```text
client/
  src/pages/Home.tsx          # 主工作台与页面级导航
  src/components/             # 编辑、趋势和通用 UI 组件
  src/lib/navigation.ts       # hash 导航与项目深链接
  src/index.css               # 编辑室视觉系统
server/
  routers.ts                  # tRPC 业务路由与 AI 生成入口
  db.ts                       # 数据库访问辅助函数
  _core/                      # OAuth、Vite、LLM 等基础设施
shared/                       # 题材、趋势和业务校验共享模块
drizzle/                      # 数据模型与迁移
```

## 安全说明

本项目面向个人或受控环境中的创作工作流。趋势库中的公开样本是观察数据，不代表全量榜单、平台官方排名或投资建议。外部链接、外部 Skill 和网页内容必须经过人工审查后才能作为创作参考；项目不会默认执行来源不明的脚本或指令。

真实登录后的 AI 生成流程、上游 CAPTCHA 行为以及部署环境中的多实例并发压力，仍应由部署者在自己的 staging 或生产前环境中进行最终验收。

## 当前状态

Novel Forge 当前已完成核心创作链路、页面式信息架构、手动续写、分区 AI 生成、趋势表格、版本管理、基础安全加固和编辑室视觉改版。最近一次稳定验证包括：**20 个测试文件、61 个测试通过、TypeScript 检查通过、生产构建通过**，并对 1531px 超宽屏、1280px 桌面和 390px 移动端进行了首屏视觉检查。

## 许可证

本项目使用 [MIT License](LICENSE)。
