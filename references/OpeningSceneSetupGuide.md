# 开场场景：纸堆与印章测试指南

本文档介绍如何在 Cocos Creator 3.x 中构建开场场景，测试纸堆盖章系统。

## 组件概述

### 1. StampController (印章控制器)
- **功能**：跟随鼠标移动，点击盖章
- **必需属性**：
  - `paperStack`: 纸堆管理器引用
  - `markPrefab`: 盖章留下的印记预制体
  - `crosshairPrefab`: 准心预制体（圆形瞄准点）
- **可选属性**：
  - `hoverHeight`: 印章悬停高度（Z轴），默认 175
  - `dropHeight`: 印章下落到纸面的高度，默认 0

### 2. PaperStack (纸堆管理器)
- **功能**：管理纸张堆栈，自动补充新纸，处理盖章后的飞出动画
- **必需属性**：
  - `paperPrefab`: 纸张预制体
  - `visibleCount`: 可见纸张数量（默认 6）

---

## 场景构建步骤

### 步骤 1：创建新场景

1. 在 **Hierarchy** 面板中右键 → Create → Scene
2. 命名为 `OpeningScene`
3. 双击打开场景编辑

---

### 步骤 2：创建 Canvas（UI 容器）

1. 在 **Hierarchy** 面板中右键 → Create → UI Component → Canvas
2. 选中 Canvas，在 **Inspector** 中配置：
   - **UITransform** → Content Size
     - Width: `1920` (或根据设计稿调整)
     - Height: `1080` (或根据设计稿调整)
   - **UITransform** → Anchor
     - X: `0.5`, Y: `0.5` (居中)

---

### 步骤 3：创建背景（可选）

1. 在 Canvas 下右键 → Create → 2D Object → Sprite
2. 命名为 `Background`
3. 在 **Inspector** 中配置：
   - **Sprite** → Sprite Frame
     - 拖入 `assets/Arts/desktop.png`
   - **UITransform** → Content Size
     - Width: `1920`
     - Height: `1080`
   - **Position**: `(0, 0, 0)`

---

### 步骤 4：创建纸张预制体

#### 4.1 创建预制体节点

1. 在 Canvas 下右键 → Create → 2D Object → Sprite
2. 命名为 `Paper`

#### 4.2 配置纸张节点

在 **Inspector** 中配置：

- **Sprite** 组件：
  - Type: `Single`
  - Size Mode: `Custom`
  - Sprite Frame: 拖入纸张纹理（如 `assets/Arts/desktop.png` 或纯白图片）
  
- **UITransform** 组件：
  - Content Size → Width: `200`
  - Content Size → Height: `280`
  - Anchor → X: `0.5`, Y: `0.5`

- **Position**: `(0, 0, 0)`

#### 4.3 保存为预制体

1. 在 **Hierarchy** 中选中 `Paper` 节点
2. 拖动到 **Assets** → `Prefabs` 文件夹
3. 命名为 `PaperPrefab`
4. 删除场景中的 `Paper` 节点（保留预制体）

---

### 步骤 5：创建印记预制体

#### 5.1 创建预制体节点

1. 在 Canvas 下右键 → Create → 2D Object → Sprite
2. 命名为 `Mark`

#### 5.2 配置印记节点

在 **Inspector** 中配置：

- **Sprite** 组件：
  - Type: `Single`
  - Size Mode: `Custom`
  - Sprite Frame: 拖入 `assets/Arts/mark.png`
  
- **UITransform** 组件：
  - Content Size → Width: `100`
  - Content Size → Height: `100`
  - Anchor → X: `0.5`, Y: `0.5`

- **Position**: `(0, 0, 0)`

#### 5.3 保存为预制体

1. 在 **Hierarchy** 中选中 `Mark` 节点
2. 拖动到 **Assets** → `Prefabs` 文件夹
3. 命名为 `MarkPrefab`
4. 删除场景中的 `Mark` 节点（保留预制体）

---

### 步骤 5.5：创建准心预制体

#### 5.5.1 创建预制体节点

1. 在 Canvas 下右键 → Create → 2D Object → Sprite
2. 命名为 `Crosshair`

#### 5.5.2 配置准心节点

在 **Inspector** 中配置：

- **Sprite** 组件：
  - Type: `Sliced` 或 `Filled`（使用圆形纹理）
  - Size Mode: `Custom`
  - Sprite Frame: 拖入圆形纹理（如果没有，可以使用纯色圆形图片）
  
- **UITransform** 组件：
  - Content Size → Width: `40`
  - Content Size → Height: `40`
  - Anchor → X: `0.5`, Y: `0.5`

- **UIOpacity** 组件：
  - Opacity: `180` (半透明效果)

- **Position**: `(0, 0, 0)`

