# ParallaxLayer 视差背景系统指南

本指南介绍如何使用 `ParallaxLayer` 和 `ParallaxBackgroundManager` 组件创建视差滚动背景，支持时间线切换和无限循环滚动。

## 概述

视差背景系统提供以下功能：

- **多层视差滚动**：不同层以不同速度滚动，产生深度感
- **无限循环**：背景自动复制和重定位，适用于任意长度的地图
- **相机对齐**：背景自动与相机可视区域对齐
- **时间线切换**：支持 Past/Future 时间线的背景切换

## 核心概念

### 视差滚动原理

```
相机移动距离: 100px
Far 层滚动距离: 100 * 0.1 = 10px   (慢速，产生远景效果)
Medium 层滚动距离: 100 * 0.3 = 30px (中速)
Close 层滚动距离: 100 * 0.6 = 60px  (快速，产生近景效果)
```

### 无限循环原理

```
初始状态:
[-Bg0-][-Bg1-][-Bg2-]
   [相机]

相机向右移动后:
      [-Bg0-][-Bg1-][-Bg2-]
               [相机]

Bg0 移出左侧后重定位:
             [-Bg1-][-Bg2-][-Bg0-]
                        [相机]
```

### 坐标系

```
        Y+
        ↑
        │   ┌─────────────────┐ ← 可视区域顶部 = camY + orthoHeight
        │   │                 │
        │   │    相机中心     │ ← camY
        │   │                 │
        │   └─────────────────┘ ← 可视区域底部 = camY - orthoHeight
        │
────────┼─────────────────────────→ X+
        │
```

## 文件说明

| 文件 | 路径 | 说明 |
|------|------|------|
| `ParallaxLayer.ts` | `assets/Scripts/GamePlay/ParallaxLayer.ts` | 单层视差背景组件 |
| `ParallaxBackgroundManager.ts` | `assets/Scripts/GamePlay/ParallaxBackgroundManager.ts` | 管理多层背景和时间切换 |

## Hierarchy 构建步骤

### 步骤 1：创建节点层级

在 Cocos Creator Hierarchy 中创建以下结构：

```
Canvas (或场景根节点)
├── ParallaxRoot (空节点)
│   └── ParallaxBackgroundManager (组件)
│       ├── Past_Layers (空节点)
│       │   ├── Past_Far (Sprite + ParallaxLayer)
│       │   ├── Past_Medium (Sprite + ParallaxLayer)
│       │   └── Past_Close (Sprite + ParallaxLayer)
│       └── Future_Layers (空节点)
│           └── Future_full (Sprite + ParallaxLayer)
├── TiledMap 节点
│   └── ... (现有的地图内容)
└── Main Camera
```

### 步骤 2：创建根节点

1. 在 Canvas 下创建空节点，命名为 `ParallaxRoot`
2. 添加 `ParallaxBackgroundManager` 组件

### 步骤 3：创建 Past 时间线背景层

1. 在 `ParallaxRoot` 下创建空节点，命名为 `Past_Layers`
2. 在 `Past_Layers` 下创建 3 个子节点：
   - `Past_Far`（远景）
   - `Past_Medium`（中景）
   - `Past_Close`（近景）

3. 为每个节点添加组件：
   - `UITransform`（设置尺寸为背景图片尺寸，如 1920x1080）
   - `Sprite`（设置对应的 SpriteFrame）
   - `ParallaxLayer`

### 步骤 4：创建 Future 时间线背景层

1. 在 `ParallaxRoot` 下创建空节点，命名为 `Future_Layers`
2. 在 `Future_Layers` 下创建节点 `Future_full`
3. 添加组件同上

### 步骤 5：配置 ParallaxBackgroundManager

选中 `ParallaxRoot` 节点，在 Inspector 中配置：

| 属性 | 值 | 说明 |
|------|-----|------|
| `Past Layers Root` | `Past_Layers` 节点 | Past 时间线背景容器 |
| `Future Layers Root` | `Future_Layers` 节点 | Future 时间线背景容器 |
| `Map Manager` | TiledMap 节点上的 `LevelMapManager` | 用于监听时间切换 |
| `Main Camera` | Main Camera 节点 | 主相机引用 |
| `Auto Assign Camera` | `true` | 自动分配相机到各层 |

### 步骤 6：配置各 ParallaxLayer

为每个背景层配置 `ParallaxLayer` 组件：

#### Past_Far（远景）

| 属性 | 值 |
|------|-----|
| `Camera` | Main Camera（或留空，自动分配） |
| `Scroll Speed` | `0.1` |
| `Infinite Scroll` | `true` |
| `Vertical Alignment` | `BOTTOM` |
| `Horizontal Origin` | `CAMERA_LEFT` |

#### Past_Medium（中景）

| 属性 | 值 |
|------|-----|
| `Scroll Speed` | `0.3` |
| 其他同上 | |

#### Past_Close（近景）

| 属性 | 值 |
|------|-----|
| `Scroll Speed` | `0.6` |
| 其他同上 | |

#### Future_full

| 属性 | 值 |
|------|-----|
| `Scroll Speed` | `0.2` |
| 其他同上 | |

### 步骤 7：设置渲染顺序

确保背景在 TiledMap 后面渲染：

**方法 A：调整节点顺序**
- 在 Hierarchy 中，将 `ParallaxRoot` 放在 `TiledMap` 节点的**上方**

**方法 B：设置 Z 轴**
- 设置 `Past_Layers` 和 `Future_Layers` 的 `Position Z` 为负值（如 `-100`）

### 步骤 8：配置 UITransform

确保每个背景层节点的 `UITransform` 尺寸正确：

