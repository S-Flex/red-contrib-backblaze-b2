# Node-Red B2 Backblaze Library

This Node-Red library allows users to interact with the B2 Backblaze cloud storage service. The library contains four nodes: list, download, upload, and delete. These nodes provide users with the ability to perform common operations such as uploading, downloading, and deleting files from their B2 Backblaze account.

## Usage

Once the Node-Red B2 Backblaze library is installed, you can use it to interact with your B2 Backblaze account. Below is a brief overview of each node and its functionality. more specific documentation can be found in the Help section in node-red itself.

### List Node

The list node allows you to retrieve a list of files from your B2 Backblaze account. You can specify a bucket name and a file prefix to filter the results. The output of this node is an array of filenames, where each object represents a file in your B2 Backblaze account.

### Download Node

The download node allows you to download a file from your B2 Backblaze account. You can specify a bucket name and a file name to retrieve the file. The output of this node can also be specified. This library supports all the options that the `backblaze-b2` library also supports. Those options are `arraybuffer`, `blob`, `document`, `json`, `text`, `stream`.

### Upload Node

The upload node allows you to upload a file to your B2 Backblaze account. You can specify a bucket name, a file name, and the contents of the file. This node always expects `msg.payload` to be a buffer. The output of this node is an object containing information about the uploaded file.

### Delete Node

The delete node allows you to delete a file from your B2 Backblaze account. You can specify a bucket name and a file name to delete the file. The output of this node is an object containing information about the deleted file.

## Dependencies

This library depends on the following Node.js modules:

- `backblaze-b2`: A Node.js library for interacting with the B2 Backblaze cloud storage service.

## License

This library is released under the [MIT License](https://opensource.org/licenses/MIT).
