import { _decorator, Component, Sprite, UITransform, Color, Input, input, EventKeyboard, KeyCode, Vec2, ERaycast2DType, RigidBody2D, v2, Collider2D, Contact2DType, IPhysics2DContact, AudioSource, tween, Vec3, PhysicsSystem2D, Director, Animation } from 'cc';
import { TimeTravelManager } from './TimeTravelManager';
import { GameManager } from '../Core/GameManager';
import { Hazard } from '../Objects/Hazard';
import { CrumblingPlatform } from '../Objects/CrumblingPlatform';
import { GrappleController } from '../Objects/GrappleController';
import { BallObstacle } from '../Objects/BallObstacle';
import { ItemType } from '../Core/ItemType';
const { ccclass, property } = _decorator;

export enum PlayerState {
    IDLE = 0,
    RUN,
    JUMP,
    FALL
}

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ group: "Movement", tooltip: "最大移动速度" })
    moveSpeed: number = 10;

    @property({ group: "Movement", tooltip: "加速度：从0加速到最大速度的快慢" })
    acceleration: number = 40; 

    @property({ group: "Movement", tooltip: "减速度：不按键时的自然摩擦力" })
    deceleration: number = 30;

    @property({ group: "Movement", tooltip: "反向制动力：移动时按反方向键的减速力度 (建议比加速度大)" })
    turnAcceleration: number = 80;

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

    @property({ group: "Feel", tooltip: "射线检测的长度（超出脚底的距离）" })
    raycastLength: number = 10;

    @property({ group: "GamePlay"})
    minYThreshold: number = -50;

    @property({ group: "GamePlay"})
    groundLayerMask: number = 0xffffffff;

    @property(TimeTravelManager)
    timeTravelManager: TimeTravelManager = null;

    @property(GrappleController)
    grappleController: GrappleController = null;

    @property(Animation)
    deathAnim: Animation = null;

    @property(Animation)
    anim: Animation = null;

    private sprite: Sprite = null;
    private currentState: PlayerState = PlayerState.IDLE;

    @property(AudioSource)
    deathSound: AudioSource = null;

    @property({ group: "Shield", tooltip: "护盾是否激活（仅供调试查看）" })
    private _shieldActive: boolean = false;

    @property({ group: "Shield", tooltip: "护盾剩余时间（仅供调试查看）" })
    private _shieldTimeRemaining: number = 0;

    private _currentItemType: ItemType | null = null;
    private _currentItemData: any = null;

    private rb: RigidBody2D = null!;
    private inputDir: Vec2 = v2(0, 0);
    private facingDir: number = 1;

    private isDashing: boolean = false;
    private canDash: boolean = true;
    private isDead: boolean = false;
    private isFrozen: boolean = false;
    private _isGrounded: boolean = false;
    private _collider: Collider2D | null = null;
    private _uiTransform: UITransform | null = null;

    private _inputEnabled: boolean = true;

    private groundContactSet: Set<string> = new Set();
    private coyoteTimer: number = 0;

    onLoad() {
        this.rb = this.getComponent(RigidBody2D)!;
        this._collider = this.getComponent(Collider2D);
        this._uiTransform = this.getComponent(UITransform);
        this.sprite = this.getComponent(Sprite);

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);

        if (this.grappleController) {
            console.log('[PlayerController] GrappleController 已正确绑定');
        } else {
            console.warn('[PlayerController] GrappleController 未绑定，请在 Inspector 中拖入 GrappleController 组件');
        }

        GameManager.instance.resetLevel(this.node.getWorldPosition());

        Director.instance.on('PLAYER_FREEZE', this.onPlayerFreeze, this);
    }

    onEnable() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    onDisable() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        Director.instance.off('PLAYER_FREEZE', this.onPlayerFreeze, this);
    }

    public setInputActive(enabled: boolean): void {
        this._inputEnabled = enabled;
        console.log(`[PlayerController] 输入${enabled ? '启用' : '禁用'}`);

        if (!enabled) {
            this.inputDir.set(0, 0);
            if (this.rb) {
                this.rb.linearVelocity = Vec2.ZERO.clone();
            }
        }
    }

    public isInputActive(): boolean {
        return this._inputEnabled;
    }

    update(dt: number) {
        if (this.isDead) return;

        if (this.isFrozen) {
            this.rb.linearVelocity = Vec2.ZERO.clone();
            this.inputDir.set(0, 0);
            return;
        }

        if (this.node.getWorldPosition().y < this.minYThreshold){
            console.log(`[Info]玩家掉出世界, y:${this.node.getWorldPosition().y}`);
            this.die();
            return;
        }

        if (this.isDashing) return;

        if (this.grappleController && this.grappleController.isGrapplingActive()) {
            return;
        }

        this.checkGroundedWithRaycast();
        
        if (!this._isGrounded && this.coyoteTimer > 0) {
            this.coyoteTimer -= dt;
        }

        this.applyGravityControl();
        this.handleMovement(dt);

        this.updateShield(dt);
        
        this.updatePlayerState();
    }

    public die(){
        if (this.isDead) return;

        if (this._shieldActive) {
            console.log("护盾保护中，免疫伤害！");
            return;
        }

        this.isDead = true;

        console.log("玩家死亡");

        if (this._currentItemType === ItemType.SHIELD) {
            this._currentItemType = null;
            this._currentItemData = null;
        }
        if (this._shieldActive) {
            this.deactivateShield();
        }

        this.node.emit('player-died');

        const rb = this.getComponent(RigidBody2D);
        if (rb){
            rb.linearVelocity = Vec2.ZERO.clone();
            rb.angularVelocity = 0;
            rb.enabled = false;
        }

        const collider = this.getComponent(Collider2D);
        if (collider){
            collider.enabled = false;
        }

        this.playDeathEffect();
    }

    private playDeathEffect() {
        if (this.deathSound) {
            this.deathSound.play();
        }

        if (this.deathAnim) {
            this.deathAnim.play();
            this.scheduleOnce(() => {
                this.respawn();
            }, 0.8)
        }
        else {
            const sprite = this.getComponent(Sprite);
            if (sprite) {
                sprite.color = Color.RED;
            }
            
            tween(this.node)
            .delay(0.1)
            .by(0.4, { position: new Vec3(0, 20, 0) }, { easing: 'cubicOut' })
            .by(0.8, { position: new Vec3(0, -2000, 0) }, { easing: 'cubicIn' })
            .call(() => {
                this.respawn();
            })
            .start();
        }
    }

    private respawn(){
        const gm = GameManager.instance;
        const targetPos = gm.currentCheckpointPos ? gm.currentCheckpointPos : gm.defaultSpawnPos;

        console.log(`玩家准备复活,位置${targetPos}`);

        this.node.setScale(new Vec3(1, 1, 1));
        this.node.angle = 0;
        const sprite = this.getComponent(Sprite);
        if (sprite) sprite.color = Color.WHITE;

        this.scheduleOnce(() => {
            this.isDead = false;

            const rb = this.getComponent(RigidBody2D);
            const collider = this.getComponent(Collider2D);
            
            if (rb && collider) {
                rb.linearVelocity = Vec2.ZERO.clone();
                rb.angularVelocity = 0;
                
                collider.enabled = true;
                collider.apply();
                
                rb.enabled = true;
                
                this.node.setWorldPosition(targetPos);
                
                rb.linearVelocity = Vec2.ZERO.clone();
                rb.wakeUp();
            } else {
                this.node.setWorldPosition(targetPos);
            }

            console.log(`玩家复活完成,位置${targetPos}`);
            this.node.emit('player-respawned');

            if (this._currentItemType === ItemType.GRAPPLE) {
                this.node.emit('item-picked-up', {
                    itemType: this._currentItemType,
                    itemData: this._currentItemData
                });
            }
        }, 0);
    }

    private applyGravityControl() {
        const vel = this.rb.linearVelocity;
        if (vel.y < 0) { 
            this.rb.gravityScale = this.fallMutiplier;
        } else {
            this.rb.gravityScale = 1;
        }
    }

    private onPlayerFreeze(frozen: boolean) {
        this.isFrozen = frozen;
        console.log(`[Dash_and_Contact] 玩家${frozen ? '已冻结' : '已解冻'}`);

        if (frozen && this.rb) {
            this.rb.linearVelocity = Vec2.ZERO.clone();
            this.inputDir.set(0, 0);
        }
    }

    private onKeyDown(event: EventKeyboard) {
        if (!this._inputEnabled) {
            return;
        }

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

            case KeyCode.KEY_I:
                this.tryUseCurrentItem();
                break;

            case KeyCode.SHIFT_LEFT:
                this.timeTravelManager?.tryTimeTravel();
                break;
        }
    }

    private onKeyUp(event: EventKeyboard) {
        if (!this._inputEnabled) {
            return;
        }

        switch(event.keyCode) {
            case KeyCode.KEY_A: if (this.inputDir.x < 0) this.inputDir.x = 0; break;
            case KeyCode.KEY_D: if (this.inputDir.x > 0) this.inputDir.x = 0; break;
            case KeyCode.KEY_W: if (this.inputDir.y > 0) this.inputDir.y = 0; break;
            case KeyCode.KEY_S: if (this.inputDir.y < 0) this.inputDir.y = 0; break;
        }
    }

    private handleMovement(dt: number) {
        if (this.inputDir.x !== 0) {
            this.facingDir = this.inputDir.x;
            this.node.setScale(this.facingDir, 1, 1);
        }

        const currentVel = this.rb.linearVelocity;
        const targetSpeedX = this.inputDir.x * this.moveSpeed;

        let currentAccel = 0;

        if (this.inputDir.x === 0) {
            currentAccel = this.deceleration;
        } 
        else if (currentVel.x !== 0 && (Math.sign(currentVel.x) !== this.inputDir.x)) {
            currentAccel = this.turnAcceleration;
        }
        else {
            currentAccel = this.acceleration;
        }

        let newX = currentVel.x;
        const speedDiff = targetSpeedX - newX;
        const step = currentAccel * dt;

        if (Math.abs(speedDiff) <= step) {
            newX = targetSpeedX;
        } else {
            newX += Math.sign(speedDiff) * step;
        }

        this.rb.linearVelocity = v2(newX, currentVel.y);
    }

    private tryJump() {
        const isGrounded = this.groundContactSet.size > 0;
        const canJump = this._isGrounded || this.coyoteTimer > 0;

        if (canJump) {
            const vel = this.rb.linearVelocity;
            this.rb.linearVelocity = v2(vel.x, this.jumpForce);
            this.coyoteTimer = 0;
        }
    }

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
        this.rb.linearVelocity = this.rb.linearVelocity.multiplyScalar(0.5);
    }

    private checkGroundedWithRaycast() {
        if (!this._collider || !this._uiTransform) return;

        const aabb = this._collider.worldAABB;
        const startY = aabb.center.y; 
        const halfHeight = aabb.height / 2;
        const totalRayLength = halfHeight + this.raycastLength;

        const xMin = aabb.xMin + 5; 
        const xMax = aabb.xMax - 5;
        const xCenter = aabb.center.x;

        const startPoints = [
            v2(xMin, startY),
            v2(xCenter, startY),
            v2(xMax, startY)
        ];

        let isHitGround = false;

        for (const startPoint of startPoints) {
            const p2 = v2(startPoint.x, startPoint.y - totalRayLength); 

            const results = PhysicsSystem2D.instance.raycast(startPoint, p2, ERaycast2DType.All, this.groundLayerMask);

            for (const result of results) {
                if (result.collider.node === this.node) continue;
                if (result.collider.sensor) continue;
                isHitGround = true;
                
                const crumbleComp = result.collider.getComponent(CrumblingPlatform);
                if (crumbleComp) {
                    crumbleComp.onPlayerStay();
                }

                break; 
            }
            if (isHitGround) break;
        }

        this._isGrounded = isHitGround;

        if (isHitGround) {
            this.coyoteTimer = this.coyoteTime;
            this.canDash = true;
        }
    }

    private onBeginContact(
        self: Collider2D,
        other: Collider2D,
        contact: IPhysics2DContact | null
    ) {
        if (this.isDead) return;

        if (other.getComponent(BallObstacle)) {
            console.log("玩家撞到球障碍！");
            this.die();
            return;
        }

        if (other.getComponent(Hazard)) {
            console.log("撞到了危险物！");
            this.die();
        }
    }

    public setCurrentItem(itemType: ItemType, itemData?: any): void {
        if (this._currentItemType === ItemType.SHIELD && this._shieldActive) {
            console.log('[PlayerController] 护盾激活中，无法切换道具');
            return;
        }

        this._currentItemType = itemType;
        this._currentItemData = itemData;

        console.log(`[PlayerController] 设置当前道具: ${itemType}`);

        this.node.emit('item-picked-up', {
            itemType: itemType,
            itemData: itemData
        });

        if (itemType === ItemType.GRAPPLE && this.grappleController) {
            this.grappleController.grappleEnabled = true;
        }
    }

    public getCurrentItemType(): ItemType | null {
        return this._currentItemType;
    }

    private tryUseCurrentItem(): void {
        if (!this._currentItemType) {
            console.log('[PlayerController] 没有可用道具');
            this.node.emit('item-use-failed');
            return;
        }

        let success = false;

        switch (this._currentItemType) {
            case ItemType.SHIELD:
                success = this.useShield();
                break;
            case ItemType.GRAPPLE:
                if (this.grappleController) {
                    success = this.grappleController.tryUse();
                }
                break;
        }

        if (success) {
            console.log(`[PlayerController] 使用道具成功: ${this._currentItemType}`);
            this.node.emit('item-used', {
                itemType: this._currentItemType
            });

            if (this._currentItemType === ItemType.SHIELD) {
                this._currentItemType = null;
                this._currentItemData = null;
                this.node.emit('item-removed');
            }
        } else {
            console.log(`[PlayerController] 使用道具失败: ${this._currentItemType}`);
            this.node.emit('item-use-failed');
        }
    }

    public useShield(): boolean {
        if (this._shieldActive) {
            console.log("[护盾] 护盾已激活中，无需重复使用！");
            return false;
        }

        const duration = this._currentItemData || 3.0;
        this.activateShield(duration);
        return true;
    }

    public addShieldToInventory(duration: number): void {
        this.setCurrentItem(ItemType.SHIELD, duration);
    }

    public getShieldInventoryCount(): number {
        return this._currentItemType === ItemType.SHIELD ? 1 : 0;
    }

    public activateShield(duration: number): void {
        this._shieldActive = true;
        this._shieldTimeRemaining = duration;

        console.log(`[护盾] 激活护盾，持续 ${duration} 秒`);

        this.node.emit('shield-activated', { duration: duration });
    }

    private updateShield(dt: number): void {
        if (!this._shieldActive) return;

        this._shieldTimeRemaining -= dt;

        if (this._shieldTimeRemaining <= 0) {
            this.deactivateShield();
        }
    }

    private deactivateShield(): void {
        if (!this._shieldActive) return;

        this._shieldActive = false;
        this._shieldTimeRemaining = 0;

        console.log("[护盾] 护盾已失效");

        this.node.emit('shield-deactivated');
    }

    public hasShield(): boolean {
        return this._shieldActive;
    }

    public getShieldTimeRemaining(): number {
        return this._shieldTimeRemaining;
    }

    public bounceUp(force: number): void {
        const vel = this.rb.linearVelocity;
        this.rb.linearVelocity = v2(vel.x, force);
        console.log(`[弹跳] 向上跳跃，力度: ${force}`);
    }

    public resetDash(): void {
        this.canDash = true;
        console.log('[PlayerController] 冲刺次数已重置');
    }

    changeState(newState: PlayerState) {
        if (this.currentState === newState) return;
        this.currentState = newState;
        var aniName: string = 'idle';
        if (this.anim) {
            switch (newState) {
                case PlayerState.IDLE: aniName = 'idle';
                break;
                case PlayerState.JUMP: aniName = 'jump';
                break;
                case PlayerState.FALL: aniName = 'fall';
                break;
                case PlayerState.RUN: aniName = 'run';
                break;
            }
        }

        if (this.anim.getState(aniName)) {
            this.anim.play(aniName);
        }

        if (!this.sprite) return;
        
        switch (this.currentState) {
            case PlayerState.IDLE:
                this.sprite.color = Color.WHITE;
                break;
            case PlayerState.RUN:
                this.sprite.color = Color.GREEN;
                break;
            case PlayerState.JUMP:
                this.sprite.color = Color.YELLOW;
                break;
            case PlayerState.FALL:
                this.sprite.color = Color.RED;
                break;
        }
    }

    private updatePlayerState(): void {
        if (this.isDashing) return;
        
        const vel = this.rb.linearVelocity;
        
        if (this._isGrounded) {
            if (Math.abs(vel.x) > 0.1) {
                this.changeState(PlayerState.RUN);
            } else {
                this.changeState(PlayerState.IDLE);
            }
        } else {
            if (vel.y > 0) {
                this.changeState(PlayerState.JUMP);
            } else {
                this.changeState(PlayerState.FALL);
            }
        }
    }
}
