import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Y 轴排序管理器
 * 统一管理场景中所有需要 Y 轴排序的节点
 * 保证玩家、敌人、平台等在同一层级系统中正确显示
 */
@ccclass('YSortManager')
export class YSortManager extends Component {

    /**
     * 是否自动管理子节点排序
     */
    @property({ tooltip: '是否自动管理子节点排序' })
    public autoSort: boolean = true;

    /**
     * 更新间隔（秒）
     */
    @property({ tooltip: '更新间隔（秒）' })
    public updateInterval: number = 0.05;

    /**
     * Y 坐标缩放系数
     */
    @property({ tooltip: 'Y 坐标缩放系数' })
    public yScale: number = 1;

    private lastUpdateTime: number = 0;
    private managedNodes: Node[] = [];

    onLoad() {
        // 注册为全局管理器（单例模式）
        if (!YSortManager.instance) {
            YSortManager.instance = this;
        }
    }

    onEnable() {
        // 收集所有需要排序的子节点
        this.collectManagedNodes();
    }

    /**
     * 收集所有需要排序的子节点
     */
    private collectManagedNodes(): void {
        this.managedNodes = [];

        // 遍历所有子节点
        const children = this.node.children;
        for (const child of children) {
            // 跳过隐藏的节点
            if (!child.active) continue;

            // 可以添加过滤条件，例如只管理特定名称的节点
            // 例如：if (child.name.includes('Player') || child.name.includes('Enemy'))
            this.managedNodes.push(child);
        }
    }

    update(dt: number) {
        if (!this.autoSort) return;

        this.lastUpdateTime += dt;

        if (this.lastUpdateTime >= this.updateInterval) {
            this.lastUpdateTime = 0;
            this.sortNodes();
        }
    }

    /**
     * 根据 Y 坐标排序所有节点
     * Y 坐标小的节点（在下方）显示在前面（siblingIndex 大）
     */
    private sortNodes(): void {
        if (this.managedNodes.length === 0) return;

        // 按照 Y 坐标排序（Y 小的在前）
        this.managedNodes.sort((a, b) => {
            const yA = a.worldPosition.y * this.yScale;
            const yB = b.worldPosition.y * this.yScale;
            return yA - yB; // 升序排序
        });

        // 设置 siblingIndex（Y 小的 index 大，显示在前）
        for (let i = 0; i < this.managedNodes.length; i++) {
            const node = this.managedNodes[i];
            // 反向设置，因为 siblingIndex 为 0 的是最底层
            const targetIndex = this.managedNodes.length - 1 - i;
            node.setSiblingIndex(targetIndex);
        }
    }

    /**
     * 手动触发排序
     */
    public forceSort(): void {
        this.sortNodes();
    }

    /**
     * 添加需要管理的节点
     */
    public addManagedNode(node: Node): void {
        if (this.managedNodes.indexOf(node) === -1) {
            this.managedNodes.push(node);
        }
    }

    /**
     * 移除管理的节点
     */
    public removeManagedNode(node: Node): void {
        const index = this.managedNodes.indexOf(node);
        if (index !== -1) {
            this.managedNodes.splice(index, 1);
        }
    }

    /**
     * 清空并重新收集节点
     */
    public refreshNodes(): void {
        this.collectManagedNodes();
    }

    // ========== 单例访问 ==========
    private static instance: YSortManager = null;

    public static getInstance(): YSortManager | null {
        return YSortManager.instance;
    }

    /**
     * 全局方法：将节点添加到 Y-Sort 管理器
     */
    public static addNodeToSort(node: Node): void {
        const manager = YSortManager.getInstance();
        if (manager) {
            manager.addManagedNode(node);
        }
    }

    /**
     * 全局方法：从 Y-Sort 管理器移除节点
     */
    public static removeNodeFromSort(node: Node): void {
        const manager = YSortManager.getInstance();
        if (manager) {
            manager.removeManagedNode(node);
        }
    }
}