#### 5.5.3 保存为预制体

1. 在 **Hierarchy** 中选中 `Crosshair` 节点
2. 拖动到 **Assets** → `Prefabs` 文件夹
3. 命名为 `CrosshairPrefab`
4. 删除场景中的 `Crosshair` 节点（保留预制体）

---

### 步骤 6：创建印章节点

#### 6.1 创建节点

1. 在 Canvas 下右键 → Create → 2D Object → Sprite
2. 命名为 `Stamp`

#### 6.2 配置印章节点

在 **Inspector** 中配置：

- **Sprite** 组件：
  - Type: `Single`
  - Size Mode: `Custom`
  - Sprite Frame: 拖入 `assets/Arts/stamp.png`
  
- **UITransform** 组件：
  - Content Size → Width: `150`
  - Content Size → Height: `150`
  - Anchor → X: `0.5`, Y: `0.5`

- **Position**: `(0, 0, 100)` (Z轴设为 100 确保在纸堆上方)

---

### 步骤 7：添加 StampController 组件

1. 选中 `Stamp` 节点
2. 在 **Inspector** 面板底部 → Add Component → Custom Script → `StampController`
3. 配置组件属性：
   - **Paper Stack**: 暂时留空（步骤 9 完成后绑定）
   - **Mark Prefab**: 拖入 `MarkPrefab`（来自步骤 5）
   - **Crosshair Prefab**: 拖入 `CrosshairPrefab`（来自步骤 5.5）
   - **Hover Height**: `175` (默认值，印章悬停高度)
   - **Drop Height**: `0` (默认值，印章下落到纸面)

---

### 步骤 8：创建纸堆容器节点

#### 8.1 创建容器

1. 在 Canvas 下右键 → Create → Create Empty Node
2. 命名为 `PaperStackContainer`

#### 8.2 配置容器

在 **Inspector** 中配置：

- **UITransform** 组件：
  - Content Size → Width: `300`
  - Content Size → Height: `400`
  - Anchor → X: `0.5`, Y: `0.5`

- **Position**: `(-200, 0, 0)` (放在屏幕左侧)

---

### 步骤 9：添加 PaperStack 组件

1. 选中 `PaperStackContainer` 节点
2. 在 **Inspector** 面板底部 → Add Component → Custom Script → `PaperStack`
3. 配置组件属性：
   - **Paper Prefab**: 拖入 `PaperPrefab`（来自步骤 4）
   - **Visible Count**: `6` (默认值)

---

### 步骤 10：绑定组件引用

1. 选中 `Stamp` 节点
2. 在 **Inspector** 中找到 `StampController` 组件
3. 将 **Hierarchy** 中的 `PaperStackContainer` 节点拖入 `Paper Stack` 属性框

---

### 步骤 11：调整场景层级

确保 **Hierarchy** 中的节点顺序如下（从上到下）：

```
Canvas
├── Background (可选)
├── PaperStackContainer
│   ├── Paper (运行时自动生成，共 6 张)
│   └── Mark (运行时自动生成)
└── Stamp
```

---

### 步骤 12：设置游戏启动场景

1. 打开 **File → Build Settings**
2. 在 **Included Scenes** 列表中：
   - 移除其他场景（如果需要）
   - 点击 `+` 添加 `OpeningScene.scene`
3. 确保 `OpeningScene` 列在第一位

---

## 测试流程

### 1. 运行场景

- 点击编辑器顶部的 ▶️ **运行** 按钮
- 或使用快捷键 `Ctrl + P` (Windows) / `Cmd + P` (Mac)

### 2. 预期效果

1. **系统鼠标隐藏**：游戏窗口中看不到系统鼠标指针
2. **印章跟随鼠标**：印章节点实时跟随鼠标位置移动，初始悬停在 175 像素高度
3. **准心显示**：圆形准心跟随鼠标移动，显示在最上层纸张上，静态无动画
4. **纸堆显示**：左侧显示 6 张堆叠的纸张，每张之间有微小错位
5. **盖章动画**：
   - 点击左键时，印章垂直下落到纸面（从 Z=175 到 Z=0）
   - 下落时印章略微缩小到 90%（模拟立体感）
   - 接触纸面时生成印记，准心隐藏
   - 盖章后印章回弹到悬停高度（175 像素）
   - 准心重新显示
6. **纸张飘出动画**：
   - 盖章后的纸张先向上蓄力移动 80 像素（0.2 秒）
   - 然后向下飘出屏幕（0.6 秒）
   - 同时旋转和缩变小
   - 底部自动补充一张新纸，纸堆厚度保持不变

### 3. 验证要点

