/*
	Title: JavaScript Workflow Engine

	Description: This is a simple Javascript workflow engine using the JavaScript module pattern. Any JavaScript functions
    can be defined and performed as workflow "actions".

	Author: Carol Skelly

*/



/* ------ workflow engine ------ */

function workflow(wfDef) {
  
  var _root = this;
  
  /*-- init --*/
  this.init = function() {
    
    _root.def = wfDef;
    
  };
  
  
  /*-------------------- internal ------------------------*/
  
  function updateState(stateName) {
    
    _root.state.stateName = stateName;
    _root.state.active = _root.active;	
    _root.state.current = _root.current;	
    _root.state.step = _root.def[_root.current];
    _root.state.results = _root.results;
    _root.stateChanged(_root.state);
  }
  
  
  /* given an array of steps, initiates execution of the step at idx */
  var doStep = function(arr,idx) {
    
    var lastResult;
    
    console.debug("do step:"+idx);
    _root.current = idx;
    
    if (_root.active) {
      
      // trigger step started event
      _root.stepStarted(idx);
      
      if ((arr.length-1)==idx){
        // final step
        doExec(arr[idx],function(resp){
          
          console.debug('final step returned:'+resp);
          updateState("complete");
          
          _root.results[idx] = resp;
          _root.active = false;
          _root.current = -1;
                    
          _root.stepComplete({id:_root.def.id,step:idx,resp:resp},_root.replayCallback);
          _root.allComplete();
          
          
          _root.callback("done"); // final workflow callback
          
        });			
      }
      else {								
        // other step
        updateState("running..");
        doExec(arr[idx],function(resp){
          
          console.debug('step '+idx+' returned:'+resp);
          
          _root.results[idx] = resp;
          _root.stepComplete({id:_root.def.id,step:idx,resp:resp},_root.replayCallback);
          
          setTimeout(doStep(arr,idx+1),1000); // call next step with 1 second delay
        });
      }
      
    }
    else {
      console.log("workflow paused or not active");
      return;
    }
    
    
  };
  
  /* given a step object definiton, executes the step and returns results to callback */
  var doExec = function(step,cb) {
    
    var result;
    var action = step.action;
    var args = step.args;
    var myinput = step.input;
    
    // make results available for chaining
    var last =  _root.results[_root.results.length-1];
    var responses = _root.results;
    
    // evaluate the actions and args
    if (typeof myinput == "undefined"){
      eval("result=" + action + "("+args+",cb)");
    }
    else {
      eval("result=" + action + "("+myinput+",cb)");
    }

  };
  
  /*----------------------- public -------------------------*/
  
  this.def;                                   // workflow definition
  this.state = {};                            // workflow state
  
  this.active = false;
  this.current = -1; 
  this.results = [];
  this.callback = function(r){delete activeWorkflows[_root.def.id];return;};
  this.replayCallback = function(idx){console.log('replaying....'+idx);_root.replay(idx)};
  
  
  /*----------------------- eventing ------------------------*/
  this.stepStartedHandler = {};
  this.stepStarted = function(i) {if (typeof stepStartedHandler != "undefined") stepStartedHandler(i)};
  
  this.stepCompleteHandler = {};
  this.stepComplete = function(resp,replayCb) {if (typeof stepCompleteHandler != "undefined") stepCompleteHandler(resp,_root.replayCallback)};
  
  this.allCompleteHandler = {};
  this.allComplete = function(resp) {if (typeof allCompleteHandler != "undefined") allCompleteHandler(resp)};
  
  this.stateChangedHandler = {};
  this.stateChanged = function(state) {if (typeof stateChangedHandler != "undefined") stateChangedHandler(state)};
  
  this.addListener = function (event,func) {
    
    if (event  ==  "stepStarted"){
      stepStartedHandler = func;
    };
    
    if (event  ==  "stepComplete"){
      stepCompleteHandler = func;
    };
    
    if (event  ==  "allComplete"){
      allCompleteHandler = func;
    };
    
    if (event  ==  "stateChanged"){
      stateChangedHandler = func;
    };
  };
  
  
  
  /*----------------- public methods ----------------*/
  
  /* executes (starts) a workflow */
  this.exec = function(callback) {
    
    _root.callback = callback;
    
    var wfObj = _root.def;
    var sequences = wfObj.sequence;
    
    if (sequences && sequences != null){
      
      _root.active = true;
      updateState("active");
      doStep(sequences,0); // start with first step
    }
  };
  
  
  /* cancels a workflow */
  this.cancel = function() {
    console.debug("stopping workflow..");	
    if (_root.current != -1) {
      _root.active = false;
      _root.current = -1;
      updateState("stopped");
      _root.callback("workflow canceled");
    }
    else {
      console.debug("cannot cancel, workflow not active");     
    }
  };
  
  /* pause a workflow */
  this.pause = function(cb) {
    console.debug("pausing workflow..");
    if (_root.active && _root.current > -1) {
      _root.active = false;
      updateState("paused");
      
      cb("paused");
    }
    else {
      console.debug("cannot pause, workflow not active");
      return;
    }
  };
  
  /* restart a paused workflow */
  this.restart = function(cb) {
    console.debug("restarting workflow..");
    
    if (!_root.active && _root.current > -1) {
      _root.active = true;
      _root.replay(_root.current);
      updateState("restarted");
      
      console.debug("restarting at:" + _root.current);
      
      cb("restarted");
    }
    else {
      console.log("cannot restart, workflow not active");                
    }
  };
  
  /* replay a workflow item */
  this.replay = function(idx) {
    console.debug("replaying workflow..");
    
    _root.active = true;
    _root.current = idx;
    updateState("replaying");
    
    console.debug("replaying:" + _root.current);
    
    var wfObj = _root.def;
    var sequences = wfObj.sequence;
    if (sequences && sequences != null){
      if (sequences[idx]){
        doStep(sequences,idx);
      }
      else {
        console.log("error: step not found in sequences");
        return;
      }
    }
    
  };
  
  /*--------------- end public ---------------*/
  
  
};
/*-------- end workflow engine ----------- */
