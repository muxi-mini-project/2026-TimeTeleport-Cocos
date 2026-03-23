import { _decorator, Component, Node, director, Prefab, instantiate, Label, UITransform, Button, sys, SpriteFrame } from 'cc';
import { CollectibleManager } from '../Core/CollectibleManager';
import { LevelButton, LevelInfo, LevelCollectiblesConfig } from './LevelButton';
const { ccclass, property } = _decorator;

@ccclass('LevelSelect')
export class LevelSelect extends Component {

    /** 本地存储用的 key，用于记录已解锁的最大关卡索引 */
    private static readonly STORAGE_KEY_MAX_UNLOCKED = 'LevelSelect_MaxUnlockedIndex';

    @property(Prefab)
    levelButtonPrefab: Prefab = null;

    @property(Node)
    levelContainer: Node = null;

    @property(Node)
    backBtn: Node = null;

    @property(Label)
    totalProgressLabel: Label = null;

    @property
    maxUnlockedIndex: number = 0;

    @property
    devMode: boolean = false;

    /** 背景节点（用于在 Inspector 中统一调整背景尺寸） */
    @property(Node)
    backgroundNode: Node = null;

    @property({ tooltip: '>0 时在 onLoad 时设置背景宽度' })
    backgroundWidth: number = 0;

    @property({ tooltip: '>0 时在 onLoad 时设置背景高度' })
    backgroundHeight: number = 0;

    @property({ tooltip: '>0 时在 onLoad 时设置返回按钮宽度' })
    backButtonWidth: number = 0;

    @property({ tooltip: '>0 时在 onLoad 时设置返回按钮高度' })
    backButtonHeight: number = 0;

    @property({ tooltip: '>0 时在创建时设置每个关卡按钮的宽度（含背景图）' })
    levelButtonWidth: number = 0;

    @property({ tooltip: '>0 时在创建时设置每个关卡按钮的高度（含背景图）' })
    levelButtonHeight: number = 0;

    @property({ type: SpriteFrame, tooltip: '各关卡的背景图片（按关卡顺序排列，索引对应关卡索引）' })
    levelBackgroundSprites: SpriteFrame[] = [];

    private levels: LevelInfo[] = [];

    onLoad() {
        this.initDefaultLevels();
        this.loadUnlockedProgress();
        this.applySizes();
        this.ensureBackButtonClick();
        this.initUI();
    }

    private applySizes() {
        const ui = (n: Node) => n?.getComponent(UITransform);
        if (this.backgroundNode && this.backgroundWidth > 0 && this.backgroundHeight > 0) {
            const t = ui(this.backgroundNode);
            if (t) t.setContentSize(this.backgroundWidth, this.backgroundHeight);
        }
        if (this.backBtn && this.backButtonWidth > 0 && this.backButtonHeight > 0) {
            const t = ui(this.backBtn);
            if (t) t.setContentSize(this.backButtonWidth, this.backButtonHeight);
        }
    }

    /** 对关卡按钮节点及其背景子节点应用尺寸（根节点 + Background 子节点，确保图片可调大小） */
    private applyLevelButtonSize(buttonNode: Node, w: number, h: number) {
        const ui = (n: Node) => n?.getComponent(UITransform);
        const t = ui(buttonNode);
        if (t) t.setContentSize(w, h);
        const bg = buttonNode.getChildByName('Background');
        if (bg) {
            const bt = ui(bg);
            if (bt) bt.setContentSize(w, h);
        }
    }

    /**
     * 从本地存储读取已解锁的最大关卡索引
     */
    private loadUnlockedProgress() {
        try {
            const storage = sys?.localStorage;
            if (!storage) {
                return;
            }
            const raw = storage.getItem(LevelSelect.STORAGE_KEY_MAX_UNLOCKED);
            if (raw == null) {
                return;
            }
            const parsed = parseInt(raw);
            if (isNaN(parsed)) {
                return;
            }
            // 先更新到内存，后续在 createLevelButtons 中再做越界保护
            this.maxUnlockedIndex = Math.max(this.maxUnlockedIndex, parsed);
        } catch (e) {
            console.warn('[LevelSelect] 读取解锁进度失败', e);
        }
    }

