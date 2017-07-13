var http = require('http');
var os = require('os');
var fs = require('fs');
var child_process = require('child_process');
var path = require('path');
var url = require('url');

var get_arduino_command = function() {
	var arduino_cmd = null;
	var arduino_cmd_guesses = [];
	switch(os.platform()) {
		case "darwin":
			arduino_cmd_guesses = ["/Applications/Arduino.app/Contents/MacOS/Arduino"];
			break;
		case "win32":
			arduino_cmd_guesses = [
                "c:\Program Files\Arduino\Arduino_debug.exe",
                "c:\Program Files\Arduino\Arduino.exe",
                "c:\Program Files (x86)\Arduino\Arduino_debug.exe",
                "c:\Program Files (x86)\Arduino\Arduino.exe"
            ]
			break;
	}
	arduino_cmd_guesses.forEach(function(p) {
		if(fs.existsSync(p)) {
				arduino_cmd = p;
		}
	})
	if(!arduino_cmd)
		arduino_cmd = "arduino";
	return arduino_cmd;
}

var guess_port_name = function() {
	/* TODO: find serial.port in preferences file which may existed at followings

		\Arduino15\preferences.txt (Windows, Arduino IDE 1.6.6 and newer)
		\Arduino15\preferences.txt (Windows, Arduino IDE 1.6.0 - 1.6.5)
		\Arduino\preferences.txt (Windows, Arduino IDE 1.0.6 and older)
		\Documents\ArduinoData\preferences.txt (Windows app version)
		~/Library/Arduino15/preferences.txt (Max OS X, Arduino IDE 1.6.0 and newer)
		~/Library/Arduino/preferences.txt (Max OS X, Arduino IDE 1.0.6 and older)
		~/.arduino15/preferences.txt (Linux, Arduino IDE 1.6.0 and newer)
		~/.arduino/preferences.txt (Linux, Arduino IDE 1.0.6 and older)
		<Arduino IDE installation folder>/portable/preferences.txt (when used in portable mode)
	 */
	 return "";
}



http.createServer(function(req, rsp){
	rsp.setHeader("content-type", "text/html;charset=utf-8");
	rsp.setHeader('Access-Control-Allow-Origin', '*');
	if(req.url != '/') {
		var pathUrl = path.join(process.cwd(),url.parse(req.url).path);
		console.log(pathUrl);
		if(fs.existsSync(pathUrl)) {
			var data = fs.readFileSync(pathUrl);
			rsp.write(data);
			rsp.end();
		} else {
			rsp.statusCode = 404;
			rsp.end();
		}
	} else {
		if(req.method === 'GET') {
			rsp.writeHead(302,{
				Location: '/blockly/apps/blocklyduino/index.html'
			});
			rsp.end();
		} else if(req.method === 'POST') {
			var cmd = process.env.CMD || get_arduino_command();
			var board = process.env.BOARD || 'LinkIt:linkit_rtos:linkit_7697';
			var port = process.env.PORT || guess_port_name();
			var content = '';
			var contentLength = 0;
			if(!port || !cmd || !board) {
				rsp.statusCode = 400;
				rsp.end();
				return;
			}
			req.on('data', function(data) {
				content += data;
			})
			req.on('end', function() {
				console.log("receive data:\n"+content);
				if(content.length <= 0) {
					rsp.statusCode = 400;
					rsp.end();
				} else {
					var tempDir = fs.mkdtempSync(os.tmpdir()+path.sep+'arduino-');
					var fname = path.join(tempDir, 'arduino')+'.ino';
					var f = fs.openSync(fname, 'w');
					fs.writeFileSync(f, content);
					fs.close(f);

					var cmdline = cmd + " --upload --port "+ port+ " --board "+ board+" "+ fname;
					console.log(cmdline);
					child_process.exec(cmdline, function(err, stdin, stdout) {

						if(err && err.code != 0 ){
							rsp.statusCode = 400;
							rsp.end();
						} else {
							rsp.statusCode = 200;
							rsp.end();
						}
						console.log(stdin);
						console.log(stdout);
					})
				}
			})
		}
	}
}).listen(8080);