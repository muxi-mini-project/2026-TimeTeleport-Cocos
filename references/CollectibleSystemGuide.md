# 可收集元素系统使用指南

## 系统概述

本系统提供了完整的可收集元素解决方案，支持多种收集物类型、本地存储、收集率统计和云端同步准备。

### 核心功能

- ✅ 多种收集物类型支持（金币、宝石、星星、碎片等）
- ✅ 唯一编号系统，便于识别和管理
- ✅ 自动生成和注册收集物
- ✅ 本地存储收集进度
- ✅ 收集率统计和查询
- ✅ 云端同步数据接口
- ✅ 与 Tiled 地图编辑器无缝集成

## 文件结构

```
Scripts/
├── Core/
│   ├── CollectibleManager.ts      # 收集物管理器（单例）
│   ├── CollectibleData.ts          # 数据接口定义
│   └── CollectibleType.ts          # 类型枚举定义
├── Objects/
│   └── CollectibleItem.ts          # 收集物组件
└── GamePlay/
    └── LevelMapManager.ts          # 地图管理器（已更新）
```

## 快速开始

### 步骤 1: 创建 CollectibleItem 预制体

1. 在 Cocos Creator 编辑器中，创建一个新节点
2. 添加 **Sprite** 组件（用于显示收集物图标）
3. 添加 **BoxCollider2D** 组件
   - 勾选 **Sensor** 选项（重要！）
   - 设置合适的碰撞体尺寸
4. 添加 **CollectibleItem** 脚本组件
5. 保存为 Prefab（例如：`CollectibleItem.prefab`）

### 步骤 2: 配置 LevelMapManager

1. 找到场景中挂载 `LevelMapManager` 组件的节点
2. 在 Inspector 面板中找到 `Collectible Prefab` 属性
3. 将刚才创建的 `CollectibleItem.prefab` 拖入该字段

### 步骤 3: 在 Tiled 中添加收集物

1. 打开你的 Tiled 地图文件
2. 在 **Objects** 图层中添加对象
3. 设置对象属性：
   - **Name**: `collectible`（必须）
   - **Type**: （可选，不填也行）
   - **Custom Properties**:
     - `collectibleId`: 唯一编号（如 `L1_C001`）
     - `type`: 收集物类型（如 `coin`, `gem`, `star` 等）
     - `iconPath`: 图标资源路径（可选，如 `textures/collectibles/special_coin`）

#### 收集物类型列表

| 类型值        | 说明    | 枚举常量                       |
| ---------- | ----- | -------------------------- |
| `coin`     | 金币    | `CollectibleType.COIN`     |
| `gem`      | 宝石    | `CollectibleType.GEM`      |
| `star`     | 星星    | `CollectibleType.STAR`     |
| `heart`    | 爱心/生命 | `CollectibleType.HEART`    |
| `key`      | 钥匙    | `CollectibleType.KEY`      |
| `fragment` | 碎片    | `CollectibleType.FRAGMENT` |
| `relic`    | 遗物    | `CollectibleType.RELIC`    |
| `custom`   | 自定义   | `CollectibleType.CUSTOM`   |

#### Tiled 对象配置示例

```
对象名称: collectible
对象位置: (x: 100, y: 200)
尺寸: (宽: 32, 高: 32)
Custom Properties:
  - collectibleId: L1_C001
  - type: coin
```

#### 自定义图标配置示例

**使用自定义图标**：

```
对象名称: collectible
对象位置: (x: 200, y: 200)
尺寸: (宽: 32, 高: 32)
Custom Properties:
  - collectibleId: L1_C002
  - type: coin
  - iconPath: textures/collectibles/special_gold_coin
```

**使用默认图标（不设置 iconPath）**：

```
对象名称: collectible
对象位置: (x: 300, y: 200)
尺寸: (宽: 32, 高: 32)
Custom Properties:
  - collectibleId: L1_C003
  - type: gem
```

### 图标系统详解

#### 1. 图标加载优先级

CollectibleItem 按以下优先级加载图标：

