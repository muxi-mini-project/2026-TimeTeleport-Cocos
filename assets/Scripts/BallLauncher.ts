import { _decorator, Component, Node, Prefab, instantiate, view, Vec3, director, Director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BallLauncher')
export class BallLauncher extends Component {

  @property({ type: Prefab, tooltip: "球障碍的预制体" })
  ballPrefab: Prefab = null;

  @property({ tooltip: "发射间隔（秒）" })
  spawnInterval: number = 10;

  @property({ tooltip: "球的初始速度（建议：80-150）" })
  ballSpeed: number = 30;

  private screenWidth: number = 0;
  private screenHeight: number = 0;
  private isActive: boolean = false;

  onLoad() {
    // 获取屏幕尺寸
    const visibleSize = view.getVisibleSize();
    this.screenWidth = visibleSize.width;
    this.screenHeight = visibleSize.height;

    console.log(`发射器初始化：屏幕尺寸 ${this.screenWidth}x${this.screenHeight}`);

    // 直接开始发射
    this.startSpawning();
  }

  private spawnBall() {
    console.log("尝试生成球障碍...");

    if (!this.ballPrefab) {
      console.warn("Ball prefab is not assigned!");
      return;
    }

    const ball = instantiate(this.ballPrefab);
    console.log("球障碍实例化成功:", ball);

    if (!ball) {
      console.error("实例化球障碍失败！");
      return;
    }

    const startX = this.screenWidth / 2 + 50;
    const groundY = -280; // 假设地面Y坐标
    const randomY = groundY + Math.random() * 90;

    ball.setWorldPosition(new Vec3(startX, randomY, 1));


    // 【关键修复】将球添加到正确的父节点
    // 方案1：添加到Canvas下的世界节点（推荐）
    const canvas = director.getScene().getChildByName('Canvas');
    if (canvas) {
      // 查找Canvas下的World节点，如果没有就使用Canvas本身
      const worldNode = canvas.getChildByName('World') || canvas;
      worldNode.addChild(ball);
      console.log("球障碍添加到World节点下");
    } else {
      // 备用方案：添加到当前发射器节点下
      this.node.addChild(ball);
      console.log("球障碍添加到发射器节点下");
    }

    // 获取球脚本并设置速度
    const ballScript = ball.getComponent('BallObstacle');
    if (ballScript) {
      // 使用类型断言设置速度
      (ballScript as any).speed = this.ballSpeed;
      console.log(`发射球障碍，速度: ${this.ballSpeed}`);
    } else {
      console.warn("球障碍节点上没有找到BallObstacle组件！");

      // 调试：检查球障碍节点上的所有组件
      const components = ball.getComponents(Component);
      console.log("球障碍节点上的组件:", components.map(comp => comp.constructor.name));
    }
  }

  // 开始发射
  public startSpawning() {
    if (this.isActive) return;

    this.isActive = true;
    // 立即发射一个，然后按间隔发射
    this.spawnBall(); // 立即发射一个
    this.schedule(this.spawnBall, this.spawnInterval);

    console.log("球发射器开始工作");
  }

  // 停止发射
  public stopSpawning() {
    this.isActive = false;
    this.unschedule(this.spawnBall);
  }

  onDestroy() {
    // 组件销毁时停止发射
    this.stopSpawning();
  }

  // 添加世界切换支持的方法
  public onWorldChanged(isFutureWorld: boolean) {
    console.log(`球发射器收到世界切换通知: ${isFutureWorld ? '未来世界' : '过去世界'}`);

    if (isFutureWorld && !this.isActive) {
      this.startSpawning();
      console.log("球发射器在未来世界开始工作");
    } else if (!isFutureWorld && this.isActive) {
      this.stopSpawning();
      console.log("球发射器在过去世界停止工作");
    }
  }
}