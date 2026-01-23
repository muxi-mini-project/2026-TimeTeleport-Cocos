import { _decorator, Component, Node, Vec3, TiledMap, UITransform, view, math, randomRange, Camera } from 'cc';
const { ccclass, property, requireComponent } = _decorator;

enum CameraState {
    FOLLOW_PLAYER,
    TELESCOPE_MODE
}

@ccclass('CameraFollow')
@requireComponent(Camera)
export class CameraFollow extends Component {

    @property({ type: Node, tooltip: '需要跟随的玩家节点' })
    target: Node | null = null;

    @property({ type: TiledMap, tooltip: '用于限制边界的 TiledMap' })
    tiledMap: TiledMap | null = null;

    @property({ tooltip: '跟随平滑度 (0-1)，越小越慢' })
    smoothSpeed: number = 0.125;

    @property({ tooltip: '镜头偏移量 (例如希望主角稍微偏下一点)' })
    offset: Vec3 = new Vec3(0, 0, 0);

    @property({ tooltip: "望远镜模式下的移动速度"})
    panSpeed: number = 500;

    @property({
        tooltip: "望远镜模式初始位置（0=左下角，1=右下角）",
        min: 0,
        max: 1,
        step: 1
    })
    telescopeStartPosition: number = 0; // 0: 左下角, 1: 右下角

    private _state: CameraState = CameraState.FOLLOW_PLAYER;
    private _viewSize: math.Size = new math.Size();
    private _targetPos: Vec3 = new Vec3(); // 目标最终位置
    private _currentPos: Vec3 = new Vec3(); // 当前摄像机位置
    private _telescopeInputDir: Vec3 = new Vec3(); // 望远镜模式的输入方向
    private _minX: number = 0;
    private _maxX: number = 0;
    private _minY: number = 0;
    private _maxY: number = 0;
    private _viewBounds: math.Rect | null = null;

    // --- 震动相关变量 ---
    private _shakeDuration: number = 0;    // 当前剩余震动时间
    private _shakeIntensity: number = 0;   // 当前震动强度
    private _shakeOffset: Vec3 = new Vec3(); // 这一帧计算出的震动偏移量

    private _debugFrameCount: number = 0;
    private _camera: Camera = null!;

    onLoad(){
        this._camera = this.getComponent(Camera)!;
    }

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

    public enterTelescopeMode(bounds: math.Rect) {
        this._state = CameraState.TELESCOPE_MODE;
        this._viewBounds = bounds;

        // 获取相机可视范围的一半尺寸
        const { halfW, halfH } = this.getCameraWorldSize();

        // 计算允许相机中心点存在的最小和最大坐标
        let minX = bounds.x + halfW;
        let maxX = bounds.x + bounds.width - halfW;
        let minY = bounds.y + halfH;
        let maxY = bounds.y + bounds.height - halfH;

        // 安全保护：如果 ViewZone 比屏幕小，锁定在中心
        if (minX > maxX) {
            const centerX = bounds.x + bounds.width / 2;
            minX = maxX = centerX;
        }
        if (minY > maxY) {
            const centerY = bounds.y + bounds.height / 2;
            minY = maxY = centerY;
        }

        // 根据配置选择相机初始位置（确保玩家在画面内）
        let initX: number;
        let initY: number;
        const positionName = this.telescopeStartPosition === 0 ? "左下角" : "右下角";

        if (this.telescopeStartPosition === 0) {
            // 左下角：相机对准 ViewZone 左下区域
            initX = minX;  // 最左侧
            initY = minY;  // 最底部
        } else {
            // 右下角：相机对准 ViewZone 右下区域
            initX = maxX;  // 最右侧
            initY = minY;  // 最底部
        }

        console.log(`[Camera] 初始位置配置: ${positionName}`);
        console.log(`[Camera] Clamp 范围: minX=${minX.toFixed(1)}, maxX=${maxX.toFixed(1)}, minY=${minY.toFixed(1)}, maxY=${maxY.toFixed(1)}`);

        // 获取当前相机的 z 坐标并设置到初始位置
        this.node.getWorldPosition(this._targetPos);
        this._targetPos.x = initX;
        this._targetPos.y = initY;
        // 【重要】立即更新相机的世界位置
        this.node.setWorldPosition(this._targetPos);

        // 清空输入方向
        this._telescopeInputDir.set(0, 0, 0);

        console.log(`[Camera] 进入望远镜模式，bounds: x=${bounds.x.toFixed(1)}, y=${bounds.y.toFixed(1)}, w=${bounds.width}, h=${bounds.height}`);
        console.log(`[Camera] 相机初始化到${positionName}: (${initX.toFixed(1)}, ${initY.toFixed(1)})`);
    }

    public exitTelescopeMode() {
        this._state = CameraState.FOLLOW_PLAYER;
        this._viewBounds = null;
        this._telescopeInputDir.set(0, 0, 0);
        console.log("[Camera] 退出望远镜模式");
    }

    /**
     * 设置望远镜模式的输入方向
     * @param inputDir 输入方向向量 (已归一化)
     */
    public setTelescopeInput(inputDir: Vec3) {
        this._telescopeInputDir.set(inputDir);
        // 只在有输入时记录日志，避免刷屏
        // if (inputDir.lengthSqr() > 0) {
        //     console.log(`[Camera] setTelescopeInput: 接收到输入=(${inputDir.x.toFixed(2)}, ${inputDir.y.toFixed(2)})`);
        // }
    }

