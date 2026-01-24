# CollectibleItem 图标系统说明

## 概述

本文档详细说明如何通过 Tiled map 中 object 的属性生成不同 icon 的 collectible item，并支持 CollectibleType 类型系统。

---

## 功能特性

### 1. 多层图标加载优先级

CollectibleItem 按以下优先级加载图标：

```
优先级 1: 手动设置的 icon (Inspector)
    ↓
优先级 2: Tiled 中的 iconPath 属性
    ↓
优先级 3: 根据类型的默认图标
```

### 2. 三种图标加载方式

#### 方式一：手动设置（最高优先级）

**适用场景**：
- 需要精确控制某个收集物的外观
- 测试和调试
- 特殊收集物（BOSS 掉落物等）

**配置方法**：
1. 选择挂载 `CollectibleItem` 的节点
2. 在 Inspector 的 `Icon` 属性中拖入 SpriteFrame
3. 设置 `Auto Load Icon = false`（可选）

**特点**：
- ✅ 最高优先级，会覆盖其他设置
- ✅ 实时预览效果
- ✅ 适合精确控制

---

#### 方式二：Tiled iconPath 属性

**适用场景**：
- 特殊收集物需要不同图标
- 关卡专属图标
- 同类型收集物的变体

**配置方法**：
1. 在 Tiled 编辑器中打开地图
2. 在 Objects 图层选择对象
3. 添加 Custom Property：
   - 名称: `iconPath`
   - 类型: String
   - 值: 资源路径（如 `textures/collectibles/special_gold_coin`）

**Tiled 配置示例**：

普通金币：
```
Name: collectible
Type:
Custom Properties:
  - collectibleId: L1_C001
  - type: coin
```

特殊金币（金色）：
```
Name: collectible
Type:
Custom Properties:
  - collectibleId: L1_C002
  - type: coin
  - iconPath: textures/collectibles/special_gold_coin
```

特殊金币（银色）：
```
Name: collectible
Type:
Custom Properties:
  - collectibleId: L1_C003
  - type: coin
  - iconPath: textures/collectibles/special_silver_coin
```

**特点**：
- ✅ 灵活配置，同一类型可以有不同外观
- ✅ 适合关卡设计
- ✅ 支持动态路径
- ⚠️ 需要确保资源路径正确

---

#### 方式三：类型默认图标（最低优先级）

**适用场景**：
- 普通收集物
- 批量生成
- 不需要特殊外观

**配置方法**：
1. 不设置任何图标相关属性
2. 设置 `Collectible Type` 为所需类型
3. 确保 `Auto Load Icon = true`（默认值）
4. 系统自动从 `COLLECTIBLE_ICON_PATHS` 加载对应图标

**代码配置**：
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

**资源目录结构**：
```
resources/
└── textures/
    └── collectibles/
        ├── coin.png          # 金币图标
        ├── gem.png          # 宝石图标
        ├── star.png          # 星星图标
        ├── heart.png         # 爱心图标
        ├── key.png           # 钥匙图标
        ├── fragment.png      # 碎片图标
        ├── relic.png         # 遗物图标
        └── custom.png        # 自定义图标
```

**特点**：
- ✅ 自动化，无需手动配置
- ✅ 类型系统完整支持
- ✅ 易于维护和扩展
- ✅ 适合批量生成

---

## Tiled 属性配置完整指南

### 基础配置

| 属性名 | 类型 | 必需 | 说明 | 示例 |
|--------|------|------|------|------|
| `collectibleId` | String | 是 | 收集物唯一编号 | `L1_C001` |
| `type` | String | 否 | 收集物类型 | `coin` |

### 图标配置

| 属性名 | 类型 | 必需 | 说明 | 示例 |
|--------|------|------|------|------|
| `iconPath` | String | 否 | 图标资源路径 | `textures/collectibles/special_coin` |

### 类型值对应表

| type 值 | CollectibleType 枚举 | 默认图标路径 |
|----------|---------------------|--------------|
| `coin` | `CollectibleType.COIN` | `textures/collectibles/coin` |
| `gem` | `CollectibleType.GEM` | `textures/collectibles/gem` |
| `star` | `CollectibleType.STAR` | `textures/collectibles/star` |
| `heart` | `CollectibleType.HEART` | `textures/collectibles/heart` |
| `key` | `CollectibleType.KEY` | `textures/collectibles/key` |
| `fragment` | `CollectibleType.FRAGMENT` | `textures/collectibles/fragment` |
| `relic` | `CollectibleType.RELIC` | `textures/collectibles/relic` |
| `custom` | `CollectibleType.CUSTOM` | `textures/collectibles/custom` |

---

## 实际应用示例

### 示例一：普通关卡收集物

**场景**：关卡中需要 10 个金币和 5 个宝石

**Tiled 配置**：

金币 #1-10:
```
Name: collectible
Custom Properties:
  - collectibleId: L1_C001 ~ L1_C010
  - type: coin
```

宝石 #1-5:
```
Name: collectible
Custom Properties:
  - collectibleId: L1_G001 ~ L1_G005
  - type: gem
```

