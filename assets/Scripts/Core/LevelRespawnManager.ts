import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LevelRespawnManager')
export class LevelRespawnManager extends Component {
    private static _instance: LevelRespawnManager | null = null;

    public static get instance(): LevelRespawnManager | null {
        return this._instance;
    }

    @property({ type: Node, tooltip: 'Player node to listen for respawn events' })
    playerNode: Node | null = null;

    private deactivatedNodes: Node[] = [];

    onLoad() {
        if (LevelRespawnManager._instance === null) {
            LevelRespawnManager._instance = this;
        } else {
            console.warn('[LevelRespawnManager] Multiple instances detected. Keeping only the first one.');
        }
    }

    start() {
        if (this.playerNode) {
            this.playerNode.on('player-respawned', this.onPlayerRespawned, this);
        } else {
            console.warn('[LevelRespawnManager] Player node not assigned!');
        }
    }

    onDestroy() {
        if (LevelRespawnManager._instance === this) {
            LevelRespawnManager._instance = null;
        }

        if (this.playerNode) {
            this.playerNode.off('player-respawned', this.onPlayerRespawned, this);
        }
    }

    public registerDeactivated(node: Node): void {
        if (this.deactivatedNodes.indexOf(node) === -1) {
            this.deactivatedNodes.push(node);
        }
    }

    private onPlayerRespawned(): void {
        console.log('[LevelRespawnManager] Player respawned, resetting deactivated objects...');

        for (const node of this.deactivatedNodes) {
            if (!node || node.isValid === false) continue;

            const components = node.components;
            for (const comp of components) {
                if (typeof (comp as any).resetToInitialState === 'function') {
                    (comp as any).resetToInitialState();
                    break;
                }
            }
        }

        this.deactivatedNodes = [];
    }

    public clearAll(): void {
        this.deactivatedNodes = [];
    }
}
