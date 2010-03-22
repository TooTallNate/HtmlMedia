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
(function() {
    // Feel free to change the paths to appropriate for your environment:
    var AUDIO_SWF_PATH = "HtmlAudio.swf",
        VIDEO_SWF_PATH = "HtmlVideo.swf",
        IE_HTC_PATH    = "HTMLMediaElement.htc",

    // Dont modify below here though!
        REGEXP_FILENAME_MP3 = /\.mp3(\?.*)?$/i,
        REGEXP_MIMETYPE_MP3 = /^audio\/(?:x-)?(?:mp(?:eg|3))\s*;?/i,
        REGEXP_MIMETYPE_FLV = /^video\/(?:x-)?(?:flv)\s*;?/i,
        HAS_NATIVE_AUDIO = false,
        HAS_NATIVE_VIDEO = false,
        USE_FALLBACK_MP3 = false,
        USE_FALLBACK_FLV = true,
        documentHead = document.getElementsByTagName("head")[0],
        isIE = !!document.attachEvent && Object.prototype.toString.call(window.opera) !== '[object Opera]',
        MEDIA_EVENTS = [
            "loadstart",
            "progress",
            "suspend",
            "abort",
            "error",
            "emptied",
            "stalled",
            "play",
            "pause",
            "loadedmetadata",
            "loadeddata",
            "waiting",
            "playing",
            "canplay",
            "canplaythrough",
            "seeking",
            "seeked",
            "timeupdate",
            "ended",
            "ratechange",
            "durationchange",
            "volumechange"
        ];

    // Extends the properties of one 'source' Object onto 'destination'
    function extend(destination, source) {
        for (var property in source)
            destination[property] = source[property];
        return destination;
    }
        
    function nativeCheckComplete(canPlayNativeMp3, error) {

        if (!canPlayNativeMp3) {
            USE_FALLBACK_MP3 = true;
            
            if (isIE) {
                // IE behaves strangely for html tags it doesn't recognize
                // like audio, video, and source. The workaround is to create
                // said node via JavaScript before the HTML parser finds them
                // in your HTML code.
                document.createElement("audio");
                document.createElement("video");
                document.createElement("source");
            }
            
            // http://dev.w3.org/html5/spec/video.html#timeranges
            function TimeRanges() {
                this.length = 0;
                this.starts = [];
                this.ends = [];
            }
            TimeRanges.prototype = {
                start: function(index) {
                    return this.starts[index];
                },
                end: function(index) {
                    return this.ends[index];
                },
                add: function(start, end) {
                    this.starts.push(start);
                    this.ends.push(end);
                    this.length++;
                }
            };
            if (!window.TimeRanges) window.TimeRanges = TimeRanges;
    
            // http://dev.w3.org/html5/spec/video.html#mediaerror
            function MediaError(code) {
                this.code = code;
            }
            MediaError.prototype = {
                code: -1,
                MEDIA_ERR_ABORTED: 1,
                MEDIA_ERR_NETWORK: 2,
                MEDIA_ERR_DECODE: 3,
                MEDIA_ERR_SRC_NOT_SUPPORTED: 4
            };
            if (!window.MediaError) window.MediaError = MediaError;

            // Browsers other than IE will use the W3C events model to fire media events
            function fireMediaEvent(eventName, bubbles, cancelable) {
                var ev = document.createEvent("Events"),
                    func = this["on"+eventName];
                ev.initEvent(eventName, bubbles || false, cancelable || false);
                this.dispatchEvent(ev);
                if (typeof func === 'function') {
                    func.call(this, ev);
                }
            }
    
    
            // There's two cases for HTMLMediaElement: the user agent natively
            // implements it or it doesn't. If it does, then we need to augment the
            // functions in the prototype to use our wrapper if required.
            if (window.HTMLMediaElement) {
            } else {
            
                if (isIE) {
                    // For IE to fire custom events and use real getters and setters,
                    // they must be defined in an HTC file and applied via CSS 'behavior'.
                    var style = document.createElement("style");
                    style.type = "text/css";
                    style.styleSheet.cssText = "audio, video { behavior:url("+IE_HTC_PATH+"); }";
                    documentHead.appendChild(style);
                }
                               
                
                
                // Accepts a HTMLElement with a settable 'src' property. Returns 
                // the element if it resolves relative paths to absolute of
                // the current document, null otherwise.
                function resolvesSrc(element) {
                    element.src="";
                    return element.src.indexOf(window.location.protocol) === 0 ? element : null;
                }
                // We send the absolute path to the fallback player, and need some
                // native browser way of resolving relative URLs. Check a <script> first,
                // since it won't make an HTTP request until it's placed in the DOM,
                // some old browsers won't do that, so fall back to an <img>, which WILL
                // fire an HTTP request when it's 'src' is set (bad).
                var RELATIVE_URL_RESOLVER = resolvesSrc(document.createElement("script")) || new Image();                
                
                
                
                function cloneNode(deep) {
                    var clone = this.__cloneNode(deep), nodeName = clone.nodeName.toLowerCase();
                    if (nodeName === "audio") return new HTMLAudioElement(clone);
                    if (nodeName === "video") return new HTMLVideoElement(clone);
                    //return clone; Should never happen
                }
                function defineGettersSetters(element) {
                    element.__defineGetter__("error",       element.__errorGet);
                    element.__defineGetter__("src",         element.__srcGet);
                    element.__defineGetter__("currentSrc",  element.__currentSrcGet);
                    element.__defineGetter__("networkState",element.__networkStateGet);
                    element.__defineGetter__("readyState",  element.__readyStateGet);
                    element.__defineGetter__("seeking",     element.__seekingGet);
                    element.__defineGetter__("currentTime", element.__currentTimeGet);
                    element.__defineGetter__("startTime",   element.__startTimeGet);
                    element.__defineGetter__("duration",    element.__durationGet);
                    element.__defineGetter__("paused",      element.__pausedGet);
                    element.__defineGetter__("ended",       element.__endedGet);
                    element.__defineGetter__("controls",    element.__controlsGet);
                    element.__defineGetter__("volume",      element.__volumeGet);
                    element.__defineGetter__("muted",       element.__mutedGet);

                    element.__defineSetter__("src",         element.__srcSet);
                    element.__defineSetter__("currentTime", element.__currentTimeSet);
                    element.__defineSetter__("controls",    element.__controlsSet);
                    element.__defineSetter__("volume",      element.__volumeSet);
                    element.__defineSetter__("muted",       element.__mutedSet);
                }
                function HTMLMediaElement(element) {
                    if (element) {

                        // Copy the properties from 'this' to the 'element'
                        extend(element, this);

                        if (!isIE) {
                            // Browser's other than IE need to get the internally
                            // used '__fireMediaEvent' here. IE gets it from the HTC file.
                            element.__fireMediaEvent = fireMediaEvent;
                            defineGettersSetters(element);
                            
                            // TODO: parse current attributes, add as DOM properties
                            var src = element.getAttribute("src"),
                                preload = element.getAttribute("preload"),
                                autoplay = element.getAttribute("autoplay"),
                                loop = element.getAttribute("loop"),
                                controls = element.getAttribute("controls"),
                                i=0,
                                l=MEDIA_EVENTS.length, eventName, eventCode;
                            if (src) element.src = src;
                            if (preload) element.preload = preload;
                            if (autoplay) element.autoplay = !!autoplay;
                            if (loop) element.loop = !!loop;
                            if (controls) element.controls = !!controls;
                            for (; i<l; i++) {
                                eventName = "on"+MEDIA_EVENTS[i];
                                eventCode = element.getAttribute(eventName);
                                if (eventCode) {
                                    element[eventName] = new Function("event", eventCode);
                                }
                            }
                        } else {
                            // Once we ensure that the node is appended somewhere in the
                            // DOM, then we can access the HTC properties and methods.
                            if (!element.parentNode) documentHead.appendChild(element);
                            element.__initialize();
                        }

                        // The cloneNode function needs to call the appropriate
                        // HTMLMediaElement constructor as well.
                        if (!element.__cloneNode) element.__cloneNode = element.cloneNode;
                        element.cloneNode = cloneNode;
                    }
                }
                HTMLMediaElement.prototype = {

                    // readonly attribute MediaError error;
                    __error: null,
                    __errorGet: function() { return this.__error; },
                    
                    // attribute DOMString src;
                    __src: "",
                    __srcGet: function() { return this.__src; },
                    __srcSet: function(src) {
                        if (src !== "" && src.indexOf(':') < 0) {
                            RELATIVE_URL_RESOLVER.src = src;
                            src = RELATIVE_URL_RESOLVER.src;
                        }
                        this.__src = src;
                        //console.log("src: " + src);
                    },
                    
                    // readonly attribute DOMString currentSrc;
                    __currentSrc: "",
                    __currentSrcGet: function() { return this.__currentSrc; },
                    
                    // network state
                    NETWORK_EMPTY: 0,
                    NETWORK_IDLE: 1,
                    NETWORK_LOADING: 2,
                    NETWORK_LOADED: 3,
                    NETWORK_NO_SOURCE: 4,
                    
                    // readonly attribute unsigned short networkState;
                    __networkState: 0,
                    __networkStateGet: function() { return this.__networkState; },

                    // attribute DOMString preload;
                    preload: null,

                    // readonly attribute TimeRanges buffered;
                    buffered: null,

                    // void load();
                    load: function() {
                        // Overridden by HTMLAudioElement & HTMLVideoElement
                    },

                    // DOMString canPlayType(in DOMString type);
                    canPlayType: function() {
                        return "";
                    },

                    // ready state
                    HAVE_NOTHING: 0,
                    HAVE_METADATA: 1,
                    HAVE_CURRENT_DATA: 2,
                    HAVE_FUTURE_DATA: 3,
                    HAVE_ENOUGH_DATA: 4,
                    
                    // readonly attribute unsigned short readyState;
                    __readyState: 0,
                    __readyStateGet: function() { return this.__readyState; },
                    
                    // readonly attribute boolean seeking;
                    __seeking: false,
                    __seekingGet: function() { return this.__seeking; },

                    // attribute float currentTime;
                    __currentTimeGet: function() {
                        return this.__fallbackId != undefined ?
                            HTMLAudioElement.__swf.__getCurrentTime(this.__fallbackId) :
                            0;
                    },
                    __currentTimeSet: function(time) {
                        if (this.__fallbackId != undefined)
                            HTMLAudioElement.__swf.__setCurrentTime(this.__fallbackId, time);
                    },
                    
                    
                    //readonly attribute float startTime;
                    __startTime: 0.0,
                    __startTimeGet: function() { return this.__startTime; },
                    
                    //readonly attribute float duration;
                    __duration: NaN,
                    __durationGet: function() { return this.__duration; },
                    
                    //readonly attribute boolean paused;
                    __paused: true,
                    __pausedGet: function() { return this.__paused; },
                    
                    // attribute float defaultPlaybackRate;
                    defaultPlaybackRate: 1.0,
                    
                    // attribute float playbackRate;
                    playbackRate: 1.0,
                    
                    // readonly attribute TimeRanges played;
                    played: null,
                    
                    // readonly attribute TimeRanges seekable;
                    seekable: null,
                    
                    // readonly attribute boolean ended;
                    __ended: false,
                    __endedGet: function() { return this.__ended; },
                    
                    // attribute boolean autoplay;
                    autoplay: false,
                    
                    // attribute boolean loop;
                    loop: false,
                    
                    // void play();
                    play: function() {
                        
                    },
                    
                    // void pause();
                    pause: function() {
                        
                    },

                    // attribute boolean controls;
                    __controls: false,
                    __controlsGet: function() { return this.__controls; },
                    __controlsSet: function(bool) {
                        this.__controls = bool;
                    },
                    
                    // attribute float volume;
                    __volume: 1.0,
                    __volumeGet: function() { return this.__volume; },
                    __volumeSet: function(vol) {
                        if (vol > 1 || vol < 0) {
                            throw new Error("INDEX_SIZE_ERROR: DOM Exception 1");
                        } else if (this.__volume !== vol) {
                            this.__volume = vol;
                            if (this.__fallbackId != undefined) {
                                HTMLAudioElement.__swf.__setVolume(this.__fallbackId, vol);
                            }
                            this.__fireMediaEvent("volumechange");
                        }
                    },
                    
                    // attribute boolean muted;
                    __muted: false,
                    __mutedGet: function() { return this.__muted; },
                    __mutedSet: function(muted) {
                        muted = !!muted;
                        if (this.__muted != muted) {
                            this.__muted = muted;
                            // TODO: Send mute message to fallback
                            this.__fireMediaEvent("volumechange");                            
                        }
                    },                    

                    toString: function() {
                        return "[object HTMLMediaElement]";
                    }
                };
                window.HTMLMediaElement = HTMLMediaElement;
            }
            








            // If the user agent has HTMLAudioElement defined in the window,
            // then we must augment some prototypes, and overwrite a few
            // functions to transparently use the Flash fallback when needed.
            if (window.HTMLAudioElement) {
                HAS_NATIVE_AUDIO = true;
                
                var nativeLoad = HTMLAudioElement.prototype.load;
                HTMLAudioElement.prototype.load = function() {
                    console.log("calling overriden HTMLAudioElement#load");
                    nativeLoad.apply(this, arguments);
                }

            } else {
                
            // User agent hasn't implemented HTMLAudioElement, we must
            // implement our own with regular JS, following the spec.
                function HTMLAudioElement() {
                    HTMLMediaElement.apply(this, arguments);
                    return arguments[0];
                }
                HTMLAudioElement.prototype = new HTMLMediaElement;
                extend(HTMLAudioElement.prototype, {
                    toString: function() {
                        return "[object HTMLAudioElement]";
                    },
                    load: function() {
                        this.__currentSrc = this.src;
                        if (!this.__fallbackId) {
                            this.__fallbackId = HTMLAudioElement.__swf.__createSound(this.src, this.volume);
                            if (!HTMLAudioElement.__swfSounds) HTMLAudioElement.__swfSounds = [];
                            HTMLAudioElement.__swfSounds.push(this);
                        } else {
                            HTMLAudioElement.__swf.__load(this.src);
                        }
                    },
                    play: function() {
                        if (this.networkState === this.NETWORK_EMPTY) {
                            // Invoke 'resource selection algorithm'
                        }
                        if (this.ended && this.playbackRate >= 0) {
                            this.currentTime = this.startTime;
                        }
                        if (this.paused === true) {
                            this.__paused = false;
                            this.__fireMediaEvent("play");
                            // TODO Finish
                        }
                        HTMLAudioElement.__swf.__play(this.__fallbackId);
                    },
                    pause: function() {
                        HTMLAudioElement.__swf.__pause(this.__fallbackId);
                    }
                });
                window.HTMLAudioElement = HTMLAudioElement;


                // Make 'document.createElement()' return proper <audio> nodes
                var nativeCreateElement = document.createElement, useApply = true;
                try {
                    nativeCreateElement.apply(document, ["div"]);
                } catch(e) {
                    // IE6 doesn't like calling this with 'apply',
                    // but works fine if called directly.
                    useApply = false;
                }
                document.createElement = function() {
                    var ele = useApply ? nativeCreateElement.apply(this, arguments) : nativeCreateElement(arguments[0]),
                        nodeName = ele.nodeName.toLowerCase();
                    if (nodeName === "audio") new HTMLAudioElement(ele);
                    return ele;
                };



                // The HTMLAudioElement has a convience constructor: Audio.
                function Audio() {
                    if (!(this instanceof arguments.callee)) {
                        throw new TypeError("DOM object constructor cannot be called as a function.");
                    }
                    var a = document.createElement("audio"), src = arguments[0];
                    a.preload = "auto";
                    if (src) a.src = src;
                    return a;
                }
                Audio.prototype = HTMLAudioElement.prototype;
                window.Audio = Audio;
            }
            // We want to augment both the native and our custom 'canPlayType'
            // functions to check the argument for valid MP3 mime-types.
            var origCanPlayType = HTMLAudioElement.prototype.canPlayType;
            function canPlayType() {
                if (REGEXP_MIMETYPE_MP3.test(arguments[0])) return "probably";
                return origCanPlayType.apply(this, arguments);
            }
            HTMLAudioElement.prototype.canPlayType = canPlayType;
            
            
            
            
            // Embed the fallback SWF into the page
            function embedSwf() {
                console.log("embedding SWF at: " + AUDIO_SWF_PATH);
                var container = document.createElement("div"),
                    id = "HtmlAudio",
                    flashvars = {},
                    params = {
                        allowScriptAccess: "always"
                    },
                    attributes = {
                        style: "position:fixed; top:0px; right:0px;"
                    };
                container.id = id;
                document.body.appendChild(container);
                swfobject.embedSWF(AUDIO_SWF_PATH, id, 1, 1, "10", false, flashvars, params, attributes);
            }
            
            function swfLoaded() {
                console.log("'HtmlAudio.swf' embedded, called from EI");
                // TODO: Process fallback queue.
            }
            HTMLAudioElement.__swfLoaded = swfLoaded;
            
            function fixHtmlTags() {
                var audioNodes = document.getElementsByTagName("audio"), i, node;
                console.log(audioNodes.length + " <audio> nodes in the document.");
                for (i=0; i<audioNodes.length; i++) {
                    node = audioNodes[i];
                    if (!HAS_NATIVE_AUDIO) {
                        new HTMLAudioElement(node);
                        if (node.hasAttribute && node.hasAttribute("_moz-userdefined")) {
                            //console.log("removing '_moz-userdefined' from node");
                            node.removeAttribute("_moz-userdefined");
                        }
                    } else {
                        console.log(node.error);
                        //HTMLAudioElement.__attemptFallback(audioNodes[i]);
                    }
                }
            }
            
            
            
            function init() {
                if (arguments.callee.done) return;
                arguments.callee.done = true;
                // do your thing
                embedSwf();
                fixHtmlTags();
            }
            if (document.addEventListener) {
                document.addEventListener('DOMContentLoaded', init, false);
            }
            (function() {
                /*@cc_on
                try {
                    document.body.doScroll('up');
                    return init();
                } catch(e) {}
                /*@if (false) @*/
                if (/loaded|complete/.test(document.readyState)) return init();
                /*@end @*/
                if (!init.done) setTimeout(arguments.callee, 30);
            })();

            if (window.addEventListener) {
                window.addEventListener('load', init, false);
            } else if (window.attachEvent) {
                window.attachEvent('onload', init);
            }
        } else {
            /* If we get here, then the user agent natively supports both
             * the HTML5 Audio API, as well as MP3 decoding support, so this
             * script can bail and do nothing!
             */
        }
    }
    
    /* From http://gist.github.com/253174
     *
     * Detect if the browser can play MP3 audio using native HTML5 Audio.
     * Invokes the callack function with first parameter is the boolean success
     * value; if that value is false, a second error parameter is passed. This error
     * is either HTMLMediaError or some other DOMException or Error object.
     * Note the callback is likely to be invoked asynchronously!
     * @param {function(boolean, Object|undefined)} callback
     **/
    (function(callback){
        try {
            var audio = new Audio();
            // Shortcut which doesn't work in Chrome (always returns ""); pass through
            // if "maybe" to do asynchronous check by loading MP3 data: URI
            if(audio.canPlayType('audio/mpeg') == "probably")
                callback(true);

            // If this event fires, then MP3s can be played
            audio.addEventListener('canplaythrough', function(e) {
                callback(true);
            }, false);

            // If this is fired, then client can't play MP3s
            audio.addEventListener('error', function(e){
                callback(false, this.error)
            }, false);

            // Smallest base64-encoded MP3 I could come up with (<0.000001 seconds long)
            audio.src = "data:audio/mpeg;base64,/+MYxAAAAANIAAAAAExBTUUzLjk4LjIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
            audio.load();
        } catch(e) {
            callback(false, e);
        }
    })(nativeCheckComplete);
})();