- [ ] 鼠标指针是否隐藏
- [ ] 印章是否平滑跟随鼠标
- [ ] 印章初始悬停高度是否为 175 像素（Z轴）
- [ ] 准心是否跟随鼠标移动
- [ ] 准心是否显示在最上层纸张上
- [ ] 准心是否为静态（无呼吸动画）
- [ ] 纸堆是否初始生成 6 张纸
- [ ] 点击后印章是否垂直下落（Z轴从 175 到 0）
- [ ] 下落时印章是否缩小到 90%
- [ ] 接触纸面时准心是否隐藏
- [ ] 盖章后印章是否回弹到悬停高度（175 像素）
- [ ] 盖章后准心是否重新显示
- [ ] 印记是否出现在正确的位置（相对纸张局部坐标）
- [ ] 印记是否有随机旋转角度（±7.5 度）
- [ ] 盖章后的纸张是否先向上蓄力（80 像素）
- [ ] 蓄力后纸张是否向下飘出屏幕
- [ ] 飘出的纸张是否被正确销毁
- [ ] 底部是否自动补充新纸
- [ ] 纸堆总厚度是否保持不变

---

## 常见问题排查

### 问题 1：印章不跟随鼠标

**原因**：
- 父节点没有 `UITransform` 组件
- 父节点坐标系统设置错误

**解决方法**：
- 确保 Stamp 的父节点（Canvas）有 `UITransform` 组件
- 检查 Stamp 的 `Position.z` 值是否合理

### 问题 2：点击无反应

**原因**：
- `StampController` 的 `paperStack` 引用未绑定
- 纸堆为空（`PaperStack` 未正确初始化）

**解决方法**：
- 检查 StampController 的 Paper Stack 属性是否已绑定 PaperStackContainer
- 查看控制台是否有错误日志
- 确保 PaperStack 的 Paper Prefab 已正确绑定

### 问题 3：印记位置错误

**原因**：
- 坐标空间转换失败
- 纸张或印记缺少 `UITransform` 组件

**解决方法**：
- 确保 Paper 和 Mark 预制体都有 `UITransform` 组件
- 检查锚点设置是否正确

### 问题 4：纸张不飞出

**原因**：
- `PaperStack.processCurrentPaper()` 未被调用
- Tween 动画系统未正确初始化

**解决方法**：
- 检查控制台日志，确认是否调用成功
- 确认目标位置计算是否正确（`view.getVisibleSize()`）

---

## 进阶配置建议

### 1. 调整印章悬停高度

在 **Inspector** 中修改 `StampController` 组件的 `Hover Height` 属性：

- **100-150 像素**：较低高度，快速盖章节奏
- **150-200 像素**：中等高度，平衡视觉效果（默认 175）
- **200-300 像素**：较高高度，明显下落感

### 2. 调整印章下落缩放效果

在 `StampController.ts:117` 修改缩放参数：

```typescript
scale: new Vec3(0.9, 0.9, 1) // 当前：缩小到 90%
```

建议值：`0.8` - `0.95` 之间

### 3. 调整纸张错位距离

在 `PaperStack.ts:83` 修改 Y 轴偏移：

```typescript
const targetY = i * 2; // 当前：每张纸上移 2 像素
```

建议值：`1` - `5` 之间

### 4. 调整印记随机旋转范围

在 `StampController.ts:183` 修改旋转角度：

```typescript
mark.angle = (Math.random() - 0.5) * 15; // 当前：±7.5 度
```

建议值：`10` - `30` 之间

### 5. 调整纸张蓄力距离

在 `PaperStack.ts:130` 修改蓄力向上移动距离：

```typescript
const chargeDistance = 80; // 当前：向上移动 80 像素
```

建议值：`50` - `120` 之间

### 6. 调整纸张飘出速度

在 `PaperStack.ts:132-141` 修改动画时长：

```typescript
.to(0.2, { ... }, { easing: 'sineOut' })  // 蓄力时长
.to(0.6, { ... }, { easing: 'backOut' })  // 下落时长
```

建议值：
- 蓄力时长：`0.15` - `0.3` 秒
- 下落时长：`0.4` - `0.8` 秒

### 7. 调整准心样式

修改 `CrosshairPrefab` 预制体的属性：

- **尺寸**：调整 UITransform 的 Width/Height（当前 40x40）
- **透明度**：调整 UIOpacity 的 Opacity（当前 180）
- **颜色**：调整 Sprite 组件的 Color 属性

### 8. 调整可见纸张数量

在 **Inspector** 中修改 `PaperStack` 组件的 `Visible Count` 属性：

- 最小值：`3`（保持基本的堆叠感）
- 最大值：`10`（避免性能问题）

---

## 文件依赖清单

### 必需脚本文件

