HtmlMedia
=========

Presenting the first and only "proper"
[HTML5 &lt;audio&gt; and &lt;video&gt;](http://www.w3.org/TR/html5/video.html) fallback
implementation: `HtmlMedia`

There are a few open-source HTML5 Video and Audio fallbacks that depend on
Flash out there, but in-short, all were too heavy-weight AND not complete
enough for my needs.

`HtmlMedia` was created with the term "progressive enhancement" in
mind. The sad truth is that HTML5 isn't even finalized yet. None of the
current browser's implementations have a uniform codec support, and Internet
Explorer doesn't support it at all! This script aims to provide an
implementation of the HTML5 media API, with a uniform, cross-browser codec set
support via Flash, upgrading the browser's current implementation if one exists.

The `HtmlMedia` script should:

 * If no HTML5 media support is detected, implement the interfaces related to
   the <audio> and <video> element (HTMLMediaElement, HTMLAudioElement, etc.)
   via standard JavaScript, and provide MP3 playback support via the Flash
   fallback.

 * If some level of HTML5 media is supported, but MP3 playback is not
   (Firefox 3.5+, Opera 10.5), then `HtmlAudio` should augment the native
   implementation to support MP3 playback via the Flash fallback transparently.

 * If HTML5 media is supported AND MP3 playback is natively supported
   (Google Chrome), then this library should detect so and do nothing.

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
 * Opera 9+ (though abandoning their weird old Audio object)
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

You essentially need to include SWFObject 2+ and the `HtmlMedia.js` file.
That's it! Optionally you can set the path to the SWF files. Once the
`HtmlMedia.js` file finishes loading you have access to the entire HTML5
audio and video API on your HTML page **AND** via JavaScript.

Try things like:

    document.createElement("audio").canPlayType("audio/mpeg");
        //--> "probably"

or

    var a = new Audio("theme.mp3");
    a.play();
        // load and listen to some music :)
    a.volume = a.volume / 2;
        // cut the volume in half
    setTimeout("a.pause()", 1000);
        // pause the sound in 1 second
    
You now have full access to the [HTML5 &lt;audio&gt; and &lt;video&gt;](http://www.w3.org/TR/html5/video.html)
API on your webpage, with a guaranteed codec set, and an implementation for
old/non-supporting browsers.

License
-------

I've decided to license this enhancement library under the MIT license. See
the `LICENSE` file for legal text.
