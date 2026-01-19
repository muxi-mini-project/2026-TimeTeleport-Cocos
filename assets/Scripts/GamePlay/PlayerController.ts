import { _decorator, Component, Node, input, Input, KeyCode, EventKeyboard, RigidBody2D, Vec2, Collider2D, Contact2DType, IPhysics2DContact, Vec3, PhysicsSystem2D, ERaycast2DType, BoxCollider2D } from 'cc';
import { TimeTravelManager } from './TravelManager'; 
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {

    @property({ type: TimeTravelManager, tooltip: '引用时空穿越管理器' })
    timeTravelManager: TimeTravelManager = null;

    @property({ tooltip: '移动速度' })
    moveSpeed: number = 10;

    @property({ tooltip: '跳跃力度' })
    jumpForce: number = 20;

    @property({ tooltip: '土狼时间（秒）：离开平台后多少秒内仍可跳跃' })
    coyoteTimeDuration: number = 0.1;

    // --- 新增属性 ---
    @property({ tooltip: '地面检测射线的长度（比碰撞体略长一点点）' })
    raycastLength: number = 0.1; 

    @property({ tooltip: '地面图层的 Group Index (可选，防止检测到自己或道具，根据项目设置填写，默认检测所有)' })
    groundLayerMask: number = 0xffffffff;

    @property({ tooltip: '玩家当前状态的Physics掩码'})
    public playerMask: number = 0xffffffff;

    // 内部状态
    private rigidBody: RigidBody2D = null;
    private collider: BoxCollider2D = null; // 建议明确类型为 BoxCollider2D 以便获取尺寸
    
    // 移动输入状态 (-1, 0, 1)
    private horizontalInput: number = 0;
    
    // 土狼时间计时器
    private coyoteTimer: number = 0;
    
    // 是否在地面
    private isGrounded: boolean = false;

    onLoad() {
        this.rigidBody = this.getComponent(RigidBody2D);
        this.collider = this.getComponent(BoxCollider2D); // 获取 BoxCollider

        // 注册按键监听
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    update(deltaTime: number) {
        // 1. 地面检测 (核心修改)
        this.checkGroundStatus();

        // 2. 处理土狼时间计时
        if (this.coyoteTimer > 0) {
            this.coyoteTimer -= deltaTime;
        }

        // 3. 执行移动逻辑
        this.applyMovement();
    }

    // --- 核心修改：使用射线检测代替碰撞回调 ---
    private checkGroundStatus() {
        if (!this.collider) return;

        // 记录这一帧检测之前的状态
        const wasGrounded = this.isGrounded;

        // 1. 确定射线的起点：角色底部中心
        // 获取世界坐标系的包围盒 (AABB)
        const worldAABB = this.collider.worldAABB;
        
        // 起点：包围盒底部中心
        // worldAABB.center.x 是中心 X
        // worldAABB.yMin 是底部 Y (注意：Cocos坐标系中 yMin 是下方)
        const startPoint = new Vec2(worldAABB.center.x, worldAABB.yMin + 0.05); // 起点稍微往上提一点，防止直接穿透地面导致检测不到
        
        // 终点：起点向下延伸 raycastLength
        const endPoint = new Vec2(startPoint.x, startPoint.y - this.raycastLength);

        // 2. 发射射线
        // ERaycast2DType.Closest 表示只检测最近的一个物体
        const results = PhysicsSystem2D.instance.raycast(startPoint, endPoint, ERaycast2DType.Closest, this.groundLayerMask);

        // 3. 判定结果
        let isHitGround = false;
        if (results.length > 0) {
            const result = results[0];
            // 这里可以增加额外的判断，比如检测到的刚体不是自己，或者检测到的物体属于“地面”标签
            if (result.collider !== this.collider) {
                isHitGround = true;
            }
        }

        this.isGrounded = isHitGround;

        // --- 土狼时间逻辑 ---
        // 如果上一帧在地面，这一帧不在地面，且垂直速度不是向上（意味着不是跳跃导致的离地，而是走下平台）
        if (wasGrounded && !this.isGrounded) {
            if (this.rigidBody.linearVelocity.y <= 0.1) { // 给一点浮点数容差
                this.coyoteTimer = this.coyoteTimeDuration;
            } else {
                // 如果是跳跃导致的离地，立即清空土狼时间
                this.coyoteTimer = 0;
            }
        }
    }

    private onKeyDown(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
                this.horizontalInput = -1;
                this.node.setScale(new Vec3(-1, 1, 1)); 
                break;
            case KeyCode.KEY_D:
                this.horizontalInput = 1;
                this.node.setScale(new Vec3(1, 1, 1));
                break;
            case KeyCode.KEY_J:
                this.tryJump();
                break;
            case KeyCode.KEY_K:
                this.useItem();
                break;
            case KeyCode.SHIFT_LEFT:
                if (this.timeTravelManager) {
                    this.timeTravelManager.tryTimeTravel(); 
                }
                break;
        }
    }

    private onKeyUp(event: EventKeyboard) {
        if (event.keyCode === KeyCode.KEY_A && this.horizontalInput === -1) {
            this.horizontalInput = 0;
        } else if (event.keyCode === KeyCode.KEY_D && this.horizontalInput === 1) {
            this.horizontalInput = 0;
        }
    }

    private applyMovement() {
        if (!this.rigidBody) return;
        const velocity = this.rigidBody.linearVelocity;
        this.rigidBody.linearVelocity = new Vec2(this.horizontalInput * this.moveSpeed, velocity.y);
    }

    private tryJump() {
        // 跳跃判定：在地面 OR 在土狼时间内
        if (this.isGrounded || this.coyoteTimer > 0) {
            const velocity = this.rigidBody.linearVelocity;
            
            this.rigidBody.linearVelocity = new Vec2(velocity.x, this.jumpForce);

            // 跳跃后立即消耗掉状态
            this.coyoteTimer = 0;
            this.isGrounded = false; 
        }
    }

    private useItem() {
        console.log("使用了道具！");
    }
}