| 节点 | Width | Height | Anchor X | Anchor Y |
|------|-------|--------|----------|----------|
| Past_Far | 1920 | 1080 | 0.5 | 0.5 |
| Past_Medium | 1920 | 1080 | 0.5 | 0.5 |
| Past_Close | 1920 | 1080 | 0.5 | 0.5 |
| Future_full | 1920 | 1080 | 0.5 | 0.5 |

> **重要**：锚点必须设置为 `(0.5, 0.5)`，否则对齐计算会出错。

## 组件属性详解

### ParallaxLayer

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `camera` | Camera | null | 主相机引用 |
| `scrollSpeed` | number | 0.5 | 滚动速度比例 (0=静止, 1=与相机同步) |
| `infiniteScroll` | boolean | true | 是否启用无限循环 |
| `verticalAlignment` | enum | BOTTOM | 垂直对齐方式 |
| `horizontalOrigin` | enum | CAMERA_LEFT | 水平起始位置 |

#### VerticalAlignment 枚举

| 值 | 说明 |
|-----|------|
| `BOTTOM` | 背景底部与相机可视区域底部对齐 |
| `CENTER` | 背景中心与相机中心对齐 |
| `TOP` | 背景顶部与相机可视区域顶部对齐 |

#### HorizontalOrigin 枚举

| 值 | 说明 |
|-----|------|
| `CAMERA_LEFT` | 背景从相机左边缘开始 |
| `CAMERA_CENTER` | 背景以相机中心为基准 |
| `MAP_ORIGIN` | 背景从地图原点开始 |

### ParallaxBackgroundManager

| 属性 | 类型 | 说明 |
|------|------|------|
| `pastLayersRoot` | Node | Past 时间线背景容器节点 |
| `futureLayersRoot` | Node | Future 时间线背景容器节点 |
| `mapManager` | LevelMapManager | 关卡地图管理器 |
| `mainCamera` | Camera | 主相机引用 |
| `autoAssignCamera` | boolean | 是否自动分配相机引用 |

## Scroll Speed 推荐值

| 层级 | 推荐值 | 效果 |
|------|--------|------|
| Far（远景） | 0.05 - 0.15 | 移动缓慢，产生深远感 |
| Medium（中景） | 0.25 - 0.4 | 中等速度 |
| Close（近景） | 0.5 - 0.7 | 接近相机速度，产生前景感 |

## 计算公式

### 垂直对齐

```
BOTTOM:
  targetY = camY - orthoHeight + bgHeight/2
  背景底部 = targetY - bgHeight/2 = camY - orthoHeight

CENTER:
  targetY = camY
  背景中心 = camY

TOP:
  targetY = camY + orthoHeight - bgHeight/2
  背景顶部 = targetY + bgHeight/2 = camY + orthoHeight
```

### 水平位置

```
CAMERA_LEFT:
  baseX = camX * scrollSpeed + (orthoWidth - bgWidth/2)

CAMERA_CENTER:
  baseX = camX * scrollSpeed

MAP_ORIGIN:
  baseX = camX * scrollSpeed - bgWidth/2
```

## 常见问题

### Q: 背景没有与相机底部对齐

**原因**：
1. 锚点不是 `(0.5, 0.5)`
2. `VerticalAlignment` 设置错误
3. `UITransform` 尺寸与实际图片尺寸不匹配

**解决**：
1. 检查锚点设置
2. 确认 Inspector 中选择的是 `BOTTOM`
3. 手动设置 `UITransform` 尺寸为图片实际尺寸

### Q: 背景出现闪烁或跳跃

**原因**：背景宽度小于屏幕宽度

**解决**：使用宽度至少为屏幕宽度 2 倍的背景图片

### Q: 时间切换后背景没有变化

**原因**：
1. `ParallaxBackgroundManager` 未绑定 `LevelMapManager`
2. `Past_Layers` 或 `Future_Layers` 节点引用错误

**解决**：检查 Inspector 中的绑定关系

### Q: 背景显示在 TiledMap 前面

**原因**：渲染顺序问题

**解决**：
1. 将 `ParallaxRoot` 移到 Hierarchy 中 `TiledMap` 上方
2. 或设置背景节点的 Z 值为负数

### Q: 控制台显示 "背景尺寸无效"

**原因**：`UITransform` 尺寸为 0

**解决**：
1. 在 Inspector 中手动设置 `UITransform` 的 `Width` 和 `Height`
2. 确保 Sprite 组件正确加载了 SpriteFrame

## 调试技巧

### 查看初始化日志

运行游戏后，控制台会输出初始化信息：

```
[ParallaxLayer] Past_Far 初始化完成:
  - 背景尺寸: 1920x1080
  - orthoHeight: 584.86, orthoWidth: 1039.75
  - verticalOffset: -44.86
  - horizontalStartOffset: 79.75
```

验证数值：
- `verticalOffset` = `-orthoHeight + bgHeight/2`
- 负值表示背景在相机中心下方（BOTTOM 对齐）

### 实时调试

在 `lateUpdate` 中添加临时日志：

```typescript
lateUpdate(_dt: number) {
    // ...
    if (!this._debugPrinted) {
        this._debugPrinted = true;
        console.log(`背景底部Y = ${targetY - this.bgHeight/2}`);
        console.log(`可视区域底部Y = ${camY - this.orthoHeight}`);
    }
}
```

## 示例项目结构

```
assets/
├── Scripts/
│   └── GamePlay/
│       ├── ParallaxLayer.ts
│       ├── ParallaxBackgroundManager.ts
│       ├── LevelMapManager.ts
│       └── TimeTravelManager.ts
├── Arts/
│   └── Bg/
│       ├── Past_Far.png
│       ├── Past_Medium.png
│       ├── Past_Close.png
│       └── Future_full.png
└── scenes/
    └── your-level.scene
```
