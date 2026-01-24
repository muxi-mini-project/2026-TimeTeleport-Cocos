import { _decorator, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

export enum CollectibleType {
    FRAGMENT = 'time_fragment',
    CHIP = 'future_chip',
    FOSSIL = 'ancient_fossil',
    LETTER = 'ccnu_letter'
}

export interface CollectibleConfig {
    id: string;
    type: CollectibleType;
    name: string;
    description: string;
    icon?: SpriteFrame;
}

export interface CollectibleSaveData {
    collectibleId: string;
    type: CollectibleType;
    levelId: string;
    instanceId: string;
    isCollected: boolean;
    timestamp?: number;
}

export const COLLECTIBLE_ICON_PATHS: Record<CollectibleType, string> = {
    [CollectibleType.FRAGMENT]: 'textures/collectibles/time_fragment',
    [CollectibleType.CHIP]: 'textures/collectibles/future_chip',
    [CollectibleType.FOSSIL]: 'textures/collectibles/ancient_fossil',
    [CollectibleType.LETTER]: 'textures/collectibles/ccnu_letter'
};
