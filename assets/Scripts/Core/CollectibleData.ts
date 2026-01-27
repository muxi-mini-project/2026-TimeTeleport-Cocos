import { CollectibleType } from './CollectibleType';

export interface CollectibleInfo {
    collectibleId: string; // L1_C001
    type: CollectibleType;
}

export interface LevelCollectibleData {
    levelId: string;
    levelName: string;
    totalCollectibles: number;
    collectedCount: number;
    collectedIds: string[];
    collectibleTypes: { [collectibleId: string]: CollectibleType };
}

export interface GlobalCollectibleData {
    version: string;
    lastUpdated: number;
    levels: { [levelId: string]: LevelCollectibleData };
    totals: {
        totalLevels: number;
        totalCollectibles: number;
        totalCollected: number;
    };
}

export interface CloudSyncData {
    playerId: string;
    globalData: GlobalCollectibleData;
    checksum: string;
    lastSyncTime: number;
}
