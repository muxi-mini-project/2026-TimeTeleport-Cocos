import { _decorator, Component, director } from 'cc';
const { ccclass } = _decorator;

@ccclass('StartMenu')
export class StartMenu extends Component {

    onClickStart () {
        director.loadScene('LevelSelect');
    }
}
