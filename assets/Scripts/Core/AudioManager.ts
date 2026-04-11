import { _decorator, AudioSource, AudioClip } from 'cc';
const { ccclass } = _decorator;

@ccclass('AudioManager')
export class AudioManager {
    private static _instance: AudioManager | null = null;

    private static readonly STORAGE_KEY = 'TimeTeleport_AudioSettings';
    private static readonly DEFAULT_MUSIC_VOLUME = 0.8;
    private static readonly DEFAULT_SFX_VOLUME = 1.0;

    private _musicVolume: number = AudioManager.DEFAULT_MUSIC_VOLUME;
    private _sfxVolume: number = AudioManager.DEFAULT_SFX_VOLUME;
    private _musicSource: AudioSource | null = null;
    private _sfxSource: AudioSource | null = null;

    public static getInstance(): AudioManager {
        if (!this._instance) {
            this._instance = new AudioManager();
        }
        return this._instance;
    }

    private constructor() {
        this.loadSettings();
    }

    public initialize(musicSource: AudioSource, sfxSource: AudioSource): void {
        this._musicSource = musicSource;
        this._sfxSource = sfxSource;
        this.applyVolumes();
    }

    public setMusicVolume(volume: number): void {
        this._musicVolume = volume;
        if (this._musicSource) {
            this._musicSource.volume = this._musicVolume;
        }
        this.saveSettings();
    }

    public getMusicVolume(): number {
        return this._musicVolume;
    }

    public setSfxVolume(volume: number): void {
        this._sfxVolume = volume;
        if (this._sfxSource) {
            this._sfxSource.volume = this._sfxVolume;
        }
        this.saveSettings();
    }

    public getSfxVolume(): number {
        return this._sfxVolume;
    }

    public playMusic(clip: AudioClip): void {
        if (!this._musicSource) {
            console.error('[AudioManager] 音乐音源未初始化');
            return;
        }
        this._musicSource.clip = clip;
        this._musicSource.loop = true;
        this._musicSource.play();
    }

    public playSfx(clip: AudioClip): void {
        if (!this._sfxSource) {
            console.error('[AudioManager] 音效音源未初始化');
            return;
        }
        this._sfxSource.playOneShot(clip, this._sfxVolume);
    }

    public playSfxPreview(clip: AudioClip): void {
        // 用于设置界面预览音量，直接播放不叠加
        if (!this._sfxSource) {
            console.error('[AudioManager] 音效音源未初始化');
            return;
        }
        if (this._sfxSource.playing) {
            this._sfxSource.stop();
        }
        this._sfxSource.playOneShot(clip, this._sfxVolume);
    }

    public stopMusic(): void {
        if (this._musicSource) {
            this._musicSource.stop();
        }
    }

    public pauseMusic(): void {
        if (this._musicSource) {
            this._musicSource.pause();
        }
    }

    public resumeMusic(): void {
        if (this._musicSource) {
            this._musicSource.play();
        }
    }

    private applyVolumes(): void {
        if (this._musicSource) {
            this._musicSource.volume = this._musicVolume;
        }
        if (this._sfxSource) {
            this._sfxSource.volume = this._sfxVolume;
        }
    }

    private saveSettings(): void {
        try {
            const settings = {
                musicVolume: this._musicVolume,
                sfxVolume: this._sfxVolume
            };
            const json = JSON.stringify(settings);
            localStorage.setItem(AudioManager.STORAGE_KEY, json);
        } catch (error) {
            console.error('[AudioManager] 保存设置到本地存储失败:', error);
        }
    }

    private loadSettings(): void {
        try {
            const json = localStorage.getItem(AudioManager.STORAGE_KEY);
            if (json) {
                const settings = JSON.parse(json);
                if (typeof settings.musicVolume === 'number') {
                    this._musicVolume = settings.musicVolume;
                }
                if (typeof settings.sfxVolume === 'number') {
                    this._sfxVolume = settings.sfxVolume;
                }
                console.log('[AudioManager] 从本地存储加载音量设置成功');
            }
        } catch (error) {
            console.error('[AudioManager] 从本地存储加载设置失败:', error);
        }
    }

    public resetToDefaults(): void {
        this._musicVolume = AudioManager.DEFAULT_MUSIC_VOLUME;
        this._sfxVolume = AudioManager.DEFAULT_SFX_VOLUME;
        this.applyVolumes();
        this.saveSettings();
        console.log('[AudioManager] 音量设置已重置为默认值');
    }
}
