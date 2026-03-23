import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact, Sprite, SpriteFrame, Vec3, Enum, director } from 'cc';
import { CollectibleManager } from '../Core/CollectibleManager';
import { CollectibleType, CollectibleConfig, TimeState } from '../Core/CollectibleType';
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

        this.updateSprite();
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
        if (this.isCollected) return;
        this.updateVisibilityByTimeState(newState as TimeState);
    }

    public updateVisibilityByTimeState(currentState: TimeState): void {
        if (this.isCollected) {
            this.node.active = false;
            return;
        }

        const shouldShow = this.timeState === TimeState.Both || this.timeState === currentState;
        this.node.active = shouldShow;

        if (this.collider) {
            this.collider.enabled = shouldShow;
        }
    }
}
