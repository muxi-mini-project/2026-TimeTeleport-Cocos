// ==================== 导入部分 ====================
import { _decorator, Component, Node, director, Label, UITransform, Sprite } from 'cc';
import { GameManager } from '../Core/GameStageManager';
const { ccclass, property } = _decorator;

// ==================== 类定义 ====================
@ccclass('StartMenu')
export class StartMenu extends Component {

    @property(Node)
    startBtn: Node = null;

    @property(Node)
    settingsBtn: Node = null;

    @property(Node)
    aboutBtn: Node = null;

    @property(Label)
    versionLabel: Label = null;

    /** 背景节点（用于在 Inspector 中统一调整背景尺寸） */
    @property(Node)
    backgroundNode: Node = null;

    @property({ tooltip: '>0 时在 onLoad 时设置背景宽度' })
    backgroundWidth: number = 0;

    @property({ tooltip: '>0 时在 onLoad 时设置背景高度' })
    backgroundHeight: number = 0;

    @property({ tooltip: '>0 时在 onLoad 时设置开始/设置/关于按钮宽度（含图片）' })
    buttonWidth: number = 0;

    @property({ tooltip: '>0 时在 onLoad 时设置开始/设置/关于按钮高度（含图片）' })
    buttonHeight: number = 0;

    onLoad() {
        if (this.versionLabel) {
            this.versionLabel.string = 'v1.0.0';
        }
        this.applySizes();
    }

    private applySizes() {
        const ui = (n: Node) => n?.getComponent(UITransform);
        if (this.backgroundNode && this.backgroundWidth > 0 && this.backgroundHeight > 0) {
            const t = ui(this.backgroundNode);
            if (t) t.setContentSize(this.backgroundWidth, this.backgroundHeight);
        }
        if (this.buttonWidth > 0 && this.buttonHeight > 0) {
            for (const btn of [this.startBtn, this.settingsBtn, this.aboutBtn]) {
                if (btn) {
                    const t = ui(btn);
                    if (t) t.setContentSize(this.buttonWidth, this.buttonHeight);
                    // 若按钮上有 Sprite 且为 TRIMMED 模式，需同步设置 Sprite 所在节点的尺寸
                    const sprite = btn.getComponent(Sprite);
                    if (sprite && sprite.node !== btn) {
                        const st = ui(sprite.node);
                        if (st) st.setContentSize(this.buttonWidth, this.buttonHeight);
                    }
                }
            }
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
        director.loadScene('Settings');
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
