# 临时收集物系统完整实施总结

## ✅ 已实现的所有功能

### 一、CollectibleItem 图标系统

#### 功能特性
✅ **三层图标加载优先级**
   - 优先级 1: 手动设置的 icon (Inspector)
   - 优先级 2: Tiled 中的 iconPath 属性
   - 优先级 3: 根据类型的默认图标

✅ **Tiled 集成**
   - 支持通过 iconPath 属性配置自定义图标
   - 支持使用默认图标
   - 完整的资源路径映射系统

#### 修改的文件
| 文件 | 主要修改 |
|------|---------|
| `CollectibleItem.ts` | 添加图标加载功能，支持三层优先级 |
| `CollectibleType.ts` | 扩展枚举值，添加 COLLECTIBLE_ICON_PATHS 映射 |
| `LevelMapManager.ts` | 从 Tiled 读取 iconPath 属性并传递 |

---

### 二、TempCollectibleItem - 临时消失的收集物

#### 功能特性
✅ **自动消失机制**
   - 倒计时管理
   - 闪烁提示即将消失
   - 平滑的 Tween 动画

✅ **动画系统**
   - 收集时：缩小 + 旋转 + 消失
   - 消失时：缩小 + 淡出 + 旋转
   - 动画完成后销毁节点

✅ **灵活配置**
   - 可配置存在时间
   - 可配置动画时长
   - 可配置是否可收集
   - 可配置闪烁行为

✅ **图标系统**
   - 支持三层图标加载优先级
   - 与 CollectibleItem 共享图标系统

#### 新增文件

| 文件 | 行数 | 功能 |
|------|------|------|
| `TempCollectibleItem.ts` | ~300 行 | 临时收集物完整实现 |
| `TempCollectibleItemGuide.md` | ~200 行 | 完整使用指南 |
| `TempCollectibleItemQuickReference.md` | ~80 行 | 快速参考 |

#### 关键属性

```typescript
// 生命周期
Life Time: number = 5.0           // 存在时间（秒）
Disappear Duration: number = 0.5    // 消失动画时长（秒）

// 行为控制
Can Collect: boolean = true         // 是否可以被玩家收集

// 闪烁提示
Blink Before Disappear: boolean = true    // 是否闪烁提示
Blink Start Time: number = 2.0        // 闪烁开始时间
Blink Interval: number = 0.2         // 闪烁间隔

// 动画
Final Scale: number = 0             // 最终缩放比例（0 = 完全消失）
```

---

## 📝 文件清单

### 新建文件

| 文件 | 说明 |
|------|------|
| `Scripts/Objects/TempCollectibleItem.ts` | 临时收集物组件 |
| `TempCollectibleItemGuide.md` | 完整使用指南 |
| `TempCollectibleItemQuickReference.md` | 快速参考 |
| `TempCollectibleItemImplementationSummary.md` | 实施总结 |

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `Scripts/Core/CollectibleType.ts` | 扩展枚举，添加图标路径映射 |
| `Scripts/Objects/CollectibleItem.ts` | 添加三层图标加载系统 |
| `Scripts/GamePlay/LevelMapManager.ts` | 支持读取 iconPath 属性 |

### 更新文件

| 文件 | 更新内容 |
|------|---------|
| `CollectibleSystemGuide.md` | 添加 iconPath 属性说明 |

---

## 🎯 使用场景

### 场景一：限时奖励收集物

**需求**：关卡中生成一个限时 10 秒的宝石，玩家在 10 秒内收集则获得额外奖励

**Tiled 配置**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_T_BONUS_001
  - type: gem
  - lifeTime: 10.0
  - blinkBeforeDisappear: true
  - blinkStartTime: 3.0
```

**代码示例**：
```typescript
// 监听收集事件
this.node.on('collectible-collected', (data) => {
    if (data.collectibleId === 'L1_T_BONUS_001') {
        console.log('获得限时奖励！');
        this.playBonusEffect();
    }
}, this);
```

**效果**：
- 宝石存在 10 秒
- 最后 3 秒开始闪烁
- 玩家收集：播放动画消失
- 未收集：10 秒后自动消失

### 场景二：无敌道具（限时）

**需求**：玩家触碰后获得 5 秒无敌，5 秒后自动消失

**Tiled 配置**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_SHIELD_001
  - type: heart
  - lifeTime: 5.0
  - canCollect: true
  - iconPath: textures/collectibles/shield_icon
```

