import { _decorator, Component, Node } from 'cc';
import { LevelMapManager } from './LevelMapManager';
const { ccclass, property } = _decorator;

@ccclass('TimeTravelManager')
export class TimeTravelManager extends Component {
    
    @property(LevelMapManager)
    mapManager: LevelMapManager = null;
    
    @property(Node)
    playerNode: Node = null;

    private canTravel: boolean = false;

    start() {
        if (!this.playerNode) {
            console.warn('未绑定玩家节点');
            return;
        }
    }

    public tryTimeTravel(){
        this.mapManager.toggleTime();
    }
}


