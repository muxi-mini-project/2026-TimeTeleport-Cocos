import { _decorator, Component, Label, Sprite, SpriteFrame } from 'cc';
import { ItemType } from '../Core/ItemType';
const { ccclass, property } = _decorator;

@ccclass('ItemSlot')
export class ItemSlot extends Component {
    @property({ tooltip: 'Unique item id (e.g. "shield", "grapple")' })
    itemId: string = '';

    @property({ type: Sprite, tooltip: 'Icon Sprite component' })
    iconSprite: Sprite = null;

    @property({ type: Label, tooltip: 'Count Label component' })
    countLabel: Label = null;

    @property({ tooltip: 'Hide this slot when count is 0' })
    hideWhenZero: boolean = true;

    @property({ tooltip: 'Item type identifier' })
    itemType: string = '';

    @property({ tooltip: 'Hide this slot when empty' })
    hideWhenEmpty: boolean = true;

    private _count: number = 0;
    private _isEmpty: boolean = true;

    public setIcon(spriteFrame: SpriteFrame | null): void {
        if (this.iconSprite && spriteFrame) {
            this.iconSprite.spriteFrame = spriteFrame;
        }
    }

    public setCount(count: number): void {
        this._count = Math.max(0, Math.floor(count));
        this._isEmpty = this._count <= 0;

        if (this.countLabel) {
            if (this._isEmpty) {
                this.countLabel.string = '';
            } else {
                this.countLabel.string = this._count >= 100 ? '99+' : `x${this._count}`;
            }
        }

        if (this.hideWhenZero || this.hideWhenEmpty) {
            this.node.active = this._count > 0;
        }
    }

    public getCount(): number {
        return this._count;
    }
}
