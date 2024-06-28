module.exports = function(RED) {
    "use strict";
    
    // Require the Backblaze B2 Client
    function B2Node(n) {
        
        RED.nodes.createNode(this,n);

        if(this.credentials && this.credentials.keyid && this.credentials.appid) {    
            this.B2 = require('backblaze-b2');
            this.b2 = new this.B2({
                applicationKeyId: this.credentials.keyid,
                applicationKey: this.credentials.appid
            });
        } else {
            node.warn(RED._('backblaze-b2.warn.missing-config'));
        }
    }
    RED.nodes.registerType("backblaze-config-b2", B2Node, {
        credentials: {
            keyid: {  type:"text"},
            appid: {  type: "password" }
        }
    });

    function setupNode(that, n, ) {
                
        // Init variables
        that.b2Config = RED.nodes.getNode(n.b2);

        const node = that;
        const backblaze = that.b2Config || null;

        // Check if the config node is valid
        if(!backblaze) {
            node.warn(RED._('backblaze-b2.warn.missing-config'));
            return;
        }

        return node;
    }

    function BackBlazeB2listNode(n) {
        // Setup the node
        RED.nodes.createNode(this,n);

        const node = setupNode(this, n);

        this.on("input", async (msg, send, done) => {

            node.status({fill:"blue",shape:"dot",text:"b2.status.initializing"});
            
            this.b2Config.b2.authorize()
                .then(async () => {
                    node.status({fill:"green",shape:"dot",text:"b2.status.ready"})

                    // define variables
                    const path = n.path || msg.payload || "";
                    const bucket = n.bucket || msg.bucket;

                    if(!bucket) {
                        node.status({fill:"red",shape:"ring",text:"b2.error.no-bucket-specified"});
                        node.error(RED._("b2.error.no-bucket-specified"));
                        done();
                        return;
                    };

                    // get bucket id
                    const getBucket = await this.b2Config.b2.getBucket({ bucketName: bucket })
                        .catch((err) => {msg.error = err; send(msg); done();})

                    const bucketId = getBucket && getBucket.data.buckets.length ? getBucket.data.buckets[0].bucketId : null;

                    if(!bucketId) {
                        node.status({fill:"red",shape:"ring",text:"b2.error.bucket-not-found"});
                        node.error(RED._("b2.error.bucket-not-found"));
                        return;
                    }
                    
                    // get file list
                    this.b2Config.b2.listFileNames({
                        bucketId: bucketId,
                        prefix: path,
                        maxFileCount: 1000
                    }).then((fileList) => {
                        const prefixLength = path.length;

                        msg.payload = fileList.data.files
                            .map((file) => file.fileName)
                            .filter(filename => !filename.substring(prefixLength + 1).includes('/'));
                        
                        send(msg);
                        done();
                    }).catch((err) => {
                        node.status({fill:"red",shape:"ring",text:"b2.error.failed-to-fetch"});
                        node.warn(RED._("b2.error.failed-to-fetch"), {err:err});
                        
                        send(msg);
                        done();
                    });
                })
                .catch(() => node.status({fill:"red",shape:"ring",text:"b2.error.auth-failed"}));
            })
    }
    RED.nodes.registerType("Backblaze b2 list", BackBlazeB2listNode);

    function BackblazeB2DownloadNode(n) {
        // Setup the node
        RED.nodes.createNode(this,n);

        const node = setupNode(this, n);
        
        this.on("input", async (msg, send, done) => {

            this.b2Config.b2.authorize()
                .then(async () => {
                    node.status({fill:"green",shape:"dot",text:"b2.status.ready"})

                    const bucket = n.bucket || msg.bucket;
                    if(!bucket) {
                        node.status({fill:"red",shape:"ring",text:"b2.error.no-bucket-specified"});
                        node.error(RED._("b2.error.no-bucket-specified"));

                        done();
                        return;
                    };
                    
                    this.b2Config.b2.downloadFileByName({
                        bucketName: bucket,
                        fileName: n.filename || (typeof msg.filename === 'string' ? msg.filename : ""),
                        responseType: n.format || 'arraybuffer',
                        onDownloadProgress: (progress) => { console.log(progress) }
                    }).then((file) => {
                        msg.payload = file.data;
                        
                        send(msg);
                        done();
                    }).catch((err) => {
                        node.status({fill:"red",shape:"ring",text:"b2.error.file-not-found"});
                        node.warn(RED._("b2.error.file-not-found"), {err:err});

                        send(msg);
                        done();
                    });
                })
                .catch(() => node.status({fill:"red",shape:"ring",text:"b2.error.auth-failed"}));
        });
    }
    RED.nodes.registerType("Backblaze b2 download", BackblazeB2DownloadNode)

    function BackblazeB2DeleteNode(n) {
        // Setup the node
        RED.nodes.createNode(this,n);

        const node = setupNode(this, n);

        this.on("input", async (msg, send, done) => {

            this.b2Config.b2.authorize()
                .then(async () => {
                    node.status({fill:"green",shape:"dot",text:"b2.status.ready"})

                    // define variables
                    const filename = n.filename || (typeof msg.filename === 'string' ? msg.filename : "");
                    const bucket = n.bucket || msg.bucket;

                    if(!bucket) {
                        node.status({fill:"red",shape:"ring",text:"b2.status.no-bucket-specified"});
                        node.error(RED._("b2.status.no-bucket-specified"));

                        done();
                        return;
                    };

                    // get bucket id
                    const getBucket = await this.b2Config.b2.getBucket({ bucketName: bucket })
                        .catch((err) => {msg.error = err; send(msg); done();})

                    const bucketId = getBucket && getBucket.data.buckets.length ? getBucket.data.buckets[0].bucketId : null;

                    if(!bucketId) {
                        node.status({fill:"red",shape:"ring",text:"b2.error.bucket-not-found"});
                        node.error(RED._("b2.error.bucket-not-found"));
                        return;
                    }

                    // Get all file versions from filename
                    const versions = (await this.b2Config.b2.listFileVersions({
                        bucketId: bucketId,
                        startFileName: filename,
                        maxFileCount: 10
                    }).catch((err) => {
                        node.status({fill:"red",shape:"ring",text:"b2.error.file-not-found"});
                        node.warn(RED._("b2.error.file-not-found"), {err:err});
                        done();
                    })).data.files.filter(file => file.fileName === filename);

                    if(!versions) return;

                    console.log(versions)

                    msg.payload = versions;

                    if(versions.length === 0) {
                        node.status({fill:"yellow",shape:"dot",text:"b2.error.file-not-found"});
                        node.warn(RED._("b2.error.file-not-found"));
                        
                        send(msg);
                        done();
                        return;
                    }

                    // Delete all file versions
                    node.status({fill:"yellow",shape:"dot",text:"b2.status.deleting"})

                    Promise.all(versions.map(async (file) => {
                        return await this.b2Config.b2.deleteFileVersion({
                            fileId: file.fileId,
                            fileName: file.fileName
                        })
                    })).then(() => {
                        node.status({fill:"green",shape:"dot",text:"b2.status.ready"})

                        send(msg);
                        done();
                    }).catch((err) => {
                        node.error(RED._("b2.error.delete-failed"), {err:err});

                        done();
                    });
                })
                .catch(() => node.status({fill:"red",shape:"ring",text:"b2.error.auth-failed"}));
        });
    }
    RED.nodes.registerType("Backblaze b2 delete", BackblazeB2DeleteNode)

    function BackBlazeB2UploadNode(n) {
        // Setup the node
        RED.nodes.createNode(this,n);

        const node = setupNode(this, n);

        this.on("input", async (msg, send, done) => {

            this.b2Config.b2.authorize()
                .then(async () => {
                    node.status({fill:"green",shape:"dot",text:"b2.status.ready"})

                    const filename = n.filename || (typeof msg.filename === 'string' ? msg.filename : "");
                    const file = msg.payload;

                    const bucketName = n.bucket || msg.bucket;
                    
                    if(!bucketName) {
                        node.status({fill:"red",shape:"ring",text:"b2.error.no-bucket-specified"});
                        node.error(RED._("b2.error.no-bucket-specified"));
                        done();
                        return;
                    };

                    // get bucket id
                    const getBucket = await this.b2Config.b2.getBucket({ bucketName: bucketName })
                        .catch((err) => {msg.error = err; send(msg); done();})

                    const bucketId = getBucket && getBucket.data.buckets.length ? getBucket.data.buckets[0].bucketId : null;

                    if(!bucketId) {
                        node.status({fill:"red",shape:"ring",text:"b2.error.bucket-not-found"});
                        node.error(RED._("b2.error.bucket-not-found"));
                        return;
                    }

                    const uploadUrl = await this.b2Config.b2.getUploadUrl({ bucketId: bucketId }).catch(() => {});
                    
                    if(!uploadUrl) {
                        node.status({fill:"red",shape:"ring",text:"b2.error.upload-request-failed"});
                        node.error(RED._("b2.error.upload-request-failed"));

                        done();
                        return;
                    };

                    const fileUpload = {
                        uploadUrl: uploadUrl.data.uploadUrl,
                        uploadAuthToken: uploadUrl.data.authorizationToken,
                        fileName: filename,
                        data: file
                    };

                    // const upload = await this.b2Config.b2.uploadFile(fileUpload).catch((error) => {
                    //     node.error(error ? error.toString() : 'uploader failed with: ' + JSON.stringify(fileUpload))
                    // });

                    const upload = await uploadWithRetries(fileUpload, this.b2Config.b2.uploadFile).catch((error) => {
                        node.error(error)
                    });

                    if(!upload) {
                        node.status({fill:"red",shape:"ring",text:"b2.error.upload-failed"});
                        node.error(RED._("b2.error.upload-failed"));

                        done();
                        return;
                    }

                    msg.payload = upload;

                    send(msg);

                })
                .catch(() => node.status({fill:"red",shape:"ring",text:"b2.error.auth-failed"}));
        });
    }
    RED.nodes.registerType("Backblaze b2 upload", BackBlazeB2UploadNode);

    const MAX_RETRIES = 10; // Set the maximum number of retries
    const RETRY_DELAY_MS = 1000; // Initial delay in milliseconds

    async function uploadWithRetries(fileUpload, uploader, retries = 0) {
        try {
            const upload = await uploader(fileUpload);
            return upload.data;
        } catch (error) {
            if (retries < MAX_RETRIES) {
                console.error(`Upload failed (attempt ${retries + 1}): ${error}`);
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
                return uploadWithRetries(fileUpload, uploader, retries + 1);
            } else {
                console.error(`Max retries reached. Upload failed: ${error}`);
                throw error;
            }
        }
    }

}