**代码示例**：
```typescript
// 监听收集事件
this.node.on('collectible-collected', (data) => {
    if (data.collectibleId === 'L1_SHIELD_001') {
        // 给玩家 5 秒无敌
        this.addShield(5.0);
        console.log('获得 5 秒无敌');
    }
}, this);
```

**效果**：
- 心形图标存在 5 秒
- 玩家触碰获得无敌
- 5 秒后自动消失
- 可以多次生成

### 场景三：任务道具

**需求**：关卡中有 3 个任务道具，收集后自动消失，无需永久记录

**Tiled 配置**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_Q001
  - type: coin
  - lifeTime: 60.0
  - canCollect: true
```

**代码示例**：
```typescript
// 任务管理
let questCollected = 0;

this.node.on('collectible-collected', (data) => {
    if (data.collectibleId.startsWith('L1_Q')) {
        questCollected++;
        console.log(`任务进度: ${questCollected}/3`);

        if (questCollected >= 3) {
            console.log('任务完成！');
            this.completeQuest();
        }
    }
}, this);
```

**效果**：
- 道具存在 60 秒
- 玩家收集后立即消失
- 不记录到 CollectibleManager
- 3 个全部收集后任务完成

### 场景四：随机生成的临时收集物

**代码示例**：
```typescript
spawnRandomTempCollectibles() {
    const positions = [
        { x: 100, y: 200 },
        { x: 300, y: 400 },
        { x: 500, y: 600 }
    ];

    const tempTypes = [
        CollectibleType.GEM,
        CollectibleType.STAR,
        CollectibleType.RELIC
    ];

    positions.forEach((pos, index) => {
        const collectible = instantiate(this.tempCollectiblePrefab);
        this.node.addChild(collectible);

        const tempCollectible = collectible.getComponent(TempCollectibleItem);
        if (tempCollectible) {
            tempCollectible.collectibleId = `L1_R_${Date.now()}_${index}`;
            tempCollectible.collectibleType = tempTypes[Math.floor(Math.random() * tempTypes.length)];
            tempCollectible.lifeTime = 8.0;
            tempCollectible.blinkBeforeDisappear = true;
            collectible.setPosition(pos.x, pos.y, 0);
        }
    });
}
```

---

## 🔧 API 参考

### TempCollectibleItem 公共方法

```typescript
// 查询方法
getRemainingLifeTime(): number        // 获取剩余时间
getLifeProgress(): number           // 获取生命进度（0-1）

// 控制方法
forceDisappear(): void              // 强制立即消失
setIconPath(path: string): void       // 设置图标路径

// 事件监听
this.node.on('collectible-collected', (data) => {
    console.log('收集物 ID:', data.collectibleId);
    console.log('收集物类型:', data.type);
}, this);
```

---

## 📊 CollectibleItem vs TempCollectibleItem

| 特性 | CollectibleItem | TempCollectibleItem |
|------|-----------------|---------------------|
| 永久存储 | ✅ 是 | ❌ 否 |
| 收集进度统计 | ✅ 支持 | ❌ 不支持 |
| 存在时间限制 | ❌ 无 | ✅ 支持 |
| 自动消失 | ❌ 无 | ✅ 支持 |
| 闪烁提示 | ❌ 无 | ✅ 支持 |
| 缩小动画 | ❌ 无 | ✅ 支持 |
| 淡出效果 | ❌ 无 | ✅ 支持 |
| 旋转动画 | ❌ 无 | ✅ 支持 |
| 是否可收集 | ✅ 总是可 | ✅ 可配置 |
| 适用场景 | 永久收集物 | 临时道具、限时奖励 |

---

## 📋 文件结构

```
Scripts/
├── Core/
│   ├── CollectibleType.ts          # 扩展的枚举 + 图标路径映射
│   ├── CollectibleData.ts            # 数据接口
│   └── CollectibleManager.ts          # 收集物管理器
├── Objects/
│   ├── CollectibleItem.ts           # 永久收集物（图标系统）
│   └── TempCollectibleItem.ts       # 临时收集物（新增）
└── GamePlay/
    └── LevelMapManager.ts            # 支持读取 iconPath
```

```
项目根目录/
├── CollectibleSystemGuide.md      # 收集物系统使用指南
├── CollectibleIconSystemGuide.md  # 图标系统说明
└── TempCollectibleItem...
    ├── Guide.md              # 临时收集物使用指南
    ├── QuickReference.md      # 快速参考
    └── ImplementationSummary.md # 实施总结（本文档）
