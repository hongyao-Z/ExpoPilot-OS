# 国内部署准备

## 目标

把 ExpoPilot OS 部署到国内可访问的 HTTPS 域名，供展会现场电脑和手机扫码使用。

推荐目标域名：

```text
https://expopilot.cn/
https://expopilot.cn/#/mobile
```

## 推荐方案

| 方案 | 适合程度 | 说明 |
|---|---|---|
| 腾讯云 EdgeOne Pages / 静态站点托管 | 推荐 | 静态前端部署简单，HTTPS 配置少 |
| 腾讯云轻量服务器 + Nginx | 可选 | 可控性高，但需要维护服务器 |
| GitHub Pages + 自定义域名 | 不推荐作为主链路 | 国内访问不稳定 |

## 部署包生成

在项目根目录执行：

```powershell
npm run release:demo
```

脚本会执行：

```text
npm run build
node scripts/prepare-demo-release.mjs
```

生成内容：

```text
dist/
  index.html
  assets/
  DEPLOYMENT_NOTES.md
  DEMO_LINKS.json
  nginx.expopilot.conf
  qr-targets.txt

output/release/
  expopilot-os-static-YYYYMMDD-HHMMSS.zip
```

上传国内平台时，上传 `dist` 目录内容或上传 `output/release` 里的 zip。

## HTTPS 与域名

域名购买完成后，不要购买付费 SSL。优先使用部署平台自动签发的免费 HTTPS 证书。

DNS 解析通常只需要二选一：

| 记录类型 | 用途 |
|---|---|
| `CNAME` | 指向部署平台给出的域名 |
| `A` | 指向云服务器公网 IP |

## SPA 路由要求

本项目使用 Hash 路由：

```text
/#/login
/#/mobile
/#/project/project-spring-2026/live
/#/project/project-spring-2026/replay
```

Hash 路由对静态部署友好，一般不需要额外 rewrite。Nginx 兜底配置仍建议保留：

```nginx
try_files $uri $uri/ /index.html;
```

## 验收地址

部署完成后逐个打开：

| 页面 | 地址 |
|---|---|
| 登录页 | `https://expopilot.cn/#/login` |
| LivePage | `https://expopilot.cn/#/project/project-spring-2026/live` |
| Mobile H5 | `https://expopilot.cn/#/mobile` |
| ReplayPage | `https://expopilot.cn/#/project/project-spring-2026/replay` |

## 不要做

| 项目 | 原因 |
|---|---|
| 购买付费 SSL | 演示站点用免费 HTTPS 足够 |
| 绑定真实业务账号 | 当前是 demo |
| 接真实摄像头公网推流 | 增加不稳定因素 |
| 把 OpenClaw 变成执行器 | 破坏当前安全边界 |

