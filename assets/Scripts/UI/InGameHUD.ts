import { _decorator, Component, Node, ProgressBar, Label, find, director, SpriteFrame, Sprite, UITransform, Layout, Size, Camera } from 'cc';
import { PlayerController } from '../GamePlay/PlayerController';
import { ItemSlot } from './ItemSlot';
import { ItemType } from '../Core/ItemType';
import { CollectibleType } from '../Core/CollectibleType';
import { HudSticky } from './HUDSticky';
const { ccclass, property } = _decorator;

@ccclass('InGameHUD')
export class InGameHUD extends Component {
    private static readonly EVENT_ITEM_COUNT_CHANGED = 'ITEM_COUNT_CHANGED';
    private static readonly EVENT_COLLECTIBLE_COLLECTED = 'collectible-collected';

    @property({ type: Node, tooltip: 'Player node (with PlayerController)' })
    playerNode: Node = null;

    @property({ type: ItemSlot, tooltip: 'Single item slot' })
    itemSlot: ItemSlot = null;

    @property({ type: ProgressBar, tooltip: 'Shield use progress bar' })
    shieldProgressBar: ProgressBar = null;

    @property({ type: Node, tooltip: 'Optional root node of progress bar (for hide/show)' })
    shieldProgressRoot: Node = null;

    @property({ type: Label, tooltip: 'Optional label for remaining time' })
    shieldTimeLabel: Label = null;

    @property({ tooltip: 'Item id for shield slot' })
    shieldItemId: string = 'shield';

    @property({ tooltip: 'Hide progress bar when not active' })
    hideProgressWhenInactive: boolean = false;

    @property({ type: Node, tooltip: 'Achievement bar root (optional)' })
    achievementRoot: Node = null;

    @property({ type: Sprite, tooltip: 'Time fragment slot sprite' })
    fragmentSlot: Sprite = null;

    @property({ type: Sprite, tooltip: 'Future chip slot sprite' })
    chipSlot: Sprite = null;

    @property({ type: Sprite, tooltip: 'Ancient fossil slot sprite' })
    fossilSlot: Sprite = null;

    @property({ type: Node, tooltip: 'Optional node to show when all achievements collected' })
    achievementCompleteNode: Node = null;

    @property({ tooltip: 'Achievement bar right margin (px)' })
    achievementMarginX: number = 100;

    @property({ tooltip: 'Achievement bar top margin (px)' })
    achievementMarginY: number = 60;

    private _player: PlayerController | null = null;
    private _shieldDuration: number = 0;
    private _shieldRemaining: number = 0;
    private _shieldActive: boolean = false;
    private _achievementCollected: Set<CollectibleType> = new Set();

    onLoad() {
        this.bindPlayer();
        this.resetProgressUI();
        this.ensureAchievementBar();
        this.resetAchievementUI();
        director.on(InGameHUD.EVENT_ITEM_COUNT_CHANGED, this.onExternalItemCountChanged, this);
        director.on(InGameHUD.EVENT_COLLECTIBLE_COLLECTED, this.onCollectibleCollected, this);
    }

    onDestroy() {
        this.unbindPlayer();
        director.off(InGameHUD.EVENT_ITEM_COUNT_CHANGED, this.onExternalItemCountChanged, this);
        director.off(InGameHUD.EVENT_COLLECTIBLE_COLLECTED, this.onCollectibleCollected, this);
    }

    update(dt: number) {
        if (!this._shieldActive) return;

        this._shieldRemaining -= dt;
        if (this._shieldRemaining < 0) this._shieldRemaining = 0;

        const progress = this._shieldDuration > 0 ? (this._shieldRemaining / this._shieldDuration) : 0;
        if (this.shieldProgressBar) {
            this.shieldProgressBar.progress = progress;
        }

        if (this.shieldTimeLabel) {
            this.shieldTimeLabel.string = this._shieldRemaining.toFixed(1);
        }

        if (this._shieldRemaining <= 0) {
            this.stopShieldProgress();
        }
    }

    public setItemCount(itemId: string, count: number): void {
        if (!this.itemSlot) {
            console.warn('[InGameHUD] Item slot not found');
            return;
        }
        this.itemSlot.itemId = itemId;
        this.itemSlot.setCount(count);
    }

    public setItemIcon(iconSprite: SpriteFrame): void {
        if (!this.itemSlot) {
            console.warn('[InGameHUD] Item slot not found');
            return;
        }
        this.itemSlot.setIcon(iconSprite);
    }

