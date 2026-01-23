import { _decorator, Component, RigidBody2D, Vec2, Collider2D, Contact2DType, IPhysics2DContact, UITransform, v2, PhysicsSystem2D, ERaycast2DType, Node, Sprite, Color, Vec3, Graphics, Camera, Layers } from 'cc';
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
    }

    onEnable() {
        // 初始化位置
        this.initialPosition.x = this.node.worldPosition.x;
        this.initialPosition.y = this.node.worldPosition.y;

        // 创建边界可视化标记（在 onEnable 中创建，确保位置已初始化）
        if (this.showBoundaryMarkers) {
            this.createBoundaryMarkers();
        }
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
     * 创建边界可视化标记（使用 Graphics 组件，固定在世界空间）
     */
    private createBoundaryMarkers(): void {
        // 获取敌人的父节点（确保坐标系统一致）
        const parentNode = this.node.parent;
        if (!parentNode) {
            console.error(`[SimpleEnemy] 无法创建边界标记：敌人没有父节点`);
            return;
        }

        // 获取敌人的实际本地位置
        const enemyLocalPos = this.node.position;
        const localX = enemyLocalPos.x;
        const localY = enemyLocalPos.y;

        // 计算边界位置（敌人位置 + 偏移）
        const leftLocalX = localX + this.leftBoundary;
        const rightLocalX = localX + this.rightBoundary;

        console.log(`[SimpleEnemy] 创建边界标记:`);
        console.log(`  - 父节点: ${parentNode.name}`);
        console.log(`  - 敌人本地位置: (${localX}, ${localY})`);
        console.log(`  - 敌人世界位置: (${this.node.worldPosition.x}, ${this.node.worldPosition.y})`);
        console.log(`  - 左边界本地X: ${leftLocalX} (敌人X ${localX} + 偏移 ${this.leftBoundary})`);
        console.log(`  - 右边界本地X: ${rightLocalX} (敌人X ${localX} + 偏移 ${this.rightBoundary})`);

        // ========== 1. 创建左边界标记（红色柱子）==========
        this.leftMarker = this.createMarker(
            parentNode,
            'LeftBoundaryMarker',
            leftLocalX,
            localY,
            new Color(255, 0, 0, 255)
        );

        // ========== 2. 创建右边界标记（绿色柱子）==========
        this.rightMarker = this.createMarker(
            parentNode,
            'RightBoundaryMarker',
            rightLocalX,
            localY,
            new Color(0, 255, 0, 255)
        );

        // ========== 3. 创建巡逻范围线（黄色横线）==========
        this.rangeLine = this.createRangeLine(
            parentNode,
            leftLocalX,
            rightLocalX,
            localY
        );
    }

    /**
     * 创建单个边界标记（使用 Graphics 绘制矩形）
     * @param parent 父节点
     * @param name 节点名称
     * @param x 本地坐标X（相对于父节点）
     * @param y 本地坐标Y（相对于父节点）
     * @param color 标记颜色
     */
    private createMarker(
        parent: Node,
        name: string,
        x: number,
        y: number,
        color: Color
    ): Node {
        const marker = new Node(name);

        // 添加 UITransform 组件（Graphics节点必须有）
        const transform = marker.addComponent(UITransform);
        transform.setContentSize(100, 100); // 设置一个足够大的内容区域
        transform.setAnchorPoint(0.5, 0); // 锚点在底部中心

        // 设置Layer为默认层（与游戏对象相同）
        marker.layer = this.node.layer; // 使用与敌人相同的 layer

        // 设置本地坐标位置（相对于父节点）
        marker.setPosition(new Vec3(x, y, 0));

        console.log(`[SimpleEnemy] 创建标记 ${name} 在本地位置 (${x}, ${y})`);

        // 添加 Graphics 组件
        const graphics = marker.addComponent(Graphics);

        // 绘制矩形柱子（宽10像素，高60像素，向上延伸）
        const width = 10;
        const height = 80;

        // 使用更粗、更高的矩形
        graphics.fillColor = color;
        graphics.rect(-width / 2, 0, width, height); // 从底部开始向上绘制
        graphics.fill();

        // 再绘制一个边框使其更明显
        graphics.strokeColor = new Color(255, 255, 255, 255); // 白色边框
        graphics.lineWidth = 1;
        graphics.rect(-width / 2, 0, width, height);
        graphics.stroke();

        // 添加到父节点（与敌人相同的父节点）
        marker.setParent(parent);

        // 确保节点激活
        marker.active = true;

        console.log(`[SimpleEnemy] 标记 ${name} 已创建，active=${marker.active}, 世界位置=(${marker.worldPosition.x}, ${marker.worldPosition.y})`);

        return marker;
    }

    /**
     * 创建巡逻范围横线（使用 Graphics 绘制线条）
     * @param parent 父节点
     * @param leftX 左边界本地坐标X
     * @param rightX 右边界本地坐标X
     * @param y 本地坐标Y
     */
    private createRangeLine(
        parent: Node,
        leftX: number,
        rightX: number,
        y: number
    ): Node {
        const line = new Node('RangeLine');

        // 添加 UITransform
        const transform = line.addComponent(UITransform);
        const rangeWidth = Math.abs(rightX - leftX);
        transform.setContentSize(rangeWidth + 50, 50);
        transform.setAnchorPoint(0.5, 0.5);

        // 设置Layer
        line.layer = this.node.layer; // 使用与敌人相同的 layer

        // 计算中心位置
        const centerX = (leftX + rightX) / 2;
        line.setPosition(new Vec3(centerX, y - 20, 0)); // 放在敌人下方20像素

        console.log(`[SimpleEnemy] 创建范围线 本地中心位置(${centerX}, ${y - 20}), 宽度=${rangeWidth}`);

        // 添加 Graphics 组件
        const graphics = line.addComponent(Graphics);

        // 计算相对坐标（相对于中心点）
        const halfWidth = (rightX - leftX) / 2;

        // 绘制多条线条使其更明显
        // 主线
        graphics.strokeColor = new Color(255, 255, 0, 255); // 黄色
        graphics.lineWidth = 3;
        graphics.moveTo(-halfWidth, 0);
        graphics.lineTo(halfWidth, 0);
        graphics.stroke();

        // 再绘制一条细一点的亮色线
        graphics.strokeColor = new Color(255, 255, 255, 200); // 白色半透明
        graphics.lineWidth = 1;
        graphics.moveTo(-halfWidth, 0);
        graphics.lineTo(halfWidth, 0);
        graphics.stroke();

        // 在两端绘制大圆点作为端点标记
        graphics.fillColor = new Color(255, 0, 0, 255); // 红色
        graphics.circle(-halfWidth, 0, 8);
        graphics.fill();
        graphics.fillColor = new Color(0, 255, 0, 255); // 绿色
        graphics.circle(halfWidth, 0, 8);
        graphics.fill();

        // 添加到父节点
        line.setParent(parent);

        // 确保节点激活
        line.active = true;

        console.log(`[SimpleEnemy] 范围线已创建，active=${line.active}, 世界位置=(${line.worldPosition.x}, ${line.worldPosition.y})`);

        return line;
    }

    /**
     * 切换标记显示/隐藏
     */
    private toggleMarkers(show: boolean): void {
        if (this.leftMarker) this.leftMarker.active = show;
        if (this.rightMarker) this.rightMarker.active = show;
        if (this.rangeLine) this.rangeLine.active = show;
        console.log(`[SimpleEnemy] 切换标记显示: ${show}`);
    }

    /**
     * 销毁标记节点（清理）
     */
    private destroyMarkers(): void {
        console.log(`[SimpleEnemy] 销毁标记节点`);
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
