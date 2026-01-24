# TempCollectibleItem 快速参考

## 快速开始

### 1. 创建 Prefab

1. 创建新节点 `TempCollectibleItem`
2. 添加 **Sprite** 组件
3. 添加 **BoxCollider2D**（勾选 Sensor）
4. 添加 **TempCollectibleItem** 脚本
5. 配置属性：
   - `Life Time` = 5.0
   - `Collectible Type` = GEM
6. 保存为 Prefab

### 2. Tiled 配置

**普通临时收集物**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_T001
  - type: gem
  - lifeTime: 5.0
```

**长时间收集物**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_T002
  - type: coin
  - lifeTime: 10.0
```

**不可收集道具**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_T003
  - type: heart
  - canCollect: false
```

---

## 关键属性

### 生命周期

```
Life Time: 5.0          # 存在时间（秒）
Disappear Duration: 0.5  # 消失动画时长（秒）
```

### 行为控制

```
Can Collect: true          # 是否可以收集
Blink Before Disappear: true  # 闪烁提示
Blink Start Time: 2.0     # 闪烁开始时间
Blink Interval: 0.2         # 闪烁间隔
```

### 动画

```
Final Scale: 0             # 最终缩放（缩小到 0）
```

---

## 使用场景

### 场景一：限时奖励

```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_T_BONUS_001
  - type: gem
  - lifeTime: 10.0
  - blinkBeforeDisappear: true
  - blinkStartTime: 3.0
```

### 场景二：无敌道具

```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_SHIELD_001
  - type: heart
  - lifeTime: 5.0
  - canCollect: true
```

### 场景三：任务道具

```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_Q001
  - type: coin
  - lifeTime: 60.0
```

---

## API 快速参考

### 查询方法

```typescript
// 剩余时间
const remaining = tempCollectible.getRemainingLifeTime();

// 生命进度（0-1）
const progress = tempCollectible.getLifeProgress();
```

### 控制方法

```typescript
// 强制消失
tempCollectible.forceDisappear();

// 设置图标
tempCollectible.setIconPath('textures/collectibles/special');
```

### 事件监听

```typescript
// 监听收集事件
this.node.on('collectible-collected', (data) => {
    console.log('ID:', data.collectibleId);
    console.log('Type:', data.type);
}, this);
```

---

## 推荐配置

### 快速消失
```
Life Time: 2.0
Disappear Duration: 0.3
Blink Before Disappear: false
```

### 标准消失
```
Life Time: 5.0
Disappear Duration: 0.5
Blink Before Disappear: true
Blink Start Time: 2.0
```

### 长时间存在
```
Life Time: 30.0
Disappear Duration: 0.8
Blink Before Disappear: true
Blink Start Time: 5.0
```

---

## 与 CollectibleItem 的选择

| 需求 | 使用组件 |
|------|---------|
| 永久收集物 | CollectibleItem |
| 临时收集物 | TempCollectibleItem |
| 需要存储进度 | CollectibleItem |
| 限时消失 | TempCollectibleItem |

---

## 常见问题

**Q: 不消失？**
A: 检查 `Life Time` 是否为正数

**Q: 不闪烁？**
A: 检查 `Blink Before Disappear` 和 `Blink Start Time`

**Q: 动画不流畅？**
A: 检查 `Disappear Duration`（建议 0.3-0.8）

**Q: 无法收集？**
A: 检查 `Can Collect` 是否为 true

---

详细文档请查看 `TempCollectibleItemGuide.md`
