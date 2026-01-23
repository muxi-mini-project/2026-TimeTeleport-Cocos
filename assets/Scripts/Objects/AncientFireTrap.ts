import {
    _decorator,
    Component,
    Node,
    BoxCollider2D,
    Collider2D,
    Contact2DType,
    IPhysics2DContact,
    Vec3
} from 'cc';
import { TimeState, LevelMapManager } from '../GamePlay/LevelMapManager';
import { PlayerController } from '../GamePlay/PlayerController';

const { ccclass, property } = _decorator;

/**
 * 古代火焰陷阱组件类
 * 继承自Component，用于实现游戏中火焰陷阱的交互逻辑
 */
@ccclass('AncientFireTrap')
export class AncientFireTrap extends Component {

    @property(LevelMapManager)
    mapManager: LevelMapManager = null!;  // 关卡地图管理器引用

    @property(Node)
    visualNode: Node = null!;          // 火焰显示节点，用于视觉效果的展示

    @property(BoxCollider2D)
    hitCollider: BoxCollider2D = null!; // 碰撞体组件，用于检测玩家接触

    // ---------- 设计参数 ----------

    @property({ tooltip: '基础火焰高度（安全跳）' })
    baseHeight: number = 1.0;          // 基础火焰高度，玩家可以安全跳过的高度

    @property({ tooltip: '最大火焰高度（必死）' })
    maxHeight: number = 2.2;           // 最大火焰高度，玩家无法跳过的高度

    @property({ tooltip: '高温区域半径（像素）' })
    heatRadius: number = 100;           // 高温区域半径，玩家在此范围内会累积风险值

    @property({ tooltip: '风险累积速度（越大越催促）' })
    heatAccumulationSpeed: number = 1.2; // 风险累积速度，值越大风险增长越快

    @property({ tooltip: '离开后的冷却速度' })
    coolDownSpeed: number = 1.5;        // 离开后的冷却速度，值越大风险衰减越快

    // ---------- 内部状态 ----------

    private heatValue: number = 0;     // 0 ~ 1，当前风险值，用于控制火焰高度
    private _player: PlayerController | null = null; // 玩家控制器引用，用于获取玩家状态
    private _baseColliderHeight: number = 0;
    private _baseColliderOffsetY: number = 0;


    // ---------- 生命周期 ----------

    /**
     * 组件初始化时的生命周期回调函数
     * 初始化风险值，并注册碰撞体开始接触的事件监听
     */
    start() {
        this.heatValue = 0;  // 初始化风险值为0
        // 记录初始 hitbox 数据
        this._baseColliderHeight = this.hitCollider.size.height;
        this._baseColliderOffsetY = this.hitCollider.offset.y;
        // 如果存在碰撞体组件，则注册碰撞开始事件
        if (this.hitCollider) {
            this.hitCollider.on(
                Contact2DType.BEGIN_CONTACT,  // 事件类型：碰撞开始
                this.onBeginContact,          // 回调函数
                this                          // 回调函数的this上下文
            );
        }
    }

    /**
     * 组件销毁时的生命周期回调函数
     * 用于清理事件监听器，防止内存泄漏
     */
    onDestroy() {
        // 检查碰撞体是否存在
        if (this.hitCollider) {
            // 移除碰撞体开始接触的事件监听
            this.hitCollider.off(
                Contact2DType.BEGIN_CONTACT,  // 事件类型：碰撞开始
                this.onBeginContact,          // 回调函数
                this                          // 回调函数的this上下文
            );
        }
    }

    /**
     * 每帧更新时的回调函数
     * @param dt 距离上一帧的时间间隔（秒）
     */
    /**
     * 更新方法，用于在每一帧更新游戏对象的逻辑
     * @param dt - 距离上一帧的时间间隔（以秒为单位）
     */
    update(dt: number) {
        // 检查是否不在世界中，如果不在则禁用视觉效果和碰撞器
        if (!this.isPastWorld()) {
            this.visualNode.active = false;  // 禁用视觉效果节点
            this.hitCollider.enabled = false; // 禁用碰撞器
            return;  // 提前退出方法
        }



        // 如果在世界中，则启用视觉效果和碰撞器
        this.visualNode.active = true;   // 启用视觉效果节点
        this.hitCollider.enabled = true;  // 启用碰撞器



        // 更新热量相关逻辑
        this.updateHeat(dt);  // 传入时间间隔更新热量

        // 更新视觉效果
        this.updateVisual();  // 更新视觉表现
    }


