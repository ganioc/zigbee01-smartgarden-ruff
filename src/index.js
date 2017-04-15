'use strict';

var _=require('./underscore.js');
var TaskRobin = require('./taskrobin2.js');
var Duplexer = require('./duplexer.js');
var Protocol = require('./protocol.js');
var Mqtt = require('mqtt');
var spawn = require('child_process').spawn;

// Definition of global variable
var TOPIC_GATEWAY_MESSAGE ='smartgarden/gw_sn00000001/message';
var TOPIC_GATEWAY_STATUS  ='smartgarden/gw_sn00000001/status';
var TOPIC_GATEWAY_LOG  ='smartgarden/gw_sn00000001/log';
var TOPIC_GATEWAY_HEARTBEAT = 'smartgarden/background/heartbeat';

var HOST = '139.196.19.179';
var PORT = 1883;
var CLIENT_ID = 'gw_sn-1';
var GW_SN = 'gw_sn00000001';
var heartbeat_counter = 10;


// mqtt client setting
 var SETTINGS = {
     keepalive: 1000,
     protocolId: 'MQIsdp',
     protocolVersion: 3,
     clientId: CLIENT_ID,
     username: 'alice',
     password: 'secret'
 };

// Host to Zigbee Coordinator interface, not used for Ruff board
var UART_PORT = '#zuart';
//var UART_BAUDRATE = 38400;

// task handler for zigbee communication
var duplexer = new Object();
var mqttClient = new Object();
var intervalStatus ;

var makeHeartbeat = (function(){
    var i =0;
    
    return function(){
	if( i > 0xffff ){
	    i = 0;
	}else{
	    i = i + 1;
	}
	return i;
    };
})();

var reboot = function(){
    spawn('reboot', ['-f']);
};


duplexer = new Duplexer({
    uart_port: UART_PORT,
    uart_baudrate: 38400
});

console.log("Run");


$.ready(function (error) {
    if (error) {
        console.log(error);
        return;
    }


    console.log("Init");
    // console.log(global);
    // init mqtt
    mqttClient = Mqtt.connect('mqtt://'+HOST+':'+PORT, SETTINGS);
    mqttClient.on('connect',function(){

	console.log('mqtt connected');

	mqttClient.subscribe(TOPIC_GATEWAY_MESSAGE);
	
	mqttClient.publish(TOPIC_GATEWAY_LOG,
		       JSON.stringify({sn: GW_SN, value:'logon'}));
	
	mqttClient.on('message',function(topic,msg){
	    console.log("Received message");

	    switch(topic){
	    case TOPIC_GATEWAY_MESSAGE:
		
		console.log('topic:' + topic + ' ' + msg);
		processCmdFromCustomer(msg.toString());
		
		break;
	    default:
		console.log('Unrecognized topic' + topic + ' ' + msg);
		break;
	    }
	});
	
 	intervalStatus = setInterval(function(){
	    console.log('Publish status');
	    mqttClient.publish(TOPIC_GATEWAY_STATUS,
			       JSON.stringify(getDeviceStatus()));
	},60000);

	setInterval(function(){
	    console.log('@');	
	    console.log("Publish heartbeat:" + heartbeat_counter);

	    
	    heartbeat_counter--;


	    if(heartbeat_counter < 0){
		reboot();
	    }

	    
	    mqttClient.publish( TOPIC_GATEWAY_HEARTBEAT,
			JSON.stringify(
			    {
				msg_id: makeHeartbeat(),
				gw: GW_SN
			    }
			)
			  );
	    
	}, 58000);
	
	duplexer.open();

	duplexer.on('errorport', function(err){
	    console.log('App:MTport error, should we restart?');
	});

	duplexer.on('log', function(data){
	    console.log('Send log to mqtt server');
	    mqttClient.publish(JSON.stringify(data));
	});

    });

    mqttClient.on('error',function(){
	console.log('mqtt error, consider to restart');
	setTimeout(function(){
	    throw new Error('mqtt close');

	},5000);	    
    });
	
    mqttClient.on('close', function(){
	console.log('mqtt close, to restart');

    });    
});


$.end(function () {

});



function getDeviceStatus(){
    return duplexer.getAddrQueue();;
};

function rCallback(err, obj, data){
    console.log('r callback()');
    console.log(obj);
    if(data){
        console.log( data );
        obj.msg_type = 'rr';
        obj.value = data.value;
        mqttClient.publish(TOPIC_GATEWAY_STATUS, JSON.stringify(obj));
    }

}

function wCallback(err, obj){

}

function cCallback(err, obj){


}

// test command callback function
function tCallback(err, cmd, obj){
    if(err){
        console.log(err.message);
        return;
    }

    console.log("test command callback()");
    console.log(obj);

    var out = {};
    out.msg_id = cmd.msg_id;
    out.msg_type = "tr";

    try{
	if( obj.data !== undefined){
	    out.value = obj.data[0];
	}
    }catch(e){
	
	console.log('No data in tCallback');
    }

    mqttClient.publish(TOPIC_GATEWAY_STATUS, JSON.stringify(out));
}

function processCmdFromCustomer( msg ){
    // send out command to duplexer, according to the command type
    //console.log((msg));
    
    var cmd;
    var option;

    try{
    	cmd = JSON.parse(msg);
    }catch(e){
    	console.log('Wrong input msg');
    	console.log(e);
    	return;
    }
    //cmd = JSON.parse(msg);
    console.log('');
    console.log('Received a remote msg');
    console.log(cmd);

    switch(cmd.msg_type){
    case 'r':
        if( cmd.param_id != undefined  && duplexer.checkRemoteMsgValid(cmd)==0
	    && _.has( Protocol.mapParam2HA, cmd.param_id.toString() )){
            console.log("Read:" + cmd.param_id + ' '
                        + Protocol.mapParam2HA[cmd.param_id.toString()].content);
            option = {
                cmd:cmd,
                param: Protocol.mapParam2HA[cmd.param_id.toString()]
            };
            duplexer.emit('addtask',option, rCallback );
        }
        else{
            console.log('Wrong msg content');
        }
        break;
    case 'w':
        if(cmd.param_id != undefined && _.has(Protocol.mapParam2HA. cmd.param_id.toString()) ){
            console.log("Write:" + cmd.param_id + ' '
                    + Protocol.mapParam2HA[cmd.param_id.toString()].content
                        + ' value:' + cmd.value);
            option = {
                cmd: cmd,
                param: Protocol.mapParam2HA[cmd.param_id.toString()]

            };
            duplexer.emit('addtask', option ,wCallback);
        }
        break;

    case 'c':// run command
        if(cmd.cmd_id != undefined && _.has( Protocol.mapCmd2HA , cmd.cmd_id.toString()) ){
            console.log("Run command:" + cmd.cmd_id + ' '
                        + Protocol.mapCmd2HA[cmd.cmd_id.toString()].content
                       );
            option = {
                cmd:   cmd,
                param: Protocol.mapCmd2HA[cmd.cmd_id.toString()]
            };
            duplexer.emit('addtask',option ,cCallback);
        }

        break;
    case 't':// test command
        console.log("Test command:" + cmd.cmd_id);
        option = {
            cmd: cmd,
            param:""
        };
        duplexer.emit('addtask', option, tCallback);
        break;
    case 'h':
	console.log("Heartbeat received:");

	// heartbeat charge
	heartbeat_counter++;
	
	
	break;
    default:
        console.log("Unrecognized msg_type:" + cmd.msg_type);
    }
}





