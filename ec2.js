/*
 *  ec2.js
 *  Functions for creating EC2 security group for Miniproject and
 *    retrieving IAM OpsWorks roles
 */
var REGION='us-east-1'

// Used by state machine
module.exports = {
	createSecurityGroup: function(ids,callback,nextState) {
		doCreateSecurityGroup(ids,callback,nextState);
	},
	getRoles: function(ids,callback,nextState) {
		doGetRoles(ids,callback,nextState);
	}
};

var AWS = require('aws-sdk');
AWS.config.update({region:REGION});

var ec2 = new AWS.EC2();
var iam = new AWS.IAM();

// Hardcoded names used by OpsWorks Stacks
var INSTANCE_PROFILE_NAME='aws-opsworks-ec2-role';
var ROLE_NAME='aws-opsworks-service-role';

// Create an EC2 security group
function doCreateSecurityGroup(IDS,callback,nextState) {
	var CreateGroupParams = {
		Description: 'Web App Port 80 Enabling',
		GroupName: 'Miniproject Web App',
	};

	console.log("Creating security group...");
	ec2.createSecurityGroup(CreateGroupParams, function(err, data) {
		if (err) {
			if (err.code == 'InvalidGroup.Duplicate') {
				// Handle duplicate group, retrieve ID for existing group
				var DescribeGroupParams = {
					GroupNames: [ 'Miniproject Web App' ]
				};
				ec2.describeSecurityGroups(DescribeGroupParams, function(err,data) {
					if (err) {
						console.log('Error encountered creating group: ' + err);
					} else {
						if (data.SecurityGroups instanceof Array) {
							var GROUP_ID = data.SecurityGroups[0].GroupId;
							callback(nextState,{securitygroup: GROUP_ID});
						}
					}
				});
			} else {
				console.log('Error encountered creating group: ' + err);
				callback(null,{});
			}
		} else {
			console.log("Created security group ID: " + data.GroupId);	
			var GROUP_ID = data.GroupId;

			// We have a new security group, authorize ingress on port 80
			var AuthorizeIngressParams = {
				GroupId: GROUP_ID,
				CidrIp: '0.0.0.0/0',
				IpProtocol: 'tcp',
				ToPort: 80,
				FromPort: 80
			};
			ec2.authorizeSecurityGroupIngress(AuthorizeIngressParams, function(err, data) {
				if (err) {
					console.log('Error encountered adding ingress rule: ' + err);
					callback(null,{});
				} else {
					// Let the caller move on to the next state
					callback(nextState,{securitygroup: GROUP_ID});
				}
			});
		}
	});
};

// Retrieve the IDs for the OpsWorks role and instance profile
function doGetRoles(IDS,callback,nextState) {
	var GetInstanceGroupParams = {
		InstanceProfileName: INSTANCE_PROFILE_NAME
	};

	console.log("Retrieving roles...");
	iam.getInstanceProfile(GetInstanceGroupParams, function(err, data) {
		if (err) {
			console.log('Error encountered getting instance profile: ' + err);
			callback(null,{});
		} else {
			var INSTANCE_PROFILE_ID = data.InstanceProfile.Arn;
			var GetRoleParams = {
				RoleName: ROLE_NAME
			};
			iam.getRole(GetRoleParams, function(err, data) {
				if (err) {
					console.log('Error encountered getting role: ' + err);
					callback(null,{});
				} else {
					var ROLE_ID = data.Role.Arn;
					console.log("Got roles");
					callback(nextState,{instanceprofile: INSTANCE_PROFILE_ID, role: ROLE_ID});
				}
			});
		}
	});
};

