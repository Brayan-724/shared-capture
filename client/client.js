const url = new URL("/ws", location.href);
url.protocol = "ws:";

// https://stackoverflow.com/questions/32789417/loading-chunks-into-html5-video
const mediaSource = new MediaSource();
let sourceBuffer;
let setted = false;

const socket = new WebSocket(url);
socket.binaryType = "arraybuffer";
let id = "";
socket.onopen = () => {
  console.log("Socket connected to server");
};
socket.onmessage = (ev) => {
  /** @type {string | Blob} */
  const data = ev.data;
  if (typeof data === "string") {
    const [kind, ...extra] = data.split(":");
    switch (kind) {
      case "open":
        id = extra[0];
        console.log("Open connection with id:", id);
        break;

      default:
        console.error("Unhandled kind on message:", kind);
        break;
    }
    return;
  }

  const addBuffer = () => {
    sourceBuffer.appendBuffer(ev.data);
  };

  if (!setted) {
    const video = document.getElementById("preview");
    video.src = URL.createObjectURL(mediaSource);
    mediaSource.addEventListener("sourceopen", () => {
      sourceBuffer = mediaSource.addSourceBuffer("video/webm; codecs=vp8");
      addBuffer();
      video.play();
    });
    setted = true;
  } else {
    addBuffer();
  }
};

async function getMediaStream() {
  mediaConstraints = {
    video: {
      cursor: "always",
      resizeMode: "crop-and-scale",
    },
  };

  const screenStream = await navigator.mediaDevices.getDisplayMedia(
    mediaConstraints,
  );
  return screenStream;
}

async function shareScreen() {
  const stream = await getMediaStream();
  const recorder = new MediaRecorder(stream);

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      socket.send(event.data);
    }
  };

  recorder.onstop = () => {
    console.log("STOPPED");
  };

  recorder.start(1000);
}

globalThis.shareScreen = shareScreen;
