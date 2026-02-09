import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact } from 'cc';
import { PlayerController } from '../GamePlay/PlayerController';
import { ItemType } from '../Core/ItemType';
import { IUsableItem } from '../Core/IUsableItem';
const { ccclass, property } = _decorator;

@ccclass('GrappleItem')
export class GrappleItem extends Component implements IUsableItem {
    @property({ tooltip: '道具类型' })
    itemType: ItemType = ItemType.GRAPPLE;

    @property({ tooltip: '拾取后是否销毁道具' })
    destroyOnPickup: boolean = true;

    private collider: Collider2D | null = null;
    private isPickedUp: boolean = false;

    onLoad() {
        this.collider = this.getComponent(Collider2D);

        if (!this.collider) {
            console.error(`[GrappleItem] ${this.node.name}: 缺少 Collider2D 组件！`);
        } else {
            if (!this.collider.sensor) {
                console.warn(`[GrappleItem] ${this.node.name}: Collider2D 的 Sensor 未勾选，已自动设置`);
                this.collider.sensor = true;
            }

            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    onDisable() {
        if (this.collider) {
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null): void {
        if (this.isPickedUp) return;

        const nodeName = otherCollider.node.name;
        if (nodeName.indexOf('Player') !== 0) return;

        const playerController = otherCollider.node.getComponent(PlayerController);
        if (!playerController) return;

        playerController.setCurrentItem(this.itemType);

        this.isPickedUp = true;

        this.node.emit('grapple-picked-up', {
            itemType: this.itemType
        });

        console.log('[GrappleItem] 钩爪已收集');

        if (this.destroyOnPickup) {
            this.node.destroy();
        } else {
            if (this.collider) {
                this.collider.enabled = false;
            }
        }
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
        return Infinity;
    }
}
