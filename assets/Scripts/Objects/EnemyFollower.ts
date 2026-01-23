import { _decorator, Component, Vec3, Node, RigidBody2D, Vec2, Collider2D, Contact2DType, IPhysics2DContact, Enum } from 'cc';
import { LevelMapManager, TimeState } from '../GamePlay/LevelMapManager';
import { PlayerController } from '../GamePlay/PlayerController';
import { PlayerTracker } from './PlayerTracker';
const { ccclass, property } = _decorator;

/**
 * 跟随模式枚举
 */
export enum FollowMode {
    /**
     * 时间延迟模式 - 敌人跟随玩家指定时间前的位置
     */
    TIME_DELAY = 0,

    /**
     * 轨迹点索引模式 - 敌人跟随轨迹中指定索引的位置
     */
    PATH_INDEX = 1,

    /**
     * 逐步跟随模式 - 敌人每帧移动到下一个轨迹点
     */
    STEP_BY_STEP = 2
}

/**
 * 敌人激活时间线
 */
export enum EnemyTimeState {
    /** 始终激活（两个时间线都追踪） */
    BOTH = 0,
    /** 只在过去时间线激活 */
    PAST_ONLY = 1,
    /** 只在未来时间线激活 */
    FUTURE_ONLY = 2
}

/**
 * 移动模式枚举
 */
export enum MovementMode {
    /** 直接设置位置（默认） */
    DIRECT_POSITION = 0,
    /** 使用 RigidBody2D 移动（需要敌人有 RigidBody2D 组件） */
    RIGIDBODY_VELOCITY = 1
}

/**
 * 敌人跟随器（整合版）
 * 功能：
 * 1. 沿着玩家轨迹追踪
 * 2. 检测与玩家碰撞并造成伤害
 * 3. 支持时间穿越系统
 */
@ccclass('EnemyFollower')
export class EnemyFollower extends Component {
    /**
     * 激活时间线
     * Both: 两个时间线都追踪（默认）
     * Past_Only: 只在过去时间线激活
     * Future_Only: 只在未来时间线激活
     */
    @property({
        type: Enum(EnemyTimeState),
        tooltip: '在哪个时间线激活'
    })
    public activeTimeState: EnemyTimeState = EnemyTimeState.BOTH;

    /**
     * 跟随模式
     */
    @property({
        type: Enum(FollowMode),
        tooltip: '跟随模式'
    })
    public followMode: FollowMode = FollowMode.TIME_DELAY;

    /**
     * 时间延迟（秒）
     * 仅在 TIME_DELAY 模式下使用
     */
    @property({
        tooltip: '时间延迟（秒）',
        visible: function(this: EnemyFollower) { return this.followMode === FollowMode.TIME_DELAY; }
    })
    public delaySeconds: number = 2.0;

    /**
     * 轨迹点索引偏移
     * 仅在 PATH_INDEX 模式下使用
     */
    @property({
        tooltip: '轨迹点索引偏移',
        visible: function(this: EnemyFollower) { return this.followMode === FollowMode.PATH_INDEX; }
    })
    public pathIndexOffset: number = 60;

    /**
     * 跟随速度
     * 仅在 STEP_BY_STEP 模式下使用，每帧移动的轨迹点数量
     */
    @property({
        tooltip: '跟随速度（轨迹点/帧）',
        visible: function(this: EnemyFollower) { return this.followMode === FollowMode.STEP_BY_STEP; }
    })
    public followSpeed: number = 1.0;

    /**
     * 是否使用平滑移动
     * 启用后会使用插值平滑过渡到目标位置
     */
    @property({ tooltip: '是否使用平滑移动' })
    public useSmoothing: boolean = true;

    /**
     * 平滑速度
     * 值越大移动越快（0.01-1.0）
     */
    @property({
        tooltip: '平滑速度（0.01-1.0）',
        visible: function(this: EnemyFollower) { return this.useSmoothing; }
    })
    public smoothSpeed: number = 0.1;