1. **手动设置的 icon**（最高优先级）
   
   - 在 Inspector 中手动指定 SpriteFrame
   - 适用于需要精确控制的收集物

2. **Tiled 中的 iconPath 属性**
   
   - 从 Tiled 对象属性读取
   - 适用于需要在 Tiled 中配置特定图标的收集物
   - 例如：特殊收集物、关卡专属图标等

3. **类型默认图标**
   
   - 根据收集物类型自动加载
   - 使用 `COLLECTIBLE_ICON_PATHS` 映射的默认路径
   - 适用于大多数普通收集物

#### 2. 默认图标路径映射

```typescript
export const COLLECTIBLE_ICON_PATHS: Record<CollectibleType, string> = {
    [CollectibleType.COIN]: 'textures/collectibles/coin',
    [CollectibleType.GEM]: 'textures/collectibles/gem',
    [CollectibleType.STAR]: 'textures/collectibles/star',
    [CollectibleType.HEART]: 'textures/collectibles/heart',
    [CollectibleType.KEY]: 'textures/collectibles/key',
    [CollectibleType.FRAGMENT]: 'textures/collectibles/fragment',
    [CollectibleType.RELIC]: 'textures/collectibles/relic',
    [CollectibleType.CUSTOM]: 'textures/collectibles/custom'
};
```

#### 3. CollectibleItem 属性

| 属性                   | 说明                   | 默认值      |
| -------------------- | -------------------- | -------- |
| `Collectible Id`     | 收集物唯一 ID             | 空        |
| `Collectible Type`   | 收集物类型                | FRAGMENT |
| `Icon`               | 图标 SpriteFrame（手动设置） | null     |
| `Auto Load Icon`     | 是否自动加载图标             | true     |
| `Destroy On Collect` | 拾取后是否销毁              | true     |

#### 4. 图标资源准备

**方式一：使用单张图片**

```
resources/
└── textures/
    └── collectibles/
        ├── coin.png
        ├── gem.png
        ├── star.png
        └── ...
```

**方式二：使用 SpriteAtlas（推荐）**

```
resources/
└── textures/
    └── collectibles/
        └── collectibles.plist  # SpriteAtlas 配置文件
        └── collectibles.png   # 大图集
```

**配置 SpriteAtlas**：

1. 在 Cocos Creator 中导入图片
2. 右键点击图片 → Create → Sprite Atlas
3. 自动生成 `.plist` 和 `.png` 文件
4. 图标路径格式：`textures/collectibles/coin`

### 步骤 4: 运行游戏

1. 在 Cocos Creator 中运行场景
2. 游戏启动时，LevelMapManager 会自动：
   - 初始化 CollectibleManager
   - 从 Tiled 地图中读取收集物配置
   - 生成 CollectibleItem 预制体
   - 注册收集物到管理器
3. 玩家触碰收集物时会自动收集

## 收集物编号规范

建议使用以下命名格式：`{关卡ID}_{类型简写}_{序号}`

### 编号示例

| 编号        | 关卡      | 类型       | 说明       |
| --------- | ------- | -------- | -------- |
| `L1_C001` | Level 1 | Coin     | 第1关第1个金币 |
| `L1_G001` | Level 1 | Gem      | 第1关第1个宝石 |
| `L1_G002` | Level 1 | Gem      | 第1关第2个宝石 |
| `L2_F001` | Level 2 | Fragment | 第2关第1个碎片 |
| `L3_K001` | Level 3 | Key      | 第3关第1把钥匙 |

### 编号类型简写对照表

| 类型       | 简写  | 完整英文     |
| -------- | --- | -------- |
| Coin     | `C` | Coin     |
| Gem      | `G` | Gem      |
| Star     | `S` | Star     |
| Heart    | `H` | Heart    |
| Key      | `K` | Key      |
| Fragment | `F` | Fragment |
| Relic    | `R` | Relic    |

## API 使用指南

### CollectibleManager（单例）

#### 初始化管理器

```typescript
import { CollectibleManager } from './Core/CollectibleManager';

// 初始化管理器（通常在关卡加载时调用）
const manager = CollectibleManager.getInstance();
manager.initialize('Level1');
```

