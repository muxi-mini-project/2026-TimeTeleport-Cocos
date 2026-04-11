import { _decorator, Component, Slider, Label, Button, AudioClip, director } from 'cc';
import { AudioManager } from '../Core/AudioManager';
const { ccclass, property } = _decorator;

@ccclass('SettingsPanel')
export class SettingsPanel extends Component {
    @property({ type: Slider, tooltip: '音乐音量滑块' })
    musicSlider: Slider = null;

    @property({ type: Slider, tooltip: '音效音量滑块' })
    sfxSlider: Slider = null;

    @property({ type: Label, tooltip: '音乐音量百分比显示' })
    musicValueLabel: Label = null;

    @property({ type: Label, tooltip: '音效音量百分比显示' })
    sfxValueLabel: Label = null;

    @property({ type: Button, tooltip: '返回按钮' })
    backButton: Button = null;

    @property({ type: AudioClip, tooltip: '音效预览样本（拖动滑块时播放）' })
    sfxSampleClip: AudioClip = null;

    onLoad(): void {
        // 从 AudioManager 读取当前音量设置滑块
        const audioManager = AudioManager.getInstance();
        this.musicSlider.progress = audioManager.getMusicVolume();
        this.sfxSlider.progress = audioManager.getSfxVolume();

        // 更新百分比标签
        this.updateMusicLabel();
        this.updateSfxLabel();

        // 绑定滑块事件
        this.musicSlider.node.on('slide', this.onMusicSliderChanged, this);
        this.sfxSlider.node.on('slide', this.onSfxSliderChanged, this);

        // 绑定返回按钮事件
        this.backButton.node.on(Button.EventType.CLICK, this.onBackClick, this);
    }

    private onMusicSliderChanged(): void {
        const volume = this.musicSlider.progress;
        AudioManager.getInstance().setMusicVolume(volume);
        this.updateMusicLabel();
    }

    private onSfxSliderChanged(): void {
        const volume = this.sfxSlider.progress;
        AudioManager.getInstance().setSfxVolume(volume);
        this.updateSfxLabel();

        // 如果有样本音效，播放预览
        if (this.sfxSampleClip) {
            AudioManager.getInstance().playSfxPreview(this.sfxSampleClip);
        }
    }

    private updateMusicLabel(): void {
        const percentage = Math.round(this.musicSlider.progress * 100);
        this.musicValueLabel.string = `${percentage}%`;
    }

    private updateSfxLabel(): void {
        const percentage = Math.round(this.sfxSlider.progress * 100);
        this.sfxValueLabel.string = `${percentage}%`;
    }

    private onBackClick(): void {
        // 返回主菜单
        director.loadScene('StartMenu');
    }
}
