import { _decorator, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

export enum CollectibleType {
    COIN = 'coin',
    GEM = 'gem',
    STAR = 'star',
    HEART = 'heart',
    KEY = 'key',
    FRAGMENT = 'fragment',
    RELIC = 'relic',
    CUSTOM = 'custom'
}

export interface CollectibleConfig {
    id: string;
    type: CollectibleType;
    name: string;
    description: string;
    icon?: SpriteFrame;
    rarity?: 'common' | 'uncommon' | 'rare' | 'legendary';
    value?: number;
}

export interface CollectibleSaveData {
    collectibleId: string;
    type: CollectibleType;
    levelId: string;
    instanceId: string;
    isCollected: boolean;
    timestamp?: number;
}
