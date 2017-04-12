'use strict';


var EventEmitter = require('events');
var util = require('util');
var Protocol = require('./protocol.js');

var rcvBuf = new Buffer(255);

var state; // global state
// The index into the rcvBuf, length is the data length (exclude SOF and FCS)
var index =0;
var LEN_TOKEN = 0;
var length = 0;
var FCS_TOKEN;

var SOP_STATE = 0;
var CMD_STATE1 = 1;
var CMD_STATE2 = 2;
var LEN_STATE  = 3;
var DATA_STATE = 4;
var FCS_STATE  = 5;

var MT_UART_SOF = 0xfe;


// collect Frame
// Assemble the frame
function AnalyzeFrame( data, that){
    console.log('In AnalyzeFrame');
    console.log(typeof data);
    
    for(var i = 0; i< data.length; i++){
	AnalyzeByte(data[i], that);
    }
};

function AnalyzeByte(ch, that){
    
    switch(state){
    case SOP_STATE:
	console.log('Frame start:' + ch.toString('16'));
	if(ch == MT_UART_SOF)
	    state = LEN_STATE;
	break;
    case LEN_STATE:
	//LEN_TOKEN = ch;
	console.log('length dec:' + ch.toString());
	length = ch;
	index = 0;
	if(length <= 255){
	    state = CMD_STATE1;
	    rcvBuf[ index++ ] = length; // save it to buffer;
	}
	else{
	    state = SOP_STATE;
	}
	break;
    case CMD_STATE1:
	//log_print('cmd1: '+ ch.toString() );
	rcvBuf[index++ ] = ch;
	state = CMD_STATE2;
	break;
    case CMD_STATE2:
	//log_print('cmd2: ' + ch.toString() );
	rcvBuf[index++ ] = ch;
	if(length){
	    state = DATA_STATE;
	}else{
	    state = FCS_STATE;
	}
	break;
    case DATA_STATE:
	//log_print('data: ' + ch.toString() );
	rcvBuf[index++] = ch;

	if( index === (length + 3)){
	    state = FCS_STATE;
	}
	
	break;
    case FCS_STATE:
	console.log('FCS STATE: ' + ch.toString() );
	FCS_TOKEN = ch;

	if( Protocol.MT_UartCalcFCS( rcvBuf, index) === FCS_TOKEN ){
	    var data = new Buffer(rcvBuf, 0, index );
	    // Use protocol to parse received message
	    console.log('Received a valid message');
	    that.emit('message', Protocol.parse(data));
	}
	
	state = SOP_STATE;
	break;
    default:
	break;
    }
}


function bRuff(){
    if(process.title == 'node'){
	return false;
    }else{
	return true;
    }
}

function MTPort(portPath, baudRate){
    EventEmitter.call(this);
    var that = this;

    this._port = $(portPath);

    state = SOP_STATE;
    index = 0;
    this._port.on('data', function(data){
	AnalyzeFrame(data, that);
    });
}

util.inherits(MTPort, EventEmitter);

MTPort.prototype.send = function(buffer, callback){
    console.log('MTPort send()');
};

MTPort.prototype.write = function(buffer, callback){

    console.log("MTPort write()");
    this._port.write(buffer,callback);
};


module.exports = MTPort;

