// No logic here any more.  Init the state machine and let it walk through the
//   steps to provision the instance and deploy the app
 
var stateMachine = require('./state-machine');
stateMachine.changeState(stateMachine.STATES.START,{});
