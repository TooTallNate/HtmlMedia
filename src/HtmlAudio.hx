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
import flash.events.Event;
import flash.events.IOErrorEvent;
import flash.events.SecurityErrorEvent;
import flash.events.ProgressEvent;
import flash.external.ExternalInterface;

class HtmlAudio {
    public static var sounds:Array<HTMLAudioElement> = new Array();
    
    public static function IS_AUDIO_BRIDGE() {
        return true;
    }
    
    /* Called from JavaScript; HTMLAudioElement#load.
     * Should create a new HTMLAudioElement AS object, and begin loading
     * the specified resource. Creating an HTMLAudioElement in Flash is
     * deferred until HTMLAudioElement#load is called by the webpage.
     * 
     * @return The array index of the new HTMLAudioElement, which should be
     *      matched in the HTMLAudioElement.__swfSounds Array in JavaScript.
     */
    public static function createSound(src:String, volume:Float) {
        var fallbackId : Int = sounds.length;
        var a : HTMLAudioElement = new HTMLAudioElement(fallbackId, src, volume);
        sounds.push(a);
        return fallbackId; // Return the index of the new Sound in the array
    }
    
    // ExternalInterface functions available to JavaScript
    public static function load(index:Int, src:String) {
        var sound:HTMLAudioElement = sounds[index];
        sound.load(src);
    }
    
    public static function play(index:Int) {
        var sound:HTMLAudioElement = sounds[index];
        sound.play();
    }
    
    public static function pause(index:Int) {
        var sound:HTMLAudioElement = sounds[index];
        sound.pause();
    }
    
    public static function setVolume(index:Int, volume:Float) {
        var sound:HTMLAudioElement = sounds[index];
        sound.setVolume(volume);
    }
    
    public static function getCurrentTime(index:Int) {
        return sounds[index].getCurrentTime();
    }
    
    public static function setCurrentTime(index:Int, time:Float) {
        sounds[index].setCurrentTime(time);
    }
    




    public static function main() {
        ExternalInterface.addCallback("IS_AUDIO_BRIDGE", IS_AUDIO_BRIDGE);
        ExternalInterface.addCallback("__createSound", createSound);
        ExternalInterface.addCallback("__load", load);
        ExternalInterface.addCallback("__play", play);
        ExternalInterface.addCallback("__pause", pause);
        ExternalInterface.addCallback("__setVolume", setVolume);
        ExternalInterface.addCallback("__getCurrentTime", getCurrentTime);
        ExternalInterface.addCallback("__setCurrentTime", setCurrentTime);
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
