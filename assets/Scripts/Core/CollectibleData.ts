import { _decorator, Vec3 } from 'cc';
import { CollectibleType, CollectibleConfig } from './CollectibleType';
const { ccclass, property } = _decorator;

export interface CollectibleInstanceData {
    collectibleId: string;
    type: CollectibleType;
    levelId: string;
    instanceId: string;
    position: Vec3;
    isCollected: boolean;
    timestamp?: number;
}

export interface LevelCollectibleData {
    levelId: string;
    levelName: string;
    totalCollectibles: number;
    collectedCount: number;
    collectibles: Map<string, CollectibleInstanceData>;
}

export interface GlobalCollectibleData {
    version: string;
    lastUpdated: number;
    levels: Map<string, LevelCollectibleData>;
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
