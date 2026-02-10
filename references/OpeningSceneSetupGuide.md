# 开场场景：纸堆与印章测试指南

本文档介绍如何在 Cocos Creator 3.x 中构建开场场景，测试纸堆盖章系统。

## 组件概述

### 1. StampController (印章控制器)

- **功能**：跟随鼠标移动，点击盖章，检测印记与纸张重叠
- **必需属性**：
  - `paperStack`: 纸堆管理器引用
  - `markPrefab`: 盖章留下的印记预制体
- **可选属性**：
  - `hoverHeight`: 印章悬停高度（Z轴），默认 175
  - `dropHeight`: 印章下落到纸面的高度，默认 0
  - `minOverlapRatio`: 最小重叠比例（0-1），低于此值取消盖章，默认 0.1（10%）

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
  - Sprite Frame: 拖入纸张纹理（如 `assets/Arts/paper.png`）

- **UITransform** 组件：
  
  - Content Size → Width: `858`
  - Content Size → Height: `462`
  - Anchor → X: `0.5`, Y: `0.5`

- **Position**: `(0, 0, 0)`

#### 4.3 添加 Mask 组件

在 **Inspector** 中：

1. 选中 Paper 节点
2. **Add Component** → **2D** → **Mask**
3. 配置 Mask 组件：
   - **Type**: `RECT`
   - **Segments**: `64`（默认）

#### 4.4 保存为预制体

1. 在 **Hierarchy** 中选中 `Paper` 节点
2. 拖动到 **Assets** → `Prefabs` 文件夹
3. 命名为 `PaperPrefab`
4. 删除场景中的 `Paper` 节点（保留预制体）

**预制体结构**：

```
Paper (父节点)
├── UITransform (858x462)
├── Mask (RECT)
└── PaperSprite (子节点)
    ├── UITransform (858x462)
    └── Sprite (纸张纹理)
```

**重要说明**：

- Mask 组件添加在 Paper 父节点上
- Sprite 组件移到 PaperSprite 子节点（避免与 Graphics 冲突，因为 Mask 需要 Graphics）
- Mark 会添加为 Paper 的子节点，自动被 Mask 裁剪
- Paper 父节点的 UITransform 用于碰撞检测，保持不变

**为什么需要重构？**
Cocos Creator 3.x 中，Sprite 和 Graphics 不能同时存在于同一节点。Mask 组件需要 Graphics 来绘制遮罩，因此必须将 Sprite 移到子节点。

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
  
  - Content Size → Width: `400`
  - Content Size → Height: `200`
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
  
  - Content Size → Width: `900`
  - Content Size → Height: `500`
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
3. **纸堆显示**：左侧显示 6 张堆叠的纸张，每张之间有微小错位
4. **盖章动画**：
   - 点击左键时，印章垂直下落到纸面（从 Z=175 到 Z=0）
   - 下落时印章略微缩小到 90%（模拟立体感）
   - 接触纸面时生成印记
   - 盖章后印章回弹到悬停高度（175 像素）
5. **印记重叠检测**：
   - Mark 完全脱离 Paper：不生成印记，印章回弹，纸堆不变
   - Mark 部分在纸上（重叠 ≥ 10%）：生成印记，超出边界的部分被裁剪，纸张飘出
   - Mark 部分在纸上（重叠 < 10%）：不生成印记，印章回弹，纸堆不变
   - Mark 完全在纸上：正常生成印记，纸张飘出
6. **纸张飘出动画**：
   - 盖章后的纸张先向上蓄力移动 80 像素（0.2 秒）
   - 然后向下飘出屏幕（0.6 秒）
   - 同时旋转和缩变小
   - 底部自动补充一张新纸，纸堆厚度保持不变

### 3. 验证要点

- [ ] 鼠标指针是否隐藏
- [ ] 印章是否平滑跟随鼠标
- [ ] 印章初始悬停高度是否为 175 像素（Z轴）
- [ ] 纸堆是否初始生成 6 张纸
- [ ] 点击后印章是否垂直下落（Z轴从 175 到 0）
- [ ] 下落时印章是否缩小到 90%
- [ ] 盖章后印章是否回弹到悬停高度（175 像素）
- [ ] 印记是否出现在正确的位置（相对纸张局部坐标）
- [ ] 印记是否有随机旋转角度（±7.5 度）
- [ ] **Mark 完全脱离 Paper**：是否不生成印记，印章回弹
- [ ] **Mark 完全脱离 Paper**：控制台是否输出取消盖章日志
- [ ] **Mark 完全脱离 Paper**：纸堆是否保持不变
- [ ] **Mark 部分在纸上（≥ 10%）**：是否生成印记
- [ ] **Mark 部分在纸上（≥ 10%）**：超出边界的部分是否被裁剪
- [ ] **Mark 部分在纸上（≥ 10%）**：纸张是否飘出
- [ ] **Mark 部分在纸上（< 10%）**：是否不生成印记
- [ ] **Mark 部分在纸上（< 10%）**：控制台是否输出取消盖章日志
- [ ] **Mark 部分在纸上（< 10%）**：纸堆是否保持不变
- [ ] **Mark 完全在纸上**：是否正常生成印记
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

在 `StampController.ts:205` 修改缩放参数：

```typescript
scale: new Vec3(0.9, 0.9, 1) // 当前：缩小到 90%
```

建议值：`0.8` - `0.95` 之间

### 3. 调整最小重叠比例

在 **Inspector** 中修改 `StampController` 组件的 `Min Overlap Ratio` 属性：

| 范围             | 效果   | 建议场景           |
| -------------- | ---- | -------------- |
| 0.05 (5%)      | 非常宽松 | 容易盖章，适合休闲玩法    |
| 0.1 (10%) - 默认 | 宽松   | 平衡体验           |
| 0.2 (20%)      | 严格   | 需要更精确的对准       |
| 0.5 (50%)      | 非常严格 | 需要大部分 mark 在纸上 |

