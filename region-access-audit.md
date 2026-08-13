# 地区可用性审查记录

检查时间：2026-08-13。

正式域名 `https://novelforge-gytesvpi.manus.space/` 在沙箱浏览器中可以正常返回页面标题和匿名登录入口，页面内容为“Novel Forge / Private Studio”“登录后管理项目设定、章节生成和版本档案”“进入编辑室”。页面未出现国家、地区、IP 或“该地区不可用”提示。

源码搜索未发现 country、region、geo、geoblock、地区白名单或国家判断逻辑。`server/_core/cookies.ts` 中的 IP 相关内容只是 Cookie 安全属性的 IPv4/IPv6 检查，不是地区限制。

结论：当前项目代码没有主动限制国家或地区。朋友看到“该地区不可用”更可能来自 Manus 托管/CDN/认证上游、当地网络线路或浏览器/运营商策略，不能通过项目源码直接解除。
