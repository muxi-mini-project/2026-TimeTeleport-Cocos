import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact } from 'cc';
import { PlayerController } from '../GamePlay/PlayerController';
const { ccclass, property } = _decorator;

/**
 * 护盾道具（手持物版本）
 * 玩家触碰后收集到库存，按 I 键激活
 * 护盾期间玩家无敌，且踩踏敌人时获得额外跳跃力
 */
@ccclass('ShieldItem')
export class ShieldItem extends Component {
    @property({ tooltip: '单个护盾的持续时间（秒）' })
    shieldDuration: number = 3.0;

    @property({ tooltip: '拾取后是否销毁道具' })
    destroyOnPickup: boolean = true;

    private collider: Collider2D | null = null;
    private isPickedUp: boolean = false;

    onLoad() {
        this.collider = this.getComponent(Collider2D);

        if (!this.collider) {
            console.error(`[ShieldItem] ${this.node.name}: 缺少 Collider2D 组件！`);
        } else {
            // 确保是传感器模式（触发器）
            if (!this.collider.sensor) {
                console.warn(`[ShieldItem] ${this.node.name}: Collider2D 的 Sensor 未勾选，已自动设置`);
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

        // 检查是否是玩家
        const nodeName = otherCollider.node.name;
        if (nodeName.indexOf('Player') !== 0) return;

        const playerController = otherCollider.node.getComponent(PlayerController);
        if (!playerController) return;

        // 添加护盾到库存（而不是立即激活）
        playerController.addShieldToInventory(this.shieldDuration);

        // 标记已拾取
        this.isPickedUp = true;

        // 发送拾取事件（可用于播放音效、特效等）
        this.node.emit('shield-picked-up', {
            duration: this.shieldDuration,
            inventoryCount: playerController.getShieldInventoryCount()
        });

        console.log(`[ShieldItem] 护盾已收集，持续时间: ${this.shieldDuration}秒`);

        // 销毁道具
        if (this.destroyOnPickup) {
            this.node.destroy();
        } else {
            // 如果不销毁，禁用碰撞体防止重复拾取
            if (this.collider) {
                this.collider.enabled = false;
            }
        }
    }
}
