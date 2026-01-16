import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, view, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PaperStack')
export class PaperStack extends Component {

    @property(Prefab)
    paperPrefab: Prefab = null;

    @property
    visibleCount: number = 6; // 视觉上只需要维持 6 张就能制造"厚度感"

    // 这一摞纸的数组
    // [0] 是最底下的（视觉上被压住的）
    // [length-1] 是最上面的（玩家操作的）
    private _papers: Node[] = [];

    start() {
        // 初始化填满栈
        for (let i = 0; i < this.visibleCount; i++) {
            this.addPaperToBottom();
        }
        // 刷新一下所有纸张的视觉位置（Z轴高度/偏移）
        this.refreshVisualLayout();
    }

    public getTopPaper(): Node | null {
        if (this._papers.length === 0) return null;
        return this._papers[this._papers.length - 1];
    }

    /**
     * 向栈底塞入一张新纸
     */
    private addPaperToBottom() {
        const paper = instantiate(this.paperPrefab);
        this.node.addChild(paper);
        
        // 关键点1：物理位置插到数组最前面（栈底）
        this._papers.unshift(paper);

        // 关键点2：渲染层级设为 0，确保它在所有纸的下面
        paper.setSiblingIndex(0);

        // 初始化状态
        paper.setPosition(0, 0, 0); 
    }

    /**
     * 刷新堆叠视觉效果
     * 确保 index 0 在最下面，index 越大越往上
     */
    private refreshVisualLayout() {
        for (let i = 0; i < this._papers.length; i++) {
            const paper = this._papers[i];
            
            // 目标位置：每一张稍微向上错开，制造厚度
            const targetY = i * 2; 
            
            // 如果你想做得更细致，可以用 tween 平滑归位，这里直接设置即可
            paper.setPosition(0, targetY, 0);
            
            // 只有新生成的纸（在最底下）可能没有旋转角度，给它随机一下
            // 已经存在的纸保持角度不变，避免视觉抖动
            if (i === 0) {
                 paper.angle = (Math.random() - 0.5) * 5;
            }
        }
    }

    public processCurrentPaper(markNode: Node) {
        // 1. 弹出最上面的一张
        const currentPaper = this._papers.pop();
        if (!currentPaper) return;

        // 2. 绑定印章
        markNode.setParent(currentPaper);

        // 3. 【核心修改】立即在底部补充一张新纸
        // 这样玩家眼里的纸堆厚度永远不变
        this.addPaperToBottom();
        this.refreshVisualLayout(); // 重新计算每张纸应该在的高度

        // 4. 处理飞出逻辑 (这部分保持不变)
        const visibleSize = view.getVisibleSize();
        const targetPos = new Vec3(-visibleSize.width, currentPaper.position.y, 0);

        tween(currentPaper)
            .to(0.5, { 
                position: targetPos, 
                angle: currentPaper.angle - 60, 
                scale: new Vec3(0.8, 0.8, 1) 
            }, { easing: 'backIn' })
            .call(() => {
                // 5. 飞出屏幕后销毁
                currentPaper.destroy();
                // 此时不需要检查输赢了，因为是无限模式
            })
            .start();
    }
}