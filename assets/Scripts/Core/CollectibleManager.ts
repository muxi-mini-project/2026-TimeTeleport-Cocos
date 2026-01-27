import { _decorator } from 'cc';
import { CollectibleInfo, LevelCollectibleData, GlobalCollectibleData, CloudSyncData } from './CollectibleData';
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
            levels: {},
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

        if (!this.globalData.levels[levelId]) {
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
            collectedIds: [],
            collectibleTypes: {}
        };
        this.globalData.levels[levelId] = levelData;
        this.globalData.totals.totalLevels = Object.keys(this.globalData.levels).length;
        this.saveToStorage();
    }

    private ensureLevelExists(levelId: string): void {
        if (!this.globalData.levels[levelId]) {
            this.createLevelData(levelId, levelId);
        }
    }

    public collectItem(itemData: CollectibleInfo): void {
        if (!this.globalData) {
            console.error('[CollectibleManager] 全局数据未初始化');
            return;
        }

        const levelId = this.currentLevelId;
        this.ensureLevelExists(levelId);

        const levelData = this.globalData.levels[levelId];
        if (!levelData) {
            console.error(`[CollectibleManager] 关卡 ${levelId} 数据不存在`);
            return;
        }

        if (levelData.collectedIds.indexOf(itemData.collectibleId) !== -1) {
            console.warn(`[CollectibleManager] 收集物 ${itemData.collectibleId} 已被收集`);
            return;
        }

        levelData.collectedIds.push(itemData.collectibleId);
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

        const levelData = this.globalData.levels[this.currentLevelId];
        if (!levelData) {
            return false;
        }

        return levelData.collectedIds.indexOf(collectibleId) !== -1;
    }

    public isCollectedInLevel(levelId: string, collectibleId: string): boolean {
        if (!this.globalData) {
            return false;
        }

        const levelData = this.globalData.levels[levelId];
        if (!levelData) {
            return false;
        }

        return levelData.collectedIds.indexOf(collectibleId) !== -1;
    }

    public registerCollectible(levelId: string, collectibleId: string, type: CollectibleType): void {
        this.ensureLevelExists(levelId);

        const levelData = this.globalData.levels[levelId];
        if (!levelData) {
            return;
        }

        if (levelData.collectedIds.indexOf(collectibleId) === -1 && levelData.totalCollectibles < levelData.totalCollectibles + 1) {
            levelData.totalCollectibles++;
            levelData.collectibleTypes[collectibleId] = type;

            this.globalData.totals.totalCollectibles++;
            this.saveToStorage();

            console.log(`[CollectibleManager] 注册收集物: ${collectibleId} in ${levelId}, 类型: ${type}`);
        }
    }

    public getLevelCollectibleCount(levelId: string): number {
        const levelData = this.globalData?.levels[levelId];
        return levelData ? levelData.totalCollectibles : 0;
    }

    public getLevelCollectedCount(levelId: string): number {
        const levelData = this.globalData?.levels[levelId];
        return levelData ? levelData.collectedCount : 0;
    }

    public getLevelCollectionRate(levelId: string): number {
        const levelData = this.globalData?.levels[levelId];
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
        const levelData = this.globalData?.levels[levelId];
        if (!levelData) {
            return 0;
        }

        let count = 0;
        for (const collectibleId of levelData.collectedIds) {
            if (levelData.collectibleTypes[collectibleId] === type) {
                count++;
            }
        }
        return count;
    }

    private updateTotals(): void {
        if (!this.globalData) return;

        let totalCollectibles = 0;
        let totalCollected = 0;

        for (const levelId in this.globalData.levels) {
            const levelData = this.globalData.levels[levelId];
            totalCollectibles += levelData.totalCollectibles;
            totalCollected += levelData.collectedCount;
        }

        this.globalData.totals.totalCollectibles = totalCollectibles;
        this.globalData.totals.totalCollected = totalCollected;
        this.globalData.totals.totalLevels = Object.keys(this.globalData.levels).length;
    }

    private saveToStorage(): void {
        try {
            const json = JSON.stringify(this.globalData);
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
                const saveData: GlobalCollectibleData = JSON.parse(json);
                if (saveData.version === CollectibleManager.DATA_VERSION) {
                    this.globalData = saveData;
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
        if (!this.globalData || !this.globalData.levels[levelId]) {
            return;
        }

        const levelData = this.globalData.levels[levelId];
        if (levelData) {
            levelData.collectedCount = 0;
            levelData.collectedIds = [];
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
        return this.globalData?.levels[levelId] || null;
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

        for (const levelId in this.globalData.levels) {
            const levelData = this.globalData.levels[levelId];
            console.log(`\n--- 关卡 ${levelId} (${levelData.levelName}) ---`);
            console.log(`收集物总数: ${levelData.totalCollectibles}`);
            console.log(`已收集: ${levelData.collectedCount}`);
            console.log(`收集率: ${this.getLevelCollectionRate(levelId).toFixed(2)}%`);

            levelData.collectedIds.forEach((itemId) => {
                console.log(`  [✓] ${itemId}`);
            });
        }

        console.log('[CollectibleManager] =====================');
    }
}
