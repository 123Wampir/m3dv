import * as TWEEN from "three/examples/jsm/libs/tween.module.js";
import type { Track } from "../Track";
import { Vector3 } from "three";


export enum ParamType {
    boolean,
    float,
    vector,
    quaternion,
    matrix,
    any
}

export interface IOperation {
    readonly parent: Track;
    readonly paramType: ParamType;
    readonly type: string;
    SetStartTime(time: number): void;
    SetStartValue(value: any): void;
    SetFinalValue(value: any): void;
    SetDuration(time: number): void;
    SetTime(time: number): any;
    Update(time: number): any;
    Reset(): void;
}

export class Operation<T> implements IOperation {
    constructor(track: Track, obj: any, paramName: string) {
        this.parent = track;
        this.paramType = ParamType.any;
        this.type = "any";
        this.object = obj;
        this.paramName = paramName;
        this._startTime = 0;
        this._duration = 1;
        this.initialValue = obj[paramName];
        this.value = obj[paramName];
        this._finalValue = obj[paramName];
        this.tween = new TWEEN.Tween(obj).dynamic(true)
        // .onUpdate(e => console.log(e[paramName]));
        this.SetDuration(1);
    }
    readonly parent: Track;
    readonly paramType: ParamType;
    readonly type: string;
    protected initialValue: T;
    protected value: T;
    public _finalValue: T;
    public _startTime: number;
    public _duration: number;
    protected object: any;
    protected paramName: string;
    protected tween: TWEEN.Tween<Object>;
    protected SetTweenToParam(): void {
        let obj: any = {};
        obj[this.paramName] = this._finalValue;
        this.tween.to(obj, this._duration);
    }

    Reset(): void {
        this.object[this.paramName] = this.initialValue;
        this.tween.update(0);
    }
    SetStartTime(time: number): void { this._startTime = time; }
    SetStartValue(value: T): void { this.initialValue = value }
    SetFinalValue(value: T): void {
        this._finalValue = value;
        this.SetTweenToParam();
    }
    SetDuration(time: number): void {
        this._duration = time;
        this.SetTweenToParam();
    }
    SetTime(time: number) {
        this.Reset();
        this.Update(time);
    }
    Update(time: number) {
        if (time >= this._startTime) {
            this.tween.update(time - this._startTime);
        }
    }
}


export class TranslateOperation extends Operation<Vector3> {
    constructor(track: Track) {
        super(track, track.target, "position");
        this.initialValue = this.parent.target.position.clone(); // clone?
        this.value = this.parent.target.position;
        this._finalValue = this.initialValue;
        this.SetDuration(1)
    }
    override readonly paramType: ParamType = ParamType.vector;
    override readonly type: string = "translate";

    override Reset(): void {
        this.parent.target.position.copy(this.initialValue);
        this.tween.update(0);
    }
}
