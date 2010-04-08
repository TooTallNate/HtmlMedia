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
import haxe.Timer;
import flash.display.BitmapData;
import flash.display.StageScaleMode;
import flash.events.Event;
import flash.external.ExternalInterface;
import flash.net.NetStream;
import flash.net.NetConnection;
import flash.media.Video;

class HTMLVideoElement extends HTMLMediaElement {
    private var stream : NetStream;
    private var connection : NetConnection;
    private var video: Video;
    
    public function new(fallbackId:Int, src:String, volume:Float, muted:Bool) {
        super(fallbackId, src, volume, muted);
        this.connection = new NetConnection();
        this.connection.connect(null);
        this.stream = new NetStream(this.connection);
        this.stream.checkPolicyFile = true;
        this.stream.client = this;
        this.stream.soundTransform = this.transform;
        this.video = new Video();
        this.video.attachNetStream(this.stream);
        this.load(src);
    }
    
    public override function setVolume(vol: Float) {
        super.setVolume(vol);
        this.stream.soundTransform = this.transform;
    }
    
    public function getVid() {
        return this.video;
    }
    
    public function getCurrentImageData() {
        try {
            //var t1 : Float = Date.now().getTime();
            var w : Int = this.video.videoWidth;
            var h : Int = this.video.videoHeight;
            var data : BitmapData = new BitmapData(w, h);
            data.draw(this.video);
            var a : Array<Int> = new Array();
            for (j in 0...h) {
                for (i in 0...w) {
                    a.push(data.getPixel32(i, j));
                }
            }
            //var t2 : Float = Date.now().getTime();
            //ExternalInterface.call("console.log", "Flash time: " + (t2-t1));
            return a;
        } catch (ex : Dynamic) {
            ExternalInterface.call("console.log", ex);
            return null;
        }
    }
    
    public function getCurrentTime() {
        return this.stream.time;
    }
    
    public function setCurrentTime(time:Float) {
        this.stream.seek(time);
    }
    
    public function load(src:String) {
        this.stream.close();
        this.stream.play(src);
    }
    
    public function play() {
        this.stream.resume();
    }
    
    public function pause() {
        this.stream.pause();
    }
    
    // Event Listeners
    public function onMetaData(metadata) {
        ExternalInterface.call("HTMLVideoElement.__vids["+this.fallbackId+"].__metadataCallback", metadata.duration, this.video.videoWidth, this.video.videoHeight);
    }
    
    public function onPlayStatus(playStatus) {
        ExternalInterface.call("console.log", "playStatus");
    }

    // Static Stuff
    public static var videoElement : HTMLVideoElement;

    public static function onResize(e:Event) {
        ExternalInterface.call("console.log", "Stage resized: " + flash.Lib.current.stage.stageWidth + " x " + flash.Lib.current.stage.stageHeight);        
    }

    public static function main() {
        var flashvars : Dynamic<String> = flash.Lib.current.loaderInfo.parameters;
        videoElement = new HTMLVideoElement(Std.parseInt(flashvars.id), flashvars.src, Std.parseFloat(flashvars.volume), flashvars.muted.toLowerCase() == "true");
        flash.Lib.current.addChild(videoElement.getVid());
        
        
        flash.Lib.current.stage.scaleMode = StageScaleMode.NO_SCALE;
        flash.Lib.current.stage.addEventListener(Event.RESIZE, onResize);
        
        ExternalInterface.addCallback("__load", videoElement.load);
        ExternalInterface.addCallback("__getCurrentTime", videoElement.getCurrentTime);
        ExternalInterface.addCallback("__setCurrentTime", videoElement.setCurrentTime);
        ExternalInterface.addCallback("__getImageData", videoElement.getCurrentImageData);
        ExternalInterface.addCallback("__play", videoElement.play);
        ExternalInterface.addCallback("__pause", videoElement.pause);
        ExternalInterface.addCallback("__setVolume", videoElement.setVolume);
        ExternalInterface.call("HTMLVideoElement.__vids["+flashvars.id+"].__swfInit");
    }
}
