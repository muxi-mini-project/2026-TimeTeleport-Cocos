import { _decorator, Component, Node, Input, input, EventKeyboard, KeyCode, Collider2D, Contact2DType, IPhysics2DContact, Vec3, find, Director, RigidBody2D } from 'cc';
import { CameraFollow } from '../CameraFollow';
import { LevelMapManager } from '../GamePlay/LevelMapManager';

const { ccclass, property } = _decorator;

@ccclass('Telescope')
export class Telescope extends Component {
    @property({ tooltip: '对应 Tiled 中 ViewZone 的 boundID' })
    scopeID: number = 101;

    @property({ type: Node, tooltip: '按键提示UI (如 "按E互动" 的气泡)' })
    promptUI: Node | null = null;

    @property({ type: LevelMapManager, tooltip: "关卡管理器"})
    mapManager: LevelMapManager | null = null;

    @property({ type: CameraFollow, tooltip: "镜头跟随脚本"})
    cameraFollow: CameraFollow | null = null;

    private _isPlayerInside: boolean = false;
    private _isActive: boolean = false;
    private _telescopeActiveTime: number = 0;
    private _pressedKeys: Set<KeyCode> = new Set();

    onLoad() {
        const collider = this.getComponent(Collider2D);
        const rb = this.getComponent(RigidBody2D);

        if (collider && rb) {
            console.log(`[Telescope] 碰撞配置: collider.group=${collider.group}, rb.group=${rb.group}, sensor=${collider.sensor}`);
        }

        if (this.promptUI) this.promptUI.active = false;
    }

    onEnable() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            console.log(`[Telescope] onEnable: 注册碰撞事件, collider.enabled=${collider.enabled}, group=${collider.group}`);
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        } else {
            console.error("Telescope: 缺少 Collider2D 组件！");
        }

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    onDisable() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.off(Contact2DType.END_CONTACT, this.onEndContact, this);
        }

        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    start() {
        if (!this.cameraFollow || !this.mapManager) {
            console.warn("Telescope: 未找到 CameraFollow 或 LevelMapManager，请检查节点命名或手动赋值。");
        }
    }

    onDestroy() {
        this._pressedKeys.clear();
    }

    update(dt: number) {
        if (this._isActive && this.cameraFollow) {
            this.handleInputMovement();
        }
    }

    private toggleTelescope() {
        console.log(`[Telescope] toggleTelescope 被调用，当前状态: _isActive=${this._isActive}, _isPlayerInside=${this._isPlayerInside}`);

        if (!this.mapManager || !this.cameraFollow) {
            console.error(`[Telescope] 交互失败！缺少依赖组件：mapManager=${!!this.mapManager}, cameraFollow=${!!this.cameraFollow}`);
            return;
        }

        const scopeData = this.mapManager.getScopeData(this.scopeID);
        if (!scopeData) {
            console.warn(`Telescope: 找不到 ID 为 ${this.scopeID} 的 ViewZone 数据`);
            return;
        }

        this._isActive = !this._isActive;

        if (this._isActive) {
            const collider = this.getComponent(Collider2D);
            if (collider) {
                collider.enabled = false;
                console.log("[Telescope] 步骤1: 已禁用碰撞器");
            }

            this.cameraFollow.enterTelescopeMode(scopeData.rect);
            console.log("[Telescope] 步骤2: 已调用 enterTelescopeMode");

            if (this.promptUI) this.promptUI.active = false;

            Director.instance.emit('PLAYER_FREEZE', true);
            console.log("[Telescope] 步骤3: 已发送 PLAYER_FREEZE 事件");
        } else {
            this.cameraFollow.exitTelescopeMode();

            const collider = this.getComponent(Collider2D);
            if (collider) {
                collider.enabled = true;
                console.log("[Telescope] 退出望远镜模式，已重新启用碰撞器");
            }

            if (this.promptUI) this.promptUI.active = true;

            Director.instance.emit('PLAYER_FREEZE', false);
        }
    }

    private onKeyDown(event: EventKeyboard) {
        this._pressedKeys.add(event.keyCode);

        if (event.keyCode === KeyCode.KEY_E) {
            if (this._isPlayerInside) {
                console.log(`[Info]成功与望远镜交互！`);
                this.toggleTelescope();
            }
        }

        if (this._isActive && (event.keyCode === KeyCode.ESCAPE || event.keyCode === KeyCode.KEY_X)) {
            this.toggleTelescope();
        }
    }

    private onKeyUp(event: EventKeyboard) {
        this._pressedKeys.delete(event.keyCode);
    }

    private handleInputMovement() {
        const inputDir = new Vec3(0, 0, 0);

        if (this._pressedKeys.has(KeyCode.ARROW_UP) || this._pressedKeys.has(KeyCode.KEY_W)) {
            inputDir.y += 1;
        }
        if (this._pressedKeys.has(KeyCode.ARROW_DOWN) || this._pressedKeys.has(KeyCode.KEY_S)) {
            inputDir.y -= 1;
        }
        if (this._pressedKeys.has(KeyCode.ARROW_LEFT) || this._pressedKeys.has(KeyCode.KEY_A)) {
            inputDir.x -= 1;
        }
        if (this._pressedKeys.has(KeyCode.ARROW_RIGHT) || this._pressedKeys.has(KeyCode.KEY_D)) {
            inputDir.x += 1;
        }

        if (inputDir.lengthSqr() > 0) {
            inputDir.normalize();
        }

        if (this.cameraFollow) {
            this.cameraFollow.setTelescopeInput(inputDir);
        } else {
            console.warn(`[Telescope] handleInputMovement: cameraFollow 为 null！`);
        }
    }

    private onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact) {
        if (other.node.name.indexOf('Player') === 0) {
            console.log(`[Telescope] onBeginContact: 检测到玩家进入, node.name=${other.node.name}`);
            this._isPlayerInside = true;
            if (this.promptUI) this.promptUI.active = true;
        }
    }

    private onEndContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact) {
        if (other.node.name.indexOf('Player') === 0) {
            console.log(`[Telescope] onEndContact 被调用！玩家离开触发区，_isActive=${this._isActive}`);

            if (this._isActive) {
                console.log(`[Telescope] 望远镜模式激活中，忽略 onEndContact 事件`);
                return;
            }

            this._isPlayerInside = false;

            if (this._isActive) {
                console.warn(`[Telescope] 玩家离开触发区，强制退出望远镜模式！`);
                this.toggleTelescope();
            }

            if (this.promptUI) this.promptUI.active = false;
        }
    }
}
