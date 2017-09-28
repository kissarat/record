if ('function' !== typeof MediaDevices.getUserMedia && 'function' === typeof navigator.getUserMedia) {
  MediaDevices.getUserMedia = function (options) {
    return new Promise(function (resolve, reject) {
      navigator.getUserMedia(options, resolve, reject)
    })
  }
}

if (!localStorage.token) {
  localStorage.token = Date.now().toString(36) + '_'
      + Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(36)
}

const mimes = {
  "video/webm\;codecs=vp9": 'webm',
  "video/webm\;codecs=vp8": 'webm',
  "video/webm\;codecs=daala": 'webm',
  "video/webm\;codecs=h264": 'webm',
  "audio/webm\;codecs=opus": 'webm',
  "video/webm": 'webm',
  "video/mpeg": 'avi',
  "video/ogg": 'ogv',
  "audio/webm": 'webm',
  "audio/mpeg": 'mp4',
  "audio/mp4": 'mp4',
  "audio/ogg": 'ogg',
  "audio/vorbis": 'ogg',
  "audio/aac": 'mp4',
}

for (const mime in mimes) {
  if (!MediaRecorder.isTypeSupported(mime)) {
    delete mimes[mime]
  }
}

function filterMimes() {
  return Object.keys(mimes).filter(a => this.video ? a.indexOf('video/') === 0 : a.indexOf('audio/') === 0)
}

const files = []

const options = {
  audio: localStorage.audio ? !!+localStorage.audio : 1,
  video: !!+localStorage.video,
  duration: localStorage.duration ? +localStorage.duration : 5,
  token: localStorage.token,
  saving: false,
  recording: false,
  files
}

options.format = localStorage.format || filterMimes.call(options)[0]

addEventListener('unload', function () {
  localStorage.audio = options.audio ? 1 : 0
  localStorage.video = options.video ? 1 : 0
  localStorage.duration = options.duration
  localStorage.token = options.token
  localStorage.format = options.format
})

let recorder

async function record() {
  options.recording = true
  const stream = await MediaDevices.getUserMedia(options)
  recorder = new MediaRecorder(stream)
  let timer
  const chunks = []
  recorder.addEventListener('dataavailable', function (e) {
    chunks.push(e.data)
  })
  // const start = Date.now()
  recorder.addEventListener('stop', async function () {
    try {
      const body = new Blob(chunks, {type: options.format})
      const now = new Date()
      const t = [
        (now.getFullYear() - 2000),
        (now.getMonth() + 1),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
      ]
          .filter(n => ('0' + n).slice(-2))
      const filename = `${t[0]}-${t[1]}-${t[2]}_${t[3]}-${t[4]}-${t[5]}.` + mimes[options.format]
      const url = location.origin + `/upload/${options.token}/` + filename
      clearTimeout(timer)
      record()
      await fetch(url, {
        method: 'POST',
        body
      })
      // const seconds = Math.round((Date.now() - start) / 1000)
      files.push(filename)
      options.saving = false
    }
    catch (err) {
      console.error(err)
      alert('Save error: ' + (err.message || err.toString()))
    }
  })

  recorder.start()
  timer = setTimeout(function () {
        recorder.stop()
      },
      options.duration * 60 * 1000)
}

document.addEventListener('DOMContentLoaded', async function () {
  const form = new Vue({
    el: 'form',
    data: options,
    computed: {
      mimes: filterMimes
    },
    methods: {
      reset() {
        setTimeout(() => this.format = this.mimes[0], 20)
      },

      save() {
        this.saving = true
        recorder.stop()
      },

      record() {
        if ('function' === typeof window.MediaRecorder) {
          record()
              .catch(function (err) {
                console.error(err)
                alert('Recoding error: ' + (err.message || err.toString()))
              })
        }
        else {
          alert('Browser does not support MediaRecorder')
        }
      }
    }
  })

  const r = await fetch('/upload/' + options.token)
  const {result} = await r.json()
  files.push.apply(files, result)
})
