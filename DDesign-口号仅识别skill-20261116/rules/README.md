# DDesign · 口号仅作品牌识别

规则版本 0.3.3，状态 draft。本文位于 `rules/`；以下路径和命令均以规则包根目录为基准。

## 固定资产引用

注册表：`assets/asset-registry.json`。资产条目中的 `file` 相对规则包根目录解析。

| 用途 | 资产 ID | 文件 |
| --- | --- | --- |
| Logo | `didi.chuxing.logo.horizontal.reverse` | `assets/brand/assets/logos/didi-logo.png` |
| 品牌识别口号 | `didi.chuxing.slogan.single-line.reverse` | `assets/brand/assets/slogans/slogan-landscape.png` |
| 主标题 | `didi.font.hyqihei.65s` | `assets/brand/assets/fonts/HYQiHei-65S.otf` |
| 副标题／详情 | `didi.font.hyqihei.50s` | `assets/brand/assets/fonts/HYQiHei-50S.otf` |

四项固定资产版本均为 `1.0.0`，组件声明见 `rules/component-bindings.json`。主视觉和二维码由具体任务提供，不绑定默认示例图。

## 检查和预览

```sh
node scripts/sync.mjs --check
node scripts/validate.mjs
node scripts/sync.mjs
python3 -m http.server 8766 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8766/preview.html`，选择本次主视觉后预览或下载 PNG。页面中的默认文案只用于试排，自定义数据接入见 `docs/02-配置与调用.md`。

`runtime/` 由同步脚本自动生成，无需手动维护。校验默认只输出终端结果，加 `--report` 才写入 `validation-report.json`。`manifest.json` 为可选文件，只有主动运行 `node scripts/update-manifest.mjs` 才生成或更新，不作为出图前提。

详细规则见 `docs/01-规则说明.md`，来源与待确认项见 `docs/03-来源与待确认.md`。只覆盖口号作品牌识别的 S/M/L 分割版和 XL 全画面；固定字号，超出容量时报错，不自动缩字。字体使用原始 65S／50S，不伪加粗，图片不自动压暗。

PNG 输出为 72 dpi，px 保留输入像素，mm 按密度换算并四舍五入。不添加系统水印；主标题必填。规则检查不等同于设计或印前验收。

本副本新增根目录 `SKILL.md` 与 `references/`，说明城市物料生成、网区项目模版制作、输入输出及审核范围。网站业务表单的物料尺寸统一 mm；引擎原有 px 能力仍保留。独立审核入口为同包的 `didi-design-audit` Skill。引擎 0.3.3 增加主标题必填并去除水印，其他排版参数沿用；网站接口与二维码图片适配尚未实现。