**结果**：
- 所有金币使用 `textures/collectibles/coin.png`
- 所有宝石使用 `textures/collectibles/gem.png`

---

### 示例二：特殊收集物（使用 iconPath）

**场景**：关卡中有特殊收集物需要独特外观

**Tiled 配置**：

普通金币:
```
Name: collectible
Custom Properties:
  - collectibleId: L1_C001
  - type: coin
```

隐藏金币（特殊图标）:
```
Name: collectible
Custom Properties:
  - collectibleId: L1_C002
  - type: coin
  - iconPath: textures/collectibles/hidden_coin
```

BOSS 掉落物:
```
Name: collectible
Custom Properties:
  - collectibleId: L1_G003
  - type: gem
  - iconPath: textures/collectibles/boss_gem
```

**结果**：
- L1_C001: 普通金币图标
- L1_C002: 隐藏金币图标（独特外观）
- L1_C003: BOSS 宝石图标（独特外观）

---

### 示例三：多关卡图标变体

**场景**：每个关卡使用不同风格的图标

**Level 1**:
```
Name: collectible
Custom Properties:
  - collectibleId: L1_C001
  - type: coin
  - iconPath: textures/collectibles/level1/coin
```

**Level 2**:
```
Name: collectible
Custom Properties:
  - collectibleId: L2_C001
  - type: coin
  - iconPath: textures/collectibles/level2/coin
```

**资源目录结构**：
```
resources/textures/collectibles/
├── level1/
│   ├── coin.png
│   ├── gem.png
│   └── ...
├── level2/
│   ├── coin.png
│   ├── gem.png
│   └── ...
└── ...
```

**结果**：
- Level 1 使用第一套图标风格
- Level 2 使用第二套图标风格
- 相同类型，不同外观

---

### 示例四：稀有度系统（使用 iconPath）

**场景**：相同类型但有不同稀有度的收集物

**Tiled 配置**：

普通宝石:
```
Name: collectible
Custom Properties:
  - collectibleId: L1_G001
  - type: gem
  - iconPath: textures/collectibles/gem_common
```

稀有宝石:
```
Name: collectible
Custom Properties:
  - collectibleId: L1_G002
  - type: gem
  - iconPath: textures/collectibles/gem_rare
```

传说宝石:
```
Name: collectible
Custom Properties:
  - collectibleId: L1_G003
  - type: gem
  - iconPath: textures/collectibles/gem_legendary
```

**结果**：
- 相同类型（gem），不同外观（普通、稀有、传说）
- 使用 iconPath 区分稀有度

---

## CollectibleItem 属性详解

### 图标相关属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `Icon` | SpriteFrame | null | 手动设置的图标（最高优先级）|
| `Auto Load Icon` | boolean | true | 是否自动加载图标（false=仅使用手动图标）|

### 使用场景

**手动图标 + 自动加载禁用**：
```typescript
// Inspector 配置
Icon: [手动设置的 SpriteFrame]
Auto Load Icon: false
Collectible Type: COIN
```
- 仅使用手动设置的图标
- 忽略 Tiled iconPath 和类型默认图标

**自动加载 + Tiled iconPath**：
```typescript
// Inspector 配置
Icon: null
Auto Load Icon: true
// Tiled 配置
iconPath: textures/collectibles/special_coin
```
- 使用 Tiled 中指定的图标路径

**自动加载 + 无 Tiled iconPath**：
```typescript
// Inspector 配置
Icon: null
Auto Load Icon: true
// Tiled 配置（不设置 iconPath）
type: coin
```
- 使用类型的默认图标

---

## 资源准备指南

### 方式一：单张图片

**优点**：
- 简单直接
- 适合少量图标

**缺点**：
- 资源数量多
- 文件管理复杂

**步骤**：
1. 准备所有收集物图标（PNG 格式）
2. 放入 `resources/textures/collectibles/` 目录
3. 按类型命名（`coin.png`, `gem.png`, `star.png` 等）
4. 在 Cocos Creator 中刷新资源

---

### 方式二：SpriteAtlas（推荐）

**优点**：
- 减少文件数量
- 提升加载性能
- 统一管理

**缺点**：
- 需要大图集制作
- 图标尺寸需要统一

**步骤**：
1. 准备大图集，包含所有收集物图标
2. 使用 TexturePacker 等工具打包
3. 生成 `.plist` 和 `.png` 文件
4. 放入 `resources/textures/collectibles/` 目录
5. 在 Cocos Creator 中导入 SpriteAtlas

**目录结构**：
```
resources/textures/collectibles/
└── collectibles.plist     # SpriteAtlas 配置
└── collectibles.png      # 大图集
```

**图标路径格式**：
```
# 单张图片
textures/collectibles/coin

# SpriteAtlas
textures/collectibles/coin
```

---

## 代码实现细节

### CollectibleItem 关键方法

#### 1. setIconPath - 设置图标路径

```typescript
public setIconPath(path: string): void {
    this._iconPath = path;
    console.log(`[CollectibleItem] ${this.collectibleId}: 设置图标路径: ${path}`);
    this.loadIcon();
}
```

