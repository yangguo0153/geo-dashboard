# Findings & Decisions

## Requirements
- 用户要求我接手 `geo-dashboard`，按前轮调研结果直接开始修复。
- 修复完成后做 git 收尾，但不做 `git push`。
- 修改范围要最小，不碰无关改动。

## Research Findings
- 当前主链路是 `Excel -> xlsxParser -> SQLite -> overview/keywords/settlement API -> React 看板`。
- `FileUpload` 组件把 `uploadFile` 调错了，前端调用签名与 hook 实现不匹配，成功回执字段也读错。
- 总览页“整体考核通过率”由前端按 tier 分布自算，和后端 `settlement` 接口口径不一致。
- 模板生成脚本中的平台示例值和数据库允许值不一致，存在“模板可填但无法入库”的风险。
- 工作区本身已是脏状态，多个前后端文件已被修改；本次需要基于当前文件内容做增量补丁。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 采用“最小契约修复”而非“统一重构 API 层” | 用户要先接手修复，主路径优先，减少和现有改动冲突 |
| 把总览页通过率统一为后端返回值 | 业务口径集中在后端，避免页面重复实现 |
| 模板对齐当前四个平台与字段语义 | 让示例数据、解析器、数据库约束保持同一套事实 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| 全量测试偶发 `EPIPE`，和定向测试结果不一致 | 先保留现象，后续通过更窄粒度测试确认是否为并行不稳定 |
| 同事 Windows 本地安装失败：`better-sqlite3` 预编译包下载超时，回退 `node-gyp` 后缺 Python | 改走 Railway 集中部署；避免非技术同事安装 Python/Visual Studio Build Tools |
| Railway SQLite 持久化 | 使用 `DB_PATH=/data/geo.db` + Railway Volume mount `/data` |
| Railway 试用期结束，部署被暂停（Deploys have been paused） | 切换到 Fly.io（免费版支持 1GB 持久化 Volume） |
| Docker 构建中 vite 在 workspace devDependencies 中无法找到 | 将 vite 从 client/package.json 的 devDependencies 移到 dependencies |

## Resources
- `/Users/will/Desktop/split-repos/HM/智己/geo-dashboard/client/src/components/FileUpload.jsx`
- `/Users/will/Desktop/split-repos/HM/智己/geo-dashboard/client/src/hooks/useApi.js`
- `/Users/will/Desktop/split-repos/HM/智己/geo-dashboard/client/src/pages/Overview.jsx`
- `/Users/will/Desktop/split-repos/HM/智己/geo-dashboard/server/routes/overview.js`
- `/Users/will/Desktop/split-repos/HM/智己/geo-dashboard/server/routes/settlement.js`
- `/Users/will/Desktop/split-repos/HM/智己/geo-dashboard/templates/generateTemplate.js`

## Visual/Browser Findings
- 本轮未使用浏览器或图片类检查。
