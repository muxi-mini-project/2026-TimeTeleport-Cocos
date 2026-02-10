import { _decorator, Component, Node, ProgressBar, Label, find, director, SpriteFrame } from 'cc';
import { PlayerController } from '../GamePlay/PlayerController';
import { ItemSlot } from './ItemSlot';
import { ItemType } from '../Core/ItemType';
const { ccclass, property } = _decorator;

@ccclass('InGameHUD')
export class InGameHUD extends Component {
    private static readonly EVENT_ITEM_COUNT_CHANGED = 'ITEM_COUNT_CHANGED';

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

    private _player: PlayerController | null = null;
    private _shieldDuration: number = 0;
    private _shieldRemaining: number = 0;
    private _shieldActive: boolean = false;

    onLoad() {
        this.bindPlayer();
        this.resetProgressUI();
        director.on(InGameHUD.EVENT_ITEM_COUNT_CHANGED, this.onExternalItemCountChanged, this);
    }

    onDestroy() {
        this.unbindPlayer();
        director.off(InGameHUD.EVENT_ITEM_COUNT_CHANGED, this.onExternalItemCountChanged, this);
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
        if (!this.playerNode) return;
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
}
