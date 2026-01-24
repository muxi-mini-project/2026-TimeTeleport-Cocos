import { _decorator } from 'cc';
import { CollectibleInstanceData, LevelCollectibleData, GlobalCollectibleData, CloudSyncData } from './CollectibleData';
import { CollectibleType } from './CollectibleType';
const { ccclass } = _decorator;

@ccclass('CollectibleManager')
export class CollectibleManager {
    private static _instance: CollectibleManager | null = null;

    private globalData: GlobalCollectibleData | null = null;
    private currentLevelId: string = '';
    private dataLoaded: boolean = false;

    private static readonly STORAGE_KEY = 'CollectibleData';
    private static readonly DATA_VERSION = '1.0.0';

    public static getInstance(): CollectibleManager {
        if (!this._instance) {
            this._instance = new CollectibleManager();
        }
        return this._instance;
    }

    private constructor() {
        this.initializeGlobalData();
    }

    private initializeGlobalData(): void {
        this.globalData = {
            version: CollectibleManager.DATA_VERSION,
            lastUpdated: 0,
            levels: new Map<string, LevelCollectibleData>(),
            totals: {
                totalLevels: 0,
                totalCollectibles: 0,
                totalCollected: 0
            }
        };
    }

    public initialize(levelId: string): void {
        this.currentLevelId = levelId;
        this.loadFromStorage();

        if (!this.globalData.levels.has(levelId)) {
            this.createLevelData(levelId, levelId);
        }

        this.ensureLevelExists(levelId);
    }

    public getCurrentLevelId(): string {
        return this.currentLevelId;
    }

    public setCurrentLevelId(levelId: string): void {
        this.currentLevelId = levelId;
    }

    private createLevelData(levelId: string, levelName: string): void {
        const levelData: LevelCollectibleData = {
            levelId: levelId,
            levelName: levelName,
            totalCollectibles: 0,
            collectedCount: 0,
            collectibles: new Map<string, CollectibleInstanceData>()
        };
        this.globalData.levels.set(levelId, levelData);
        this.globalData.totals.totalLevels = this.globalData.levels.size;
        this.saveToStorage();
    }

    private ensureLevelExists(levelId: string): void {
        if (!this.globalData.levels.has(levelId)) {
            this.createLevelData(levelId, levelId);
        }
    }

    public collectItem(itemData: CollectibleInstanceData): void {
        if (!this.globalData) {
            console.error('[CollectibleManager] 全局数据未初始化');
            return;
        }

        const levelId = itemData.levelId || this.currentLevelId;
        this.ensureLevelExists(levelId);

        const levelData = this.globalData.levels.get(levelId);
        if (!levelData) {
            console.error(`[CollectibleManager] 关卡 ${levelId} 数据不存在`);
            return;
        }

        if (levelData.collectibles.has(itemData.collectibleId)) {
            const existing = levelData.collectibles.get(itemData.collectibleId);
            if (existing && existing.isCollected) {
                console.warn(`[CollectibleManager] 收集物 ${itemData.collectibleId} 已被收集`);
                return;
            }
        }

        levelData.collectibles.set(itemData.collectibleId, itemData);
        levelData.collectedCount++;

        this.updateTotals();
        this.globalData.lastUpdated = Date.now();
        this.saveToStorage();

        console.log(`[CollectibleManager] 收集成功: ${itemData.collectibleId}, 关卡: ${levelId}, 已收集: ${levelData.collectedCount}/${levelData.totalCollectibles}`);
    }

    public isCollected(collectibleId: string): boolean {
        if (!this.globalData || !this.currentLevelId) {
            return false;
        }

        const levelData = this.globalData.levels.get(this.currentLevelId);
        if (!levelData) {
            return false;
        }

        const item = levelData.collectibles.get(collectibleId);
        return item ? item.isCollected : false;
    }

    public isCollectedInLevel(levelId: string, collectibleId: string): boolean {
        if (!this.globalData) {
            return false;
        }

        const levelData = this.globalData.levels.get(levelId);
        if (!levelData) {
            return false;
        }

        const item = levelData.collectibles.get(collectibleId);
        return item ? item.isCollected : false;
    }

