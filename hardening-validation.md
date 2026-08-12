# Novel Forge 加固验证记录

本轮加固完成了同源 `auth.logout` 的跨源拒绝回归测试，以及 `generation_usage` 持久化配额路径的契约测试。配额测试覆盖 upsert 后原子更新、`windowCount`/`windowStartedAt` 的 SQL 更新表达式、`activeUntil` 锁时间写入、affectedRows 为零时拒绝，以及锁释放更新调用。

截至本记录，`pnpm check` 通过，`pnpm test` 通过：6 个测试文件、13 个测试用例。迁移 `0007_mean_meteorite.sql` 已审查并应用，创建 `generation_usage` 表及 `(userId, projectId)` 唯一约束。

本轮没有发布或部署 staging，因此没有执行真实多请求、多实例的端到端压测。生产部署后应使用两个并发请求验证同一用户/项目只有一个请求获得 `activeUntil` 锁，并在窗口达到 3 次后验证后续生成被拒绝；该项不应被本地 mock 契约测试替代。