    /**
     * 是否启用 Y 轴跟随
     * 2D 平台游戏中通常需要启用
     */
    @property({ tooltip: '是否启用 Y 轴跟随' })
    public enableYFollow: boolean = true;

    /**
     * 偏移位置
     * 相对于目标位置的偏移
     */
    @property({ tooltip: '跟随位置偏移' })
    public positionOffset: Vec3 = new Vec3(0, 0, 0);

    /**
     * 移动模式
     */
    @property({
        type: Enum(MovementMode),
        tooltip: '移动模式'
    })
    public movementMode: MovementMode = MovementMode.DIRECT_POSITION;

    /**
     * 最大移动速度（仅 RigidBody 模式）
     */
    @property({
        tooltip: '最大移动速度（仅 RigidBody 模式）',
        visible: function(this: EnemyFollower) { return this.movementMode === MovementMode.RIGIDBODY_VELOCITY; }
    })
    public maxMoveSpeed: number = 10;

    // ========== 伤害设置 ==========
    /**
     * 伤害冷却时间（防止连续触发）
     */
    @property({ tooltip: '伤害冷却时间（秒）' })
    public damageCooldown: number = 0.5;

    /**
     * 是否只在激活时造成伤害
     * 勾选后，只有当前时间线匹配时才会造成伤害
     */
    @property({ tooltip: '是否只在激活时造成伤害' })
    public damageOnlyWhenActive: boolean = true;

    // ========== 内部变量 ==========
    // 当前轨迹点索引（用于 STEP_BY_STEP 模式）
    private currentPathIndex: number = 0;

    // 目标位置
    private targetPosition: Vec3 = new Vec3();

    // 当前是否在追踪
    private isTracking: boolean = false;

    // 当前是否应该激活（根据时间线状态）
    private shouldBeActive: boolean = true;

    // 伤害冷却计时器
    private damageCooldownTimer: number = 0;

    // RigidBody2D 引用（仅 RigidBody 模式使用）
    private rb: RigidBody2D | null = null;

    // LevelMapManager 引用
    private mapManager: LevelMapManager | null = null;

    onLoad() {
        // 初始化位置为当前位置
        Vec3.copy(this.targetPosition, this.node.worldPosition);
        this.currentPathIndex = 0;

        // 如果使用 RigidBody 模式，获取 RigidBody2D 组件
        if (this.movementMode === MovementMode.RIGIDBODY_VELOCITY) {
            this.rb = this.getComponent(RigidBody2D);
            if (!this.rb) {
                console.warn(`[EnemyFollower] 节点 ${this.node.name} 上没有找到 RigidBody2D 组件！将回退到直接位置模式。`);
                this.movementMode = MovementMode.DIRECT_POSITION;
            }
        }

        // 获取 LevelMapManager 以监听时间切换
        this.mapManager = this.node.scene.getComponentInChildren(LevelMapManager);
        if (!this.mapManager) {
            console.warn(`[EnemyFollower] ${this.node.name}: 场景中未找到 LevelMapManager，将无法根据时间线切换激活状态`);
        }

        // 设置碰撞检测
        this.setupCollision();
    }

    onEnable() {
        // 注册时间切换监听
        if (this.mapManager) {
            this.mapManager.registerTimeListener(this.onTimeStateChanged.bind(this));
        }
    }

