import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact, Sprite, SpriteFrame, Vec3, Enum, tween, UIOpacity, UITransform, resources } from 'cc';
import { CollectibleManager } from '../Core/CollectibleManager';
import { CollectibleType, CollectibleConfig, COLLECTIBLE_ICON_PATHS } from '../Core/CollectibleType';
const { ccclass, property } = _decorator;

@ccclass('TempCollectibleItem')
export class TempCollectibleItem extends Component {

    @property({ tooltip: "收集物唯一ID" })
    collectibleId: string = '';

    @property({ type: Enum(CollectibleType), tooltip: "收集物类型" })
    collectibleType: CollectibleType = CollectibleType.FRAGMENT;

    @property({ type: SpriteFrame, tooltip: "图标（可选）" })
    icon: SpriteFrame = null;

    @property({ tooltip: "存在时间（秒）" })
    lifeTime: number = 5.0;

    @property({ tooltip: "消失动画时长（秒）" })
    disappearDuration: number = 0.5;

    @property({ tooltip: "是否可以被玩家收集" })
    canCollect: boolean = true;

    @property({ tooltip: "是否闪烁提示即将消失" })
    blinkBeforeDisappear: boolean = true;

    @property({ tooltip: "闪烁开始时间（剩余秒数）" })
    blinkStartTime: number = 2.0;

    @property({ tooltip: "闪烁间隔（秒）" })
    blinkInterval: number = 0.2;

    @property({ tooltip: "最终缩放比例" })
    finalScale: number = 0;

    @property({ tooltip: "从 Tiled 读取的图标路径" })
    private _iconPath: string = '';

    private _sprite: Sprite | null = null;
    private _opacity: UIOpacity | null = null;
    private _uiTransform: UITransform | null = null;
    private _collider: Collider2D | null = null;

    private _lifeTimer: number = 0;
    private _isBlinking: boolean = false;
    private _isCollected: boolean = false;
    private _isDisappearing: boolean = false;
    private _disappearTween: any = null;

    onLoad() {
        this._sprite = this.getComponent(Sprite);
        this._opacity = this.getComponent(UIOpacity);
        this._uiTransform = this.getComponent(UITransform);
        this._collider = this.getComponent(Collider2D);

        if (this._collider) {
            if (!this._collider.sensor) {
                console.warn(`[TempCollectibleItem] ${this.node.name}: Collider2D 的 Sensor 未勾选，已自动设置`);
                this._collider.sensor = true;
            }
            this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }

        if (!this.collectibleId) {
            console.error(`[TempCollectibleItem] ${this.node.name}: collectibleId 未设置！`);
        }

        // 添加 UIOpacity 组件（如果没有）
        if (!this._opacity) {
            this._opacity = this.addComponent(UIOpacity);
        }

        // 加载图标
        this.loadIcon();
    }

    onDisable() {
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }

