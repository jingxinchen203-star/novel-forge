# 侧边栏导航修复验证记录

本次修复前，五个菜单项全部使用 `/`，点击处理只执行 `window.scrollTo`，因此不会切换内容。现在每个菜单项拥有独立的 `target`：`overview`、`workspace`、`trends`、`versions` 和 `schedule`。侧边栏派发 `novel-forge:navigate` 事件并同步 active 状态；项目总览与创作工作台分别定位到 `novel-forge-overview` 和 `novel-forge-workspace` 锚点，后三项切换到工作台对应的受控 Tabs。

代码验证已完成：`pnpm check` 通过，Vitest 9 个测试文件、21 个测试通过，`pnpm build` 通过。预览页面已重新渲染，侧边栏视觉布局正常。

真实浏览器的登录态点击验证仍受此前 CAPTCHA 阻塞；未登录页面不会渲染侧边栏。用户登录后应依次点击五项，确认高亮分别切换，并观察：项目总览回到顶部概览、创作工作台定位到项目工作区、题材趋势库切换“趋势参考”、版本档案切换“版本档案”、续写计划切换“续写计划”。
