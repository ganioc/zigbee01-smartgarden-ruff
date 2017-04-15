'use strict';


var EventEmitter = require('events').EventEmitter;
var Util = require('util');
var Task = require('./task.js');
var _ = require('./underscore.js');
var MTPort = require('./mtport.js');
var Protocol = require('./protocol.js');

// Maximum router number in zigbee network
var MAX_ROUTER_NUM = 4;

var SRC_EP = 8;
var DST_EP = 8;
var TASK_QUEUE_SCAN_PERIOD = 1000;
var SHORTADDR_LIFE_TIME = 60;
var ACQUISITION_PERIOD  =  MAX_ROUTER_NUM * 2 * 1000;


var rptId = (function(){
    var i = 1;
    return function(){
	if(i>255){
	    i = 1;
	}
	return i++;
    };
})();

// device type
/*
  type1:
  led
  soil-ph
  irrigate-switch
  soil-temp
  soil-humidity

  type2:
  led
  air-temp
  air-light-intensity
  air-humidity

*/
var DEVICE_TYPE_1  = 1;
var DEVICE_TYPE_2  = 2;

function Duplexer(options){
    var that = this;
    
    EventEmitter.call(this);

    // this is port interface with coordinator
    this._port = new MTPort(options.uart_port, options.uart_baudrate);
    
    // task queue
    this._queue = [];    

    // map chipId - shortAddr
    this._addrQueue = [];

    
}

Util.inherits(Duplexer, EventEmitter);

Duplexer.prototype.checkRemoteMsgValid = function(cmd){
    var addr;
    addr = _.find(this._addrQueue, function(m){
	return(cmd.sn == m.sn);
    });
    if(!addr){
	console.log('addr not found:'+ addr);
	return -1;
    }
    var param;
    param = (Protocol.mapDeviceTypeCapability[addr.deviceType.toString()]).indexOf( cmd.param_id);
    console.log(cmd.param_id);
    console.log(param);
    console.log(Protocol.mapDeviceTypeCapability[addr.deviceType.toString()]);
    if(param !== -1){
	return 0;
    }else{
	console.log('device don\'n have param for reading:' + cmd.param_id);
	return -2;
    }
}

// Create batch Tasks according to addrQueue
// Based on deviceType and SN
Duplexer.prototype.createBatchTask = function(){
    var that = this;
    
    _.each(this._addrQueue,function(m){
	var cmd = {};
	
	if( m.deviceType === DEVICE_TYPE_1){
	    that.insertRTask(m.sn, Protocol.PARAM_ID_TYPE1_STATUS);
	}
	else if( m.deviceType === DEVICE_TYPE_2){
	    that.insertRTask(m.sn, Protocol.PARAM_ID_TYPE2_STATUS);
	}
    });

    console.log(this._queue);
    console.log('--leave addbatchtask');
};

Duplexer.prototype.addTask  = function( obj, callback){
    // change it, insert new task at the array head
    
    this._queue.push( new Task(obj, callback) );
    
};
// local task
// Duplexer.prototype.insertRBatchTask = function(sn, param_id){
//     var cmd = {};
//     cmd.sn = sn;
//     cmd.msg_type = "r";
//     cmd.param_id = param_id;
//     this.addTask(

//     );
// };
// read task
Duplexer.prototype.insertRTask = function(sn, param_id){
    var cmd = {};
    cmd.sn = sn;
    cmd.msg_type = "r";
    cmd.param_id = param_id;

    // change timeout according to queue length

    var length = this._queue.length;
    console.log('current _queue length:' + length);
    
    this.addTask(
	{
	    cmd:cmd,
	    param: Protocol.mapParam2HA[cmd.param_id.toString()],
	    timeout: 6000 + length *1000
	    
	},
	rCallback
    );
};

