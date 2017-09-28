const http = require('http')
const fs = require('fs')
const path = require('path')
const config = require('../config')

const UPLOADDIR = path.normalize(__dirname + '/../public/files')

const server = http.createServer(function (req, res) {
  res.json = function (o) {
    this.writeHead(o.status, {
      'content-type': 'application/json'
    })
    this.end(JSON.stringify(o))
  }

  try {
    const [_1, token, filename] = req.url.split('/')
    if (!token) {
      return res.json({status: 400})
    }
    const userdir = UPLOADDIR + '/' + token
    try {
      fs.accessSync(userdir)
    }
    catch (ex) {
      fs.mkdirSync(userdir)
    }
    switch (req.method) {
      case 'POST':
        const filepath = userdir + '/' + filename
        const stream = fs.createWriteStream(filepath, {autoClose: true})
        req.pipe(stream)
        req.on('end', function () {
          res.json({
            status: 201,
            result: {
              filepath,
              url: `/${userdir}/${filename}`
            }
          })
        })
        break

      case 'GET':
        const files = fs.readdirSync(userdir)
          res.json({
            status: 200,
            result: files
          })
        break

      default:
        res.json({status: 405})
    }
  }
  catch (err) {
    res.json({
      status: 500,
      error: {
        message: err.message || err.toString()
      }
    })
  }
})

server.listen(config.port || 8020)
