# Windows：连接你的 OfferToday 登录账号

固定页面：https://wonderland-phobee.github.io/Xagent/

你只需在自己电脑上登录。密码、短信验证码和登录文件不要发给聊天助手。第一次连接需要下面几步；之后每日由 GitHub Actions 自动运行，你的电脑可以关机。

## 1. 安装 Node.js

打开 https://nodejs.org/ ，下载安装 **Node.js 24 LTS（Windows Installer / .msi）**，安装时保持默认选项。已经安装兼容版本可跳过。

## 2. 下载项目

打开 https://github.com/WonderLand-Phobee/Xagent ，点击绿色 **Code → Download ZIP**。下载后右键 ZIP，选择 **全部解压缩**。不要在压缩包里面直接运行。

## 3. 在电脑上登录

打开解压后的 `Xagent-main` 文件夹，双击 **LOGIN-WINDOWS.cmd**（系统隐藏扩展名时显示 LOGIN-WINDOWS）。首次需要联网安装依赖和浏览器，可能需要几分钟。

浏览器弹出后，亲自在 OfferToday 登录，完成短信或其他验证。打开一个职位，确认可以看到完整 JD 和薪资。保持浏览器打开，回到黑色命令窗口，按 **Enter** 保存。工具不会自动申请、发送消息或发布到 X。

如果 Windows 阻止运行，请先查看脚本内容、确认下载自上述自己的仓库；无需关闭系统安全保护。报错可以提供不含个人信息的错误文字，切勿提供登录文件内容。

## 4. 把登录状态存到 GitHub Secret

1. 在文件资源管理器中打开项目里的 **.private** 文件夹。
2. 右键 `offertoday-login.json`，选择 **打开方式 → 记事本**。按 **Ctrl+A、Ctrl+C** 复制全部内容。不要截图、上传或发到聊天里。
3. 打开 https://github.com/WonderLand-Phobee/Xagent/settings/secrets/actions 。如需登录 GitHub，请使用拥有此仓库管理权限的账号。
4. 点击 **New repository secret**。
5. **Name** 填写 `OFFERTODAY_STORAGE_STATE`。
6. **Secret** 粘贴刚才的全部文件内容，点击 **Add secret**。不要填在 Variables 中。
7. 关闭记事本，删除本地 `.private/offertoday-login.json` 并清空回收站。剪贴板改为复制一段普通文字；如果启用了剪贴板历史/同步，也删除对应历史。

这个文件相当于登录钥匙。GitHub Secrets 在保存后不会显示原值，但有权限修改工作流的人可能读取它。建议使用不含简历、私人消息等资料的专用账号。仓库只公开职位信息和生成的文案；登录凭证不进入代码、网页或 Actions 附件。

## 5. 运行一次

打开 https://github.com/WonderLand-Phobee/Xagent/actions/workflows/daily.yml ，点击 **Run workflow → Run workflow**，使用 main 分支。等这一轮结束后打开固定页面，检查更新时间、实际职位数量和薪资。

之后每天香港时间 **10:00** 由 GitHub Actions 触发，平台可能延迟。只展示通过英文、仍在招聘、薪资一致性等检查的职位；12 条是目标，不能保证网站每天都有足够合格职位。不自动发 X，当前也不发送提醒。

## 登录过期或无法读取时

如果提示需要登录，重复第 3 步，再在 Secrets 中编辑 `OFFERTODAY_STORAGE_STATE`，替换为新文件内容，并手动运行一次。删除该 Secret 可恢复仅使用公开网页。

登录状态可能受网站的设备、IP 或有效期限制。**本地成功导出不代表 GitHub 上一定可用**；必须以首次登录抓取结果为准。如果网站要求再次验证，程序不会绕过验证，也不会读取仍被遮挡的内容。未填写、存在矛盾或无法验证的薪资不会编造。

需要撤销授权时，删除 Secret，并在 OfferToday 退出相关设备或撤销会话（如网站支持）。只删除 Secret 不会在网站端注销原有会话。
