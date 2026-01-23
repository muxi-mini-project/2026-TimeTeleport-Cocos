import { _decorator, Component, Node, BoxCollider2D, Contact2DType, Collider2D, IPhysics2DContact, UIOpacity } from 'cc';
import { TimeState, LevelMapManager } from '../GamePlay/LevelMapManager';
import { PlayerController } from '../GamePlay/PlayerController';
const { ccclass, property } = _decorator;

@ccclass('LaserTrap')
export class LaserTrap extends Component {
    @property(LevelMapManager)
    mapManager: LevelMapManager = null;

    @property(Node)
    visualNode: Node = null;      // 激光/火焰显示

    @property(BoxCollider2D)
    hitCollider: BoxCollider2D = null;

    @property
    activeTime: number = 1.5;     // 开启时间

    @property
    inactiveTime: number = 1.5;   // 关闭时间


    private isActive: boolean = false;

    start() {

        this.turnOff();
        //注册激光碰撞监听
        if (this.hitCollider) {
            this.hitCollider.on(
                Contact2DType.BEGIN_CONTACT,
                this.onBeginContact,
                this
            );
        }
        //注册世界变化监听
        if (this.mapManager) {
            this.mapManager.registerTimeListener(this.onWorldChanged);
        }
    }
    //销毁时取消注册
    /**
     * 组件销毁时的生命周期钩子
     * 用于清理资源，防止内存泄漏
     */
    onDestroy() {
        // 检查mapManager是否存在
        if (this.mapManager) {
            // 移除世界监听器，避免在组件销毁后仍然触发回调
            this.mapManager.unregisterTimeListener(this.onWorldChanged);
        }
        //取消碰撞监听，防止泄露
        if (this.hitCollider) {
            this.hitCollider.off(
                Contact2DType.BEGIN_CONTACT,
                this.onBeginContact,
                this
            );
        }
    }
    //激光命中玩家处理函数
    private onBeginContact(
        self: Collider2D,
        other: Collider2D,
        contact: IPhysics2DContact | null
    ) {
        // 激光未激活时，不处理
        if (!this.isActive) return;

        const player = other.getComponent(PlayerController);
        if (!player) return;

        // 防止重复触发
        if ((player as any).isDead) return;

        console.log('玩家被激光击中！');
        player.die();
    }


    //世界变化响应函数
    private onWorldChanged = (state: TimeState) => {
        this.unscheduleAllCallbacks();

        if (state === TimeState.Future) {
            this.turnOff(); // 重置
            this.scheduleOnce(this.turnOn, this.inactiveTime);
        } else {
            this.turnOff();
        }
    }

    //判断是否是未来世界
    private isFutureworld(): boolean {
        return this.mapManager
            && this.mapManager.getCurrentState() === TimeState.Future;
    }

    private turnOn = () => {
        if (!this.isFutureworld()) {
            return;
        }
        this.isActive = true;
        if (this.hitCollider) {
            this.hitCollider.enabled = true;
        }
        this.visualNode.active = true;
        this.checkPlayerOverlapOnce(); // 检查玩家是否与激光发生一次性碰撞
        this.scheduleOnce(this.turnOff, this.activeTime);
    }
    private turnOff = () => {
        this.hitCollider.enabled = false;
        this.visualNode.active = false;
        this.isActive = false;
        if (this.isFutureworld()) {
            this.scheduleOnce(this.turnOn, this.inactiveTime);
        }
    }
    /**
     * 检查玩家是否与激光发生一次性碰撞
     * 当玩家在激光生成时处于激光范围内时触发玩家死亡
     */
    private checkPlayerOverlapOnce() {
        // 获取玩家节点
        const playerNode = this.mapManager?.playerNode;
        // 如果玩家节点不存在，则直接返回
        if (!playerNode) return;

        // 获取玩家控制器组件
        const player = playerNode.getComponent(PlayerController);
        // 如果玩家控制器不存在或玩家已死亡，则直接返回
        if (!player || (player as any).isDead) return;

        // 获取玩家的碰撞器组件
        const playerCollider = playerNode.getComponent(Collider2D);
        // 如果玩家碰撞器或激光碰撞器不存在，则直接返回
        if (!playerCollider || !this.hitCollider) return;

        // 获取激光和玩家的世界坐标系包围盒
        const laserAABB = this.hitCollider.worldAABB;
        const playerAABB = playerCollider.worldAABB;

        // 检查两个包围盒是否相交
        if (laserAABB.intersects(playerAABB)) {
            // 如果相交，说明玩家在激光生成时已被覆盖
            console.log('玩家在激光生成时已被覆盖');
            // 触发玩家死亡
            player.die();
        }
    }


}


