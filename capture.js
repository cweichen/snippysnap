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
//  var startbutton = null;
var context = null;

var mediaRecorder = null;
var chunks = [];

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
//  photo = document.getElementById('photo');
//  startbutton = document.getElementById('video');
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

        // Connect the video stream to the video element
        video.mozSrcObject = stream;

        // Connect the audio stream to MediaRecorder
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = function(evt) {
          chunks.push(evt.data);
        };

        mediaRecorder.onerror = function(evt) {
          console.log('onerror fired');
        };

        mediaRecorder.onstop = function(evt) {
          console.log('onstop fired');
          var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
          $('#status').text("Uploading...");
          upload(blob);
        };

        mediaRecorder.onwarning = function(evt) {
          console.log('onwarning fired');
        };

      } else {
        var vendorURL = window.URL || window.webkitURL;
        video.src = vendorURL.createObjectURL(stream);
      }
      video.play();
      video.volume = 0;
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

  video.addEventListener('touchstart', function(ev){
    ev.preventDefault();
    console.log('touchstart');
    record();
  }, false);

  video.addEventListener('touchleave', function(ev){
    ev.preventDefault();
    console.log('touchleave');
    finish();
  }, false);

  video.addEventListener('mousedown', function(ev){
    ev.preventDefault();
    console.log('mousedown');
    record();
  }, false);

  video.addEventListener('mouseup', function(ev){
    ev.preventDefault();
    console.log('mouseup');
    finish();
  }, false);

  connectbutton.addEventListener('click', function(){
    connect();
  }, false);
}

function connect() {
  // Connect to user's account with OAuth2
  SC.connect(function() {
    $('#status').text("Connected");
  });
}

// record audio from browser
function record() {
  $('#status').text("Recording...");
  mediaRecorder.start();
}

function finish() {
  mediaRecorder.stop();
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