    public registerCollectible(levelId: string, collectibleId: string, type: CollectibleType): void {
        this.ensureLevelExists(levelId);

        const levelData = this.globalData.levels.get(levelId);
        if (!levelData) {
            return;
        }

        if (!levelData.collectibles.has(collectibleId)) {
            const itemData: CollectibleInstanceData = {
                collectibleId: collectibleId,
                type: type,
                levelId: levelId,
                instanceId: '',
                position: null,
                isCollected: false
            };

            levelData.collectibles.set(collectibleId, itemData);
            levelData.totalCollectibles++;

            this.globalData.totals.totalCollectibles++;
            this.saveToStorage();

            console.log(`[CollectibleManager] 注册收集物: ${collectibleId} in ${levelId}, 类型: ${type}`);
        }
    }

    public getLevelCollectibleCount(levelId: string): number {
        const levelData = this.globalData?.levels.get(levelId);
        return levelData ? levelData.totalCollectibles : 0;
    }

    public getLevelCollectedCount(levelId: string): number {
        const levelData = this.globalData?.levels.get(levelId);
        return levelData ? levelData.collectedCount : 0;
    }

    public getLevelCollectionRate(levelId: string): number {
        const levelData = this.globalData?.levels.get(levelId);
        if (!levelData || levelData.totalCollectibles === 0) {
            return 0;
        }
        return (levelData.collectedCount / levelData.totalCollectibles) * 100;
    }

    public getTotalCollectibleCount(): number {
        return this.globalData?.totals.totalCollectibles || 0;
    }

    public getTotalCollectedCount(): number {
        return this.globalData?.totals.totalCollected || 0;
    }

    public getTotalCollectionRate(): number {
        if (!this.globalData || this.globalData.totals.totalCollectibles === 0) {
            return 0;
        }
        return (this.globalData.totals.totalCollected / this.globalData.totals.totalCollectibles) * 100;
    }

    public getCollectedByType(levelId: string, type: CollectibleType): number {
        const levelData = this.globalData?.levels.get(levelId);
        if (!levelData) {
            return 0;
        }

        let count = 0;
        levelData.collectibles.forEach(item => {
            if (item.type === type && item.isCollected) {
                count++;
            }
        });
        return count;
    }

    private updateTotals(): void {
        if (!this.globalData) return;

        let totalCollectibles = 0;
        let totalCollected = 0;

        this.globalData.levels.forEach(levelData => {
            totalCollectibles += levelData.totalCollectibles;
            totalCollected += levelData.collectedCount;
        });

        this.globalData.totals.totalCollectibles = totalCollectibles;
        this.globalData.totals.totalCollected = totalCollected;
        this.globalData.totals.totalLevels = this.globalData.levels.size;
    }

    private saveToStorage(): void {
        try {
            const saveData = {
                version: this.globalData.version,
                lastUpdated: this.globalData.lastUpdated,
                levels: Array.from(this.globalData.levels.entries()),
                totals: this.globalData.totals
            };
            const json = JSON.stringify(saveData);
            localStorage.setItem(CollectibleManager.STORAGE_KEY, json);
        } catch (error) {
            console.error('[CollectibleManager] 保存到本地存储失败:', error);
        }
    }

    private loadFromStorage(): void {
        if (this.dataLoaded) {
            return;
        }

        try {
            const json = localStorage.getItem(CollectibleManager.STORAGE_KEY);
            if (json) {
                const saveData = JSON.parse(json);
                if (saveData.version === CollectibleManager.DATA_VERSION) {
                    this.globalData.version = saveData.version;
                    this.globalData.lastUpdated = saveData.lastUpdated;
                    this.globalData.totals = saveData.totals;

                    this.globalData.levels = new Map<string, LevelCollectibleData>();
                    saveData.levels.forEach(([levelId, levelData]: [string, any]) => {
                        const collectibles = new Map<string, CollectibleInstanceData>();
                        if (levelData.collectibles) {
                            if (Array.isArray(levelData.collectibles)) {
                                levelData.collectibles.forEach(([id, item]: [string, CollectibleInstanceData]) => {
                                    collectibles.set(id, item);
                                });
                            } else if (levelData.collectibles instanceof Map) {
                                levelData.collectibles.forEach((item: CollectibleInstanceData, id: string) => {
                                    collectibles.set(id, item);
                                });
                            }
                        }

                        this.globalData.levels.set(levelId, {
                            levelId: levelData.levelId,
                            levelName: levelData.levelName,
                            totalCollectibles: levelData.totalCollectibles,
                            collectedCount: levelData.collectedCount,
                            collectibles: collectibles
                        });
                    });

                    this.dataLoaded = true;
                    console.log('[CollectibleManager] 从本地存储加载成功');
                } else {
                    console.warn('[CollectibleManager] 数据版本不匹配，使用默认数据');
                }
            }
        } catch (error) {
            console.error('[CollectibleManager] 从本地存储加载失败:', error);
        }
    }

