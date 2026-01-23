import { _decorator, Component, Node, TiledMap, math, RigidBody2D, Collider2D, BoxCollider2D, ERigidBody2DType, Size, v3, PhysicsSystem2D, EPhysics2DDrawFlags, UIOpacity, UITransform, Prefab, instantiate, Rect, Vec3 } from 'cc';
import { CameraFollow } from '../CameraFollow';
const { ccclass, property } = _decorator;

const GROUP_LEVEL = 1 << 2;

export enum TimeState {
    Past,
    Future
}

export interface ScopeData {
    rect: math.Rect;
    center: Vec3;
}

@ccclass('LevelMapManager')
export class LevelMapManager extends Component {
    @property(TiledMap)
    tiledMap: TiledMap = null;

    @property({ tooltip: "淡入淡出耗时(秒)" })
    fadeDuration: number = 0.5;

    @property({ type: Node, tooltip: "玩家节点，用于检测卡墙" })
    playerNode: Node | null = null!;

    @property({ type: CameraFollow, tooltip: "镜头节点"})
    cameraNode: CameraFollow | null = null!;

    //世界状态的只读出口
    public getCurrentState(): TimeState {
        return this.currentState;
    }
    //监听列表，所有受世界变化影响的对象都可以注册一个回调函数
    private timeListeners: ((state: TimeState) => void)[] = [];
    //公共方法，提供注册接口
    public registerTimeListener(cb: (state: TimeState) => void) {
        // 正确判断：只有当回调不在列表中时才添加
        if (this.timeListeners.indexOf(cb) === -1) {
            this.timeListeners.push(cb);
        }
    }
    //公共方法，提供注销接口
    public unregisterTimeListener(cb: (state: TimeState) => void) {
        const idx = this.timeListeners.indexOf(cb);
        if (idx !== -1) {
            this.timeListeners.splice(idx, 1);
        }
    }


    @property({ type: Prefab, tooltip: "存档点预制体"})
    checkpointPrefab: Prefab = null;

    @property({ type: Prefab, tooltip: "尖刺预制体"})
    spikePrefab: Prefab = null!;

    @property({ type: Prefab, tooltip: "碎裂地面预制体"})
    crumblingPlatformPrefab: Prefab = null!;

    @property
    debugDraw: boolean = true;

    private _boundsMap: Map<number, ScopeData> = new Map();

    @property({ 
        slide: true, 
        range: [0, 0.45], 
        step: 0.01, 
        tooltip: "防卡墙容错率：0=非常严格(碰一点就不行)，0.2=忽略边缘20%的碰撞" 
    })
    stuckForgiveness: number = 0.15;

    // 用来存储生成的碰撞体父节点，方便整体开关
    private pastColRoot: Node = null;
    private futureColRoot: Node = null;

    // 用来引用 Tiled 自动生成的图块层节点
    private pastArtLayer: Node = null;
    private futureArtLayer: Node = null;

    private pastOpacity: UIOpacity = null;
    private futureOpacity: UIOpacity = null;

    private currentState: TimeState = TimeState.Past;
    private isFading: boolean = false;

    private readonly OBJ_TYPE = {
        CHECKPOINT: "checkpoint",
        SPIKE: "spike"
    };

