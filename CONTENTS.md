# 各期内容简介

持续记录本仓库的论文分享与项目汇报，按日期从新到旧排列。新增一期或调整既有报告时，更新对应条目及首页入口。

[使用方法与写作规范](README.md) · [网页首页](index.html) · [本目录的网页版本](CONTENTS.html)

## 2026.11.10 · 用视频生成先验引导逆渲染优化

**类型：论文分享。** 当前 16 页，约 15 分钟。

论文：*Video Numerical Continuation for Differentiable Inverse Rendering*，Haolin Lu、Ishit Mehta、Haodong Li、Yu Fu、Tzu-Mao Li、Ravi Ramamoorthi，SIGGRAPH Asia 2026 Conference Track。

报告讨论如何用首尾帧条件生成视频，将中间帧作为逐步变化的图像目标，帮助可微逆渲染避开坏的局部解。

- 核心方法：可微渲染中的待求参数、视频数值延拓、参考帧调度；对照介绍 PRDPT 与 RGBXY，并解释不同方法的损失地形。
- 代表实验：单参数及 6D 位姿、多物体摆放、真实照片与反射观测；粗糙度和光源优化；网格恢复、多视图与几何–材质联合优化。
- 局限与讨论：生成路径和多视图不一致、零梯度平台、与 PRDPT / RGBXY 的组合、模型随机性与生成成本，以及多初值搜索和 ShaderNPR 项目的联系。
- 展示资料：论文原图与表格、House / Dragon 作者视频、可放大的补充实验，以及逐页讲稿。

[打开演示稿](2026_11_10_Video_Numerical_Continuation/index.html) · [本期操作说明](2026_11_10_Video_Numerical_Continuation/README.html) · [15 分钟讲稿与备查资料](2026_11_10_Video_Numerical_Continuation/讲稿.html)

[论文](https://ishit.github.io/static/papers/haolin_siga26.pdf) · [作者项目页](https://ishit.github.io/vnc/index.html) · [补充材料](https://suikasibyl.github.io/files/vnc/supplementary.pdf) · [作者代码](https://github.com/SuikaSibyl/vnc)

目录：`2026_11_10_Video_Numerical_Continuation/`。素材来源记录：`assets/SOURCES.json`。

## 2026.10.24 · 参考图驱动的 Shader 与控制贴图生成

**类型：中期报告。** 当前 22 页，建议约 20 分钟。汇报人：林思睿。

项目：ShaderNPR。输入已有三维模型及风格参考图，通过可微渲染拟合着色参数与控制贴图，输出可编辑的 Shader、参数配置和贴图。

- 方法主线：参考图预处理与相机对齐、部件分区、分阶段灯光和明暗拟合，以及描边、法线、高光与控制贴图优化。
- 结果展示：以 Avatar03 串联完整流程，并用 Avatar01–06、ice、lion 展示多模型结果；配有阶段对比、转台与旋转光照视频、导出和评估入口。
- 讨论内容：当前方法的局限、统一定量评价、多视图与可验证三维风格等后续方向。
- 展示资料：本地保存的项目结果与来源记录、22 页讲稿、完整汇报预览。实时评估入口需要另行运行评估应用，详见本期说明。

[打开中期报告](2026_10_24_Reference_Driven_Shader_and_Control_Maps/index.html) · [本期操作说明](2026_10_24_Reference_Driven_Shader_and_Control_Maps/README.html) · [讲稿](2026_10_24_Reference_Driven_Shader_and_Control_Maps/讲稿.html) · [完整汇报预览](2026_10_24_Reference_Driven_Shader_and_Control_Maps/完整汇报预览.jpg)

目录：`2026_10_24_Reference_Driven_Shader_and_Control_Maps/`。素材与结果记录：`assets/sources.json`、`assets/result_snapshot.json`。

## 长期更新方式

新增报告时，在相应日期位置增加一条记录，并同步更新网页首页。保留历史记录；修改既有报告时，就地更新该条目的内容和页数。

每条记录包括日期、概括主题、报告类型、页数与建议时长、一段内容简介、主要讲解重点、演示稿和资料入口，以及实际使用的论文或项目来源。只有已经存在的资料才添加链接。

通用启动方式和写作要求放在 `README.md`，各期的详细操作和讲稿放在日期目录。更新本文件后，运行 `python3 serve.py --build-docs` 同步生成可离线打开的 `CONTENTS.html`。
