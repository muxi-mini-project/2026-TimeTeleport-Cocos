# 钩爪系统快速上手指南

## 概述

钩爪系统允许玩家通过按 'U' 键快速移动到附近的锚点。

## 组件说明

### 1. Anchor (锚点组件)
- **文件**: `assets/Scripts/Objects/Anchor.ts`
- **功能**: 
  - 检测玩家进入范围
  - 显示范围指示器动画
  - 提供调试绘制功能
- **属性**:
  - `Detection Radius`: 检测半径（默认 200）
  - `Debug Draw`: 是否显示调试绘制
  - `Indicator Anim Duration`: 范围指示器动画时长（默认 0.3s）
  - `Player Node Ref`: 玩家节点引用（留空则自动查找）

### 2. GrappleController (钩爪控制器)
- **文件**: `assets/Scripts/Objects/GrappleController.ts`
- **功能**:
  - 监听 'U' 键输入
  - 查找范围内最近的 Anchor
  - 绘制绳索并移动玩家
- **属性**:
  - `Grapple Enabled`: 是否启用钩爪功能（默认 false）
  - `Debug Log`: 是否显示调试日志（默认 true）
  - `Draw Rope`: 是否绘制绳索（默认 false，测试时可关闭）
  - `Rope Graphics`: 绳索绘制的 Graphics 组件
  - `Grapple Speed`: 钩爪目标速度（默认 15）
  - `Grapple Force`: 钩爪拉力系数，越大拉动越快（默认 50）
  - `Reach Distance`: 到达目标的最小距离（默认 10）
  - `Reset Dash On Grapple`: 钩爪完成后是否重置冲刺次数（默认 true）

## 快速配置步骤

### 步骤 1: 创建 Anchor 预制体

**方法 A: 使用图片（推荐）**
1. 将锚点图片拖入场景
2. 添加 `Anchor` 组件
3. 设置 `Detection Radius` 为合适的值（建议 200-300）
4. 将节点保存为 Prefab，命名为 "Anchor"
5. 将预制体放到 `assets/Prefabs/` 目录下

**方法 B: 使用 Graphics 绘制**
1. 在 Cocos Creator 中创建一个新的空节点
2. 添加 `Anchor` 组件
3. 添加 `Graphics` 组件（用于调试绘制和范围指示器）
4. 设置 `Detection Radius` 为合适的值（建议 200-300）
5. 将节点保存为 Prefab，命名为 "Anchor"
6. 将预制体放到 `assets/Prefabs/` 目录下

**注意**: 方法 A 中，Anchor 组件会自动创建子节点用于 Graphics 绘制，无需手动添加。

### 步骤 2: 配置 LevelMapManager

1. 打开包含 `LevelMapManager` 组件的节点
2. 在 Inspector 中找到 `Anchor Prefab` 属性
3. 将创建的 "Anchor" 预制体拖入该属性

### 步骤 3: 在 TiledMap 中添加锚点

1. 打开 Tiled 编辑器
2. 在 "Objects" 对象层中创建新对象
3. 将对象命名为 "anchor"（小写）
4. 调整对象大小和位置
5. 保存 TMX 文件

### 步骤 4: 配置玩家节点

1. 找到 Player 节点
2. 添加 `GrappleController` 组件
3. 确保 Player 节点已有 `RigidBody2D` 组件
4. 在 Player 的 `PlayerController` 组件中，将 GrappleController 拖入 `Grapple Controller` 属性

### 步骤 5: 调试和测试

1. 运行场景
2. 设置 Anchor 组件的 `Debug Draw` 为 true，查看检测范围
3. 控制玩家走到锚点附近，观察范围指示器动画（0.3s 缩小）
4. 按 'L' 键测试钩爪功能
5. 观察绳索绘制和玩家移动

## 使用说明

### 启用/禁用钩爪功能
1. 找到 Player 节点的 `GrappleController` 组件
2. 在 Inspector 中找到 `Grapple Enabled` 属性
3. **取消勾选**：禁用钩爪功能（按 L 键无反应）
4. **勾选**：启用钩爪功能（按 L 键可以使用）

### 玩家操作
- **按 L 键**: 触发钩爪，向最近的范围内锚点移动（仅在 Enabled=true 时有效）
- **自动释放**: 到达锚点附近（默认 10 像素）时自动释放
- **冲刺重置**: 钩爪完成后，冲刺次数会自动重置（默认启用）

### 钩爪与冲刺联动
钩爪系统与冲刺系统无缝集成：
- **默认行为**: 钩爪完成后，玩家可以立即使用冲刺（K 键）
- **优势**: 允许连续的移动组合，如：钩爪 → 冲刺 → 跳跃
- **配置**: 可在 `GrappleController` 的 `Reset Dash On Grapple` 属性中调整

