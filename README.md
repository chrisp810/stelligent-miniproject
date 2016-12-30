# stelligent-miniproject

This is Chris Piepenbring's mini-project for Stelligent.  It uses AWS OpsWorks Stacks to provision an EC2 instance and deploy a simple node.js application on that instance to render a single HTML page.

This project is run with node and uses the AWS Javascript API.

## Prerequisites
- Must have Node.js installed
- Must install the AWS Javascript API (`npm install aws-sdk`)
- Must install underscore.js for node (n`pm install underscore`)
- Must have an AWS account and have set up credentials for use with the API (aws configure or manually enter in `~/.aws/credentials`
- Must have the following permissions on your AWS user (grant through IAM):
    - IAMFullAccess
    - AmazonS3FullAccess
    - AWSOpsWorksFullAccess

## Running the code
The project is run using `node miniproject.js`.  It will output status as it sets up the stack, layer, instance, and app.  Note that the instance takes over 5 minutes to spin up.  The output will warn you of this.  When it completes, the URL to the deployed application will be shown and can be visited to see the expected "Automation for the People" message.

## Other pieces to the project
There are two other parts to this project.  The Chef cookbook to deploy this application using the OpsWorks Chef 12 stack is stored on a S3 store at `https://s3-us-west-2.amazonaws.com/stelligent-project/miniproject-cookbook.tar.gz`.  For convenience, it is also under the `cookbook` directory in this project.

The simple node.js application itself that is deployed to the server is in a separate GitHub repository at `https://github.com/chrisp810/stelligent-miniproject-nodeapp`.

