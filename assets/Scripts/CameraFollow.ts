import { _decorator, Component, Node, Vec3, TiledMap, UITransform, view, math, randomRange } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraFollow')
export class CameraFollow extends Component {

    @property({ type: Node, tooltip: '需要跟随的玩家节点' })
    target: Node | null = null;

    @property({ type: TiledMap, tooltip: '用于限制边界的 TiledMap' })
    tiledMap: TiledMap | null = null;

    @property({ tooltip: '跟随平滑度 (0-1)，越小越慢' })
    smoothSpeed: number = 0.125;

    @property({ tooltip: '镜头偏移量 (例如希望主角稍微偏下一点)' })
    offset: Vec3 = new Vec3(0, 0, 0);

    private _viewSize: math.Size = new math.Size();
    private _targetPos: Vec3 = new Vec3(); // 目标最终位置
    private _currentPos: Vec3 = new Vec3(); // 当前摄像机位置
    private _minX: number = 0;
    private _maxX: number = 0;
    private _minY: number = 0;
    private _maxY: number = 0;

    // --- 震动相关变量 ---
    private _shakeDuration: number = 0;    // 当前剩余震动时间
    private _shakeIntensity: number = 0;   // 当前震动强度
    private _shakeOffset: Vec3 = new Vec3(); // 这一帧计算出的震动偏移量

    private _debugFrameCount: number = 0;

    start() {
        if (!this.tiledMap || !this.target) {
            console.error("❌【CameraFollow】缺少 Target 或 TiledMap 绑定！");
            return;
        }
        if (!this.tiledMap) {
        console.warn("【CameraFollow】警告：未绑定 TiledMap，边界限制将不生效。");
        return;
        }

        // 2. 检查绑定的节点上是否有有效的 TiledMap 组件和资源
        // 这一步是为了防止 'vb' 错误
        if (!this.tiledMap.tmxAsset) {
            console.error("【CameraFollow】严重错误：绑定的 TiledMap 节点丢失 .tmx 资源文件！请在编辑器中修复。");
            // 强制置空，防止后续代码继续运行导致崩溃
            this.tiledMap = null; 
            return;
        }
        console.log("========== 📷 镜头脚本启动诊断 ==========");
        
        const mapTrans = this.tiledMap.node.getComponent(UITransform);
        console.log(`🗺️ 地图信息: 
        - 世界坐标: ${this.tiledMap.node.worldPosition}
        - 尺寸(ContentSize): ${mapTrans.contentSize}
        - 锚点(Anchor): ${mapTrans.anchorPoint}
        - 缩放(Scale): ${this.tiledMap.node.scale}`);

        console.log(`📺 屏幕信息: 
        - 可见尺寸(VisibleSize): ${view.getVisibleSize()}`);
        
        if (this.tiledMap) {
            this.calculateMapBounds();
        }

        console.log(`🔒 计算出的边界限制: 
        - X轴范围: [${this._minX}, ${this._maxX}]
        - Y轴范围: [${this._minY}, ${this._maxY}]`);
        
        console.log("========================================");
        // 初始化当前位置
        this.node.getPosition(this._currentPos);
    }

    /**
     * [新增 Public API] 外部调用此方法来触发屏幕震动
     * @param duration 持续时间 (秒)，例如 0.2
     * @param intensity 震动强度 (像素偏移量)，例如 5 到 15 之间效果较好
     */
    public shake(duration: number, intensity: number) {
        // 每次调用都重置时间和强度
        this._shakeDuration = duration;
        this._shakeIntensity = intensity;
    }

    calculateMapBounds() {
        if (!this.tiledMap) return;

        const mapUITrans = this.tiledMap.node.getComponent(UITransform);
        const mapSize = mapUITrans.contentSize;
        const mapAnchor = mapUITrans.anchorPoint;
        const mapWorldPos = this.tiledMap.node.worldPosition;

        this._viewSize = view.getVisibleSize();
        const halfViewW = this._viewSize.width / 2;
        const halfViewH = this._viewSize.height / 2;

        // 1. 计算地图在世界坐标系中的“绝对左/右/下/上”边缘
        // 公式：世界坐标 - (尺寸 * 锚点) = 左/下边缘
        const mapLeft = mapWorldPos.x - (mapSize.width * mapAnchor.x);
        const mapBottom = mapWorldPos.y - (mapSize.height * mapAnchor.y);
        const mapRight = mapLeft + mapSize.width;
        const mapTop = mapBottom + mapSize.height;

        // 2. 计算摄像机中心点允许移动的范围
        // 摄像机中心 = 地图边缘 + 屏幕一半
        this._minX = mapLeft + halfViewW;
        this._maxX = mapRight - halfViewW;
        this._minY = mapBottom + halfViewH;
        this._maxY = mapTop - halfViewH;
    }

    lateUpdate(dt: number) {
        if (!this.target) return;

        // 1. 获取目标的世界坐标 (这是绝对坐标)
        const targetWorldPos = this.target.worldPosition;
        
        // 2. 目标位置也是世界坐标
        const desiredPos = new Vec3(
            targetWorldPos.x + this.offset.x,
            targetWorldPos.y + this.offset.y,
            this._currentPos.z // 下面会获取最新的 Z
        );

        // 【关键修改点 1】获取摄像机当前的世界坐标
        this.node.getWorldPosition(this._currentPos);
        
        // 确保 Z 轴不乱跑 (使用摄像机当前的 Z，通常是 1000)
        desiredPos.z = this._currentPos.z;

        // 插值计算
        Vec3.lerp(this._targetPos, this._currentPos, desiredPos, this.smoothSpeed);

        // 3. 边界限制 (这里用的 _minX 等本身就是基于世界坐标算的，所以匹配了)
        if (this.tiledMap) {
            // X轴限制
            if (this._maxX >= this._minX) {
                this._targetPos.x = math.clamp(this._targetPos.x, this._minX, this._maxX);
            } else {
                this._targetPos.x = (this._minX + this._maxX - this._viewSize.width) / 2 + (this._viewSize.width / 2);
            }

            // Y轴限制
            if (this._maxY >= this._minY) {
                this._targetPos.y = math.clamp(this._targetPos.y, this._minY, this._maxY);
            } else {
                 const mapCenterY = (this._minY + this._maxY - this._viewSize.height)/2 + this._viewSize.height/2; 
                 this._targetPos.y = mapCenterY;
            }
        }

        // 4. 震动 (可选)
        if (this._shakeDuration > 0) {
            this._shakeDuration -= dt;
            const offsetX = randomRange(-this._shakeIntensity, this._shakeIntensity);
            const offsetY = randomRange(-this._shakeIntensity, this._shakeIntensity);
            this._targetPos.add3f(offsetX, offsetY, 0);
        }

        this.node.setWorldPosition(this._targetPos);
    }
}