**推荐连招示例**:
1. **钩爪 + 冲刺**: 按 L 钩爪到高处 → 按 K 向前冲刺 → 扩大移动范围
2. **钩爪 + 跳跃**: 按 L 钩爪 → 按 J 跳跃 → 借用动量达到更高高度
3. **钩爪 + 冲刺 + 跳跃**: 按 L 钩爪 → 按 K 冲刺 → 按 J 跳跃 → 最大化移动距离

### 调试技巧
1. **查看检测范围**: 勾选 Anchor 组件的 `Debug Draw`
2. **查看绳索**: GrappleController 会自动绘制白色绳索
3. **查看激活状态**: 控制台会输出 `[Grapple] 开始钩爪` 和 `[Grapple] 到达目标`

## 参数调优建议

### 锚点检测范围
- **小地图**: 建议 150-200
- **大地图**: 建议 250-300
- **密集放置**: 建议 100-150

### 钩爪速度和拉力
**Grapple Speed (目标速度)**:
- **快速游戏**: 18-25
- **标准游戏**: 12-18
- **慢速游戏**: 8-12

**Grapple Force (拉力系数)**:
- **快速响应**: 60-80（快速达到目标速度）
- **标准响应**: 40-60（平衡的速度变化）
- **平滑响应**: 20-40（更自然的加速曲线）

### 到达距离
- **精确**: 5-10
- **宽松**: 15-20

## 注意事项

1. **玩家节点**: Anchor 需要找到玩家节点才能检测距离
   - 方法 A: 确保 Player 节点名称为 "Player"（Anchor 会自动查找）
   - 方法 B: 在 Anchor 组件中手动指定 Player 节点（推荐，更可靠）
2. **场景结构**: GrappleController 会自动遍历整个场景树查找 Anchor 组件，无需特殊的 Level 节点
3. **Graphics 组件**: Anchor 和 GrappleController 都依赖 Graphics 组件
4. **RigidBody2D**: Player 必须有 RigidBody2D 组件才能被钩爪移动
5. **动量保持**: 到达锚点后，玩家会保持当前速度，不会自动停止
6. **优先级**: 钩爪时，玩家的正常移动和跳跃会被禁用
7. **范围限制**: 只能钩向范围内的锚点，超出范围无法触发

## 常见问题

### Q: 按 U 键没有反应？
A: 检查以下几点：
- Player 节点是否命名为 "Player"
- PlayerController 是否绑定了 GrappleController
- GrappleController 是否添加到 Player 节点
- 是否有范围内的锚点（查看 Debug Draw）

### Q: 钩爪移动太快或太慢？
A: 调整 GrappleController 的 `Grapple Speed` 属性

### Q: 范围指示器不显示？
A: 检查 Anchor 组件的 `Indicator Graphics` 是否正确添加

### Q: 绳索不显示？
A: 检查 Player 节点的 Graphics 组件是否正确添加，或检查 GrappleController 的 `Rope Graphics` 属性

### Q: 没有看到调试框和范围指示器？
A: 检查以下几点：
- 确保 Anchor 组件的 `Debug Draw` 已勾选
- 如果预制体使用了图片（Sprite），Anchor 会自动创建子节点用于 Graphics
- 查看控制台是否有 `[Anchor] 玩家进入范围` 日志
- 确认控制台显示 `[Anchor] 成功找到 Player 节点`

### Q: 控制台显示 `[Anchor] 未找到 Player 节点`？
A: 检查以下几点：
- 确保 Player 节点名称为 "Player"
- 检查场景层级结构，Player 可能在子节点中
- 推荐方法：在 Anchor 预制体中，手动将 Player 节点拖入 `Player Node Ref` 属性
- 查看控制台输出的场景结构日志，确认 Player 节点的实际路径

## 调试指南

### 启用/禁用调试日志
1. 找到 Player 节点的 `GrappleController` 组件
2. 在 Inspector 中找到 `Debug Log` 属性
3. **勾选**：显示所有调试日志
4. **取消勾选**：隐藏调试日志（减少控制台输出）

### 启用/禁用绳索绘制
1. 找到 Player 节点的 `GrappleController` 组件
2. 在 Inspector 中找到 `Draw Rope` 属性
3. **勾选**：显示绳索（需要 Graphics 组件）
4. **取消勾选**：不显示绳索（推荐用于测试移动逻辑）

### 查看钩爪系统日志
运行游戏时，控制台会显示以下日志（仅在 Debug Log=true 时）：

**组件初始化：**
```
[Grapple] GrappleController 组件已加载
[Grapple] 钩爪功能已启用/已禁用
[PlayerController] GrappleController 已正确绑定
```

**玩家操作：**
```
[Grapple] 检测到按键: 85 (U键)
[Grapple] 按下 U 键
[Grapple] 钩爪功能已禁用，忽略按键 (如果未启用)
[Grapple] 尝试使用钩爪 (如果已启用)
```

