import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact } from 'cc';
import { GameManager } from '../Core/GameManager'; // 假设你已有这个
const { ccclass, property } = _decorator;

@ccclass('Checkpoint')
export class Checkpoint extends Component {
    
    @property({ tooltip: "触发后是否播放一次性特效/动画" })
    playEffectOnce: boolean = true;

    private isActivated: boolean = false;

    start() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            // 监听碰撞
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    private onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
        if (this.isActivated) return;

        // 确认撞击者是玩家 (根据你的项目习惯，可以用 group 或 name 判断)
        if (other.node.name === 'Player') {
            console.log(`激活存档点`);
            this.isActivated = true;
            this.saveLocation();
        }
    }

    private saveLocation() {
        // 【核心逻辑】
        // 虽然 Checkpoint 是地图的子节点（本地坐标），
        // 但我们要存的是 WorldPosition，这样无视地图父节点的偏移。
        const worldPos = this.node.getWorldPosition();
        
        console.log(`[Checkpoint] 激活存档! 世界坐标: ${worldPos}`);
        GameManager.instance.saveCheckpoint(worldPos);

        // 可选：播放动画或变色
        // this.getComponent(Animation)?.play('FlagUp');
    }
}