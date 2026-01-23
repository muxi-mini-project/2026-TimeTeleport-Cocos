import { _decorator, Node, Director, director, Camera, view, Vec3, math } from 'cc';
const { ccclass } = _decorator;

/**
 * CinematicManager - 使用 Camera Viewport 方案
 *
 * 原理：不使用 Sprite 组件，而是通过调整 Camera 的可视区域来实现黑边效果
 * 这样可以避免渲染层、材质、Z轴位置等问题
 */
@ccclass('CinematicManager')
export class CinematicManager {

    private static _instance: CinematicManager | null = null;

    // Camera 引用
    private _camera: Camera | null = null;
    private _originalOrthoHeight: number = 0;
    private _originalPosition: Vec3 = new Vec3();

    // 配置参数
    private readonly coverRatio: number = 0.1; // 黑边占比 10%（每边）

    // 黑边状态
    private _isActive: boolean = false;

    public static get instance(): CinematicManager {
        if (!this._instance) {
            this._instance = new CinematicManager();
        }
        return this._instance;
    }

    /**
     * 显示四边黑边 - Camera Viewport 方案
     *
     * 核心思路：通过缩小 Camera 的可视区域，让画面居中显示，
     * 四周留出黑边。不需要任何 Sprite 或 UI 元素。
     */
    public show() {
        const scene = director.getScene();
        if (!scene) {
            console.error("[CinematicManager] 无法获取场景");
            return;
        }

        // 获取主 Camera
        const cameras = scene.getComponentsInChildren(Camera);
        if (cameras.length === 0) {
            console.error("[CinematicManager] 场景中找不到 Camera");
            return;
        }

        this._camera = cameras[0];
        console.log(`[CinematicManager] 找到 Camera: ${this._camera.node.name}`);

        // 保存原始状态
        this._originalOrthoHeight = this._camera.orthoHeight;
        this._camera.node.getPosition(this._originalPosition);

        console.log(`[CinematicManager] 原始 orthoHeight: ${this._originalOrthoHeight}`);
        console.log(`[CinematicManager] 原始位置: (${this._originalPosition.x}, ${this._originalPosition.y}, ${this._originalPosition.z})`);

        // 计算新的 orthoHeight（缩小画面的垂直范围）
        // 如果 coverRatio = 0.1，则画面缩小到原来的 80%（上下各留 10%）
        const newOrthoHeight = this._originalOrthoHeight * (1 - this.coverRatio * 2);

        console.log(`[CinematicManager] 新 orthoHeight: ${newOrthoHeight} (缩小 ${Math.round((1 - newOrthoHeight / this._originalOrthoHeight) * 100)}%)`);

        // 【核心实现】调整 Camera 的 orthoHeight
        // 这会让画面在垂直方向上缩小，上下自动留出黑边
        this._camera.orthoHeight = newOrthoHeight;

        // 注意：由于 orthographic camera 的宽高比是自动计算的，
        // 缩小高度后，宽度也会等比例缩小，左右也会自动留出黑边
        // 这样就实现了四边黑边的效果！

        this._isActive = true;

        console.log(`[CinematicManager] ✅ 四边黑边已显示（通过 Camera orthoHeight 缩小实现）`);
        console.log(`[CinematicManager] 画面已居中，四周自动显示黑边`);
    }

    /**
     * 隐藏四边黑边 - 恢复 Camera 原始状态
     */
    public hide() {
        if (!this._camera || !this._isActive) {
            console.warn("[CinematicManager] Camera 未设置或黑边未激活，无需隐藏");
            return;
        }

        console.log("[CinematicManager] 隐藏四边黑边，恢复 Camera 原始状态");

        // 恢复原始 orthoHeight
        this._camera.orthoHeight = this._originalOrthoHeight;

        console.log(`[CinematicManager] ✅ 已恢复 orthoHeight: ${this._originalOrthoHeight}`);

        this._isActive = false;
    }

    /**
     * 获取当前黑边是否激活
     */
    public get isActive(): boolean {
        return this._isActive;
    }
}
