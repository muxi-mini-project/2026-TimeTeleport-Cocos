# 收集物系统指南

## 系统概述

本系统提供完整的收集物解决方案，支持多种类型、时间线显示控制、本地存储和关卡进度统计。

### 核心特性

- 多种收集物类型（时间碎片、未来芯片、远古化石、信件）
- 时间线控制（收集物可按 Past/Future/Both 显示）
- 本地存储收集进度
- 完全由 Tiled 地图定义位置和属性
- 与关卡选择界面集成，显示收集进度

## 文件结构

```
Scripts/
├── Core/
│   ├── CollectibleManager.ts      # 收集物管理器（单例）
│   ├── CollectibleData.ts          # 数据接口定义
│   └── CollectibleType.ts          # 类型枚举和 TimeState
├── Objects/
│   └── CollectibleItem.ts          # 收集物组件
├── GamePlay/
│   └── LevelMapManager.ts          # 地图管理器
└── UI/
    ├── LevelSelect.ts              # 关卡选择界面
    └── LevelButton.ts              # 关卡按钮（含 LevelInfo 配置）
```

## 收集物类型

| 类型 | Tiled 值 | 枚举常量 | 说明 |
|------|----------|----------|------|
| 时间碎片 | `time_fragment` 或 `fragment` | `CollectibleType.FRAGMENT` | 时空碎片 |
| 未来芯片 | `future_chip` 或 `chip` | `CollectibleType.CHIP` | 未来科技芯片 |
| 远古化石 | `ancient_fossil` 或 `fossil` | `CollectibleType.FOSSIL` | 远古化石 |
| 信件 | `ccnu_letter` 或 `letter` | `CollectibleType.LETTER` | 特殊信件 |

## 时间状态（TimeState）

收集物可以根据时间线（Past/Future）控制显示/隐藏：

| TimeState | Tiled 值 | 说明 |
|-----------|----------|------|
| Past | `past` | 仅在过去时间线可见 |
| Future | `future` | 仅在未来时间线可见 |
| Both | `both` | 两个时间线都可见（默认） |

## Tiled 配置指南

### 步骤 1：确保 Objects 层存在

在 Tiled 地图中，确保有一个名为 `Objects` 的对象层。

### 步骤 2：添加收集物对象

1. 选择 `Objects` 层
2. 使用 **插入矩形** 工具绘制区域
3. 右键对象 → 对象属性

### 步骤 3：设置对象属性

#### 基础属性

| 属性名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| **name** | String | ✓ | 必须为 `collectible`（小写） | `collectible` |
| **collectibleId** | String | ✓ | 唯一 ID | `Level_1_chip_01` |
| **type** | String | ✓ | 收集物类型 | `future_chip` |
| **timeState** | String | ✗ | 时间状态，默认 `both` | `future` |

#### 完整配置示例

```
对象名称: collectible
位置: (100, 200)
尺寸: 32 x 32

自定义属性:
├─ collectibleId: "Level_1_chip_01"
├─ type: "future_chip"
└─ timeState: "future"
```

### 配置示例

#### 示例 1：仅在特定时间线可见

```
# 未来芯片 - 仅在未来可见
Name: collectible
collectibleId: Level_1_chip_01
type: future_chip
timeState: future

# 远古化石 - 仅在过去可见
Name: collectible
collectibleId: Level_1_fossil_01
type: ancient_fossil
timeState: past
```

#### 示例 2：两个时间线都可见

```
# 时间碎片 - 过去和未来都能看到
Name: collectible
collectibleId: Level_1_fragment_01
type: time_fragment
timeState: both
```

## 关卡配置

在 `LevelSelect.ts` 中配置每个关卡的收集物数量：

```typescript
{
    id: 'Level_1',
    name: '01',
    sceneName: 'scene',
    description: '初次体验时空穿越的奇妙',
    index: 1,
    collectibles: {
        fragment: 1,  // 时间碎片数量
        chip: 1,      // 未来芯片数量
        fossil: 1     // 远古化石数量
    }
}
```

## ID 命名规范

推荐格式：`{关卡ID}_{类型}_{序号}`

