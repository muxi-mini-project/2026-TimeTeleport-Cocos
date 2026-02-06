import { _decorator, Component, Node, Sprite, SpriteFrame, tween, Vec3, Color } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ShieldEffect')
export class ShieldEffect extends Component {
    @property({ type: Node, tooltip: 'Optional effect node (child). If empty, it will be created.' })
    effectNode: Node = null;

    @property({ type: SpriteFrame, tooltip: 'SpriteFrame used for the shield effect' })
    effectSprite: SpriteFrame = null;

    @property({ tooltip: 'Offset to the right side of the player (world-right, px)' })
    offsetX: number = 40;

    @property({ tooltip: 'Vertical offset (px)' })
    offsetY: number = 0;

    @property({ tooltip: 'Pulse scale multiplier' })
    pulseScale: number = 1.2;

    @property({ tooltip: 'Pulse duration (seconds)' })
    pulseDuration: number = 0.6;

    @property({ tooltip: 'Effect alpha (0-255)' })
    baseAlpha: number = 160;

    private _pulseTween: any = null;

    onLoad() {
        this.ensureEffectNode();
        this.node.on('shield-activated', this.onShieldActivated, this);
        this.node.on('shield-deactivated', this.onShieldDeactivated, this);
    }

    onDestroy() {
        this.node.off('shield-activated', this.onShieldActivated, this);
        this.node.off('shield-deactivated', this.onShieldDeactivated, this);
        this.stopPulse();
    }

    update() {
        this.updateOffset();
    }

    private ensureEffectNode(): void {
        if (!this.effectNode) {
            this.effectNode = new Node('ShieldEffect');
            this.node.addChild(this.effectNode);
        }

        let sprite = this.effectNode.getComponent(Sprite);
        if (!sprite) {
            sprite = this.effectNode.addComponent(Sprite);
        }

        if (this.effectSprite) {
            sprite.spriteFrame = this.effectSprite;
        }

        sprite.color = new Color(120, 200, 255, this.baseAlpha);
        this.effectNode.active = false;
        this.effectNode.setScale(1, 1, 1);
        this.updateOffset();
    }

    private updateOffset(): void {
        if (!this.effectNode) return;
        const scaleX = this.node.scale.x;
        const sign = scaleX >= 0 ? 1 : -1;
        this.effectNode.setPosition(this.offsetX * sign, this.offsetY, 0);
    }

    private onShieldActivated(): void {
        this.showEffect();
    }

    private onShieldDeactivated(): void {
        this.hideEffect();
    }

    private showEffect(): void {
        if (!this.effectNode) return;
        this.effectNode.active = true;
        this.startPulse();
    }

    private hideEffect(): void {
        this.stopPulse();
        if (this.effectNode) {
            this.effectNode.active = false;
        }
    }

    private startPulse(): void {
        this.stopPulse();
        if (!this.effectNode) return;

        const baseScale = this.effectNode.scale.clone();
        this._pulseTween = tween(this.effectNode)
            .to(this.pulseDuration, {
                scale: new Vec3(baseScale.x * this.pulseScale, baseScale.y * this.pulseScale, 1)
            }, { easing: 'sineInOut' })
            .to(this.pulseDuration, { scale: baseScale }, { easing: 'sineInOut' })
            .repeatForever()
            .start();
    }

    private stopPulse(): void {
        if (this._pulseTween) {
            this._pulseTween.stop();
            this._pulseTween = null;
        }
    }
}
