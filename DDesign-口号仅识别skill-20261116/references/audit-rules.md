# 独立审核入口

审核已从生成流程拆出，完整规则表只维护在独立的 `didi-design-audit` Skill 中。

- 审核入口：[didi-design-audit/SKILL.md](../../didi-design-audit/SKILL.md)。
- 完整规则：[独立审核规则表](../../didi-design-audit/references/audit-rules.md)。
- 数据交接：[审核输入与报告](../../didi-design-audit/references/review-contract.md)。

两个 Skill 随同一交付包提供。生成流程在排版预检查后，将需求、锁定模版、规则快照、逐规格布局结果及实际产物交给审核 Skill，由它返回逐规格报告。审核 Skill 不修改设计、不代替网站发布。

若目标环境只安装生成 Skill、无法调用独立审核能力，返回 `awaiting_site_integration` 并注明缺少独立审核入口；不得自行把预检查结果标记为完整审核通过。主标题缺失等生成前置错误仍由生成流程立即处理。

当前引擎仍不能保证文案事实、二维码解码、链接访问或印前验收。审核范围与未检查项由独立报告明确展示。
