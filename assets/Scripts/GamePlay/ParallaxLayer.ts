import { _decorator, Component, Node, Camera, UITransform, view, Sprite, Enum } from 'cc';
const { ccclass, property } = _decorator;

enum VerticalAlignment {
    BOTTOM = 0,
    CENTER = 1,
    TOP = 2
}

enum HorizontalOrigin {
    CAMERA_LEFT = 0,
    CAMERA_CENTER = 1,
    MAP_ORIGIN = 2
}

Enum(VerticalAlignment);
Enum(HorizontalOrigin);

@ccclass('ParallaxLayer')
export class ParallaxLayer extends Component {
    @property(Camera)
    camera: Camera = null;

    @property({ 
        tooltip: '滚动速度比例 (0=完全静止背景, 1=与相机同步移动)',
        slide: true,
        range: [0, 1, 0.01]
    })
    scrollSpeed: number = 0.5;

    @property({ tooltip: '是否启用无限循环（长地图必备）' })
    infiniteScroll: boolean = true;

    @property({ 
        type: Enum(VerticalAlignment),
        tooltip: '垂直对齐方式：BOTTOM=底部对齐, CENTER=居中, TOP=顶部对齐'
    })
    verticalAlignment: VerticalAlignment = VerticalAlignment.BOTTOM;

    @property({ 
        type: Enum(HorizontalOrigin),
        tooltip: '水平起始位置：CAMERA_LEFT=相机左边缘, CAMERA_CENTER=相机中心, MAP_ORIGIN=地图原点'
    })
    horizontalOrigin: HorizontalOrigin = HorizontalOrigin.CAMERA_LEFT;

    private bgWidth: number = 0;
    private bgHeight: number = 0;
    private layers: Node[] = [];
    private viewWidth: number = 0;
    private viewHeight: number = 0;
    private orthoHeight: number = 0;
    private orthoWidth: number = 0;
    private verticalOffset: number = 0;
    private horizontalStartOffset: number = 0;
    private _initialized: boolean = false;

    onLoad() {
        const visibleSize = view.getVisibleSize();
        this.viewWidth = visibleSize.width;
        this.viewHeight = visibleSize.height;

        if (this.camera) {
            this.orthoHeight = this.camera.orthoHeight;
        }

        if (this.infiniteScroll) {
            this.createDuplicates();
        }
    }

    private updateBackgroundSize() {
        const uiTransform = this.node.getComponent(UITransform);
        if (!uiTransform) {
            console.error(`[ParallaxLayer] ${this.node.name} 缺少 UITransform 组件！`);
            return false;
        }

        this.bgWidth = uiTransform.width;
        this.bgHeight = uiTransform.height;

        if (this.bgWidth <= 0 || this.bgHeight <= 0) {
            console.warn(`[ParallaxLayer] ${this.node.name} 尺寸无效: ${this.bgWidth}x${this.bgHeight}`);
            return false;
        }

        return true;
    }

    private calculateOffsets() {
        if (this.bgHeight <= 0 || this.bgWidth <= 0) {
            console.warn(`[ParallaxLayer] ${this.node.name} 尺寸未初始化，跳过计算`);
            return;
        }

        const ratio = this.viewWidth / this.viewHeight;
        this.orthoWidth = this.orthoHeight * ratio;

        switch (this.verticalAlignment) {
            case VerticalAlignment.BOTTOM:
                this.verticalOffset = -this.orthoHeight + this.bgHeight / 2;
                break;
            case VerticalAlignment.CENTER:
                this.verticalOffset = 0;
                break;
            case VerticalAlignment.TOP:
                this.verticalOffset = this.orthoHeight - this.bgHeight / 2;
                break;
        }

        switch (this.horizontalOrigin) {
            case HorizontalOrigin.CAMERA_LEFT:
                this.horizontalStartOffset = this.orthoWidth - this.bgWidth / 2;
                break;
            case HorizontalOrigin.CAMERA_CENTER:
                this.horizontalStartOffset = 0;
                break;
            case HorizontalOrigin.MAP_ORIGIN:
                this.horizontalStartOffset = -this.bgWidth / 2;
                break;
        }

        console.log(`[ParallaxLayer] ${this.node.name} 初始化完成:`);
        console.log(`  - 背景尺寸: ${this.bgWidth}x${this.bgHeight}`);
        console.log(`  - orthoHeight: ${this.orthoHeight}, orthoWidth: ${this.orthoWidth}`);
        console.log(`  - verticalOffset: ${this.verticalOffset}`);
        console.log(`  - horizontalStartOffset: ${this.horizontalStartOffset}`);
    }

    private createDuplicates() {
        if (!this.updateBackgroundSize()) return;

        this.layers = [this.node];

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
        uiTransform.setContentSize(this.bgWidth, this.bgHeight);

        const originalSprite = this.node.getComponent(Sprite);
        if (originalSprite && originalSprite.spriteFrame) {
            const sprite = copy.addComponent(Sprite);
            sprite.spriteFrame = originalSprite.spriteFrame;
            sprite.color = originalSprite.color;
        }

        this.node.parent.addChild(copy);
        copy.setSiblingIndex(this.node.getSiblingIndex() + index);

        return copy;
    }

    lateUpdate(_dt: number) {
        if (!this.camera) return;

        if (!this._initialized) {
            this._initialized = true;
            this.updateBackgroundSize();
            this.calculateOffsets();
        }

        const camWorldPos = this.camera.node.worldPosition;
        const camX = camWorldPos.x;
        const camY = camWorldPos.y;

        const targetY = camY + this.verticalOffset;

        const baseX = camX * this.scrollSpeed + this.horizontalStartOffset;

        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            const layerOffsetX = i * this.bgWidth;
            const targetX = baseX + layerOffsetX;
            
            layer.setWorldPosition(targetX, targetY, layer.worldPosition.z);
        }

        if (this.infiniteScroll && this.layers.length > 0) {
            this.handleInfiniteScroll(camX);
        }
    }

    private handleInfiniteScroll(camX: number) {
        const threshold = this.bgWidth * 0.5 + this.viewWidth;

        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            const relativeX = layer.worldPosition.x - camX;

            if (relativeX < -threshold) {
                const rightMostX = this.getRightMostLayerX();
                layer.setWorldPosition(rightMostX + this.bgWidth, layer.worldPosition.y, layer.worldPosition.z);
            } else if (relativeX > threshold) {
                const leftMostX = this.getLeftMostLayerX();
                layer.setWorldPosition(leftMostX - this.bgWidth, layer.worldPosition.y, layer.worldPosition.z);
            }
        }
    }

    private getRightMostLayerX(): number {
        let maxX = -Infinity;
        for (const layer of this.layers) {
            if (layer.worldPosition.x > maxX) {
                maxX = layer.worldPosition.x;
            }
        }
        return maxX;
    }

    private getLeftMostLayerX(): number {
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

    public setCamera(cam: Camera) {
        this.camera = cam;
        this.orthoHeight = cam.orthoHeight;
        this._initialized = false;
    }
}
