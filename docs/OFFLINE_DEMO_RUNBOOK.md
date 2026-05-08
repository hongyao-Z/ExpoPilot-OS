# 离线兜底演示

## 目标

展会网络不可用时，仍能在电脑上完成桌面端演示，并让手机在同一局域网内访问 Mobile H5。

## 兜底顺序

| 优先级 | 方案 | 用途 |
|---|---|---|
| 1 | 国内 HTTPS 域名 | 正常扫码演示 |
| 2 | GitHub Pages | 备用公网入口 |
| 3 | 本机 Vite + 投屏 | 网络差时桌面演示 |
| 4 | 本机局域网 IP | 同 Wi-Fi 下手机扫码 |

## 本机桌面演示

```powershell
cd D:\code\expopilot-demo
npm run dev
```

打开：

```text
http://localhost:5173/#/login
```

## 本机局域网扫码

```powershell
cd D:\code\expopilot-demo
npm run dev -- --host 0.0.0.0
```

查看电脑 IP：

```powershell
ipconfig
```

二维码地址示例：

```text
http://192.168.1.20:5173/#/mobile
```

## OpenClaw 一键启动

```powershell
D:\openclaw-explanation-adapter\start-all.bat
```

健康检查：

```powershell
powershell -ExecutionPolicy Bypass -File D:\openclaw-explanation-adapter\healthcheck.ps1
```

如果 OpenClaw 不可用，演示可以继续。说明方式：

> OpenClaw 当前只影响解释文本来源。系统会回退到本地解释模板，不改变异常识别、项目经理确认、任务状态和复盘展示。

## 展会前准备

| 项目 | 要求 |
|---|---|
| 浏览器 | 提前打开登录页、LivePage、Mobile H5、ReplayPage |
| 电源 | 电脑全程接电 |
| 网络 | 优先连接展位稳定 Wi-Fi 或手机热点 |
| 备用二维码 | 准备国内域名、GitHub Pages、局域网 IP 三个版本 |
| 截图 | 准备关键页面截图，防止网络临时不可用 |

