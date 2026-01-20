import { _decorator, Component, Node, Input, input, EventKeyboard, KeyCode, Vec2, RigidBody2D, v2, Collider2D, Contact2DType, IPhysics2DContact, misc, PhysicsSystem2D, math } from 'cc';
import { TimeTravelManager } from './TimeTravelManager';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    // --- 新增/修改的移动参数 ---
    @property({ group: "Movement", tooltip: "最大移动速度" })
    moveSpeed: number = 10;

    @property({ group: "Movement", tooltip: "加速度：从0加速到最大速度的快慢" })
    acceleration: number = 40; 

    @property({ group: "Movement", tooltip: "减速度：不按键时的自然摩擦力" })
    deceleration: number = 30;

    @property({ group: "Movement", tooltip: "反向制动力：移动时按反方向键的减速力度 (建议比加速度大)" })
    turnAcceleration: number = 80;

    // --- 原有参数 ---
    @property({ group: "Movement", tooltip: "跳跃力度" })
    jumpForce: number = 18;
    
    @property({ group: "Movement", tooltip: "下降加速度乘数"})
    fallMutiplier: number = 1.5;

    @property({ group: "Dash", tooltip: "冲刺速度" })
    dashSpeed: number = 25;

    @property({ group: "Dash", tooltip: "冲刺时间" })
    dashDuration: number = 0.15;

    @property({ group: "Feel", tooltip: "土狼时间 (秒): 离开平台后多久内仍可起跳" })
    coyoteTime: number = 0.1;

    @property(TimeTravelManager)
    timeTravelManager: TimeTravelManager = null;

    // --- 内部变量 ---
    private rb: RigidBody2D = null!;
    private inputDir: Vec2 = v2(0, 0);
    private facingDir: number = 1;
    
    // 状态标记
    private isDashing: boolean = false;
    private canDash: boolean = true;
    
    // 地面检测与土狼时间
    private groundContactSet: Set<string> = new Set();
    private coyoteTimer: number = 0;

    onLoad() {
        this.rb = this.getComponent(RigidBody2D)!;
        
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        }
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.off(Contact2DType.END_CONTACT, this.onEndContact, this);
        }
    }

    update(dt: number) {
        if (this.isDashing) return;
        
        if (this.coyoteTimer > 0) {
            this.coyoteTimer -= dt;
        }

        this.applyGravityControl();
        
        // 传入 dt (delta time) 用于平滑计算
        this.handleMovement(dt);
    }

    private applyGravityControl() {
        const vel = this.rb.linearVelocity;
        if (vel.y < 0) { 
            this.rb.gravityScale = this.fallMutiplier;
        } else {
            this.rb.gravityScale = 1;
        }
    }

    private onKeyDown(event: EventKeyboard) {
        switch(event.keyCode) {
            case KeyCode.KEY_A: this.inputDir.x = -1; break;
            case KeyCode.KEY_D: this.inputDir.x = 1; break;
            case KeyCode.KEY_W: this.inputDir.y = 1; break;
            case KeyCode.KEY_S: this.inputDir.y = -1; break;
            
            case KeyCode.SPACE:
            case KeyCode.KEY_J: 
                this.tryJump();
                break;

            case KeyCode.KEY_K:
                this.tryDash();
                break;

            case KeyCode.SHIFT_LEFT:
                this.timeTravelManager?.tryTimeTravel();
                break;
        }
    }

    private onKeyUp(event: EventKeyboard) {
        switch(event.keyCode) {
            case KeyCode.KEY_A: if (this.inputDir.x < 0) this.inputDir.x = 0; break;
            case KeyCode.KEY_D: if (this.inputDir.x > 0) this.inputDir.x = 0; break;
            case KeyCode.KEY_W: if (this.inputDir.y > 0) this.inputDir.y = 0; break;
            case KeyCode.KEY_S: if (this.inputDir.y < 0) this.inputDir.y = 0; break;
        }
    }

    // --- 修改的核心部分：基于加速度的移动 ---
    private handleMovement(dt: number) {
        // 1. 处理朝向 (按键即转身，保持操作响应快)
        if (this.inputDir.x !== 0) {
            this.facingDir = this.inputDir.x;
            this.node.setScale(this.facingDir, 1, 1);
        }

        // 2. 获取当前速度和目标速度
        const currentVel = this.rb.linearVelocity;
        const targetSpeedX = this.inputDir.x * this.moveSpeed;

        // 3. 计算这一帧应该使用多大的加速度
        let currentAccel = 0;

        // 情况 A: 没有输入 -> 使用减速度 (摩擦力)
        if (this.inputDir.x === 0) {
            currentAccel = this.deceleration;
        } 
        // 情况 B: 有输入，且输入方向与当前速度方向相反 -> 使用反向制动力 (转身)
        // (currentVel.x * inputDir.x < 0) 说明符号相反
        else if (currentVel.x !== 0 && (Math.sign(currentVel.x) !== this.inputDir.x)) {
            currentAccel = this.turnAcceleration;
        }
        // 情况 C: 正常加速
        else {
            currentAccel = this.acceleration;
        }

        // 4. 应用平滑移动 (MoveTowards 逻辑)
        // 这里的逻辑是：让 currentVel.x 向 targetSpeedX 靠近，每秒变化 currentAccel
        let newX = currentVel.x;
        const speedDiff = targetSpeedX - newX;
        const step = currentAccel * dt; // 这一帧允许变化的速度量

        if (Math.abs(speedDiff) <= step) {
            // 如果差距很小，直接设为目标值 (避免抖动)
            newX = targetSpeedX;
        } else {
            // 否则，向目标方向移动 step
            newX += Math.sign(speedDiff) * step;
        }

        // 5. 应用最终速度
        this.rb.linearVelocity = v2(newX, currentVel.y);
    }

    // --- 跳跃逻辑 ---
    private tryJump() {
        const isGrounded = this.groundContactSet.size > 0;
        const canJump = isGrounded || this.coyoteTimer > 0;

        if (canJump) {
            const vel = this.rb.linearVelocity;
            this.rb.linearVelocity = v2(vel.x, this.jumpForce);
            this.coyoteTimer = 0;
        }
    }

    // --- 冲刺逻辑 ---
    private tryDash() {
        if (!this.canDash) return;
        this.startDash();
    }

    private startDash() {
        this.isDashing = true;
        this.canDash = false; 

        let dashDir = this.inputDir.clone();
        if (dashDir.x === 0 && dashDir.y === 0) dashDir.x = this.facingDir;
        dashDir.normalize();

        this.rb.gravityScale = 0;
        this.rb.linearVelocity = dashDir.multiplyScalar(this.dashSpeed);

        this.scheduleOnce(this.endDash, this.dashDuration);
    }

    private endDash() {
        this.isDashing = false;
        this.rb.gravityScale = 1;
        // 冲刺结束后减速，防止冲刺惯性过大导致飞出去
        this.rb.linearVelocity = this.rb.linearVelocity.multiplyScalar(0.5);
    }

    // --- 碰撞检测保持不变 ---
    private isValidGroundNormal(contact: IPhysics2DContact, selfCollider: Collider2D): boolean {
        const worldManifold = contact.getWorldManifold();
        const normal = worldManifold.normal; 
        if (selfCollider === contact.colliderA) {
            return normal.y < -0.7; 
        } else {
            return normal.y > 0.7;
        }
    }

    private onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
        if (!contact) return;
        if (this.isValidGroundNormal(contact, self)) {
            this.groundContactSet.add(other.uuid); 
            this.canDash = true; 
            this.coyoteTimer = 0; 
        }
    }

    private onEndContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
        if (this.groundContactSet.has(other.uuid)) {
            this.groundContactSet.delete(other.uuid);
            if (this.groundContactSet.size === 0) {
                if (!this.isDashing) {
                    this.coyoteTimer = this.coyoteTime;
                }
            }
        }
    }
}