    start() {
        if (!this.tiledMap) {
            // console.log("getting component");
            this.tiledMap = this.getComponent(TiledMap);
        }

        const scale = this.tiledMap.node.scale;
        if (scale.x <= 0 || scale.y <= 0) {
            console.error(`[严重错误] TiledMap 节点的 Scale 必须是正数！当前: ${scale}`);
            console.error("Box2D 不支持负缩放，请在 Inspector 中把 Scale 改回 (1, 1, 1)，利用代码修正翻转问题。");
            return; // 阻止后续运行，防止崩溃
        }

        PhysicsSystem2D.instance.debugDrawFlags = EPhysics2DDrawFlags.Aabb |
            EPhysics2DDrawFlags.Pair |
            EPhysics2DDrawFlags.CenterOfMass |
            EPhysics2DDrawFlags.Joint |
            EPhysics2DDrawFlags.Shape;

        if (!this.playerNode) {
            console.warn("【警告】LevelMapManager 未绑定 Player Node，防卡墙检测将无法生效！");
        }

        this.pastColRoot = this.generateColliders("Past_Col", GROUP_LEVEL);
        this.futureColRoot = this.generateColliders("Future_Col", GROUP_LEVEL);
        if (this.pastColRoot) this.pastColRoot.active = false;
        if (this.futureColRoot) this.futureColRoot.active = false;

        // this.pastArtLayer = this.tiledMap.node.getChildByName("Past_Art");
        // this.futureArtLayer = this.tiledMap.node.getChildByName("Future_Art");
        const pastLayerComp = this.tiledMap.getLayer("Past_Art");
        const futureLayerComp = this.tiledMap.getLayer("Future_Art");
        if (pastLayerComp) {
            this.pastArtLayer = pastLayerComp.node;
        } else {
            console.error("【严重错误】TiledMap 中找不到名为 'Past_Art' 的图层！请检查 Tiled 编辑器中的图层名。");
        }
        if (futureLayerComp) {
            this.futureArtLayer = futureLayerComp.node;
        } else {
            console.error("【严重错误】TiledMap 中找不到名为 'Future_Art' 的图层！请检查 Tiled 编辑器中的图层名。");
        }

        this.pastOpacity = this.ensureOpacity(this.pastArtLayer);
        this.futureOpacity = this.ensureOpacity(this.futureArtLayer);

        if (!this.pastArtLayer || !this.futureArtLayer) {
            console.warn("未找到 Past_Art 或 Future_Art 图层，请检查 Tiled 图层名");
        }

        this.spawnPrefbs("Objects");

        this.toggleTime();

        console.log("地图重组与初始化完成");
    }

