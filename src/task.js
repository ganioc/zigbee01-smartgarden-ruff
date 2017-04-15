'use strict';


var funcSeqId = (function(){
    var seqId = 0;
    return function(){
	if(seqId > 0xffff){
	    seqId = -1;
	}
	return seqId++;
    };
})();


function Task(options,callback){
    this._id = funcSeqId();
    this._timeout = options.timeout || 6000;// 4s timeout
    this._life = 4;
    // if(options.type === undefined){
    // 	throw new Error('Task need options.type');
    // }
    
    this.cmd = options.cmd;
    
    this.param = options.param;

    this.bProcessed = false;

    this.timeStamp = new Date().getTime();

    this.bDone = false;
    this.callback = callback;
}

Task.prototype.timeout = function(){
    if(this.cmd.msg_id){
	console.log('Timeout Remote taskId:' + this.cmd.msg_id);
    }else{
	console.log('Timeout Local taskId:' + this._id);
    }
    this.callback(new Error('timeout'), this, null);


};

module.exports = Task;
