import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact, Vec3 } from 'cc';
import { PlayerController } from '../GamePlay/PlayerController';
import { ItemType } from '../Core/ItemType';
import { IUsableItem } from '../Core/IUsableItem';
import { LevelRespawnManager } from '../Core/LevelRespawnManager';
const { ccclass, property } = _decorator;

@ccclass('ShieldItem')
export class ShieldItem extends Component implements IUsableItem {
    @property({ tooltip: '道具类型' })
    itemType: ItemType = ItemType.SHIELD;

    @property({ tooltip: '单个护盾的持续时间（秒）' })
    shieldDuration: number = 3.0;

    private collider: Collider2D | null = null;
    private isPickedUp: boolean = false;
    private initialWorldPosition: Vec3 = new Vec3();
    private hasInitialized: boolean = false;

    onLoad() {
        this.collider = this.getComponent(Collider2D);

        if (!this.collider) {
            console.error(`[ShieldItem] ${this.node.name}: 缺少 Collider2D 组件！`);
        } else {
            if (!this.collider.sensor) {
                console.warn(`[ShieldItem] ${this.node.name}: Collider2D 的 Sensor 未勾选，已自动设置`);
                this.collider.sensor = true;
            }
        }

        if (!this.hasInitialized) {
            this.initialWorldPosition = this.node.worldPosition.clone();
            this.hasInitialized = true;
        }
    }

    onEnable() {
        if (this.collider) {
            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    onDisable() {
        if (this.collider) {
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    public resetToInitialState(): void {
        this.isPickedUp = false;

        if (this.collider) {
            this.collider.enabled = true;
        }

        this.node.setWorldPosition(this.initialWorldPosition);
        this.node.active = true;

        console.log(`[ShieldItem] ${this.node.name} 已重置到初始位置`);
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null): void {
        if (this.isPickedUp) return;

        const nodeName = otherCollider.node.name;
        if (nodeName.indexOf('Player') !== 0) return;

        const playerController = otherCollider.node.getComponent(PlayerController);
        if (!playerController) return;

        playerController.setCurrentItem(this.itemType, this.shieldDuration);

        this.isPickedUp = true;

        this.node.emit('shield-picked-up', {
            itemType: this.itemType,
            duration: this.shieldDuration
        });

        console.log(`[ShieldItem] 护盾已收集`);

        if (this.collider) {
            this.collider.enabled = false;
        }

        const respawnManager = LevelRespawnManager.instance;
        if (respawnManager) {
            respawnManager.registerDeactivated(this.node);
        }

        this.node.active = false;
    }

    getItemType(): string {
        return this.itemType;
    }

    tryUse(): boolean {
        return true;
    }

    canUse(): boolean {
        return true;
    }

    getRemainingCount(): number {
        return 1;
    }
}
