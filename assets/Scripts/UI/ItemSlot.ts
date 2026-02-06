import { _decorator, Component, Label, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ItemSlot')
export class ItemSlot extends Component {
    @property({ tooltip: 'Unique item id (e.g. "shield")' })
    itemId: string = 'shield';

    @property({ type: Sprite, tooltip: 'Icon Sprite component' })
    iconSprite: Sprite = null;

    @property({ type: Label, tooltip: 'Count Label component' })
    countLabel: Label = null;

    @property({ tooltip: 'Hide this slot when count is 0' })
    hideWhenZero: boolean = false;

    private _count: number = 0;

    public setIcon(spriteFrame: SpriteFrame | null): void {
        if (this.iconSprite && spriteFrame) {
            this.iconSprite.spriteFrame = spriteFrame;
        }
    }

    public setCount(count: number): void {
        this._count = Math.max(0, Math.floor(count));

        if (this.countLabel) {
            this.countLabel.string = `x${this._count}`;
        }

        if (this.hideWhenZero) {
            this.node.active = this._count > 0;
        }
    }

    public getCount(): number {
        return this._count;
    }
}