    public setItemType(itemType: string): void {
        if (!this.itemSlot) {
            console.warn('[InGameHUD] Item slot not found');
            return;
        }
        this.itemSlot.itemType = itemType;
    }

    public clearItemSlot(): void {
        if (!this.itemSlot) return;
        this.itemSlot.itemId = '';
        this.itemSlot.setCount(0);
        this.itemSlot.setIcon(null);
    }

    public static emitItemCount(itemId: string, count: number): void {
        director.emit(InGameHUD.EVENT_ITEM_COUNT_CHANGED, { itemId, count });
    }

    private bindPlayer(): void {
        if (!this.playerNode) {
            this.playerNode = find('GameWorld/Player') || find('Player') || find('Canvas/GameWorld/Player');
        }

        if (!this.playerNode) {
            console.warn('[InGameHUD] Player node not found. Please assign it in Inspector.');
            return;
        }

        this._player = this.playerNode.getComponent(PlayerController);
        if (!this._player) {
            console.warn('[InGameHUD] PlayerController not found on player node.');
            return;
        }

        this.playerNode.on('item-picked-up', this.onItemPickedUp, this);
        this.playerNode.on('item-used', this.onItemUsed, this);
        this.playerNode.on('item-removed', this.onItemRemoved, this);
        this.playerNode.on('item-use-failed', this.onItemUseFailed, this);
        this.playerNode.on('shield-activated', this.onShieldActivated, this);
        this.playerNode.on('shield-deactivated', this.onShieldDeactivated, this);
    }

    private unbindPlayer(): void {
        if (!this.playerNode || !this.playerNode.isValid) return;
        this.playerNode.off('item-picked-up', this.onItemPickedUp, this);
        this.playerNode.off('item-used', this.onItemUsed, this);
        this.playerNode.off('item-removed', this.onItemRemoved, this);
        this.playerNode.off('item-use-failed', this.onItemUseFailed, this);
        this.playerNode.off('shield-activated', this.onShieldActivated, this);
        this.playerNode.off('shield-deactivated', this.onShieldDeactivated, this);
    }

    private onItemPickedUp(event?: { itemType: ItemType, itemData?: any }): void {
        if (!event) return;

        const count = event.itemType === ItemType.SHIELD ? 1 : Infinity;
        this.setItemCount(event.itemType, count);
        this.setItemType(event.itemType);

        console.log(`[InGameHUD] Item picked up: ${event.itemType}`);
    }

    private onItemUsed(event?: { itemType: ItemType }): void {
        if (!event) return;

        if (event.itemType === ItemType.SHIELD) {
            this.setItemCount(event.itemType, 0);
        }

        console.log(`[InGameHUD] Item used: ${event.itemType}`);
    }

    private onItemRemoved(): void {
        this.clearItemSlot();
        console.log('[InGameHUD] Item removed');
    }

    private onItemUseFailed(): void {
        console.log('[InGameHUD] Item use failed');
    }

    private onShieldActivated(event?: { duration?: number }): void {
        const duration = Math.max(0.01, event?.duration ?? 0);
        this.startShieldProgress(duration);
    }

    private onShieldDeactivated(): void {
        this.stopShieldProgress();
    }

    private onExternalItemCountChanged(event?: { itemId?: string; count?: number }): void {
        if (!event?.itemId) return;
        this.setItemCount(event.itemId, event.count ?? 0);
    }

    private startShieldProgress(duration: number): void {
        this._shieldActive = true;
        this._shieldDuration = duration;
        this._shieldRemaining = duration;

        if (this.shieldProgressBar) {
            this.shieldProgressBar.progress = 1;
        }

        if (this.shieldTimeLabel) {
            this.shieldTimeLabel.string = duration.toFixed(1);
        }

        if (this.shieldProgressRoot && this.hideProgressWhenInactive) {
            this.shieldProgressRoot.active = true;
        }
    }

    private stopShieldProgress(): void {
        this._shieldActive = false;
        this._shieldDuration = 0;
        this._shieldRemaining = 0;

        if (this.shieldProgressBar) {
            this.shieldProgressBar.progress = 0;
        }

        if (this.shieldTimeLabel) {
            this.shieldTimeLabel.string = '0.0';
        }

        if (this.shieldProgressRoot && this.hideProgressWhenInactive) {
            this.shieldProgressRoot.active = false;
        }
    }

