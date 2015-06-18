(function() {
  // The width and height of the captured photo. We will set the
  // width to the value defined here, but the height will be
  // calculated based on the aspect ratio of the input stream.

  var width = 320;    // We will scale the photo width to this
  var height = 0;     // This will be computed based on the input stream

  // |streaming| indicates whether or not we're currently streaming
  // video from the camera. Obviously, we start at false.

  var streaming = false;

  // The various HTML elements we need to configure or control. These
  // will be set by the startup() function.

  var video = null;
  var canvas = null;
  var photo = null;
  var startbutton = null;

  function startup() {

    // Initialize SoundCloud JavaScript SDK
    SC.initialize({
      client_id: "a92c8411b58c610219e961daf5d786fe",
      redirect_uri: 'http://localhost:4000/callback.html'
    });

    // Get audio context required for HTML 5 audio recording
    var Context = window.AudioContext || window.webkitAudioContext;
    context = new Context();

    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    photo = document.getElementById('photo');
    startbutton = document.getElementById('video');
    connectbutton = document.getElementById('connect');
    recordbutton = document.getElementById('record');
    uploadbutton = document.getElementById('upload');

    navigator.getMedia = ( navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia);

    navigator.getMedia(
      {
        video: true,
        audio: true
      },
      function(stream) {
        if (navigator.mozGetUserMedia) {
          video.mozSrcObject = stream;
        } else {
          var vendorURL = window.URL || window.webkitURL;
          video.src = vendorURL.createObjectURL(stream);
        }
        video.play();
      },
      function(err) {
        console.log("An error occured! " + err);
      }
    );

    video.addEventListener('canplay', function(ev){
      if (!streaming) {
        height = video.videoHeight / (video.videoWidth/width);

        // Firefox currently has a bug where the height can't be read from
        // the video, so we will make assumptions if this happens.

        if (isNaN(height)) {
          height = width / (4/3);
        }

        video.setAttribute('width', width);
        video.setAttribute('height', height);
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);
        streaming = true;
      }
    }, false);

    startbutton.addEventListener('click', function(ev){
      takepicture();
      ev.preventDefault();
    }, false);

    connectbutton.addEventListener('click', function(){
      connect();
    }, false);

    recordbutton.addEventListener('click', function(){
      record();
    }, false);

    uploadbutton.addEventListener('click', function(){
      finish();
    }, false);

    clearphoto();
  }

  // Fill the photo with an indication that none has been
  // captured.

  function clearphoto() {
    var context = canvas.getContext('2d');
    context.fillStyle = "#AAA";
    context.fillRect(0, 0, canvas.width, canvas.height);

    var data = canvas.toDataURL('image/png');
    photo.setAttribute('src', data);
  }

  // Capture a photo by fetching the current contents of the video
  // and drawing it into a canvas, then converting that to a PNG
  // format data URL. By drawing it on an offscreen canvas and then
  // drawing that to the screen, we can change its size and/or apply
  // other changes before drawing it.

  function takepicture() {
    var context = canvas.getContext('2d');
    if (width && height) {
      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);

      var data = canvas.toDataURL('image/png');
      photo.setAttribute('src', data);
    } else {
      clearphoto();
    }
  }

  function connect() {
    // Connect to user's account with OAuth2
    SC.connect(function() {
      $('#status').text("Connected");
    });
  }

  // record audio from browser
  function record() {
    // ask for permission and start recording
    navigator.getMedia({audio: true}, function(localMediaStream){
      mediaStream = localMediaStream;

      // create a stream source to pass to Recorder.js
      var mediaStreamSource = context.createMediaStreamSource(localMediaStream);

      // create new instance of Recorder.js using the mediaStreamSource
      rec = new Recorder(mediaStreamSource, {
        // pass the path to recorderWorker.js file here
        workerPath: 'vendor/Recorder.js/recorderWorker.js'
      });

      // start recording
      rec.record();

      $('#status').text("Recording...");
    }, function(err){
      console.log('Browser not supported');
    });
  }

  function finish() {
    // stop the media stream
    mediaStream.stop();

    // stop Recorder.js
    rec.stop();

    // export to WAV and upload to SoundCloud
    rec.exportWAV(function(blob){
      rec.clear();

      // Upload to SoundCloud
      $('#status').text("Uploading...");
      upload(blob);
    });
  }

  // upload file to SoundCloud
  function upload(uploadFile) {

    var context = canvas.getContext('2d');
    if (width && height) {
      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);

      canvas.toBlob(function(snapshot){
        // JavaScript SDK doesn't support POSTing File objects yet,
        // so we'll construct our own multipart/form-data HTTP request
        var fd = new FormData();
        fd.append('oauth_token', SC.accessToken());
        fd.append("track[title]", Date.now());
        fd.append("track[asset_data]", uploadFile);
        fd.append("track[artwork_data]", snapshot);

        console.log(fd);
        console.log('uploading');

        $.ajax({
            url: 'https://api.soundcloud.com/tracks',
            type: 'POST',
            data: fd,
            processData: false,
            contentType: false,
        }).done(function(track) {
          $('#status').html(
            '<a target="_blank" href="'
            + track.permalink_url
            + '">'
            + track.permalink_url + '</a>');
        });

      });

  }
}

  // Set up our event listener to run the startup process
  // once loading is complete.
  window.addEventListener('load', startup, false);
})();
