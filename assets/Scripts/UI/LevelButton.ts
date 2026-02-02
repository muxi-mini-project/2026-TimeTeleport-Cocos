import { _decorator, Component, Label, Sprite, Color, director } from 'cc';
const { ccclass, property } = _decorator;

// 关卡信息配置（不使用@property，仅在代码中使用）
export interface LevelInfo {
    id: string;           // 关卡ID (如 "Level_1")
    name: string;         // 关卡显示名称 (如 "第一章 - 初入时空")
    sceneName: string;    // 场景文件名 (如 "scene")
    description?: string;  // 关卡描述 (可选)
    index: number;         // 关卡序号 (从0开始)
}

// 关卡按钮预制体组件
@ccclass('LevelButton')
export class LevelButton extends Component {
    @property(Label)
    nameLabel: Label = null;

    @property(Label)
    progressLabel: Label = null;

    @property(Sprite)
    lockIcon: Sprite = null;

    @property(Sprite)
    background: Sprite = null;

    private levelIndex: number = -1;
    private isLocked: boolean = true;
    private sceneName: string = '';

    // 初始化关卡按钮
    public init(levelInfo: LevelInfo, isLocked: boolean, collectedCount: number, totalCount: number) {
        this.levelIndex = levelInfo.index;
        this.sceneName = levelInfo.sceneName;
        this.isLocked = isLocked;

        // 设置关卡名称
        if (this.nameLabel) {
            this.nameLabel.string = isLocked ? '???' : levelInfo.name;
        }

        // 设置进度显示
        if (this.progressLabel) {
            if (isLocked) {
                this.progressLabel.string = '';
            } else {
                const percentage = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;
                this.progressLabel.string = `${collectedCount}/${totalCount} (${percentage}%)`;
            }
        }

        // 设置锁定图标显示
        if (this.lockIcon) {
            this.lockIcon.node.active = isLocked;
        }

        // 设置按钮背景颜色
        if (this.background) {
            if (isLocked) {
                this.background.color = new Color(100, 100, 100, 255); // 灰色
            } else if (collectedCount >= totalCount && totalCount > 0) {
                this.background.color = new Color(100, 200, 100, 255); // 绿色 - 完美通关
            } else {
                this.background.color = new Color(255, 255, 255, 255); // 白色 - 正常
            }
        }
    }

    // 点击关卡按钮
    onClickLevel() {
        if (this.isLocked) {
            console.log('该关卡尚未解锁！');
            return;
        }

        if (this.sceneName) {
            console.log(`加载关卡场景: ${this.sceneName}`);
            director.loadScene(this.sceneName);
        } else {
            console.error(`关卡 ${this.levelIndex + 1} 没有配置场景文件！`);
        }
    }
}
