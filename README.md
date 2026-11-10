# LabMeeting 网页演示稿

可直接复制的论文组会演示稿。采用纯 HTML / CSS / JavaScript；没有 npm、构建步骤、CDN、在线字体或第三方运行依赖。浏览器打开演示稿本身不需要联网，页脚的论文与代码链接需要联网。中文字体随文件夹附带，无需在系统安装。

浏览器阅读说明请打开 [README.html](README.html)，也可以从首页点击“使用说明与服务器启动方法”。该页面已将 Markdown 排版为网页，直接双击或通过服务器访问都可以。

## 方法一：复制后直接打开（不需要服务器）

将整个 `LabMeeting` 文件夹复制到本地，使用 Chrome、Edge、Firefox 或 Safari 打开：

```text
LabMeeting/2026_11_10_Video_Numerical_Continuation/index.html
```

也可以双击 `LabMeeting/index.html`，从首页选择论文分享或中期报告。所有样式和脚本都通过相对路径加载，适用于 `file://`，不需要安装任何库。

请复制整个 `LabMeeting`，不要只复制日期文件夹，因为各次报告共用 `shared/` 内的主题和翻页脚本。

## 方法二：在当前服务器上启动

使用已有 Python 3 标准库，不用安装软件，也不用进入容器。在服务器终端运行：

```bash
cd /home/sirui/workspace/LabMeeting
python3 serve.py --bind 0.0.0.0 --port 8000
```

保持这个终端运行。在服务器本机浏览器访问：

```text
http://localhost:8000/
```

使用说明地址为 `http://localhost:8000/README.html`。这个服务也会将 `README.md` 自动渲染为网页，并给文本响应指定 UTF-8，避免中文乱码。原始 Markdown 可通过 `README.md?raw=1` 查看。

如果已经启动了旧的 `python3 -m http.server`，可以直接访问 `README.html` 阅读排版好的说明；要让 `README.md` 地址也自动渲染，请先在旧服务终端按 `Ctrl+C`，再运行上面的新命令。

直接访问这次演示稿：

```text
http://localhost:8000/2026_11_10_Video_Numerical_Continuation/
```

如果浏览器在自己的电脑上，且可以直连服务器，将 `localhost` 换成服务器的 IP 或主机名：

```text
http://服务器IP:8000/2026_11_10_Video_Numerical_Continuation/
```

如不便直连，可在本地电脑另开一个终端建立 SSH 转发（将 `服务器地址` 换成实际地址）：

```bash
ssh -N -L 8000:127.0.0.1:8000 sirui@服务器地址
```

然后用本地浏览器打开前面的 `http://localhost:8000/…` 地址。如果只使用 SSH 转发，服务器启动命令中的 `--bind 0.0.0.0` 也可以改为 `--bind 127.0.0.1`。

**关闭网页服务：在运行 `serve.py` 的终端按 `Ctrl+C`。** SSH 转发也用 `Ctrl+C` 结束。若端口 8000 已被其他程序占用，改用 8001，并同步替换访问地址和转发命令中的端口。

此项目没有设置后台服务或自启动；检查结束后不保留监听端口。

## 中期报告

2026.10.24 的项目报告已整合为 `2026_10_24_Reference_Driven_Shader_and_Control_Maps/`，主题为“参考图驱动的 Shader 与控制贴图生成”，共 22 页。首页标注为“中期报告”。[打开中期报告](2026_10_24_Reference_Driven_Shader_and_Control_Maps/index.html) · [报告说明](2026_10_24_Reference_Driven_Shader_and_Control_Maps/README.html)。

统一的 `serve.py` 同时保留中期报告第 20 页的评估转发功能，连接服务器本机 `127.0.0.1:7870`。评估应用需自行保持运行，无需额外启动 12024 报告服务或再增加报告端口转发；本次整合没有启动或重启评估应用。若统一服务在本次更新之前已启动，需要先按 `Ctrl+C`，重新运行启动命令，加载新加入的评估转发代码。

