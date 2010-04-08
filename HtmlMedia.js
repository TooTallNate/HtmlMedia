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
(function(w,d) {
    var FLASH_SUPPORTED_AUDIO = /\.(mp3|mp4|m4a|mp4a|aac)(\?.*)?$/i,
        FLASH_SUPPORTED_VIDEO = /\.(flv|mp4|m4v|mp4v|mov|3gp|3g2)(\?.*)?$/i,
        REGEXP_MIMETYPE_MP3 = /^audio\/(?:x-)?(?:mp(?:eg|3))\s*;?/i,
        REGEXP_MIMETYPE_FLV = /^video\/(?:x-)?(?:flv)\s*;?/i,
        HAS_NATIVE_AUDIO  = !!w.HTMLAudioElement,
        HAS_NATIVE_VIDEO  = !!w.HTMLVideoElement,
        HEAD = d.getElementsByTagName("head")[0],
        isIE = !!d.attachEvent && Object.prototype.toString.call(w.opera) !== '[object Opera]',
        HAS_CANVAS = CanvasRenderingContext2D && CanvasRenderingContext2D.prototype.getImageData && CanvasRenderingContext2D.prototype.putImageData,
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
            "volumechange",
            "fallback" // Non-standard event fired when a node falls back to Flash
        ];

    // Copies the properties from 'source' onto 'destination'
    function extend(destination, source) {
        for (var property in source)
            destination[property] = source[property];
        return destination;
    }
    
    
    if (isIE) {
        // IE behaves strangely for html tags it doesn't recognize
        // like audio, video, and source. The workaround is to create
        // said node via JavaScript before the HTML parser finds them
        // in your HTML code.
        d.createElement("audio");
        d.createElement("video");
        d.createElement("source");
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
    if (!w.TimeRanges) w.TimeRanges = TimeRanges;
    
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
    if (!w.MediaError) w.MediaError = MediaError;

    // Browsers other than IE will use the W3C events model to fire media events
    function fireMediaEvent(eventName) {
        var ev = d.createEvent("Events"),
            func = this["on"+eventName];
        ev.initEvent(eventName, false, false);
        this.__extendEvent(ev, arguments);
        this.dispatchEvent(ev);
        if (typeof func === 'function') {
            func.call(this, ev);
        }
    }

    // Accepts a HTMLElement with a settable 'src' property. Returns 
    // the element if it resolves relative paths to absolute of
    // the current document, null otherwise.
    function resolvesSrc(element) {
        element.src="";
        return element.src.indexOf(w.location.protocol) === 0 ? element : null;
    }
    // We send the absolute path to the fallback player, and need some
    // native browser way of resolving relative URLs. Check a <script> first,
    // since it won't make an HTTP request until it's placed in the DOM,
    // some old browsers won't do that, so fall back to an <img>, which WILL
    // fire an HTTP request instantly when it's 'src' is set (bad).
    var RELATIVE_URL_RESOLVER = resolvesSrc(d.createElement("script")) || new Image();                


    function cloneNode(deep) {
        var clone = this.__cloneNode(deep), nodeName = clone.nodeName.toLowerCase();
        if (nodeName === "audio") return new HTMLAudioElement(clone);
        if (nodeName === "video") return new HTMLVideoElement(clone);
        //return clone; Should never happen
    }
    function setAttribute() {
        var attr = arguments[0], value = arguments[1], rtn = this.__setAttribute(attr, value);
        switch (attr) {
            case "src":
                this.src = value;
                break;
            case "preload":
                this.preload = value;
                break;
            case "autoplay":
                this.autoplay = true;
                break;
            case "loop":
                this.loop = true;
                break;
            case "controls":
                this.controls = true;
                break;
        }
        return rtn;
    }
    function removeAttribute() {
        var attr = arguments[0];
        switch (attr) {
            case "src":
                this.src = "";
                break;
            case "preload":
                this.preload = null;
                break;
            case "autoplay":
                this.autoplay = false;
                break;
            case "loop":
                this.loop = false;
                break;
            case "controls":
                this.controls = false;
                break;
        }
        return this.__removeAttribute(attr);
    }
    
    function HTMLMediaElement(element) {
        if (element) {
            // Copy the properties from 'this' to the 'element'
            extend(element, this);

            if (!isIE) {
                // Browser's other than IE need to get the internally
                // used '__fireMediaEvent' here. IE gets it from the HTC file.
                element.__fireMediaEvent = fireMediaEvent;
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
                element.__defineGetter__("buffered",    element.__bufferedGet);
                element.__defineGetter__("played",      element.__playedGet);
                element.__defineGetter__("seekable",    element.__seekableGet);

                element.__defineSetter__("src",         element.__srcSet);
                element.__defineSetter__("currentTime", element.__currentTimeSet);
                element.__defineSetter__("controls",    element.__controlsSet);
                element.__defineSetter__("volume",      element.__volumeSet);
                element.__defineSetter__("muted",       element.__mutedSet);
                            
                // http://dev.w3.org/html5/spec-author-view/common-microsyntaxes.html#boolean-attributes
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
                
                // Register all the media events from inital element
                for (; i<l; i++) {
                    eventName = "on"+MEDIA_EVENTS[i];
                    eventCode = element.getAttribute(eventName);
                    if (eventCode && !element[eventName]) {
                        //element[eventName] = new Function("event", eventCode);
                        element[eventName] = eval("(function() { return function "+eventName+"(event) { "+eventCode+" }; })()");
                    }
                }
            } else {
                // Add the behavior to the element. The element does not
                // need to be appended to the document when used with the
                // 'addBehavior' method.
                element.addBehavior(w.HTMLAudioElement.htcPath);
            }

            // The cloneNode function needs to call the appropriate
            // HTMLMediaElement constructor as well.
            if (!element.__cloneNode) element.__cloneNode = element.cloneNode;
            element.cloneNode = cloneNode;
            // removeAttribute and setAttribute need to look out for
            // specific cases (loop, src, etc.)
            if (!element.__setAttribute) element.__setAttribute = element.setAttribute;
            element.setAttribute = setAttribute;
            if (!element.__removeAttribute) element.__removeAttribute = element.removeAttribute;
            element.removeAttribute = removeAttribute;
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
        __bufferedGet: function() {
            var r = new TimeRanges();
            return r;
        },

        // void load();
        load: function() {
            if (this.__networkState === this.NETWORK_LOADING || this.__networkState === this.NETWORK_IDLE) {
                this.__fireMediaEvent("abort");
            }
            if (this.__networkState !== this.NETWORK_EMPTY) {
                this.__networkState = this.NETWORK_EMPTY;
                this.__readyState = this.HAVE_NOTHING;
                this.__paused = true;
                this.__seeking = false;
                this.__fireMediaEvent("emptied");
            }
            this.playbackRate = this.defaultPlaybackRate;
            this.__error = null;
            this.__resourceSelectionAlgorithm();
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
                w.HTMLAudioElement.__swf.__getCurrentTime(this.__fallbackId) :
                0;
        },
        __currentTimeSet: function(time) {
            if (this.__readyState === this.HAVE_NOTHING) {
                throw new Error("INVALID_STATE_ERR: DOM Exception 11");
            }
            // TODO: Abort any already running 'seeking' instances
            this.__seeking = true;
            this.__setCT(time);
            this.__fireMediaEvent("timeupdate");
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
        __playedGet: function() {
            var r = new TimeRanges();
            return r;
        },

        // readonly attribute TimeRanges seekable;
        __seekableGet: function() {
            var r = new TimeRanges();
            return r;
        },
                
        // readonly attribute boolean ended;
        __ended: false,
        __endedGet: function() { return this.__ended; },
                
        // attribute boolean autoplay;
        autoplay: false,
                
        // attribute boolean loop;
        loop: false,
                
        // void play();
        play: function() {
            if (this.__networkState === this.NETWORK_EMPTY) {
                this.__resourceSelectionAlgorithm();
            }
            if (this.__ended && this.playbackRate >= 0) {
                this.currentTime = this.startTime;
            }
            if (this.__paused === true) {
                this.__paused = false;
                this.__fireMediaEvent("play");
                if (this.__readyState === this.HAVE_NOTHING || this.__readyState === this.HAVE_METADATA || this.__readyState === this.HAVE_CURRENT_DATA) {
                    this.__fireMediaEvent("waiting");
                } else {
                    this.__fireMediaEvent("playing");
                }
                this.__play();
            }
        },
                
        // void pause();
        pause: function() {
            if (this.__networkState === this.NETWORK_EMPTY) {
                this.__resourceSelectionAlgorithm();
            }
            if (this.__paused === false) {
                this.__paused = true;
                this.__fireMediaEvent("timeupdate");
                this.__fireMediaEvent("pause");
                this.__pause();
            }
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
                    w.HTMLAudioElement.__swf.__setVolume(this.__fallbackId, vol);
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
                if (this.__fallbackId != undefined) {
                    w.HTMLAudioElement.__swf.__setMuted(this.__fallbackId, muted);
                }
                this.__fireMediaEvent("volumechange");                            
            }
        },
                
        __endedCallback: function() {
            if (this.loop) {
                this.currentTime = this.startTime;
            } else {
                this.__ended = true;
                this.__fireMediaEvent("timeupdate");
                this.__fireMediaEvent("ended");
            }
        },
        __errorCallback: function() {
                    
        },
        __metadataCallback: function(duration, width, height) {
            this.__readyState = this.HAVE_METADATA;
            this.__duration = duration;
            this.__fireMediaEvent("durationchange");
            this.__fireMediaEvent("loadedmetadata");
            this.currentTime = this.startTime;
        },
        __seekedCallback: function() {
                    
        },
        __extendEvent: function(ev, args) {
            var eventName = args[0];
            if (eventName === "progress") {
                // Copying Firefox's behavior by specifying
                // the bytes so far for 'progress' events
                ev.lengthComputable = true;
                ev.loaded = args[1];
                ev.total = args[2];
            }
        },

        __resourceSelectionAlgorithm: function() {
            this.__networkState = this.NETWORK_NO_SOURCE;
            // Asynchronously await a stable state
            var mode;
            var candidate;
            if (this.__src) {
                mode = "attribute";
            } else {
                var sources = this.getElementsByTagName("source");
                for (var i=0; i<sources.length; i++) {
                    if (sources[i].parentNode === this) {
                        mode = "children";
                        candidate = sources[i];
                        break;
                    }
                }
            }
            if (!mode) {
                this.__networkState = this.NETWORK_EMPTY;
                return; // Abort!
            }
            this.__networkState = this.NETWORK_LOADING;
            this.__fireMediaEvent("loadstart");

            if (mode === "attribute") {
                this.__currentSrc = this.__src;
                this.__resourceFetchAlgorithm(this.__currentSrc);
            } else { // the source elements will be used

            }
        },
        
        // This is a simple boolean that the developer can check
        // to determine whether or not this media element is native
        // to the browser, or has been "converted" to a "fallback node".
        isNative: false,
        toString: function() {
            return "[object HTMLMediaElement]";
        }
    };
    if (w.HTMLMediaElement) {
        var nativeMedia = w.HTMLMediaElement;
        extend(nativeMedia.prototype, {
            __checkError: function() {
                if (this.error.code == 4) {
                    this.removeEventListener("error", this.__checkError, false);
                    // We convert to a fallback after a setTimeout, to let the
                    // native 'error' event finish dispatching before firing
                    // the 'fallback' event
                    var This = this;
                    setTimeout(function() {
                        This.__fallback();
                        This.load();
                    }, 0);
                }
            }
        });

    } else {
        w.HTMLMediaElement = HTMLMediaElement;
    }














    function HTMLAudioElement() {
        HTMLMediaElement.apply(this, arguments);
        var ele = arguments[0];
        ele.__fireMediaEvent("fallback");
        return ele;
    }
    HTMLAudioElement.prototype = new HTMLMediaElement;
    extend(HTMLAudioElement.prototype, {

        __play: function() {
            w.HTMLAudioElement.__callFlash("play", [this.__fallbackId]);
        },
        
        __pause: function() {
            w.HTMLAudioElement.__callFlash("pause", [this.__fallbackId]);
        },
        
        __setCT: function(time) {
            w.HTMLAudioElement.__callFlash("setCurrentTime", [this.__fallbackId, time]);
        },
        
        __resourceFetchAlgorithm: function(url) {
            if (!this.__fallbackId) {

                if (!w.HTMLAudioElement.__swfSounds) w.HTMLAudioElement.__swfSounds = [];
                this.__fallbackId = w.HTMLAudioElement.__swfSounds.length;
                w.HTMLAudioElement.__swfSounds.push(this);

                // WTF? Properties on String are removed when createSound
                // is called (FF2 on OSX, doesn't happen on Win)! Need to
                // look into more deeply, ExternalInterface bug?
                var string = extend({}, String);

                w.HTMLAudioElement.__callFlash("createSound", [url, this.__volume, this.__muted]);

                // Copy the removed props from String back...
                //extend(String, string);
                for (var k in string) {
                    if (!String[k]) {
                        String[k] = string[k];
                        //console.log(k + " was missing from String!");
                    }
                }

            } else {
                w.HTMLAudioElement.__callFlash("load", [this.__fallbackId, url]);
            }
        },

        
        toString: function() {
            return "[object HTMLAudioElement]";
        }
    });


    if (HAS_NATIVE_AUDIO) {
        var nativeAudio = w.HTMLAudioElement;
        extend(nativeAudio.prototype, {
            isNative: true,
            __fallback: function() {
                new HTMLAudioElement(this);
            }
        });
        
        // Make 'document.createElement()' return a native <audio>
        // node, but already listening for an 'error' event to fallback
        var nativeCreateElement = d.createElement;
        d.createElement = function() {
            var ele = nativeCreateElement.apply(this, arguments);
            if (ele.nodeName.toLowerCase() === "audio") {
                ele.addEventListener("error", ele.__checkError, false);
            }
            return ele;
        };
        
        // Extend the native "Audio" constructor to return an <audio>
        // node that is already listening for an 'error' event to fallback
        var nativeAudio = w.Audio;
        function Audio(src) {
            var a = new nativeAudio();
            a.addEventListener("error", a.__checkError, false);
            if (src) a.src = src;
            return a;
        }
        Audio.prototype = nativeAudio.prototype;
        w.Audio = Audio;
        
    } else {

        // Make our implementation visible to window
        w.HTMLAudioElement = HTMLAudioElement;

        // Make 'document.createElement()' return proper <audio> nodes
        var nativeCreateElement = d.createElement, useApplyAudio = true;
        try {
            nativeCreateElement.apply(d, ["div"]);
        } catch (ex) {
            useApplyAudio = false;
        }
        d.createElement = function() {
            var ele = useApplyAudio ? nativeCreateElement.apply(this, arguments) : nativeCreateElement(arguments[0]);
            if (ele.nodeName.toLowerCase() === "audio") new HTMLAudioElement(ele);
            return ele;
        };



        // The HTMLAudioElement has a convience constructor: Audio.
        function Audio() {
            //if (!(this instanceof arguments.callee)) {
            //    throw new TypeError("DOM object constructor cannot be called as a function.");
            //}
            var a = d.createElement("audio"), src = arguments[0];
            a.preload = "auto";
            if (src !== undefined) a.src = String(src);
            return a;
        }
        Audio.prototype = HTMLAudioElement.prototype;
        w.Audio = Audio;
    }
    
    w.HTMLAudioElement.__callQueue = [];
    w.HTMLAudioElement.__callFlash = function(funcName, args) {
        if (w.HTMLAudioElement.__swf) {
            w.HTMLAudioElement.__swf["__" + funcName].apply(w.HTMLAudioElement.__swf, args);
        } else {
            w.HTMLAudioElement.__callQueue.push({func:funcName, args:args});
        }
    }
    w.HTMLAudioElement.__swfLoaded = function() {
        console.log("'HtmlAudio.swf' embedded, called from EI");
        var i=0, l=w.HTMLAudioElement.__callQueue.length, command;
        for (;i<l;i++) {
            command = w.HTMLAudioElement.__callQueue[i];
            console.log("calling '" + command.func + "' with " + command.args);
            w.HTMLAudioElement.__swf["__" + command.func].apply(w.HTMLAudioElement.__swf, command.args);
        }
    }
    // We want to augment both the native and our custom 'canPlayType'
    // functions to check the argument for valid MP3 mime-types.
    var origCanPlayType = HTMLAudioElement.prototype.canPlayType;
    function canPlayType() {
        if (REGEXP_MIMETYPE_MP3.test(arguments[0])) return "probably";
        return origCanPlayType.apply(this, arguments);
    }
    HTMLAudioElement.prototype.canPlayType = canPlayType;
















    function HTMLVideoElement() {
        HTMLMediaElement.apply(this, arguments);
        var element = arguments[0];
        element.__callQueue = [];
        
        if (!isIE) {
            element.__defineGetter__("width",       element.__widthGet);
            element.__defineGetter__("height",      element.__heightGet);
            element.__defineGetter__("videoWidth",  element.__videoWidthGet);
            element.__defineGetter__("videoHeight", element.__videoHeightGet);
            element.__defineGetter__("poster",      element.__posterGet);

            element.__defineSetter__("width",       element.__widthSet);
            element.__defineSetter__("height",      element.__heightSet);
            element.__defineSetter__("poster",      element.__posterSet);
        } else {
            element.addBehavior(w.HTMLVideoElement.htcPath);
        }

        element.__fireMediaEvent("fallback");
        return element;
    }
    HTMLVideoElement.prototype = new HTMLMediaElement;
    extend(HTMLVideoElement.prototype, {
        __width: -1,
        __widthGet: function() {
            return this.__width;
        },
        __widthSet: function(width) {
            this.__width = width;
        },
        
        __height: -1,
        __heightGet: function() {
            return this.__height;
        },
        __heightSet: function(height) {
            this.__height = height;
        },
        
        __videoWidth: 0,
        __videoWidthGet: function() {
            return this.__videoWidth;
        },
        
        __videoHeight: 0,
        __videoHeightGet: function() {
            return this.__videoHeight;
        },
        
        __poster: "",
        __posterGet: function() {
            return this.__poster;
        },
        __posterSet: function(src) {
            this.__poster = src;
        },
        
        __currentTimeGet: function() {
            return this.__fallbackId != undefined ?
                this.__callFlash("getCurrentTime") :
                0;
        },
        __setCT: function(time) {
            //this.__callFlash("setCurrentTime", [time]);
        },
        __play: function() {
            this.__callFlash("play");
        },
        
        __pause: function() {
            this.__callFlash("pause");
        },
        __resourceFetchAlgorithm: function(url) {
            if (this.__fallbackId == undefined) {

                if (!w.HTMLVideoElement.__swfVids) w.HTMLVideoElement.__vids = [];
                this.__fallbackId = w.HTMLVideoElement.__vids.length;
                w.HTMLVideoElement.__vids.push(this);


                var container = d.createElement("div"),
                    container2 = d.createElement("div"),
                    id = "htmlmedia-"+ this.__fallbackId,
                    flashvars = {
                        id: this.__fallbackId,
                        src: url,
                        volume: this.__volume,
                        muted: this.__muted
                    },
                    params = {
                        wmode: "opaque",
                        allowScriptAccess: "always"
                    },
                    attributes = {
                        //style: "width:100px;height:100px;"
                    };
                container.id = id;
                container2.appendChild(container);
                d.body.appendChild(container2);
                swfobject.embedSWF(w.HTMLVideoElement.swfPath, id, 300, 150, "10", false, flashvars, params, attributes);

            } else {
                this.__swf.__load(url);
            }
        },
            
        __callFlash: function(funcName, args) {
            if (this.__swf) {
                this.__swf["__" + funcName].apply(this.__swf, args || []);
            } else {
                this.__callQueue.push({ func:funcName, args:args });
            }
        },
        
        __getCanvas: function() {
            var n1= new Date().getTime();
            var data = this.__swf.__getImageData();
            if (data) {
                var canvas = d.createElement("canvas");
                canvas.width = this.__videoWidth;
                canvas.height = this.__videoHeight;
                var ctx = canvas.getContext("2d");
                var id = ctx.getImageData(0, 0, this.__videoWidth, this.__videoHeight);
                var l = data.length;
                var pixel;
                for (var i=0; i<l; i++) {
                    pixel = data[i];
                    id.data[i*4+0] = pixel >> 16 & 0xFF;// red
                    id.data[i*4+1] = pixel >> 8 & 0xFF; // green
                    id.data[i*4+2] = pixel & 0xFF;      // blue
                    id.data[i*4+3] = pixel >> 24 & 0xFF;// alpha
                }
                ctx.putImageData(id, 0, 0);
                var n2= new Date().getTime();
                console.log("time: " + (n2-n1));
                return canvas;
            }
        },
        
        __metadataCallback: function(duration, width, height) {
            HTMLMediaElement.prototype.__metadataCallback.call(this, duration);
            this.__videoWidth = width;
            this.__videoHeight = height;
        },
        __swfInit: function() {
            this.__swf = d.getElementById("htmlmedia-"+this.__fallbackId);
            var i=0, l=this.__callQueue.length, command;
            for (;i<l;i++) {
                command = this.__callQueue[i];
                console.log("calling '" + command.func + "' with " + command.args);
                this.__swf["__" + command.func].apply(this.__swf, command.args);
            }
        },
        
        toString: function() {
            return "[object HTMLVideoElement]";
        }
    });
    if (HAS_NATIVE_VIDEO) {
        var nativeVideo = w.HTMLVideoElement;
        extend(nativeVideo.prototype, {
            isNative: true,
            __fallback: function() {
                new HTMLVideoElement(this);
            }
        });

        // Make 'document.createElement()' return a native <video>
        // node, but already listening for an 'error' event to fallback
        var ce = d.createElement;
        d.createElement = function() {
            var ele = ce.apply(this, arguments);
            if (ele.nodeName.toLowerCase() === "video") {
                ele.addEventListener("error", ele.__checkError, false);
            }
            return ele;
        };

    } else {
        // Make our implementation visible to window
        w.HTMLVideoElement = HTMLVideoElement;
        
        // Make 'document.createElement()' return proper <video> nodes
        var nativeCreateElement = d.createElement;
        d.createElement = function() {
            var ele = nativeCreateElement(arguments[0]),
                nodeName = ele.nodeName.toLowerCase();
            if (nodeName === "video") new HTMLVideoElement(ele);
            return ele;
        };

    }
    
    if (HAS_CANVAS) {
        var drawImage = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = function() {
            if (arguments[0].__getCanvas)
                arguments[0] = arguments[0].__getCanvas();
            return drawImage.apply(this, arguments);
        }
    }









    
    w.HTMLMediaElement.setPath = function(path) {
        // First ensure the path ends with a '/'
        var d = path.length - 1;
        if (d === 0 || path.indexOf('/', d) !== d) {
            path += '/';
        }
        extend(w.HTMLAudioElement, {
            htcPath: path + "HtmlAudio.htc",
            swfPath: path + "HtmlAudio.swf"
        });
        extend(w.HTMLVideoElement, {
            htcPath: path + "HtmlVideo.htc",
            swfPath: path + "HtmlVideo.swf"
        });
    }
            
    // Embed the fallback <audio> SWF onto the page
    function embedSwf() {
        //console.log("embedding SWF at: " + w.HTMLAudioElement.swfPath);
        var container = d.createElement("div"),
            id = "HtmlAudio",
            flashvars = {},
            params = {
                wmode: "transparent",
                allowScriptAccess: "always"
            },
            attributes = {
                style: "position:fixed;top:0px;right:0px;"
            };
        container.id = id;
        d.body.appendChild(container);
        swfobject.embedSWF(w.HTMLAudioElement.swfPath, id, 1, 1, "10", false, flashvars, params, attributes);
    }
        
    function fixHtmlTags() {
        var audioNodes = d.getElementsByTagName("audio"),
            videoNodes = d.getElementsByTagName("video"), i, node;
        
        function fixNode(node, nodeName) {
            node.removeAttribute("_moz-userdefined");
            if (!HAS_NATIVE_AUDIO && nodeName == "audio") {
                new HTMLAudioElement(node);
            } else if (!HAS_NATIVE_VIDEO && nodeName == "video") {
                new HTMLVideoElement(node);
            } else {
                // Has native implementation, check/listen for an 'error'
                if (node.error) {
                    node.__checkError();
                } else {
                    node.addEventListener("error", node.__checkError, false);
                }
            }
        }
        
        for (i=0; i<audioNodes.length; i++)
            fixNode(audioNodes[i], "audio");
        for (i=0; i<videoNodes.length; i++)
            fixNode(videoNodes[i], "audio");
    }
            
    
    function init() {
        if (arguments.callee.done) return;
        arguments.callee.done = true;

        if (isIE) {
            // For IE to fire custom events and use real getters and setters,
            // they must be defined in an HTC file and applied via CSS 'behavior'.
            var style = d.createElement("style");
            style.type = "text/css";
            style.styleSheet.cssText = "audio, video { behavior:url("+w.HTMLAudioElement.htcPath+"); } video { behavior:url("+w.HTMLVideoElement.htcPath+"); }";
            HEAD.appendChild(style);
        }
        embedSwf();
        fixHtmlTags();
    }
    
    
    if (d.body) {
        //console.log("'document.body' exists! Script inserted dynamically or outside <head>.");
        init();
    } else {
        //console.log("'document.body' not ready, we'll wait for DOMContentLoaded!");
        if (d.addEventListener) {
            d.addEventListener('DOMContentLoaded', init, false);
        }
        (function() {
            /*@cc_on
            try {
                d.body.doScroll('up');
                return init();
            } catch(e) {}
            /*@if (false) @*/
            if (/loaded|complete/.test(d.readyState)) return init();
            /*@end @*/
            if (!init.done) setTimeout(arguments.callee, 30);
        })();
        if (w.addEventListener) {
            w.addEventListener('load', init, false);
        } else if (w.attachEvent) {
            w.attachEvent('onload', init);
        }
    }

})(this, document);
HTMLMediaElement.setPath("");