| ID | 说明 |
|----|------|
| `Level_1_fragment_01` | Level 1 第 1 个碎片 |
| `Level_1_chip_01` | Level 1 第 1 个芯片 |
| `Level_2_fossil_03` | Level 2 第 3 个化石 |

## API 参考

### CollectibleManager（单例）

```typescript
const manager = CollectibleManager.getInstance();

// 初始化关卡
manager.initialize('Level_1');

// 注册收集物
manager.registerCollectible('Level_1', 'Level_1_chip_01', CollectibleType.CHIP);

// 收集物品
manager.collectItem({
    collectibleId: 'Level_1_chip_01',
    type: CollectibleType.CHIP
});

// 检查是否已收集
const isCollected = manager.isCollected('Level_1_chip_01');

// 获取关卡收集统计
const total = manager.getLevelCollectibleCount('Level_1');
const collected = manager.getLevelCollectedCount('Level_1');
const rate = manager.getLevelCollectionRate('Level_1');

// 获取全局统计
const globalTotal = manager.getTotalCollectibleCount();
const globalCollected = manager.getTotalCollectedCount();
```

### CollectibleItem 组件

| 属性 | 类型 | 说明 |
|------|------|------|
| `collectibleId` | string | 唯一 ID |
| `collectibleType` | CollectibleType | 收集物类型 |
| `timeState` | TimeState | 时间状态 |
| `icon` | SpriteFrame | 图标（可选） |
| `destroyOnCollect` | boolean | 收集后是否销毁 |
| `isCollected` | boolean | 是否已收集 |

```typescript
// 手动收集
collectibleItem.collect();

// 更新可见性
collectibleItem.updateVisibilityByTimeState(TimeState.Future);
```

## 数据存储

收集数据存储在 `localStorage`，键名为 `CollectibleData`：

```json
{
  "version": "1.0.0",
  "lastUpdated": 1706102400000,
  "levels": {
    "Level_1": {
      "levelId": "Level_1",
      "totalCollectibles": 3,
      "collectedCount": 2,
      "collectedIds": ["Level_1_fragment_01", "Level_1_chip_01"]
    }
  },
  "totals": {
    "totalLevels": 1,
    "totalCollectibles": 3,
    "totalCollected": 2
  }
}
```

## 调试

### 控制台日志

```
[Collectible] 生成收集物: Level_1_chip_01, 类型: future_chip, 时间状态: future, 位置: (100.0, 200.0)
[CollectibleItem] Collected Level_1_chip_01, type: future_chip
```

### 常见问题

**Q: 收集物没有生成？**
- 检查对象 name 是否为 `collectible`（小写）
- 检查 `collectibleId` 是否已设置
- 检查预制体是否正确绑定到 `LevelMapManager`

**Q: 收集物不显示？**
- 检查 `timeState` 是否与当前时间线匹配
- 检查是否已收集过（会被隐藏）

**Q: 玩家触碰没有反应？**
- 检查 Collider2D 是否勾选 Sensor
- 检查玩家节点名称是否以 `Player` 开头

## 扩展开发

### 添加新的收集物类型

1. 更新 `CollectibleType.ts`：

```typescript
export enum CollectibleType {
    FRAGMENT = 'time_fragment',
    CHIP = 'future_chip',
    FOSSIL = 'ancient_fossil',
    LETTER = 'ccnu_letter',
    NEW_TYPE = 'new_type'  // 新增
}

export const COLLECTIBLE_ICON_PATHS: Record<CollectibleType, string> = {
    // ...
    [CollectibleType.NEW_TYPE]: 'textures/collectibles/new_type'
};
```

2. 更新 `LevelMapManager.ts` 的 `parseCollectibleType`：

```typescript
case 'new_type':
    return CollectibleType.NEW_TYPE;
```

3. 在 Tiled 中使用：`type: new_type`

## 更新历史

### v2.0.0 (2026-03)

- 移除 FragmentSpawner 动态生成，改用 Tiled 完全定义
- 新增 TimeState 属性，支持时间线显示控制
- 移除过时的预制体属性（timeFragmentPrefab 等）
- 简化数据结构，减少存储空间

### v1.0.0

- 初始版本
- 基础收集物系统
