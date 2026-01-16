import { _decorator, Component, Node, Prefab, instantiate, UITransform, Input, input, EventMouse, Vec3, game, tween } from 'cc';
import { PaperStack } from './PaperStack'; 
const { ccclass, property } = _decorator;

@ccclass('StampController')
export class StampController extends Component {

    @property({ type: PaperStack, tooltip: "引用纸张堆栈管理器" })
    paperStack: PaperStack = null;

    @property({ type: Prefab, tooltip: "盖下去留下的印记" })
    markPrefab: Prefab = null;

    // 状态锁：防止在盖章动画过程中重复触发
    private _isStamping: boolean = false;

    // 缓存变量，避免 update 中频繁 new Vec3 (Zero Alloc)
    private _tempVec3: Vec3 = new Vec3();

    start() {
        // 1. 隐藏系统鼠标指针，因为我们有自定义的印章了
        game.canvas.style.cursor = 'none';

        // 2. 注册输入事件
        // Input.EventType.MOUSE_MOVE -> 更新位置
        // Input.EventType.MOUSE_UP   -> 执行盖章
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    }

    onDestroy() {
        // 恢复系统鼠标与清理事件
        game.canvas.style.cursor = 'auto';
        input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    }

    /**
     * 逻辑核心 1：鼠标跟随
     * 将屏幕上的鼠标点，映射到印章父节点的局部坐标系中
     */
    onMouseMove(event: EventMouse) {
        // 如果正在盖章动画中，为了视觉稳重感，可以选择暂停跟随，或者继续跟随
        // 这里选择继续跟随
        
        // 1. 获取 UI 触点 (屏幕坐标系，左下角为原点)
        const uiLocation = event.getUILocation();

        // 2. 坐标转换
        // 这里的 this.node.parent 通常是 Canvas 或者某个全屏容器
        // 我们需要把屏幕坐标转换为这个容器内部的 (x, y)
        const parentTransform = this.node.parent.getComponent(UITransform);
        
        // convertToNodeSpaceAR: 基于锚点(Anchor Relative)转换
        parentTransform.convertToNodeSpaceAR(new Vec3(uiLocation.x, uiLocation.y, 0), this._tempVec3);

        // 3. 应用位置
        this.node.setPosition(this._tempVec3);
    }

    /**
     * 逻辑核心 2：点击处理
     */
    onMouseUp(event: EventMouse) {
        // 0 = 左键
        if (event.getButton() === 0) {
            this.doStamp();
        }
    }

    doStamp() {
        // [Mutex Lock] 检查锁
        if (this._isStamping) return;

        // 1. 检查有没有纸 (调用 PaperStack 的接口)
        const topPaper = this.paperStack.getTopPaper();
        if (!topPaper) {
            console.log("没纸了！(虽然在无限模式下理论上不应该发生)");
            return;
        }

        // 上锁
        this._isStamping = true;

        // 2. 播放按压动画 (Juice)
        // 视觉上：印章变小(模拟按远了/按扁了) -> 接触纸面 -> 弹回 -> 解锁
        tween(this.node)
            .to(0.1, { scale: new Vec3(0.8, 0.8, 1) }) // 下压
            .call(() => {
                // 接触纸面的一瞬间，生成印记
                this.onStampContact(topPaper);
            })
            .to(0.1, { scale: new Vec3(1, 1, 1) })     // 回弹
            .call(() => {
                // [Mutex Unlock] 解锁，允许下一次点击
                this._isStamping = false;
            })
            .start();
    }

    onStampContact(targetPaper: Node) {
        if (!this.markPrefab) return;

        // 1. 生成印记实例
        const mark = instantiate(this.markPrefab);

        // 2. 【核心难点】坐标空间重映射 (Re-parenting Calculation)
        // 我们需要把 "印章在 Canvas 下的世界坐标" 
        // 转换成 "印记在 Paper 下的局部坐标"
        
        

        // A. 获取印章当前的世界坐标
        const stampWorldPos = this.node.worldPosition;

        // B. 获取目标纸张的变换组件
        const paperTransform = targetPaper.getComponent(UITransform);

        // C. 将世界坐标转入纸张的局部空间
        // 注意：这里会复用 _tempVec3 减少 GC
        paperTransform.convertToNodeSpaceAR(stampWorldPos, this._tempVec3);

        // 3. 设置印记位置并添加
        mark.setPosition(this._tempVec3);
        
        // 增加一点随机旋转，模拟自然盖章
        mark.angle = (Math.random() - 0.5) * 15; 

        // 4. 将控制权移交给 PaperStack
        // PaperStack 会负责：绑定父子关系 -> 补充新纸 -> 飞出动画
        this.paperStack.processCurrentPaper(mark);
    }
}