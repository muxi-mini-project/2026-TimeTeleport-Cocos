import { _decorator, Component, RigidBody2D, Vec2, Collider2D, Contact2DType, IPhysics2DContact, UITransform, v2, PhysicsSystem2D, ERaycast2DType, Node, Sprite, Color, Vec3 } from 'cc';
import { PlayerController } from '../GamePlay/PlayerController';
const { ccclass, property } = _decorator;

/**
 * 简单敌人 - 类似马里奥蘑菇头
 * 在固定区域内左右巡逻移动
 * 可以被玩家踩踏消灭
 */
@ccclass('SimpleEnemy')
export class SimpleEnemy extends Component {
    // ========== 移动设置 ==========
    @property({ tooltip: '移动速度' })
    moveSpeed: number = 3;

    @property({ tooltip: '巡逻区域左边界（相对于初始位置的X偏移）' })
    leftBoundary: number = -100;

    @property({ tooltip: '巡逻区域右边界（相对于初始位置的X偏移）' })
    rightBoundary: number = 100;

    @property({ tooltip: '地面检测射线长度' })
    groundCheckDistance: number = 20;

    @property({ tooltip: '前方障碍检测距离' })
    wallCheckDistance: number = 10;

    // ========== 踩踏设置 ==========
    @property({ tooltip: '是否可以被踩踏消灭' })
    canBeStomped: boolean = true;

    @property({ tooltip: '踩踏后给予玩家的向上跳跃力' })
    stompBounceForce: number = 15;

    @property({ tooltip: '玩家护盾期间踩踏的额外跳跃力加成' })
    shieldBounceBonus: number = 10;

    // ========== 可视化调试设置 ==========
    @property({ tooltip: '是否在场景中显示边界标记（仅开发环境）' })
    showBoundaryMarkers: boolean = true;

    @property({ tooltip: '边界标记颜色' })
    boundaryMarkerColor: Color = new Color(255, 0, 0, 150);

    // ========== 内部变量 ==========
    private rb: RigidBody2D | null = null;
    private collider: Collider2D | null = null;
    private uiTransform: UITransform | null = null;

    private initialPosition: Vec2 = new Vec2();
    private currentDirection: number = 1; // 1 = 右, -1 = 左
    private isDead: boolean = false;

    // 可视化标记节点引用
    private leftMarker: Node | null = null;
    private rightMarker: Node | null = null;
    private rangeLine: Node | null = null;

    onLoad() {
        this.rb = this.getComponent(RigidBody2D);
        this.collider = this.getComponent(Collider2D);
        this.uiTransform = this.getComponent(UITransform);

        if (!this.rb) {
            console.error(`[SimpleEnemy] ${this.node.name}: 缺少 RigidBody2D 组件！`);
        }
        if (!this.collider) {
            console.error(`[SimpleEnemy] ${this.node.name}: 缺少 Collider2D 组件！`);
        }

        // 设置碰撞监听
        if (this.collider) {
            this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }

        // 创建边界可视化标记
        if (this.showBoundaryMarkers) {
            this.createBoundaryMarkers();
        }
    }

    onEnable() {
        // 初始化位置
        this.initialPosition.x = this.node.worldPosition.x;
        this.initialPosition.y = this.node.worldPosition.y;
    }

