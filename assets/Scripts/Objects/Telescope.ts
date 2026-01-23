import { _decorator, Component, Node, Input, input, EventKeyboard, KeyCode, Collider2D, Contact2DType, IPhysics2DContact, Vec3, find, Director } from 'cc';
import { CameraFollow } from '../CameraFollow';
import { LevelMapManager } from '../GamePlay/LevelMapManager';
import { CinematicManager } from '../CinematicManager';

const { ccclass, property } = _decorator;

@ccclass('Telescope')
export class Telescope extends Component {
    // --- 配置属性 ---

    @property({ tooltip: '对应 Tiled 中 ViewZone 的 boundID' })
    scopeID: number = 101;

    @property({ type: Node, tooltip: '按键提示UI (如 "按E互动" 的气泡)' })
    promptUI: Node | null = null;

    @property({ type: LevelMapManager, tooltip: "关卡管理器"})
    mapManager: LevelMapManager | null = null;

    @property({ type: CameraFollow, tooltip: "镜头跟随脚本"})
    cameraFollow: CameraFollow | null = null;

    // --- 内部状态 ---

    private _isPlayerInside: boolean = false; // 玩家是否在触发区域内
    private _isActive: boolean = false;       // 是否正在使用望远镜
    private _telescopeActiveTime: number = 0; // 望远镜激活的时间戳，用于防止初始化时的误触发
    private _pressedKeys: Set<KeyCode> = new Set(); // 记录当前按下的键，用于平滑移动


    onLoad() {
        // 1. 初始化碰撞监听
        const collider = this.getComponent(Collider2D);
        if (collider) {
            // 确保你的 Tiled 对象或预制体上有 BoxCollider2D，并勾选了 IsSensor (如果是触发器)
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        } else {
            console.error("Telescope: 缺少 Collider2D 组件！");
        }

        // 2. 初始化输入监听
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        
        // 3. 初始隐藏提示UI
        if (this.promptUI) this.promptUI.active = false;
    }

    start() {
        if (!this.cameraFollow || !this.mapManager) {
            console.warn("Telescope: 未找到 CameraFollow 或 LevelMapManager，请检查节点命名或手动赋值。");
        }
    }

    onDestroy() {
        // 移除监听，防止报错
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    update(dt: number) {
        // 只有在激活状态下，才处理摄像机移动逻辑
        if (this._isActive && this.cameraFollow) {
            // console.log(`[Telescope] update 被调用，_isActive=true`);
            this.handleInputMovement();
        }
    }

    // --- 交互逻辑 ---

    private toggleTelescope() {
        console.log(`[Telescope] toggleTelescope 被调用，当前状态: _isActive=${this._isActive}, _isPlayerInside=${this._isPlayerInside}`);

        if (!this.mapManager || !this.cameraFollow) {
            console.error(`[Telescope] 交互失败！缺少依赖组件：mapManager=${!!this.mapManager}, cameraFollow=${!!this.cameraFollow}`);
            return;
        }

        // 获取可视范围数据
        const scopeData = this.mapManager.getScopeData(this.scopeID);
        if (!scopeData) {
            console.warn(`Telescope: 找不到 ID 为 ${this.scopeID} 的 ViewZone 数据`);
            return;
        }

        this._isActive = !this._isActive;

        if (this._isActive) {
            // 1. 首先禁用碰撞器，防止后续相机移动触发 onEndContact
            const collider = this.getComponent(Collider2D);
            if (collider) {
                collider.enabled = false;
                console.log("[Telescope] 步骤1: 已禁用碰撞器");
            }

            // 2. 摄像机接管（这会改变相机位置，可能触发碰撞检测）
            this.cameraFollow.enterTelescopeMode(scopeData.rect);
            console.log("[Telescope] 步骤2: 已调用 enterTelescopeMode");

            CinematicManager.instance.show();
            console.log("[Telescope] 步骤3: 已显示 CinematicManager");

            // 3. 隐藏交互提示
            if (this.promptUI) this.promptUI.active = false;

            // 4. 发送全局事件冻结玩家 (或者直接引用 Player 脚本调用 freeze)
            Director.instance.emit('PLAYER_FREEZE', true);
            console.log("[Telescope] 步骤4: 已发送 PLAYER_FREEZE 事件"); 
        } else {
            // 1. 摄像机复位
            this.cameraFollow.exitTelescopeMode();

            CinematicManager.instance.hide();

            // 2. 重新启用碰撞器
            const collider = this.getComponent(Collider2D);
            if (collider) {
                collider.enabled = true;
                console.log("[Telescope] 退出望远镜模式，已重新启用碰撞器");
            }

            // 3. 恢复交互提示 (因为玩家人还在触发区里)
            if (this.promptUI) this.promptUI.active = true;

            // 4. 解冻玩家
            Director.instance.emit('PLAYER_FREEZE', false);
        }
    }

    // --- 输入处理 ---

    private onKeyDown(event: EventKeyboard) {
        // 记录按键 (用于 Update 里的持续移动)
        this._pressedKeys.add(event.keyCode);

        // 交互键检测 (例如 E 键)
        if (event.keyCode === KeyCode.KEY_E) {
            if (this._isPlayerInside) {
                console.log(`[Info]成功与望远镜交互！`);
                this.toggleTelescope();
            }
        }
        
        // 退出键检测 (例如 ESC 或 X)
        if (this._isActive && (event.keyCode === KeyCode.ESCAPE || event.keyCode === KeyCode.KEY_X)) {
            this.toggleTelescope(); // 再次调用即退出
        }
    }

    private onKeyUp(event: EventKeyboard) {
        this._pressedKeys.delete(event.keyCode);
    }

    /**
     * 处理望远镜模式下的输入移动
     * 根据 _pressedKeys 收集的按键状态，合成输入方向并传递给 CameraFollow
     */
    private handleInputMovement() {
        // 根据按下的键合成方向向量
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

        // 归一化，防止斜向移动速度变快
        if (inputDir.lengthSqr() > 0) {
            inputDir.normalize();
            // console.log(`[Telescope] handleInputMovement: 输入方向=(${inputDir.x.toFixed(2)}, ${inputDir.y.toFixed(2)}), _pressedKeys.size=${this._pressedKeys.size}`);
        }

        // 传递给 CameraFollow
        if (this.cameraFollow) {
            this.cameraFollow.setTelescopeInput(inputDir);
        } else {
            console.warn(`[Telescope] handleInputMovement: cameraFollow 为 null！`);
        }
    }

    // --- 碰撞回调 ---

    private onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact) {
        // 假设玩家节点的 Tag 是 1，或者名字叫 Player
        // 建议在项目设置里定义专门的 Physics Group (例如 PLAYER)
        if (other.node.name === 'Player') {
            this._isPlayerInside = true;
            if (this.promptUI) this.promptUI.active = true;
        }
    }

    private onEndContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact) {
        if (other.node.name === 'Player') {
            console.log(`[Telescope] onEndContact 被调用！玩家离开触发区，_isActive=${this._isActive}`);

            // 如果在望远镜模式下，忽略这个事件
            // 因为相机移动时可能会误触发碰撞检测
            if (this._isActive) {
                console.log(`[Telescope] 望远镜模式激活中，忽略 onEndContact 事件`);
                return;
            }

            this._isPlayerInside = false;

            // 如果玩家离开了触发区，且当前还在看望远镜，强制退出
            if (this._isActive) {
                console.warn(`[Telescope] 玩家离开触发区，强制退出望远镜模式！`);
                this.toggleTelescope();
            }
            
            if (this.promptUI) this.promptUI.active = false;
        }
    }
}