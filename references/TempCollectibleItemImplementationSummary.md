# 临时收集物系统实施完成总结

## ✅ 已实现的功能

### 1. TempCollectibleItem 组件

**核心特性**：
- ✅ 自动消失机制（倒计时）
- ✅ 闪烁提示即将消失
- ✅ Tween 缩小动画
- ✅ Tween 淡出效果
- ✅ 玩家收集支持
- ✅ 灵活配置（可收集/不可收集）
- ✅ 三层图标加载系统
- ✅ 事件系统支持

### 2. CollectibleItem 增强

**改进内容**：
- ✅ 添加 `_iconPath` 私有属性
- ✅ 添加 `autoLoadIcon` 属性
- ✅ 实现 `loadIcon()` 方法
- ✅ 实现 `loadIconFromPath()` 方法
- ✅ 实现 `setIconPath()` 公共方法
- ✅ 导入 `COLLECTIBLE_ICON_PATHS` 映射

### 3. CollectibleType 扩展

**新增枚举值**：
```typescript
export enum CollectibleType {
    // 原有时间旅行类型
    FRAGMENT = 'time_fragment',
    CHIP = 'future_chip',
    FOSSIL = 'ancient_fossil',
    LETTER = 'ccnu_letter',

    // 新增收集物类型
    COIN = 'coin',
    GEM = 'gem',
    STAR = 'star',
    HEART = 'heart',
    KEY = 'key',
    RELIC = 'relic',
    CUSTOM = 'custom'
}
```

**新增常量**：
```typescript
export const COLLECTIBLE_ICON_PATHS: Record<CollectibleType, string> = {
    [CollectibleType.COIN]: 'textures/collectibles/coin',
    [CollectibleType.GEM]: 'textures/collectibles/gem',
    // ... 其他类型
};
```

---

## 📝 修改的文件

| 文件 | 修改内容 | 行数 |
|------|---------|------|
| `TempCollectibleItem.ts` | 新建文件，完整实现 | ~300 行 |
| `CollectibleItem.ts` | 添加图标加载功能 | ~50 行 |
| `CollectibleType.ts` | 扩展枚举和路径映射 | ~40 行 |

---

## 🎯 TempCollectibleItem 核心功能

### 1. 生命周期管理

```
生成 → 倒计时开始 → 闪烁提示 → 消失动画 → 销毁
    ↓      ↓           ↓         ↓        ↓
    5.0秒  剩2秒  闪烁     缩小+旋转  销毁节点
```

### 2. 闪烁系统

**配置**：
- `Blink Before Disappear` - 是否启用闪烁
- `Blink Start Time` - 闪烁开始时间（剩余秒数）
- `blinkInterval` - 闪烁间隔

**效果**：
- 不透明度在 1.0 和 0.3 之间切换
- 在最后 N 秒内闪烁，提示玩家即将消失

### 3. 动画系统

**收集动画**：
```
收集时触发
    ↓
播放 Tween
    ├─► 缩小到 finalScale (默认 0)
    ├─► 旋转 360 度
    └─► 动画完成 → 销毁节点
```

**消失动画**：
```
时间到期触发
    ↓
播放 Tween
    ├─► 缩小到 finalScale (默认 0)
    ├─► 不透明度从 1 淡出到 0
    ├─► 禁用碰撞体
    └─► 动画完成 → 销毁节点
```

### 4. 玩家收集

**触发条件**：
- 玩家触碰
- `Can Collect` 为 true
- 节点未消失

**收集行为**：
- 播放收集动画
- 发送收集事件
- 不记录到 CollectibleManager（因为是临时的）

---

## 🔧 CollectibleItem 改进

### 新增属性

```typescript
// 图标路径（从 Tiled 读取）
private _iconPath: string = '';

// 是否自动加载图标
@property({ tooltip: "是否自动加载图标（根据类型）" })
autoLoadIcon: boolean = true;
```

### 新增方法

```typescript
// 设置图标路径（从 Tiled 读取）
public setIconPath(path: string): void

// 加载图标 SpriteFrame
private loadIcon(): void

// 从路径加载图标
private loadIconFromPath(path: string): void
```

### 图标加载优先级

```
优先级 1: 手动设置的 icon (Inspector)
    ↓
优先级 2: Tiled 中的 iconPath 属性
    ↓
优先级 3: 根据类型的默认图标
```

---

## 📊 CollectibleType 扩展

### 新增枚举值

| 类型值 | 说明 |
|--------|------|
| `coin` | 金币 |
| `gem` | 宝石 |
| `star` | 星星 |
| `heart` | 爱心 |
| `key` | 钥匙 |
| `relic` | 遗物 |
| `custom` | 自定义 |

### 图标路径映射

所有类型都有对应的默认图标路径，用于自动加载。

---

## 📚 文档清单

| 文档 | 说明 |
|------|------|
| `TempCollectibleItemGuide.md` | 完整使用指南 |
| `TempCollectibleItemQuickReference.md` | 快速参考 |

