# CollectibleItem 图标系统实施完成总结

## ✅ 已实现的功能

### 1. 三层图标加载优先级

```
优先级 1: 手动设置的 icon (Inspector)
    ↓
优先级 2: Tiled 中的 iconPath 属性
    ↓
优先级 3: 根据类型的默认图标
```

### 2. Tiled 集成

**新增属性**：
- `iconPath` - 图标资源路径（String 类型）

**Tiled 配置示例**：

普通碎片（使用默认图标）：
```
Name: collectible
Custom Properties:
  - collectibleId: L1_F001
  - type: time_fragment
```

特殊碎片（使用自定义图标）：
```
Name: collectible
Custom Properties:
  - collectibleId: L1_F002
  - type: time_fragment
  - iconPath: textures/collectibles/special_fragment
```

### 3. CollectibleItem 改进

**新增功能**：
- ✅ `setIconPath(path: string)` - 设置图标路径
- ✅ `loadIcon()` - 智能加载图标
- ✅ `loadIconFromPath(path: string)` - 从路径加载
- ✅ `COLLECTIBLE_ICON_PATHS` - 类型到路径的映射

**新增属性**：
- `autoLoadIcon: boolean` - 是否自动加载图标（默认 true）

---

## 📝 修改的文件

### Scripts/Objects/CollectibleItem.ts

**新增导入**：
```typescript
import { resources, SpriteAtlas, assetManager } from 'cc';
```

**新增常量**：
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

**新增方法**：
- `setIconPath(path: string)` - 设置 Tiled 读取的图标路径
- `loadIcon()` - 智能加载图标
- `loadIconFromPath(path: string)` - 从资源路径加载

### Scripts/GamePlay/LevelMapManager.ts

**修改内容**：
在 `spawnPrefbs` 方法的 collectible 处理中添加：
```typescript
const rawIconPath = props["iconPath"] || "";
const iconPath = String(rawIconPath);

if (iconPath && iconPath.length > 0) {
    collectibleItem.setIconPath(iconPath);
}
```

---

## 📚 文档更新

### 新增文档

| 文档 | 说明 |
|------|------|
| CollectibleIconSystemGuide.md | 图标系统完整说明 |

### 更新文档

| 文档 | 更新内容 |
|------|---------|
| CollectibleSystemGuide.md | 添加 iconPath 属性说明 |

---

## 🎯 使用方式

### 方式一：使用默认图标（推荐）

**Tiled 配置**：
```
Name: collectible
Custom Properties:
  - collectibleId: L1_C001
  - type: coin
```

**结果**：
- 自动加载 `textures/collectibles/coin.png`
- 适合普通收集物

### 方式二：使用自定义图标

**Tiled 配置**：
```
Name: collectible
Custom Properties:
  - collectibleId: L1_C002
  - type: coin
  - iconPath: textures/collectibles/special_gold_coin
```

**结果**：
- 加载指定的自定义图标
- 适合特殊收集物

### 方式三：手动设置图标

**Inspector 配置**：
```
Icon: [手动拖入 SpriteFrame]
Auto Load Icon: false
```

**结果**：
- 使用手动设置的图标
- 最高优先级，覆盖所有其他设置
- 适合精确控制

---

## 🎨 图标资源准备

### 单张图片方式

**目录结构**：
```
resources/
└── textures/
    └── collectibles/
        ├── coin.png
        ├── gem.png
        ├── star.png
        ├── heart.png
        ├── key.png
        ├── fragment.png
        ├── relic.png
        └── custom.png
```

### SpriteAtlas 方式（推荐）

**目录结构**：
```
resources/
└── textures/
    └── collectibles/
        └── collectibles.plist
        └── collectibles.png
```

**使用 SpriteAtlas 的好处**：
- 减少文件数量
- 提升加载性能
- 统一管理资源
- 减少 Draw Call

---

## 🔄 图标加载流程

```
CollectibleItem.onLoad()
    ↓
loadIcon()
    ↓
检查优先级：
    ├─► 有手动 icon？
    │   ├─ 是 → 使用手动图标
    │   └─ 返回
    │
    ├─► 有 iconPath?
    │   ├─ 是 → loadIconFromPath(iconPath)
    │   └─ 返回
    │
    └─► 有默认图标路径？
        ├─ 是 → loadIconFromPath(默认路径)
        └─ 否 → 警告
```

---

## 🧪 测试场景

### 场景一：普通关卡

**Tiled 配置**：
```
# 10 个普通金币
Name: collectible
Custom Properties:
  - collectibleId: L1_C001 ~ L1_C010
  - type: coin

# 5 个普通宝石
Name: collectible
Custom Properties:
  - collectibleId: L1_G001 ~ L1_G005
  - type: gem
```

**预期结果**：
- 所有金币使用 `coin.png`
- 所有宝石使用 `gem.png`

### 场景二：特殊收集物

**Tiled 配置**：
```
# 1 个普通金币
Name: collectible
Custom Properties:
  - collectibleId: L1_C011
  - type: coin

# 1 个隐藏金币
Name: collectible
Custom Properties:
  - collectibleId: L1_C012
  - type: coin
  - iconPath: textures/collectibles/hidden_coin

# 1 个 BOSS 金币
Name: collectible
Custom Properties:
  - collectibleId: L1_C013
  - type: coin
  - iconPath: textures/collectibles/boss_gold_coin
```

**预期结果**：
- L1_C011: 普通金币图标
- L1_C012: 隐藏金币图标
- L1_C013: BOSS 金币图标