    onDisable() {
        // 注销时间切换监听
        if (this.mapManager) {
            this.mapManager.unregisterTimeListener(this.onTimeStateChanged.bind(this));
        }

        // 移除碰撞监听
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    start() {
        // 检查是否有 PlayerTracker
        const tracker = this.getPlayerTracker();
        if (!tracker) {
            console.warn(`[EnemyFollower] ${this.node.name}: No PlayerTracker found in scene!`);
            this.isTracking = false;
        } else {
            this.isTracking = true;
        }

        // 初始化激活状态
        this.updateActiveState();
    }

    update(dt: number) {
        // 更新伤害冷却
        if (this.damageCooldownTimer > 0) {
            this.damageCooldownTimer -= dt;
        }

        // 检查是否应该激活
        if (!this.shouldBeActive) {
            // 不激活时不追踪
            return;
        }

        if (!this.isTracking) return;

        const tracker = this.getPlayerTracker();
        if (!tracker) return;

        // 根据跟随模式获取目标位置
        const targetPos = this.getTargetPosition(tracker);

        if (!targetPos) return;

        // 应用偏移
        Vec3.add(this.targetPosition, targetPos, this.positionOffset);

        // 如果不启用 Y 轴跟随，保持当前的 Y 坐标
        if (!this.enableYFollow) {
            this.targetPosition.y = this.node.worldPosition.y;
        }

        // 移动到目标位置
        this.moveToTarget(dt);
    }

    /**
     * 设置碰撞检测
     */
    private setupCollision(): void {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            // 确保是 Trigger 模式（不会推挤玩家）
            if (!collider.sensor) {
                console.warn(`[EnemyFollower] ${this.node.name}: Collider2D 的 Sensor 未勾选，已自动设置`);
                collider.sensor = true;
            }
            // 启用接触监听
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        } else {
            console.warn(`[EnemyFollower] ${this.node.name}: 节点上没有找到 Collider2D 组件！将无法造成伤害。`);
        }
    }

