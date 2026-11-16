# 数据与接入约定

这是新增的 Skill 与网站对接协议草稿，不表示现有引擎已接受这些字段。网站可以使用不同字段名，但需要在适配层保持下列语义。代码调用仍使用 [配置与调用](../docs/02-配置与调用.md) 中的真实接口。

## 任务输入

| 字段 | 含义与来源 |
| --- | --- |
| `task_type` | `material_generation` 或 `template_authoring` |
| `task_id` | 网站任务 ID；本地草稿使用明确标记的本地标识 |
| `context` | 网站传入的城市、网区、项目与操作者引用；不要为展示或出图额外收集个人信息 |
| `template_ref` | 城市任务必需，包含项目模版 ID、确切版本 |
| `project_template` | 已加载的完整模版配置；或由实际可用接口读取 |
| `site_validation` | 网站针对当前任务给出的归属、权限及版本可使用结果；模型不能替代服务端授权 |
| `overrides` | 城市覆盖内容，只允许 `title`、`subtitle`、`qr` |
| `targets` | 已选物料规格清单，每项有独立 `item_id`、类型名称、宽、高、单位和预设/自定义来源 |
| `source_visual` / `layout_selection` | 模版制作任务的主视觉和版式选择 |
| `preview_confirmation` | 模版确认记录，关联当前版本和素材 |
| `action` | 本次实际请求，例如生成预览或确认后发布；不能仅因任务类型就自动发布 |

城市任务中，模版默认值与 `overrides` 合并时必须区分“未提供”和“显式清空”。主标题始终必填；模版可追加必填要求，但不能取消主标题要求。未定义附加要求时副标题和二维码可空，合并操作不能跳过必填检查。

### 尺寸清单

每项形状示例：

```json
{
  "item_id": "example-item-01",
  "material_type": "台卡",
  "width": 210,
  "height": 297,
  "unit": "mm",
  "source": "preset"
}
```

以上仅说明数据形状，不是实际任务输入。`source` 可为 `preset` 或 `custom`，自定义类型也填写实际名称。宽高为有限正数；保留小数，不能擅自取整为毫米整数。所有物料统一 mm，不能把大屏转成 px 输入。

对引擎适配为 `{label: material_type, w: width, h: height, unit: 'mm'}`。成品 PNG 像素尺寸由 72 dpi 换算、四舍五入；毫米尺寸记录保持原值。大量像素导致导出失败时返回实际错误，不降低分辨率或自动改变尺寸。

### 二维码输入

```json
{
  "kind": "link",
  "value": "https://example.com/activity"
}
```

```json
{
  "kind": "image",
  "image_ref": {
    "asset_id": "example-qr-image",
    "version": "1.0.0"
  }
}
```

以上 URL 和 ID 均为形状示例，不可用于正式出图。图片也可用任务实际提供的可读取文件引用；不要求为了本地试排虚构资产 ID。模式互斥，同时提供两种模式时要求明确本次使用哪种，不擅自选择。

当前引擎的原生链接入口是 `data.url`，预览和导出均须传入 `qrMarkup`。图片模式尚无原生字段；绘制适配必须同时覆盖布局占位、原图绘制、预览和 PNG 导出，保留二维码完整内容及原有留白。不能只在网页预览上叠一张图而漏入导出，也不能放入虚假 URL 触发占位来冒充正式支持。

## 项目模版资产

