# Tiled 地图配置指南 - 收集物

本文档详细说明如何在 Tiled 地图编辑器中配置收集物。

## 前置条件

- 已安装 Tiled 地图编辑器
- 已有项目地图文件（.tmx）
- 已准备好收集物预制体

## 快速开始

### 1. 打开地图文件

用 Tiled 打开项目的 `.tmx` 文件，例如 `assets/Map/long.tmx`。

### 2. 选择对象层

在右侧图层面板，选择 `Objects` 层。如果不存在，右键创建新对象层并命名为 `Objects`。

### 3. 绘制收集物区域

1. 点击工具栏的 **插入矩形** 工具（或按 R 键）
2. 在地图上绘制一个矩形区域（建议 32x32 像素）
3. 该区域即为收集物的碰撞触发范围

### 4. 设置对象名称

选中绘制的矩形，在左侧属性面板中：
- 将 **Name** 设置为 `collectible`（必须小写）

### 5. 添加自定义属性

在属性面板底部，点击 **+** 按钮添加以下属性：

#### 必填属性

| 属性名 | 类型 | 值 |
|--------|------|-----|
| `collectibleId` | String | 唯一 ID，如 `Level_1_chip_01` |
| `type` | String | 收集物类型 |

#### 可选属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `timeState` | String | `both` | 时间状态控制 |

## 属性详解

### collectibleId（必填）

收集物的唯一标识符，用于保存收集状态。

**命名规范：**
- 格式：`{关卡ID}_{类型}_{序号}`
- 示例：`Level_1_chip_01`、`Level_2_fossil_03`

### type（必填）

收集物类型，决定显示的图标和分类。

| 值 | 说明 | 推荐时间线 |
|----|------|-----------|
| `time_fragment` 或 `fragment` | 时间碎片 | both |
| `future_chip` 或 `chip` | 未来芯片 | future |
| `ancient_fossil` 或 `fossil` | 远古化石 | past |
| `ccnu_letter` 或 `letter` | 信件 | both |

### timeState（可选）

控制收集物在哪个时间线可见。

| 值 | 说明 |
|----|------|
| `past` | 仅在过去时间线显示 |
| `future` | 仅在未来时间线显示 |
| `both` | 两个时间线都显示（默认）|

## 配置示例

### 示例 1：基础配置

```
Name: collectible
位置: (100, 200)
尺寸: 32 x 32

自定义属性:
  collectibleId: Level_1_fragment_01
  type: time_fragment
```

此收集物在两个时间线都可见。

### 示例 2：仅在未来可见

```
Name: collectible
位置: (300, 150)
尺寸: 32 x 32

自定义属性:
  collectibleId: Level_1_chip_01
  type: future_chip
  timeState: future
```

此收集物仅在未来时间线可见，切换到过去时自动隐藏。

### 示例 3：仅在过去可见

```
Name: collectible
位置: (500, 300)
尺寸: 32 x 32

自定义属性:
  collectibleId: Level_1_fossil_01
  type: ancient_fossil
  timeState: past
```

此收集物仅在过去时间线可见。

## 批量添加技巧

### 方法 1：复制对象

1. 配置好一个收集物对象
2. 选中后按 Ctrl+D 复制
3. 修改 `collectibleId` 和位置

### 方法 2：使用模板

在 Tiled 中创建模板文件（.tx）：
1. 配置好收集物对象
2. 右键 → 保存为模板
3. 从模板面板拖拽使用

## 验证配置

### Tiled 中检查

1. 选中收集物对象
2. 查看属性面板是否完整
3. 确认 `collectibleId` 唯一

### Cocos Creator 中验证

运行游戏后，控制台应显示：

```
[Collectible] 生成收集物: Level_1_chip_01, 类型: future_chip, 时间状态: future, 位置: (300.0, 150.0)
```

如果显示错误：

```
[Collectible] collectibleId 必须在 Tiled 中指定！对象位置: (100.0, 200.0)
```

说明该收集物缺少 `collectibleId` 属性。

## 常见问题

### Q: 收集物在游戏中不显示？

检查以下几点：
1. 对象 name 是否为 `collectible`（小写）
2. `timeState` 是否与当前时间线匹配
3. 预制体是否正确绑定到 LevelMapManager

### Q: 碰撞检测不工作？

1. 确保对象有尺寸（width/height）
2. 检查玩家节点名称以 `Player` 开头
3. 确认收集物预制体有 Collider2D 组件

### Q: 切换时间线后收集物状态不对？

1. 检查 `timeState` 属性设置
2. 确认已收集的收集物会被自动隐藏

## 相关文档

- [CollectibleSystemGuide.md](CollectibleSystemGuide.md) - 收集物系统完整指南
- [地图编辑器教程.md](MapEditorTutorial/地图编辑器教程.md) - Tiled 基础教程
