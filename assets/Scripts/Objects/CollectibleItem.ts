import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact, Sprite, SpriteFrame, Vec3, Enum, director, resources } from 'cc';
import { CollectibleManager } from '../Core/CollectibleManager';
import { CollectibleType, CollectibleConfig, TimeState, COLLECTIBLE_ICON_PATHS } from '../Core/CollectibleType';
import { CollectibleInfo } from '../Core/CollectibleData';
const { ccclass, property } = _decorator;

@ccclass('CollectibleItem')
export class CollectibleItem extends Component {

    @property({ tooltip: "Unique collectible id" })
    collectibleId: string = '';

    @property({ type: Enum(CollectibleType), tooltip: "Collectible type" })
    collectibleType: CollectibleType = CollectibleType.FRAGMENT;

    @property({ type: Enum(TimeState), tooltip: "Time state: past, future, or both" })
    timeState: TimeState = TimeState.Both;

    @property({ type: SpriteFrame, tooltip: "Icon (optional)" })
    icon: SpriteFrame = null;

    @property({ tooltip: "Destroy on collect" })
    destroyOnCollect: boolean = true;

    @property({ tooltip: "Already collected" })
    isCollected: boolean = false;

    @property({ tooltip: "Use CollectibleManager for persistence" })
    useManager: boolean = true;

    private collider: Collider2D | null = null;
    private sprite: Sprite | null = null;

    onLoad() {
        this.collider = this.getComponent(Collider2D);
        this.sprite = this.getComponent(Sprite);

        if (!this.collider) {
            console.error(`[CollectibleItem] ${this.node.name}: missing Collider2D component`);
        } else {
            if (!this.collider.sensor) {
                console.warn(`[CollectibleItem] ${this.node.name}: Collider2D sensor is not enabled, auto-fix`);
                this.collider.sensor = true;
            }

            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }

        if (!this.collectibleId) {
            console.error(`[CollectibleItem] ${this.node.name}: collectibleId not set`);
        }

        director.on('time-state-changed', this.onTimeStateChanged, this);

        this.loadIcon();
    }

    onDisable() {
        if (this.collider) {
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
        director.off('time-state-changed', this.onTimeStateChanged, this);
    }

    start() {
        if (this.useManager) {
            const manager = CollectibleManager.getInstance();
            if (manager && manager.isCollected(this.collectibleId)) {
                this.onAlreadyCollected();
            }
        }
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null): void {
        if (this.isCollected) return;

        const nodeName = otherCollider.node.name;
        if (nodeName.indexOf('Player') !== 0) return;

        this.collect();
    }

    public collect(): void {
        if (this.isCollected) return;

        this.isCollected = true;

        if (this.useManager) {
            const manager = CollectibleManager.getInstance();
            if (manager) {
                manager.collectItem({
                    collectibleId: this.collectibleId,
                    type: this.collectibleType
                });
            }
        }

        const icon = this.icon || this.sprite?.spriteFrame || null;

        this.node.emit('collectible-collected', {
            collectibleId: this.collectibleId,
            type: this.collectibleType,
            icon,
        });
        director.emit('collectible-collected', {
            collectibleId: this.collectibleId,
            type: this.collectibleType,
            icon,
        });

        this.onCollected();

        if (this.destroyOnCollect) {
            this.node.destroy();
        } else {
            if (this.collider) {
                this.collider.enabled = false;
            }
            if (this.sprite) {
                this.sprite.enabled = false;
            }
        }
    }

    protected onCollected(): void {
        console.log(`[CollectibleItem] Collected ${this.collectibleId}, type: ${this.collectibleType}`);
    }

    protected onAlreadyCollected(): void {
        console.log(`[CollectibleItem] Already collected ${this.collectibleId}, hide node`);
        this.node.active = false;
    }

    private updateSprite(): void {
        if (this.sprite && this.icon) {
            this.sprite.spriteFrame = this.icon;
        }
    }

    private loadIcon(): void {
        if (!this.sprite) {
            console.warn(`[CollectibleItem] ${this.collectibleId}: 缺少 Sprite 组件，无法加载图标`);
            return;
        }

        if (this.icon) {
            this.sprite.spriteFrame = this.icon;
            console.log(`[CollectibleItem] ${this.collectibleId}: 使用预设图标`);
            return;
        }

        const defaultPath = COLLECTIBLE_ICON_PATHS[this.collectibleType];
        console.log(`[CollectibleItem] ${this.collectibleId}: 尝试加载图标, type=${this.collectibleType}, path=${defaultPath}`);
        
        if (defaultPath) {
            resources.load(defaultPath, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    console.error(`[CollectibleItem] ${this.collectibleId}: 加载图标失败: ${defaultPath}`, err);
                    return;
                }

                if (spriteFrame && this.sprite && this.node.isValid) {
                    this.sprite.spriteFrame = spriteFrame;
                    this.icon = spriteFrame;
                    console.log(`[CollectibleItem] ${this.collectibleId}: 图标加载成功`);
                }
            });
        } else {
            console.warn(`[CollectibleItem] ${this.collectibleId}: 找不到类型 ${this.collectibleType} 的默认图标路径`);
        }
    }

    public getCollectibleConfig(): CollectibleConfig {
        return {
            id: this.collectibleId,
            type: this.collectibleType,
            name: `${this.collectibleType}_${this.collectibleId}`,
            description: `Collectible type: ${this.collectibleType}`,
            icon: this.icon,
        };
    }

    private onTimeStateChanged(newState: string): void {
        console.log(`[CollectibleItem] ${this.collectibleId}: onTimeStateChanged 触发, newState=${newState}, isCollected=${this.isCollected}`);
        if (this.isCollected) return;
        this.updateVisibilityByTimeState(newState as TimeState);
    }

    public updateVisibilityByTimeState(currentState: TimeState): void {
        console.log(`[CollectibleItem] ${this.collectibleId}: updateVisibilityByTimeState called, timeState=${this.timeState}, currentState=${currentState}, isCollected=${this.isCollected}`);
        
        if (this.isCollected) {
            this.node.active = false;
            console.log(`[CollectibleItem] ${this.collectibleId}: 已收集，隐藏节点`);
            return;
        }

        const shouldShow = this.timeState === TimeState.Both || this.timeState === currentState;

        // 保持节点激活以接收事件，只控制 Sprite 和 Collider 的启用状态
        if (this.sprite) {
            this.sprite.enabled = shouldShow;
        }
        if (this.collider) {
            this.collider.enabled = shouldShow;
        }

        console.log(`[CollectibleItem] ${this.collectibleId}: shouldShow=${shouldShow}, sprite.enabled=${this.sprite?.enabled}, collider.enabled=${this.collider?.enabled}`);
    }
}
