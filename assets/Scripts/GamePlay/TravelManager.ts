import { _decorator, Component, Node, input, Input, KeyCode, BoxCollider2D, PhysicsSystem2D, Camera, GeometryRenderer, Color, Intersection2D, Rect, Vec2 } from 'cc';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

// 定义物理分组的常量 (需要根据你项目设置里的索引修改)
// 可以在 Project Settings -> Physics -> Collision Matrix 查看 Index
const GROUP_PLAYER = 1 << 0; // 假设 Player 是第0组
const GROUP_PAST   = 1 << 1; // 假设 Past 是第1组
const GROUP_FUTURE = 1 << 2; // 假设 Future 是第2组

@ccclass('TimeTravelManager')
export class TimeTravelManager extends Component {

    @property(Camera)
    mainCamera: Camera = null;

    @property(Node)
    pastWorld: Node = null;

    @property(Node)
    futureWorld: Node = null;

    @property(Node)
    playerNode: Node = null;

    // 记录当前在哪个时空 (false = Past, true = Future)
    private isFuture: boolean = false;

    // 缓存相机的Visibility掩码
    private maskPast: number = 0;
    private maskFuture: number = 0;

    start() {
        // 1. 初始化层级掩码 (这里假设 Default 和 UI_2D 是基础可见层)
        // 获取 Past 和 Future 的 Layer Index
        const layerPast = this.pastWorld.layer;
        const layerFuture = this.futureWorld.layer;
        
        // 基础可见层 (例如 Default, UI_2D, Player所在层)
        const baseMask = this.mainCamera.visibility & ~(1 << layerPast) & ~(1 << layerFuture);

        this.maskPast = baseMask | (1 << layerPast);
        this.maskFuture = baseMask | (1 << layerFuture);

        // 2. 确保两个世界都是 Active 的 (物理需要一直存在以便检测)
        this.pastWorld.active = true;
        this.futureWorld.active = true;

        // 3. 初始化状态：去过去
        this.setTimelineState(false);

        // 4. 绑定按键
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    onKeyDown(event) {
        if (event.keyCode === KeyCode.SHIFT_LEFT) {
            this.tryTimeTravel();
        }
    }

    // 设置当前的时间线状态（视觉+物理）
    setTimelineState(toFuture: boolean) {
        this.isFuture = toFuture;
        const playerCollider = this.playerNode.getComponent(BoxCollider2D);

        if (toFuture) {
            // 视觉：相机看未来
            this.mainCamera.visibility = this.maskFuture;
            // 物理：玩家只与未来碰撞
            // 注意：这里修改 group 或 mask 均可，推荐修改 mask
            // 让玩家只与 FUTURE_WORLD 和 默认组 碰撞，排除 PAST
            playerCollider.group = GROUP_PLAYER; 
            playerCollider.mask = GROUP_FUTURE | 1; // 假设 1 是 Default
        } else {
            // 视觉：相机看过去
            this.mainCamera.visibility = this.maskPast;
            // 物理：玩家只与过去碰撞
            playerCollider.mask = GROUP_PAST | 1;
        }
    }

    tryTimeTravel() {
        const playerCollider = this.playerNode.getComponent(BoxCollider2D);
        if (!playerCollider) return;

        // 获取玩家的世界包围盒
        const worldBounds = playerCollider.worldAABB;

        // 确定目标组
        const targetGroup = this.isFuture ? GROUP_PAST : GROUP_FUTURE;

        // --- 核心修改：精准检测 ---
        // 使用 PhysicsSystem2D 检测区域内的所有碰撞体
        const colliders = PhysicsSystem2D.instance.testAABB(worldBounds);
        
        let canTravel = true;

        for (let c of colliders) {
            // 1. 忽略玩家自己
            if (c.node === this.playerNode) continue;

            // 2. 检查碰撞体是否属于"目标世界"的阻挡层
            // 我们通过位运算检查 c.group 是否包含在 targetGroup 中，或者直接比较
            if ((c.group & targetGroup) !== 0) {
                // 如果是传感器(Sensor/Trigger)，通常可以穿越，具体看设计
                if (c.sensor) continue;

                // 发现障碍物，禁止穿越
                console.log(`检测到障碍物: ${c.node.name}，无法穿越`);
                canTravel = false;
                break;
            }
        }

        if (canTravel) {
            // 执行穿越：切换状态
            this.setTimelineState(!this.isFuture);
            this.playTravelEffect();
        } else {
            this.playFailEffect();
        }
    }

    playTravelEffect() {
        console.log("穿越成功！");
        // 这里可以加一个全屏扭曲或色差 Shader 效果
    }

    playFailEffect() {
        console.log("穿越失败！位置被占据。");
        // 播放 "哔哔" 的错误音效
        // 在玩家位置显示红色残影或UI提示
    }
}