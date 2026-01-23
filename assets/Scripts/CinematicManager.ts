import { _decorator, Node, Director, director, Sprite, Color, UITransform, Widget, tween, view, Layers, BlockInputEvents, SpriteFrame, Texture2D } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CinematicManager')
export class CinematicManager {

    private static _instance: CinematicManager | null = null;

    // UI 节点引用
    private _rootNode: Node | null = null;
    private _topBar: Node | null = null;
    private _bottomBar: Node | null = null;
    private _leftBar: Node | null = null;
    private _rightBar: Node | null = null;

    // 配置参数
    private readonly animDuration: number = 0.5;
    private readonly coverRatio: number = 0.1; // 黑边占比 10%（每边）
    private readonly zIndex: number = 999; // 保证在最上层

    // 【调试方便】在这里修改颜色可以快速调试黑边位置
    // 生产环境使用 Color.BLACK，调试时可以改为 Color.RED
    private readonly barColor: Color = Color.RED;  // 🔧 修改这里改变边框颜色

    public static get instance(): CinematicManager {
        if (!this._instance) {
            this._instance = new CinematicManager();
        }
        return this._instance;
    }

    /**
     * 显示四边黑边
     */
    public show() {
        this.ensureUIExists(); // 关键：每次调用前检查UI是否存在，不存在则创建

        if (!this._topBar || !this._bottomBar || !this._leftBar || !this._rightBar) {
            console.error("[CinematicManager] 显示失败：某个边框未创建");
            return;
        }

        console.log(`[CinematicManager] 显示四边黑边动画，颜色: ${this.getColorName()}`);

        const visibleSize = view.getVisibleSize();
        const targetHeight = visibleSize.height * this.coverRatio;  // 上下黑边高度
        const targetWidth = visibleSize.width * this.coverRatio;    // 左右黑边宽度

        console.log(`[CinematicManager] 屏幕尺寸: ${visibleSize.width}x${visibleSize.height}, 黑边尺寸: ${targetWidth.toFixed(1)}x${targetHeight.toFixed(1)}`);

        // 【调试】直接设置尺寸，不使用动画，快速测试
        const topTrans = this._topBar.getComponent(UITransform);
        const botTrans = this._bottomBar.getComponent(UITransform);
        const leftTrans = this._leftBar.getComponent(UITransform);
        const rightTrans = this._rightBar.getComponent(UITransform);

        // 直接设置最终尺寸（跳过动画用于测试）
        topTrans.setContentSize(visibleSize.width, targetHeight);
        botTrans.setContentSize(visibleSize.width, targetHeight);
        leftTrans.setContentSize(targetWidth, visibleSize.height);
        rightTrans.setContentSize(targetWidth, visibleSize.height);

        console.log(`[CinematicManager] 直接设置尺寸完成`);
        console.log(`[CinematicManager] TopBar: ${topTrans.width}x${topTrans.height}, Anchor: (${this._topBar.getComponent(UITransform)!.anchorPoint.x}, ${this._topBar.getComponent(UITransform)!.anchorPoint.y})`);
        console.log(`[CinematicManager] BottomBar: ${botTrans.width}x${botTrans.height}, Anchor: (${this._bottomBar.getComponent(UITransform)!.anchorPoint.x}, ${this._bottomBar.getComponent(UITransform)!.anchorPoint.y})`);
        console.log(`[CinematicManager] LeftBar: ${leftTrans.width}x${leftTrans.height}, Anchor: (${this._leftBar.getComponent(UITransform)!.anchorPoint.x}, ${this._leftBar.getComponent(UITransform)!.anchorPoint.y})`);
        console.log(`[CinematicManager] RightBar: ${rightTrans.width}x${rightTrans.height}, Anchor: (${this._rightBar.getComponent(UITransform)!.anchorPoint.x}, ${this._rightBar.getComponent(UITransform)!.anchorPoint.y})`);

        // 如果使用动画，可以取消下面的注释
        /*
        // 停止之前的动画
        tween(this._topBar.getComponent(UITransform)).stop();
        tween(this._bottomBar.getComponent(UITransform)).stop();
        tween(this._leftBar.getComponent(UITransform)).stop();
        tween(this._rightBar.getComponent(UITransform)).stop();

        // 执行动画
        tween(this._topBar.getComponent(UITransform))
            .to(this.animDuration, { height: targetHeight }, { easing: 'cubicOut' })
            .start();

        tween(this._bottomBar.getComponent(UITransform))
            .to(this.animDuration, { height: targetHeight }, { easing: 'cubicOut' })
            .start();

        tween(this._leftBar.getComponent(UITransform))
            .to(this.animDuration, { width: targetWidth }, { easing: 'cubicOut' })
            .start();

        tween(this._rightBar.getComponent(UITransform))
            .to(this.animDuration, { width: targetWidth }, { easing: 'cubicOut' })
            .start();
        */
    }