// task exists anyway
Duplexer.prototype.process = function(task){
    // false, not processed
    // true, processed , waiting for response
    if( task.bProcessed === false ){

	this.send(task);
	
	task.bProcessed = true;
    }
    else if( task.bDone === true  ){
	// bDone , be true when received response
	//
	if(task.cmd.msg_id){
	    console.log('Remote Task already be done:' + task.cmd.msg_id);
	}else{
	    console.log('Local Task already be done:' + task._id);
	}
    }
    else{
	console.log('Check timeout');
	var curTime = new Date().getTime();
	var deltaTime = curTime - task.timeStamp;

	if( deltaTime > task._timeout){
	    // timeout
	    task.timeout();
	    task.bDone = true;
	}
	else{
	    console.log('No timeout');
	}
    }

};

Duplexer.prototype.cleanTaskQueue = function(){
    // remove task with bDone = true
    if( this._queue.length === 0){
	return;
    }
    
    console.log('queue len is before:' + this._queue.length);    
    console.log( this._queue);
    
    this._queue = _.filter(this._queue, function(obj){
	return(obj.bDone === false);
    });

    console.log('after filtering queue len is:' + this._queue.length);
    console.log(this._queue);
};
Duplexer.prototype.addAddr = function(chipId, shortAddr,deviceType){
    var that = this;

    var addr = _.find(this._addrQueue, function(obj){
	return(obj.sn === chipId);
    });

    if(addr){
	addr.life = SHORTADDR_LIFE_TIME;
    }else{
	that.emit('log',{
	    sn: chipId,
	    value: 'logon'
	});
	this._addrQueue.push(
	    {
		life: SHORTADDR_LIFE_TIME,
		sn: chipId,
		shortAddr: shortAddr,
		deviceType: deviceType
	    }
	);
    }
};
Duplexer.prototype.syncAddrQueue = function(){
    var that = this;
    
    if( this._addrQueue.length === 0){
	return;
    }
    _.each( this._addrQueue, function(obj){
	obj.life--;
    });
    
    this._addrQueue = _.filter(this._addrQueue, function(obj){
	if(obj.life <=0){
	    that.emit('log',
		      {
			  sn: obj.sn,
			  value: 'logoff'
		      });
	}
	
	return(obj.life > 0);
    });
    console.log('==>addrQueue');
    console.log(this._addrQueue);
};
Duplexer.prototype.callbackTaskQueue = function( msg ){
    console.log('callbackTaskQueue()');
    console.log(msg);
    
    var task = _.find( this._queue, function(obj){
	switch( msg.msg_type){
	case 't':
	    if( obj.cmd.msg_type === msg.msg_type){
		return true;
	    }
	    break;
	case 'w':

	    break;
	case 'r':
	    console.log('It\' s a read rsp msg');
	    if( obj.cmd.msg_type == msg.msg_type
		&& obj.param.clusterId == msg.param.clusterId
		&& obj.param.attrId == msg.param.attrId
	      ){
		return true;
	    }

	    break;
	case 'c':
	    break;
	default:
	    break;
	}

    });
    if(task){
	console.log('Found task in queue for msg:');
	console.log(msg);
	if( msg.msg_type === 't' ){
	    task.callback(null, task.cmd, msg, this);
	}else{
	    task.callback(null, task.cmd, msg.param, this);
	}
	task.bDone = true;  // mark to remove it from task queue
    }

};
Duplexer.prototype.getAddrQueue = function(){

    var out = {};
    out.msg_id = rptId();
    out.msg_type = "rp";
    out.value = [];
    if( this._addrQueue.length === 0){
	return out;
    }
    out.value = _.map(this._addrQueue, function(m){
	var dev={};
	dev.sn = m.sn;
	dev.deviceType = m.deviceType;

	if( m.value ){
	    dev.value = m.value;
	    //dev.value.timeStamp
	    dev.value.timeStamp = m.timeStamp;
	}
	//dev.value.timeStamp = m.timeStamp;
	// change value to m.value
	return dev;
    });
    return out;
};

