import { _decorator, Component, Vec3, Node } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 玩家轨迹记录点
 */
interface PathPoint {
    position: Vec3;
    timestamp: number;
}

/**
 * 玩家轨迹追踪器
 * 负责记录玩家的移动路径，供敌人跟随使用
 * 支持时间穿越系统，轨迹在时间切换时保持连续
 */
@ccclass('PlayerTracker')
export class PlayerTracker extends Component {
    /**
     * 轨迹记录间隔（秒）
     * 值越小轨迹越平滑，但内存占用越大
     */
    @property({ tooltip: '轨迹记录间隔（秒）' })
    public recordInterval: number = 0.05;

    /**
     * 最大轨迹点数量
     * 控制内存使用和跟随延迟
     */
    @property({ tooltip: '最大轨迹点数量' })
    public maxPathPoints: number = 600;

    /**
     * 是否启用记录
     */
    @property({ tooltip: '是否启用记录' })
    public isEnabled: boolean = true;

    /**
     * 玩家死亡时是否清除轨迹
     * 关闭后轨迹会保留，敌人会沿着玩家死亡前的路径继续移动
     */
    @property({ tooltip: '玩家死亡时是否清除轨迹' })
    public clearOnDeath: boolean = false;

    // 轨迹点队列
    private pathPoints: PathPoint[] = [];
    private timer: number = 0;
    private static instance: PlayerTracker = null;

    /**
     * 获取单例实例
     */
    public static getInstance(): PlayerTracker {
        return PlayerTracker.instance;
    }

    onLoad() {
        if (PlayerTracker.instance === null) {
            PlayerTracker.instance = this;
        } else {
            console.warn('[PlayerTracker] Multiple instances detected. Keeping only the first one.');
        }

        // 监听时间切换事件（不需要处理，轨迹持续记录）
        // 敌人会自己根据时间状态决定是否追踪
    }

    update(dt: number) {
        if (!this.isEnabled) return;

        this.timer += dt;

        // 按照固定间隔记录位置
        if (this.timer >= this.recordInterval) {
            this.recordPosition();
            this.timer = 0;
        }
    }

    /**
     * 记录当前位置
     */
    private recordPosition(): void {
        const pathPoint: PathPoint = {
            position: Vec3.clone(this.node.worldPosition),
            timestamp: Date.now()
        };

        this.pathPoints.push(pathPoint);

        // 保持轨迹点数量不超过最大值
        if (this.pathPoints.length > this.maxPathPoints) {
            this.pathPoints.shift();
        }
    }

    /**
     * 获取指定时间延迟前的位置
     * @param delaySeconds 延迟秒数
     * @returns 延迟时间对应的位置，如果找不到则返回当前位置
     */
    public getPositionAtDelay(delaySeconds: number): Vec3 {
        const targetTimestamp = Date.now() - (delaySeconds * 1000);

        // 从后往前查找最接近目标时间戳的点
        for (let i = this.pathPoints.length - 1; i >= 0; i--) {
            if (this.pathPoints[i].timestamp <= targetTimestamp) {
                return Vec3.clone(this.pathPoints[i].position);
            }
        }

        // 如果没有找到足够旧的位置，返回最早的记录点
        if (this.pathPoints.length > 0) {
            return Vec3.clone(this.pathPoints[0].position);
        }

        // 如果完全没有记录，返回玩家当前位置
        return Vec3.clone(this.node.worldPosition);
    }

    /**
     * 获取指定索引的轨迹点
     * @param index 索引（0是最新的点）
     * @returns 轨迹点位置
     */
    public getPositionAtIndex(index: number): Vec3 | null {
        if (index < 0 || index >= this.pathPoints.length) {
            return null;
        }

        // 反向索引，0是最新的
        const actualIndex = this.pathPoints.length - 1 - index;
        return Vec3.clone(this.pathPoints[actualIndex].position);
    }

    /**
     * 获取轨迹点总数
     */
    public getPathPointCount(): number {
        return this.pathPoints.length;
    }

    /**
     * 清除所有轨迹点
     */
    public clearPath(): void {
        this.pathPoints = [];
        console.log('[PlayerTracker] 轨迹已清除');
    }

    /**
     * 获取所有轨迹点（用于调试或其他用途）
     */
    public getAllPathPoints(): PathPoint[] {
        return this.pathPoints.slice();
    }
}
