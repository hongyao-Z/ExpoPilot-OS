# 海报二维码方案

## 正式二维码

域名购买并部署完成后，海报主二维码使用：

```text
https://expopilot.cn/#/mobile
```

用途：

| 二维码 | 指向 | 用途 |
|---|---|---|
| 主二维码 | `https://expopilot.cn/#/mobile` | 现场观众扫码体验工作人员任务端 |
| 备用二维码 | GitHub Pages `/mobile` | 国内域名异常时备用 |
| 桌面入口二维码 | `https://expopilot.cn/#/login` | 评委或老师查看桌面端 |

## 海报文字

主标题：

```text
扫码体验场脉任务端
```

副标题：

```text
会展现场异常处置与责任记录系统
```

二维码旁说明：

```text
进入工作人员任务端，查看入口 A 人流拥堵任务的接收、到场、处理和反馈流程。
```

## 生成规则

| 项目 | 建议 |
|---|---|
| 二维码尺寸 | 海报上不小于 35mm x 35mm |
| 容错级别 | M 或 Q |
| 颜色 | 黑码白底，周围可加橙色说明，不建议反色二维码 |
| 留白 | 保留二维码四周白边 |
| URL | 使用 HTTPS 正式域名，不使用 localhost |

## 版本参数

如果担心手机缓存旧版本，可以在二维码 URL 后加入版本参数：

```text
https://expopilot.cn/#/mobile?v=demo-202605
```

## 现场备用

展会现场准备三张二维码：

| 名称 | 示例 |
|---|---|
| 正式域名 | `https://expopilot.cn/#/mobile` |
| GitHub Pages | `https://hongyao-z.github.io/ExpoPilot-OS/#/mobile` |
| 局域网 | `http://<电脑IP>:5173/#/mobile` |

