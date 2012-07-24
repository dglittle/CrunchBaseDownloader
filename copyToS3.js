
firstRun = typeof(firstRun) == "undefined" 
if (firstRun)
    require('fibers')

Fiber(function () {
    fs = require('fs')
    url = require('url')
    querystring = require('querystring')
    exec = require('child_process').exec
    crypto = require('crypto')
    http = require('http')

    require('./myutil')
    require('./nodeutil')
    
    s3 = new (require('./s3').s3)(process.argv[2], process.argv[3], process.argv[4])
    
    s3.put('crunchbase.zip', fs.readFileSync('./crunchbase.zip'), true)
    
}).run()