#### 检查收集物状态

```typescript
// 检查当前关卡某个收集物是否已收集
const isCollected = manager.isCollected('L1_C001');

// 检查指定关卡某个收集物是否已收集
const isCollected = manager.isCollectedInLevel('Level1', 'L1_C001');
```

#### 获取收集统计信息

```typescript
// 获取当前关卡收集物总数
const totalCount = manager.getLevelCollectibleCount('Level1');

// 获取当前关卡已收集数量
const collectedCount = manager.getLevelCollectedCount('Level1');

// 获取当前关卡收集率（百分比）
const rate = manager.getLevelCollectionRate('Level1');

// 获取全局收集物总数
const globalTotal = manager.getTotalCollectibleCount();

// 获取全局已收集数量
const globalCollected = manager.getTotalCollectedCount();

// 获取全局收集率
const globalRate = manager.getTotalCollectionRate();
```

#### 按类型统计收集数量

```typescript
// 获取指定关卡中已收集的某类型收集物数量
const coinCount = manager.getCollectedByType('Level1', CollectibleType.COIN);
const gemCount = manager.getCollectedByType('Level1', CollectibleType.GEM);
```

#### 重置收集数据

```typescript
// 重置所有关卡收集数据（慎用！）
manager.resetAllData();

// 重置指定关卡收集数据
manager.resetLevelData('Level1');
```

#### 云端同步

```typescript
// 导出数据用于云端同步
const cloudData = manager.exportForCloudSync('player123');
if (cloudData) {
    // 发送到云端服务器
    // ...
}

// 从云端同步数据
const cloudData = fetchFromCloud(); // 从云端获取数据
const success = manager.importFromCloudSync(cloudData);
if (success) {
    console.log('云端同步成功');
}
```

#### 调试功能

```typescript
// 打印所有收集数据（用于调试）
manager.debugPrintAllData();

// 获取全局数据对象
const globalData = manager.getGlobalData();

// 获取指定关卡数据对象
const levelData = manager.getLevelData('Level1');
```

### CollectibleItem（组件）

#### 脚本组件配置

在 Inspector 面板中，CollectibleItem 组件有以下可配置属性：

| 属性                   | 类型          | 说明      | 默认值   |
| -------------------- | ----------- | ------- | ----- |
| `Collectible Id`     | string      | 收集物唯一编号 | 空     |
| `Collectible Type`   | enum        | 收集物类型   | COIN  |
| `Icon`               | SpriteFrame | 收集物图标   | null  |
| `Destroy On Collect` | boolean     | 拾取后是否销毁 | true  |
| `Is Collected`       | boolean     | 是否已被收集  | false |
| `Value`              | number      | 收集物价值   | 1     |

#### 手动收集

```typescript
import { CollectibleItem } from './Objects/CollectibleItem';

// 获取 CollectibleItem 组件
const collectibleItem = node.getComponent(CollectibleItem);

// 手动触发收集
collectibleItem.collect();
```

#### 监听收集事件

```typescript
// 监听收集事件
collectibleItem.node.on('collectible-collected', (data) => {
    console.log('收集物被收集:', data);
    // data 包含：
    // - collectibleId: string
    // - type: CollectibleType
    // - value: number
}, this);

// 移除监听
collectibleItem.node.off('collectible-collected', callback, this);
```

## 高级使用

### 自定义收集物外观

#### 方法 1: 使用不同的 SpriteFrame

在 CollectibleItem 预制体的 Sprite 组件中：

- 为不同的收集物类型设置不同的 SpriteFrame
- 可以在运行时动态切换：
  
  ```typescript
  const collectibleItem = node.getComponent(CollectibleItem);
  const sprite = node.getComponent(Sprite);
  sprite.spriteFrame = collectibleItem.icon;
  ```

#### 方法 2: 使用多个预制体

为每种收集物类型创建独立的预制体：

- `CoinItem.prefab`
- `GemItem.prefab`
- `StarItem.prefab`

在 LevelMapManager 的 `spawnPrefbs` 方法中扩展：

