'use strict';

var EventEmitter = require('events').EventEmitter;
var Util = require('util');

function TaskRobin(option){
    var that = this;
    
    this.name = "taskrobin";
    EventEmitter.call(this);
    this._initRetryTimes = option.initRetryTimes || 5;
    this._initRetryDelay = option.initRetryDelay || 20;
    this._runRetryTimes  = option.runRetryTimes  || 5;
    this._runRetryDelay =  option.runRetryDelay  || 20;
    this._retryDelay2nd =  option.retryDelay2nd  || 60; //seconds

    this._initTimes = 0;
    this._runTimes = 0;
    
    this.objArray = new Array();
    this._funcInit = new Object();
    this._funcRun = new Object();
    this._funcErr = new Object();
    

    this.on('init',function(){
	console.log('In init ...' + new Date());
	this._funcInit();
	this.run();
    });

    this.on('run', function(){
	console.log('In run ...' + new Date());
	this._funcRun();
    });

    this.on('error', function(){
	var delay;
	console.log('In error ...' + new Date());
	that.unInit();

	if( that._runTimes < that._runRetryTimes ){
	    delay = that._runRetryDelay * 1000;
	}else{
	    delay = that._retryDelay2nd * 1000;
	}

	that._runTimes++;

	console.log('Restart for ' + that._runTimes + ' time ' + 'after ' + delay/1000 + ' seconds');

	setTimeout(function(){
	    that.emit('init');
	},delay);
    });
    this.on('initerror',function(){
	var delay;
	console.log('In initerror ...' + new Date());
	that.unInit();

	if( that._initTimes < that._initRetryTimes ){
	    delay = that._initRetryDelay * 1000;
	}else{
	    delay = that._retryDelay2nd * 1000;
	}
	that._initTimes++;

	console.log('Reinit for ' + that._initTimes + ' time ' + 'after ' + delay/1000 + ' seconds');

	setTimeout(function(){
	    that.emit('init');
	},delay);
    });
    
}

Util.inherits(TaskRobin, EventEmitter);

TaskRobin.prototype.add =  function(obj){
    this.objArray.push(obj);
};

TaskRobin.prototype.addInit = function(func){
    this._funcInit = func;
    
};
TaskRobin.prototype.addRun = function(func){
    this._funcRun = func;

};

TaskRobin.prototype.unInit = function(){
    console.log('UnInit() ...');
    this.objArray.forEach(function(obj){
	obj = undefined;
    });
    this.objArray = new Array();
};

TaskRobin.prototype.run = function(){
    this.emit('run');
};
TaskRobin.prototype.start = function(){
    this.emit('init');
};

TaskRobin.prototype.reinit = function(){
    this.emit('initerror');
};
TaskRobin.prototype.restart = function(){
    this.emit('error');
};


module.exports = TaskRobin;
