import { _decorator, Component, Node, Camera } from 'cc';
import { LevelMapManager, TimeState } from './LevelMapManager';
import { ParallaxLayer } from './ParallaxLayer';
const { ccclass, property } = _decorator;

@ccclass('ParallaxBackgroundManager')
export class ParallaxBackgroundManager extends Component {
    @property({ type: Node, tooltip: 'Past 时间线的背景层根节点' })
    pastLayersRoot: Node = null;

    @property({ type: Node, tooltip: 'Future 时间线的背景层根节点' })
    futureLayersRoot: Node = null;

    @property({ type: LevelMapManager, tooltip: '关卡地图管理器（用于监听时间切换）' })
    mapManager: LevelMapManager = null;

    @property({ type: Camera, tooltip: '主相机（用于传递给各 ParallaxLayer）' })
    mainCamera: Camera = null;

    @property({ tooltip: '是否自动分配相机引用到所有 ParallaxLayer' })
    autoAssignCamera: boolean = true;

    private currentState: TimeState = TimeState.Past;

    onLoad() {
        if (this.autoAssignCamera && this.mainCamera) {
            this.assignCameraToLayers();
        }
    }

    start() {
        if (this.mapManager) {
            this.mapManager.registerTimeListener(this.onTimeChanged.bind(this));
            this.currentState = this.mapManager.getCurrentState();
            this.updateVisibility(this.currentState);
        } else {
            console.warn('[ParallaxBackgroundManager] 未绑定 LevelMapManager，时间切换功能不可用');
            this.updateVisibility(TimeState.Past);
        }
    }

    private assignCameraToLayers() {
        const allLayers: ParallaxLayer[] = [];

        if (this.pastLayersRoot) {
            allLayers.push(...this.pastLayersRoot.getComponentsInChildren(ParallaxLayer));
        }
        if (this.futureLayersRoot) {
            allLayers.push(...this.futureLayersRoot.getComponentsInChildren(ParallaxLayer));
        }

        for (const layer of allLayers) {
            if (!layer.camera) {
                layer.camera = this.mainCamera;
            }
        }

        console.log(`[ParallaxBackgroundManager] 已为 ${allLayers.length} 个 ParallaxLayer 分配相机引用`);
    }

    private onTimeChanged(state: TimeState) {
        if (this.currentState === state) return;
        
        this.currentState = state;
        this.updateVisibility(state);
    }

    private updateVisibility(state: TimeState) {
        const isPast = state === TimeState.Past;

        if (this.pastLayersRoot) {
            this.pastLayersRoot.active = isPast;
        }

        if (this.futureLayersRoot) {
            this.futureLayersRoot.active = !isPast;
        }
    }

    public getCurrentState(): TimeState {
        return this.currentState;
    }

    public setCamera(camera: Camera) {
        this.mainCamera = camera;
        if (this.autoAssignCamera) {
            this.assignCameraToLayers();
        }
    }
}
