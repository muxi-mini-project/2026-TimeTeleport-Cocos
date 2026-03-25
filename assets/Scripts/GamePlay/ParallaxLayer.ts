import { _decorator, Component, Node, Camera, UITransform, view, Sprite, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ParallaxLayer')
export class ParallaxLayer extends Component {
    @property(Camera)
    camera: Camera = null;

    @property({ 
        tooltip: '滚动速度比例 (0.1=慢速远景, 1.0=与相机同步)',
        slide: true,
        range: [0, 1, 0.01]
    })
    scrollSpeed: number = 0.5;

    @property({ tooltip: '是否启用无限循环（长地图必备）' })
    infiniteScroll: boolean = true;

    private bgWidth: number = 0;
    private bgHeight: number = 0;
    private layers: Node[] = [];
    private viewWidth: number = 0;
    private viewHeight: number = 0;
    private initialWorldPos: Vec3 = new Vec3();

    onLoad() {
        const uiTransform = this.node.getComponent(UITransform);
        if (!uiTransform) {
            console.error('[ParallaxLayer] 缺少 UITransform 组件！');
            return;
        }

        this.bgWidth = uiTransform.contentSize.width;
        this.bgHeight = uiTransform.contentSize.height;
        
        const visibleSize = view.getVisibleSize();
        this.viewWidth = visibleSize.width;
        this.viewHeight = visibleSize.height;

        this.node.getWorldPosition(this.initialWorldPos);

        if (this.infiniteScroll && this.bgWidth < this.viewWidth * 2) {
            console.warn(`[ParallaxLayer] 背景宽度(${this.bgWidth})小于屏幕宽度(${this.viewWidth})的2倍，可能无法完美循环`);
        }

        if (this.infiniteScroll) {
            this.createDuplicates();
        }
    }

    private createDuplicates() {
        if (this.bgWidth <= 0) return;

        this.layers.push(this.node);

        const numCopies = Math.ceil((this.viewWidth * 3) / this.bgWidth);
        const totalCopies = Math.max(2, numCopies);

        for (let i = 1; i < totalCopies; i++) {
            const copy = this.createCopy(i);
            if (copy) {
                this.layers.push(copy);
            }
        }

        console.log(`[ParallaxLayer] ${this.node.name}: 创建了 ${this.layers.length} 个副本用于无限滚动`);
    }

    private createCopy(index: number): Node | null {
        const originalTransform = this.node.getComponent(UITransform);
        if (!originalTransform) return null;

        const copy = new Node(`${this.node.name}_copy_${index}`);
        
        const uiTransform = copy.addComponent(UITransform);
        uiTransform.setContentSize(originalTransform.contentSize);

        const originalSprite = this.node.getComponent(Sprite);
        if (originalSprite && originalSprite.spriteFrame) {
            const sprite = copy.addComponent(Sprite);
            sprite.spriteFrame = originalSprite.spriteFrame;
            sprite.color = originalSprite.color;
        }

        const offset = index * this.bgWidth;
        copy.setPosition(offset, 0, 0);

        this.node.parent.addChild(copy);
        copy.setSiblingIndex(this.node.getSiblingIndex() + index);

        return copy;
    }

    lateUpdate(_dt: number) {
        if (!this.camera) return;

        const camWorldPos = this.camera.node.worldPosition;
        
        const parallaxOffset = camWorldPos.x * this.scrollSpeed;

        const baseWorldX = this.initialWorldPos.x + parallaxOffset;

        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            const layerOffsetX = i * this.bgWidth;
            
            const targetWorldX = baseWorldX + layerOffsetX;
            const targetWorldY = this.initialWorldPos.y;
            
            layer.setWorldPosition(targetWorldX, targetWorldY, layer.worldPosition.z);
        }

        if (this.infiniteScroll && this.layers.length > 0) {
            this.handleInfiniteScroll(camWorldPos.x);
        }
    }

    private handleInfiniteScroll(camX: number) {
        const checkThreshold = this.bgWidth * 0.5;
        
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            const layerWorldX = layer.worldPosition.x;
            const distanceFromCamera = layerWorldX - camX;

            if (distanceFromCamera < -checkThreshold) {
                const rightMostX = this.getRightMostLayerWorldX();
                const newX = rightMostX + this.bgWidth;
                layer.setWorldPosition(newX, layer.worldPosition.y, layer.worldPosition.z);
            } else if (distanceFromCamera > checkThreshold + this.bgWidth) {
                const leftMostX = this.getLeftMostLayerWorldX();
                const newX = leftMostX - this.bgWidth;
                layer.setWorldPosition(newX, layer.worldPosition.y, layer.worldPosition.z);
            }
        }
    }

    private getRightMostLayerWorldX(): number {
        let maxX = -Infinity;
        for (const layer of this.layers) {
            if (layer.worldPosition.x > maxX) {
                maxX = layer.worldPosition.x;
            }
        }
        return maxX;
    }

    private getLeftMostLayerWorldX(): number {
        let minX = Infinity;
        for (const layer of this.layers) {
            if (layer.worldPosition.x < minX) {
                minX = layer.worldPosition.x;
            }
        }
        return minX;
    }

    public setScrollSpeed(speed: number) {
        this.scrollSpeed = speed;
    }

    public getBackgroundWidth(): number {
        return this.bgWidth;
    }

    public getLayerCount(): number {
        return this.layers.length;
    }
}
