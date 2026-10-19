# 固定页面上线教程（无需编程）

最终使用方式：每天收到提醒 → 打开同一个网址 → 点 Copy X Post。没有 CSV、登录审核或自动发布。

## 1. 把项目放进 GitHub

打开 <https://github.com/WonderLand-Phobee/Xagent>，应看到 `src`、`pipeline`、`.github`、`package.json` 等文件。

若助手无法推送，先在 Codex 的 GitHub 连接设置中授权 **Xagent 的仓库写入及工作流文件写入权限**，回来告诉助手继续。不要在聊天里发 Token。

也可把源码 ZIP 解压后用 GitHub Desktop 上传：File → Clone repository → 选择 Xagent → 复制项目文件到目录 → Commit to main → Push origin。不要上传 `.env`、`node_modules`、`.venv`。必须包含隐藏目录 `.github/workflows`。

## 2. 开启固定网页

1. GitHub 仓库 → **Settings → Pages**。
2. **Build and deployment → Source** 选 **GitHub Actions**。
3. 仓库 → **Actions → Deploy dashboard → Run workflow → main → Run workflow**。
4. 等待绿色勾号，打开该次部署显示的网页链接，收藏它。以后都打开这一个地址。

默认地址格式可能是 `https://wonderland-phobee.github.io/Xagent/`。**只有实际部署成功后这个地址才可用，不是已经上线的证明。** 私有仓库如套餐不支持 Pages，可用 Cloudflare Pages：构建 `npm run build`、输出 `dist`、变量 `BASE_PATH=/`。

首次看到 blocked 和空表，表示尚未获得可信职位来源，不会展示假岗位。

## 3. 每日从 www 官网公开页面更新

不需要你提供 API、X Key、模型 Key 或数据库。爬虫用正常浏览器打开 `www.offertoday.com` 的公开职位页，使用搜索框，读取该页面自己加载的职位信息。

GitHub 标准浏览器已成功读到真实列表和详情链接。每日工作流会自动尝试；你可在 **Actions → Daily verified edition → Run workflow** 手动重跑。需要暂停时，在仓库 **Settings → Secrets and variables → Actions → Variables** 新建 `OFFERTODAY_SOURCE_APPROVED=false`。

每条职位独立检查公开招聘状态、英文原始 JD、稳定 ID 和真实详情链接；未知、过期、中文/混合 JD 都排除。当天没有可靠结果就显示缺口，不用演示数据补足。

官网公布的 robots 已检查并由代码每次重新读取。官网条款链接的正文目前未成功加载，仍需继续核实；出现访问禁止或挑战时会停止，不绕过验证码、登录或证书错误。详细证据与限制见 DATA_SOURCE.md。

## 4. 可选提醒（你目前选择暂不配置，可跳过）

提醒在本次更新/部署完成后发送，带固定网址和实际运行状态。GitHub cron 可能延迟，因此免费方案不能保证 10:00 整点送达；不是聊天后台任务。未配置时不会发送。

仅在以后决定启用提醒时，先在 GitHub **Actions Variables** 设置 `ENABLE_REMINDERS=true`，并新增 `DASHBOARD_URL`，值填步骤 2 实际部署成功的网址。以下任一方案只需设置一次。

### 邮件（Resend）

1. 到 <https://resend.com> 创建账号，在自己的账号中创建发送邮件的 API Key。
2. 在 GitHub **Actions Variables** 新增 `REMINDER_CHANNEL=email`。
3. 在同页面的 **Secrets → New repository secret** 新增：
   - `RESEND_API_KEY`：Resend 的 Key。
   - `REMINDER_TO`：接收提醒的邮箱。
4. 测试发件人默认 `onboarding@resend.dev`，只能向 Resend 账号拥有者邮箱发送（以供应商当前政策为准）。若要发给其他地址，需验证自己的域名，并在 **Variables** 设置 `REMINDER_FROM` 为该域名的允许发件地址。
5. 手动运行一次 **Daily verified edition**，查看 remind 步骤和收件箱/垃圾邮件箱。供应商接受发送不等于已经送达。

不要把 Key 发到聊天或放入 `VITE_*` 变量。项目不需要 LLM 或 X API Key。

### Telegram

1. 在 Telegram 官方 **@BotFather** 创建自己的机器人，获得 Token；自己向机器人发送 `/start`。
2. 用 Telegram 官方方式取得你和机器人的聊天 ID。不要把 Token 粘贴到陌生网站；不确定时请让助手指导安全查询。
3. GitHub **Variables** 设置 `REMINDER_CHANNEL=telegram`。
4. GitHub **Secrets** 设置 `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_CHAT_ID`。
5. 手动运行 **Daily verified edition** 验证收到消息。

机器人 Token 和聊天 ID 只存 GitHub Secrets。代码不会记录含 Token 的请求 URL。

## 5. 日常使用

打开收藏的网址，确认日期、状态、数量及验证时间 → Open job 可核对详情 → Copy X Post 复制英文草稿。你自行决定如何使用，系统不发布。

如果网站显示 blocked、Unverified 或没有当天结果，不要把旧职位当成新结果。提醒也会说明采集/部署失败，不会虚报“12 条已更新”。

## 常见问题

| 问题 | 操作 |
| --- | --- |
| 官网 403 / Unverified | 检查访问许可、网络和实际结构，不能关闭验证凑数 |
| Source approval required | 本地默认关闭；GitHub 变量设为 false 也会暂停，先确认你的暂停设置 |
| Pages 部署失败 | Settings → Pages → Source 选择 GitHub Actions |
| Actions git push 失败 | Settings → Actions → General 允许读写仓库；检查分支保护 |
| 页面没有更新 | 查看 Daily workflow，手动重跑；长期不活跃时恢复定时任务 |
| 提醒没有收到 | 检查 channel、固定 URL、Secrets、供应商权限/收件箱和 remind 日志 |
| Copy failed | 浏览器需 HTTPS 和剪贴板权限；也可手动选中文案复制 |

保留 GitHub Actions 失败通知，并定期检查免费配额。无需 Supabase、Airtable、数据库、X 账号授权或付费域名。