### 场景三：关卡专属图标

**Level 1**:
```
Name: collectible
Custom Properties:
  - collectibleId: L1_G001
  - type: gem
  - iconPath: textures/collectibles/level1/gem
```

**Level 2**:
```
Name: collectible
Custom Properties:
  - collectibleId: L2_G001
  - type: gem
  - iconPath: textures/collectibles/level2/gem
```

**预期结果**：
- 不同关卡使用不同风格的图标
- 相同类型，不同外观

---

## ⚙️ Inspector 配置

### CollectibleItem 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| Collectible Id | string | 空 | 收集物唯一 ID |
| Collectible Type | Enum | FRAGMENT | 收集物类型 |
| Icon | SpriteFrame | null | 手动设置的图标 |
| Auto Load Icon | boolean | true | 是否自动加载图标 |
| Destroy On Collect | boolean | true | 拾取后是否销毁 |

### 使用建议

**场景 1：普通收集物**
```
Auto Load Icon: true
Icon: null
```

**场景 2：手动控制图标**
```
Auto Load Icon: false
Icon: [拖入 SpriteFrame]
```

**场景 3：Tiled 控制**
```
Auto Load Icon: true
Icon: null
// 在 Tiled 中设置 iconPath
```

---

## 📊 类型到路径映射

| CollectibleType | 默认路径 | 资源文件名 |
|---------------|----------|------------|
| COIN | textures/collectibles/coin | coin.png |
| GEM | textures/collectibles/gem | gem.png |
| STAR | textures/collectibles/star | star.png |
| HEART | textures/collectibles/heart | heart.png |
| KEY | textures/collectibles/key | key.png |
| FRAGMENT | textures/collectibles/fragment | fragment.png |
| RELIC | textures/collectibles/relic | relic.png |
| CUSTOM | textures/collectibles/custom | custom.png |

---

## 🔧 扩展开发

### 添加新的收集物类型

**步骤 1：更新枚举**
```typescript
// CollectibleType.ts
export enum CollectibleType {
    // ... 现有类型
    NEW_TYPE = 'new_type'
}
```

**步骤 2：添加路径映射**
```typescript
// CollectibleItem.ts
export const COLLECTIBLE_ICON_PATHS: Record<CollectibleType, string> = {
    // ... 现有映射
    [CollectibleType.NEW_TYPE]: 'textures/collectibles/new_type'
};
```

**步骤 3：准备图标资源**
```
resources/textures/collectibles/new_type.png
```

**步骤 4：Tiled 配置**
```
Name: collectible
Custom Properties:
  - collectibleId: L1_N001
  - type: new_type
```

### 添加子类型变体

**示例**：金币有三种变体

**资源结构**：
```
resources/textures/collectibles/coins/
├── gold_coin.png
├── silver_coin.png
└── bronze_coin.png
```

**Tiled 配置**：
```
# 金金币
Name: collectible
Custom Properties:
  - collectibleId: L1_C001
  - type: coin
  - iconPath: textures/collectibles/coins/gold_coin

# 银金币
Name: collectible
Custom Properties:
  - collectibleId: L1_C002
  - type: coin
  - iconPath: textures/collectibles/coins/silver_coin

# 铜金币
Name: collectible
Custom Properties:
  - collectibleId: L1_C003
  - type: coin
  - iconPath: textures/collectibles/coins/bronze_coin
```

---

## 🎯 总结

### 核心特性

✅ **三层优先级** - 手动 > Tiled > 默认
✅ **Tiled 集成** - 支持通过属性配置图标
✅ **类型系统** - 完整的 CollectibleType 支持
✅ **灵活配置** - 每个收集物可独立配置
✅ **向后兼容** - 保留所有原有功能
✅ **易于扩展** - 支持添加新类型和变体

### 使用优势

1. **开发效率高**
   - 普通收集物无需配置图标
   - 特殊收集物通过 Tiled 快速配置

2. **维护成本低**
   - 类型统一管理
   - 资源路径集中配置

3. **灵活性高**
   - 支持三层优先级
   - 支持任意自定义

4. **扩展性强**
   - 易于添加新类型
   - 易于添加新变体

---

## 📋 部署清单

### 1. 准备资源
- [ ] 准备所有收集物图标
- [ ] 放入 `resources/textures/collectibles/` 目录
- [ ] 确保文件命名与类型映射一致

### 2. 更新 Tiled 地图
- [ ] 为所有收集物添加 `collectibleId` 属性
- [ ] 为所有收集物添加 `type` 属性
- [ ] 为特殊收集物添加 `iconPath` 属性

### 3. 测试功能
- [ ] 普通收集物正确显示默认图标
- [ ] 特殊收集物正确显示自定义图标
- [ ] 手动设置的图标优先级正确
- [ ] 收集功能正常工作

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| CollectibleSystemGuide.md | 收集物系统使用指南（已更新）|
| CollectibleIconSystemGuide.md | 图标系统完整说明（新增）|

---

## 🚀 快速开始

### 最小化配置步骤

1. 准备资源：将图标放入 `resources/textures/collectibles/`
2. 打开 Tiled：设置收集物属性
3. 运行游戏：自动加载对应图标

### 推荐配置

**普通关卡**：不设置 `iconPath`，使用默认图标

**特殊收集物**：设置 `iconPath`，使用自定义图标

**BOSS 关卡**：使用独特的图标，通过 `iconPath` 指定

---

**所有功能已实现并文档化！**
