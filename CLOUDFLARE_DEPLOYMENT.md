# Cloudflare 部署说明

## 适配结论

本仓库现在提供 **Cloudflare Pages 前端部署路径**。`pnpm build:pages` 只构建 Vite 静态前端，产物目录为 `dist/public`；`wrangler.toml` 已声明相同的 Pages 输出目录，适合在 Cloudflare Pages 中导入 GitHub 仓库，或通过 Wrangler 直接上传。

需要特别区分：Novel Forge 不是纯静态网站。项目的 Express、tRPC、Manus OAuth、MySQL/Drizzle、Heartbeat、AI 生成和服务端草稿清理仍属于后端能力，不能仅靠 Pages 静态文件自动迁移。若前端部署到 Cloudflare Pages，必须让 `/api/*` 继续指向一个可访问的后端服务，并将前端的 API 地址配置为该后端地址；否则页面可以打开，但登录、项目管理和 AI 功能不会工作。完整后端迁移到 Cloudflare Workers 需要另行改造 Express、OAuth、数据库驱动和 Manus 专用 SDK，本次没有擅自进行不可逆迁移。

## Cloudflare Pages 配置

在 Cloudflare Dashboard 的 **Workers & Pages** 中创建或选择 Pages 项目，并从 GitHub 导入本仓库。推荐配置如下：

| 配置项                 | 值                 |
| ---------------------- | ------------------ |
| Framework preset       | Vite 或 None       |
| Build command          | `pnpm build:pages` |
| Build output directory | `dist/public`      |
| Node.js version        | `22`               |
| Root directory         | `/`                |

|

Cloudflare 官方 Vite 指南使用构建命令和静态输出目录部署 Vite 前端；本仓库的 `build:pages` 与 `wrangler.toml` 已将目录明确为 `dist/public`。[1]

如果使用 GitHub Actions，先在仓库中配置以下值：

| GitHub 配置                                 | 用途                                        |
| ------------------------------------------- | ------------------------------------------- |
| Actions Secret `CLOUDFLARE_API_TOKEN`       | 具有 Cloudflare Pages Edit 权限的 API Token |
| Actions Secret `CLOUDFLARE_ACCOUNT_ID`      | Cloudflare 账户 ID                          |
| Actions Variable `CLOUDFLARE_PAGES_PROJECT` | Pages 项目名称，例如 `novel-forge-cxf` |
| Actions Variable `VITE_API_BASE_URL`（可选） | 后端地址；当前 workflow 已直接使用 `https://novelforge-gytesvpi.manus.space` |

配置后，在 GitHub Actions 中手动运行 **Cloudflare Pages** workflow。该 workflow 默认只允许手动触发，避免在尚未配置 Cloudflare 凭据时让主分支 CI 失败。Cloudflare 官方持续集成指南同样要求使用 `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN` 和 Wrangler Pages 部署命令。[2]

## 自定义域名

如果你申请的是完整域名，例如 `example.com`，需要先把该域名作为 Cloudflare Zone，并按 Cloudflare 指引修改 Nameserver；随后在 Pages 项目的 **Custom domains** 中添加域名。如果你使用的是子域名，例如 `novel.example.com`，通常使用 CNAME 指向 `<pages-project>.pages.dev`，但仍必须先在 Pages 项目内完成 **Set up a domain**，不能只手动添加 DNS 记录，否则可能出现 522。[3]

本次已确认 Pages 地址为 `https://novel-forge-cxf.pages.dev/`，并已在应用默认配置中加入该地址作为 OAuth 回跳和 CORS/Origin 白名单。现有后端地址为 `https://novelforge-gytesvpi.manus.space`；如果 Pages Actions 没有额外变量，前端也会自动使用这个后端地址。域名已经由 Cloudflare Pages 管理时，不需要再通过 Manus 申请域名；若以后绑定自己的顶级域名，只需在 Cloudflare Pages 的 Custom domains 中完成绑定，并同步更新 OAuth/CORS 白名单。

## 后端与 API 注意事项

Cloudflare Pages 解决的是前端静态资源托管，不会自动托管本仓库的 Express 服务。若前端域名与后端域名不同，需要确认后端允许该 Cloudflare 域名的 `Origin`，并正确配置 OAuth 回调地址、Cookie 的 `Secure`/`SameSite` 策略和 API 基地址。若希望把后端也迁移到 Cloudflare，需要采用 Workers + Workers Assets，并重写现有 Express 入口和后端适配层；Cloudflare 的 React + Vite Workers 指南明确将 Worker 作为后端 API 入口，并通过 `assets.not_found_handling = "single-page-application"` 配置 SPA 回退。[4]

## References

[1]: https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/ "Cloudflare Pages: Vite"
[2]: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/ "Cloudflare Pages: Direct Upload with continuous integration"
[3]: https://developers.cloudflare.com/pages/configuration/custom-domains/ "Cloudflare Pages: Custom domains"
[4]: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/ "Cloudflare Workers: React + Vite"
