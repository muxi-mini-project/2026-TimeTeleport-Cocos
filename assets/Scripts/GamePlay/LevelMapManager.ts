import { _decorator, Component, Node, TiledMap, RigidBody2D, BoxCollider2D, ERigidBody2DType, Size, v3, PhysicsSystem2D, EPhysics2DDrawFlags, UITransform } from 'cc';
const { ccclass, property } = _decorator;

const Group_Map = 1 << 1;

@ccclass('LevelMapManager')
export class LevelMapManager extends Component {
    @property(TiledMap)
    tiledMap: TiledMap = null;

    public MapRoot: Node = null;

    start() {
        if (!this.tiledMap) {
            console.log("getting component");
            this.tiledMap = this.getComponent(TiledMap);
        }

        PhysicsSystem2D.instance.debugDrawFlags = EPhysics2DDrawFlags.Aabb |
            EPhysics2DDrawFlags.Pair |
            EPhysics2DDrawFlags.CenterOfMass |
            EPhysics2DDrawFlags.Joint |
            EPhysics2DDrawFlags.Shape;

        // // 关键修复：不要把 TiledLayer 从 TiledMap 结构里移走
        // // 直接引用 TiledMap 中的图块层节点作为根节点
        // const pastLayer = this.tiledMap.getLayer("Past_Art");
        // const futureLayer = this.tiledMap.getLayer("Future_Art");

        // if (!pastLayer || !futureLayer) {
        //     console.warn("未找到 Past_Art 或 Future_Art 图块层，请检查 .tmx 图层名");
        //     return;
        // }
        

        // const mapLayer = this.tiledMap.getLayer("map");
        // this.MapRoot = this.tiledMap.node;
        // if (!mapLayer){
        //     console.warn('找不到map');
        // }

        // this.MapRoot = this.tiledMap.node;
        // this.MapRoot.layer = this.node.layer;
        // this.MapRoot.setPosition(0, 0, 0);
        // console.log(`【MapDebug】当前节点 Layer: ${this.node.layer}`);
        // console.log("TiledMap world:", this.tiledMap.node.worldPosition);
        // console.log("MapLayer world:", mapLayer.node.worldPosition);


        // console.log(`【MapDebug】PastRoot Layer: ${this.pastRoot.layer}, Position: ${this.pastRoot.position}`);

        // 生成碰撞体（挂到对应图块层下面，避免破坏 TiledMap 结构）
        // this.generateColliders("Past_Col", this.pastRoot, GROUP_PAST_WALL);
        // this.generateColliders("Future_Col", this.futureRoot, GROUP_FUTURE_WALL);

        // this.generateColliders("map_Col", this.MapRoot, Group_Map);
        this.addCollision();

        console.log("地图重组与初始化完成");
    }

    private generateColliders(objLayerName: string, parentNode: Node, groupIndex: number) {
        const group = this.tiledMap.getObjectGroup(objLayerName);
        if (!group) {
            console.warn(`未找到对象层: ${objLayerName}，请检查 Tiled 里的图层名`);
            return;
        }

        const objects = group.getObjects();

        console.log(`【MapDebug】正在生成 ${objLayerName} 的墙壁，共 ${objects.length} 个`);
        if (objects.length > 0) {
            const firstObj = objects[0];
            const mapSize = this.tiledMap.getMapSize();
            const tileSize = this.tiledMap.getTileSize();
            const totalHeight = mapSize.height * tileSize.height;
            const y = firstObj.y;
            const centerY = totalHeight - y - firstObj.height / 2;

            console.log(`【MapDebug】示例墙壁坐标计算: TiledY=${y}, TotalH=${totalHeight}, CocosY=${centerY}`);
            console.log(`【MapDebug】目标物理分组值: ${groupIndex} (二进制: ${groupIndex.toString(2)})`);
        }

        const mapSize = this.tiledMap.getMapSize();
        const tileSize = this.tiledMap.getTileSize();
        const totalHeight = mapSize.height * tileSize.height;

        const colliderRoot = new Node("Colliders");
        parentNode.addChild(colliderRoot);
        console.log("MapRoot scale:", parentNode.getScale());

        objects.forEach(obj => {
            const width = obj.width;
            const height = obj.height;
            const x = obj.x;
            const y = obj.y;

            const node = new Node("Wall");
            colliderRoot.addChild(node);
            colliderRoot.layer = parentNode.layer;
            node.layer = parentNode.layer;

            const rb = node.addComponent(RigidBody2D);
            rb.type = ERigidBody2DType.Static;

            const collider = node.addComponent(BoxCollider2D);
            collider.size = new Size(width, height);
            collider.group = groupIndex;

            const centerX = x + width / 2;
            const centerY = totalHeight - y - height / 2;

            node.setPosition(centerX, centerY, 0);
            console.log("wall world:", node.worldPosition);
            collider.apply();
        });
    }
    private addCollision() {
        const collisionGroup = this.tiledMap.getObjectGroup("map_Col");
        if (!collisionGroup) return;

        const objects = collisionGroup.getObjects();
        const mapSize = this.tiledMap.getMapSize();
        const tileSize = this.tiledMap.getTileSize();

        // 1. 获取地图总像素宽高
        const totalW = mapSize.width * tileSize.width;
        const totalH = mapSize.height * tileSize.height;

        // 2. 这里的 Anchor 必须是 (0.5, 0.5)，如果是其他值，此公式需要调整
        // 我们利用半宽和半高来建立坐标系：
        // Cocos 的 (0,0) 在地图中心
        // Top    (顶边) Y = +totalH / 2
        // Bottom (底边) Y = -totalH / 2
        // Left   (左边) X = -totalW / 2
        // Right  (右边) X = +totalW / 2
        const halfW = totalW / 2;
        const halfH = totalH / 2;

        for (const object of objects) {
            const colliderNode = new Node();
            colliderNode.name = object.name || "Collider";
            
            // 重要：添加到 TiledMap 节点下，这样我们只关心本地坐标，父节点的世界坐标在哪里都不影响
            this.tiledMap.node.addChild(colliderNode);

            const w = object.width;
            const h = object.height;
            const tiledX = object.x; 
            const tiledY = object.y;

            // --- 核心坐标公式 ---

            // X轴：Tiled 原点在左边(0)。Cocos 原点在中间(0)。
            // 转换：先移到最左边 (-halfW)，再向右加 TiledX，再向右加半个物体宽(中心修正)
            const finalX = -halfW + tiledX + (w / 2);

            // Y轴：Tiled 原点在顶部(0)。Cocos 原点在中间(0)。
            // 转换：先移到最顶部 (+halfH)，再向下减 TiledY，再向下减半个物体高(中心修正)
            // 注意：Tiled 的 Rect 对象坐标指的是 Top-Left，所以要减去 h/2 才能到中心
            const finalY = -halfH + tiledY - (h / 2);

            console.log(`Wall Position: x=${finalX}, y=${finalY}`);
            colliderNode.setPosition(v3(finalX, finalY, 0));

            // --- 物理组件 ---
            const rb = colliderNode.addComponent(RigidBody2D);
            rb.type = ERigidBody2DType.Static;
            
            const collider = colliderNode.addComponent(BoxCollider2D);
            collider.size = new Size(w, h);
            collider.group = 1; 
        }
    }
}