    onDisable() {
        if (this.collider) {
            this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    onDestroy() {
        // 清理可视化标记节点
        this.destroyMarkers();
    }

    update(deltaTime: number) {
        if (this.isDead || !this.rb) return;

        // 水平移动
        const velocity = this.rb.linearVelocity;
        velocity.x = this.moveSpeed * this.currentDirection;
        this.rb.linearVelocity = velocity;

        // 检测边界
        this.checkBoundaries();

        // 检测前方障碍
        this.checkWallAhead();
    }

    /**
     * 检查巡逻边界
     */
    private checkBoundaries(): void {
        const currentX = this.node.worldPosition.x;
        const relativeX = currentX - this.initialPosition.x;

        // 超出边界，反向移动
        if (relativeX <= this.leftBoundary && this.currentDirection < 0) {
            this.turnAround();
        } else if (relativeX >= this.rightBoundary && this.currentDirection > 0) {
            this.turnAround();
        }
    }

    /**
     * 检测前方是否有墙壁或悬崖
     */
    private checkWallAhead(): void {
        if (!this.collider || !this.uiTransform) return;

        const aabb = this.collider.worldAABB;
        const direction = this.currentDirection;

        // 前方墙壁检测
        const wallCheckStart = v2(
            direction > 0 ? aabb.xMax : aabb.xMin,
            aabb.center.y
        );
        const wallCheckEnd = v2(
            wallCheckStart.x + direction * this.wallCheckDistance,
            wallCheckStart.y
        );

        const wallResults = PhysicsSystem2D.instance.raycast(
            wallCheckStart,
            wallCheckEnd,
            ERaycast2DType.All
        );

        for (const result of wallResults) {
            // 跳过自己的碰撞体
            if (result.collider.node === this.node) continue;
            // 如果碰到不是传感器的碰撞体，反向
            if (!result.collider.sensor) {
                this.turnAround();
                return;
            }
        }

        // 前方悬崖检测（可选）
        const groundCheckStart = v2(
            direction > 0 ? aabb.xMax : aabb.xMin,
            aabb.yMin
        );
        const groundCheckEnd = v2(
            groundCheckStart.x,
            groundCheckStart.y - this.groundCheckDistance
        );

        const groundResults = PhysicsSystem2D.instance.raycast(
            groundCheckStart,
            groundCheckEnd,
            ERaycast2DType.All
        );

        let hasGroundAhead = false;
        for (const result of groundResults) {
            if (result.collider.node === this.node) continue;
            if (!result.collider.sensor) {
                hasGroundAhead = true;
                break;
            }
        }

        // 如果前方没有地面，反向（防止掉落）
        if (!hasGroundAhead) {
            this.turnAround();
        }
    }

    /**
     * 转向
     */
    private turnAround(): void {
        this.currentDirection *= -1;
        // 翻转精灵
        this.node.setScale(this.currentDirection, 1, 1);
    }

    /**
     * 碰撞开始回调
     */
    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null): void {
        if (this.isDead) return;

        // 检查是否是玩家
        const nodeName = otherCollider.node.name;
        if (nodeName.indexOf('Player') !== 0) return;

        const playerController = otherCollider.node.getComponent(PlayerController);
        if (!playerController) return;

        // 检查是否是踩踏（玩家从上方落下）
        if (this.isPlayerStomping(otherCollider)) {
            this.onStomped(playerController);
        } else {
            // 不是踩踏，玩家受到伤害
            playerController.die();
        }
    }

    /**
     * 检测玩家是否在踩踏敌人
     */
    private isPlayerStomping(playerCollider: Collider2D): boolean {
        if (!this.canBeStomped) return false;
        if (!this.collider || !playerCollider) return false;

        const playerAABB = playerCollider.worldAABB;
        const enemyAABB = this.collider.worldAABB;

        // 玩家的底部在敌人的顶部之上，并且玩家正在向下移动
        const playerBottom = playerAABB.yMin;
        const enemyTop = enemyAABB.yMax;

        // 玩家底部高于敌人中心，且接近敌人顶部
        return playerBottom > enemyAABB.center.y && playerBottom >= enemyTop - 10;
    }

    /**
     * 被踩踏
     */
    private onStomped(playerController: PlayerController): void {
        if (this.isDead) return;
        this.isDead = true;

        // 计算跳跃力（基础力 + 护盾加成）
        const bounceForce = playerController.hasShield()
            ? this.stompBounceForce + this.shieldBounceBonus
            : this.stompBounceForce;

        // 让玩家向上跳跃
        playerController.bounceUp(bounceForce);

        // 敌人死亡效果
        this.die();
    }

    /**
     * 死亡
     */
    private die(): void {
        this.isDead = true;

        // 停止移动
        if (this.rb) {
            this.rb.linearVelocity = Vec2.ZERO.clone();
        }

        // 禁用碰撞体
        if (this.collider) {
            this.collider.enabled = false;
        }

        // 隐藏边界标记
        this.toggleMarkers(false);

        // 简单的死亡动画：缩小并消失
        // 这里可以使用 tween，但由于没有导入，暂时直接销毁
        this.scheduleOnce(() => {
            this.node.destroy();
        }, 0.1);
    }

    // ========== 可视化边界标记方法 ==========

    /**
     * 创建边界可视化标记
     */
    private createBoundaryMarkers(): void {
        // ========== 1. 创建左边界标记（红色柱子）==========
        this.leftMarker = this.createMarker(
            'LeftBoundaryMarker',
            this.leftBoundary,
            new Color(255, 0, 0, 180)
        );
        if (this.leftMarker) {
            this.leftMarker.setParent(this.node);
        }

        // ========== 2. 创建右边界标记（绿色柱子）==========
        this.rightMarker = this.createMarker(
            'RightBoundaryMarker',
            this.rightBoundary,
            new Color(0, 255, 0, 180)
        );
        if (this.rightMarker) {
            this.rightMarker.setParent(this.node);
        }

        // ========== 3. 创建巡逻范围线（黄色横线）==========
        this.rangeLine = this.createRangeLine();
        if (this.rangeLine) {
            this.rangeLine.setParent(this.node);
        }

        // ========== 4. 可选：添加文本标签 ==========
        this.createTextLabel(this.leftMarker, "左");
        this.createTextLabel(this.rightMarker, "右");
    }

    /**
     * 创建单个边界标记（柱子）
     * @param name 节点名称
     * @param xOffset X轴偏移量
     * @param color 标记颜色
     */
    private createMarker(name: string, xOffset: number, color: Color): Node {
        const marker = new Node(name);

        // 设置位置
        marker.setPosition(new Vec3(xOffset, 0, 0));

        // 添加 Sprite 组件
        const sprite = marker.addComponent(Sprite);
        sprite.color = color;

        // 添加 UITransform 并设置大小
        const transform = marker.getComponent(UITransform);
        if (!transform) {
            marker.addComponent(UITransform);
        }

        // 设置标记尺寸（宽5像素，高60像素）
        marker.getComponent(UITransform)!.setContentSize(5, 60);

        // 设置锚点在底部中心
        marker.getComponent(UITransform)!.setAnchorPoint(0.5, 0);

        return marker;
    }

    /**
     * 创建巡逻范围横线
     */
    private createRangeLine(): Node {
        const line = new Node('RangeLine');

        // 计算中心位置
        const centerX = (this.leftBoundary + this.rightBoundary) / 2;
        line.setPosition(new Vec3(centerX, -30, 0)); // 放在敌人下方

        // 添加 Sprite
        const sprite = line.addComponent(Sprite);
        sprite.color = new Color(255, 255, 0, 100); // 半透明黄色

        // 添加 UITransform
        line.addComponent(UITransform);

        // 计算宽度
        const rangeWidth = Math.abs(this.rightBoundary - this.leftBoundary);
        line.getComponent(UITransform)!.setContentSize(rangeWidth, 3);

        return line;
    }

    /**
     * 创建文本标签
     */
    private createTextLabel(parentNode: Node | null, text: string): void {
        if (!parentNode) return;

        const label = new Node('Label');
        label.setParent(parentNode);
        label.setPosition(new Vec3(0, 70, 0)); // 在柱子上方

        const LabelComponent = label.addComponent('cc.Label') as any;
        if (LabelComponent) {
            LabelComponent.string = text;
            LabelComponent.fontSize = 20;
            LabelComponent.color = new Color(255, 255, 255, 255);
            LabelComponent.lineHeight = 20;
        }

        label.addComponent(UITransform);
        label.getComponent(UITransform)!.setContentSize(40, 20);
    }

    /**
     * 切换标记显示/隐藏
     */
    private toggleMarkers(show: boolean): void {
        if (this.leftMarker) this.leftMarker.active = show;
        if (this.rightMarker) this.rightMarker.active = show;
        if (this.rangeLine) this.rangeLine.active = show;
    }

    /**
     * 销毁标记节点（清理）
     */
    private destroyMarkers(): void {
        if (this.leftMarker) {
            this.leftMarker.destroy();
            this.leftMarker = null;
        }
        if (this.rightMarker) {
            this.rightMarker.destroy();
            this.rightMarker = null;
        }
        if (this.rangeLine) {
            this.rangeLine.destroy();
            this.rangeLine = null;
        }
    }
}