```

---

## 🚀 快速开始

### 创建 TempCollectibleItem Prefab

1. 创建新节点 `TempCollectibleItem`
2. 添加 Sprite 组件
3. 添加 BoxCollider2D（勾选 Sensor）
4. 添加 TempCollectibleItem 脚本
5. 配置属性：
   - `Collectible Type` = GEM
   - `Life Time` = 5.0
   - `Disappear Duration` = 0.5
6. 保存为 Prefab

### Tiled 配置

**普通临时收集物**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_T001
  - type: gem
```

**自定义图标**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_T002
  - type: coin
  - iconPath: textures/collectibles/special_coin
```

---

## 🎨 动画效果

### 收集动画（玩家触碰）

```
效果: 缩小 + 旋转 + 消失
时长: 0.5 秒（可配置）
缩放: 从 1.0 缩小到 0
旋转: 旋转 360 度
结果: 动画完成后销毁节点
```

### 消失动画（时间到期）

```
效果: 缩小 + 淡出
时长: 0.5 秒（可配置）
缩放: 从 1.0 缩小到 0
不透明度: 从 1.0 淡出到 0
旋转: 旋转 360 度
碰撞体: 禁用
结果: 动画完成后销毁节点
```

---

## 📊 性能优化建议

### 1. 对象池

对于频繁生成的临时收集物，使用对象池：

```typescript
const tempCollectiblePool = new NodePool(() => {
    return instantiate(this.tempCollectiblePrefab);
});

// 使用对象池
const collectible = tempCollectiblePool.get();
this.node.addChild(collectible);

// 归还对象池（在销毁前）
collectible.removeComponent(TempCollectibleItem);
tempCollectiblePool.put(collectible);
```

### 2. 批量销毁

在关卡切换时批量销毁所有临时收集物：

```typescript
cleanupTempCollectibles() {
    const tempCollectibles = this.tempCollectiblesRoot.children;
    tempCollectibles.forEach(node => {
        node.destroy();
    });
}
```

### 3. 资源预加载

预加载所有收集物图标：

```typescript
preloadAllCollectibleIcons(callback: Function) {
    const iconPaths = Object.values(COLLECTIBLE_ICON_PATHS);
    let loadedCount = 0;

    iconPaths.forEach(path => {
        resources.load(path, SpriteFrame, (err) => {
            if (!err) loadedCount++;
            if (loadedCount === iconPaths.length) {
                callback();
            }
        });
    });
}
```

---

## 🎯 总结

### 核心特性

✅ **自动消失** - 倒计时管理，到期自动消失
✅ **闪烁提示** - 即将消失时的视觉提示
✅ **动画效果** - 缩小、旋转、淡出的组合动画
✅ **玩家收集** - 支持玩家触碰收集
✅ **灵活配置** - 可配置是否可收集、存在时间等
✅ **图标系统** - 三层图标加载优先级
✅ **事件系统** - 收集事件通知
✅ **扩展性强** - 易于添加新类型和功能

### 适用场景

1. **限时奖励** - 限时完成收集获得额外奖励
2. **临时道具** - 无敌、加速等限时效果道具
3. **随机生成** - 动态生成的临时收集物
4. **任务道具** - 任务期间存在，完成后消失

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| `TempCollectibleItemGuide.md` | 完整使用指南 |
| `TempCollectibleItemQuickReference.md` | 快速参考 |
| `TempCollectibleItemImplementationSummary.md` | 实施总结 |
| `CollectibleIconSystemGuide.md` | 图标系统说明 |
| `CollectibleSystemGuide.md` | 收集物系统指南 |

---

## 🎉 完成情况

### CollectibleItem 图标系统

- [x] 三层加载优先级实现
- [x] Tiled iconPath 支持
- [x] 默认图标路径映射
- [x] CollectibleItem 增强完成
- [x] CollectibleType 扩展完成
- [x] 文档完善

### TempCollectibleItem 系统

- [x] 自动消失机制实现
- [x] 闪烁提示系统实现
- [x] Tween 动画系统实现
- [x] 玩家收集支持实现
- [x] 图标系统继承实现
- [x] 事件系统支持实现
- [x] 文档完善

---

**所有功能已实现并文档化！**