    /**
     * 保存新的解锁进度到本地存储（只会向前推进，不会回退）
     */
    public saveUnlockedProgress(newIndex: number) {
        if (!this.levels || this.levels.length === 0) {
            // 关卡列表尚未初始化时，仅更新内存中的索引
            if (newIndex > this.maxUnlockedIndex) {
                this.maxUnlockedIndex = newIndex;
            }
        } else {
            const maxIndex = this.levels.length - 1;
            const clamped = Math.max(0, Math.min(newIndex, maxIndex));
            if (clamped <= this.maxUnlockedIndex) {
                // 仅当新索引大于当前索引时才更新
                return;
            }
            this.maxUnlockedIndex = clamped;
        }

        try {
            const storage = sys?.localStorage;
            if (storage) {
                storage.setItem(LevelSelect.STORAGE_KEY_MAX_UNLOCKED, String(this.maxUnlockedIndex));
            }
        } catch (e) {
            console.warn('[LevelSelect] 保存解锁进度失败', e);
        }

        // 进度变化后，刷新按钮解锁状态
        if (this.levelContainer) {
            this.createLevelButtons();
        }
    }

    /**
     * 玩家通关第 index 关后，解锁第 index+1 关
     */
    public unlockNextLevelByIndex(completedIndex: number) {
        const nextIndex = completedIndex + 1;
        this.saveUnlockedProgress(nextIndex);
    }

    /**
     * 根据关卡场景名通关后解锁下一关（可供其它系统调用）
     */
    public unlockNextLevelByScene(sceneName: string) {
        if (!this.levels || this.levels.length === 0) {
            return;
        }
        const found = this.levels.find(l => l.sceneName === sceneName);
        if (!found) {
            console.warn(`[LevelSelect] 未在关卡配置中找到场景: ${sceneName}`);
            return;
        }
        this.unlockNextLevelByIndex(found.index);
    }

    /** 若返回按钮未在编辑器中绑定点击事件，则在此用代码绑定 */
    private ensureBackButtonClick() {
        if (!this.backBtn) return;
        const btn = this.backBtn.getComponent(Button);
        if (!btn) return;
        const hasClick = btn.clickEvents && btn.clickEvents.length > 0;
        if (!hasClick) {
            btn.node.on(Button.EventType.CLICK, this.onClickBack, this);
        }
    }

    // 初始化默认关卡配置
    private initDefaultLevels() {
        this.levels = [
            {
                id: 'Level_0',
                name: '序章',
                sceneName: 'OpeningScene',
                description: '逃脱无聊的时空之旅',
                index: 0,
                collectibles: { fragment: 0, chip: 0, fossil: 0 }
            },
            {
                id: 'Level_1',
                name: '01',
                sceneName: 'scene',
                description: '初次体验时空穿越的奇妙',
                index: 1,
                collectibles: { fragment: 1, chip: 1, fossil: 1 }
            },
            {
                id: 'Level_2',
                name: '02',
                sceneName: 'scene-obstacles',
                description: '探索远古时期的危险',
                index: 2,
                collectibles: { fragment: 1, chip: 1, fossil: 1 }
            },
            {
                id: 'Level_3',
                name: '03',
                sceneName: 'scene_telescope',
                description: '发现观察时空的独特视角',
                index: 3,
                collectibles: { fragment: 1, chip: 1, fossil: 1 }
            },
        ];

        console.log(`[LevelSelect] 初始化了 ${this.levels.length} 个默认关卡`);
    }

    // 初始化UI
    private initUI() {

        // 生成关卡按钮
        this.createLevelButtons();

        // 更新总进度
        this.updateTotalProgress();
    }

