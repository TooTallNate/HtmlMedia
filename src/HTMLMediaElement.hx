/* The MIT License
 * 
 * Copyright (c) 2010 Nathan Rajlich
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import flash.media.SoundTransform;
import haxe.Timer;

class HTMLMediaElement {
    var fallbackId : Int;
    var transform : SoundTransform;
    var volume : Float;
    var muted : Bool;
    var lastPosition : Float;
    var duration : Float;
    var isDurationPositive : Bool;
    var lastProgressEvent : Float;
    var playTimer : Timer;
    var metadataSent : Bool;
    
    public function new(fallbackId:Int, src:String, volume:Float, muted:Bool) {
        this.fallbackId = fallbackId;
        this.volume = volume;
        this.muted = muted;
        this.lastPosition = this.lastProgressEvent = 0;
        this.isDurationPositive = false;
        this.transform = new SoundTransform(muted ? 0 : volume, 0);
    }

    public function setMuted(muted: Bool) {
        this.muted = muted;
        this.setVolume(this.volume);
    }

    public function setVolume(vol: Float) {
        this.volume = vol;
        this.transform.volume = this.muted ? 0 : vol;
    }
}