    public resetAllData(): void {
        try {
            localStorage.removeItem(CollectibleManager.STORAGE_KEY);
            this.initializeGlobalData();
            this.dataLoaded = false;
            console.log('[CollectibleManager] 所有收集数据已重置');
        } catch (error) {
            console.error('[CollectibleManager] 重置数据失败:', error);
        }
    }

    public resetLevelData(levelId: string): void {
        if (!this.globalData || !this.globalData.levels.has(levelId)) {
            return;
        }

        const levelData = this.globalData.levels.get(levelId);
        if (levelData) {
            levelData.collectedCount = 0;
            levelData.collectibles.forEach(item => {
                item.isCollected = false;
            });
            this.updateTotals();
            this.globalData.lastUpdated = Date.now();
            this.saveToStorage();
            console.log(`[CollectibleManager] 关卡 ${levelId} 数据已重置`);
        }
    }

    public exportForCloudSync(playerId: string): CloudSyncData | null {
        if (!this.globalData) {
            return null;
        }

        const checksum = this.generateChecksum(this.globalData);

        const cloudData: CloudSyncData = {
            playerId: playerId,
            globalData: this.globalData,
            checksum: checksum,
            lastSyncTime: Date.now()
        };

        return cloudData;
    }

    public importFromCloudSync(cloudData: CloudSyncData): boolean {
        if (!cloudData || !cloudData.globalData) {
            console.error('[CollectibleManager] 云端数据无效');
            return false;
        }

        const checksum = this.generateChecksum(cloudData.globalData);
        if (checksum !== cloudData.checksum) {
            console.error('[CollectibleManager] 云端数据校验失败');
            return false;
        }

        this.globalData = cloudData.globalData;
        this.globalData.lastUpdated = Date.now();
        this.saveToStorage();

        console.log('[CollectibleManager] 从云端同步成功');
        return true;
    }

    private generateChecksum(data: GlobalCollectibleData): string {
        const json = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < json.length; i++) {
            const char = json.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    public getGlobalData(): GlobalCollectibleData | null {
        return this.globalData;
    }

    public getLevelData(levelId: string): LevelCollectibleData | null {
        return this.globalData?.levels.get(levelId) || null;
    }

    public debugPrintAllData(): void {
        if (!this.globalData) {
            console.log('[CollectibleManager] 无数据');
            return;
        }

        console.log('[CollectibleManager] === 全局收集数据 ===');
        console.log(`版本: ${this.globalData.version}`);
        console.log(`最后更新: ${new Date(this.globalData.lastUpdated).toLocaleString()}`);
        console.log(`总关卡数: ${this.globalData.totals.totalLevels}`);
        console.log(`总收集物: ${this.globalData.totals.totalCollectibles}`);
        console.log(`已收集: ${this.globalData.totals.totalCollected}`);
        console.log(`收集率: ${this.getTotalCollectionRate().toFixed(2)}%`);

        this.globalData.levels.forEach((levelData, levelId) => {
            console.log(`\n--- 关卡 ${levelId} (${levelData.levelName}) ---`);
            console.log(`收集物总数: ${levelData.totalCollectibles}`);
            console.log(`已收集: ${levelData.collectedCount}`);
            console.log(`收集率: ${this.getLevelCollectionRate(levelId).toFixed(2)}%`);

            levelData.collectibles.forEach((item, itemId) => {
                console.log(`  [${item.isCollected ? '✓' : ' '}] ${itemId} (${item.type})`);
            });
        });

        console.log('[CollectibleManager] =====================');
    }
}