    private spawnPrefbs(layerName: string) {
        const objectGroup = this.tiledMap.getObjectGroup(layerName);
        if (!objectGroup) {
            console.log(`[Info] 未找到名为${layerName} 的对象层`);
            return;
        }

        const objectsRoot = new Node(layerName + "_Root");
        this.tiledMap.node.addChild(objectsRoot);

        const objects = objectGroup.getObjects();
        const mapSize = this.tiledMap.getMapSize();
        const tileSize = this.tiledMap.getTileSize();

         if (!mapSize || !tileSize) {
            console.error("无法获取 MapSize 或 TileSize，请检查 TMX 资源");
            return;
        }

        const totalW = mapSize.width * tileSize.width;
        const totalH = mapSize.height * tileSize.height;
        const halfW = totalW / 2;
        const halfH = totalH / 2;

        for (const object of objects){
            const rawName = object.name || "Unknown";
            const name = rawName.toLowerCase();
            // console.log(`[TiledDebug] 发现对象 Name: ${rawName}, 转小写: ${name}, Type: ${object.type}`);

            if (name === "viewzone" || name.includes("viewzone")) {
                // console.log(`[ViewZone检测] 匹配成功! 原始名称: ${rawName}, 小写名称: ${name}`);
                console.log(`获取并开始处理 ${rawName}`);
                // 提取 boundID
                // 注意：Tiled 对象属性在 properties 字段中 (object.properties)
                // 不同的导出格式访问方式略有不同，通常是 object.properties.xxx 或者 object.xxx
                const props = object.properties || {}; // 防空
                const boundID = props["boundID"] || props["scopeID"]; // 兼容两种写法
                console.log(`获取 ${boundID}`);

                if (boundID != null) {
                    // 计算世界坐标矩形 (复用你的坐标公式，或者 MapManager 内部计算)
                    const w = object.width || 0;
                    const h = object.height || 0;
                    const tiledX = object.x || 0;
                    const tiledY = object.y || 0;

                    console.log(`[ViewZone原始数据] tiledX=${tiledX}, tiledY=${tiledY}, w=${w}, h=${h}, halfW=${halfW}, halfH=${halfH}`);

                    // 计算中心点坐标（与预制体生成使用相同的公式）
                    const centerX = -halfW + tiledX + (w / 2);
                    const centerY = -halfH + tiledY - (h / 2);

                    console.log(`[ViewZone中心点] centerX=${centerX.toFixed(2)}, centerY=${centerY.toFixed(2)}`);

                    // 将中心点转换为 Rect 左下角坐标
                    // Rect 的 x,y 是左下角，而 centerX,centerY 是中心点
                    let rectX = centerX - w / 2;
                    let rectY = centerY - h / 2;

                    // 【重要修正】让 ViewZone 与地图内容对齐
                    // 使用与 CameraFollow.calculateMapBounds() 相同的计算方式
                    // 确保地图内容的实际边界与 ViewZone 边界对齐
                    const tiledMapWorldPos = this.tiledMap.node.getWorldPosition();
                    const mapUITrans = this.tiledMap.node.getComponent(UITransform);
                    const mapSize = mapUITrans.contentSize;
                    const mapAnchor = mapUITrans.anchorPoint;

                    // 计算地图实际内容的边界（与 CameraFollow 相同的公式）
                    const mapLeft = tiledMapWorldPos.x - (mapSize.width * mapAnchor.x);
                    const mapBottom = tiledMapWorldPos.y - (mapSize.height * mapAnchor.y);
                    const mapRight = mapLeft + mapSize.width;
                    const mapTop = mapBottom + mapSize.height;

                    console.log(`[ViewZone] 地图实际边界: left=${mapLeft}, right=${mapRight}, bottom=${mapBottom}, top=${mapTop}`);

                    // 【关键】限制 ViewZone 高度不超过地图高度，避免显示黑边
                    // 如果 ViewZone 高度大于地图高度，使用地图高度
                    const desiredViewZoneHeight = Math.min(1440, mapSize.height);
                    const desiredViewZoneWidth = Math.min(1600, mapSize.width);

                    // 以地图内容中心为基准，创建 ViewZone
                    const mapCenterX = (mapLeft + mapRight) / 2;
                    const mapCenterY = (mapBottom + mapTop) / 2;

                    const newRectX = mapCenterX - desiredViewZoneWidth / 2;
                    const newRectY = mapCenterY - desiredViewZoneHeight / 2;

                    console.log(`[ViewZone] 修正后尺寸: ${desiredViewZoneWidth}x${desiredViewZoneHeight} (原预期: 1600x1440)`);

                    console.warn(`[ViewZone] 重新定位：从 (${rectX.toFixed(1)}, ${rectY.toFixed(1)}, ${w}, ${h}) 改为 (${newRectX.toFixed(1)}, ${newRectY.toFixed(1)}, ${desiredViewZoneWidth}, ${desiredViewZoneHeight})`);
                    console.log(`[ViewZone] 原位置偏离地图中心 ${Math.abs(centerY).toFixed(1)} 像素，已自动修正`);

                    rectX = newRectX;
                    rectY = newRectY;

                    // 注册时使用新的尺寸
                    const finalWidth = desiredViewZoneWidth;
                    const finalHeight = desiredViewZoneHeight;

                    console.log(`[ViewZone矩形] rectX=${rectX.toFixed(2)}, rectY=${rectY.toFixed(2)}, 最终范围: [${rectY.toFixed(1)}, ${(rectY + finalHeight).toFixed(1)}]`);

                    // newRectX/newRectY 已经是世界坐标，直接注册
                    console.log(`[ViewZone] 使用世界坐标: (${newRectX.toFixed(1)}, ${newRectY.toFixed(1)})`);

                    // 获取 MapManager 并注册（使用世界坐标）
                    const mapManager = this.getComponent(LevelMapManager);
                    if (mapManager) {
                        mapManager.registerScope(Number(boundID), newRectX, newRectY, finalWidth, finalHeight);
                        console.log(`[Map] 注册 ViewZone ID: ${boundID}, 世界坐标: x=${newRectX.toFixed(2)}, y=${newRectY.toFixed(2)}, w=${finalWidth}, h=${finalHeight}`);
                    }
                }
                continue; // 处理完 ViewZone 直接跳过后续 Prefab 生成
            }

            console.log(`[Prefab处理] 开始检查对象 ${rawName} (小写: ${name}) 是否需要生成预制体`);
            
            const w = object.width;
            const h = object.height;
            const tiledX = object.x; 
            const tiledY = object.y;

            if (typeof w !== 'number' || typeof h !== 'number' || typeof tiledX !== 'number' || typeof tiledY !== 'number') {
                console.warn(`[Error Data] 对象 ${object.name || 'Unknown'} 数据不完整，跳过。`, object);
                continue;
            }

            // 如果你想直接丢弃 0 尺寸对象（推荐）：
            if (w <= 0 || h <= 0) {
               console.warn(`[Invalid Size] 对象 ${object.name} 尺寸为 0，已丢弃。`);
               continue;
            }

            let targetPrefab: Prefab | null = null;
            let shouldScale = true;

            switch (name) {
                case "checkpoint":
                    if (!this.checkpointPrefab) {
                        console.warn(`未绑定${name}预制体`);
                        return;
                    }
                    targetPrefab = this.checkpointPrefab;
                    break;
                case "spike":
                    if (!this.spikePrefab) {
                        console.warn(`未绑定${name}预制体`);
                        return;
                    }
                    targetPrefab = this.spikePrefab;
                    break;
                case "crumbling_platform":
                    if (!this.crumblingPlatformPrefab) {
                        console.warn(`未绑定${name}预制体`)
                        return;
                    }
                    targetPrefab = this.crumblingPlatformPrefab;
                    break;
                default:
                    console.log(`[Switch跳过] 对象 ${rawName} (小写: ${name}) 不匹配任何预制体类型`);
                    break;
            }

            // 使用之前验证通过的中心锚点(0.5, 0.5)公式
            const finalX = -halfW + tiledX + (w / 2);
            const finalY = -halfH + tiledY - (h / 2);

            if (Number.isNaN(finalX) || Number.isNaN(finalY)) {
                console.error(`[Math Error] 对象 ${object.name} 坐标计算结果为 NaN！`, { tiledX, tiledY, w, h });
                continue; // 绝对不要把 NaN 传给 setPosition
            }

            const newNode = instantiate(targetPrefab);
            objectsRoot.addChild(newNode);

            newNode.name = rawName;
            newNode.setPosition(v3(finalX, finalY, 0));
            console.log(`生成对象 [${rawName}] 位置 x:${finalX} y:${finalY}`);

                const uiTransform = newNode.getComponent(UITransform);
                let originalWidth = 100; 
                let originalHeight = 100;
                if (uiTransform && uiTransform.contentSize.width > 0) {
                    originalWidth = uiTransform.contentSize.width;
                    originalHeight = uiTransform.contentSize.height;
                }
                const scaleX = w / originalWidth;
                const scaleY = h / originalHeight;
                newNode.setScale(v3(scaleX, scaleY, 1));
            
            // 处理拉伸Checkpoint的碰撞箱尺寸(报错就改)
            const collider = newNode.getComponent(Collider2D);
            if (collider) {
                // 设置分组 (假设 GROUP_LEVEL 是你的常量)
                collider.group = GROUP_LEVEL; 
                collider.apply(); 
            }
        }
    }

