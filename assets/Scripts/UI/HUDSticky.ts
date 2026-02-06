import { _decorator, Camera, Component, UITransform, Vec3, view } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('HudSticky')
export class HudSticky extends Component {
  @property({ type: Camera })
  camera: Camera | null = null;

  @property
  marginLeftPx = 20;

  @property
  marginTopPx = 20;

  private _pos = new Vec3();

  lateUpdate() {
    if (!this.camera) return;

    const vs = view.getVisibleSize();
    const halfH = this.camera.orthoHeight;
    const halfW = halfH * (vs.width / vs.height);

    // 把“像素边距”换算成“世界单位边距”
    const worldPerPx = (halfH * 2) / vs.height;
    const marginX = this.marginLeftPx * worldPerPx;
    const marginY = this.marginTopPx * worldPerPx;

    // 兼容 HUD 根节点任意 anchor/size：把“左上角”换算到节点锚点位置
    const ui = this.getComponent(UITransform);
    let anchorOffsetX = 0;
    let anchorOffsetY = 0;
    if (ui) {
      const a = ui.anchorPoint;
      const s = ui.contentSize;
      anchorOffsetX = a.x * s.width;
      anchorOffsetY = (1 - a.y) * s.height;
    }

    const camPos = this.camera.node.worldPosition;
    this._pos.set(
      camPos.x - halfW + marginX + anchorOffsetX,
      camPos.y + halfH - marginY - anchorOffsetY,
      this.node.worldPosition.z,
    );
    this.node.setWorldPosition(this._pos);
  }
}
