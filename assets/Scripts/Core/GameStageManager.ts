import { _decorator, Component, Node, Prefab, instantiate, Input, input, KeyCode, tween, Camera, Rect, Widget } from 'cc';
import { PlayerController } from '../GamePlay/PlayerController';
const { ccclass, property } = _decorator;

// 类似于 Rust 的 enum 状态定义
export enum GameState {
    Menu,
    Intro,
    Playing,
    Credits
}

@ccclass('GameStageManager')
export class GameManager extends Component {

    // --- 引用绑定 ---
    @property(Node) uiRoot: Node = null;
    @property(Node) gameWorld: Node = null;
    @property(Node) introLayer: Node = null;
    @property(Camera) mainCamera: Camera = null;

    @property(Prefab) levelPrefabs: Prefab[] = []; // 关卡列表
    @property(Node) startMenuNode: Node = null;
    @property(Node) creditsNode: Node = null;

    // --- 状态数据 ---
    private _currentState: GameState = GameState.Menu;
    private _currentLevelIndex: number = 0;
    private _currentPlayer: PlayerController = null;

    start() {
        // 游戏启动，先进入菜单
        this.switchState(GameState.Menu);
    }

    // --- 状态机核心 (State Machine) ---
    public switchState(newState: GameState) {
        this._currentState = newState;

        switch (newState) {
            case GameState.Menu:
                this.enterMenu();
                break;
            case GameState.Intro:
                this.enterIntro();
                break;
            case GameState.Playing:
                this.enterPlaying();
                break;
            case GameState.Credits:
                this.enterCredits();
                break;
        }
    }

    // --- 1. 开始界面 ---
    private enterMenu() {
        this.startMenuNode.active = true;
        this.creditsNode.active = false;
        this.introLayer.active = false;
        this.gameWorld.active = false; // 暂时隐藏游戏世界
    }

    // --- 2. 开场动画 (最复杂的部分) ---
    private enterIntro() {
        this.startMenuNode.active = false;
        this.introLayer.active = true; // 显示右下角盖章动画
        this.gameWorld.active = true;  // 显示游戏世界

        // A. 加载第一关
        this.loadLevel(0);

        // B. 设置摄像机视口到左上角 (实现小窗口效果)
        // x=0, y=0.7 (保留顶部30%区域), w=0.3, h=0.3
        this.mainCamera.rect = new Rect(0, 0.7, 0.3, 0.3);

        // C. 允许玩家控制 (题目要求：可游玩)
        if (this._currentPlayer) {
            this._currentPlayer.setInputActive(true);
        }

        // D. 播放过渡动画：视口从左上角变大到全屏
        // 这里假设 3秒后变大，或者等待某个盖章事件触发
        this.scheduleOnce(() => {
            this.playZoomInAnim();
        }, 3.0);
    }

    private playZoomInAnim() {
        // 使用一个临时对象做 Tween
        let tempObj = { 
            x: 0, y: 0.7, w: 0.3, h: 0.3 // 初始值
        };

        tween(tempObj)
            .to(2.0, { x: 0, y: 0, w: 1, h: 1 }, { // 目标值：全屏
                easing: 'cubicOut',
                onUpdate: () => {
                    // 每一帧更新摄像机 Rect
                    this.mainCamera.rect = new Rect(tempObj.x, tempObj.y, tempObj.w, tempObj.h);
                }
            })
            .call(() => {
                // 动画结束，隐藏盖章层，正式进入关卡循环
                this.introLayer.active = false;
                this.switchState(GameState.Playing);
            })
            .start();
    }

    // --- 3. 正式关卡 ---
    private enterPlaying() {
        // 此时已经是全屏了，逻辑主要是监听关卡结束
        console.log("进入正式游玩状态");
    }

    public onLevelComplete() {
        this._currentLevelIndex++;
        if (this._currentLevelIndex < this.levelPrefabs.length) {
            this.loadLevel(this._currentLevelIndex);
        } else {
            // 通关了，去 Staff 表
            this.switchState(GameState.Credits);
        }
    }

    // --- 4. 职员表 ---
    private enterCredits() {
        this.gameWorld.active = false;
        this.creditsNode.active = true;
        // 播放滚动动画...
    }

    // --- 辅助方法：加载关卡 ---
    private loadLevel(index: number) {
        // 清理旧关卡
        this.gameWorld.removeAllChildren();
        
        // 实例化新关卡
        const levelNode = instantiate(this.levelPrefabs[index]);
        this.gameWorld.addChild(levelNode);

        // 找到主角脚本 (假设主角在 Level Prefab 里)
        // 或者主角是全局的，这里只重置位置
        this._currentPlayer = levelNode.getComponentInChildren(PlayerController);
    }
}