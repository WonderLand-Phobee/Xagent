# OfferToday Daily Jobs — 固定页面，每天更新，一键复制

每天香港时间 10:00 调度采集，目标 12 个仍招聘且英文 JD 的 OfferToday Tech / Design / Creative 职位，生成英文 X 草稿，更新同一个网页。打开网页 → Copy X Post → 自行使用。

**没有登录、审核、CSV、Airtable、Supabase 或自动发布。** 不需要 X Key 或 LLM Key。按当前要求暂不配置提醒；代码保留可选的邮件/Telegram 支持，默认不会发送。

> **接入状态**：GitHub 标准浏览器已经成功读取 www 官网的真实列表、详情链接和搜索框。每日流程现使用普通浏览器页面采集，不要求你提供接口。完整筛选运行的结果以 `data/daily/`、Actions 和网页状态为准；没有合格记录就如实显示缺口。官网条款正文仍未成功加载，不能声称已完成条款审核。

## 零基础上线

按 [中文部署教程](docs/DEPLOYMENT.md) 操作。网页本身可先免费部署到 GitHub Pages；真实来源权限和提醒渠道是独立配置，不要混为部署成功。

## 本地一键看页面

要求 Node.js 22.12+ / 24、Python 3.12。

```bash
npm ci
python -m venv .venv
.venv/bin/pip install -r requirements.txt
npm run dev
```

终端会显示开发访问地址。正式数据读取 `data/`；尚未验证来源时如实展示空表。

单独运行虚构演示：

```bash
npm run demo
```

DEMO 始终有醒目标识，禁用复制及真实职位跳转，输出只在 `public/demo/`，不会混入正式数据。预览仅用于本地验证，不能作为真实职位。

## 每日更新与复制

- 固定网页自动读取当天香港日期快照。无今日数据时显示空表，不拿旧数据冒充。
- 每日目标 12；同日 Job ID 去重；跨日重新验证后可复用，展示上次日期和次数。
- 缺薪资、经验或工作安排显示 `Not specified`；不把 Hybrid 写成 Remote，不猜薪资单位。
- 英文 JD，明确开放证据，官方详情 URL；Expired / Chinese JD / Unverified / Out of scope 单独显示原因。
- 表格展示事实、验证时间/依据、详情链接、英文 X 草稿和 Copy X Post。剪贴板失败有明确提示。
- 支持历史日期、类别和标题/Job ID 搜索。历史数据仅代表当日验证，不可直接复制。
- 无 API 的模板保留必需标签、两条 JD 事实和真实 URL，按 X 权重计数。极端长字段导致草稿不能安全缩到 280 时，**仍保留合格职位**，标记需要手动缩短，绝不因文案长度否定真实职位或编造信息。
- 每次运行保存 JSON 快照和独立审计日志，GitHub 仓库作为持久存储。
- 每天 `02:00 UTC`（10:00 HKT）Actions 自动运行，也可手动运行。生成失败仍更新页面的失败状态，并让工作流报告失败。
- 可选提醒在本次生成/部署结束后发送，包含实际数量、失败状态和固定链接。GitHub 调度及邮件投递可能延迟，**不保证整点 10:00 收到**。

## 执行与测试

```bash
.venv/bin/python -m pipeline.run    # 未授权来源时记录 blocked，退出码 2
.venv/bin/python -m pytest -q
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

云环境若 npm 默认缓存不可写，使用 `npm ci --cache /tmp/offertoday-npm`。已安装 Chromium 时可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`，无需重复下载。

GitHub 每日任务按你对 www 公开页面采集的明确要求启用尝试；设置仓库变量 `OFFERTODAY_SOURCE_APPROVED=false` 可暂停。此开关不是通过验证的标志，每个职位仍需独立确认。开发机本地默认不联网采集；只在正常 TLS/访问条件满足时显式设置 `OFFERTODAY_SOURCE_APPROVED=true`。参见 [来源验证边界](docs/DATA_SOURCE.md) 和 [验收记录](docs/VALIDATION.md)。

## 结构

```text
src/                       React + TypeScript 固定网页
pipeline/                  Python 采集、验证、模板、审计与提醒
.github/workflows/         CI、每日更新、Pages 部署
 data/candidates.json      可选的真实官方详情 URL 种子，每次仍需在线验证
 data/daily/YYYY-MM-DD.json 每日正式快照
 data/jobs.json            推荐历史
 data/audit/YYYY-MM-DD/    逐次运行审计
```

## 成本及运行限制

公开仓库的 Pages/Actions 可优先用免费额度；私有仓库支持和用量以 GitHub 当前套餐为准。无需购买域名。邮件/Telegram 配额以供应商政策为准。GitHub 可能暂停长期不活跃公开仓库的定时任务；订阅运行失败通知并定期检查。

网页和数据均公开，不保存密码、Token 或个人隐私。提醒凭据只存 GitHub Secrets，绝不进入前端或日志。GitHub 推送需要仓库和 workflow 写入权限；部署设置不由本地构建自动开启。

固定页面上线、真实来源验收、定时任务执行和提醒送达分别验证；任一项未通过，都不能声称整个服务已投入每日使用。

### 使用自己的 OfferToday 账号（Windows）

如需读取登录后可见的完整 JD 和薪资，请按 [Windows 登录教程](docs/WINDOWS_LOGIN.md) 操作。双击 `LOGIN-WINDOWS.cmd` 后亲自登录，将本地导出的登录状态存为 GitHub Actions Secret `OFFERTODAY_STORAGE_STATE`。此功能可选；未配置时继续使用公开页面。凭证不会写入公开页面、代码或抓取附件。登录能否在 GitHub 上继续使用，需要首次实际运行验证。
