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
(function(w) {
    var REGEXP_FILENAME_MP3 = /\.mp3(\?.*)?$/i,
        REGEXP_MIMETYPE_MP3 = /^audio\/(?:x-)?(?:mp(?:eg|3))\s*;?/i,
        REGEXP_MIMETYPE_FLV = /^video\/(?:x-)?(?:flv)\s*;?/i,
        HAS_NATIVE_AUDIO  = !!w.HTMLAudioElement,
        HAS_NATIVE_VIDEO  = !!w.HTMLVideoElement,
        USE_FALLBACK_MP3  = false,
        USE_FALLBACK_FLV  = true,
        USE_FALLBACK_H264 = false,
        HEAD = document.getElementsByTagName("head")[0],
        isIE = !!document.attachEvent && Object.prototype.toString.call(w.opera) !== '[object Opera]',
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

    // Extends the properties of one 'source' Object onto 'destination'
    function extend(destination, source) {
        for (var property in source)
            destination[property] = source[property];
        return destination;
    }
    
    /* Modified from http://gist.github.com/253174
     *
     * Detect if the browser can play a given codec with native
     * HTML5 <audio> or <video>.
     *
     * @param aOrV - must be "audio" or "video", depending on the check
     * @param mime - the mime type to test in "canPlayType"
     * @param base64 - the base64 encoded data URI to use as the src for the test
     * @param {function(boolean, Object|undefined)} callback
     **/
    function nativeCheck(aOrV, mime, base64, callback){
        try {
            var ele = document.createElement(aOrV);
            // Shortcut which doesn't work in Chrome (always returns ""); pass through
            // if "maybe" to do asynchronous check by loading MP3 data: URI
            if(ele.canPlayType(mime) == "probably") {
                callback(true);
                return;
            }

            // If this event fires, then MP3s can be played
            ele.addEventListener('loadedmetadata', function(e) {
                callback(true);
            }, false);

            // If this is fired, then client can't play MP3s
            ele.addEventListener('error', function(e){
                callback(false, this.error)
            }, false);

            // Smallest base64-encoded MP3 I could come up with (<0.000001 seconds long)
            ele.src = base64;
            ele.load();
        } catch(e) {
            callback(false, e);
        }
    }
    
    if (HAS_NATIVE_AUDIO) {
        nativeCheck("audio", 'audio/mpeg; codecs="MP3"', "data:audio/mpeg;base64,/+MYxAAAAANIAAAAAExBTUUzLjk4LjIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", function(canPlayMP3) {
            USE_FALLBACK_MP3 = !canPlayMP3;
            console.log("Native MP3 check complete: " + canPlayMP3);
        });
        nativeCheck("audio", 'audio/ogg; codecs="vorbis"', "data:audio/ogg;base64,T2dnUwACAAAAAAAAAABTkYlUAAAAABeKqR0BHgF2b3JiaXMAAAAAAUAfAAAAAAAAsDYAAAAAAACZAU9nZ1MAAAAAAAAAAAAAU5GJVAEAAACPWwFkCy3///////////%2B1A3ZvcmJpcx0AAABYaXBoLk9yZyBsaWJWb3JiaXMgSSAyMDA3MDYyMgAAAAABBXZvcmJpcxJCQ1YBAAABAAxSFCElGVNKYwiVUlIpBR1jUFtHHWPUOUYhZBBTiEkZpXtPKpVYSsgRUlgpRR1TTFNJlVKWKUUdYxRTSCFT1jFloXMUS4ZJCSVsTa50FkvomWOWMUYdY85aSp1j1jFFHWNSUkmhcxg6ZiVkFDpGxehifDA6laJCKL7H3lLpLYWKW4q91xpT6y2EGEtpwQhhc%2B211dxKasUYY4wxxsXiUyiC0JBVAAABAABABAFCQ1YBAAoAAMJQDEVRgNCQVQBABgCAABRFcRTHcRxHkiTLAkJDVgEAQAAAAgAAKI7hKJIjSZJkWZZlWZameZaouaov%2B64u667t6roOhIasBADIAAAYhiGH3knMkFOQSSYpVcw5CKH1DjnlFGTSUsaYYoxRzpBTDDEFMYbQKYUQ1E45pQwiCENInWTOIEs96OBi5zgQGrIiAIgCAACMQYwhxpBzDEoGIXKOScggRM45KZ2UTEoorbSWSQktldYi55yUTkompbQWUsuklNZCKwUAAAQ4AAAEWAiFhqwIAKIAABCDkFJIKcSUYk4xh5RSjinHkFLMOcWYcowx6CBUzDHIHIRIKcUYc0455iBkDCrmHIQMMgEAAAEOAAABFkKhISsCgDgBAIMkaZqlaaJoaZooeqaoqqIoqqrleabpmaaqeqKpqqaquq6pqq5seZ5peqaoqp4pqqqpqq5rqqrriqpqy6ar2rbpqrbsyrJuu7Ks256qyrapurJuqq5tu7Js664s27rkearqmabreqbpuqrr2rLqurLtmabriqor26bryrLryratyrKua6bpuqKr2q6purLtyq5tu7Ks%2B6br6rbqyrquyrLu27au%2B7KtC7vourauyq6uq7Ks67It67Zs20LJ81TVM03X9UzTdVXXtW3VdW1bM03XNV1XlkXVdWXVlXVddWVb90zTdU1XlWXTVWVZlWXddmVXl0XXtW1Vln1ddWVfl23d92VZ133TdXVblWXbV2VZ92Vd94VZt33dU1VbN11X103X1X1b131htm3fF11X11XZ1oVVlnXf1n1lmHWdMLqurqu27OuqLOu%2BruvGMOu6MKy6bfyurQvDq%2BvGseu%2Brty%2Bj2rbvvDqtjG8um4cu7Abv%2B37xrGpqm2brqvrpivrumzrvm/runGMrqvrqiz7uurKvm/ruvDrvi8Mo%2BvquirLurDasq/Lui4Mu64bw2rbwu7aunDMsi4Mt%2B8rx68LQ9W2heHVdaOr28ZvC8PSN3a%2BAACAAQcAgAATykChISsCgDgBAAYhCBVjECrGIIQQUgohpFQxBiFjDkrGHJQQSkkhlNIqxiBkjknIHJMQSmiplNBKKKWlUEpLoZTWUmotptRaDKG0FEpprZTSWmopttRSbBVjEDLnpGSOSSiltFZKaSlzTErGoKQOQiqlpNJKSa1lzknJoKPSOUippNJSSam1UEproZTWSkqxpdJKba3FGkppLaTSWkmptdRSba21WiPGIGSMQcmck1JKSamU0lrmnJQOOiqZg5JKKamVklKsmJPSQSglg4xKSaW1kkoroZTWSkqxhVJaa63VmFJLNZSSWkmpxVBKa621GlMrNYVQUgultBZKaa21VmtqLbZQQmuhpBZLKjG1FmNtrcUYSmmtpBJbKanFFluNrbVYU0s1lpJibK3V2EotOdZaa0ot1tJSjK21mFtMucVYaw0ltBZKaa2U0lpKrcXWWq2hlNZKKrGVklpsrdXYWow1lNJiKSm1kEpsrbVYW2w1ppZibLHVWFKLMcZYc0u11ZRai621WEsrNcYYa2415VIAAMCAAwBAgAlloNCQlQBAFAAAYAxjjEFoFHLMOSmNUs45JyVzDkIIKWXOQQghpc45CKW01DkHoZSUQikppRRbKCWl1losAACgwAEAIMAGTYnFAQoNWQkARAEAIMYoxRiExiClGIPQGKMUYxAqpRhzDkKlFGPOQcgYc85BKRljzkEnJYQQQimlhBBCKKWUAgAAChwAAAJs0JRYHKDQkBUBQBQAAGAMYgwxhiB0UjopEYRMSielkRJaCylllkqKJcbMWomtxNhICa2F1jJrJcbSYkatxFhiKgAA7MABAOzAQig0ZCUAkAcAQBijFGPOOWcQYsw5CCE0CDHmHIQQKsaccw5CCBVjzjkHIYTOOecghBBC55xzEEIIoYMQQgillNJBCCGEUkrpIIQQQimldBBCCKGUUgoAACpwAAAIsFFkc4KRoEJDVgIAeQAAgDFKOSclpUYpxiCkFFujFGMQUmqtYgxCSq3FWDEGIaXWYuwgpNRajLV2EFJqLcZaQ0qtxVhrziGl1mKsNdfUWoy15tx7ai3GWnPOuQAA3AUHALADG0U2JxgJKjRkJQCQBwBAIKQUY4w5h5RijDHnnENKMcaYc84pxhhzzjnnFGOMOeecc4wx55xzzjnGmHPOOeecc84556CDkDnnnHPQQeicc845CCF0zjnnHIQQCgAAKnAAAAiwUWRzgpGgQkNWAgDhAACAMZRSSimllFJKqKOUUkoppZRSAiGllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimVUkoppZRSSimllFJKKaUAIN8KBwD/BxtnWEk6KxwNLjRkJQAQDgAAGMMYhIw5JyWlhjEIpXROSkklNYxBKKVzElJKKYPQWmqlpNJSShmElGILIZWUWgqltFZrKam1lFIoKcUaS0qppdYy5ySkklpLrbaYOQelpNZaaq3FEEJKsbXWUmuxdVJSSa211lptLaSUWmstxtZibCWlllprqcXWWkyptRZbSy3G1mJLrcXYYosxxhoLAOBucACASLBxhpWks8LR4EJDVgIAIQEABDJKOeecgxBCCCFSijHnoIMQQgghREox5pyDEEIIIYSMMecghBBCCKGUkDHmHIQQQgghhFI65yCEUEoJpZRSSucchBBCCKWUUkoJIYQQQiillFJKKSGEEEoppZRSSiklhBBCKKWUUkoppYQQQiillFJKKaWUEEIopZRSSimllBJCCKGUUkoppZRSQgillFJKKaWUUkooIYRSSimllFJKCSWUUkoppZRSSikhlFJKKaWUUkoppQAAgAMHAIAAI%2Bgko8oibDThwgMQAAAAAgACTACBAYKCUQgChBEIAAAAAAAIAPgAAEgKgIiIaOYMDhASFBYYGhweICIkAAAAAAAAAAAAAAAABE9nZ1MABAEAAAAAAAAAU5GJVAIAAABPWCgVAgEBAAA%3D", function(canPlayVorbis) {
            console.log("Native OGG Vorbis check complete: " + canPlayVorbis);
        });
    } else {
        //console.log("No native <audio> support. Using fallback...");
        USE_FALLBACK_MP3 = true;
    }
    
    if (HAS_NATIVE_VIDEO) {
        
    } else {
        //console.log("No native <video> support. Using fallback...");
        USE_FALLBACK_FLV  = true;
        USE_FALLBACK_H264 = true;
    }

    
    
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
        var ev = document.createEvent("Events"),
            func = this["on"+eventName];
        ev.initEvent(eventName, false, false);
        this.__extendEvent(ev, arguments);
        this.dispatchEvent(ev);
        if (typeof func === 'function') {
            func.call(this, ev);
        }
    }
            
    function resourceSelectionAlgorithm() {
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
            resourceFetchAlgorithm.call(this, this.__currentSrc);
        } else { // the source elements will be used
            
        }
    }
            
    function resourceFetchAlgorithm(url) {
        if (!this.__fallbackId) {

            // WTF? Properties on String are removed when createSound
            // is called (FF2 on OSX, doesn't happen on Win)! Need to
            // look into more deeply, ExternalInterface bug?
            var string = extend({}, String);
                    
            this.__fallbackId = w.HTMLAudioElement.__swf.__createSound(url, this.__volume, this.__muted);
                    
            // Copy the removed props from String back...
            //extend(String, string);
            for (var k in string) {
                if (!String[k]) {
                    String[k] = string[k];
                    //console.log(k + " was missing from String!");
                }
            }

            if (!w.HTMLAudioElement.__swfSounds) w.HTMLAudioElement.__swfSounds = [];
            w.HTMLAudioElement.__swfSounds.push(this);
        } else {
            w.HTMLAudioElement.__swf.__load(url);
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
    var RELATIVE_URL_RESOLVER = resolvesSrc(document.createElement("script")) || new Image();                


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
                break;
            case "autoplay":
                break;
            case "loop":
                break;
            case "controls":
                break;
        }
        return rtn;
    }
    function getAttribute() {
        var rtn = this.__getAttribute(arguments[0]);
        return rtn;
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
        element.__defineGetter__("buffered",    element.__bufferedGet);
        element.__defineGetter__("played",      element.__playedGet);
        element.__defineGetter__("seekable",    element.__seekableGet);

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
            // getAttribute and setAttribute need to look out for
            // specific cases (loop, src, etc.)
            if (!element.__setAttribute) element.__setAttribute = element.setAttribute;
            element.setAttribute = setAttribute;
            if (!element.__getAttribute) element.__getAttribute = element.getAttribute;
            element.getAttribute = getAttribute;
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
            resourceSelectionAlgorithm.call(this);
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
            w.HTMLAudioElement.__swf.__setCurrentTime(this.__fallbackId, time);
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
            
        },

        // readonly attribute TimeRanges seekable;
        __seekableGet: function() {
            
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
                resourceSelectionAlgorithm.call(this);
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
                w.HTMLAudioElement.__swf.__play(this.__fallbackId);
            }
        },
                
        // void pause();
        pause: function() {
            if (this.__networkState === this.NETWORK_EMPTY) {
                resourceSelectionAlgorithm.call(this);
            }
            if (this.__paused === false) {
                this.__paused = true;
                this.__fireMediaEvent("timeupdate");
                this.__fireMediaEvent("pause");
                w.HTMLAudioElement.__swf.__pause(this.__fallbackId);
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
        __metadataCallback: function(duration) {
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
                var isUnsupported = this.error.code == 4;
                if (isUnsupported && REGEXP_FILENAME_MP3.test(this.currentSrc || this.src)) {
                    this.removeEventListener("error", this.__checkError, false);
                    new HTMLAudioElement(this);
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
        toString: function() {
            return "[object HTMLAudioElement]";
        }
    });


    if (HAS_NATIVE_AUDIO) {
        var nativeAudio = w.HTMLAudioElement,
            nativeLoad = nativeAudio.prototype.load;
        extend(nativeAudio.prototype, {
            isNative: true,
            load: function() {
                //console.log("calling overriden HTMLAudioElement#load");
                nativeLoad.apply(this, arguments);
            }
        });
    } else {

        w.HTMLAudioElement = HTMLAudioElement;


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
            //if (!(this instanceof arguments.callee)) {
            //    throw new TypeError("DOM object constructor cannot be called as a function.");
            //}
            var a = document.createElement("audio"), src = arguments[0];
            a.preload = "auto";
            if (src !== undefined) a.src = String(src);
            return a;
        }
        Audio.prototype = HTMLAudioElement.prototype;
        w.Audio = Audio;
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
        return arguments[0];
    }
    HTMLVideoElement.prototype = new HTMLMediaElement;
    extend(HTMLVideoElement.prototype, {
        toString: function() {
            return "[object HTMLVideoElement]";
        }
    });
    if (HAS_NATIVE_VIDEO) {
        var nativeVideo = w.HTMLVideoElement;
        nativeVideo.prototype.isNative = true;
    } else {
        w.HTMLVideoElement = HTMLVideoElement;
    }
    
    
    w.HTMLMediaElement.setPath = function(path) {
        // First ensure the path ends with a '/'
        var d = path.length - 1;
        if (!(d >= 0 && path.indexOf('/', d) === d)) {
            path = path + '/';
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
            
    // Embed the fallback SWF into the page
    function embedSwf() {
        console.log("embedding SWF at: " + w.HTMLAudioElement.swfPath);
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
        swfobject.embedSWF(w.HTMLAudioElement.swfPath, id, 1, 1, "10", false, flashvars, params, attributes);
    }
    
    function swfLoaded() {
        console.log("'HtmlAudio.swf' embedded, called from EI");
        // TODO: Process fallback queue.
    }
    w.HTMLAudioElement.__swfLoaded = swfLoaded;
        
    function fixHtmlTags() {
        var audioNodes = document.getElementsByTagName("audio"),
            videoNodes = document.getElementsByTagName("video"), i, node;
        for (i=0; i<audioNodes.length; i++) {
            node = audioNodes[i];
            if (!HAS_NATIVE_AUDIO) {
                new HTMLAudioElement(node);
                node.removeAttribute("_moz-userdefined");
            } else {
                if (node.error) {
                    node.__checkError();
                } else {
                    node.addEventListener("error", node.__checkError, false);
                }
                //HTMLAudioElement.__attemptFallback(audioNodes[i]);
            }
        }
                
        for (i=0; i<videoNodes.length; i++) {
            node = videoNodes[i];
            if (!HAS_NATIVE_VIDEO) {
                new HTMLVideoElement(node);
                node.removeAttribute("_moz-userdefined");
            } else {
                        
            }
        }
    }
            
    
    function init() {
        if (arguments.callee.done) return;
        arguments.callee.done = true;

        if (isIE) {
            // For IE to fire custom events and use real getters and setters,
            // they must be defined in an HTC file and applied via CSS 'behavior'.
            var style = document.createElement("style");
            style.type = "text/css";
            style.styleSheet.cssText = "audio, video { behavior:url("+w.HTMLAudioElement.htcPath+"); } video { behavior:url("+w.HTMLVideoElement.htcPath+"); }";
            HEAD.appendChild(style);
        }
        embedSwf();
        fixHtmlTags();
    }
    
    
    if (document.body) {
        console.log("'document.body' exists! Script inserted dynamically or outside <head>.");
        init();
    } else {
        console.log("'document.body' not ready, we'll wait for DOMContentLoaded!");
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
        if (w.addEventListener) {
            w.addEventListener('load', init, false);
        } else if (w.attachEvent) {
            w.attachEvent('onload', init);
        }
    }

})(window);
HTMLMediaElement.setPath("");
