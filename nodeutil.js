
// from http://unfoldingtheweb.com/2010/12/15/recursive-directory-nodejs/
ensurePath = function (path, mode, callback, position) {
    var fs = require('fs');
    mode = mode || 0777;
    position = position || 0;
    parts = require('path').normalize(path).split('/');

    if (position >= parts.length) {
        if (callback) {
            return callback();
        } else {
            return true;
        }
    }

    var directory = parts.slice(0, position + 1).join('/');
    fs.stat(directory, function(err) {
        if (err === null) {
            ensurePath(path, mode, callback, position + 1);
        } else {
            fs.mkdir(directory, mode, function (err) {
                if (err) {
                    if (callback) {
                        return callback(err);
                    } else {
                        throw err;
                    }
                } else {
                    ensurePath(path, mode, callback, position + 1);
                }
            })
        }
    })
}

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

crypto = require('crypto')

md5 = function (s) {
    return crypto.createHash('md5').update(s).digest("hex")    
}

tryRun = function (f) {
    if (Fiber.current !== f) {
        try {
            f.run()
        } catch (e) {
            if (e instanceof Error) {
                if ("" + e == "Error: This Fiber is already running") {
                    // that's fine.. we really need to be able to check for "yielding"
                    return
                }
            }
            throw e
        }
    }
}

run = function (func) {
    Fiber(func).run()
}

promise = function () {
    var f = Fiber.current
    var done = false
    var val = null
    return {
        set : function (v) {
            done = true
            val = v
            tryRun(f)
        },
        get : function () {
            while (!done) {
                yield()
            }
            return val
        }
    }
}

wait = function (funcs) {
    var c = Fiber.current
    var waitingCount = 0
    foreach(funcs, function (f) {
        waitingCount++
        run(function () {
            f()
            waitingCount--
            tryRun(c)
        })
    })
    while (waitingCount > 0) yield()
}

sleep = function (seconds) {
    var p = promise()
    setTimeout(function () {
        p.set()
    }, seconds * 1000)
    p.get()
}

// adapted from https://github.com/lm1/node-fiberize/blob/master/fiberize.js
fiberize = function () {
    var f = Fiber.current
    var args = Array.prototype.slice.call(arguments)
    
    var cb_args
    var cb = function () {
        cb_args = Array.prototype.slice.call(arguments)
        tryRun(f)
    }
    args.push(cb)
    var result = args[0].apply(null, args.slice(1))
    
    while (!cb_args) yield()
        
    var err = cb_args[0]
    if (err instanceof Error) throw err
    if (err == null) cb_args.shift()
    if (result !== undefined) result = [result].concat(cb_args)
    else result = cb_args
    if (result.length <= 1) result = result[0]
    return result
}

// adapted from http://stackoverflow.com/questions/3393854/get-and-set-a-single-cookie-with-node-js-http-server
getCookies = function (c) {
    var cookies = {}
    if (c && c.headers) c = c.headers.cookie
    if (c) {
        foreach(c.split(/;/), function (c) {
            var m = c.match(/(.*?)=(.*)/)
            cookies[trim(m[1])] = trim(m[2])
        })
    }
    return cookies
}

consume = function (input, encoding) {
    if (encoding == 'buffer') {
        var buffer = new Buffer(1 * input.headers['content-length'])
        var cursor = 0
    } else {
        var chunks = []
        input.setEncoding(encoding || 'utf8')
    }
    
    var p = promise()
    function onDone() {
        if (encoding == 'buffer') {
            p.set(buffer)
        } else {
            p.set(chunks.join(''))
        }
    }
    input.on('end', onDone)
    input.on('close', onDone)
    input.on('data', function (chunk) {
        if (encoding == 'buffer') {
            chunk.copy(buffer, cursor)
            cursor += chunk.length
        } else {
            chunks.push(chunk)
        }
    })
    return p.get()
}

error = function (s) {
    throw new Error(s)
}

wget = function (url, params, encoding) {
    var u = global.url.parse(url)
    
    var o = {
        method : params ? 'POST' : 'GET',
        hostname : u.hostname,
        path : u.path
    }
    if (u.port)
        o.port = u.port
    
    var data = ""
    if (params) {
        data = values(map(params, function (v, k) { return escapeUrl(k) + "=" + escapeUrl(v) })).join('&')
        
        o.headers = {
            "Content-Type" : "application/x-www-form-urlencoded",
            "Content-Length" : Buffer.byteLength(data, 'utf8')
        }
    }
    
    var p = promise()
    var req = require(u.protocol.replace(/:/, '')).request(o, function (res) {
        run(function () {
            p.set(consume(res, encoding))
        })
    })
    req.end(data, 'utf8')
    return p.get()
}

