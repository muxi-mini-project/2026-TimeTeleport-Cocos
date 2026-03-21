import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact, director, sys } from 'cc';
import { GameManager } from '../Core/GameManager';
import { PlayerController } from '../GamePlay/PlayerController';
const { ccclass, property } = _decorator;

@ccclass('CheckPoint')
export class CheckPoint extends Component {

    @property({ tooltip: "触发后是否播放一次性特效/动画" })
    playEffectOnce: boolean = true;

    @property({ tooltip: "是否为终点关卡（触碰后通关）" })
    isEndPoint: boolean = false;

    private isActivated: boolean = false;
    private isLoadingScene: boolean = false;

    start() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    private onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
        if (this.isActivated || this.isLoadingScene) return;

        try {
            const otherNode = other?.node;
            if (!otherNode) return;

            const isPlayer =
                !!otherNode.getComponent(PlayerController) ||
                !!otherNode.getComponentInChildren(PlayerController) ||
                otherNode.name === 'Player';

            if (isPlayer) {
                console.log(`激活存档点`);
                this.isActivated = true;
                const collider = this.getComponent(Collider2D);
                if (collider) {
                    collider.enabled = false;
                }
                this.saveLocation();
            }
        } catch (e) {
            console.error('[CheckPoint] onBeginContact 出错', e);
        }
    }

    private saveLocation() {
        // 【核心逻辑】
        // 虽然 Checkpoint 是地图的子节点（本地坐标），
        // 但我们要存的是 WorldPosition，这样无视地图父节点的偏移。
        const worldPos = this.node.getWorldPosition();

        console.log(`[CheckPoint] 激活存档! 世界坐标: ${worldPos}`);
        GameManager.instance.saveCheckpoint(worldPos);

        // 可选：播放动画或变色
        // this.getComponent(Animation)?.play('FlagUp');

        // 如果是终点，发送通关事件
        if (this.isEndPoint) {
            console.log(`[CheckPoint] 触发终点，关卡完成！`);

            // === 额外逻辑：通关后直接解锁下一关并回到选关界面（无需在编辑器里做任何设置） ===
            try {
                const storage = sys?.localStorage;
                if (storage) {
                    // 当前关卡索引由 LevelButton 在进入关卡时写入
                    const rawIndex = storage.getItem('LevelSelect_CurrentLevelIndex');
                    const currentIndex = rawIndex != null ? parseInt(rawIndex) : 0;
                    const completedIndex = isNaN(currentIndex) ? 0 : currentIndex;

                    // 目标解锁索引 = 通关关卡的下一关
                    const nextIndex = completedIndex + 1;

                    // 读取原本的最大解锁索引
                    const rawMax = storage.getItem('LevelSelect_MaxUnlockedIndex');
                    const oldMax = rawMax != null ? parseInt(rawMax) : 0;
                    const safeOldMax = isNaN(oldMax) ? 0 : oldMax;

                    const newMax = Math.max(safeOldMax, nextIndex);
                    storage.setItem('LevelSelect_MaxUnlockedIndex', String(newMax));

                    console.log(`[CheckPoint] 更新解锁进度: 当前关卡索引=${completedIndex}, 新最大解锁索引=${newMax}`);
                }
            } catch (e) {
                console.warn('[CheckPoint] 更新解锁进度到本地存储失败', e);
            }

            // 回到关卡选择界面（避免在物理回调帧内直接切场景导致潜在报错）
            this.isLoadingScene = true;
            this.scheduleOnce(() => {
                if (!this.node || !this.node.isValid) return;
                director.loadScene('LevelSelect');
            }, 0.1);
        }
    }

    onDestroy() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
}