| 文件路径 | 说明 |
|---------|------|
| `assets/Scripts/OpenningScene/StampController.ts` | 印章控制器 |
| `assets/Scripts/OpenningScene/PaperStack.ts` | 纸堆管理器 |

### 必需资源文件

| 文件路径 | 说明 |
|---------|------|
| `assets/Arts/stamp.png` | 印章图片 |
| `assets/Arts/mark.png` | 印章印记图片 |
| `assets/Arts/desktop.png` | 背景图片（可选）|

### 必需预制体

| 文件路径 | 说明 |
|---------|------|
| `assets/Prefabs/PaperPrefab.prefab` | 纸张预制体（需创建）|
| `assets/Prefabs/MarkPrefab.prefab` | 印记预制体（需创建）|
| `assets/Prefabs/CrosshairPrefab.prefab` | 准心预制体（需创建）|

---

## 相关 API 参考

### Cocos Creator 3.x API 文档

- **输入系统**：[Input - Cocos Creator API](https://docs.cocos.com/creator/3.8/api/zh/class/Input)
- **变换系统**：[UITransform - Cocos Creator API](https://docs.cocos.com/creator/3.8/api/zh/class/UITransform)
- **动画系统**：[tween - Cocos Creator API](https://docs.cocos.com/creator/3.8/api/zh/namespace/tween)
- **节点系统**：[Node - Cocos Creator API](https://docs.cocos.com/creator/3.8/api/zh/class/Node)
- **资源管理**：[AssetManager - Cocos Creator API](https://docs.cocos.com/creator/3.8/api/zh/class/AssetManager)

---

## 代码核心逻辑说明

### StampController 核心逻辑

1. **初始化**（第 23-45 行）：
   - 隐藏系统鼠标指针
   - 注册输入事件（MOUSE_MOVE、MOUSE_UP）
   - 实例化准心节点
   - 设置印章初始悬停高度（hoverHeight）

2. **鼠标跟随**（第 51-95 行）：
   - 监听 `Input.EventType.MOUSE_MOVE`
   - 将屏幕坐标转换为 Canvas 局部坐标
   - 使用 `UITransform.convertToNodeSpaceAR()` 进行坐标转换
   - 保持 Z 轴在悬停高度（非盖章状态）
   - 更新准心位置到最上层纸张

3. **准心位置更新**（第 47-62 行）：
   - 获取最上层纸张
   - 将印章世界坐标转换为纸张局部坐标
   - 设置准心为最上层纸张的子节点
   - 无纸堆时隐藏准心

4. **盖章处理**（第 97-145 行）：
   - 监听 `Input.EventType.MOUSE_UP`
   - 使用互斥锁 `_isStamping` 防止重复触发
   - 隐藏准心
   - 播放垂直下落动画（Z 轴从 hoverHeight 到 dropHeight）
   - 下落时缩放到 90%
   - 接触纸面时调用 `onStampContact()`
   - 回弹到悬停高度后显示准心

5. **印记生成**（第 147-199 行）：
   - 实例化 `markPrefab`
   - 使用世界坐标重映射：`Stamp 世界坐标` → `Paper 局部坐标`
   - 添加随机旋转角度
   - 调用 `PaperStack.processCurrentPaper()` 交接控制权

6. **清理**（第 68-85 行）：
   - 停止正在运行的 Tween
   - 销毁准心节点
   - 恢复系统鼠标
   - 注销输入事件

### PaperStack 核心逻辑

1. **初始化**（第 18-35 行）：
   - 生成 `visibleCount` 张纸张
   - 使用 `unshift()` 插入到数组头部（栈底）
   - 设置 `setSiblingIndex(0)` 确保渲染层级正确
   - 刷新所有纸张的视觉布局

2. **视觉布局**（第 78-94 行）：
   - 每张纸的 Y 轴位置 = `index * 2`
   - 栈底纸张添加随机旋转

3. **处理当前纸张**（第 96-141 行）：
   - 从数组尾部弹出最上面的纸张
   - 将印记设为纸张的子节点
   - 立即在底部补充新纸
   - 刷新所有纸张布局
   - 播放向上蓄力动画（80 像素，0.2 秒）
   - 播放向下飘出动画（屏幕外，0.6 秒）
   - 销毁纸张

---

## 总结

完成以上步骤后，您将拥有一个功能完整的开场场景测试环境。该场景包含：

- ✅ 可交互的鼠标跟随印章
- ✅ 圆形准心显示在纸张上
- ✅ 印章垂直下落盖章动画（175 像素高度）
- ✅ 自动管理的纸堆系统
- ✅ 流畅的向上蓄力、向下飘出动画
- ✅ 印记坐标系统转换
- ✅ 纸张自动补充与销毁

如需进一步定制，请参考"进阶配置建议"章节调整参数。