    lateUpdate(dt: number) {
        if (!this.target) return;

        // 【修复】只有在跟随玩家模式下才执行
        if (this._state === CameraState.TELESCOPE_MODE) {
            // 望远镜模式：处理输入和移动
            // console.log(`[Camera] lateUpdate: 望远镜模式，_telescopeInputDir=(${this._telescopeInputDir.x.toFixed(2)}, ${this._telescopeInputDir.y.toFixed(2)})`);
            this.handleTelescopeMovement(dt);
            return;
        }

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

        // 【关键修改点 2】使用 setWorldPosition 应用坐标
        // 这样无论你的 Camera 父节点是谁，它都会乖乖去到世界坐标的绝对位置
        this.node.setWorldPosition(this._targetPos);
    }

    /**
     * 处理望远镜模式下的移动
     * 根据 _telescopeInputDir 和 panSpeed 更新相机位置，并限制在 _viewBounds 范围内
     */
    private handleTelescopeMovement(dt: number) {
        // 1. 获取当前相机的世界坐标作为起点
        this.node.getWorldPosition(this._currentPos);

        // 2. 如果有输入，计算移动
        if (this._telescopeInputDir.lengthSqr() > 0) {
            // 计算移动向量：方向 * 速度 * 时间
            const moveVec = new Vec3(
                this._telescopeInputDir.x * this.panSpeed * dt,
                this._telescopeInputDir.y * this.panSpeed * dt,
                0
            );

            // 应用移动
            Vec3.add(this._targetPos, this._currentPos, moveVec);

            // console.log(`[Camera] 移动相机: 当前=(${this._currentPos.x.toFixed(1)}, ${this._currentPos.y.toFixed(1)}), 移动=(${moveVec.x.toFixed(1)}, ${moveVec.y.toFixed(1)}), 目标=(${this._targetPos.x.toFixed(1)}, ${this._targetPos.y.toFixed(1)})`);
        } else {
            // 没有输入时，保持当前位置
            this._targetPos.set(this._currentPos);
        }

        // 3. 获取相机可视范围的一半尺寸
        const { halfW, halfH } = this.getCameraWorldSize();

        // 4. 限制在 ViewZone 边界内
        if (this._viewBounds) {
            // 计算相机中心点允许存在的最小和最大坐标
            // 最小值 = 左边界 + 相机半宽
            // 最大值 = 右边界 - 相机半宽
            let minX = this._viewBounds.x + halfW;
            let maxX = this._viewBounds.x + this._viewBounds.width - halfW;

            let minY = this._viewBounds.y + halfH;
            let maxY = this._viewBounds.y + this._viewBounds.height - halfH;

            // console.log(`[Camera] ViewZone: x=${this._viewBounds.x.toFixed(1)}, y=${this._viewBounds.y.toFixed(1)}, w=${this._viewBounds.width}, h=${this._viewBounds.height}`);
            // console.log(`[Camera] Clamp前: minX=${minX.toFixed(1)}, maxX=${maxX.toFixed(1)}, minY=${minY.toFixed(1)}, maxY=${maxY.toFixed(1)}, halfW=${halfW.toFixed(1)}, halfH=${halfH.toFixed(1)}`);

            // 安全保护：确保 minY <= maxY, minX <= maxX
            if (minX > maxX) {
                const centerX = this._viewBounds.x + this._viewBounds.width / 2;
                minX = maxX = centerX;
                // console.log(`[Camera] X轴范围无效(${minX.toFixed(1)} > ${maxX.toFixed(1)})，锁定在中心: ${centerX.toFixed(1)}`);
            }

            if (minY > maxY) {
                const centerY = this._viewBounds.y + this._viewBounds.height / 2;
                minY = maxY = centerY;
                // console.log(`[Camera] Y轴范围无效(${minY.toFixed(1)} > ${maxY.toFixed(1)})，锁定在中心: ${centerY.toFixed(1)}`);
                // console.log(`[Camera] ViewZone高度(${this._viewBounds.height})小于相机可视高度(${halfH * 2})，Y轴无法移动`);
            }

            // 执行 Clamp 限制
            const beforeX = this._targetPos.x;
            const beforeY = this._targetPos.y;
            this._targetPos.x = math.clamp(this._targetPos.x, minX, maxX);
            this._targetPos.y = math.clamp(this._targetPos.y, minY, maxY);

            if (Math.abs(beforeX - this._targetPos.x) > 0.1 || Math.abs(beforeY - this._targetPos.y) > 0.1) {
                // console.log(`[Camera] Clamp生效: (${beforeX.toFixed(1)}, ${beforeY.toFixed(1)}) -> (${this._targetPos.x.toFixed(1)}, ${this._targetPos.y.toFixed(1)})`);
            }
        }

        // 5. 应用位置
        this.node.setWorldPosition(this._targetPos);
    }

    private getCameraWorldSize() {
        // 1. 获取正交视图的高度 (Camera 组件上设置的值，代表屏幕高度的一半)
        const orthoHeight = this._camera.orthoHeight;

        // 2. 获取屏幕当前的宽高比 (Width / Height)
        const visibleSize = view.getVisibleSize();
        const ratio = visibleSize.width / visibleSize.height;

        // 3. 计算宽度
        // 既然 orthoHeight 是半高，那么：半宽 = 半高 * 宽高比
        const orthoWidth = orthoHeight * ratio;

        return { halfW: orthoWidth, halfH: orthoHeight };
    }
}