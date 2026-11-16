# 数据与接入

本文件集中维护网站数据、代码接口、审核交接和能力状态。网站字段为语义约定，不表示引擎原生支持；不能虚构已存在的 API、凭据或发布结果。

## 数据来源

| 文件 | 维护内容 |
| --- | --- |
| rules/layout-rules.json | 唯一规则配置；含 typography、export、delivery、components、unboundComponents、assetRegistry |
| assets/asset-registry.json | 素材 ID/版本、相对包根目录路径、像素/可见边界、字节数与 SHA-256 |
| assets/font-faces.css | 原始字体独立 family、weight 400；字体 URL 相对 CSS 文件 |

不再维护 runtime 副本，浏览器直接读取 JSON。组件绑定已并入规则 JSON。Logo/口号 ID 仍为引擎常量，修改绑定时需同步引擎和校验；不要认为修改 JSON 就会自动改引擎常量。四项固定资产版本均为 1.0.0，二进制内容未变。

## 网站输入

| 字段 | 语义 |
| --- | --- |
| task_type / task_id | material_generation 或 template_authoring；真实网站 ID 或明确本地 ID |
| context / site_validation | 网站提供归属、操作者引用、权限、有效性和版本可用结果 |
| template_ref / project_template | 城市所需模板 ID、确切版本、完整配置或可读引用 |
| overrides | 城市仅 title、subtitle、qr；区分未提供与显式清空 |
| targets | 已选规格，每项独立 item_id、类型、宽高、单位、来源 |
| source_visual / layout_selection | 网区提供的主视觉及版式选择 |
| preview_confirmation / action | 当前版本确认记录和本次真实动作；任务类型不是发布授权 |

规格形状示例（不是默认任务）：

```json
{"item_id":"example-01","material_type":"台卡","width":210,"height":297,"unit":"mm","source":"preset"}
```

宽高有限正数，保留小数、顺序，source 为 preset/custom；新增类型填写实际名称。适配为 `{label: material_type, w: width, h: height, unit: 'mm'}`，业务统一 mm；引擎内部保留 px 兼容，不替代成品毫米尺寸。

二维码输入互斥：

```json
{"kind":"link","value":"https://example.com/activity"}
```

```json
{"kind":"image","image_ref":{"asset_id":"example-qr","version":"1.0.0"}}
```

URL/ID 仅示例；图片也可用真实可读本地文件。链接映射 data.url，绘制传 qrMarkup；图片模式需占位、绘制、预览和两种导出统一适配，保留原图/留白，不静默丢弃或只叠加网页。

项目模板记录：ID/版本、region_id/project_id、真实主视觉及品牌素材版本、layout、rule_ref、defaults、required_fields、editable_fields、target_policy、delivery_policy、验收规格/文件、网站状态/有效性/确认记录。主标题始终必填，附加清单只能追加。项目模板 ID 与引擎返回的通用规则 template.id 分别保留。

## 浏览器接口

从包根目录提供 HTTP 服务，由实际网站页面加载字体 CSS 和 JSON 后再导入脚本，不需要生成同步文件：

```html
<link rel="stylesheet" href="assets/font-faces.css">
<script type="module">
  const readJson = async file => {
    const response = await fetch(file);
    if (!response.ok) throw new Error('配置读取失败：' + file);
    return response.json();
  };
  window.DIDI_LAYOUT_CONFIG = await readJson('rules/layout-rules.json');
  window.DIDI_ASSET_REGISTRY = await readJson(window.DIDI_LAYOUT_CONFIG.assetRegistry);
  await import('./engine/didi-split-layout.js');
  await import('./engine/qr.js');
  const engine = window.DidiLayout;
  if (!await engine.ready) throw new Error('指定字体未加载');
  // 在这里传入本次真实 data 和 target，调用下述接口。
</script>
```

字体 CSS 应先加载完成；跨目录接入需保持资源相对包根目录解析，或由适配层提供真实可访问地址。主视觉用 `customImage` 地址，或已登记的 `mainVisualRef`（ID/版本），类型须为 image/main_visual/key_visual；不绑定默认活动图。

| 真实方法 | 返回 / 限制 |
| --- | --- |
| DidiLayout.plan(data, target) | 布局和问题；估算/实际字体模式分开记录，layout.valid 仅预检查 |
| DidiLayout.render(data, target, {qrMarkup: window.qrMarkup}) | 预览 SVG 字符串，文字未转曲、图片可能外链 |
| DidiLayout.pngSize(target) | width/height/dpi；210×297 mm 返回 1240×1754 px、dpi 150 |
| DidiLayout.exportPng(data, target, window.qrMarkup) | 候选 PNG 字节，含 pHYs；字体或布局失败时拒绝导出 |
| window.makeQR / window.qrMarkup | 链接二维码编码/矢量绘制，合并在 engine/qr.js |

data 常用字段为 title、subtitle、date、location、url、customImage、splitPreset、brandPillar。版式/品牌排列不合法时，引擎返回明确错误；日期地点来自锁定模板，不能在城市侧擅自新增。

