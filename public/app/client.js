var app = angular.module('phaserTools',['angularFileUpload']);

app.controller('AudioSpriteController', function($http, $controller) {
	this.isGenerating = false;
	this.source = {
		mp3: 'uploads/2e2be052f41278f02631d5325e6f3631.mp3'
	};
	this.create = function() {
		this.isGenerating = true;
		$http.post('/audiosprite/' + this.uploader.id)
		.then(function(response) {
			console.log('response:', response);
			this.isGenerating = false;
		}.bind(this));
	};
	this.uploader = $controller('UploadController');
	this.peaks = window.peaks.js.init({
		container: document.querySelector('#peaks-container'),
		mediaElement: document.querySelector('audio')
	});

	this.peaks.on('segments.ready', function() {
		console.log('segments ready');
	});

	this.setActive = function(file) {
		
	};
});

app.controller('UploadController', function($upload) {
	var self = this;
	
	this.files = null;
	this.id = null;
	this.isUploading = false;
	this.onFileSelect = function($files) {
		this.isUploading = true;

		this.files = null;
		this.upload = $upload.upload({
			url: '/upload' + (!!this.id ? '/' + this.id : '') ,
			method: 'POST',
			file: $files
		}).progress(function(evt) {
			console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
		}).success(function(data, status, headers, config) {
			this.files = data.files;
			this.id = data.id;
			this.isUploading = false;
		}.bind(this)).error(function() {
			console.log('ERROR:', arguments);
		}).then(function() { 
			console.log('done');
		});
	};

	this.dragOverClass = function($event) {
		var items = $event.dataTransfer.items;
		var hasFile = false;
		if (items != null) {
			for (var i = 0 ; i < items.length; i++) {
				if (items[i].kind == 'file') {
					hasFile = true;
					break;
				}
			}
		} else {
			hasFile = true;
		}
		return hasFile ? "dragover" : "dragover-err";
	};
});