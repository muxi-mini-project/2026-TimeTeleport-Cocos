import { _decorator, Component, Node, Prefab, instantiate, Input, input, KeyCode, tween, Camera, Rect, Widget, Canvas, director, find } from 'cc';
import { PlayerController } from '../GamePlay/PlayerController';
import { CollectibleManager } from './CollectibleManager';
const { ccclass, property } = _decorator;

// 关卡配置接口
export interface LevelConfig {
    id: string;           // 关卡唯一 ID
    name: string;         // 关卡显示名称
    index: number;        // 关卡索引
    sceneName?: string;    // 场景名称（使用 LoadScene 时）
    prefab?: Prefab;       // 关卡预制体（使用 instantiate 时）
}

// 游戏状态枚举
export enum GameState {
    Menu,
    Intro,          // 开场动画状态（游戏世界小窗口 + 盖章小游戏）
    Playing,        // 正式游玩状态（全屏游戏世界）
    Credits
}

// 子状态标志位（可以同时激活多个）
export enum SubState {
    None = 0,
    GameWorldActive = 1 << 0,     // 游戏世界激活
    StampGameActive = 1 << 1,     // 盖章小游戏激活
    PlayerControlActive = 1 << 2,  // 玩家控制激活
    FullscreenMode = 1 << 3       // 全屏模式
}

@ccclass('GameStageManager')
export class GameManager extends Component {

    // --- 引用绑定 ---
    @property(Node) uiRoot: Node = null;
    @property(Node) gameWorld: Node = null;
    @property(Node) introLayer: Node = null;
    @property(Camera) mainCamera: Camera = null;

    @property({ tooltip: "关卡列表（场景名称数组）" })
    levelScenes: string[] = [];

    @property(Node) startMenuNode: Node = null;
    @property(Node) creditsNode: Node = null;

    // --- 摄像机配置 ---
    @property({ tooltip: "小窗口的初始位置 X" })
    smallWindowX: number = 0;

    @property({ tooltip: "小窗口的初始位置 Y (0-1)" })
    smallWindowY: number = 0.7;

    @property({ tooltip: "小窗口的宽度 (0-1)" })
    smallWindowWidth: number = 0.3;

    @property({ tooltip: "小窗口的高度 (0-1)" })
    smallWindowHeight: number = 0.3;

    @property({ tooltip: "从小窗口放大到全屏的时间（秒）" })
    zoomInDuration: number = 2.0;

    @property({ tooltip: "开场动画等待时间（秒）" })
    introDelay: number = 3.0;

    // --- 状态数据 ---
    private _currentState: GameState = GameState.Menu;
    private _currentLevelIndex: number = 0;
    private _currentPlayer: PlayerController = null;
    private _currentLevelConfig: LevelConfig | null = null;
    private _levelConfigs: LevelConfig[] = [];
    private _subStates: SubState = SubState.None;
    private _zoomTween: any = null;

    // --- 关卡 ID 配置 ---
    @property({ tooltip: "关卡 ID 前缀" })
    levelIdPrefix: string = "Level";

    // --- 关卡切换事件 ---
    private _levelLoadListeners: ((config: LevelConfig) => void)[] = [];
    private _levelUnloadListeners: ((config: LevelConfig) => void)[] = [];

    // --- 开场动画事件 ---
    private _introCompleteListeners: (() => void)[] = [];

    start() {
        // 初始化关卡配置
        this.initializeLevelConfigs();

        // 游戏启动，先进入菜单
        this.switchState(GameState.Menu);
    }

    private initializeLevelConfigs() {
        this._levelConfigs = [];

        for (let i = 0; i < this.levelScenes.length; i++) {
            const config: LevelConfig = {
                id: `${this.levelIdPrefix}_${i + 1}`,
                name: `${this.levelIdPrefix} ${i + 1}`,
                index: i,
                sceneName: this.levelScenes[i]
            };
            this._levelConfigs.push(config);
        }

        console.log(`[GameStageManager] 初始化了 ${this._levelConfigs.length} 个关卡配置`);
    }

