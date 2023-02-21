module.exports = function(RED) {
    "use strict";
    
    // Require the Backblaze B2 Client
    function B2Node(n) {
        
        RED.nodes.createNode(this,n);

        if(this.credentials && this.credentials.accesskeyId && this.credentials.secretAccessKey) {    
            this.B2 = require('backblaze-b2');
            this.b2 = new this.B2({
                applicationKeyId: this.credentials.accesskeyId,
                applicationKey: this.credentials.secretAccessKey
            });
        }
    }

    RED.nodes.registerType("backblaze-b2-config", B2Node, {
        credentials: {
            accesskeyId: {  type:"text"},
            secretAccessKey: {  type: "password" }
        }
    });

    // function BackBlazeB2InNode(n) {
    //     RED.node.createNode(this,n);
    //     this.b2Config = RED.nodes.getNode(n.b2Config);

    // }



}