## 演示操作

| 操作         | 按键或入口                 |
| ---------- | --------------------- |
| 返回网站首页 | 点击顶部“返回目录”；全屏讲解时隐藏 |
| 上一页 / 下一页  | `←` / `→`，或底部箭头       |
| 下一页        | `Space` / `Page Down` |
| 上一页        | `Page Up`             |
| 第一页 / 最后一页 | `Home` / `End`        |
| 全屏展示       | `F` 或右上角全屏按钮          |
| 退出全屏       | `Esc`；全屏受限时也可再次按 `F`  |
| 跳转页面       | 点击底部进度短线，或 `M` 打开章节目录              |
| 手机翻页       | 左右滑动                  |
| 查看帮助       | `?` 或右上角问号            |
| 查看第二页的概念对比 | 点击“直接优化 / 视频引导” |
| 放大论文原图 | 点击实验图或“查看原图”；滚轮缩放、拖动查看 |
| 打印为 PDF    | 浏览器打印，选择横向、无边距、显示背景图形 |

在地址末尾添加 `#slide-2` 可直接打开第二页。演示画布为 1600 × 900（16:9），随窗口等比例缩放。正式展示建议使用横屏。

本次论文分享为 16 页、约 15 分钟，附有 [逐页讲稿与备查资料](2026_11_10_Video_Numerical_Continuation/讲稿.html)。House、Dragon 视频可按需展开，关闭或翻页会暂停。

## 文件组织与复用

```text
LabMeeting/
├── README.md
├── README.html                         # 可离线阅读的排版说明页
├── index.html                           # 演示稿目录入口
├── serve.py                             # 标准库服务器 / 生成说明页
├── shared/
│   ├── presentation.css                 # 公共配色、字号、布局、打印样式
│   ├── presentation.js                  # 公共翻页、全屏、缩放、触屏操作
│   ├── markdown_page.py                 # 说明文档的 Markdown 排版
│   ├── evaluation_proxy.py              # 中期报告的评估网页转发
│   ├── documentation.css               # 说明页样式
│   └── fonts/                          # 本地中文字体及 OFL 许可证
├── 2026_10_24_Reference_Driven_Shader_and_Control_Maps/
│   ├── index.html                       # 中期报告，22 页
│   ├── README.html                      # 中期报告使用说明
│   ├── 讲稿.md                          # 原有讲稿
│   └── assets/                          # 原有图片、视频与字体
└── 2026_11_10_Video_Numerical_Continuation/
    ├── index.html                       # 这篇论文的 16 页报告与 SVG 图示
    ├── deck.css                         # 这篇论文特有的排版
    ├── deck.js                          # 本篇概念对比与调度演示
    └── assets/                          # 论文原图、作者视频与来源
```

以后沿用 `YYYY_MM_DD_英文主题` 命名日期文件夹。复制本次日期文件夹作为起点，保持 `../shared/` 的引用不变，替换内容、日期、标题与来源链接；页脚页码和底部导航会根据 `.slide` 的数量自动生成。将新报告的链接加到根目录 `index.html` 即可。

公共定义放在 `shared/`：`presentation.css` 开头的 CSS 变量定义背景、文字、强调色与字体。修改公共样式会作用于引用它的所有报告；单篇报告的调整放在自己的 `deck.css`。

中文明确采用 **Noto Sans SC（简体中文）** 可变字体，页面语言设为 `zh-Hans-CN`，不使用日文字体或日文字形版本。字体文件来自 Google Fonts 官方仓库，以 SIL Open Font License 分发，许可证位于 `shared/fonts/OFL.txt`。后续报告共用这一份本地字体，无需重复复制，也无需安装字体。

修改 `README.md` 后，运行下面命令即可更新供双击打开的说明页；使用 `serve.py` 访问 `README.md` 时会实时读取 Markdown。

```bash
python3 serve.py --build-docs
```

该命令会一并更新各日期目录中的 `README.html`。
