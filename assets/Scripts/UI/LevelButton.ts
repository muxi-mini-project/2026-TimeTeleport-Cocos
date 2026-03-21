import { _decorator, Component, Label, Sprite, SpriteFrame, Color, director, Button, sys } from 'cc';
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

    onLoad() {
        this.ensureClickBinding();
    }

    /** 确保点击事件已绑定（始终用代码绑定，保证跳转功能可靠，避免预制体 component 引用错误） */
    private ensureClickBinding() {
        const btn = this.node.getComponent(Button);
        if (!btn) return;
        btn.node.on(Button.EventType.CLICK, this.onClickLevel, this);
    }

    /** 设置背景图片 */
    public setBackgroundSprite(spriteFrame: SpriteFrame) {
        if (this.background && spriteFrame) {
            this.background.spriteFrame = spriteFrame;
            console.log(`[LevelButton] 背景已替换: ${spriteFrame.name}`);
        } else {
            console.warn(`[LevelButton] 背景替换失败！background: ${this.background}, spriteFrame: ${spriteFrame}`);
        }
    }

    // 初始化关卡按钮
    public init(levelInfo: LevelInfo, isLocked: boolean, collectedCount: number, totalCount: number) {
        this.levelIndex = levelInfo.index;
        this.sceneName = levelInfo.sceneName;
        this.isLocked = isLocked;

        // 设置关卡名称：锁定时显示???，解锁后清空，由背景图片显示编号
        if (this.nameLabel) {
            this.nameLabel.string = isLocked ? '???' : '';
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

        // 锁定状态下按钮不可点击，解锁后恢复可点击
        const btn = this.node.getComponent(Button);
        if (btn) {
            btn.interactable = !isLocked;
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

            // 记录当前关卡索引，供 Checkpoint 终点逻辑在通关时解锁下一关使用
            try {
                const storage = sys?.localStorage;
                if (storage) {
                    storage.setItem('LevelSelect_CurrentLevelIndex', String(this.levelIndex));
                }
            } catch (e) {
                console.warn('[LevelButton] 记录当前关卡索引失败', e);
            }

            director.loadScene(this.sceneName);
        } else {
            console.error(`关卡 ${this.levelIndex + 1} 没有配置场景文件！`);
        }
    }
}
