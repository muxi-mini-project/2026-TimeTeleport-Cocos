import { _decorator, Component, Node, VideoPlayer, Vec3, tween, view, director, sys } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('VideoPlayerController')
export class VideoPlayerController extends Component {

    @property(VideoPlayer)
    videoPlayer: VideoPlayer = null;

    @property({ tooltip: "最大盖章次数，达到后视频覆盖全屏" })
    maxStamps: number = 10;

    @property({ tooltip: "初始缩放比例（左上角小窗）" })
    startScale: number = 0.2;

    @property({ tooltip: "最终缩放比例（全屏）" })
    endScale: number = 1.0;

    @property({ tooltip: "动画时长（秒）" })
    animationDuration: number = 0.4;

    @property({ tooltip: "左上角起始位置偏移（相对于Canvas中心）" })
    startPosition: Vec3 = new Vec3(-700, 350, 0);

    @property({ tooltip: "全屏时中心位置" })
    centerPosition: Vec3 = new Vec3(0, 0, 0);

    @property({ tooltip: "全屏后延迟多久跳转到选关界面（秒）" })
    delayBeforeTransition: number = 1.5;

    private _currentStampCount: number = 0;
    private _currentTween: any = null;

    onLoad() {
        this.node.setScale(this.startScale, this.startScale, 1);
        this.node.setPosition(this.startPosition);
    }

    start() {
        if (this.videoPlayer) {
            this.videoPlayer.play();
        }
    }

    public onStampCountChanged() {
        if (this._currentStampCount >= this.maxStamps) {
            return;
        }

        this._currentStampCount++;

        this.updateVideoFrame();
    }

    private updateVideoFrame() {
        if (this._currentTween) {
            this._currentTween.stop();
        }

        const progress = this._currentStampCount / this.maxStamps;
        const targetScale = this.startScale + (this.endScale - this.startScale) * progress;
        
        const targetPos = new Vec3(
            this.startPosition.x + (this.centerPosition.x - this.startPosition.x) * progress,
            this.startPosition.y + (this.centerPosition.y - this.startPosition.y) * progress,
            0
        );

        this._currentTween = tween(this.node)
            .to(this.animationDuration, {
                scale: new Vec3(targetScale, targetScale, 1),
                position: targetPos
            }, { easing: 'backOut' })
            .call(() => {
                this._currentTween = null;
                if (this.isFullScreen) {
                    this.scheduleOnce(() => {
                        // 在切换到 LevelSelect 前解锁下一关（第1关）
                        try {
                            const storage = sys?.localStorage;
                            if (storage) {
                                // 第0关（序章）完成后，解锁第1关
                                const completedIndex = 0; // 序章的索引
                                const nextIndex = completedIndex + 1;
                                
                                const rawMax = storage.getItem('LevelSelect_MaxUnlockedIndex');
                                const oldMax = rawMax != null ? parseInt(rawMax) : 0;
                                const safeOldMax = isNaN(oldMax) ? 0 : oldMax;
                                
                                const newMax = Math.max(safeOldMax, nextIndex);
                                storage.setItem('LevelSelect_MaxUnlockedIndex', String(newMax));
                                
                                console.log(`[VideoPlayerController] 序章完成，解锁第1关，新最大解锁索引=${newMax}`);
                            }
                        } catch (e) {
                            console.warn('[VideoPlayerController] 更新解锁进度失败', e);
                        }
                        
                        director.loadScene('LevelSelect');
                    }, this.delayBeforeTransition);
                }
            })
            .start();
    }

    public get currentStampCount(): number {
        return this._currentStampCount;
    }

    public get isFullScreen(): boolean {
        return this._currentStampCount >= this.maxStamps;
    }

    onDestroy() {
        if (this._currentTween) {
            this._currentTween.stop();
            this._currentTween = null;
        }
    }
}