    /**
     * 隐藏四边黑边
     */
    public hide() {
        if (!this._rootNode) {
            console.warn("[CinematicManager] 隐藏失败：rootNode 不存在");
            return;
        }

        if (!this._topBar || !this._bottomBar || !this._leftBar || !this._rightBar) {
            console.warn("[CinematicManager] 隐藏失败：某个边框不存在");
            return;
        }

        console.log("[CinematicManager] 隐藏四边黑边动画");

        // 停止之前的动画
        tween(this._topBar.getComponent(UITransform)).stop();
        tween(this._bottomBar.getComponent(UITransform)).stop();
        tween(this._leftBar.getComponent(UITransform)).stop();
        tween(this._rightBar.getComponent(UITransform)).stop();

        // 缩回为 0
        tween(this._topBar.getComponent(UITransform))
            .to(this.animDuration, { height: 0 }, { easing: 'cubicOut' })
            .start();

        tween(this._bottomBar.getComponent(UITransform))
            .to(this.animDuration, { height: 0 }, { easing: 'cubicOut' })
            .start();

        tween(this._leftBar.getComponent(UITransform))
            .to(this.animDuration, { width: 0 }, { easing: 'cubicOut' })
            .start();

        tween(this._rightBar.getComponent(UITransform))
            .to(this.animDuration, { width: 0 }, { easing: 'cubicOut' })
            .start();
    }

    /**
     * 核心逻辑：使用纯代码构建 UI 树
     * 创建四个方向的边框：上下左右
     */
    private ensureUIExists() {
        // 1. 检查当前 Canvas 是否有效
        const scene = director.getScene();
        if (!scene) {
            console.error("[CinematicManager] 无法获取场景");
            return;
        }

        // 查找场景中的 Canvas（通常 UI 都要挂在 Canvas 下）
        const canvas = scene.getComponentInChildren('cc.Canvas')?.node;

        if (!canvas) {
            console.error("[CinematicManager] 当前场景未找到 Canvas，无法生成黑边。请确保场景中有 Canvas 节点");
            return;
        }

        console.log(`[CinematicManager] 找到 Canvas: ${canvas.name}, Layer: ${canvas.layer}`);

        // 2. 检查节点是否依然有效（防止切换场景后节点被销毁引用丢失）
        if (this._rootNode && this._rootNode.isValid) {
            console.log("[CinematicManager] UI 已存在，直接使用");
            return;
        }

        console.log("[CinematicManager] 开始创建四边黑边 UI 结构");

        const visibleSize = view.getVisibleSize();

        // 3. 开始构建节点结构
        // 结构: CinematicLayer -> TopBar, BottomBar, LeftBar, RightBar

        // --- Root Node ---
        this._rootNode = new Node('CinematicLayer');
        this._rootNode.layer = Layers.Enum.UI_2D;
        canvas.addChild(this._rootNode);

        // 设置全屏 Widget
        const rootTrans = this._rootNode.addComponent(UITransform);
        rootTrans.setContentSize(visibleSize);
        const rootWidget = this._rootNode.addComponent(Widget);
        rootWidget.isAlignTop = true; rootWidget.top = 0;
        rootWidget.isAlignBottom = true; rootWidget.bottom = 0;
        rootWidget.isAlignLeft = true; rootWidget.left = 0;
        rootWidget.isAlignRight = true; rootWidget.right = 0;

        console.log(`[CinematicManager] RootNode 创建完成，屏幕尺寸: ${visibleSize.width}x${visibleSize.height}, Layer: ${this._rootNode.layer}`);

        // 设置层级 (Z-Index)，确保覆盖在大部分 UI 之上
        this._rootNode.setSiblingIndex(this.zIndex);

        // --- Top Bar (上黑边) ---
        this._topBar = this.createBarNode('TopBar');
        this._rootNode.addChild(this._topBar);
        const topWidget = this._topBar.addComponent(Widget);
        topWidget.isAlignTop = true; topWidget.top = 0;
        topWidget.isAlignLeft = true; topWidget.left = 0;
        topWidget.isAlignRight = true; topWidget.right = 0;
        topWidget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE; // 确保窗口调整时对齐
        // 锚点设为 (0.5, 1) 也就是上边缘中心，高度向下增长
        this._topBar.getComponent(UITransform)!.setAnchorPoint(0.5, 1);
        this._topBar.getComponent(UITransform)!.setContentSize(visibleSize.width, 0); // 初始高度为 0

        // --- Bottom Bar (下黑边) ---
        this._bottomBar = this.createBarNode('BottomBar');
        this._rootNode.addChild(this._bottomBar);
        const botWidget = this._bottomBar.addComponent(Widget);
        botWidget.isAlignBottom = true; botWidget.bottom = 0;
        botWidget.isAlignLeft = true; botWidget.left = 0;
        botWidget.isAlignRight = true; botWidget.right = 0;
        botWidget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        // 锚点设为 (0.5, 0) 也就是下边缘中心，高度向上增长
        this._bottomBar.getComponent(UITransform)!.setAnchorPoint(0.5, 0);
        this._bottomBar.getComponent(UITransform)!.setContentSize(visibleSize.width, 0); // 初始高度为 0

        // --- Left Bar (左黑边) ---
        this._leftBar = this.createBarNode('LeftBar');
        this._rootNode.addChild(this._leftBar);
        const leftWidget = this._leftBar.addComponent(Widget);
        leftWidget.isAlignLeft = true; leftWidget.left = 0;
        leftWidget.isAlignTop = true; leftWidget.top = 0;
        leftWidget.isAlignBottom = true; leftWidget.bottom = 0;
        leftWidget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        // 锚点设为 (0, 0.5) 也就是左边缘中心，宽度向右增长
        this._leftBar.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
        this._leftBar.getComponent(UITransform)!.setContentSize(0, visibleSize.height); // 初始宽度为 0

        // --- Right Bar (右黑边) ---
        this._rightBar = this.createBarNode('RightBar');
        this._rootNode.addChild(this._rightBar);
        const rightWidget = this._rightBar.addComponent(Widget);
        rightWidget.isAlignRight = true; rightWidget.right = 0;
        rightWidget.isAlignTop = true; rightWidget.top = 0;
        rightWidget.isAlignBottom = true; rightWidget.bottom = 0;
        rightWidget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        // 锚点设为 (1, 0.5) 也就是右边缘中心，宽度向左增长
        this._rightBar.getComponent(UITransform)!.setAnchorPoint(1, 0.5);
        this._rightBar.getComponent(UITransform)!.setContentSize(0, visibleSize.height); // 初始宽度为 0

        console.log("[CinematicManager] 四边黑边 UI 结构创建完成");

        // 【调试】输出每个 Bar 的初始状态
        console.log(`[CinematicManager] TopBar 尺寸: ${this._topBar.getComponent(UITransform)!.width}x${this._topBar.getComponent(UITransform)!.height}`);
        console.log(`[CinematicManager] BottomBar 尺寸: ${this._bottomBar.getComponent(UITransform)!.width}x${this._bottomBar.getComponent(UITransform)!.height}`);
        console.log(`[CinematicManager] LeftBar 尺寸: ${this._leftBar.getComponent(UITransform)!.width}x${this._leftBar.getComponent(UITransform)!.height}`);
        console.log(`[CinematicManager] RightBar 尺寸: ${this._rightBar.getComponent(UITransform)!.width}x${this._rightBar.getComponent(UITransform)!.height}`);
    }