    // ---------- 核心逻辑 ----------

    /**
     * 检查当前是否在过去世界
     * @returns 如果是在过去世界返回true，否则返回false
     */
    private isPastWorld(): boolean {
        return this.mapManager
            && this.mapManager.getCurrentState() === TimeState.Past;
    }

    /**
     * 风险累积 / 衰减
     * 等待 = heatValue 上升
     */
    /**
     * 更新热值系统
     * @param dt - 时间增量，用于计算平滑的热值变化
     */
    /**
     * 更新热值系统
     * 根据玩家与火源的距离，动态调整玩家的热值
     * @param dt 时间增量，用于计算平滑的热值变化
     */
    private updateHeat(dt: number) {
        // 获取玩家实例
        const player = this.getPlayer();
        // 检查玩家是否存在或已死亡，如果条件满足则直接返回
        if (!player || (player as any).isDead) return;

        // 获取玩家和火源的世界坐标位置
        const playerPos = player.node.getWorldPosition();
        const firePos = this.node.getWorldPosition();

        // 计算玩家与火源之间的距离
        const dist = Vec3.distance(playerPos, firePos);

        // 判断玩家是否在高温区域内
        if (dist <= this.heatRadius) {
            // 玩家在高温区域内 → 风险累积
            // 根据时间增量增加热值，模拟高温环境下的热量累积
            this.heatValue += this.heatAccumulationSpeed * dt;
        } else {
            // 离开 → 冷却
            this.heatValue -= this.coolDownSpeed * dt;
        }

        this.heatValue = Math.min(1, Math.max(0, this.heatValue));
    }

    /**
     * 火焰高度随风险变化
     */
    /**
     * 更新可视化效果
     * 根据当前的热值(heatValue)调整视觉节点的高度
     */
    private updateVisual() {
        // 计算新的高度值：基础高度加上(最大高度与基础高度的差值乘以当前热值)
        const height =
            this.baseHeight +
            (this.maxHeight - this.baseHeight) * this.heatValue;

        // 设置视觉节点的缩放比例，x和z轴保持1不变，y轴根据计算出的高度值进行缩放
        this.visualNode.setScale(1, height, 1);
        this.hitCollider.size.height = this._baseColliderHeight * height; // 根据高度调整碰撞体的大小
        this.hitCollider.offset.y =
            this._baseColliderOffsetY +
            (this.hitCollider.size.height - this._baseColliderHeight) / 2; // 根据高度调整碰撞体位置
        this.hitCollider.apply(); // 应用碰撞体更改
    }

    /**
     * 玩家接触火焰 → 立即死亡
     */
    private onBeginContact(
        self: Collider2D,
        other: Collider2D,
        _contact: IPhysics2DContact | null
    ) {
        if (!this.isPastWorld()) return;

        const player = other.getComponent(PlayerController);
        if (!player) return;
        if ((player as any).isDead) return;

        player.die();
    }

    /**
     * 离开过去世界时重置
     */
    /**
     * 重置状态方法
     * 用于将热量值和视觉节点的缩放恢复到初始状态
     */
    private resetState() {
        // 将热量值重置为0
        this.heatValue = 0;
        // 将视觉节点的缩放重置为初始状态，宽度(x)和深度(z)保持为1，高度(y)重置为基础高度
        this.visualNode.setScale(1, this.baseHeight, 1);
    }

    /**
     * 获取玩家控制器实例
     * @returns PlayerController | null - 返回玩家控制器实例，如果不存在则返回null
     */
    private getPlayer(): PlayerController | null {
        // 如果已经存在玩家控制器实例，直接返回
        if (this._player) return this._player;

        // 获取地图管理器中的玩家节点
        const playerNode = this.mapManager?.playerNode;
        // 如果玩家节点不存在，返回null
        if (!playerNode) return null;

        // 从玩家节点获取PlayerController组件并保存到实例变量
        this._player = playerNode.getComponent(PlayerController);
        return this._player;
    }
}