    private ensureOpacity(node: Node): UIOpacity {
        if (!node) return null;
        let comp = node.getComponent(UIOpacity);
        if (!comp) {
            comp = node.addComponent(UIOpacity);
        }
        return comp;
    }

    public toggleTime() {
        const nextState = this.currentState === TimeState.Past ? TimeState.Future : TimeState.Past;
        
        // 1. 获取目标时间线的碰撞体根节点
        const targetRoot = nextState === TimeState.Past ? this.pastColRoot : this.futureColRoot;

        // 2. 执行防卡墙预检测
        if (this.checkIfStuck(targetRoot)) {
            console.log("【拒绝切换】目标时空有墙体，防止卡死。");
            if (this.cameraNode){
                this.cameraNode.shake(0.5, 5);
            }
            return; 
        }

        // 3. 检测通过，允许切换
        this.switchTime(nextState);
    }

    public switchTime(state: TimeState) {
        console.log(`[Debug Scope] this.name: ${this ? this.name : "undefined"}, this类型: ${this ? this.constructor.name : "N/A"}`);

        this.currentState = state;
        const isPast = state === TimeState.Past;

        console.log(`[TimeSwitch] 切换到: ${isPast ? "过去 (Past)" : "未来 (Future)"}`);

        if (this.pastColRoot) {
            this.pastColRoot.active = isPast;
        } else {
            console.warn("警告: pastColRoot 未赋值");
        }

        if (this.futureColRoot) {
            this.futureColRoot.active = !isPast;
        } else {
            console.warn("警告: futureColRoot 未赋值");
        }

        // 核心逻辑：通过 active 控制显隐和碰撞生效
        // 1. 处理碰撞体
        if (this.pastColRoot) this.pastColRoot.active = isPast;
        if (this.futureColRoot) this.futureColRoot.active = !isPast;

        // 2. 处理画面
        if (this.pastArtLayer) this.pastArtLayer.active = isPast;
        if (this.futureArtLayer) this.futureArtLayer.active = !isPast;
        //3.通知所有监听者
        for (let i = 0; i < this.timeListeners.length; i++) {
            const cb = this.timeListeners[i];
            cb(this.currentState);
        }

    }

