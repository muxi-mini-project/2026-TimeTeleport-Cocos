import { _decorator, Component, Node, ProgressBar, Label, find, director } from 'cc';
import { PlayerController } from '../GamePlay/PlayerController';
import { ItemSlot } from './ItemSlot';
const { ccclass, property } = _decorator;

@ccclass('InGameHUD')
export class InGameHUD extends Component {
    private static readonly EVENT_ITEM_COUNT_CHANGED = 'ITEM_COUNT_CHANGED';

    @property({ type: Node, tooltip: 'Player node (with PlayerController)' })
    playerNode: Node = null;

    @property({ type: [ItemSlot], tooltip: 'Item slots inside the item bar' })
    itemSlots: ItemSlot[] = [];

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
    private _slotMap: Map<string, ItemSlot> = new Map();
    private _shieldDuration: number = 0;
    private _shieldRemaining: number = 0;
    private _shieldActive: boolean = false;

    onLoad() {
        this.buildSlotMap();
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
        const slot = this._slotMap.get(itemId);
        if (!slot) {
            console.warn(`[InGameHUD] Item slot not found: ${itemId}`);
            return;
        }
        slot.setCount(count);
    }

    public static emitItemCount(itemId: string, count: number): void {
        director.emit(InGameHUD.EVENT_ITEM_COUNT_CHANGED, { itemId, count });
    }

    private buildSlotMap(): void {
        this._slotMap.clear();
        for (const slot of this.itemSlots) {
            if (!slot) continue;
            const key = (slot.itemId || '').trim();
            if (!key) continue;
            if (this._slotMap.has(key)) {
                console.warn(`[InGameHUD] Duplicate itemId: ${key}`);
            }
            this._slotMap.set(key, slot);
        }
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

        this.playerNode.on('shield-collected', this.onShieldCollected, this);
        this.playerNode.on('shield-used', this.onShieldUsed, this);
        this.playerNode.on('shield-activated', this.onShieldActivated, this);
        this.playerNode.on('shield-deactivated', this.onShieldDeactivated, this);
        this.playerNode.on('shield-use-failed', this.onShieldUseFailed, this);

        // Initialize inventory count
        this.setItemCount(this.shieldItemId, this._player.getShieldInventoryCount());
    }

    private unbindPlayer(): void {
        if (!this.playerNode) return;
        this.playerNode.off('shield-collected', this.onShieldCollected, this);
        this.playerNode.off('shield-used', this.onShieldUsed, this);
        this.playerNode.off('shield-activated', this.onShieldActivated, this);
        this.playerNode.off('shield-deactivated', this.onShieldDeactivated, this);
        this.playerNode.off('shield-use-failed', this.onShieldUseFailed, this);
    }

    private onShieldCollected(event?: { inventoryCount?: number }): void {
        const count = event?.inventoryCount ?? 0;
        this.setItemCount(this.shieldItemId, count);
    }

    private onShieldUsed(event?: { inventoryCount?: number }): void {
        const count = event?.inventoryCount ?? 0;
        this.setItemCount(this.shieldItemId, count);
    }

    private onShieldActivated(event?: { duration?: number }): void {
        const duration = Math.max(0.01, event?.duration ?? 0);
        this.startShieldProgress(duration);
    }

    private onShieldDeactivated(): void {
        this.stopShieldProgress();
    }

    private onShieldUseFailed(): void {
        // Optional: add UI feedback here (e.g., flash item slot)
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
