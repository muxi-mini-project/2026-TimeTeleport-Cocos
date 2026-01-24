# TempCollectibleItem - 临时消失的收集物组件

## 概述

`TempCollectibleItem` 是一种在场景中存在一段时间后自动消失的收集物组件。适用于：

- 🎁 奖励收集物（限时收集）
- ⏱️ 临时道具（如加速道具、无敌道具等）
- 💎 随机生成的收集物（限时出现）
- 🚀 任务道具（限时完成收集）

---

## 核心特性

### 1. 自动消失机制

收集物在场景中存在指定时间后自动消失，支持：
- ✅ 倒计时管理
- ✅ 闪烁提示即将消失
- ✅ 平滑的 Tween 缩小动画
- ✅ 淡出效果

### 2. 玩家收集

- ✅ 支持玩家触碰收集
- ✅ 可配置是否允许收集
- ✅ 收集时播放动画
- ✅ 收集时记录到 CollectibleManager

### 3. 动画系统

**收集动画**：
- 缩小到 `finalScale`（默认 0）
- 同时旋转 360 度
- 动画完成后销毁节点

**消失动画**：
- 缩小到 `finalScale`
- 不透明度从 1 淡出到 0
- 禁用碰撞体
- 动画完成后销毁节点

---

## CollectibleItem 属性

### 基础属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `Collectible Id` | string | 空 | 收集物唯一 ID |
| `Collectible Type` | Enum | FRAGMENT | 收集物类型 |
| `Icon` | SpriteFrame | null | 图标（手动设置） |

### 生命周期属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `Life Time` | number | 5.0 | 存在时间（秒） |
| `Disappear Duration` | number | 0.5 | 消失动画时长（秒） |

### 行为控制属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `Can Collect` | boolean | true | 是否可以被玩家收集 |
| `Blink Before Disappear` | boolean | true | 是否闪烁提示即将消失 |
| `Blink Start Time` | number | 2.0 | 闪烁开始时间（剩余秒数） |
| `Blink Interval` | number | 0.2 | 闪烁间隔（秒） |

### 动画属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `Final Scale` | number | 0 | 最终缩放比例 |

---

## 使用方式

### 方式一：Tiled 配置（推荐）

**普通临时收集物**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_T001
  - type: gem
```

**长时间存在的临时收集物**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_T002
  - type: coin
  - lifeTime: 10.0
```

**不可收集的临时道具**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_T003
  - type: heart
  - canCollect: false
```

**使用自定义图标的临时收集物**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_T004
  - type: coin
  - iconPath: textures/collectibles/special_coin
  - lifeTime: 8.0
```

### 方式二：手动创建 Prefab

1. 创建新节点，命名为 `TempCollectibleItem`
2. 添加 **Sprite** 组件
3. 添加 **BoxCollider2D** 组件（勾选 Sensor）
4. 添加 **TempCollectibleItem** 脚本
5. 配置属性：
   - 设置 `Collectible Type`
   - 设置 `Life Time`（如 5.0）
   - 根据需要配置其他属性
6. 保存为 Prefab

### 方式三：运行时动态创建

```typescript
import { TempCollectibleItem } from './Objects/TempCollectibleItem';

// 在某个脚本中动态创建临时收集物
spawnTempCollectible() {
    const collectible = instantiate(this.tempCollectiblePrefab);
    this.node.addChild(collectible);

    const tempCollectible = collectible.getComponent(TempCollectibleItem);
    if (tempCollectible) {
        tempCollectible.collectibleId = `L1_T_${Date.now()}`;
        tempCollectible.collectibleType = CollectibleType.GEM;
        tempCollectible.lifeTime = 3.0; // 存在 3 秒
        tempCollectible.canCollect = true;

        // 可选：设置自定义图标
        // tempCollectible.setIconPath('textures/collectibles/special_gem');
    }
}
```

---

## 实际应用场景

### 场景一：限时奖励收集物