    /**
     * 碰撞开始回调
     */
    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null): void {
        // 检查是否只在激活时造成伤害
        if (this.damageOnlyWhenActive && !this.shouldBeActive) {
            return;
        }

        // 检查碰撞的是否是玩家（兼容 ES5）
        const nodeName = otherCollider.node.name;
        if (nodeName.indexOf('Player') !== 0) {
            return;
        }

        // 检查冷却
        if (this.damageCooldownTimer > 0) {
            return;
        }

        // 获取玩家的 PlayerController
        const playerController = otherCollider.node.getComponent(PlayerController) as PlayerController;
        if (!playerController) {
            console.warn(`[EnemyFollower] ${this.node.name}: 找到 Player 节点但没有 PlayerController 组件`);
            return;
        }

        // 调用玩家的 die() 方法
        playerController.die();

        // 设置冷却，防止连续伤害
        this.damageCooldownTimer = this.damageCooldown;

        // 触发伤害事件（可用于播放音效、特效等）
        this.node.emit('enemy-damage-player');
        console.log(`[EnemyFollower] ${this.node.name} 造成伤害！`);
    }

    /**
     * 时间状态改变回调
     */
    private onTimeStateChanged(state: TimeState): void {
        this.updateActiveState();
    }

    /**
     * 更新激活状态
     */
    private updateActiveState(): void {
        if (!this.mapManager) {
            // 没有地图管理器时，始终激活
            this.shouldBeActive = true;
            return;
        }

        const currentState = this.mapManager.getCurrentState();

        switch (this.activeTimeState) {
            case EnemyTimeState.BOTH:
                this.shouldBeActive = true;
                break;
            case EnemyTimeState.PAST_ONLY:
                this.shouldBeActive = (currentState === TimeState.Past);
                break;
            case EnemyTimeState.FUTURE_ONLY:
                this.shouldBeActive = (currentState === TimeState.Future);
                break;
        }
    }

    /**
     * 获取 PlayerTracker 实例
     */
    private getPlayerTracker(): PlayerTracker | null {
        // 尝试获取单例
        const scene = this.node.scene;
        const trackerNode = scene.getChildByName('Player');

        if (trackerNode) {
            return trackerNode.getComponent(PlayerTracker);
        }

        return null;
    }

    /**
     * 根据跟随模式获取目标位置
     */
    private getTargetPosition(tracker: PlayerTracker): Vec3 | null {
        switch (this.followMode) {
            case FollowMode.TIME_DELAY:
                return tracker.getPositionAtDelay(this.delaySeconds);

            case FollowMode.PATH_INDEX:
                return tracker.getPositionAtIndex(Math.floor(this.pathIndexOffset));

            case FollowMode.STEP_BY_STEP:
                const pos = tracker.getPositionAtIndex(Math.floor(this.currentPathIndex));
                // 更新索引以继续移动
                this.currentPathIndex += this.followSpeed;
                return pos;

            default:
                return null;
        }
    }

    /**
     * 移动到目标位置
     */
    private moveToTarget(dt: number): void {
        if (this.movementMode === MovementMode.RIGIDBODY_VELOCITY && this.rb) {
            // 使用 RigidBody2D 移动
            const currentPos = this.node.worldPosition;
            const direction = new Vec2(
                this.targetPosition.x - currentPos.x,
                this.targetPosition.y - currentPos.y
            );

            const distance = direction.length();

            if (distance > 0.1) {
                // 计算移动速度
                const speed = Math.min(distance * 10, this.maxMoveSpeed);
                direction.normalize();
                const velocity = direction.multiplyScalar(speed);

                // 如果不需要 Y 轴跟随，保持 Y 速度为 0
                if (!this.enableYFollow) {
                    velocity.y = this.rb.linearVelocity.y;
                }

                this.rb.linearVelocity = velocity;
            } else {
                // 到达目标位置，停止移动
                if (this.enableYFollow) {
                    this.rb.linearVelocity = Vec2.ZERO.clone();
                } else {
                    this.rb.linearVelocity = new Vec2(0, this.rb.linearVelocity.y);
                }
            }
        } else {
            // 直接设置位置（默认模式）
            if (this.useSmoothing) {
                // 使用 lerp 平滑移动
                const currentPos = this.node.worldPosition;
                const newPos = new Vec3();

                newPos.x = this.lerp(currentPos.x, this.targetPosition.x, this.smoothSpeed);
                newPos.y = this.lerp(currentPos.y, this.targetPosition.y, this.smoothSpeed);
                newPos.z = this.lerp(currentPos.z, this.targetPosition.z, this.smoothSpeed);

                this.node.setWorldPosition(newPos);
            } else {
                // 直接设置位置
                this.node.setWorldPosition(this.targetPosition);
            }
        }
    }

    /**
     * 线性插值
     */
    private lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    /**
     * 设置跟随模式
     */
    public setFollowMode(mode: FollowMode): void {
        this.followMode = mode;
    }

    /**
     * 设置时间延迟
     */
    public setDelay(seconds: number): void {
        this.delaySeconds = seconds;
    }

    /**
     * 设置轨迹索引偏移
     */
    public setPathIndexOffset(offset: number): void {
        this.pathIndexOffset = offset;
    }

    /**
     * 设置跟随速度
     */
    public setFollowSpeed(speed: number): void {
        this.followSpeed = speed;
    }

    /**
     * 设置是否启用追踪
     */
    public setTracking(enabled: boolean): void {
        this.isTracking = enabled;
    }

    /**
     * 设置激活时间线
     */
    public setActiveTimeState(state: EnemyTimeState): void {
        this.activeTimeState = state;
        this.updateActiveState();
    }

    /**
     * 重置到指定索引
     */
    public resetToIndex(index: number): void {
        this.currentPathIndex = index;
    }

    /**
     * 获取与目标的距离
     */
    public getDistanceToTarget(): number {
        const currentPos = this.node.worldPosition;
        return Vec3.distance(currentPos, this.targetPosition);
    }

    /**
     * 获取到目标的距离平方（性能更好，用于比较）
     */
    public getDistanceToTargetSquared(): number {
        const currentPos = this.node.worldPosition;
        return Vec3.squaredDistance(currentPos, this.targetPosition);
    }
}