    // --- 状态机核心 (State Machine) ---
    public switchState(newState: GameState) {
        const oldState = this._currentState;
        this._currentState = newState;

        // 清理旧状态的子状态
        this.clearSubStates();

        console.log(`[GameStageManager] 状态切换: ${GameState[oldState]} -> ${GameState[newState]}`);

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

    // --- 子状态管理 ---
    private setSubState(state: SubState, active: boolean) {
        if (active) {
            this._subStates |= state;
        } else {
            this._subStates &= ~state;
        }
        console.log(`[GameStageManager] 子状态更新: ${this.getSubStateString()}`);
    }

    private hasSubState(state: SubState): boolean {
        return (this._subStates & state) !== 0;
    }

    private clearSubStates() {
        this._subStates = SubState.None;
    }

    private getSubStateString(): string {
        const states: string[] = [];
        if (this.hasSubState(SubState.GameWorldActive)) states.push('GameWorldActive');
        if (this.hasSubState(SubState.StampGameActive)) states.push('StampGameActive');
        if (this.hasSubState(SubState.PlayerControlActive)) states.push('PlayerControlActive');
        if (this.hasSubState(SubState.FullscreenMode)) states.push('FullscreenMode');
        return states.length > 0 ? states.join('+') : 'None';
    }

    // --- 1. 开始界面 ---
    private enterMenu() {
        this.startMenuNode.active = true;
        this.creditsNode.active = false;
        this.introLayer.active = false;
        this.gameWorld.active = false;

        // 禁用玩家控制
        this.setSubState(SubState.PlayerControlActive, false);
        if (this._currentPlayer) {
            this._currentPlayer.setInputActive(false);
        }
    }

    // --- 2. 开场动画 (核心改进：游戏世界和盖章小游戏同时可玩) ---
    private enterIntro() {
        // UI 层级控制
        this.startMenuNode.active = false;
        this.creditsNode.active = false;
        this.introLayer.active = true;      // 显示盖章层
        this.gameWorld.active = true;         // 显示游戏世界

        // 设置子状态：游戏世界、盖章游戏、玩家控制都激活
        this.setSubState(SubState.GameWorldActive, true);
        this.setSubState(SubState.StampGameActive, true);
        this.setSubState(SubState.PlayerControlActive, true);

        // A. 加载第一关
        this.loadLevel(0);

        // B. 设置摄像机到小窗口模式
        this.setCameraToSmallWindow();

        // C. 激活玩家控制（确保小窗口游戏世界可玩）
        if (this._currentPlayer) {
            this._currentPlayer.setInputActive(true);
        }

        // D. 安排动画播放
        this.scheduleOnce(() => {
            this.playZoomInAnim();
        }, this.introDelay);
    }

    private setCameraToSmallWindow() {
        // 设置摄像机视口到左上角
        this.mainCamera.rect = new Rect(
            this.smallWindowX,
            this.smallWindowY,
            this.smallWindowWidth,
            this.smallWindowHeight
        );

        this.setSubState(SubState.FullscreenMode, false);
        console.log(`[GameStageManager] 摄像机设置为小窗口模式: x=${this.smallWindowX}, y=${this.smallWindowY}, w=${this.smallWindowWidth}, h=${this.smallWindowHeight}`);
    }

    private playZoomInAnim() {
        // 停止之前的动画（如果存在）
        if (this._zoomTween) {
            this._zoomTween.stop();
            this._zoomTween = null;
        }

        // 使用临时对象做 Tween
        const tempObj = {
            x: this.smallWindowX,
            y: this.smallWindowY,
            w: this.smallWindowWidth,
            h: this.smallWindowHeight
        };

        console.log(`[GameStageManager] 开始放大动画: 从(${tempObj.x},${tempObj.y},${tempObj.w},${tempObj.h})到全屏`);

        this._zoomTween = tween(tempObj)
            .to(this.zoomInDuration, {
                x: 0,
                y: 0,
                w: 1,
                h: 1
            }, {
                easing: 'cubicOut',
                onUpdate: () => {
                    // 每一帧更新摄像机 Rect
                    this.mainCamera.rect = new Rect(tempObj.x, tempObj.y, tempObj.w, tempObj.h);
                }
            })
            .call(() => {
                console.log(`[GameStageManager] 放大动画完成，进入全屏模式`);
                // 动画结束，隐藏盖章层，正式进入全屏游玩状态
                this.introLayer.active = false;
                this.setSubState(SubState.StampGameActive, false);
                this.setSubState(SubState.FullscreenMode, true);

                // 通知开场动画完成
                this.notifyIntroComplete();

                // 切换到 Playing 状态
                this.switchState(GameState.Playing);
            })
            .start();
    }

    // --- 3. 正式关卡 ---
    private enterPlaying() {
        // 此时已经是全屏了，游戏世界和玩家控制都已激活
        this.setSubState(SubState.GameWorldActive, true);
        this.setSubState(SubState.PlayerControlActive, true);
        this.setSubState(SubState.FullscreenMode, true);

        console.log(`[GameStageManager] 进入正式游玩状态，子状态: ${this.getSubStateString()}`);
    }

    // --- 4. 演员 ---
    private enterCredits() {
        this.gameWorld.active = false;
        this.creditsNode.active = true;
        this.introLayer.active = false;

        // 清理所有子状态
        this.clearSubStates();

        // 禁用玩家控制
        if (this._currentPlayer) {
            this._currentPlayer.setInputActive(false);
        }
    }

    // --- 关卡切换系统 ---
    public onLevelComplete() {
        console.log(`[GameStageManager] 关卡 ${this._currentLevelIndex + 1} 完成`);
        this._currentLevelIndex++;

        if (this._currentLevelIndex < this.levelScenes.length) {
            this.loadLevel(this._currentLevelIndex);
        } else {
            // 通关了，去职员表
            console.log(`[GameStageManager] 所有关卡完成，进入职员表`);
            this.switchState(GameState.Credits);
        }
    }

    private loadLevel(index: number) {
        // 1. 卸载旧关卡（通知监听者）
        if (this._currentLevelConfig) {
            this.notifyLevelUnload(this._currentLevelConfig);
        }

        // 2. 获取关卡配置
        if (index < 0 || index >= this._levelConfigs.length) {
            console.error(`[GameStageManager] 关卡索引 ${index} 超出范围`);
            return;
        }

        const levelConfig = this._levelConfigs[index];
        if (!levelConfig) {
            console.error(`[GameStageManager] 找不到关卡配置，索引: ${index}`);
            return;
        }

        // 3. 使用 director.loadScene 加载关卡
        if (levelConfig.sceneName) {
            console.log(`[GameStageManager] 加载关卡场景: ${levelConfig.sceneName}`);

            // 通知关卡即将卸载
            this.notifyLevelUnload(levelConfig);

            // 加载场景
            director.loadScene(levelConfig.sceneName);

            // 场景加载完成后，在场景的 start 方法中会初始化
            // 这里需要在新场景的组件中重新获取 PlayerController 和其他引用
        } else {
            console.error(`[GameStageManager] 关卡配置缺少 sceneName: ${levelConfig.id}`);
            return;
        }

        // 4. 更新当前关卡配置
        this._currentLevelConfig = levelConfig;

        // 5. 初始化 CollectibleManager 的关卡 ID
        CollectibleManager.getInstance().initialize(levelConfig.id);

        console.log(`[GameStageManager] 加载关卡: ${levelConfig.id} (${levelConfig.name})`);
    }

    // --- 场景加载后的初始化 ---
    public onSceneLoaded() {
        // 这个方法应该在新场景加载完成后由场景的某个组件调用
        // 用于重新获取 PlayerController 引用
        this.findPlayerController();
    }

    private findPlayerController() {
        if (!this.gameWorld) {
            console.warn('[GameStageManager] gameWorld 为空，无法查找 PlayerController');
            return;
        }

        // 递归查找 PlayerController
        this._currentPlayer = this.gameWorld.getComponentInChildren(PlayerController);

        if (this._currentPlayer) {
            console.log(`[GameStageManager] 找到 PlayerController: ${this._currentPlayer.node.name}`);

            // 根据当前状态设置玩家控制
            if (this.hasSubState(SubState.PlayerControlActive)) {
                this._currentPlayer.setInputActive(true);
            }
        } else {
            console.warn('[GameStageManager] 场景中未找到 PlayerController');
        }
    }

    // --- 事件系统 ---
    public registerLevelLoadListener(callback: (config: LevelConfig) => void) {
        if (this._levelLoadListeners.indexOf(callback) === -1) {
            this._levelLoadListeners.push(callback);
        }
    }

    public unregisterLevelLoadListener(callback: (config: LevelConfig) => void) {
        const idx = this._levelLoadListeners.indexOf(callback);
        if (idx !== -1) {
            this._levelLoadListeners.splice(idx, 1);
        }
    }

    public registerLevelUnloadListener(callback: (config: LevelConfig) => void) {
        if (this._levelUnloadListeners.indexOf(callback) === -1) {
            this._levelUnloadListeners.push(callback);
        }
    }

    public unregisterLevelUnloadListener(callback: (config: LevelConfig) => void) {
        const idx = this._levelUnloadListeners.indexOf(callback);
        if (idx !== -1) {
            this._levelUnloadListeners.splice(idx, 1);
        }
    }

    public registerIntroCompleteListener(callback: () => void) {
        if (this._introCompleteListeners.indexOf(callback) === -1) {
            this._introCompleteListeners.push(callback);
        }
    }

    public unregisterIntroCompleteListener(callback: () => void) {
        const idx = this._introCompleteListeners.indexOf(callback);
        if (idx !== -1) {
            this._introCompleteListeners.splice(idx, 1);
        }
    }

    private notifyLevelLoad(config: LevelConfig) {
        for (const callback of this._levelLoadListeners) {
            callback(config);
        }
    }

    private notifyLevelUnload(config: LevelConfig) {
        for (const callback of this._levelUnloadListeners) {
            callback(config);
        }
    }

    private notifyIntroComplete() {
        for (const callback of this._introCompleteListeners) {
            callback();
        }
    }

    // --- 公共 API ---
    public getCurrentState(): GameState {
        return this._currentState;
    }

    public getCurrentLevelConfig(): LevelConfig | null {
        return this._currentLevelConfig;
    }

    public getCurrentLevelId(): string {
        return this._currentLevelConfig?.id || "";
    }

    public getLevelConfigById(id: string): LevelConfig | null {
        return this._levelConfigs.find(c => c.id === id) || null;
    }

    public getLevelConfigByIndex(index: number): LevelConfig | null {
        if (index < 0 || index >= this._levelConfigs.length) {
            return null;
        }
        return this._levelConfigs[index];
    }

    public getLevelCount(): number {
        return this._levelConfigs.length;
    }

    public isLastLevel(): boolean {
        return this._currentLevelIndex >= this.levelScenes.length - 1;
    }

    public isIntroComplete(): boolean {
        return this._currentState === GameState.Playing || this._currentState === GameState.Credits;
    }

    public isStampGameActive(): boolean {
        return this.hasSubState(SubState.StampGameActive);
    }

    public isGameWorldActive(): boolean {
        return this.hasSubState(SubState.GameWorldActive);
    }

    public isPlayerControlActive(): boolean {
        return this.hasSubState(SubState.PlayerControlActive);
    }

    public isFullscreenMode(): boolean {
        return this.hasSubState(SubState.FullscreenMode);
    }

    // --- 清理 ---
    onDestroy() {
        // 停止所有 Tween
        if (this._zoomTween) {
            this._zoomTween.stop();
            this._zoomTween = null;
        }

        // 清理所有监听器
        this._levelLoadListeners = [];
        this._levelUnloadListeners = [];
        this._introCompleteListeners = [];
    }
}
