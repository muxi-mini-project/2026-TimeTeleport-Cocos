import { _decorator, Component, Node, Graphics, Vec3, find, Input, input, EventKeyboard, KeyCode, Vec2, RigidBody2D, tween, Color, Sprite, UITransform, director } from 'cc';
import { Anchor } from './Anchor';
import { PlayerController } from '../GamePlay/PlayerController';
const { ccclass, property } = _decorator;

@ccclass('GrappleController')
export class GrappleController extends Component {
    @property({ tooltip: "是否启用钩爪功能" })
    grappleEnabled: boolean = false;

    @property({ tooltip: "是否显示调试日志" })
    debugLog: boolean = true;

    @property({ tooltip: "是否绘制绳索（测试时可关闭）" })
    drawRope: boolean = false;

    @property({ type: Graphics, tooltip: "绳索绘制的 Graphics 组件（需要添加到玩家节点）" })
    ropeGraphics: Graphics = null;

    @property({ tooltip: "钩爪移动速度" })
    grappleSpeed: number = 15;

    @property({ tooltip: "到达目标的最小距离" })
    reachDistance: number = 10;

    @property({ tooltip: "钩爪拉力系数（越大拉动越快）" })
    grappleForce: number = 50;

    @property({ tooltip: "钩爪完成后是否重置冲刺次数" })
    resetDashOnGrapple: boolean = true;

    private isGrappling: boolean = false;
    private targetAnchor: Node | null = null;
    private playerRb: RigidBody2D | null = null;
    private playerController: PlayerController | null = null;
    private ropeVisible: boolean = false;

    onLoad() {
        if (this.debugLog) {
            console.log('[Grapple] GrappleController 组件已加载');
            console.log(`[Grapple] 钩爪功能${this.grappleEnabled ? '已启用' : '已禁用'}`);
        }

        this.playerRb = this.node.getComponent(RigidBody2D);
        this.playerController = this.node.getComponent(PlayerController);

        if (!this.playerRb) {
            console.error('[Grapple] 未找到 RigidBody2D 组件，钩爪无法工作！');
        }

        if (!this.playerController) {
            console.error('[Grapple] 未找到 PlayerController 组件，无法重置冲刺！');
        }

        if (!this.ropeGraphics) {
            this.ropeGraphics = this.node.addComponent(Graphics);
        }

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    private onKeyDown(event: EventKeyboard) {
        if (this.debugLog) {
            console.log(`[Grapple] 检测到按键: ${event.keyCode}`);
        }

        if (event.keyCode === KeyCode.KEY_L) {
            if (this.debugLog) {
                console.log('[Grapple] 按下 L 键');
            }
            if (!this.grappleEnabled) {
                if (this.debugLog) {
                    console.log('[Grapple] 钩爪功能已禁用，忽略按键');
                }
                return;
            }
            this.tryGrapple();
        }
    }

    private findNearestAnchor(): Node | null {
        if (this.debugLog) {
            console.log('[Grapple] 开始查找最近的锚点');
        }

        const scene = director.getScene();
        if (!scene) {
            console.error('[Grapple] 无法获取场景');
            return null;
        }

        const allAnchors: Anchor[] = [];
        this.collectAnchorsRecursive(scene, allAnchors);

        if (this.debugLog) {
            console.log(`[Grapple] 找到 ${allAnchors.length} 个 Anchor 组件`);
        }

        if (allAnchors.length === 0) {
            if (this.debugLog) {
                console.log('[Grapple] 没有找到任何 Anchor 组件');
            }
            return null;
        }

        let nearestAnchor: Node | null = null;
        let nearestDistance: number = Infinity;

        const playerWorldPos = this.node.getWorldPosition();

        for (const anchorComp of allAnchors) {
            const anchorNode = anchorComp.node;

            if (!anchorComp.isInRange()) {
                if (this.debugLog) {
                    console.log(`[Grapple] 锚点 ${anchorNode.name} 超出范围，跳过`);
                }
                continue;
            }

            if (this.debugLog) {
                console.log(`[Grapple] 锚点 ${anchorNode.name} 在范围内，检查距离`);
            }

            const anchorWorldPos = anchorNode.getWorldPosition();
            const distance = Vec3.distance(playerWorldPos, anchorWorldPos);

            if (this.debugLog) {
                console.log(`[Grapple] 锚点 ${anchorNode.name} 距离: ${distance.toFixed(2)}`);
            }

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestAnchor = anchorNode;
            }
        }

        if (nearestAnchor && this.debugLog) {
            console.log(`[Grapple] 找到最近的锚点: ${nearestAnchor.name}，距离 ${nearestDistance.toFixed(2)}`);
        }

        return nearestAnchor;
    }

