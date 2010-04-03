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
        this.stream.client = this;
        this.stream.soundTransform = this.transform;
        this.video = new Video();
        this.video.attachNetStream(this.stream);
        
    }
    
    public override function setVolume(vol: Float) {
        super.setVolume(vol);
    }
    
    public function getVid() {
        return this.video;
    }
    
    private function onMetaData(metadata) {
        
    }

    public static function main() {
        var flashvars : Dynamic<String> = flash.Lib.current.loaderInfo.parameters;
        var video : HTMLVideoElement = new HTMLVideoElement(Std.parseInt(flashvars.id), flashvars.src, Std.parseFloat(flashvars.volume), flashvars.muted.toLowerCase() == "true");
        flash.Lib.current.addChild(video.getVid());
    }
}