Duplexer.prototype.send = function(task){
    var device;
    
    console.log('======> Into .send()');
    if(task.cmd.msg_id){
	console.log('==>Send out remote-initiated taskId:' + task.cmd.msg_id);
	console.log('msg_type:' + task.cmd.msg_type);
	
	switch(task.cmd.msg_type){
	case 't':
	    var value = task.cmd.value;
	    this._port.write( Protocol.buildSendTestCmd(value) );
	    break;
	case 'r':
	    console.log('Into case r-command');
	    console.log('task\'s sn is:' + task.cmd.sn);

	    device = _.find(this._addrQueue, function(m){
		return (m.sn == task.cmd.sn);
	    });

	    if(device){
		var addr1 = device.shortAddr;
		var dstEp1 = DST_EP;
		var mapping1 = Protocol.mapParam2HA[task.cmd.param_id.toString()];
		var clusterId1 = mapping1.clusterId;
		var paramId1 = mapping1.attrId;
		console.log("Send out r");
		console.log("addr:" + addr1.toString('16'));
		console.log("dstEp:" + dstEp1);
		console.log("clusterId:" + clusterId1);
		console.log("attrId:" + paramId1);
		this._port.write( Protocol.buildSendCustReadAttrCmd( addr1, dstEp1, clusterId1, paramId1 ) );
		
	    }
	    
	    break;
	case 'w':

	    break;
	case 'c':
	    console.log('Into case c-command');
	    console.log('task\'s sn is:' + task.cmd.sn);
	    
	    device = _.find(this._addrQueue, function(m){
		return (m.sn == task.cmd.sn);
	    });
	    if(device){
		var addr = device.shortAddr;
		var dstEp = DST_EP;
		var mapping = Protocol.mapCmd2HA[task.cmd.cmd_id.toString()];
		var clusterId = mapping.clusterId;
		var cmdId = mapping.cmdId;
		console.log("Send out c");
		console.log("addr:" + addr.toString('16'));
		console.log("dstEp:" + dstEp);
		console.log("clusterId:" + clusterId);
		console.log("cmdId:" + cmdId);
		this._port.write( Protocol.buildSendCustCmdCmd( addr, dstEp, clusterId, cmdId ) );		

	    }

	    break;
	default:
	    break;
	}
	
    }else{
	console.log('Send out local-initiated taskId:' + task._id);
	if(this._port == undefined){
	    console.log('_port not defined');
	}
	else if( this._port.write == undefined){
	    console.log('_port.write not defined');
	}
	
	this.sendLocalTask(task);
    }
};
Duplexer.prototype.sendLocalTask = function(task){
    var device;
    
    console.log('msg_type:' + task.cmd.msg_type);

    switch(task.cmd.msg_type){
    case 'r':
	console.log('Into case r-command');
	console.log('task\'s sn is:' + task.cmd.sn);

	device = _.find(this._addrQueue, function(m){
	    return (m.sn == task.cmd.sn);
	});

	if(device){
	    var addr1 = device.shortAddr;
	    var dstEp1 = DST_EP;
	    var mapping1 = Protocol.mapParam2HA[task.cmd.param_id.toString()];
	    var clusterId1 = mapping1.clusterId;
	    var paramId1 = mapping1.attrId;
	    console.log("Send out r");
	    console.log("addr:" + addr1.toString('16'));
	    console.log("dstEp:" + dstEp1);
	    console.log("clusterId:" + clusterId1);
	    console.log("attrId:" + paramId1);

	    this._port.write( Protocol.buildSendCustReadAttrCmd( addr1, dstEp1, clusterId1, paramId1 ), function(err){
	    	console.log('Write read');
	    });
	}
	break;
    default:
	throw new Error('Unrecognized local task');
	break;
    }
};
Duplexer.prototype.open = function(){
    var that = this;

    // uart event callback
    this._port.on('open', function(){
	console.log('MT port opened');	
    });

    this._port.on('message', function(data){
	console.log('\nMTPort Rcv message');
	
	Protocol.processMsg(data);
	
	if(Protocol.isCustCommand(data)){

	    that.emit('message', data);
	}else{
	    console.log("MTPort Not a cust command");
	}

    });

    this._port.on('error', function(err){
	//throw new Error('Can\'t open MT port');
	console.log(err.message);
	that.emit('errorport');
    });

    this._port.on('close', function(){
	console.log('MTPort closed');
    });
    
    //  duplexer event callback
    this.on('addtask',function(option, callback){
	console.log('-------------');
	console.log('add task:' , option);
	that.addTask( option, callback );
	
    });

    this.on('addbatchtask', function( ){
	console.log('====== addbatchtask signal ====>');
	that.createBatchTask();
    });

    this.on('process', function(){
	console.log('Process queue');
	var obj = _.find(that._queue, function(obj){
	    return( obj.bProcessed === false);
	});
	
	if(obj){
	    that.process(obj);
	}

	var handledTaskList = _.filter(that._queue, function(obj){
	    return( obj.bProcessed !== false);
	});

	_.each(handledTaskList, function(obj){
	    that.process(obj);
	});
	
	that.cleanTaskQueue();

	that.syncAddrQueue();
    });

    // get message from the uart port, aimed at subsystem 14
    this.on('message',function(msg){
	// loop the message queue, find the 1st which will match the msg
	// by cmdId, clusterId, attId
	console.log('Duplexer got a message ...');

	if(Protocol.isHeartbeatRpt(msg)){
	    var obj = Protocol.parsePayloadHeartbeatRpt(msg);
	    console.log(obj);
	    that.addAddr( obj.chipId, obj.shorAddr, obj.deviceType);
	}
	else if(Protocol.isAns(msg)){
	    // 
	    console.log( "====receive a command answer====");
	    if(msg.cmdId === Protocol.MT_CUST_TEST ){
		msg.msg_type = 't';
	    }
	    else if(msg.cmdId === Protocol.MT_CUST_READ_ATTR_RSP){
		msg.msg_type = 'r';
		msg.param = Protocol.parseRData(msg.data);
		
	    }
	    else if(msg.cmdId === Protocol.MT_CUST_WRITE_ATTR_RSP){
		msg.msg_type = 'w';
	    }
	    else if(msg.cmdId === Protocol.MT_CUST_COMMAND_RSP){
		msg.msg_type = 'c';
	    }	    
	    console.log(msg);
	    // find task callback in the _queue, and call it
	    that.callbackTaskQueue(msg);
	}
    });
    
    this.on('syncheartbeat',function(){
	that.syncAddrQueue();
    });

    // check task queue, addr queue at a time
    setInterval(function(){
    	console.log('-------------');
    	console.log('Emit process signal');
	console.log(new Date());
	
    	that.emit('process');
	
    },TASK_QUEUE_SCAN_PERIOD);

    //add read task at a time
    setInterval(function(){
    	that.emit('addbatchtask');
    }, ACQUISITION_PERIOD);

};

Duplexer.prototype.addValueToAddrQueue =  function(cmd, data){
    var device;
    device = _.find(this._addrQueue, function(m){
	return(cmd.sn === m.sn);
    });
    if(device){
	console.log(this._addrQueue);
	device.value = data.value;
	device.timeStamp = new Date().getTime();
	console.log('after...');
	console.log(this._addrQueue);
    }else{
	console.log('No sn in addrQueue');
    }
};

function rCallback(err, cmd, data, that){
    console.log("local rCallback()");
    console.log(cmd);

    if(err){
	console.log(err.message);
	return;
    }
    
    if(data){
	console.log(data);
	console.log(that._addrQueue);
	that.addValueToAddrQueue(cmd, data);
	console.log(that._addrQueue);
    }
};

module.exports = Duplexer;









