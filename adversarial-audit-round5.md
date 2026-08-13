# Novel Forge 第五轮全量对抗性审查报告

## 审查范围

本轮重新覆盖此前出现过的全部问题：侧边栏项目总览、创作工作台、题材趋势库、版本档案和续写计划导航；项目 `project` 深链接与无效参数回退；趋势表格筛选和 ResizeObserver；故事方向空值校验；AI 简介生成；项目、章节、版本、通知和计划归属；Origin/CSRF；持久化生成配额与跨实例锁；Heartbeat 定时续写；Vite HMR；正式域名发布和生产前端启动。

## 关键发现与修复

本轮复现了正式域名空白页的真实根因。公开 bundle 已经不再使用 `jsxDEV`，但无头 Chromium 仍报告 `Uncaught TypeError: Cannot set properties of undefined (setting 'Activity')`，来源是 `react-vendor`。进一步检查发现，Vite 手动拆包把 React 与 react-dom 分到两个互相引用的 vendor chunk，形成初始化循环。修复方式是将 React 与 react-dom 统一合并到 `react-vendor`，并保留 `NODE_ENV=production` 的显式生产构建。最新本地生产构建只生成一个 React vendor chunk，`jsxDEV=0`，且不再生成 `react-dom-vendor`。

此前的 HMR 问题仍保持已修复状态：开发服务在 HTTPS 公开代理下使用 WSS 和 443 客户端端口；生产构建不再注入 debug collector。此前的趋势库导航修复也保持有效：侧边栏显式执行 `pushState`、更新 active target 并派发 `hashchange`，确保 trends 面板能够打开。

## 安全与数据完整性复核

本轮静态复核未发现新的跨用户读取或未保护 mutation。项目、章节、设定、版本、通知和续写计划均按用户或项目归属过滤；手动生成与定时续写共享持久化 generation lock；输入字段继续执行长度和枚举约束；定时回调验证合法 cron 身份、enabled 状态、计划锁和项目归属，并在成功、跳过及异常路径释放锁。已有 Origin/CSRF、空故事方向、版本回滚和唯一约束测试保持通过。

## 验证结果

`pnpm check` 通过；完整 Vitest 测试为 19 个测试文件、56 个测试通过；`pnpm build` 通过。构建产物检查确认生产 bundle 不含 `jsxDEV`，不含 debug collector，React 与 react-dom 已合并为单一 vendor chunk。

## 残余边界

真实登录态下的 CAPTCHA 交互仍需用户手动完成；Heartbeat 多实例并发和外部服务故障组合仍建议在 staging 做真实压测。公开域名在本轮修复前曾继续提供旧 bundle；保存本轮新检查点并等待部署完成后，必须重新检查正式域名的 index 资源指纹、React 根节点和页面可见内容，不能只依据“部署成功”提示判断发布已生效。