**查找锚点：**
```
[Grapple] 开始查找最近的锚点
[Grapple] 找到 5 个 Anchor 组件
[Grapple] 锚点 anchor 超出范围，跳过
[Grapple] 锚点 anchor 在范围内，检查距离
[Grapple] 锚点 anchor 距离: 150.23
[Grapple] 找到最近的锚点: anchor，距离 150.23
```

**钩爪执行：**
```
[Grapple] 已禁用重力
[Grapple] 开始钩爪！
[Grapple] 目标锚点: anchor
[Grapple] 钩爪速度: 15
[Grapple] 钩爪拉力: 50
[Grapple] 到达目标，保持动量！
[Grapple] 已恢复重力
[Grapple] 冲刺次数已重置（如果启用）
[PlayerController] 冲刺次数已重置（如果启用）
```

### 常见问题排查

**问题 1：按 U 键没有任何反应**
- 检查 `GrappleController` 的 `Enabled` 属性是否勾选
- 查看日志是否有 `[Grapple] 按下 U 键`
- 如果没有，说明输入未正确注册

**问题 2：有日志但未开始钩爪**
- 查看日志 `[Grapple] 未找到可用的锚点`
- 检查 Anchor 组件是否正确生成
- 查看 Anchor 日志 `[Anchor] 玩家进入范围`

**问题 3：有锚点但仍无法钩爪**
- 查看日志确认玩家是否在锚点范围内
- 检查 `PlayerController` 是否正确绑定了 `GrappleController`
- 查看 `[Grapple] 未找到 RigidBody2D 组件` 错误

**问题 4：钩爪但移动异常**
- 检查 `Grapple Speed` 是否设置过大
- 检查 Player 节点的 `RigidBody2D` 组件是否启用
- 查看物理系统是否有错误

### Q: 如何完全禁用钩爪功能？
A: 在 Player 节点的 GrappleController 组件中，取消勾选 `Grapple Enabled` 属性

### Q: 如何减少控制台日志输出？
A: 在 GrappleController 组件中，取消勾选 `Debug Log` 属性

### Q: 如何在没有 Graphics 组件的情况下测试？
A: 在 GrappleController 组件中，取消勾选 `Draw Rope` 属性。这样就不会绘制绳索，只会测试移动逻辑

### Q: 如何在不显示绳索的情况下测试钩爪移动？
A:
1. 取消勾选 `Draw Rope` 属性（不绘制绳索）
2. 勾选 `Grapple Enabled` 属性（启用钩爪）
3. 勾选 `Debug Log` 属性（查看日志）
4. 走到锚点附近，按 U 键
5. 观察玩家是否向锚点移动
6. 查看控制台日志确认钩爪状态

## 扩展功能建议

- **音效**: 在 `startGrapple()` 和 `endGrapple()` 添加音效播放
- **粒子特效**: 在锚点添加粒子效果
- **多段钩爪**: 实现连续钩爪到多个锚点
- **冷却时间**: 添加钩爪冷却机制
- **体力限制**: 限制钩爪使用次数或时间

## 技术细节

### 物理系统
- **重力控制**: 钩爪开始时禁用重力（`gravityScale = 0`），结束时恢复（`gravityScale = 1`）
- **施加力**: 使用 `applyForceToCenter()` 施加物理力，而非直接设置速度
- **速度计算**: 计算目标速度与当前速度的差值，施加力使玩家加速到目标速度
- **自然加速**: 通过物理力实现平滑的加速曲线，更符合物理规律

### 坐标系统
- 使用世界坐标计算距离
- Graphics 绘制使用本地坐标
- 坐标转换使用 `convertToNodeSpaceAR()`

### 性能优化
- Anchor 只在玩家进入范围时激活指示器
- GrappleController 只在激活时更新绳索
- 使用 `getComponentsInChildren()` 批量查找 Anchor

### 状态管理
- `isGrappling`: 控制钩爪状态
- `isPlayerInRange`: Anchor 跟踪玩家是否在范围内
- `indicatorActive`: Anchor 控制指示器动画

## 更新日志

- **v1.2** (2026-01-29): 物理力驱动钩爪
  - 钩爪时禁用重力，结束时恢复
  - 使用物理力（`applyForceToCenter`）而非直接设置速度
  - 添加 `Grapple Force` 参数控制拉力
  - 更自然的加速曲线和物理表现

- **v1.1** (2026-01-29): 钩爪冲刺重置功能
  - 钩爪完成后自动重置冲刺次数
  - 添加 `Reset Dash On Grapple` 配置选项
  - 可选择是否启用冲刺重置

- **v1.0** (2026-01-29): 初始版本
  - 基础锚点系统
  - 钩爪控制器
  - TiledMap 集成
  - 范围指示器动画
  - 调试绘制功能
