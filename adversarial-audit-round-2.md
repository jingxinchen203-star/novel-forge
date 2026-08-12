# Novel Forge 第二轮对抗性审查报告

## 审查结论

本轮审查针对上一轮加固后的 `3fd87a7a` 工作树进行，未修改业务代码。类型检查、生产构建和现有测试均通过：6 个测试文件、13 个测试用例通过。上一轮的项目归属、章节唯一号、定时任务基本抢锁、输入长度、`auth.logout` 同源防护和 `generation_usage` 持久化路径均有实现证据；但仍存在若干可被恶意用户利用或在异常条件下放大的风险。

当前最需要优先处理的是 **Heartbeat owner fallback、admin mutation 缺少 Origin 防护、定时续写与手动生成没有共享锁、未验证项目即创建 generation_usage 行、以及计划/文档缺少数据库唯一约束**。这些问题不会被现有 13 个单元/契约测试覆盖。

## 风险分级

| 编号 | 严重性 | 风险 | 证据位置 | 影响 |
|---|---|---|---|---|
| R2-01 | 高 | Heartbeat 在缺少 session token 时回退到项目 owner 身份 | `server/_core/heartbeat.ts:75-79`；`server/routers.ts:178-195` | 使用 Authorization Bearer 登录但没有 session cookie 的用户，可能让计划创建、暂停或删除以 owner 身份执行；若 owner 权限范围高于当前用户，会形成权限边界漂移 |
| R2-02 | 中高 | adminProcedure 没有 Origin/CSRF 校验 | `server/_core/trpc.ts:43-58`；`server/_core/systemRouter.ts:16-28` | `system.notifyOwner` 是实际存在的 admin mutation；管理员登录状态下可被跨站诱导发送通知，且未来新增 admin mutation 会继承此缺口 |
| R2-03 | 中高 | 定时续写锁与手动生成锁不共享 | `server/scheduled.ts:29-31`；`server/routers.ts:142-157` | 定时回调和手动正文生成可同时针对同一项目/下一章调用模型；数据库唯一约束只能在写入阶段兜底，浪费模型额度并可能写入失败状态 |
| R2-04 | 中 | 生成配额在验证项目归属前创建 | `server/routers.ts:142-145,149-153`；`server/_core/security.ts:31-49` | 可提交大量不存在或不属于自己的 projectId，制造 generation_usage 残留行；在高频调用下造成数据库垃圾和配额表膨胀 |
| R2-05 | 中 | Heartbeat 上游错误和定时错误细节仍可透过计划接口暴露 | `server/_core/heartbeat.ts:89-97,102-118`；`server/scheduled.ts:58-62` | 上游响应、网络异常或模型错误可能进入 TRPCError message 或 `writing_schedules.lastError`；`schedules.list` 会返回 `lastError`，可能泄露内部服务信息 |
| R2-06 | 中 | project_docs 缺少 `(userId, projectId)` 唯一约束 | `drizzle/schema.ts:38-48`；`server/routers.ts:135-140` | 并发首次保存可创建重复策划文档；读取只取一条，导致用户看到的内容与实际保存内容不一致，版本/回滚也可能针对隐藏的旧文档 |
| R2-07 | 中 | writing_schedules 缺少项目级唯一约束与创建频率限制 | `drizzle/schema.ts:74-86`；`server/routers.ts:177-181` | 同一项目可创建大量 cron；每个 cron 都可能触发模型调用，造成重复任务、资源消耗和通知噪音 |
| R2-08 | 中 | Heartbeat 远程任务与本地数据库操作不是同一事务 | `server/routers.ts:100-114,177-181,183-197` | 创建后数据库写入失败会留下孤儿 cron；删除/暂停时远程操作成功而本地写入失败会造成状态漂移，需要人工修复 |
| R2-09 | 低中 | `hasTrustedMutationOrigin` 只要看到任意 `Bearer ` 前缀就跳过 Origin 校验 | `server/_core/security.ts:18-29` | Origin 检查被错误地当成 Bearer 存在性检查；真实 token 验证在其他层完成，当前实现容易被错误配置的 CORS、代理或未来 public mutation 复用放大 |
| R2-10 | 低中 | schema 没有外键和级联约束，依赖应用层清理 | `drizzle/schema.ts` 全文件 | 直接数据库写入、部分失败或未来新增删除路径可能留下孤儿 chapters、versions、notifications、schedules 和 generation_usage |

## 已闭合项目

上一轮修复中，章节查询和版本查询已加入 user/project/entity 组合过滤；项目删除已清理主要子表和 generation_usage；章节 `(projectId, chapterNumber)` 唯一约束已应用；计划回调已检查 enabled 并采用 `lockAt` 抢锁；生成接口已加入字段长度限制、AI 输出空值校验和数据库配额 reservation；`auth.logout` 已切换到 `securePublicMutation`，并有跨源拒绝测试；`generation_usage` 已有 0007 迁移和 reservation/释放契约测试。

## 建议修复顺序

第一优先级是取消 Heartbeat 的 owner fallback：没有合法用户 session 时直接拒绝需要用户身份的计划操作；同时让 adminProcedure 复用统一 Origin middleware。第二优先级是让定时生成与手动生成共享数据库 reservation/lock，并在 `requireProject` 成功后才创建 generation_usage 行。第三优先级是为 project_docs 和 writing_schedules 增加唯一约束、创建幂等键或项目级数量上限，并将 Heartbeat 错误统一映射为固定错误码。最后，应在 staging 执行真实的双请求和多实例并发压测；本轮未发布 staging，因此该项仍未被真实验证。

## 复现/验证边界

本轮执行了静态模式扫描、核心代码复核、`pnpm check`、`pnpm test` 和 `pnpm build`。未执行跨实例 staging 压测、真实 Heartbeat 远程故障注入、真实数据库并发写入和登录态浏览器操作；这些边界不应被现有契约测试替代。