---

## 🚀 使用步骤

### 1. 创建 TempCollectibleItem Prefab

1. 创建新节点
2. 添加 Sprite、BoxCollider2D（勾选 Sensor）
3. 添加 TempCollectibleItem 脚本
4. 配置属性
5. 保存为 Prefab

### 2. 在 Tiled 中配置临时收集物

**普通临时收集物**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_T001
  - type: gem
  - lifeTime: 5.0
```

### 3. 在 LevelMapManager 中注册

在 `spawnPrefbs` 方法中添加：

```typescript
case "temp_collectible":
    if (!this.tempCollectiblePrefab) {
        console.warn(`未绑定${name}预制体`);
        return;
    }
    targetPrefab = this.tempCollectiblePrefab;
    break;
```

---

## 🎨 使用场景示例

### 场景一：限时奖励收集物

**配置**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_T_BONUS_001
  - type: gem
  - lifeTime: 10.0
  - blinkBeforeDisappear: true
  - blinkStartTime: 3.0
```

**效果**：
- 存在 10 秒
- 最后 3 秒开始闪烁
- 玩家收集时播放动画消失
- 未收集则 10 秒后自动消失

### 场景二：无敌道具

**配置**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_SHIELD_001
  - type: heart
  - lifeTime: 5.0
  - canCollect: true
```

**效果**：
- 玩家触碰获得 5 秒无敌
- 5 秒后自动消失
- 可以再次生成

### 场景三：任务道具

**配置**：
```
Name: temp_collectible
Custom Properties:
  - collectibleId: L1_Q001
  - type: coin
  - lifeTime: 60.0
  - canCollect: true
```

**效果**：
- 任务期间存在 60 秒
- 收集后自动消失
- 不永久记录

---

## 🔄 CollectibleItem vs TempCollectibleItem

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

## 🧪 测试清单

### 基础功能测试

- [x] 临时收集物正确生成
- [ ] 倒计时正常工作
- [ ] 时间到期自动消失
- [ ] 闪烁效果正常显示

### 收集功能测试

- [ ] 玩家触碰可以收集
- [ ] 收集动画正常播放
- [ ] 收集后节点销毁
- [ ] 发送收集事件

### 不可收集测试

- [ ] Can Collect = false 时玩家无法收集
- [ ] 时间到期仍然消失
- [ ] 碰撞体被禁用

### 图标系统测试

- [ ] 手动设置图标优先级正确
- [ ] Tiled iconPath 正确加载
- [ ] 默认图标正确加载
- [ ] CollectibleItem 图标加载正常

---

## 🎯 推荐配置

### 快速消失（2秒）
```
Life Time: 2.0
Disappear Duration: 0.3
Blink Before Disappear: false
```

### 标准消失（5秒）
```
Life Time: 5.0
Disappear Duration: 0.5
Blink Before Disappear: true
Blink Start Time: 2.0
Blink Interval: 0.2
```

### 长时间存在（30秒）
```
Life Time: 30.0
Disappear Duration: 0.8
Blink Before Disappear: true
Blink Start Time: 5.0
Blink Interval: 0.3
```

---

## 📝 文件清单

### 新建文件

| 文件 | 说明 |
|------|------|
| `TempCollectibleItem.ts` | 临时收集物组件 |
| `TempCollectibleItemGuide.md` | 完整使用指南 |
| `TempCollectibleItemQuickReference.md` | 快速参考 |

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `CollectibleItem.ts` | 添加图标加载功能 |
| `CollectibleType.ts` | 扩展枚举和路径映射 |

---

## 🎉 总结

### 核心特性

✅ **自动消失** - 倒计时管理，到期自动消失
✅ **闪烁提示** - 即将消失时的视觉提示
✅ **动画效果** - 缩小旋转 + 淡出
✅ **玩家收集** - 支持玩家触碰收集
✅ **灵活配置** - 可配置是否可收集
✅ **图标系统** - 支持三层图标加载
✅ **事件系统** - 收集事件通知
✅ **扩展性强** - 易于添加新类型
✅ **向后兼容** - 保留原有功能

---

## 📚 相关文档

- `TempCollectibleItemGuide.md` - 完整使用指南
- `TempCollectibleItemQuickReference.md` - 快速参考
- `CollectibleSystemGuide.md` - CollectibleItem 使用指南
- `CollectibleIconSystemGuide.md` - 图标系统说明

---

## 🚀 快速开始

1. **创建 Prefab**
   ```
   添加 Sprite + BoxCollider2D (Sensor) + TempCollectibleItem 脚本
   ```

2. **配置 Tiled**
   ```
   Name: temp_collectible
   Custom Properties:
     - collectibleId: L1_T001
     - type: gem
     - lifeTime: 5.0
   ```

3. **运行游戏**
   - 自动生成并倒计时
   - 闪烁提示即将消失
   - 玩家可收集
   - 时间到期自动消失

---

**临时收集物系统已完整实现并文档化！**