## 当前能力与缺口

- 正式 SVG 尚无 exportSvg()：需保留同一布局，将排版文字转曲、图形保留矢量、全部图片嵌入并验收。Logo/口号直接嵌入原始 PNG，无需矢量原件。
- PNG 150 PPI 规定最终像素尺寸，不是源素材的硬性清晰度门槛。可核实时记录实际有效 PPI；清晰度不足或未核实写入 quality_warnings，不阻止导出，不作为格式检查失败或等待确认的原因。双格式内容与外观一致性仍需核对。
- 二维码图片无原生字段。链接编码上限为 78 UTF-8 字节。诊断预览中的 qrMarkup 可显示“链接待检查”占位；PNG 导出采用严格模式，编码失败或缺少二维码绘制函数时拒绝导出，不把占位或缺码文件当成功。二维码解码和目标链接访问不由当前引擎保证。
- 详情只绘制 date、location；自由 details 或其他未适配组件必须报告，不能静默吞内容。
- 网站的模板读写、推荐、权限、存储、任务记录、确认和发布，以及独立审核调度，均需实际接口。缺少时可返回本地草稿，不能声称已接通。

## 审核交接

由宿主发现独立 didi-design-audit 的实际入口，读取其当前范围和报告协议；本包不包含该 Skill，也不强制它承担范围外检查。提交真实文件/指纹、目标 mm、1:1、150 PPI、本任务 PNG Logo/口号例外及必要上下文；明确本次密度要求，避免直接套用审核工具的历史默认值。

独立报告原样保留其 scope/result 和问题依据，不将 layout.valid 冒充审核通过。生成流程另行核对 [交付规范](delivery-spec.md) 中转曲、图片嵌入及配对文件一致性；素材清晰度单独注明，不影响导出。缺少审核入口或未执行时记录执行状态，不能伪造 passed；文件变化后重审。

## 逐规格结果与状态

顶层包含 task_id、task_type、绑定模板/规则/素材版本、status、items、missing_fields、integration_gaps、next_actions。

| items 字段 | 内容 |
| --- | --- |
| item_id / material_type / size | 原始条目、类型、width_mm/height_mm/scale:1 |
| generation_status / export_status / preview | 实际生成和导出状态、真实预览 |
| files.png | 状态、路径、SHA-256、实测 px、PPI 与 density_ppm |
| files.svg | 状态、路径、SHA-256、根宽高 mm/viewBox、转曲/矢量/嵌入/无外链检查 |
| bitmap_checks / quality_warnings | 能取得的素材像素、放置/裁切、有效 PPI；清晰度不足或未核实的非阻断说明 |
| delivery_checks | 尺寸、密度、转曲、嵌入、无外链、内容一致和无水印的逐项证据与结果 |
| audit | 执行状态、真实报告 ID、范围、结论及 reviewed_artifacts 指纹 |
| delivery_class | preview、candidate 或正式 design_package |

文件状态为 not_generated/exported/failed；生成端检查为 passed/failed/needs_review/not_checked，与文件成功写出分开记录。独立审核的 result 按其实际协议保留。不存在的文件不填虚构路径或指纹。

顶层状态：needs_input（缺输入）、awaiting_confirmation（待确认）、awaiting_site_integration（必要能力未接入）、partial（部分规格完成）、failed（尝试后全部失败）、completed（本次实际动作完成）。正式交付的 completed 须全部规格双格式、必要格式/内容检查和审核通过；素材清晰度不足或未核实可随 quality_warnings 正常完成，不因这些提示转为 failed/awaiting_confirmation；只有部分满足用 partial。仅请求草稿时可完成草稿动作，但 delivery_class 仍为 preview/candidate。模板额外返回配置、确认和 publication.status；published 仅来自网站成功结果。

## 包内自检

```sh
node scripts/validate.mjs
```

一次检查素材路径、字节数/SHA-256、组件绑定、字体 CSS、必要交付配置、基础布局/标题必填/固定字号、150 PPI 尺寸换算、非法版式/单位拒绝、二维码字节限制及失败导出拦截，结果输出终端，不生成报告副本。Node 使用估算字宽，不代表实际浏览器导出、成品视觉、有效 PPI 或正式 SVG 验收已通过。


本版 v0.3.7 另经真实 Chrome 验证：原始字体及全部包内素材加载成功，S/M/L/XL × 横竖方向 × 两种品牌排列共 16 种短文案组合通过；实际导出竖版及含二维码横版 PNG，核对 210×297 mm 对应 1240×1754 px 和 5906 像素/米密度；8×8 px 低清主视觉仍正常导出；二维码经本地识别器解码，内容与输入一致。非法版式/品牌排列、二维码超限/缺绘制函数、缺字体、缺图片和文案溢出均按预期拒绝。该记录仅对应包内引擎测试，不替代任务成品的独立审核，也不表示正式 SVG 或网站接口已实现。