        this.stopAllTweens();
    }

    start() {
        // 启动生命周期倒计时
        this.startLifeTimer();
    }

    private loadIcon(): void {
        if (!this._sprite) {
            console.warn(`[TempCollectibleItem] ${this.collectibleId}: 缺少 Sprite 组件，无法加载图标`);
            return;
        }

        // 优先使用手动设置的 icon
        if (this.icon) {
            this._sprite.spriteFrame = this.icon;
            console.log(`[TempCollectibleItem] ${this.collectibleId}: 使用手动设置的图标`);
            return;
        }

        // 如果有从 Tiled 读取的图标路径，使用该路径
        if (this._iconPath && this._iconPath.length > 0) {
            this.loadIconFromPath(this._iconPath);
            return;
        }

        // 根据类型自动加载图标
        const defaultPath = COLLECTIBLE_ICON_PATHS[this.collectibleType];
        if (defaultPath) {
            this.loadIconFromPath(defaultPath);
        } else {
            console.warn(`[TempCollectibleItem] ${this.collectibleId}: 找不到类型 ${this.collectibleType} 的默认图标路径`);
        }
    }

    private loadIconFromPath(path: string): void {
        resources.load(path, SpriteFrame, (err, spriteFrame) => {
            if (err) {
                console.error(`[TempCollectibleItem] ${this.collectibleId}: 加载图标失败: ${path}`, err);
                return;
            }

            if (spriteFrame && this._sprite) {
                this._sprite.spriteFrame = spriteFrame;
                this.icon = spriteFrame;
                console.log(`[TempCollectibleItem] ${this.collectibleId}: 成功加载图标: ${path}`);
            }
        });
    }

    private startLifeTimer(): void {
        this._lifeTimer = this.lifeTime;
        console.log(`[TempCollectibleItem] ${this.collectibleId}: 启动生命周期，存在时间: ${this.lifeTime}秒`);
    }

    update(dt: number): void {
        if (this._isCollected || this._isDisappearing) return;

        this._lifeTimer -= dt;

        // 检查是否开始闪烁
        if (this.blinkBeforeDisappear && this._lifeTimer <= this.blinkStartTime && !this._isBlinking) {
            this._isBlinking = true;
            console.log(`[TempCollectibleItem] ${this.collectibleId}: 开始闪烁，剩余时间: ${this._lifeTimer.toFixed(2)}秒`);
        }

        // 执行闪烁
        if (this._isBlinking) {
            const blinkPhase = Math.floor(this._lifeTimer / this.blinkInterval);
            const isBlinkOn = blinkPhase % 2 === 0;

            if (this._opacity) {
                this._opacity.opacity = isBlinkOn ? 1.0 : 0.3;
            }
        }

        // 检查是否消失
        if (this._lifeTimer <= 0) {
            this.onTimeExpired();
        }
    }

    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null): void {
        if (this._isCollected || this._isDisappearing) return;

        const nodeName = otherCollider.node.name;
        if (nodeName.indexOf('Player') !== 0) return;

        if (this.canCollect) {
            this.collect();
        } else {
            console.log(`[TempCollectibleItem] ${this.collectibleId}: 不可收集，玩家触碰无效`);
        }
    }

    public collect(): void {
        if (this._isCollected) return;

        this._isCollected = true;

        const manager = CollectibleManager.getInstance();
        if (manager) {
            manager.collectItem({
                collectibleId: this.collectibleId,
                type: this.collectibleType,
                levelId: manager.getCurrentLevelId(),
                instanceId: this.node.uuid,
                position: this.node.getWorldPosition(),
                isCollected: true,
                timestamp: Date.now()
            });
        }

        this.node.emit('collectible-collected', {
            collectibleId: this.collectibleId,
            type: this.collectibleType,
            value: 1
        });

        console.log(`[TempCollectibleItem] ${this.collectibleId}: 已收集`);

        // 播放收集动画（缩小消失）
        this.playCollectAnimation();
    }

    private onTimeExpired(): void {
        if (this._isDisappearing) return;

        this._isDisappearing = true;
        console.log(`[TempCollectibleItem] ${this.collectibleId}: 时间到期，开始消失动画`);

        // 禁用碰撞体，防止玩家继续触碰
        if (this._collider) {
            this._collider.enabled = false;
        }

        this.playDisappearAnimation();
    }

    private playCollectAnimation(): void {
        this.stopAllTweens();

        // 获取当前缩放
        const currentScale = this.node.scale.clone();

        console.log(`[TempCollectibleItem] ${this.collectibleId}: 播放收集动画（缩小消失）`);

        this._disappearTween = tween(this.node)
            .to(this.disappearDuration, {
                scale: new Vec3(
                    currentScale.x * this.finalScale,
                    currentScale.y * this.finalScale,
                    currentScale.z * this.finalScale
                ),
                angle: this.node.angle + 360 // 同时旋转一圈
            }, {
                easing: 'backIn'
            })
            .call(() => {
                console.log(`[TempCollectibleItem] ${this.collectibleId}: 收集动画完成，销毁节点`);
                this.node.destroy();
            })
            .start();
    }

    private playDisappearAnimation(): void {
        this.stopAllTweens();

        // 获取当前缩放和不透明度
        const currentScale = this.node.scale.clone();
        const currentOpacity = this._opacity ? this._opacity.opacity : 1.0;

        console.log(`[TempCollectibleItem] ${this.collectibleId}: 播放消失动画（缩小淡出）`);

        this._disappearTween = tween(this.node)
            .to(this.disappearDuration, {
                scale: new Vec3(
                    currentScale.x * this.finalScale,
                    currentScale.y * this.finalScale,
                    currentScale.z * this.finalScale
                )
            }, {
                easing: 'backIn',
                onUpdate: () => {
                    // 同步缩小不透明度
                    if (this._opacity) {
                        const progress = this._disappearTween.ratio;
                        this._opacity.opacity = currentOpacity * (1 - progress);
                    }
                }
            })
            .call(() => {
                console.log(`[TempCollectibleItem] ${this.collectibleId}: 消失动画完成，销毁节点`);
                this.node.destroy();
            })
            .start();
    }

    private stopAllTweens(): void {
        if (this._disappearTween) {
            this._disappearTween.stop();
            this._disappearTween = null;
        }
    }

    /**
     * 设置图标资源路径（从 Tiled 读取）
     * @param path 资源路径
     */
    public setIconPath(path: string): void {
        this._iconPath = path;
        console.log(`[TempCollectibleItem] ${this.collectibleId}: 设置图标路径: ${path}`);
        this.loadIcon();
    }

    public getCollectibleConfig(): CollectibleConfig {
        return {
            id: this.collectibleId,
            type: this.collectibleType,
            name: `${this.collectibleType}_${this.collectibleId}`,
            description: `临时收集物类型: ${this.collectibleType}，存在时间: ${this.lifeTime}秒`,
            icon: this.icon,
        };
    }

    /**
     * 强制立即消失
     */
    public forceDisappear(): void {
        if (!this._isDisappearing) {
            this.onTimeExpired();
        }
    }

    /**
     * 获取剩余生命时间
     * @returns 剩余时间（秒）
     */
    public getRemainingLifeTime(): number {
        return Math.max(0, this._lifeTimer);
    }

    /**
     * 获取生命进度（0-1）
     * @returns 生命进度，0=刚生成，1=即将消失
     */
    public getLifeProgress(): number {
        return 1 - (this.getRemainingLifeTime() / this.lifeTime);
    }
}
