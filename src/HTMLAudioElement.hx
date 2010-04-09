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
import haxe.Timer;

class HTMLAudioElement extends HTMLMediaElement {
    private var sound : Sound;
    private var channel : SoundChannel;
    
    public function new(fallbackId:Int, src:String, volume:Float, muted:Bool) {
        super(fallbackId, src, volume, muted);
        this.sound = new Sound();
        this.sound.addEventListener("complete", soundComplete);
        this.sound.addEventListener("id3", soundId3);
        this.sound.addEventListener("ioError", soundIoError);
        this.sound.addEventListener("open", soundOpen);
        this.sound.addEventListener("progress", soundProgress);
        this.load(src);
    }

    public override function setVolume(vol: Float) {
        super.setVolume(vol);
        if (this.channel != null) {
            this.channel.soundTransform = this.transform;
        }
    }
    
    public function load(src:String) {
        if (this.channel != null)
            this.pause();
        if(this.sound.bytesLoaded < this.sound.bytesTotal)
            this.sound.close();
        this.sound.load(new URLRequest(src));
        this.metadataSent = false;
    }
    
    public function play() {
        if (this.lastPosition == this.sound.length) this.lastPosition = 0;
        this.channel = this.sound.play(this.lastPosition, 0, this.transform);
        this.channel.addEventListener("soundComplete", this.channelComplete);
        this.playTimer = new Timer(200);
        this.playTimer.run = this.sendTimeUpdate;
    }
    
    private function sendTimeUpdate() {
        ExternalInterface.call("HTMLAudioElement.__swfSounds["+this.fallbackId+"].__fireMediaEvent", "timeupdate");
    }
    
    public function pause() {
        if (this.channel != null) {
            this.playTimer.stop();
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
            
        if (this.lastPosition > this.sound.length) {
            ExternalInterface.call("HTMLAudioElement.__swfSounds["+this.fallbackId+"].__fireMediaEvent", "waiting");
        } else {
            ExternalInterface.call("HTMLAudioElement.__swfSounds["+this.fallbackId+"].__fireMediaEvent", "seeked");
        }
    }
    
    // Called when the sound finishes playing to the end (by SoundChannel's 'soundComplete' event)
    private function channelComplete(e) {
        //ExternalInterface.call("console.log", "channelComplete");
        this.playTimer.stop();
        this.channel.removeEventListener("soundComplete", this.channelComplete);
        this.channel.stop();
        this.channel = null;
        this.lastPosition = this.sound.length;
        ExternalInterface.call("HTMLAudioElement.__swfSounds["+this.fallbackId+"].__endedCallback");
    }
    
    ///////////////////  Event Handlers  ///////////////////
    private function soundComplete(e) {
        ExternalInterface.call("(function() { " +
            "var s = HTMLAudioElement.__swfSounds["+this.fallbackId+"]; " +
            "s.__duration = " + (this.sound.length/1000) + "; " +
            "s.__fireMediaEvent('durationchange'); "+
            "s.__fireMediaEvent('progress', "+this.sound.bytesLoaded+", "+this.sound.bytesTotal+"); "+
        "})");
        //ExternalInterface.call("HTMLAudioElement.__swfSounds["+this.fallbackId+"].__fireMediaEvent", "progress", this.sound.bytesLoaded, this.sound.bytesTotal);
    }
    
    private function soundId3(e) {
        //ExternalInterface.call("console.log", e);
    }
    
    private function soundIoError(e) {
        this.sound.close();
        ExternalInterface.call("HTMLAudioElement.__swfSounds["+this.fallbackId+"].__errorCallback");
    }
    
    private function soundOpen(e) {
    }
    
    private function soundProgress(e) {
        var now : Float = Date.now().getTime();
        if (!this.metadataSent) {
            var percent : Float = this.sound.bytesLoaded / this.sound.bytesTotal;
            // Set the duration to a calculated estimate while its loading
            this.duration = this.sound.length * this.sound.bytesLoaded / this.sound.bytesTotal / 1000;
            if (this.duration > 0 && percent > .05) {
                ExternalInterface.call("HTMLAudioElement.__swfSounds["+this.fallbackId+"].__metadataCallback", this.duration);
                this.metadataSent = true;
            }
        }
        if (this.sound.bytesLoaded > 0 && now - this.lastProgressEvent > 350) {            
            this.lastProgressEvent = now;
            ExternalInterface.call("HTMLAudioElement.__swfSounds["+this.fallbackId+"].__fireMediaEvent", "progress", this.sound.bytesLoaded, this.sound.bytesTotal);
        }
    }







    // The static array of Flash "HTMLAudioElement" objects that represent
    // the <audio> nodes on the page.
    public static var sounds:Array<HTMLAudioElement> = new Array();
    
    // ExternalInterface functions available to JavaScript
    public static function IS_AUDIO_BRIDGE() {
        return true;
    }

    public static function createSound(src:String, volume:Float, muted:Bool) {
        var fallbackId : Int = sounds.length;
        var a : HTMLAudioElement = new HTMLAudioElement(fallbackId, src, volume, muted);
        sounds.push(a);
        return fallbackId;
    }
    
    public static function Load(index:Int, src:String) {
        var sound:HTMLAudioElement = sounds[index];
        sound.load(src);
    }
    
    public static function Play(index:Int) {
        var sound:HTMLAudioElement = sounds[index];
        sound.play();
    }
    
    public static function Pause(index:Int) {
        var sound:HTMLAudioElement = sounds[index];
        sound.pause();
    }
    
    public static function SetMuted(index:Int, muted:Bool) {
        var sound:HTMLAudioElement = sounds[index];
        sound.setMuted(muted);
    }
    
    public static function SetVolume(index:Int, volume:Float) {
        var sound:HTMLAudioElement = sounds[index];
        sound.setVolume(volume);
    }
    
    public static function GetCurrentTime(index:Int) {
        return sounds[index].getCurrentTime();
    }
    
    public static function SetCurrentTime(index:Int, time:Float) {
        sounds[index].setCurrentTime(time);
    }

    public static function main() {
        ExternalInterface.addCallback("IS_AUDIO_BRIDGE", IS_AUDIO_BRIDGE);
        ExternalInterface.addCallback("__createSound", createSound);
        ExternalInterface.addCallback("__load", Load);
        ExternalInterface.addCallback("__play", Play);
        ExternalInterface.addCallback("__pause", Pause);
        ExternalInterface.addCallback("__setMuted", SetMuted);
        ExternalInterface.addCallback("__setVolume", SetVolume);
        ExternalInterface.addCallback("__getCurrentTime", GetCurrentTime);
        ExternalInterface.addCallback("__setCurrentTime", SetCurrentTime);
        ExternalInterface.call([
        "(function(){",
            "var f = function(tag){",
                "var elems = document.getElementsByTagName(tag);",
                "for (var i=0; i<elems.length; i++) if (elems[i].IS_AUDIO_BRIDGE) return elems[i];",
            "};",
            "HTMLAudioElement.__swf = f('embed') || f('object');",
        "})" ].join('') );
        ExternalInterface.call("HTMLAudioElement.__swfLoaded");            
    }
}