| 字段 | 要求 |
| --- | --- |
| `template_id` / `version` | 网站分配和管理，任务绑定具体版本 |
| `region_id` / `project_id` | 用于网站匹配归属 |
| `main_visual_ref` | 实际主视觉文件或可读取的固定版本引用 |
| `layout` | `splitPreset` 为 S/M/L/XL；`brandPillar` 为 horizontal/vertical |
| `rule_ref` | 本包规则 ID、版本及引用路径；当前为 `didi-split-identification` / `0.3.3` |
| `brand_asset_refs` | 实际使用的 Logo、口号、字体及其版本 |
| `defaults` | 模版默认主副标题、二维码和固定内容 |
| `required_fields` | 项目附加必填清单；全局 `title` 始终必填，有效必填集合为 title 与该清单的并集 |
| `editable_fields` | 城市仅 `title`、`subtitle`、`qr` |
| `target_policy` | 类型分组、多选预设、自定义尺寸、新增类型，统一 `mm`；预设目录归网站 |
| `preview_targets` / `previews` | 本版本验收使用的规格及真实预览 |
| `status` / `published_at` | 网站发布状态和成功发布时间，不能由模型推测 |
| `validity` / `confirmation` | 网站提供的有效性策略和绑定当前版本的确认记录 |

项目模版的 `template_id` 与 `DidiLayout.plan()` 返回的通用排版规则 `template.id` 含义不同，结果中都要保留，不能相互替代。

## 逐规格结果

顶层结果至少包含任务 ID、任务类型、绑定模版/规则/素材版本、`status`、`items`、`missing_fields`、`integration_gaps`、`next_actions`。

顶层 `status` 使用：

| 值 | 含义 |
| --- | --- |
| `needs_input` | 必要输入缺失或字段错误，尚不能按请求完成 |
| `awaiting_confirmation` | 已有预览，等待模版制作者确认或解决标出的视觉确认事项 |
| `awaiting_site_integration` | 缺少完成请求所需的渲染、存储、二维码图片或发布接入 |
| `completed` | 本次实际请求完成；仍须展示真实审核范围与交付属性 |
| `partial` | 一批规格中一部分成功，或部分规格待处理 |
| `failed` | 已尝试但请求全部失败，保留具体错误 |

`items` 每项至少包含：

- 原始 `item_id`、物料类型、宽高 mm、换算像素尺寸。
- `generation_status`、`export_status`、实际存在的预览/文件引用。
- `audit.report_id`、`audit.reviewed_artifacts`：独立 `didi-design-audit` 报告和实际文件 SHA-256 的关联，不能沿用内容修改前的旧报告。
- `audit.scope`：本次实际审核范围。
- `audit.result`：`passed`、`failed`、`needs_review` 或 `not_checked`。
- `audit.checks`：规则 ID、结果、问题字段/组件、实际依据和修改建议。规则 ID 和报告结构见 [独立审核交接](audit-rules.md)。
- `delivery_class`：诊断预览为 `preview`，审核后正式下载文件为 `design_png`；均无系统水印，不以此代表印前验收。

审核前的实际 PNG 使用候选状态并交给审核读取；正式下载只能引用审核通过且 SHA-256 一致的文件。不通过或报告缺失时，可以返回诊断预览和问题清单，但不把该文件标记为审核通过的正式成品。

原有引擎问题没有稳定规则 ID。本次文档中的规则 ID 是上层报告约定；需要按实际组件和检查逻辑映射，不宣称它们由引擎原生返回。不能仅凭中文错误消息的模糊匹配推断未执行的检查通过。

模版结果还要返回模版配置、素材引用、确认状态和 `publication.status`。只有收到网站成功返回的正式发布结果才填写 `published` 与 `published_at`。

## 网站接入能力

网站应提供选定模版及版本的读取、素材读取/上传、任务结果保存、制作者确认记录和发布能力。复用目标环境已有的真实工具或接口；本包不指定虚构端点，也不自带账号、凭据或后端。

另需接入独立审核 Skill 的调度和结果读取；审核调用约定见 [审核输入与报告](../../didi-design-audit/references/review-contract.md)。没有审核调度不等于系统已接通自动审核。

Skill 只说明使用这些能力的时机与数据要求。服务端最终执行归属校验、权限校验、并发版本控制和发布状态写入。不可因 Skill 中写了“直接发布”而绕过真实身份权限。
