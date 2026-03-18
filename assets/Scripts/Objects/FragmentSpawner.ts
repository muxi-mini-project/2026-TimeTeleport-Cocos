import { Prefab, instantiate, Node, TiledMap, Vec3, Sprite, Collider2D } from 'cc';
import { LevelMapManager, TimeState } from '../GamePlay/LevelMapManager';
import { CollectibleType } from '../Core/CollectibleType';
import { CollectibleItem } from './CollectibleItem';

export interface FragmentSpawnerConfig {
    mapManager: LevelMapManager;
    timeFragmentPrefab: Prefab | null;
    futureChipPrefab: Prefab | null;
    ancientFossilPrefab: Prefab | null;
    spawnOffsetY?: number;
    spawnMargin?: number;
}

interface SpawnedFragment {
    node: Node;
    activeState: TimeState | null;
    type: CollectibleType;
}

export class FragmentSpawner {
    private mapManager: LevelMapManager;
    private tiledMap: TiledMap | null = null;
    private items: SpawnedFragment[] = [];
    private spawnOffsetY: number = 16;
    private spawnMargin: number = 16;

    constructor(config: FragmentSpawnerConfig) {
        this.mapManager = config.mapManager;
        this.tiledMap = this.mapManager?.tiledMap || null;
        this.spawnOffsetY = config.spawnOffsetY ?? 16;
        this.spawnMargin = config.spawnMargin ?? 16;

        if (!this.tiledMap) {
            console.warn('[FragmentSpawner] TiledMap not found, abort spawn.');
            return;
        }

        if (!config.timeFragmentPrefab || !config.futureChipPrefab || !config.ancientFossilPrefab) {
            console.warn('[FragmentSpawner] Fragment prefabs missing, abort spawn.');
            return;
        }

        this.spawnAll(config.timeFragmentPrefab, config.futureChipPrefab, config.ancientFossilPrefab);

        this.mapManager.registerTimeListener(this.onTimeChanged);
        this.onTimeChanged(this.mapManager.getCurrentState());
    }

    public dispose(): void {
        if (this.mapManager) {
            this.mapManager.unregisterTimeListener(this.onTimeChanged);
        }
    }

    private spawnAll(timeFragmentPrefab: Prefab, futureChipPrefab: Prefab, ancientFossilPrefab: Prefab): void {
        const fragmentState = Math.random() < 0.5 ? TimeState.Past : TimeState.Future;
        const fragmentGroup = fragmentState === TimeState.Past ? 'Past_Col' : 'Future_Col';
        this.spawnItem(timeFragmentPrefab, CollectibleType.FRAGMENT, fragmentState, fragmentGroup);

        this.spawnItem(futureChipPrefab, CollectibleType.CHIP, TimeState.Future, 'Future_Col');
        this.spawnItem(ancientFossilPrefab, CollectibleType.FOSSIL, TimeState.Past, 'Past_Col');
    }

    private spawnItem(prefab: Prefab, type: CollectibleType, activeState: TimeState, groupName: string): void {
        if (!this.tiledMap) return;
        const pos = this.getRandomSurfacePosition(groupName);
        if (!pos) {
            console.warn(`[FragmentSpawner] No valid spawn position for ${type} in ${groupName}`);
            return;
        }

        const node = instantiate(prefab);
        node.name = `${type}_${TimeState[activeState]}`;

        const collectible = node.getComponent(CollectibleItem);
        if (collectible) {
            collectible.collectibleType = type;
            collectible.collectibleId = `${this.mapManager.node.name}_${type}`;
            collectible.destroyOnCollect = true;
            collectible.useManager = false;
        }

        this.tiledMap.node.addChild(node);
        node.setPosition(pos);

        this.items.push({ node, activeState, type });
    }

    private onTimeChanged = (state: TimeState) => {
        for (const item of this.items) {
            if (!item.node || !item.node.isValid) continue;
            const shouldShow = item.activeState == null || item.activeState === state;
            this.setItemVisible(item.node, shouldShow);
        }
    };

    private setItemVisible(node: Node, visible: boolean): void {
        const collectible = node.getComponent(CollectibleItem);
        if (collectible?.isCollected) {
            visible = false;
        }

        const sprite = node.getComponent(Sprite);
        if (sprite) sprite.enabled = visible;

        const collider = node.getComponent(Collider2D);
        if (collider) collider.enabled = visible;
    }

    private getRandomSurfacePosition(groupName: string): Vec3 | null {
        if (!this.tiledMap) return null;

        const group = this.tiledMap.getObjectGroup(groupName);
        if (!group) {
            console.warn(`[FragmentSpawner] Object group not found: ${groupName}`);
            return null;
        }

        const objects = group.getObjects().filter((o) => {
            return typeof o.width === 'number' && o.width > 0 && typeof o.height === 'number' && o.height > 0
                && typeof o.x === 'number' && typeof o.y === 'number';
        });
        if (objects.length === 0) return null;

        const mapSize = this.tiledMap.getMapSize();
        const tileSize = this.tiledMap.getTileSize();
        if (!mapSize || !tileSize) return null;

        const totalW = mapSize.width * tileSize.width;
        const totalH = mapSize.height * tileSize.height;
        const halfW = totalW / 2;
        const halfH = totalH / 2;

        const totalWidth = objects.reduce((sum, o) => sum + (o.width || 0), 0);
        let pick = Math.random() * totalWidth;
        let chosen = objects[0];
        for (const obj of objects) {
            pick -= obj.width || 0;
            if (pick <= 0) {
                chosen = obj;
                break;
            }
        }

        const w = chosen.width || 0;
        const tiledX = chosen.x || 0;
        const tiledY = chosen.y || 0;

        const leftX = -halfW + tiledX;
        const topY = -halfH + tiledY;

        const innerW = Math.max(0, w - this.spawnMargin * 2);
        const x = leftX + (innerW > 0 ? this.spawnMargin + Math.random() * innerW : w * 0.5);
        const y = topY + this.spawnOffsetY;

        return new Vec3(x, y, 0);
    }
}