    private generateColliders(layerName: string, groupIndex: number): Node {
        const objectGroup = this.tiledMap.getObjectGroup(layerName);
        if (!objectGroup) {
            console.error(`[Error] 未找到对象层: ${layerName}`);
            return null;
        }

        // 创建一个独立的父节点来管理这组碰撞体
        const rootNode = new Node(layerName + "_Root");
        rootNode.active = true;
        rootNode.addComponent(UITransform);
        this.tiledMap.node.addChild(rootNode);

        // 准备坐标计算参数
        const objects = objectGroup.getObjects();
        const mapSize = this.tiledMap.getMapSize();
        const tileSize = this.tiledMap.getTileSize();

        if (!mapSize || !tileSize) {
            console.error("无法获取 MapSize 或 TileSize，请检查 TMX 资源");
            return rootNode;
        }

        const totalW = mapSize.width * tileSize.width;
        const totalH = mapSize.height * tileSize.height;
        const halfW = totalW / 2;
        const halfH = totalH / 2;

        // console.log(`[MapDebug] Layer:${layerName} W:${totalW} H:${totalH}`);

        for (const object of objects) {
            const colliderNode = new Node();
            colliderNode.name = object.name || "Collider";

            // 重要：添加到新建的 rootNode 中
            rootNode.addChild(colliderNode);

            const w = object.width;
            const h = object.height;
            const tiledX = object.x;
            const tiledY = object.y;

            if (typeof w !== 'number' || typeof h !== 'number' || typeof tiledX !== 'number' || typeof tiledY !== 'number') {
                console.warn(`[Error Data] 对象 ${object.name || 'Unknown'} 数据不完整，跳过。`, object);
                continue;
            }

            

            // 如果你想直接丢弃 0 尺寸对象（推荐）：
            if (w <= 0 || h <= 0) {
                console.warn(`[Invalid Size] 对象 ${object.name} 尺寸为 0，已丢弃。`);
                continue;
            }

            // 使用之前验证通过的中心锚点(0.5, 0.5)公式
            const finalX = -halfW + tiledX + (w / 2);
            const finalY = -halfH + tiledY - (h / 2);

            if (Number.isNaN(finalX) || Number.isNaN(finalY)) {
                console.error(`[Math Error] 对象 ${object.name} 坐标计算结果为 NaN！`, { tiledX, tiledY, w, h });
                continue; // 绝对不要把 NaN 传给 setPosition
            }

            colliderNode.setPosition(v3(finalX, finalY, 0));

            const rb = colliderNode.addComponent(RigidBody2D);
            rb.type = ERigidBody2DType.Static;

            const collider = colliderNode.addComponent(BoxCollider2D);
            collider.size = new Size(w, h);

            // 设置对应的分组
            collider.group = groupIndex;
        }

        return rootNode;
    }

