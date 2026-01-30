import { _decorator, Component, director } from 'cc';
const { ccclass } = _decorator;

@ccclass('LevelSelect')
export class LevelSelect extends Component {

    onClickLevel() {
        director.loadScene('Game');
    }

    onClickBack() {
        director.loadScene('StartMenu');
    }
}

