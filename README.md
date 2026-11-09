# dsh-quota-dashboard

DSH 插件：在左侧栏“额度概览”中集中显示多个账号的额度。

- **WorkBuddy**：国内站 / 国际站分别聚合为独立卡片；每个账号对应一条积分条，添加时从所属站点读取并保存昵称，国内版支持手动一键签到
- **DeepSeek**：只显示 DSH 已登录账号自动读取的余额，不提供 API Key 账号添加入口
- **Codex / ChatGPT**：添加本机 Codex 登录时读取并保存实际账号名；显示 5h / week 使用窗口、重置时间与重置卡数量/最近到期时间

## 安装

以本地目录安装：

```bash
dsh plugin install file:/path/to/dsh-quota-dashboard
```

或在 DSH 插件管理中以 `file:` 规格安装该目录，安装后刷新页面，左侧出现“额度概览”。

## 配置

打开“额度概览 → 添加账号”，按来源填写：

| 来源 | 需要的信息 |
| --- | --- |
| WorkBuddy 网页 Cookie | 登录站点（国内 / 国际）、该站额度请求的 `Cookie` 与同一请求的 `User-Agent` |
| DeepSeek DSH 登录账号 | 无需填写，读取本机 DSH 的 DeepSeek 登录 |
| 本机 Codex 登录 | 可选的 `CODEX_HOME` 与 CLI 路径 |

凭据只保存在本机 `$DSH_HOME/plugins/quota-dashboard/accounts.json`，插件接口只返回账号名称与额度，不返回 Cookie、Token 或 Key。账号名仅在添加账号时读取并保存，手动或自动刷新只更新额度。非敏感额度快照保存在同目录的 `usage-cache.json`：进入额度概览时先显示上次快照，同时自动获取一次额度并在返回后刷新界面；页面不轮询，之后只在点击“刷新额度”、添加/移除账号或一键签到后刷新。

## 数据来源

- WorkBuddy：`POST https://www.workbuddy.cn|www.workbuddy.ai/billing/meter/get-user-resource-summary`（未公开接口）
- DeepSeek 登录账号：`GET https://platform.deepseek.com/api/v0/users/get_user_summary`（与 DSH 自身登录方式一致）
- Codex：本地 `codex app-server` 的 `account/rateLimits/read`；CLI 不可用时回退到本机登录资料与未公开的 `chatgpt.com/backend-api/wham/usage`

WorkBuddy 与 ChatGPT 的网页接口都不是公开稳定 API，平台变更或登录失效时卡片会显示错误，不会伪造 0 额度。

## 开发

```bash
node --test test/*.test.js
```

## 许可

MIT
