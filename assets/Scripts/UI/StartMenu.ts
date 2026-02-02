// ==================== 导入部分 ====================
// 从 Cocos Creator 导入需要的类
// _decorator: 装饰器工厂，用于创建 @ccclass 和 @property
// Component: 组件基类，所有脚本都继承它
// Node: 节点类，Cocos 场景中所有物体都是节点
// director: 导演类，用于场景切换
// Label: 文字标签组件
import { _decorator, Component, Node, director, Label } from 'cc';

// 导入 GameManager（暂时未用到，预留给后续开场动画功能）
import { GameManager } from '../Core/GameStageManager';

// 从 _decorator 解构出两个装饰器
// @ccclass: 标记这是一个 Cocos 组件类
// @property: 标记这个属性可以在编辑器 Inspector 中配置
const { ccclass, property } = _decorator;

// ==================== 类定义 ====================
// 注册为 Cocos 组件，编辑器中显示名为 "StartMenu"
@ccclass('StartMenu')
export class StartMenu extends Component {

    // ==================== 可配置属性 (@property) ====================
    // 这些变量会在 Cocos 编辑器的 Inspector 面板中显示
    // 你可以直接在编辑器中拖拽节点来赋值，无需修改代码

    @property(Node)           // 声明这是一个节点类型的属性
    startBtn: Node = null;   // 开始游戏按钮的引用
    // = null 是默认值，表示未绑定，需要在编辑器中拖入

    @property(Node)
    settingsBtn: Node = null; // 设置按钮的引用

    @property(Node)
    aboutBtn: Node = null;     // 关于按钮的引用

    @property(Label)
    versionLabel: Label = null; // 版本号文字的引用

    // ==================== 生命周期函数 ====================

    // onLoad: 脚本组件加载时自动调用（只执行一次）
    onLoad() {
        // 如果绑定了版本号 Label，显示版本号
        if (this.versionLabel) {  // 检查是否为空，防止报错
            this.versionLabel.string = 'v1.0.0';  // 设置文字内容
        }
    }

    // ==================== 按钮点击事件 ====================

    // onClickStart: 开始游戏按钮点击时调用
    onClickStart() {
        director.loadScene('LevelSelect');  // 切换到关卡选择场景
        // 'LevelSelect' 是场景文件名（不包含 .scene 后缀）
    }

    // onClickNewGame: 开始新游戏（跳过关卡选择）
    onClickNewGame() {
        console.log('开始新游戏 - 进入开场动画');
        // TODO: 后续添加开场动画逻辑
        // 例如：加载带有 GameStageManager 的场景，然后调用 switchState(GameState.Intro)
    }

    // onClickSettings: 设置按钮点击
    onClickSettings() {
        console.log('打开设置界面');
        // TODO: 创建并显示设置面板
    }

    // onClickAbout: 关于按钮点击
    onClickAbout() {
        console.log('打开关于界面');
        // TODO: 创建并显示关于面板
    }

    // onClickExit: 退出游戏
    onClickExit() {
        console.log('退出游戏');
        // Web 端不需要退出功能
        // 桌面端可以调用：if (typeof cc.sys !== 'undefined' && cc.sys.isNative) cc.game.end();
    }
}
