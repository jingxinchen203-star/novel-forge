# Novel Forge — Release Notes

**版本标识：** `208deff8b37ebb227af8cce344fd19d38a3b81e4`  
**发布日期：** 2026-08-13  
**仓库：** [jingxinchen203-star/novel-forge](https://github.com/jingxinchen203-star/novel-forge)  
**部署域名：** [novelforge-gytesvpi.manus.space](https://novelforge-gytesvpi.manus.space)

## 发布概览

本版本在上一版 Novel Forge 编辑室功能基础上，完成了题材趋势更新链路、AI 润色审校体验、草稿可靠性和 GitHub 自动验证流程的收尾加固。版本重点不是增加自动续写，而是继续坚持**人工触发、作者审核、明确保存边界**的工作方式，使 AI 输出成为可检查的编辑建议，而不是未经确认的正文覆盖。

本次 GitHub 同步包含两个与仓库质量和安全回归直接相关的修复提交：`ee5c366` 修复 pnpm Action 与 `package.json` 中 `packageManager` 的版本冲突；`208deff` 修复 Heartbeat 空用户会话在 CI 环境变量缺失时错误返回内部错误的问题，并确保未认证请求稳定返回 `UNAUTHORIZED`。

## 主要功能

### 题材趋势库运行历史

趋势库现在记录手动刷新和每周自动研究的运行历史，包括触发方式、运行状态、生成条数、任务 UID、开始时间、完成时间和失败原因。独立趋势页面展示最近一次运行结果；当最近一次运行失败时，操作按钮会明确显示为“重试趋势研究”。趋势数据仍然明确标注为公开观察与 AI 研究建议，不被误呈现为实时全量榜单。

本版本应用了趋势刷新历史表迁移，并保持自动趋势快照与用户手动标签之间的边界。自动研究只更新自动快照，不触发小说续写，也不覆盖用户自行维护的趋势标签。

### AI 润色差异筛选

AI 润色结果继续支持原文与结果对比、删除片段玫红标记和新增片段绿色标记。在此基础上，差异区域增加“全部”“仅新增”“仅删除”三个筛选模式，桌面端与移动端底部 AI 抽屉均可使用。润色结果仍然需要作者主动审核和采用，不会自动覆盖正文。

### 服务端草稿备份与恢复

正文编辑器新增“备份到服务器”和“恢复服务端草稿”入口。服务端备份复用项目版本存储结构，但使用独立的草稿备份标签；保存和读取均经过用户、项目、实体三级归属校验，并限制备份内容长度。该能力作为本机自动保存和离线恢复之外的补充，不会替代作者主动保存正文的动作。

### CI 与 Heartbeat 安全回归

GitHub Actions 现在不再同时在 workflow 和 `package.json` 中指定互相冲突的 pnpm 版本，而是使用仓库 `packageManager` 定义。Heartbeat 调用在解析外部服务配置前先检查用户会话，因此即使 CI 没有配置外部 Heartbeat 服务，也会对空会话稳定返回未授权错误，而不会错误地返回内部服务配置错误。

## 验证结果

| 验证项目 | 结果 | 说明 |
|---|---:|---|
| GitHub Actions | 通过 | CI run [31689059536](https://github.com/jingxinchen203-star/novel-forge/actions/runs/31689059536) 对提交 `208deff` 完成并成功 |
| 依赖安装 | 通过 | `pnpm install --frozen-lockfile` |
| TypeScript 类型检查 | 通过 | `pnpm check` |
| Vitest | 通过 | 21 个测试文件、66 个测试通过 |
| 生产构建 | 通过 | `pnpm build` |
| 工作区差异检查 | 通过 | `git diff --check` |
| 移动端页面检查 | 通过 | 已验证趋势独立页面在 390px 视口下无明显横向溢出或遮挡 |

GitHub Actions 的最新成功运行包含以下作业步骤：依赖安装、类型检查、测试和生产构建均为成功状态。此前功能版本的 CI 失败原因已经确认并修复：第一次是 pnpm 版本重复声明，第二次是 Heartbeat 认证测试在 CI 缺少服务配置时未能先执行会话校验。

## 安全与仓库内容审查

本次审查覆盖 Git 跟踪文件名、环境文件、密钥文件、常见云服务凭据格式、私钥头、访问令牌标记、通用敏感变量赋值，以及仓库配置和忽略规则。审查结果如下：

| 检查项 | 结果 | 结论 |
|---|---:|---|
| 已跟踪 `.env`、证书、私钥、凭据文件 | 未发现 | 当前 Git 跟踪清单未发现此类文件 |
| `node_modules`、构建产物、运行日志 | 未发现 | 相关路径已被忽略或未提交 |
| 常见私钥与云服务密钥标记 | 未发现 | 未匹配到扫描模式 |
| `.gitignore` | 已配置 | 已忽略环境文件、依赖目录、构建产物、日志和本地运行文件 |
| GitHub Secret Scanning API | 无法直接读取 | 当前 GitHub token 对该接口返回 403，不能据此声称平台侧“零告警” |
| Dependabot alerts | 未启用 | GitHub 返回“Dependabot alerts are disabled for this repository” |
| Code Scanning alerts | 无法直接读取 | 当前 token 对该接口返回 403 |

需要特别说明，仓库内容扫描没有发现已提交的明显敏感信息，但 GitHub 平台侧的 Secret Scanning 与 Code Scanning 结果由于当前 API 权限无法读取；Dependabot 则明确处于未启用状态。建议仓库所有者在 GitHub Settings → Security 中手动确认 Secret scanning、Push protection、Dependabot alerts 和 Code scanning 的启用状态。

仓库中仍存在少量较大的源文件，例如 `client/src/pages/Home.tsx` 和 `server/routers.ts`，它们属于源码而非运行产物，不构成敏感信息泄露，但后续可按功能拆分以改善维护性。

## 已知限制

真实登录态下的 OAuth、AI 调用、服务器草稿恢复和文件下载流程仍建议由项目所有者在常用浏览器中进行一次人工验收。沙箱环境无法稳定通过上游 CAPTCHA，因此本次验证没有把 CAPTCHA 阻塞误判为项目代码故障。

趋势库的自动研究内容是基于公开观察和模型生成的创作参考，不等同于平台实时榜单、销量数据或官方推荐。服务端草稿目前由作者主动点击备份，尚未配置自动清理策略；如果长期高频备份，后续应增加按项目和时间的保留策略。

## 升级建议

下一阶段可以为服务端草稿增加按项目的定时清理和保留上限，为趋势运行历史增加完整详情页与错误展开信息，并在 GitHub 仓库中启用 Dependabot、Secret scanning、Push protection 和 CodeQL 扫描。完成这些设置后，建议再次运行一次完整 CI 并在常用浏览器中验收登录态编辑流程。

## References

[1]: https://github.com/jingxinchen203-star/novel-forge "Novel Forge GitHub repository"

[2]: https://github.com/jingxinchen203-star/novel-forge/actions/runs/31689059536 "Novel Forge CI run for commit 208deff"

[3]: https://novelforge-gytesvpi.manus.space "Novel Forge deployed application"

[4]: https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning "GitHub Secret Scanning documentation"

[5]: https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts "GitHub Dependabot alerts documentation"

[6]: https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning "GitHub Code Scanning documentation"
