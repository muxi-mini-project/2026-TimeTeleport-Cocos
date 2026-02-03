import { _decorator, Component, Node, Prefab, instantiate, UITransform, Input, input, EventMouse, Vec3, game, tween } from 'cc';
import { PaperStack } from './PaperStack'; 
const { ccclass, property } = _decorator;

@ccclass('StampController')
export class StampController extends Component {

    @property({ type: PaperStack, tooltip: "引用纸张堆栈管理器" })
    paperStack: PaperStack = null;

    @property({ type: Prefab, tooltip: "盖下去留下的印记" })
    markPrefab: Prefab = null;

    @property({ tooltip: "印章悬停高度（Z轴），默认175" })
    hoverHeight: number = 175;

    @property({ tooltip: "印章下落到纸面的高度，默认0" })
    dropHeight: number = 0;

    @property({ 
        tooltip: "最小重叠比例（0-1），低于此值取消盖章", 
        range: [0, 1, 0.05] 
    })
    minOverlapRatio: number = 0.1;

    // 状态锁：防止在盖章动画过程中重复触发
    private _isStamping: boolean = false;

    // 缓存变量，避免 update 中频繁 new Vec3 (Zero Alloc)
    private _tempVec3: Vec3 = new Vec3();

    // 当前正在运行的 Tween，用于组件销毁时清理
    private _currentTween: any = null;

    start() {
        // 1. 隐藏系统鼠标指针，因为我们有自定义的印章了
        game.canvas.style.cursor = 'none';

        // 2. 注册输入事件
        // Input.EventType.MOUSE_MOVE -> 更新位置
        // Input.EventType.MOUSE_UP   -> 执行盖章
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);

