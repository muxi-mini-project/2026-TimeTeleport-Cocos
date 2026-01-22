import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact, Tween, Vec3, Sprite, Color } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CrumblingPlatform')
export class CrumblingPlatform extends Component {

    @property({ tooltip: "站在上面的持续时间(秒)后碎裂" })
    crumbleDuration: number = 2.0;

    @property({ tooltip: "碎裂后多久重新生成(秒)" })
    respawnDuration: number = 3.0;

    private _isCrumbling: boolean = false; // 是否正在进行碎裂流程
    private _isBroken: boolean = false;    // 标记：是否已经碎了(消失状态)
    private _initialPos: Vec3 = new Vec3();
    private _initialScale: Vec3 = new Vec3(); // 记录原始缩放
    private _shakeTween: Tween<any> | null = null;

    start() {
        this._initialPos = this.node.position.clone();
        this._initialScale = this.node.scale.clone(); // 记住最开始的大小（包括Tiled生成的缩放）
    }


    public onPlayerStay() {
        // 如果已经开始碎裂流程，或者已经碎了，直接无视后续信号
        if (this._isCrumbling || this._isBroken) return;

        console.log("触发陷阱！地块将在倒计时后必然碎裂");
        this._isCrumbling = true; 

        // 启动不可逆的倒计时
        this.scheduleOnce(this.breakPlatform, this.crumbleDuration);
        this.startShakeEffect();
    }

    /**
     * 第一阶段：视觉抖动警告
     */
    startShakeEffect() {
        this._shakeTween = new Tween(this.node)
            .by(0.05, { position: new Vec3(3, 0, 0) })
            .by(0.05, { position: new Vec3(-3, 0, 0) })
            .union()
            .repeatForever()
            .start();
    }

    stopShakeEffect() {
        this._isCrumbling = false;
        if (this._shakeTween) {
            this._shakeTween.stop();
            this.node.setPosition(this._initialPos); // 恢复位置
            this._shakeTween = null;
        }
    }

    /**
     * 第二阶段：真正碎裂（假死）
     */
    breakPlatform() {
        this._isBroken = true; // 标记为已碎
        this.stopShakeEffect(); // 停止抖动，准备消失

        // 1. 禁用碰撞器（让玩家掉下去）
        const collider = this.getComponent(Collider2D);
        if (collider) collider.enabled = false;

        // 2. 视觉消失动画 (缩小到0)
        new Tween(this.node)
            .to(0.2, { scale: new Vec3(0, 0, 1) }) 
            .call(() => {
                // 3. 消失动画结束后，开启“重生倒计时”
                console.log(`地块消失，将在 ${this.respawnDuration}s 后重生`);
                this.scheduleOnce(this.respawnPlatform, this.respawnDuration);
            })
            .start();
    }

    respawnPlatform() {
        // 恢复碰撞 + 视觉弹出
        const collider = this.getComponent(Collider2D);
        if (collider) collider.enabled = true;
        
        this.node.setScale(0, 0, 1);
        new Tween(this.node)
            .to(0.3, { scale: this._initialScale }, { easing: 'backOut' })
            .call(() => {
                // 【关键】重生动画播完后，才重置状态，允许再次触发
                this._isBroken = false;
                this._isCrumbling = false; 
            })
            .start();
    }
}