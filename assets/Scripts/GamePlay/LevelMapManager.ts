import { _decorator, Component, Node, TiledMap, RigidBody2D, Collider2D, BoxCollider2D, ERigidBody2DType, Size, v3, PhysicsSystem2D, EPhysics2DDrawFlags, UIOpacity, UITransform, Prefab, instantiate } from 'cc';
const { ccclass, property } = _decorator;

const GROUP_LEVEL = 1 << 2;

export enum TimeState {
    Past,
    Future
}

@ccclass('LevelMapManager')
export class LevelMapManager extends Component {
    @property(TiledMap)
    tiledMap: TiledMap = null;

    @property({ tooltip: "淡入淡出耗时(秒)" })
    fadeDuration: number = 0.5;
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
            console.log("getting component");
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
            
            console.log(`[TiledDebug] 发现对象 Name: ${rawName}, Type: ${object.type}`);
            
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
                default:
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

            const uiTransform = newNode.getComponent(UITransform);
            // 设置默认值，防止组件丢失报错
            let originalWidth = 100; 
            let originalHeight = 100;
            if (uiTransform && uiTransform.contentSize.width > 0) {
                originalWidth = uiTransform.contentSize.width;
                originalHeight = uiTransform.contentSize.height;
            }

            const scaleX = w / originalWidth;
            const scaleY = h / originalHeight;

            newNode.setScale(v3(scaleX, scaleY, 1));

            newNode.setPosition(v3(finalX, finalY, 0));
            console.log(`生成对象 [${rawName}] 位置 x:${finalX} y:${finalY}`);

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

        console.log(`[MapDebug] Layer:${layerName} W:${totalW} H:${totalH}`);

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
}