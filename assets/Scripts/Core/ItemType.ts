export enum ItemType {
    SHIELD = 'shield',
    GRAPPLE = 'grapple',
    DRONE = 'drone',
    DEFENSE_CLOTH = 'defense_cloth'
}

export interface ItemData {
    type: ItemType;
    displayName: string;
    description: string;
    iconPath?: string;
}