### 4. 调整纸张错位距离

在 `PaperStack.ts:83` 修改 Y 轴偏移：

```typescript
const targetY = i * 2; // 当前：每张纸上移 2 像素
```

建议值：`1` - `5` 之间

### 5. 调整印记随机旋转范围

在 `StampController.ts:273` 修改旋转角度：

```typescript
mark.angle = (Math.random() - 0.5) * 15; // 当前：±7.5 度
```

建议值：`10` - `30` 之间

### 6. 调整纸张蓄力距离

在 `PaperStack.ts:123` 修改蓄力向上移动距离：

```typescript
const chargeDistance = 80; // 当前：向上移动 80 像素
```

建议值：`50` - `120` 之间

### 7. 调整纸张飘出速度

在 `PaperStack.ts:125-134` 修改动画时长：

```typescript
.to(0.2, { ... }, { easing: 'sineOut' })  // 蓄力时长
.to(0.6, { ... }, { easing: 'backOut' })  // 下落时长
```

建议值：

- 蓄力时长：`0.15` - `0.3` 秒
- 下落时长：`0.4` - `0.8` 秒

### 8. 调整可见纸张数量

在 **Inspector** 中修改 `PaperStack` 组件的 `Visible Count` 属性：

- 最小值：`3`（保持基本的堆叠感）
- 最大值：`10`（避免性能问题）

---

## 文件依赖清单

### 必需脚本文件

| 文件路径                                              | 说明    |
| ------------------------------------------------- | ----- |
| `assets/Scripts/OpenningScene/StampController.ts` | 印章控制器 |
| `assets/Scripts/OpenningScene/PaperStack.ts`      | 纸堆管理器 |

### 必需资源文件

| 文件路径                      | 说明       |
| ------------------------- | -------- |
| `assets/Arts/stamp.png`   | 印章图片     |
| `assets/Arts/mark.png`    | 印章印记图片   |
| `assets/Arts/desktop.png` | 背景图片（可选） |

### 必需预制体

| 文件路径                                    | 说明         |
| --------------------------------------- | ---------- |
| `assets/Prefabs/PaperPrefab.prefab`     | 纸张预制体（需创建） |
| `assets/Prefabs/MarkPrefab.prefab`      | 印记预制体（需创建） |
| `assets/Prefabs/CrosshairPrefab.prefab` | 准心预制体（需创建） |

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

1. **初始化**（第 35-51 行）：
   
   - 隐藏系统鼠标指针
   - 注册输入事件（MOUSE_MOVE、MOUSE_UP）
   - 设置印章初始悬停高度（hoverHeight）

2. **鼠标跟随**（第 133-162 行）：
   
   - 监听 `Input.EventType.MOUSE_MOVE`
   - 将屏幕坐标转换为 Canvas 局部坐标
   - 使用 `UITransform.convertToNodeSpaceAR()` 进行坐标转换
   - 保持 Z 轴在悬停高度（非盖章状态）

3. **盖章处理**（第 167-226 行）：
   
   - 监听 `Input.EventType.MOUSE_UP`
   - 使用互斥锁 `_isStamping` 防止重复触发
   - 播放垂直下落动画（Z 轴从 hoverHeight 到 dropHeight）
   - 下落时缩放到 90%
   - 接触纸面时调用 `onStampContact()`
   - 回弹到悬停高度

4. **印记生成**（第 228-288 行）：
   
   - 实例化 `markPrefab`
   - 使用世界坐标重映射：`Stamp 世界坐标` → `Paper 局部坐标`
   - 添加随机旋转角度
   - **调用 `checkMarkOverlap()` 检测重叠**
   - 重叠不足或完全脱离：销毁 mark，取消盖章
   - 重叠充足：调用 `PaperStack.processCurrentPaper()` 交接控制权

5. **重叠检测**（第 53-114 行）：
   
   - 使用 AABB 近似算法
   - 计算 Mark 和 Paper 的包围盒
   - 考虑 ±7.5° 旋转的扩展（1.7%）
   - 计算重叠面积比例
   - 判断是否 ≥ `minOverlapRatio`（默认 10%）

6. **清理**（第 116-127 行）：
   
   - 停止正在运行的 Tween
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

3. **处理当前纸张**（第 96-148 行）：
   
   - 从数组尾部弹出最上面的纸张
   - 将印记设为 Paper 父节点的子节点（被 Mask 裁剪）
   - **Mask 组件自动裁剪超出 Paper 边界的 Mark**
   - 立即在底部补充新纸
   - 刷新所有纸张布局
   - 播放向上蓄力动画（80 像素，0.2 秒）
   - 播放向下飘出动画（屏幕外，0.6 秒）
   - 销毁纸张

---

## 总结

完成以上步骤后，您将拥有一个功能完整的开场场景测试环境。该场景包含：

- ✅ 可交互的鼠标跟随印章
- ✅ 印章垂直下落盖章动画（175 像素高度）
- ✅ 自动管理的纸堆系统
- ✅ 流畅的向上蓄力、向下飘出动画
- ✅ **Mark 与 Paper 重叠检测**（AABB 近似算法）
- ✅ **完全脱离或重叠不足自动取消盖章**
- ✅ **超出纸张边界的 Mark 自动裁剪**（Mask 组件）
- ✅ **可配置最小重叠比例阈值**（默认 10%）
- ✅ 印记坐标系统转换
- ✅ 纸张自动补充与销毁
- ✅ **Paper 预制体已重构**（Mask + PaperSprite 结构）

如需进一步定制，请参考"进阶配置建议"章节调整参数。
