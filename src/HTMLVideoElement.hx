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
import flash.events.ContextMenuEvent;
import flash.events.Event;
import flash.events.IOErrorEvent;
import flash.events.NetStatusEvent;
import flash.external.ExternalInterface;
import flash.net.NetStream;
import flash.net.NetConnection;
import flash.media.Video;
import flash.ui.ContextMenu;
import flash.ui.ContextMenuItem;

class HTMLVideoElement extends HTMLMediaElement {
    private var stream : NetStream;
    private var connection : NetConnection;
    public var video: Video;
    
    public function new(fallbackId:Int, src:String, volume:Float, muted:Bool) {
        super(fallbackId, src, volume, muted);
        this.connection = new NetConnection();
        this.connection.connect(null);
        this.stream = new NetStream(this.connection);
        this.stream.checkPolicyFile = true;
        this.stream.client = this;
        this.stream.addEventListener(IOErrorEvent.IO_ERROR, this.ioError);
        this.stream.addEventListener(NetStatusEvent.NET_STATUS, this.netStatus);
        this.stream.soundTransform = this.transform;
        this.video = new Video();
        this.video.attachNetStream(this.stream);
        this.load(src);
    }
    
    public override function setVolume(vol: Float) {
        super.setVolume(vol);
        this.stream.soundTransform = this.transform;
    }
    
    public function getCurrentImageData() {
        try {
            var t1 : Float = Date.now().getTime();
            var w : Int = this.video.videoWidth;
            var h : Int = this.video.videoHeight;
            var data : BitmapData = new BitmapData(w, h, true, 0x000000);
            data.draw(this.video);
            var a : Array<Int> = new Array();
            for (j in 0...h) {
                for (i in 0...w) {
                    a.push(data.getPixel32(i, j));
                }
            }
            data.dispose();
            var t2 : Float = Date.now().getTime();
            ExternalInterface.call("console.log", "Flash time: " + (t2-t1));
            return a;
        } catch (ex : Dynamic) {
            ExternalInterface.call("console.log", ex);
            return null;
        }
    }
    
    public function getCurrentTime():Float {
        return this.stream.time;
    }
    
    public function setCurrentTime(time:Float) {
        this.stream.seek(time);
    }
    
    public function load(src:String) {
        this.metadataSent = false;
        this.stream.close();
        this.stream.play(src);
    }
    
    public function play() {
        this.stream.resume();
        this.playTimer = new Timer(200);
        this.playTimer.run = this.sendTimeUpdate;
    }
    
    private function sendTimeUpdate() {
        ExternalInterface.call("HTMLVideoElement.__vids["+this.fallbackId+"].__fireMediaEvent", "timeupdate");
    }
    
    public function pause() {
        if (this.playTimer != null) {
            this.playTimer.stop();
            this.playTimer = null;
        }
        this.stream.pause();
    }
    
    // Event Listeners
    public function ioError(e) {
        ExternalInterface.call("console.log", "ioError");
    }
    
    public function netStatus(e) {
        var info:String = e.info.code;
        ExternalInterface.call("console.log", info);
        if (info == "NetStream.Play.Stop") {
            this.streamComplete();
        }
    }
    
    private function streamComplete() {
        this.playTimer.stop();
        ExternalInterface.call("HTMLVideoElement.__vids["+this.fallbackId+"].__endedCallback");
    }
    
    public function onMetaData(metadata) {
        if (!this.metadataSent) {
            this.stream.pause();
            this.stream.seek(0);
            this.duration = metadata.duration;
            //ExternalInterface.call("console.log", metadata.width);
            ExternalInterface.call("HTMLVideoElement.__vids["+this.fallbackId+"].__metadataCallback", metadata.duration, this.video.videoWidth, this.video.videoHeight);
            this.metadataSent = true;
        }
    }
    
    public function onPlayStatus(playStatus) {
        // Doesn't ever fire for some reason...
        ExternalInterface.call("console.log", "playStatus");
    }





    // Static Stuff
    /**
     * The single HTMLVideoElement that this SWF displays.
     */
    public static var videoElement : HTMLVideoElement;

    /**
     * Instantiate a custom ContextMenu and set it to the
     * current Stage. Should contain Play/Pause, Mute/Unmute,
     * and a Full-Screen button.
     */
    public static function initContextMenu() {
        var contextMenu : ContextMenu = new ContextMenu();
        contextMenu.hideBuiltInItems();
        var label : ContextMenuItem = new ContextMenuItem("HtmlMedia <video> Player");
        contextMenu.customItems.push(label);
        var copyLabel : ContextMenuItem = new ContextMenuItem("Copy Video URL", true);
        contextMenu.customItems.push(copyLabel);
        flash.Lib.current.contextMenu = contextMenu;
    }

    public static function copyVideoUrl(e) {
        ExternalInterface.call("console.log", "Copy to Clipboard");
        flash.system.System.setClipboard("test");
    }

    /**
     * Every time the SWF is resized on the page (through CSS, etc.),
     * we need to resize the video to maximize the stage, while still
     * constraining porportions.
     */
    public static function onResize(e:Event) {
        var s:Float = Math.min(flash.Lib.current.stage.stageWidth / videoElement.video.videoWidth, flash.Lib.current.stage.stageHeight / videoElement.video.videoHeight);
        videoElement.video.width = s*videoElement.video.videoWidth;
        videoElement.video.height = s*videoElement.video.videoHeight;
        videoElement.video.x = (flash.Lib.current.stage.stageWidth / 2) - (videoElement.video.width / 2);
        videoElement.video.y = (flash.Lib.current.stage.stageHeight / 2) - (videoElement.video.height / 2);
    }

    public static function main() {
        var flashvars : Dynamic<String> = flash.Lib.current.loaderInfo.parameters;
        videoElement = new HTMLVideoElement(Std.parseInt(flashvars.id), flashvars.src, Std.parseFloat(flashvars.volume), flashvars.muted.toLowerCase() == "true");
        flash.Lib.current.addChild(videoElement.video);
        
        initContextMenu();
        
        flash.Lib.current.stage.scaleMode = StageScaleMode.NO_SCALE;
        flash.Lib.current.stage.addEventListener(Event.RESIZE, onResize);
        
        ExternalInterface.addCallback("__load", videoElement.load);
        ExternalInterface.addCallback("__play", videoElement.play);
        ExternalInterface.addCallback("__pause", videoElement.pause);
        ExternalInterface.addCallback("__setMuted", videoElement.setMuted);
        ExternalInterface.addCallback("__setVolume", videoElement.setVolume);
        ExternalInterface.addCallback("__getCurrentTime", videoElement.getCurrentTime);
        ExternalInterface.addCallback("__setCurrentTime", videoElement.setCurrentTime);
        ExternalInterface.addCallback("__getImageData", videoElement.getCurrentImageData);
        
        // Everything on the Flash side in initialized, notifiy the page:
        ExternalInterface.call("HTMLVideoElement.__vids["+flashvars.id+"].__swfInit");
    }
}
