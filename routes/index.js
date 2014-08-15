var express = require('express');
var router = express.Router();
var util = require('util');
var fs  = require('fs');
var dirty = require('dirty');
var uuid = require('node-uuid');
var path = require('path');
var exec = require('child_process').exec;
var AV = require('av');
var Q = require('q');


var db = dirty('uploads.json');
db.on('load', function() {
	console.log('db is ready');
});



/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

router.get('/uploads/:filename', function(req, res, next) {
	console.log('uploads/'+req.params.filename);
	res.send('uploads/'+req.params.filename);

});
router.post('/upload/:id?', function(req, res, next) {
	var ok = true;
	var id = req.params.id || uuid.v1();
	var fileList = [];
	var promises = [];
	if(req.files.file) {
		req.files.file.forEach(function(file) {
			var fileObj = {
				path: null,
				duration: null,
				format: null,
				metadata: null,
				name: null
			};
			if(file.size === 0) {
				return next(new Error('No File Selected'));
			}
			
			if(fs.existsSync(file.path)) {
				var deferred = Q.defer();
				deferred.progress = 0;
				var asset = AV.Asset.fromFile(file.path);
				asset.start();
				fileObj.path = file.path;
				fileObj.name = file.originalname.replace(/\s/g,'_');

				asset.get('duration', function(duration) {
					console.log('duration:', duration);
					fileObj.duration = duration;
					deferred.notify(1);
				});

				asset.get('format', function(format) {
					console.log('format:', format);
					fileObj.format = format;
					deferred.notify(2);
				});
				asset.get('metadata', function(metadata) {
					console.log('metadata:', metadata);
					fileObj.metadata = metadata;
					deferred.notify(3);
				});

				asset.on('data', function() {
					console.log('entire file read');
					deferred.notify(100);
				});

				deferred.promise.progress(function(progress) {
					console.log('progress event:', progress);
					deferred.progress += progress;
					if(deferred.progress >= 6) {
						fileList.push(fileObj);
						console.log('full file obj:', fileObj);
						deferred.resolve();
					}
				});

				promises.push(deferred.promise);
				
				

			} else {
				console.log('does not exist');
				ok = false;
			}
		});
		Q.all(promises).done(function() {
			console.log('files:', fileList.length);
			db.set(id, fileList, function() {
				console.log('created record:', id, db.get(id));
				res.json({status: ok, id: id, files: fileList.map(function(file) { 
						return {name: file.name.replace(/\.\w+$/,''), duration: file.duration,format: file.format, metadata: file.metadata, path: file.path } ; 
					})
				});
			});
		});
		
	} else {
		res.json({status: false});
	}
});

router.post('/audiosprite/:id', function(req, res) {
    if(!fs.existsSync('audiosprites/')) {
    	console.log('audiosprites/ doesn\'t exist');
		fs.mkdirSync('audiosprites/');
	}
	if(!fs.existsSync('audiosprites/' + req.params.id)) {
    	console.log('audiosprites/ doesn\'t exist');
		fs.mkdirSync('audiosprites/' + req.params.id);
	}
	var copyCount = 0;
	console.log('generating audiosprite:', util.inspect(req.params.id));
	var spriteConfig = db.get(req.params.id);
	console.log('sprite config:', spriteConfig);
	
	spriteConfig.forEach(function(file, index) {
		console.log('copying:', file, index);
		var cmd = 'cp ' +  file.path + ' ' + path.join('audiosprites', req.params.id, spriteConfig[index].name);
		console.log('cmd:', cmd);
		exec(cmd, function(error, stdout, stderr) {
    		console.log('stdout:', stdout);
    		console.log('stderr:', stderr);
    		if (error !== null) {
      			console.log('exec error:', error);
    		}
			copyCount++;
			if (copyCount == spriteConfig.length) {
				cmd = 'audiosprite -o audiosprite ' + spriteConfig.map(function(sound) {
					return sound.name;
				}).join(' ');
				console.log('audiosprite cmd:', cmd);
				exec(cmd, {cwd: path.join('audiosprites', req.params.id) }, function(err, stdo, stde) {
					console.log('stdo:', stdo);
    				console.log('stde:', stde);
    				if (err !== null) {
      					console.log('audiosprite error:', err);
    				}
    				res.end();
				});
			}
		});
	});

	
	
});

module.exports = router;