**需求**：关卡中生成一个限时 10 秒的宝石，玩家在 10 秒内收集则获得额外奖励。

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
// 在 UI 中显示倒计时
update() {
    const tempCollectible = this.tempCollectible.getComponent(TempCollectibleItem);
    if (tempCollectible) {
        const remainingTime = tempCollectible.getRemainingLifeTime();
        this.countdownLabel.string = `${remainingTime.toFixed(1)}s`;

        // 收集成功
        this.node.on('collectible-collected', (data) => {
            if (data.collectibleId === 'L1_T_BONUS_001') {
                console.log('获得限时奖励！');
                this.playBonusEffect();
            }
        }, this);
    }
}
```

### 场景二：无敌道具（限时）

**需求**：玩家触碰后获得 5 秒无敌，5 秒后自动消失，玩家可以再次获取。

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
// 在 PlayerController 中处理无敌道具
this.node.on('collectible-collected', (data) => {
    if (data.collectibleId === 'L1_SHIELD_001') {
        // 给玩家 5 秒无敌
        this.addShield(5.0);
        console.log('获得 5 秒无敌');
    }
}, this);
```

### 场景三：任务道具（收集后消失）

**需求**：关卡中有 3 个任务道具，收集后自动消失，无需永久记录。

**Tiled 配置**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_Q001 ~ L1_Q003
  - type: coin
  - lifeTime: 60.0
  - canCollect: true
```

**代码示例**：
```typescript
// 任务管理器
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

### 场景四：随机生成的临时收集物

**代码示例**：
```typescript
// 随机生成临时收集物
spawnRandomTempCollectibles() {
    const positions = [
        { x: 100, y: 200 },
        { x: 300, y: 400 },
        { x: 500, y: 600 }
    ];

    const tempTypes = [CollectibleType.GEM, CollectibleType.STAR, CollectibleType.RELIC];

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

## API 参考

### 公共方法

#### setIconPath
设置图标资源路径（从 Tiled 读取）。

```typescript
public setIconPath(path: string): void
```

**使用示例**：
```typescript
tempCollectible.setIconPath('textures/collectibles/special_gem');
```

#### getRemainingLifeTime
获取剩余生命时间。

```typescript
public getRemainingLifeTime(): number
```

**使用示例**：
```typescript
const remaining = tempCollectible.getRemainingLifeTime();
console.log(`剩余时间: ${remaining.toFixed(2)} 秒`);
```

#### getLifeProgress
获取生命进度（0-1）。

```typescript
public getLifeProgress(): number
```

**使用示例**：
```typescript
const progress = tempCollectible.getLifeProgress();
console.log(`进度: ${(progress * 100).toFixed(0)}%`);
```

#### forceDisappear
强制立即消失。

```typescript
public forceDisappear(): void
```

**使用示例**：
```typescript
// 玩家死亡时强制消失所有临时收集物
tempCollectible.forceDisappear();
```

---

## 事件系统

### 收集物被收集事件

```typescript
this.node.on('collectible-collected', (data) => {
    console.log('收集物 ID:', data.collectibleId);
    console.log('收集物类型:', data.type);
    console.log('收集物价值:', data.value);
}, this);
```

### 使用场景

```typescript
// 在关卡管理器中监听所有收集事件
const tempCollectibles = this.tempCollectiblesRoot.children;

tempCollectibles.forEach(node => {
    const tempCollectible = node.getComponent(TempCollectibleItem);
    if (tempCollectible) {
        node.on('collectible-collected', (data) => {
            this.onTempCollectibleCollected(data);
        }, this);
    }
});
```

---

## 与普通 CollectibleItem 的对比

| 特性 | CollectibleItem | TempCollectibleItem |
|------|----------------|---------------------|
| 永久存储 | ✅ 是 | ❌ 否 |
| 收集进度统计 | ✅ 支持 | ❌ 不支持 |
| 存在时间限制 | ❌ 无 | ✅ 支持 |
| 自动消失 | ❌ 无 | ✅ 支持 |
| 闪烁提示 | ❌ 无 | ✅ 支持 |
| 缩小动画 | ❌ 无 | ✅ 支持 |
| 淡出效果 | ❌ 无 | ✅ 支持 |
| 是否可收集 | ✅ 总是可收集 | ✅ 可配置 |
| 适用场景 | 永久收集物 | 临时道具、限时奖励 |

---

## 性能优化建议

### 1. 对象池

对于频繁生成的临时收集物，使用对象池：

```typescript
// 创建对象池
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

