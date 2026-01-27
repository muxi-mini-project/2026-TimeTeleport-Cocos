# Hierarchy 结构组织指南

基于 `GameStageManager.ts` 的游戏状态管理系统，建议按以下结构组织 Hierarchy。

## 推荐的 Hierarchy 结构

```
Canvas (UIRoot)
├── GameManager (挂载 GameManager 组件)
├── MainCamera
├── StartMenu
│   └── ... 开始界面 UI 元素
├── IntroLayer
│   ├── PaperStack (挂载 PaperStack)
│   │   └── Paper (多张纸，通过预制体实例化)
│   └── Stamp (挂载 StampController)
│       └── ... 印章视觉元素
├── GameWorld
│   └── Player (挂载 PlayerController)
│   └── ... 关卡场景内容（通过 director.loadScene 加载）
└── Credits
    └── ... 职员表 UI 元素
```

## GameManager 组件绑定

在 Canvas 节点的 GameManager 组件中绑定以下属性：

| 属性名 | 绑定节点 | 说明 |
|--------|---------|------|
| `uiRoot` | Canvas | UI 根节点 |
| `gameWorld` | GameWorld | 游戏世界容器 |
| `introLayer` | IntroLayer | 开场动画/盖章游戏层 |
| `mainCamera` | MainCamera | 主摄像机 |
| `startMenuNode` | StartMenu | 开始菜单节点 |
| `creditsNode` | Credits | 职员表节点 |

## 关卡场景加载方式

使用 `director.loadScene()` 加载独立场景文件：
- 每个关卡是一个独立的 `.scene` 文件
- 场景内包含该关卡的游戏世界内容
- 通过 `levelScenes` 数组配置关卡名称列表
- 关卡切换时会卸载当前场景并加载新场景

## 状态激活逻辑

### Menu 状态
- 激活：`StartMenu`
- 禁用：`IntroLayer`、`GameWorld`、`Credits`
- 子状态：无

### Intro 状态
- 激活：`IntroLayer`（盖章游戏）、`GameWorld`（小窗口模式）
- 禁用：`StartMenu`、`Credits`
- 子状态：`GameWorldActive`、`StampGameActive`、`PlayerControlActive`
- 摄像机设置为小窗口模式，游戏世界和盖章小游戏可同时操作

### Playing 状态
- 激活：`GameWorld`（全屏模式）
- 禁用：`StartMenu`、`IntroLayer`、`Credits`
- 子状态：`GameWorldActive`、`PlayerControlActive`、`FullscreenMode`

### Credits 状态
- 激活：`Credits`
- 禁用：`StartMenu`、`IntroLayer`、`GameWorld`
- 子状态：无

## 组件依赖关系

### IntroLayer
- `PaperStack` 管理纸张堆叠
- `StampController` 处理印章输入和盖章动画
- 两者通过组件引用相互协作

### GameWorld
- 包含 `PlayerController` 控制的玩家角色
- 场景加载后通过 `findPlayerController()` 查找并缓存引用
- 根据 `PlayerControlActive` 子状态控制玩家输入

## 关卡配置示例

在 Inspector 中配置 `levelScenes` 数组：
```
["Level1", "Level2", "Level3"]
```

每个关卡会自动生成配置：
```typescript
{
    id: "Level_1",
    name: "Level 1",
    index: 0,
    sceneName: "Level1"
}
```

## 摄像机控制

- **小窗口模式**：`rect = (0, 0.7, 0.3, 0.3)` - 位于左上角
- **全屏模式**：`rect = (0, 0, 1, 1)` - 全屏显示
- 使用 `tween` 动画平滑过渡
- 过渡时间可通过 `zoomInDuration` 配置
