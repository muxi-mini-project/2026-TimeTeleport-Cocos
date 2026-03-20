import { _decorator, Component, Node, VideoPlayer, Vec3, tween, view } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('VideoPlayerController')
export class VideoPlayerController extends Component {

    @property(VideoPlayer)
    videoPlayer: VideoPlayer = null;

    @property({ tooltip: "最大盖章次数，达到后视频覆盖全屏" })
    maxStamps: number = 5;

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