```typescript
case "collectible_coin":
    targetPrefab = this.coinItemPrefab;
    break;
case "collectible_gem":
    targetPrefab = this.gemItemPrefab;
    break;
```

### 添加收集动画

1. 在 CollectibleItem 预制体中添加 Animation 组件
2. 创建收集动画（如淡出、缩小、旋转等）
3. 修改 `CollectibleItem.ts` 中的 `onCollected` 方法：

```typescript
protected onCollected(): void {
    console.log(`[CollectibleItem] 收集物 ${this.collectibleId} 已收集，类型: ${this.collectibleType}`);

    const animation = this.node.getComponent(Animation);
    if (animation) {
        animation.play('collected');
    }
}
```

### 添加收集音效

1. 在 CollectibleItem 预制体中添加 AudioSource 组件
2. 拖入收集音效资源
3. 修改 `onCollected` 方法：

```typescript
protected onCollected(): void {
    console.log(`[CollectibleItem] 收集物 ${this.collectibleId} 已收集，类型: ${this.collectibleType}`);

    const audioSource = this.node.getComponent(AudioSource);
    if (audioSource && audioSource.clip) {
        audioSource.play();
    }
}
```

### 与 UI 系统集成

#### 在 UI 中显示收集进度

```typescript
import { CollectibleManager } from './Core/CollectibleManager';

// 在 UI 脚本中更新显示
updateCollectibleDisplay() {
    const manager = CollectibleManager.getInstance();
    const levelId = 'Level1';

    const total = manager.getLevelCollectibleCount(levelId);
    const collected = manager.getLevelCollectedCount(levelId);
    const rate = manager.getLevelCollectionRate(levelId);

    // 更新 UI 文本
    this.coinLabel.string = `${collected}/${total}`;
    this.progressLabel.string = `${rate.toFixed(0)}%`;
    this.progressBar.progress = rate / 100;
}
```

#### 监听收集事件更新 UI

```typescript
// 在收集物生成时监听事件
collectibleItem.node.on('collectible-collected', (data) => {
    this.updateCollectibleDisplay();
    // 播放收集特效
    this.playCollectEffect(data.type);
}, this);
```

### 时间旅行系统集成

如果你的游戏有时间旅行机制（如本项目的过去/未来系统），可以让收集物在不同时间线显示不同状态：

```typescript
// 在 CollectibleItem 组件中添加时间状态监听
import { LevelMapManager } from '../GamePlay/LevelMapManager';

start() {
    const mapManager = this.node.getComponentInParent(LevelMapManager);
    if (mapManager) {
        mapManager.registerTimeListener((state) => {
            this.onTimeStateChanged(state);
        });
    }
}

private onTimeStateChanged(state) {
    // 根据时间状态调整收集物显示
    if (state === TimeState.Past) {
        this.node.active = true; // 过去可以看到
    } else {
        this.node.active = false; // 未来不可见
    }
}
```

## 本地存储说明

### 存储结构

收集数据存储在浏览器的 `localStorage` 中，键名为 `CollectibleData`。

### 数据格式

```typescript
{
  "version": "1.0.0",
  "lastUpdated": 1706102400000,
  "totals": {
    "totalLevels": 2,
    "totalCollectibles": 50,
    "totalCollected": 30
  },
  "levels": [
    [
      "Level1",
      {
        "levelId": "Level1",
        "levelName": "Level1",
        "totalCollectibles": 25,
        "collectedCount": 15,
        "collectibles": [
          [
            "L1_C001",
            {
              "collectibleId": "L1_C001",
              "type": "coin",
              "levelId": "Level1",
              "instanceId": "xxx",
              "position": {"x": 100, "y": 200, "z": 0},
              "isCollected": true,
              "timestamp": 1706102400000
            }
          ]
        ]
      }
    ]
  ]
}
```

### 清除存储

```typescript
// 方法 1: 使用 API
CollectibleManager.getInstance().resetAllData();

// 方法 2: 清除浏览器 localStorage
localStorage.removeItem('CollectibleData');
```

