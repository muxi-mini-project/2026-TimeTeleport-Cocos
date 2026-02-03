import { _decorator, Component, Node, director, Prefab, instantiate, Label } from 'cc';
import { CollectibleManager } from '../Core/CollectibleManager';
import { LevelButton, LevelInfo } from './LevelButton';
const { ccclass, property } = _decorator;

@ccclass('LevelSelect')
export class LevelSelect extends Component {

    @property(Prefab)
    levelButtonPrefab: Prefab = null;

    @property(Node)
    levelContainer: Node = null;

    @property(Node)
    backBtn: Node = null;

    @property(Label)
    titleLabel: Label = null;

    @property(Label)
    totalProgressLabel: Label = null;

    @property
    maxUnlockedIndex: number = 0;

    @property
    devMode: boolean = false;

    // 关卡列表（不使用@property，仅内部使用）
    private levels: LevelInfo[] = [];

    onLoad() {
        // 初始化默认关卡配置
        this.initDefaultLevels();

        // 初始化UI
        this.initUI();
    }

    // 初始化默认关卡配置
    private initDefaultLevels() {
        this.levels = [
            {
                id: 'Level_1',
                name: '第一章 - 初入时空',
                sceneName: 'scene',  // 使用现有的测试场景
                description: '初次体验时空穿越的奇妙',
                index: 0
            },
            {
                id: 'Level_2',
                name: '第二章 - 遥远的过去',
                sceneName: 'scene_obstacles',  // 使用现有的测试场景
                description: '探索远古时期的危险',
                index: 1
            },
            {
                id: 'Level_3',
                name: '第三章 - 望远镜之秘',
                sceneName: 'scene_telescope',  // 使用现有的测试场景
                description: '发现观察时空的独特视角',
                index: 2
            },
            // TODO: 后续添加更多关卡时，在这里继续添加
            // {
            //     id: 'Level_4',
            //     name: '第四章 - 古老遗迹',
            //     sceneName: 'Level4',
            //     description: '探索神秘的远古遗迹',
            //     index: 3
            // },
            // {
            //     id: 'Level_5',
            //     name: '第五章 - 未来科技',
            //     sceneName: 'Level5',
            //     description: '面对高科技的未来威胁',
            //     index: 4
            // },
        ];

        console.log(`[LevelSelect] 初始化了 ${this.levels.length} 个默认关卡`);
    }

    // 初始化UI
    private initUI() {
        // 设置标题
        if (this.titleLabel) {
            this.titleLabel.string = '选择关卡';
        }

        // 生成关卡按钮
        this.createLevelButtons();

        // 更新总进度
        this.updateTotalProgress();
    }

    // 创建关卡按钮
    private createLevelButtons() {
        if (!this.levelContainer || !this.levelButtonPrefab) {
            console.error('[LevelSelect] 缺少 levelContainer 或 levelButtonPrefab');
            return;
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
