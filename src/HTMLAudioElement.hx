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
import flash.external.ExternalInterface;
import flash.media.Sound;
import flash.media.SoundChannel;
import flash.media.SoundTransform;
import flash.net.URLRequest;

class HTMLAudioElement {
    private var fallbackId: Int;
    private var sound : Sound;
    private var channel : SoundChannel;
    private var volume : Float;
    private var lastPosition : Float;
    
    public function new(fallbackId:Int, src:String, volume:Float) {
        this.fallbackId = fallbackId;
        this.volume = volume;
        this.lastPosition = 0;
        this.sound = new Sound();
        this.sound.addEventListener("complete", soundComplete);
        this.sound.addEventListener("id3", soundId3);
        this.sound.addEventListener("ioError", soundIoError);
        this.sound.addEventListener("open", soundOpen);
        this.sound.addEventListener("progress", soundProgress);
        this.load(src);
    }

    public function setVolume(vol: Float) {
        this.volume = vol;
        if (this.channel != null) {
            this.channel.soundTransform = new SoundTransform(vol, 0);
        }
    }
    
    public function load(src:String) {
        if (this.channel != null)
            this.pause();
        if(this.sound.bytesLoaded < this.sound.bytesTotal)
            this.sound.close();
        this.sound.load(new URLRequest(src));        
    }
    
    public function play() {
        this.channel = this.sound.play(this.lastPosition, 0, new SoundTransform(this.volume, 0));
        this.channel.addEventListener("soundComplete", this.channelComplete);
    }
    
    public function pause() {
        if (this.channel != null) {
            this.channel.removeEventListener("soundComplete", this.channelComplete);
            this.channel.stop();
            this.lastPosition = this.channel.position;
            this.channel = null;
        }
    }
    
    public function getCurrentTime() {
        return (this.channel == null ? this.lastPosition : this.channel.position)/1000;
    }
    
    public function setCurrentTime(time:Float) {
        var isPlaying : Bool = false;
        if (this.channel != null) {
            this.pause();
            isPlaying = true;
        }
        this.lastPosition = time*1000;
        if (isPlaying)
            this.play();
    }
    
    private function channelComplete(e) {
        this.channel.removeEventListener("soundComplete", this.channelComplete);
        this.channel = null;
        var loop : Bool = ExternalInterface.call("(function() { return HTMLAudioElement.__swfSounds["+this.fallbackId+"].loop; })");
        if (loop) {
            ExternalInterface.call("(function() { "+
                "var a = HTMLAudioElement.__swfSounds["+this.fallbackId+"]; "+
                "a.currentTime = a.startTime; a.play(); })");
        } else {
            ExternalInterface.call("HTMLAudioElement.__swfSounds["+this.fallbackId+"].__fireMediaEvent", "ended");
        }
    }
    
    ///////////////////  Event Handlers  ///////////////////
    private static function soundComplete(e) {
        ExternalInterface.call("console.log", e.target + " complete");
        ExternalInterface.call("console.log", e);
    }
    
    private static function soundId3(e) {
        ExternalInterface.call("console.log", e.target + " id3");
        ExternalInterface.call("console.log", e);
    }
    
    private static function soundIoError(e) {
        ExternalInterface.call("console.log", e.target + " ioError");
        ExternalInterface.call("console.log", e);
    }
    
    private static function soundOpen(e) {
        ExternalInterface.call("console.log", e.target + " open");
        ExternalInterface.call("console.log", e);
    }
    
    private static function soundProgress(e) {
        //ExternalInterface.call("console.log", e.target + " progress");
        //ExternalInterface.call("console.log", e);
    }
}