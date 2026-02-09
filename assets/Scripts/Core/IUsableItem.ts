export interface IUsableItem {
    getItemType(): string;
    tryUse(): boolean;
    canUse(): boolean;
    getRemainingCount(): number;
}
