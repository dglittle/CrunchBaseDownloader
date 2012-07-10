
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
    
    
    // download companies json data
    console.log("starting download...")
    var a = wget("http://api.crunchbase.com/v/1/companies.js")
    fs.writeFile('companies.json', a)
    console.log("ending download...")
    
    // load companies json into variable
    var a = fs.readFileSync('companies.json', 'utf8')
    var C = JSON.parse(a)
    console.log('C size = ' + C.length)
    
    ensurePath('companies')
    for (var i = 0; i < C.length; i++) {
        var x = C[i].permalink
        console.log('downloading ' + x) 
        var u = 'http://api.crunchbase.com/v/1/company/' + x + '.js'
        fs.writeFile('companies/' + x + '.json', wget(u))
        
        sleep(2)
    }
    
    
}).run()

