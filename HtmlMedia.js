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
        IE_HTC_PATH = "HTMLMediaElement.htc",

    // Dont modify below here though!
        REGEXP_FILENAME_MP3 = /\.mp3(\?.*)?$/i,
        REGEXP_MIMETYPE_MP3 = /^audio\/(?:x-)?(?:mp(?:eg|3))\s*;?/i,
        documentHead = document.getElementsByTagName("head")[0],
        isIE = !!document.attachEvent && !(Object.prototype.toString.call(window.opera) == '[object Opera]');
    
    function nativeCheckComplete(canPlayNativeMp3, error) {
        if (!canPlayNativeMp3) {
 
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
            function fireMediaEvent(eventName) {
                var ev = document.createEvent("Events");
                ev.initEvent(eventName, true, true);
                this.dispatchEvent(ev);
            }
    
    
            // There's two cases for HTMLMediaElement: the user agent natively
            // implements it or it doesn't. If it does, then we need to augment the
            // functions in the prototype to use our wrapper if required.
            if (!window.HTMLMediaElement) {
                
                if (isIE) {
                    // For IE to fire custom events, they must be defined in an HTC file,
                    // and set as a CSS behavior on the element. Adding this essentially
                    // adds the internal '__fireMediaEvent' to <audio> and <video> nodes.
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
                
                
                
                // IE doesn't support __defineSetter__, but we will use 'onpropertychange'
                // instead. The event fires every time ANY prop on the element gets changed.
                function iePropertyChange() {
                    if (event.propertyName.indexOf('.') >= 0) return;
                    //console.log(event.propertyName + " changed to: " + this[event.propertyName]);
                    var prop = event.propertyName, propSetter = this["__" + prop + "Set"];
                    if (propSetter) propSetter.call(this, this[prop]);
                }
                function cloneNode(deep) {
                    var clone = this.__cloneNode(deep), nodeName = this.nodeName.toLowerCase();
                    if (nodeName === "audio") return new HTMLAudioElement(clone);
                    if (nodeName === "video") return new HTMLVideoElement(clone);
                    //return clone; Should never happen
                }
                function HTMLMediaElement(element) {
                    if (element) {
                        for (var i in this) {
                            try {
                                element[i] = this[i];
                            } catch(ex) {
                                //console.log("Error setting '" + i + "' on <audio> node");
                            }
                        }
                        // The cloneNode function needs to call the appropriate
                        // HTMLMediaElement constructor as well.
                        if (!element.__cloneNode) element.__cloneNode = element.cloneNode;
                        element.cloneNode = cloneNode;

                        if (!isIE) {
                            // Browser's other than IE need to get the internally
                            // used '__fireMediaEvent' here. IE gets it from the HTC file
                            element.__fireMediaEvent = fireMediaEvent;
                        } else {
                            element.style.behavior = "url("+IE_HTC_PATH+")";
                        }
                        this.__initGettersSetters(element);
                    }
                }
                HTMLMediaElement.prototype = {
                    // error state
                    //readonly attribute MediaError error;
                    error: null,
                    
                    // network state
                    //         attribute DOMString src;
                    src: "",
                    __src: "",
                    //readonly attribute DOMString currentSrc;
                    currentSrc: "",
                    NETWORK_EMPTY: 0,
                    NETWORK_IDLE: 1,
                    NETWORK_LOADING: 2,
                    NETWORK_LOADED: 3,
                    NETWORK_NO_SOURCE: 4,
                    //readonly attribute unsigned short networkState;
                    networkState: 0,
                    __networkState: 0,
                    //         attribute DOMString preload;
                    preload: null,
                    //readonly attribute TimeRanges buffered;
                    buffered: null,
                    //void load();
                    load: function() {
                        // Overridden by HTMLAudioElement & HTMLVideoElement
                    },
                    //DOMString canPlayType(in DOMString type);
                    canPlayType: function() {
                        return "";
                    },

                    // ready state
                    HAVE_NOTHING: 0,
                    HAVE_METADATA: 1,
                    HAVE_CURRENT_DATA: 2,
                    HAVE_FUTURE_DATA: 3,
                    HAVE_ENOUGH_DATA: 4,
                    //readonly attribute unsigned short readyState;
                    readyState: 0,
                    __readyState: 0,
                    //readonly attribute boolean seeking;
                    seeking: false,

                    // playback state
                    //         attribute float currentTime;
                    currentTime: 0.0,
                    __currentTime: 0.0,
                    //readonly attribute float startTime;
                    startTime: 0.0,
                    //readonly attribute float duration;
                    duration: NaN,
                    //readonly attribute boolean paused;
                    paused: true,
                    //         attribute float defaultPlaybackRate;
                    defaultPlaybackRate: 1.0,
                    //         attribute float playbackRate;
                    playbackRate: 1.0,
                    //readonly attribute TimeRanges played;
                    played: null,
                    //readonly attribute TimeRanges seekable;
                    seekable: null,
                    //readonly attribute boolean ended;
                    ended: false,
                    //         attribute boolean autoplay;
                    autoplay: false,
                    //         attribute boolean loop;
                    loop: false,
                    //void play();
                    play: function() {
                        
                    },
                    //void pause();
                    pause: function() {
                        
                    },

                    // controls
                    //         attribute boolean controls;
                    controls: false,
                    //         attribute float volume;
                    volume: 1.0,
                    __volume: 1.0,
                    //         attribute boolean muted;
                    muted: false,
                    __muted: false,
                    
                    __initGettersSetters: function(element) {
                        if (isIE) {
                            // 'onpropertychange' won't fire unless the element
                            // is somewhere in the DOM, append to <head> first.
                            documentHead.appendChild(element);
                            //element.attachEvent("onpropertychange", iePropertyChange); //Wrong scope, less obtrusive
                            element.onpropertychange = iePropertyChange;
                        } else {
                            element.__defineGetter__("currentTime", this.__currentTimeGet);
                            element.__defineGetter__("muted", this.__mutedGet);
                            element.__defineGetter__("src", this.__srcGet);
                            element.__defineGetter__("volume", this.__volumeGet);
                            
                            element.__defineSetter__("currentTime", this.__currentTimeSet);
                            element.__defineSetter__("muted", this.__mutedSet);
                            element.__defineSetter__("src", this.__srcSet);
                            element.__defineSetter__("volume", this.__volumeSet);
                        }
                    },
                    
                    __currentTimeGet: function() { return this.__currentTime; },
                    __mutedGet: function() { return this.__muted; },
                    __srcGet: function() { return this.__src; },
                    __volumeGet: function() { return this.__volume; },

                    __currentTimeSet: function(curTime) {
                        this.__currentTime = curTime;
                    },
                    __mutedSet: function(muted) {
                        if (typeof(muted) !== 'boolean') {
                            this.muted = this.__muted;
                        } else if (this.__muted !== muted) {
                            // TODO: Send mute message to fallback
                            this.__muted = muted;
                            this.__fireMediaEvent("volumechange");                            
                        }
                    },
                    __srcSet: function(src) {
                        //console.log("src: " + src);
                        this.__src = src;
                        if (src !== "" && src.indexOf(':') < 0) {
                            RELATIVE_URL_RESOLVER.src = src;
                            this.src = RELATIVE_URL_RESOLVER.src;
                        }
                    },
                    __volumeSet: function(vol) {
                        if (vol > 1 || vol < 0) {
                            this.volume = this.__volume;
                            throw new Error("INDEX_SIZE_ERROR: DOM Exception 1");
                        } else if (this.__volume !== vol) {
                            //console.log("volume: " + vol);
                            if (this.__fallbackId != undefined) {
                                HTMLAudioElement.__swf.__setVolume(this.__fallbackId, vol);
                            }
                            this.__volume = vol;
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
                HTMLAudioElement.prototype.toString = function() {
                    return "[object HTMLAudioElement]";
                };
                HTMLAudioElement.prototype.load = function() {
                    this.currentSrc = this.src;
                    if (!this.__fallbackId) {
                        this.__fallbackId = HTMLAudioElement.__swf.__createSound(this.src, this.volume);
                        if (!HTMLAudioElement.__swfSounds) HTMLAudioElement.__swfSounds = [];
                        HTMLAudioElement.__swfSounds[this.fallbackId] = this;
                    } else {
                        HTMLAudioElement.__swf.__load(this.src);
                    }
                };
                HTMLAudioElement.prototype.play = function() {
                    if (this.networkState === this.NETWORK_EMPTY) {
                        // Invoke 'resource selection algorithm'
                    }
                    if (this.ended && this.playbackRate >= 0) {
                        this.currentTime = this.startTime;
                    }
                    if (this.paused === true) {
                        this.paused = false;
                        this.__fireMediaEvent("play");
                        // TODO Finish
                    }
                    HTMLAudioElement.__swf.__play(this.__fallbackId);
                }
                HTMLAudioElement.prototype.pause = function() {
                    HTMLAudioElement.__swf.__pause(this.__fallbackId);
                }
                window.HTMLAudioElement = HTMLAudioElement;
                
                var nativeCreateElement = document.createElement;
                document.createElement = function() {
                    var ele = nativeCreateElement.apply(document, arguments);
                    if (ele.nodeName.toLowerCase() === "audio") return new HTMLAudioElement(ele);
                    return ele;
                };
            }
            // We want to augment both the native and our custom 'canPlayType'
            // functions to check the argument for valid MP3 mime-types.
            var origCanPlayType = HTMLAudioElement.prototype.canPlayType;
            function canPlayType() {
                if (REGEXP_MIMETYPE_MP3.test(arguments[0])) return "probably";
                return origCanPlayType.apply(this, arguments);
            }
            HTMLAudioElement.prototype.canPlayType = canPlayType;
            
            
            
            
            
            // The HTMLAudioElement has a convience constructor Audio. It must
            // be implemented from scratch, or wrapped to integrate with the
            // fallback mechanism when needed.
            if (window.Audio && (new Audio("")) instanceof window.HTMLAudioElement) {
                var nativeAudio = window.Audio;
                function Audio() {
                    console.log("Calling 'Audio' constructor");
                    var a, src = arguments[0];
                    if (src) a = new nativeAudio(a);
                    else a = new nativeAudio();
                    //HTMLAudioElement.__integrateFallback(a);
                    return a;
                }
                window.Audio = Audio;
            } else {
                function Audio() {
                    if (!(this instanceof arguments.callee)) {
                        var message = "DOM object constructor cannot be called as a function.";
                        if (window.TypeError) throw new TypeError(message);
                        else throw new Error(message);
                    }
                    var a = document.createElement("audio");
                    a.preload = "auto";
                    if (arguments[0]) {
                        a.src = arguments[0];
                    }
                    return a;
                }
                Audio.prototype = HTMLAudioElement.prototype;
                window.Audio = Audio;
            }
            
            
            
            
            
            // Embed the fallback SWF into the page
            function embedSwf() {
                console.log("embedding SWF at: " + AUDIO_SWF_PATH);
                var container = document.createElement("div"), id = "HtmlAudio";
                container.id = id;
                document.body.appendChild(container);
                swfobject.embedSWF(AUDIO_SWF_PATH, id, 400, 400, "10");
            }
            
            function swfLoaded() {
                console.log("swf embedded, called from EI");
            }
            HTMLAudioElement.__swfLoaded = swfLoaded;
            
            function fixHtmlTags() {
                var audioNodes = document.getElementsByTagName("audio"), i;
                console.log(audioNodes.length + " <audio> nodes in the document.");
                
            }
            
            swfobject.addDomLoadEvent(function() {
                console.log("DOMContentLoaded");
                embedSwf();
                fixHtmlTags();
            });
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
