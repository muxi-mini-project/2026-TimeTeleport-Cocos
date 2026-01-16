import { _decorator, Component, Node, Vec3, math, view, UITransform, misc } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraController')
export class CameraController extends Component {
    
    @property({ type: Node, tooltip: "平滑跟随玩家的镜头"})
    target: Node = null;

    @property({ type: Node, tooltip: "地图边界信息"})
    mapNode: Node = null;

    @property({ range:[0,1], tooltip: "平滑系数"})
    smoothSpeed: number = 0.125

    private _targetPos: Vec3 = new Vec3();
    private _currentPos: Vec3 = new Vec3();
    private _lerpPos: Vec3 = new Vec3();
    
    // 边界限制参数
    private _minX: number = 0;
    private _maxX: number = 0;
    private _minY: number = 0;
    private _maxY: number = 0;

    start() {
        this.initBounds();
    }

    // 初始化地图边界计算
    initBounds() {
        if (!this.mapNode) return;

        // 1. 获取屏幕可视范围的一半 (Half Size)
        // 因为摄像机坐标是中心点，我们要限制的是中心点能移动的范围
        const visibleSize = view.getVisibleSize();
        const camHalfH = visibleSize.height / 2;
        const camHalfW = visibleSize.width / 2;

        // 2. 获取地图的世界尺寸
        // 假设 Map 的锚点是 (0, 0) 左下角
        const mapTransform = this.mapNode.getComponent(UITransform);
        const mapWidth = mapTransform.width;
        const mapHeight = mapTransform.height;
        const mapWorldPos = this.mapNode.worldPosition;

        // 3. 计算摄像机中心点允许移动的 Min/Max 范围
        // 左边界 = 地图左边 + 摄像机半宽
        this._minX = mapWorldPos.x + camHalfW;
        // 右边界 = 地图右边 - 摄像机半宽
        this._maxX = mapWorldPos.x + mapWidth - camHalfW;
        
        // 下边界
        this._minY = mapWorldPos.y + camHalfH;
        // 上边界
        this._maxY = mapWorldPos.y + mapHeight - camHalfH;
    }

    /**
     * 关键点：使用 lateUpdate 而不是 update
     * 确保玩家先移动完了，摄像机再跟过去，防止画面抖动
     */
    lateUpdate(deltaTime: number) {
        if (!this.target) return;

        // 1. 获取目标当前位置
        // 注意：如果 target 和 camera 父节点不同，最好统一转成世界坐标计算
        // 这里假设它们都在 Canvas 下或者是世界坐标逻辑
        const targetWorldPos = this.target.worldPosition;

        // 2. 平滑插值 (Lerp)
        // 公式：Current = Current + (Target - Current) * Factor
        // Vec3.lerp(输出, 当前值, 目标值, 系数)
        this.node.getWorldPosition(this._currentPos);
        Vec3.lerp(this._lerpPos, this._currentPos, targetWorldPos, this.smoothSpeed);

        // 3. 边界限制 (Clamping)
        // 如果地图比屏幕还小，就不要 Clamp 了，或者居中显示
        let finalX = this._lerpPos.x;
        let finalY = this._lerpPos.y;

        // 只有当地图足够大时才限制
        if (this._maxX >= this._minX) {
            finalX = math.clamp(finalX, this._minX, this._maxX);
        }
        if (this._maxY >= this._minY) {
            finalY = math.clamp(finalY, this._minY, this._maxY);
        }

        // 4. 应用坐标 (保持 Z 轴不变，通常是 1000)
        this.node.setWorldPosition(finalX, finalY, this._currentPos.z);
    }
}


