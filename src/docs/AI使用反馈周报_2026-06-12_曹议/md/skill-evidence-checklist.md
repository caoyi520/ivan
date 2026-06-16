# 可点击证据包检查清单

## 必须包含

- `index.html`：可点击首页。
- `md/`：周报正文和关键 Markdown 原文。
- `pages/`：Markdown 渲染后的 HTML 页面。
- `screenshots/`：原型验收截图。
- `prototypes/`：可点击交互原型 HTML、JS 和运行依赖。
- `AGENTS.md`：项目工作流证据。
- `rules/design-guide.md` 和 `rules/development-guide.md`：设计与开发规范证据。

## 原型 HTML 检查

- HTML 文件存在。
- 对应 JS 文件存在。
- 公共 bootstrap / assets 文件存在。
- 打开后页面不是空白。
- 至少能完成一个关键交互，例如登录、打开抽屉、切换筛选或选择卡片。

## 链接检查

对 `index.html` 中所有本地链接做存在性检查。

检查逻辑：

- 解析所有 `<a href>`。
- 忽略 `http://`、`https://` 和 `#`。
- 对 URL 解码后检查文件是否存在。
- 如有缺失，先修链接再打包。

## 周报内容检查

- 是否回应上周评分反馈。
- 是否写了自动化任务。
- 是否写了 Obsidian 应用。
- 是否列出可点击交互 HTML。
- 是否有截图证据。
- 是否有前后对比。
- 是否沉淀可复用 Skill / Prompt / 工作流。

## 打包检查

- zip 解压后不依赖原项目绝对路径。
- 首页能打开。
- 图片能显示。
- Markdown 能打开。
- 原型 HTML 能打开。

