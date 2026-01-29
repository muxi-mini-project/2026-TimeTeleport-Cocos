import { _decorator, Component, Node, Sprite, UITransform, Color, Graphics, Vec3, find, Tween, tween, director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Anchor')
export class Anchor extends Component {
    @property({ tooltip: "检测半径" })
    detectionRadius: number = 200;

    @property({ tooltip: "是否显示调试绘制" })
    debugDraw: boolean = false;

    @property({ tooltip: "范围指示器动画时长(秒)" })
    indicatorAnimDuration: number = 0.3;

    @property({ type: Graphics, tooltip: "调试绘制的 Graphics 组件（留空则自动创建子节点）" })
    debugGraphics: Graphics = null;

    @property({ type: Graphics, tooltip: "范围指示器的 Graphics 组件（留空则自动创建子节点）" })
    indicatorGraphics: Graphics = null;

    @property({ type: Node, tooltip: "玩家节点（留空则自动查找）" })
    playerNodeRef: Node | null = null;

    private playerNode: Node | null = null;
    private isPlayerInRange: boolean = false;
    private indicatorActive: boolean = false;

    private indicatorTime: number = 0;
    private graphicsNode: Node | null = null;

    onLoad() {
        this.setupGraphics();
    }

    start() {
        this.findPlayerNode();
    }

    private setupGraphics() {
        if (!this.indicatorGraphics) {
            const existingGraphics = this.node.getComponent(Graphics);
            if (existingGraphics) {
                this.indicatorGraphics = existingGraphics;
            } else {
                this.graphicsNode = new Node('Graphics');
                this.graphicsNode.setPosition(0, 0, 0);
                this.node.addChild(this.graphicsNode);
                this.indicatorGraphics = this.graphicsNode.addComponent(Graphics);
            }
        }

        if (this.debugDraw && !this.debugGraphics) {
            if (!this.graphicsNode) {
                this.graphicsNode = new Node('Graphics');
                this.graphicsNode.setPosition(0, 0, 0);
                this.node.addChild(this.graphicsNode);
            }
            this.debugGraphics = this.graphicsNode.getComponent(Graphics);
        }
    }

    private findPlayerNode() {
        if (this.playerNodeRef) {
            this.playerNode = this.playerNodeRef;
            console.log('[Anchor] 使用手动指定的玩家节点');
            return;
        }

        const scene = director.getScene();
        if (!scene) {
            console.error('[Anchor] 无法获取场景');
            return;
        }

        this.playerNode = this.findNodeRecursive(scene, 'Player');

        if (this.playerNode) {
            console.log('[Anchor] 成功找到 Player 节点');
        } else {
            console.warn('[Anchor] 未找到 Player 节点，已搜索整个场景树');
            this.logSceneStructure(scene, 0);
        }
    }

    private findNodeRecursive(root: Node, name: string): Node | null {
        if (root.name === name) {
            return root;
        }

        for (let i = 0; i < root.children.length; i++) {
            const child = root.children[i];
            const found = this.findNodeRecursive(child, name);
            if (found) {
                return found;
            }
        }

        return null;
    }

    private logSceneStructure(node: Node, depth: number) {
        const indent = '  '.repeat(depth);
        console.log(`${indent}- ${node.name}`);

        if (depth < 3) {
            for (let i = 0; i < node.children.length; i++) {
                this.logSceneStructure(node.children[i], depth + 1);
            }
        }

        if (this.debugDraw && !this.debugGraphics) {
            if (!this.graphicsNode) {
                this.graphicsNode = new Node('Graphics');
                this.graphicsNode.setPosition(0, 0, 0);
                this.node.addChild(this.graphicsNode);
            }
            this.debugGraphics = this.graphicsNode.getComponent(Graphics);
        }
    }

    update(dt: number) {
        if (!this.playerNode) {
            return;
        }

        const playerWorldPos = this.playerNode.getWorldPosition();
        const anchorWorldPos = this.node.getWorldPosition();
        const distance = Vec3.distance(playerWorldPos, anchorWorldPos);
        const wasInRange = this.isPlayerInRange;
        this.isPlayerInRange = distance <= this.detectionRadius;

        if (this.debugDraw) {
            this.drawDebugRange();
        }

        if (this.isPlayerInRange && !wasInRange) {
            this.onPlayerEnterRange();
        }

        if (this.indicatorActive) {
            this.updateIndicator(dt);
        }
    }

    private drawDebugRange() {
        if (!this.debugGraphics) return;

        this.debugGraphics.clear();

        this.debugGraphics.circle(
            0,
            0,
            this.detectionRadius
        );

        this.debugGraphics.strokeColor = new Color(255, 255, 0, 100);
        this.debugGraphics.lineWidth = 2;
        this.debugGraphics.stroke();
    }

    private onPlayerEnterRange() {
        this.indicatorActive = true;
        console.log('[Anchor] 玩家进入范围，开始显示指示器');
    }

    private updateIndicator(dt: number) {
        this.indicatorTime += dt;
        const progress = Math.min(this.indicatorTime / this.indicatorAnimDuration, 1);
        const currentRadius = this.detectionRadius * (1 - progress);

        this.indicatorGraphics.clear();
        this.indicatorGraphics.circle(0, 0, currentRadius);
        this.indicatorGraphics.strokeColor = new Color(0, 255, 255, 255);
        this.indicatorGraphics.lineWidth = 3;
        this.indicatorGraphics.stroke();

        if (progress >= 1) {
            this.indicatorActive = false;
            this.indicatorTime = 0;
        }
    }

    public isInRange(): boolean {
        return this.isPlayerInRange;
    }
}