## 云端同步接口

### 数据导出

```typescript
const manager = CollectibleManager.getInstance();
const cloudData = manager.exportForCloudSync('player_123');

// cloudData 结构
{
  playerId: "player_123",
  globalData: { /* 全局收集数据 */ },
  checksum: "abc123",  // 数据校验和
  lastSyncTime: 1706102400000
}
```

### 数据导入

```typescript
const cloudData = {
  playerId: "player_123",
  globalData: { /* 从云端获取的数据 */ },
  checksum: "abc123",
  lastSyncTime: 1706102400000
};

const success = manager.importFromCloudSync(cloudData);
if (success) {
    console.log('云端同步成功');
}
```

## 常见问题

### Q: 收集物生成后，之前已收集的收集物没有消失？

**A:** 确保 CollectibleItem 预制体上的 CollectibleItem 组件已经正确配置。检查控制台是否有 `[CollectibleItem] 收集物 xxx 已被收集，隐藏节点` 的日志。

### Q: 玩家触碰收集物没有反应？

**A:** 检查以下几点：

1. CollectibleItem 预制体上的 BoxCollider2D 是否勾选了 **Sensor** 选项
2. 玩家节点是否命名为 `Player`（首字母大写）
3. 玩家是否添加了 Collider2D 组件
4. 查看控制台是否有错误日志

### Q: 收集物编号重复怎么办？

**A:** 如果 Tiled 中的 `collectibleId` 为空，系统会自动生成唯一编号。如果需要手动指定，请确保编号在全局范围内唯一。

### Q: 如何重置某个关卡的收集进度？

**A:** 使用以下代码：

```typescript
CollectibleManager.getInstance().resetLevelData('Level1');
```

### Q: 如何在关卡加载时重新注册所有收集物？

**A:** LevelMapManager 在 `start()` 方法中会自动初始化 CollectibleManager 并注册收集物。如果需要手动注册，可以调用：

```typescript
const manager = CollectibleManager.getInstance();
manager.registerCollectible('Level1', 'L1_C001', CollectibleType.COIN);
```

### Q: 云端同步数据校验失败怎么办？

**A:** 检查以下几点：

1. 云端数据是否完整
2. 校验和是否正确
3. 数据版本是否匹配

如果校验一直失败，可以在 `importFromCloudSync` 方法中暂时移除校验逻辑。

## 性能优化建议

1. **对象池**: 如果有大量收集物，建议使用对象池来管理 CollectibleItem 实例
2. **延迟加载**: 对于大型地图，可以只在玩家附近加载收集物
3. **批量操作**: 避免在每一帧都查询收集状态，可以缓存结果
4. **定期清理**: 定期清理已完成的关卡数据

## 扩展开发

### 添加新的收集物类型

1. 修改 `CollectibleType.ts`，在枚举中添加新类型：

```typescript
export enum CollectibleType {
    // ... 现有类型
    NEW_ITEM = 'new_item'  // 新增类型
}
```

2. 在 `LevelMapManager.ts` 的 `parseCollectibleType` 方法中添加解析逻辑：

```typescript
case 'new_item':
    return CollectibleType.NEW_ITEM;
```

3. 在 Tiled 中使用新类型：设置 `type` 属性为 `new_item`

### 自定义收集物行为

继承 `CollectibleItem` 类并重写方法：

```typescript
import { CollectibleItem } from './Objects/CollectibleItem';

@ccclass('CustomCollectibleItem')
export class CustomCollectibleItem extends CollectibleItem {
    protected onCollected(): void {
        super.onCollected();
        // 添加自定义逻辑
        console.log('自定义收集物被收集！');
    }

    protected onAlreadyCollected(): void {
        // 自定义已收集行为
        this.node.scale = new Vec3(0.5, 0.5, 1);
    }
}
```

## 总结

本收集物系统提供了完整的解决方案，从 Tiled 编辑器配置到云端同步，涵盖游戏开发的所有阶段。按照本指南操作，你可以快速搭建出功能完善的收集物系统。

如有任何问题或建议，欢迎反馈！