    private resetProgressUI(): void {
        if (this.shieldProgressBar) {
            this.shieldProgressBar.progress = 0;
        }
        if (this.shieldTimeLabel) {
            this.shieldTimeLabel.string = '0.0';
        }
        if (this.shieldProgressRoot && this.hideProgressWhenInactive) {
            this.shieldProgressRoot.active = false;
        }
    }

    private ensureAchievementBar(): void {
        if (this.achievementRoot && this.fragmentSlot && this.chipSlot && this.fossilSlot) {
            return;
        }

        const root = this.achievementRoot || new Node('AchievementBar');
        if (!this.achievementRoot) {
            root.layer = this.node.layer;
            const ui = root.addComponent(UITransform);
            ui.setContentSize(160, 40);

            const layout = root.addComponent(Layout);
            layout.type = Layout.Type.HORIZONTAL;
            layout.resizeMode = Layout.ResizeMode.NONE;
            layout.cellSize = new Size(36, 36);
            layout.spacingX = 8;
            layout.spacingY = 0;
            (layout as any).affectedByScale = false;
            (layout as any).isAlign = true;

            this.node.addChild(root);
        }

        const sticky = root.getComponent(HudSticky) || root.addComponent(HudSticky);
        sticky.camera = this.getHudCamera();
        sticky.marginLeftPx = this.achievementMarginX;
        sticky.marginTopPx = this.achievementMarginY;
        sticky.alignRight = true;

        this.achievementRoot = root;

        const defaultIcon: SpriteFrame | null = null;
        if (!this.fragmentSlot) this.fragmentSlot = this.createAchievementSlot(root, 'FragmentSlot', defaultIcon);
        if (!this.chipSlot) this.chipSlot = this.createAchievementSlot(root, 'ChipSlot', defaultIcon);
        if (!this.fossilSlot) this.fossilSlot = this.createAchievementSlot(root, 'FossilSlot', defaultIcon);
    }

    private getHudCamera(): Camera | null {
        const sticky = this.getComponent(HudSticky);
        if (sticky?.camera) {
            return sticky.camera;
        }
        return this.node.scene?.getComponentInChildren(Camera) || null;
    }

    private createAchievementSlot(parent: Node, name: string, icon: SpriteFrame | null): Sprite {
        const node = new Node(name);
        node.layer = parent.layer;
        const ui = node.addComponent(UITransform);
        ui.setContentSize(32, 32);
        const sprite = node.addComponent(Sprite);
        if (icon) {
            sprite.spriteFrame = icon;
        }
        parent.addChild(node);
        return sprite;
    }

    private resetAchievementUI(): void {
        this._achievementCollected.clear();
        this.setSlotActive(this.fragmentSlot, false);
        this.setSlotActive(this.chipSlot, false);
        this.setSlotActive(this.fossilSlot, false);
        if (this.achievementCompleteNode) {
            this.achievementCompleteNode.active = false;
        }
    }

    private setSlotActive(slot: Sprite, active: boolean): void {
        if (!slot) return;
        slot.node.active = active;
    }

    private onCollectibleCollected(event?: { type?: CollectibleType; icon?: SpriteFrame | null }): void {
        const type = event?.type;
        if (!type) return;

        if (type !== CollectibleType.FRAGMENT && type !== CollectibleType.CHIP && type !== CollectibleType.FOSSIL) {
            return;
        }

        if (this._achievementCollected.has(type)) return;
        this._achievementCollected.add(type);

        const icon = event?.icon ?? null;
        switch (type) {
            case CollectibleType.FRAGMENT:
                if (icon && this.fragmentSlot && !this.fragmentSlot.spriteFrame) {
                    this.fragmentSlot.spriteFrame = icon;
                }
                this.setSlotActive(this.fragmentSlot, true);
                break;
            case CollectibleType.CHIP:
                if (icon && this.chipSlot && !this.chipSlot.spriteFrame) {
                    this.chipSlot.spriteFrame = icon;
                }
                this.setSlotActive(this.chipSlot, true);
                break;
            case CollectibleType.FOSSIL:
                if (icon && this.fossilSlot && !this.fossilSlot.spriteFrame) {
                    this.fossilSlot.spriteFrame = icon;
                }
                this.setSlotActive(this.fossilSlot, true);
                break;
        }

        if (this._achievementCollected.size >= 3) {
            this.onAchievementCompleted();
        }
    }

    private onAchievementCompleted(): void {
        if (this.achievementCompleteNode) {
            this.achievementCompleteNode.active = true;
        }
        this.node.emit('achievement-complete');
        console.log('[InGameHUD] Achievement complete');
    }
}