    private collectAnchorsRecursive(root: Node, anchors: Anchor[]) {
        const anchorComp = root.getComponent(Anchor);
        if (anchorComp) {
            anchors.push(anchorComp);
        }

        for (let i = 0; i < root.children.length; i++) {
            this.collectAnchorsRecursive(root.children[i], anchors);
        }
    }

    public tryGrapple() {
        if (this.debugLog) {
            console.log('[Grapple] 尝试使用钩爪');
        }

        if (this.isGrappling) {
            if (this.debugLog) {
                console.log('[Grapple] 正在钩爪中，忽略请求');
            }
            return;
        }

        this.targetAnchor = this.findNearestAnchor();

        if (this.targetAnchor) {
            this.startGrapple();
        } else {
            if (this.debugLog) {
                console.log('[Grapple] 未找到可用的锚点');
            }
        }
    }

    private startGrapple() {
        this.isGrappling = true;
        this.ropeVisible = true;

        if (this.playerRb) {
            this.playerRb.gravityScale = 0;
            if (this.debugLog) {
                console.log('[Grapple] 已禁用重力');
            }
        }

        if (this.debugLog) {
            console.log('[Grapple] 开始钩爪！');
            console.log(`[Grapple] 目标锚点: ${this.targetAnchor.name}`);
            console.log(`[Grapple] 钩爪速度: ${this.grappleSpeed}`);
            console.log(`[Grapple] 钩爪拉力: ${this.grappleForce}`);
        }
    }

    update(dt: number) {
        if (this.isGrappling && this.targetAnchor) {
            this.updateGrapple();
        }

        if (this.drawRope && this.ropeVisible && this.targetAnchor) {
            this.renderRope();
        }
    }

    private updateGrapple() {
        if (!this.playerRb || !this.targetAnchor) return;

        const playerWorldPos = this.node.getWorldPosition();
        const anchorWorldPos = this.targetAnchor.getWorldPosition();
        const distance = Vec3.distance(playerWorldPos, anchorWorldPos);

        if (distance <= this.reachDistance) {
            this.endGrapple();
            return;
        }

        const direction = new Vec2();
        Vec2.subtract(direction, new Vec2(anchorWorldPos.x, anchorWorldPos.y), new Vec2(playerWorldPos.x, playerWorldPos.y));
        direction.normalize();

        const targetVelocity = direction.multiplyScalar(this.grappleSpeed);
        const currentVelocity = this.playerRb.linearVelocity.clone();

        const velocityDiff = new Vec2();
        Vec2.subtract(velocityDiff, targetVelocity, currentVelocity);

        const force = velocityDiff.multiplyScalar(this.grappleForce);
        this.playerRb.applyForceToCenter(force, true);
    }

    private renderRope() {
        if (!this.ropeGraphics || !this.targetAnchor) return;

        this.ropeGraphics.clear();

        const playerWorldPos = this.node.getWorldPosition();
        const anchorWorldPos = this.targetAnchor.getWorldPosition();

        const uiTransform = this.node.getComponent(UITransform);
        if (!uiTransform) return;

        const playerLocalPos = uiTransform.convertToNodeSpaceAR(playerWorldPos);
        const anchorLocalPos = uiTransform.convertToNodeSpaceAR(anchorWorldPos);

        this.ropeGraphics.moveTo(playerLocalPos.x, playerLocalPos.y);
        this.ropeGraphics.lineTo(anchorLocalPos.x, anchorLocalPos.y);
        this.ropeGraphics.strokeColor = new Color(255, 255, 255, 255);
        this.ropeGraphics.lineWidth = 3;
        this.ropeGraphics.stroke();
    }

    private endGrapple() {
        this.isGrappling = false;
        this.ropeVisible = false;
        this.targetAnchor = null;

        if (this.playerRb) {
            this.playerRb.gravityScale = 1;
            if (this.debugLog) {
                console.log('[Grapple] 已恢复重力');
            }
        }

        if (this.ropeGraphics) {
            this.ropeGraphics.clear();
        }

        if (this.resetDashOnGrapple && this.playerController) {
            this.playerController.resetDash();
            if (this.debugLog) {
                console.log('[Grapple] 冲刺次数已重置');
            }
        }

        if (this.debugLog) {
            console.log('[Grapple] 到达目标，保持动量！');
        }
    }

    public isGrapplingActive(): boolean {
        return this.isGrappling;
    }
}
