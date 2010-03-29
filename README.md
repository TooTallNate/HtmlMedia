HtmlMedia
=========

Presenting the first and only "proper"
[HTML5 &lt;audio&gt; and &lt;video&gt;](http://www.w3.org/TR/html5/video.html)
fallback implementation: `HtmlMedia`

There are a few open-source HTML5 Video and Audio fallbacks that depend on
Flash out there, but in-short, all were too heavy-weight AND not complete
enough for my needs.

`HtmlMedia` was created with the term
["progressive enhancement"](http://en.wikipedia.org/wiki/Progressive_enhancement)
in mind. The sad truth is that HTML5 isn't even finalized yet. None of the
current browser's implementations have a uniform codec support, and Internet
Explorer doesn't yet support it at all! This library aims to provide an
implementation of the HTML5 media API, with a uniform, cross-browser codec set
support via Flash, enhancing the browser's current implementation if one exists.

The `HtmlMedia` library should:

 * If no HTML5 media support is detected, implement the interfaces related to
   the &lt;audio&gt; and &lt;video&gt; element (HTMLMediaElement, HTMLAudioElement,
   etc.) via standard JavaScript, and provide playback support via the Flash
   fallback.

 * If some level of HTML5 media is supported, but MP3 playback is not
   (Firefox 3.5+, Opera 10.1), then `HtmlMedia` should augment the native
   implementation to support the codecs provided from the Flash fallback
   *transparently*.

 * If HTML5 media is supported AND all the codecs that the fallback supports
   are also supported by the browser (not likely, consider `flv` video files),
   then this library should detect so and do nothing.

Ultimately, this gives the web developer access to the HTML5 Audio and Video
API on all browsers with Flash installed (~98%), with **AT LEAST** the codecs
supported by the Flash fallback guaranteed to work, plus any other codecs that
the web browser's implementation decides to implement.

Supported Browsers
------------------

I'll put this section first simply because I know that's what you're dying
to drool about:

 * Internet Explorer 6+
 * Mozilla Firefox 2+
 * Testing for more needed!!

Supported Codecs
----------------

This library provides guaranteed support for MP3 files via the Flash fallback
for the `<audio>` tag.
    
If the current browser has any others codecs supported via its HTML5 media
implementation, then those are obviously still supported as well.

How to Use
----------

`HtmlMedia` was designed to be a drop-in enhancement, with little
or no configuration required by the developer. Here's a minimal HTML file,
with guaranteed HTML5 media support via `HtmlMedia`:

    <!DOCTYPE html>
    <html>
    <head>
        <script type="text/javascript" src="swfobject.js"></script>
        <script type="text/javascript" src="HtmlMedia.js"></script>
    </head>
    <body>
        <audio src="theme.mp3" autoplay></audio>
    </body>
    </html>

You essentially need to copy the `HtmlAudio.swf`, `HtmlVideo.swf`,
`HTMLMediaElement.htc`, `swfobject.js` and the `HtmlMedia.js` files to
somewhere on your web server. On any page that you want to use HTML5 audio
or video, just include the `HtmlMedia.js` script which will do the rest.
Optionally you can set the path to the SWF files. `HtmlMedia` does
not directly depend on any external libraries, but it is designed to work alongside
popular JavaScript frameworks like [Prototype](http://www.prototypejs.org).

Once the `HtmlMedia.js` file finishes loading you have access to the entire
HTML5 audio and video API on your HTML page **AND** via JavaScript.

Try things like:

    document.createElement("audio").canPlayType("audio/mpeg");
        //--> "probably"

or

    var a = new Audio("theme.mp3");
    a.play();
        // load and listen to some music :)
    a.volume = 0.5;
        // set to 50% volume
    setTimeout("a.pause()", 1000);
        // pause the sound in 1 second
    
You now have full access to the
[HTML5 &lt;audio&gt; and &lt;video&gt;](http://www.w3.org/TR/html5/video.html)
API on your webpage, with a guaranteed codec set, and an implementation for
old/non-supporting browsers!

If you would like some more tutorials on how to use the HTML5 Audio and Video
API, I highly recommend reading any of the browser vendors' articles on the matter:

* [Mozilla's "Using audio and video (in Firefox)"](https://developer.mozilla.org/En/Using_audio_and_video_in_Firefox)
* [Opera's "Everything you need to know about HTML5 video and audio"](http://my.opera.com/core/blog/2010/03/03/everything-you-need-to-know-about-html5-video-and-audio-2)
* [Apple's "Safari Guide to HTML5 Audio and Video"](https://developer.mozilla.org/En/Using_audio_and_video_in_Firefox)
* Is there a Google one anywhere?


Known Limitations
-----------------

I'm proud to say that the limitations brought on by this library are very
minimal, and in most cases, you wouldn't even know about them:

 * innerHTML - DO NOT create `<audio>`, `<video>` or `<source>`
   nodes via setting a parent element's `innerHTML` property. The newly created
   nodes are will not be properly extended with the HTML5 API and fallback if
   they are created this way. You can insert said nodes either via
   the initial HTML source, or dynamically via `document.createElement`.

 * It's not possible to overwrite the functionality of the built-in browser
   `controls` for media elements. Furthermore, `HtmlMedia` has no plans on
   implementing the attribute. For these reasons, it is not recommended to use
   the `controls` attribute at all. However, all media events to build your own
   user interface do fire, and that is always recommended!

 * Currently, upgrading native `<audio>` and `<video>` nodes to use
   the Flash fallback is a destructive process. In other words, if `HTMLMediaElement#load`
   is called and `src` is a file where the Flash fallback needs to be used, then
   that media element is "converted" to a "fallback node" and can only be used to
   play files supported by the fallback, and native playback is removed from that
   element. Just don't be reusing media elements if you're jumping between multiple
   file formats constantly is all, create new ones.

License
-------

I've decided to release this enhancement library under the MIT license.
See the `LICENSE` file for legal text.
