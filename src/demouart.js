'use strict';

var TaskRobin = require('./taskrobin2.js');
var Duplexer = require('./duplexer.js');
var Protocol = require('./protocol.js');
var Mqtt = require('mqtt');

// Definition of global variable
var TOPIC_GATEWAY_MESSAGE ='smartgarden/gw_sn00000002/message';
var TOPIC_GATEWAY_STATUS  ='smartgarden/gw_sn00000002/status';

var HOST = '139.196.19.179';
var PORT = 1883;
var CLIENT_ID = 'client-2';

// mqtt client setting
 var SETTINGS = {
     keepalive: 1000,
     protocolId: 'MQIsdp',
     protocolVersion: 3,
     clientId: CLIENT_ID,
     username: 'jack',
     password: 'secret'
 };

// Host to Zigbee Coordinator interface, not used for Ruff board
var UART_PORT = '#zuart';
var UART_BAUDRATE = 38400;

// task handler for zigbee communication
var duplexer = new Object();
var mqttClient = new Object();
var intervalStatus ;



$.ready(function (error) {
    if (error) {
        console.log(error);
        return;
    }

    console.log("Init");

    duplexer = new Duplexer({
	uart_port: UART_PORT,
	uart_baudrate: UART_BAUDRATE
    });

    duplexer.open();
    
    
    setInterval(function(){
	var buf = new Buffer(6);
	buf[0] = 254;
	buf[1] = 1;
	buf[2] = 142;
	buf[3] = 0;
	buf[4] = 10;
	buf[5] = 133;
	
	duplexer._port.write(buf);
	

    },4000);
});


$.end(function () {

});

