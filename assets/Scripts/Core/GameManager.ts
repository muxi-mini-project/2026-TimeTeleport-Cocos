import { _decorator, Vec3, Director, director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager {
    // 单例模式
    private static _instance: GameManager = null;
    public static get instance(): GameManager {
        if (!this._instance) {
            this._instance = new GameManager();
        }
        return this._instance;
    }

    public currentCheckpointPos: Vec3 | null = null;
    public defaultSpawnPos: Vec3 = new Vec3(100, 100, 0);

    public saveCheckpoint(pos: Vec3) {
        // 克隆坐标防止引用问题
        this.currentCheckpointPos = pos.clone();
        console.log("存档点已更新: " + pos);
    }

    public resetLevel(startPos: Vec3) {
        this.defaultSpawnPos = startPos.clone();
        this.currentCheckpointPos = null; // 清空旧存档，或者设为初始点
    }
}