**调用位置**：
- `LevelMapManager` 生成 CollectibleItem 时
- 从 Tiled 读取 iconPath 属性后调用

#### 2. loadIcon - 加载图标

```typescript
private loadIcon(): void {
    // 优先级 1: 手动设置的 icon
    if (this.icon) {
        this.sprite.spriteFrame = this.icon;
        return;
    }

    // 优先级 2: Tiled iconPath
    if (this._iconPath && this._iconPath.length > 0) {
        this.loadIconFromPath(this._iconPath);
        return;
    }

    // 优先级 3: 类型默认图标
    if (this.autoLoadIcon) {
        const defaultPath = COLLECTIBLE_ICON_PATHS[this.collectibleType];
        this.loadIconFromPath(defaultPath);
    }
}
```

#### 3. loadIconFromPath - 从路径加载

```typescript
private loadIconFromPath(path: string): void {
    resources.load(path, SpriteFrame, (err, spriteFrame) => {
        if (err) {
            console.error(`[CollectibleItem] ${this.collectibleId}: 加载图标失败: ${path}`, err);
            return;
        }

        if (spriteFrame && this.sprite) {
            this.sprite.spriteFrame = spriteFrame;
            this.icon = spriteFrame; // 保存引用
            console.log(`[CollectibleItem] ${this.collectibleId}: 成功加载图标: ${path}`);
        }
    });
}
```

### LevelMapManager 集成

#### 关键代码

```typescript
if (name === "collectible") {
    const collectibleItem = newNode.getComponent(CollectibleItem);
    if (collectibleItem) {
        const props = object.properties || {};
        const collectibleId = String(props["collectibleId"] || "...");
        const typeStr = String(props["type"] || "time_fragment");
        const iconPath = String(props["iconPath"] || "");

        collectibleItem.collectibleId = collectibleId;
        const collectibleType = this.parseCollectibleType(typeStr);
        collectibleItem.collectibleType = collectibleType;

        // 设置图标路径（如果有）
        if (iconPath && iconPath.length > 0) {
            collectibleItem.setIconPath(iconPath);
        }

        const manager = CollectibleManager.getInstance();
        manager.registerCollectible(this.node.name || "Level", collectibleId, collectibleType);

        console.log(`[Collectible] 生成收集物: ${collectibleId}, 类型: ${collectibleType}, 图标路径: ${iconPath || '使用默认'}, 位置: ...`);
    }
}
```

---

## 调试指南

### 检查图标加载

**查看 Console 日志**：

成功加载：
```
[CollectibleItem] L1_C001: 设置图标路径: textures/collectibles/special_coin
[CollectibleItem] L1_C001: 成功加载图标: textures/collectibles/special_coin
```

使用手动图标：
```
[CollectibleItem] L1_C002: 使用手动设置的图标
```

使用默认图标：
```
[CollectibleItem] L1_C003: 找不到类型 COIN 的默认图标路径
[CollectibleItem] L1_C003: 加载图标失败: textures/collectibles/coin
```

### 常见问题

**Q: 图标不显示？**

A: 检查以下几点：
1. 资源路径是否正确
2. 资源是否已导入 Cocos Creator
3. Sprite 组件是否已添加
4. 资源文件是否存在

**Q: 使用的是错误图标？**

A: 检查加载优先级：
1. Inspector 中的 Icon 属性是否已设置
2. Tiled 中的 iconPath 属性是否正确
3. 默认图标路径是否正确

**Q: 不同类型的收集物图标相同？**

A: 检查以下几点：
1. CollectibleType 是否正确设置
2. 默认图标路径映射是否正确
3. 资源文件是否正确命名

---

## 性能优化建议

### 1. 资源预加载

在关卡加载前预加载所有图标：

```typescript
// 在 CollectibleManager 中添加预加载方法
preloadAllIcons(callback: Function) {
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

### 2. 对象池

对于大量相同类型的收集物，使用对象池：

```typescript
// 预先创建对象池
collectiblePool = new NodePool(() => {
    return instantiate(this.collectiblePrefab);
});
```

### 3. SpriteAtlas

使用 SpriteAtlas 替代单张图片，提升性能。

---

## 总结

### 核心特性

✅ **三层图标加载** - 手动、Tiled、默认
✅ **灵活配置** - 每个收集物可独立配置
✅ **类型系统** - 完整支持所有 CollectibleType
✅ **易于扩展** - 支持自定义图标和类型
✅ **向后兼容** - 保留原有功能

### 使用建议

1. **普通收集物**：使用类型默认图标
2. **特殊收集物**：使用 Tiled iconPath
3. **测试调试**：使用手动图标

### 文件清单

- `Scripts/Objects/CollectibleItem.ts` - 已更新，支持三层图标加载
- `Scripts/GamePlay/LevelMapManager.ts` - 已更新，支持读取 iconPath
- `CollectibleSystemGuide.md` - 已更新，补充图标系统说明

---

**所有功能已实现并文档化！**
