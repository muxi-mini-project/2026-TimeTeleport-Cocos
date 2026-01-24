import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact, Sprite, SpriteFrame, Vec3, Enum } from 'cc';
import { CollectibleManager } from '../Core/CollectibleManager';
import { CollectibleType, CollectibleConfig } from '../Core/CollectibleType';
const { ccclass, property } = _decorator;

@ccclass('CollectibleItem')
export class CollectibleItem extends Component {

    @property({ tooltip: "收集物唯一ID" })
    collectibleId: string = '';

    @property({ type: Enum(CollectibleType), tooltip: "收集物类型" })
    collectibleType: CollectibleType = CollectibleType.FRAGMENT;

    @property({ type: SpriteFrame, tooltip: "图标（可选）" })
    icon: SpriteFrame = null;

    @property({ tooltip: "拾取后是否销毁" })
    destroyOnCollect: boolean = true;

    @property({ tooltip: "是否已被收集" })
    isCollected: boolean = false;

    private collider: Collider2D | null = null;
    private sprite: Sprite | null = null;

    onLoad() {
        this.collider = this.getComponent(Collider2D);
        this.sprite = this.getComponent(Sprite);

        if (!this.collider) {
            console.error(`[CollectibleItem] ${this.node.name}: 缺少 Collider2D 组件！`);
        } else {
            if (!this.collider.sensor) {
                console.warn(`[CollectibleItem] ${this.node.name}: Collider2D 的 Sensor 未勾选，已自动设置`);
                this.collider.sensor = true;
            }

            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }

        if (!this.collectibleId) {
            console.error(`[CollectibleItem] ${this.node.name}: collectibleId 未设置！`);
        }

        this.updateSprite();
    }

    onDisable() {
        if (this.collider) {
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    start() {
        const manager = CollectibleManager.getInstance();
        if (manager && manager.isCollected(this.collectibleId)) {
            this.onAlreadyCollected();
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

        const manager = CollectibleManager.getInstance();
        if (manager) {
            manager.collectItem({
                collectibleId: this.collectibleId,
                type: this.collectibleType,
                levelId: manager.getCurrentLevelId(),
                instanceId: this.node.uuid,
                position: this.node.getWorldPosition(),
                isCollected: true,
                timestamp: Date.now()
            });
        }

        this.node.emit('collectible-collected', {
            collectibleId: this.collectibleId,
            type: this.collectibleType,
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
        console.log(`[CollectibleItem] 收集物 ${this.collectibleId} 已收集，类型: ${this.collectibleType}`);
    }

    protected onAlreadyCollected(): void {
        console.log(`[CollectibleItem] 收集物 ${this.collectibleId} 已被收集，隐藏节点`);
        this.node.active = false;
    }

    private updateSprite(): void {
        if (this.sprite && this.icon) {
            this.sprite.spriteFrame = this.icon;
        }
    }

    public getCollectibleConfig(): CollectibleConfig {
        return {
            id: this.collectibleId,
            type: this.collectibleType,
            name: `${this.collectibleType}_${this.collectibleId}`,
            description: `收集物类型: ${this.collectibleType}`,
            icon: this.icon,
        };
    }
}