    private createBarNode(name: string): Node {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;

        // 添加 Sprite
        const sprite = node.addComponent(Sprite);
        sprite.color = this.barColor; // 🔧 使用配置的颜色（方便调试时修改）
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;

        // 【关键】创建一个纯色纹理，否则 Sprite 不会渲染
        const texture = new Texture2D();
        texture.reset({
            width: 2,
            height: 2,
            format: Texture2D.PixelFormat.RGBA8888,
        });

        // 创建白色像素数据（基础颜色，后续通过 sprite.color 染色）
        const pixelData = new Uint8Array([
            255, 255, 255, 255,  // 白色
            255, 255, 255, 255,
            255, 255, 255, 255,
            255, 255, 255, 255,
        ]);

        texture.uploadData(pixelData, 2, 2);

        const spriteFrame = new SpriteFrame();
        spriteFrame.texture = texture;
        sprite.spriteFrame = spriteFrame;

        console.log(`[CinematicManager] 创建 ${name}，已设置纯色纹理，颜色: ${this.getColorName()}`);

        // 添加 UITransform
        const uiTrans = node.addComponent(UITransform);

        return node;
    }

    /**
     * 获取当前颜色的名称（用于调试日志）
     */
    private getColorName(): string {
        if (this.barColor.equals(Color.BLACK)) return "黑色";
        if (this.barColor.equals(Color.RED)) return "红色";
        if (this.barColor.equals(Color.GREEN)) return "绿色";
        if (this.barColor.equals(Color.BLUE)) return "蓝色";
        if (this.barColor.equals(Color.WHITE)) return "白色";
        return `自定义(${this.barColor.r},${this.barColor.g},${this.barColor.b})`;
    }
}