import { Object3D } from "three";
import { EventEmitter } from "../../EventListener/Event";
import type { SceneManager } from "../SceneManager";
import { Track } from "./Track";

export class AnimationManager extends EventEmitter {
    constructor(sceneManager: SceneManager) {
        super();
        this.BuildTree(sceneManager);
    }

    private play: boolean = false;
    tracks: Track[] = [];
    private currentTime = 0;
    Play() { this.play = true; }
    Pause() { this.play = false; }
    PlayPause() {
        this.play = !this.play;
    }

    DeleteTrack(obj: Object3D) {
        let index = this.tracks.findIndex(track => track.target.uuid == obj.uuid);
        if (index != -1)
            this.tracks.splice(index, 1);
        this.emit("change");
    }
    AddTrack(obj: Object3D): Track {
        let track = new Track(obj);
        this.tracks.push(track);
        this.emit("change");
        return track;
    }

    FindTrack(obj: Object3D): Track | undefined {
        return this.tracks.find(track => track.target.uuid == obj.uuid);
    }

    BuildTree(sceneManager: SceneManager) {
        this.tracks.splice(0, this.tracks.length);
        sceneManager.lights.forEach(light => this.AddTrack(light));
        sceneManager.modelManager.GetModel().traverse(obj => {
            if (obj.type != "Object3D")
                this.AddTrack(obj);
        });
    }

    Update(delta: number) {
        if (this.play) {
            this.currentTime += delta;
            this.tracks.forEach(track => track.Update(this.currentTime));
        }
    }
    Reset() {
        this.play = false;
        this.currentTime = 0;
        this.tracks.forEach(track => track.Reset());
    }
}