    private checkIfStuck(targetColRoot: Node): boolean {
        if (!this.playerNode || !targetColRoot) return false;

        // 1. 获取玩家的包围盒（世界坐标）
        const playerUI = this.playerNode.getComponent(UITransform);
        if (!playerUI) return false;
        
        // 获取玩家的世界包围盒
        const playerWorldRect = playerUI.getBoundingBoxToWorld();

        const shrinkX = playerWorldRect.width * this.stuckForgiveness;
        const shrinkY = playerWorldRect.height * this.stuckForgiveness;

        // x, y 是矩形左下角坐标，所以 x 加，y 加，宽高减双倍
        playerWorldRect.x += shrinkX;
        playerWorldRect.y += shrinkY;
        playerWorldRect.width -= (shrinkX * 2);
        playerWorldRect.height -= (shrinkY * 2);
        
        // 保护：防止容错率设太大导致宽变成负数
        if (playerWorldRect.width < 0) playerWorldRect.width = 0;
        if (playerWorldRect.height < 0) playerWorldRect.height = 0;

        
        const mapUI = this.tiledMap.node.getComponent(UITransform);
        
        // 玩家矩形中心点（世界）
        const pWorldCenter = v3(playerWorldRect.center.x, playerWorldRect.center.y, 0);
        // 玩家矩形中心点（Map局部）
        const pLocalCenter = mapUI.convertToNodeSpaceAR(pWorldCenter);
        
        // 构建玩家在 Map 下的局部 Rect
        const playerLocalRect = new Rect(
            pLocalCenter.x - playerWorldRect.width / 2,
            pLocalCenter.y - playerWorldRect.height / 2,
            playerWorldRect.width,
            playerWorldRect.height
        );

        // 4. 遍历目标根节点下的所有墙体
        // 注意：这里我们利用了 generateColliders 中生成的结构，所有墙都是 targetColRoot 的直接子节点
        const walls = targetColRoot.children;
        
        for (let i = 0; i < walls.length; i++) {
            const wallNode = walls[i];
            const collider = wallNode.getComponent(BoxCollider2D);
            if (!collider) continue;

            // 获取墙体的尺寸 (generateColliders 里设置了 size)
            const w = collider.size.width;
            const h = collider.size.height;
            // 墙体的位置 (generateColliders 里设置了 position，它是相对于 TiledMap 根节点的)
            // *注意*：你的 generateColliders 把 targetColRoot 放在了 this.tiledMap.node 下，
            // 而 wallNode 是 targetColRoot 的子节点。
            // 修正逻辑：我们需要确保坐标系一致。
            // 如果 targetColRoot 的 position 是 (0,0)，那么 wallNode.position 就是相对于 TiledMap 的。
            // 你的 generateColliders 代码中：rootNode 被 addChild 到 tiledMap.node，且默认位置是 (0,0)。
            // 所以 wallNode.position 直接可用。

            const wx = wallNode.position.x;
            const wy = wallNode.position.y;

            // 构建墙体的 Rect (锚点 0.5, 0.5 -> 转换为左下角原点)
            const wallRect = new Rect(
                wx - w / 2,
                wy - h / 2,
                w,
                h
            );

            // 5. 纯数学矩形相交检测
            if (playerLocalRect.intersects(wallRect)) {
                // 发生重叠，判定为会卡墙
                console.log(`[Stuck Check] 玩家与墙体 ${wallNode.name} 重叠，禁止切换。`);
                return true;
            }
        }

        return false;
    }

    public registerScope(id: number, x: number, y: number, w: number, h: number) {
        const rect = new math.Rect(x, y, w, h);
        // 存入 Map
        this._boundsMap.set(id, {
            rect: rect,
            center: new Vec3(rect.center.x, rect.center.y, 0)
        });
    }

    public getScopeData(scopeID: number): ScopeData | undefined {
        return this._boundsMap.get(scopeID);
    }
}