        // 3. 设置印章初始悬停高度
        if (this.node && this.node.isValid) {
            const currentPos = this.node.position.clone();
            currentPos.z = this.hoverHeight;
            this.node.setPosition(currentPos);
        }
    }

    /**
     * 检查 Mark 是否与 Paper 有足够的重叠
     * 使用 AABB 近似算法，适合小角度旋转（±7.5°）
     */
    private checkMarkOverlap(mark: Node, paper: Node): boolean {
        const markTransform = mark.getComponent(UITransform);
        const paperTransform = paper.getComponent(UITransform);
        
        if (!markTransform || !paperTransform) {
            console.warn('[StampController] Mark 或 Paper 缺少 UITransform 组件');
            return false;
        }
        
        const markHalfW = markTransform.width / 2;
        const markHalfH = markTransform.height / 2;
        const paperHalfW = paperTransform.width / 2;
        const paperHalfH = paperTransform.height / 2;
        
        // Mark 的 AABB（考虑旋转后的扩展）
        // 对于 ±7.5 度的旋转，扩展约 1.7%（cos(7.5°) ≈ 0.991）
        const expansion = 1.017;
        
        const markMinX = mark.position.x - markHalfW * expansion;
        const markMaxX = mark.position.x + markHalfW * expansion;
        const markMinY = mark.position.y - markHalfH * expansion;
        const markMaxY = mark.position.y + markHalfH * expansion;
        
        // Paper 的 AABB（中心在原点）
        const paperMinX = -paperHalfW;
        const paperMaxX = paperHalfW;
        const paperMinY = -paperHalfH;
        const paperMaxY = paperHalfH;
        
        // AABB 相交检测：计算重叠区域
        const overlapMinX = Math.max(markMinX, paperMinX);
        const overlapMaxX = Math.min(markMaxX, paperMaxX);
        const overlapMinY = Math.max(markMinY, paperMinY);
        const overlapMaxY = Math.min(markMaxY, paperMaxY);
        
        // 如果没有重叠
        if (overlapMaxX <= overlapMinX || overlapMaxY <= overlapMinY) {
            return false;
        }
        
        // 计算重叠面积
        const overlapWidth = overlapMaxX - overlapMinX;
        const overlapHeight = overlapMaxY - overlapMinY;
        const overlapArea = overlapWidth * overlapHeight;
        
        // 计算 Mark 的面积
        const markArea = (markMaxX - markMinX) * (markMaxY - markMinY);
        
        // 防止除零
        if (markArea <= 0) {
            return false;
        }
        
        // 计算重叠比例
        const overlapRatio = overlapArea / markArea;
        
        return overlapRatio >= this.minOverlapRatio;
    }

    onDestroy() {
        // 停止所有正在运行的 Tween
        if (this._currentTween) {
            this._currentTween.stop();
            this._currentTween = null;
        }

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
        if (!this.node || !this.node.isValid) return;

        // 如果正在盖章动画中，为了视觉稳重感，可以选择暂停跟随，或者继续跟随
        // 这里选择继续跟随

        // 1. 获取 UI 触点 (屏幕坐标系，左下角为原点)
        const uiLocation = event.getUILocation();

        // 2. 坐标转换
        // 这里的 this.node.parent 通常是 Canvas 或者某个全屏容器
        // 我们需要把屏幕坐标转换为这个容器内部的 (x, y)
        if (!this.node.parent) {
            console.warn('[StampController] 父节点不存在，无法进行坐标转换');
            return;
        }

        const parentTransform = this.node.parent.getComponent(UITransform);
        if (!parentTransform) {
            console.warn('[StampController] 父节点缺少 UITransform 组件');
            return;
        }

        // convertToNodeSpaceAR: 基于锚点(Anchor Relative)转换
        parentTransform.convertToNodeSpaceAR(new Vec3(uiLocation.x, uiLocation.y, 0), this._tempVec3);

        // 3. 应用位置（X, Y轴），Z轴保持悬停高度
        this._tempVec3.z = this._isStamping ? this._tempVec3.z : this.hoverHeight;
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

        // 检查节点是否有效
        if (!this.node || !this.node.isValid) {
            console.warn('[StampController] 节点已失效');
            return;
        }

        // 1. 检查有没有纸 (调用 PaperStack 的接口)
        if (!this.paperStack) {
            console.warn('[StampController] paperStack 未绑定');
            return;
        }

        const topPaper = this.paperStack.getTopPaper();
        if (!topPaper) {
            console.log("没纸了！(虽然在无限模式下理论上不应该发生)");
            return;
        }

        // 上锁
        this._isStamping = true;

        // 2. 播放垂直下落动画 (Juice)
        // 视觉上：印章从 hoverHeight 下落到 dropHeight -> 缩小 -> 接触纸面 -> 回弹到 hoverHeight
        const currentPos = this.node.position.clone();
        this._currentTween = tween(this.node)
            .to(0.15, {
                position: new Vec3(currentPos.x, currentPos.y, this.dropHeight),
                scale: new Vec3(0.9, 0.9, 1)
            }) // 下落到纸面
            .call(() => {
                // 再次检查节点有效性
                if (!this.node || !this.node.isValid || !topPaper.isValid) {
                    this._isStamping = false;
                    return;
                }
                // 接触纸面的一瞬间，生成印记
                this.onStampContact(topPaper);
            })
            .to(0.2, {
                position: new Vec3(currentPos.x, currentPos.y, this.hoverHeight),
                scale: new Vec3(1, 1, 1)
            }) // 回弹到悬停高度
            .call(() => {
                // [Mutex Unlock] 解锁，允许下一次点击
                this._isStamping = false;
                this._currentTween = null;
            })
            .start();
    }

    onStampContact(targetPaper: Node) {
        if (!this.markPrefab) {
            console.warn('[StampController] markPrefab 未绑定');
            return;
        }

        if (!targetPaper || !targetPaper.isValid) {
            console.warn('[StampController] 目标纸张节点已失效');
            this._isStamping = false;
            return;
        }

        // 1. 生成印记实例
        const mark = instantiate(this.markPrefab);
        if (!mark) {
            console.warn('[StampController] 印记实例化失败');
            this._isStamping = false;
            return;
        }

        // 2. 【核心难点】坐标空间重映射 (Re-parenting Calculation)
        // 我们需要把 "印章在 Canvas 下的世界坐标"
        // 转换成 "印记在 Paper 下的局部坐标"



        // A. 获取印章当前的世界坐标
        const stampWorldPos = this.node.worldPosition;

        // B. 获取目标纸张的变换组件
        const paperTransform = targetPaper.getComponent(UITransform);
        if (!paperTransform) {
            console.warn('[StampController] 纸张缺少 UITransform 组件');
            this._isStamping = false;
            return;
        }

        // C. 将世界坐标转入纸张的局部空间
        // 注意：这里会复用 _tempVec3 减少 GC
        paperTransform.convertToNodeSpaceAR(stampWorldPos, this._tempVec3);

        // 3. 设置印记位置并添加
        mark.setPosition(this._tempVec3);

        // 增加一点随机旋转，模拟自然盖章
        mark.angle = (Math.random() - 0.5) * 15;

        // 4. 检查 Mark 是否与 Paper 有足够的重叠
        if (!this.checkMarkOverlap(mark, targetPaper)) {
            console.log('[StampController] Mark 与 Paper 重叠不足或完全脱离，取消盖章');
            mark.destroy();
            this._isStamping = false;
            return;
        }

        // 5. 将控制权移交给 PaperStack
        // PaperStack 会负责：绑定父子关系 -> 补充新纸 -> 飞出动画
        if (this.paperStack) {
            this.paperStack.processCurrentPaper(mark);
        }
    }
}