    // 创建关卡按钮
    private createLevelButtons() {
        if (!this.levelContainer || !this.levelButtonPrefab) {
            console.error('[LevelSelect] 缺少 levelContainer 或 levelButtonPrefab，请在编辑器中绑定');
            // 如果 levelContainer 存在只是没预制体，至少清空一下
            if (this.levelContainer) {
                this.levelContainer.removeAllChildren();
            }
            return;
        }

        const levelCount = this.levels.length;
        if (levelCount === 0) {
            console.warn('[LevelSelect] 关卡列表为空，无法创建按钮');
            return;
        }

        // 边界保护：限制 maxUnlockedIndex 在 [0, levelCount - 1] 范围内
        if (this.maxUnlockedIndex < 0) {
            this.maxUnlockedIndex = 0;
        } else if (this.maxUnlockedIndex > levelCount - 1) {
            this.maxUnlockedIndex = levelCount - 1;
        }

        // 清空现有按钮
        this.levelContainer.removeAllChildren();

        const collectibleManager = CollectibleManager.getInstance();

        // 为每个关卡创建按钮
        for (let i = 0; i < this.levels.length; i++) {
            const levelInfo = this.levels[i];

            // 实例化按钮预制体
            const buttonNode = instantiate(this.levelButtonPrefab);
            this.levelContainer.addChild(buttonNode);

            // 获取LevelButton组件
            const levelButton = buttonNode.getComponent(LevelButton);
            if (!levelButton) {
                console.error(`[LevelSelect] 预制体上没有 LevelButton 组件！`);
                continue;
            }

            // 检查是否解锁
            const isLocked = !this.devMode && i > this.maxUnlockedIndex;

            // 获取收集进度
            const collectedCount = collectibleManager.getLevelCollectedCount(levelInfo.id);
            const totalCount = collectibleManager.getLevelCollectibleCount(levelInfo.id);

            // 初始化按钮
            levelButton.init(levelInfo, isLocked, collectedCount, totalCount);

            // 设置对应关卡的背景图片（如果有配置的话）
            if (this.levelBackgroundSprites.length > i && this.levelBackgroundSprites[i]) {
                const spriteFrame = this.levelBackgroundSprites[i];
                levelButton.setBackgroundSprite(spriteFrame);
                // 如果没配置固定尺寸，则自动使用图片原始大小
                if (!(this.levelButtonWidth > 0 && this.levelButtonHeight > 0) && spriteFrame) {
                    const rect = spriteFrame.getRect();
                    this.applyLevelButtonSize(buttonNode, rect.width, rect.height);
                }
            }

            // 应用关卡按钮尺寸（若在 Inspector 中配置了 levelButtonWidth/Height）
            if (this.levelButtonWidth > 0 && this.levelButtonHeight > 0) {
                this.applyLevelButtonSize(buttonNode, this.levelButtonWidth, this.levelButtonHeight);
            }

            console.log(`[LevelSelect] 创建关卡按钮: ${levelInfo.name}, 锁定: ${isLocked}, 进度: ${collectedCount}/${totalCount}`);
        }

        console.log(`[LevelSelect] 共创建了 ${this.levels.length} 个关卡按钮`);
    }

    // 更新总进度
    private updateTotalProgress() {
        if (!this.totalProgressLabel) return;

        const collectibleManager = CollectibleManager.getInstance();
        const totalCollected = collectibleManager.getTotalCollectedCount();
        const totalCollectibles = collectibleManager.getTotalCollectibleCount();
        const percentage = totalCollectibles > 0 ? Math.round((totalCollected / totalCollectibles) * 100) : 0;

        this.totalProgressLabel.string = `总收集进度: ${totalCollected}/${totalCollectibles} (${percentage}%)`;
    }

    // 返回主菜单
    onClickBack() {
        director.loadScene('StartMenu');
    }

    // 开发模式：解锁所有关卡
    unlockAllLevels() {
        this.maxUnlockedIndex = this.levels.length - 1;
        this.createLevelButtons();
        console.log('[LevelSelect] 开发模式：已解锁所有关卡');
    }

    // 开发模式：重置所有收集数据
    resetAllData() {
        const collectibleManager = CollectibleManager.getInstance();
        collectibleManager.resetAllData();
        this.createLevelButtons();
        this.updateTotalProgress();
        console.log('[LevelSelect] 已重置所有收集数据');
    }
}
