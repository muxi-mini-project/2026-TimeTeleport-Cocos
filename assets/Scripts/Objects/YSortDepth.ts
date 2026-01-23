import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Y 轴深度排序组件
 * 根据 Y 坐标自动调整节点的显示层级
 * 常用于 2D 平台游戏和 RPG 游戏，让 Y 坐标小的物体显示在前面（Y 坐标大的显示在后面）
 */
@ccclass('YSortDepth')
export class YSortDepth extends Component {

    /**
     * 是否在 update 中持续更新
     * 如果物体位置会移动，需要开启此选项
     */
    @property({ tooltip: '是否持续更新' })
    public continuousUpdate: boolean = true;

    /**
     * 更新间隔（秒）
     * 不是每帧都更新，以提高性能
     */
    @property({ tooltip: '更新间隔（秒）' })
    public updateInterval: number = 0.05;

    /**
     * Y 坐标缩放系数
     * 用于调整层级差异的敏感度
     * 值越大，Y 坐标变化对层级的影响越大
     */
    @property({ tooltip: 'Y 坐标缩放系数' })
    public yScale: number = 1;

    /**
     * 层级偏移
     * 用于手动调整物体在同类物体中的前后顺序
     */
    @property({ tooltip: '层级偏移' })
    public zIndexOffset: number = 0;

    /**
     * 是否反转 Y 轴
     * 某些游戏可能需要 Y 坐标大的显示在前面
     */
    @property({ tooltip: '是否反转 Y 轴' })
    public invertY: boolean = false;

    /**
     * 基准 Y 坐标
     * 用于计算相对深度
     */
    @property({ tooltip: '基准 Y 坐标' })
    public baseY: number = 0;

    // 上次更新时间
    private lastUpdateTime: number = 0;
    // 上次的 Y 坐标
    private lastY: number = NaN;

    onLoad() {
        // 初始更新
        this.updateDepth();
    }

    onEnable() {
        // 启用时更新
        this.updateDepth();
    }

    update(dt: number) {
        if (!this.continuousUpdate) return;

        this.lastUpdateTime += dt;

        // 按照固定间隔更新，避免每帧计算
        if (this.lastUpdateTime >= this.updateInterval) {
            this.lastUpdateTime = 0;
            this.updateDepth();
        }
    }

    /**
     * 更新深度（zIndex）
     */
    private updateDepth(): void {
        // 获取世界坐标 Y
        const worldY = this.node.worldPosition.y;

        // 如果 Y 坐标没有变化，跳过更新
        if (worldY === this.lastY) return;
        this.lastY = worldY;

        // 计算相对 Y 坐标
        const relativeY = (worldY - this.baseY) * this.yScale;

        // 计算最终的 zIndex
        // Cocos Creator 中，zIndex 值越大，显示越靠前
        // 默认情况下，Y 坐标小的显示在前面（即物体在下方）
        let zIndex: number;
        if (this.invertY) {
            // Y 坐标大的显示在前面
            zIndex = Math.floor(relativeY) + this.zIndexOffset;
        } else {
            // Y 坐标小的显示在前面（常见做法）
            zIndex = Math.floor(-relativeY) + this.zIndexOffset;
        }

        // 设置 zIndex
        this.node.setSiblingIndex(zIndex);
    }

    /**
     * 手动设置层级偏移
     */
    public setZIndexOffset(offset: number): void {
        this.zIndexOffset = offset;
        this.updateDepth();
    }

    /**
     * 手动更新深度
     */
    public forceUpdate(): void {
        this.updateDepth();
    }

    /**
     * 设置基准 Y 坐标
     */
    public setBaseY(baseY: number): void {
        this.baseY = baseY;
        this.updateDepth();
    }
}
