import { _decorator, Component, Node, RigidBody2D, Vec2, Collider2D, Contact2DType, IPhysics2DContact, view, Vec3, ERigidBody2DType, director, math } from 'cc';
const { ccclass, property } = _decorator;
import { PlayerController } from '../GamePlay/PlayerController';


@ccclass('BallObstacle')
export class BallObstacle extends Component {

  @property({ tooltip: "球的移动速度（建议：20-40）" })
  speed: number = 30; // ✅ 降低到合理范围

  private rigidBody: RigidBody2D = null;
  private screenWidth: number = 0;
  private hasHitPlayer: boolean = false;

  onLoad() {
    this.rigidBody = this.getComponent(RigidBody2D);
    this.screenWidth = view.getVisibleSize().width;

    // ✅ 改用更稳定的运动方式
    if (this.rigidBody) {
      this.rigidBody.type = ERigidBody2DType.Kinematic;
    }

    // 注册碰撞
    const collider = this.getComponent(Collider2D);
    if (collider) {
      collider.sensor = true;
      
    }
  }

  update(deltaTime: number) {
    // ✅ 使用translate实现帧率无关的平滑移动
    this.node.translate(new Vec3(-this.speed * deltaTime, 0, 0));

    // 飞出屏幕销毁
    const worldPos = this.node.getWorldPosition();
    if (worldPos.x < -this.screenWidth - 100) {
      this.node.destroy();
    }
  }

  

}