在关卡切换时批量销毁临时收集物：

```typescript
cleanupTempCollectibles() {
    const tempCollectibles = this.tempCollectiblesRoot.children;
    tempCollectibles.forEach(node => {
        node.destroy();
    });
}
```

---

## 调试技巧

### 查看日志

```
[TempCollectibleItem] L1_T001: 启动生命周期，存在时间: 5.0秒
[TempCollectibleItem] L1_T001: 开始闪烁，剩余时间: 2.00秒
[TempCollectibleItem] L1_T001: 时间到期，开始消失动画
[TempCollectibleItem] L1_T001: 已收集
```

### 调试生命周期

```typescript
update() {
    if (this._debug) {
        const tempCollectible = this.getComponent(TempCollectibleItem);
        if (tempCollectible) {
            console.log(`剩余时间: ${tempCollectible.getRemainingLifeTime().toFixed(2)}秒`);
            console.log(`生命进度: ${(tempCollectible.getLifeProgress() * 100).toFixed(0)}%`);
        }
    }
}
```

---

## 常见问题

**Q: 收集物不消失？**

A: 检查以下几点：
1. `Life Time` 是否设置为正数
2. `Life Time` 是否过大（如 1000 秒）
3. 节点是否被禁用

**Q: 收集物不闪烁？**

A: 检查以下几点：
1. `Blink Before Disappear` 是否为 true
2. `Blink Start Time` 是否小于 `Life Time`
3. `Blink Interval` 是否设置合理

**Q: 动画不流畅？**

A: 检查以下几点：
1. `Disappear Duration` 是否设置合理（建议 0.3-0.8 秒）
2. `Final Scale` 是否为 0 或接近 0
3. 是否有其他大量 Tween 同时运行

**Q: 玩家无法收集？**

A: 检查以下几点：
1. `Can Collect` 是否为 true
2. 玩家节点名称是否为 "Player"
3. Collider2D 的 Sensor 是否勾选

---

## 配置推荐

### 推荐配置

**普通临时收集物**：
```
Life Time: 5.0
Disappear Duration: 0.5
Can Collect: true
Blink Before Disappear: true
Blink Start Time: 2.0
Blink Interval: 0.2
Final Scale: 0
```

**长时间存在的收集物**：
```
Life Time: 30.0
Disappear Duration: 0.8
Can Collect: true
Blink Before Disappear: true
Blink Start Time: 5.0
Blink Interval: 0.3
Final Scale: 0
```

**快速消失的收集物**：
```
Life Time: 2.0
Disappear Duration: 0.3
Can Collect: true
Blink Before Disappear: false
Final Scale: 0
```

**不可收集的道具**：
```
Life Time: 10.0
Disappear Duration: 0.5
Can Collect: false
Blink Before Disappear: true
Blink Start Time: 2.0
Final Scale: 0
```

---

## 总结

### 核心特性

✅ **自动消失** - 倒计时管理，到期自动消失
✅ **闪烁提示** - 即将消失时的视觉提示
✅ **动画效果** - 缩小旋转 + 淡出
✅ **玩家收集** - 支持玩家触碰收集
✅ **灵活配置** - 可配置是否可收集
✅ **图标系统** - 支持三层图标加载
✅ **事件系统** - 收集事件通知

### 适用场景

1. **限时奖励** - 短时间内完成收集
2. **临时道具** - 无敌、加速等限时效果
3. **随机生成** - 随机出现的临时道具
4. **任务道具** - 收集后自动消失

---

**TempCollectibleItem 已实现并文档化！**
