/*
 *  opsworks.js
 *  Functions for creating stacks, layers, apps, instances, etc. using
 *    OpsWorks Stacks
 */
var REGION='us-east-1'
var INSTANCE_TYPE='m1.small'
var OS="Ubuntu 14.04 LTS"

// Hardcoded locations in public S3 repository and GitHub
var S3_COOKBOOK_URL="https://s3-us-west-2.amazonaws.com/stelligent-project/miniproject-cookbook.tar.gz"
var GIT_APP_URL="https://github.com/chrisp810/stelligent-miniproject-nodeapp.git";

module.exports = {
	createStack: function(ids,callback,nextState) {
		doCreateStack(ids,callback,nextState);
	},
	createLayer: function(ids,callback,nextState) {
		doCreateLayer(ids,callback,nextState);
	},
	createApp: function(ids,callback,nextState) {
		doCreateApp(ids,callback,nextState);
	},
	createInstance: function(ids,callback,nextState) {
		doCreateInstance(ids,callback,nextState);
	},
	startInstance: function(ids,callback,nextState) {
		doLaunchInstance(ids,callback,nextState);
	},
	deployApp: function(ids,callback,nextState) {
		doDeployApp(ids,callback,nextState);
	},
	showAppDetails: function(ids) {
		fetchAppDetails(ids);
	}
};

var AWS = require('aws-sdk');
AWS.config.update({region:REGION});

// Use OpsWorks API
var opsworks = new AWS.OpsWorks();

// Create an OpsWorks stack
function doCreateStack(IDS,callback,nextState) {
	var CreateStackParams = {
		DefaultInstanceProfileArn: IDS.instanceprofile,
		Name: 'Piepenbring Miniproject',
		Region: REGION,
		ServiceRoleArn: IDS.role,
		UseCustomCookbooks: true,
		CustomCookbooksSource: {
			Type: 'archive',
			Url:  S3_COOKBOOK_URL
		},
		DefaultOs: OS,
		ConfigurationManager: {
			Name: 'Chef',
			Version: '12'
		}
	};

	console.log("Creating AWS stack...");
	opsworks.createStack(CreateStackParams, function(err, data) {
		if (err) {
			console.log('Error encountered creating stack: ' + err);
			callback(null,{});
		} else {
			console.log("Created stack ID: " + data.StackId);	
			callback(nextState,{stack: data.StackId});
		}
	});
};

// Create a layer on a stack
function doCreateLayer(IDS,callback,nextState) {
	var CreateLayerParams = {
		Name: 'MiniprojectLayer',
		AutoAssignPublicIps: true,
		Type: 'custom',
		Shortname: 'miniproject',
		StackId: IDS.stack,
		CustomRecipes: {
			Deploy: ["stelligent_miniproject::default"]
		},
		CustomSecurityGroupIds: [
			IDS.securitygroup
		],
	};
	console.log("Creating AWS layer...");
	opsworks.createLayer(CreateLayerParams, function(err, data) {
		if (err) {
			console.log('Error encountered creating layer: ' + err);
			callback(null,{});
		} else {
			console.log("Created layer ID: " + data.LayerId);	
			callback(nextState,{layer: data.LayerId});
		}
	});
};

// Create an app using the GitHub URL
function doCreateApp(IDS,callback,nextState) {
	var CreateAppParams = {
		Name: 'MiniprojectApp',
		Type: 'other',
		StackId: IDS.stack,
		AppSource: {
			Type: 'git',
			Url: GIT_APP_URL
		}
	};
	console.log("Creating AWS application...");
	opsworks.createApp(CreateAppParams, function(err, data) {
		if (err) {
			console.log('Error encountered creating application: ' + err);
			callback(null,{});
		} else {
			console.log("Created application ID: " + data.AppId);	
			callback(nextState,{app: data.AppId});
		}
	});
};

// Launch an instance of the stack (after it has been created
function doLaunchInstance(IDS,callback,nextState) {
	var StartInstanceParams = {
		InstanceId: IDS.instance
	};
	console.log("Starting instance...");
	opsworks.startInstance(StartInstanceParams, function(err, data) {
		if (err) {
			console.log('Error encountered starting instance: ' + err);
			callback(null,{});
		} else {
			console.log("Started instance ID: " + IDS.instance);	
			// We have successfully built the stack and the instance is starting
			var WaitParams = {
				InstanceIds: [ IDS.instance ]
			};
			console.log('Waiting for instance to come online (this may take several minutes)');
			opsworks.waitFor('instanceOnline', WaitParams, function(err, data) {
				if (err) {
					console.log('Error encountered waiting for instance to start: ' + err);
					callback(null,{});
				} else {
					console.log("Instance is running!");
					callback(nextState,{});
				}
			});
		}
	});
};

// Create an instance of the stack
function doCreateInstance(IDS,callback,nextState) {
	var CreateInstanceParams = {
		StackId: IDS.stack,
		LayerIds: [ IDS.layer ],
		InstanceType: INSTANCE_TYPE,
	};
	console.log("Creating instance...");
	opsworks.createInstance(CreateInstanceParams, function(err, data) {
		if (err) {
			console.log('Error encountered creating instance: ' + err);
			callback(null,{});
		} else {
			console.log("Created instance ID: " + data.InstanceId);	
			callback(nextState,{instance: data.InstanceId});
		}
	});
};

// Deploy the application using OpsWorks Chef 12
function doDeployApp(IDS,callback,nextState) {
	var CreateDeploymentParams = {
		StackId: IDS.stack,
		AppId: IDS.app,
		Command: {
			Name: 'deploy'
		}
	};
	console.log("Deploying application...");
	opsworks.createDeployment(CreateDeploymentParams, function(err, data) {
		if (err) {
			console.log('Error encountered deploying application: ' + err);
			callback(null,{});
		} else {
			console.log("Deployment started");
			// We have started deploying the app
			var WaitParams = {
				AppIds: [ IDS.app ]
			};
			console.log('Waiting for application to deploy (this may take several minutes)');
			opsworks.waitFor('appExists', WaitParams, function(err, data) {
				if (err) {
					console.log('Error encountered waiting for application to deploy: ' + err);
					callback(null,{});
				} else {
					console.log("Application is running!");
					callback(nextState,{});
				}
			});
		}
	});
};

// Get the IP address of our instance and display the application URL to the user
function fetchAppDetails(IDS) {
	var DescribeInstanceParams = {
		InstanceIds: [ IDS.instance ],
	};
	console.log("Getting instance details...");
	opsworks.describeInstances(DescribeInstanceParams, function(err, data) {
		if (err) {
			console.log('Error encountered getting instance details: ' + err);
			callback(null,{});
		} else {
			if (data.Instances instanceof Array) {
				var instanceInfo = data.Instances[0];
				console.log('\n\n*** Application is running.  Access it at: http://' + instanceInfo.PublicIp + ' ***');
			}
		}
	});
};
