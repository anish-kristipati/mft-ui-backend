const express = require('express');
const cors = require('cors');
const { loadSync, loadPackageDefinition, get } = require('@grpc/proto-loader');
const { ChannelCredentials } = require('@grpc/grpc-js');

const app = express();
const port = 5500;
const allowedOrigins = ["http://localhost:3000"];

// gRPC Proto & Client Setup (as provided)
const PROTO_PATH = 'proto/StorageCommon.proto';
const TRANSFER_API_PROTO_PATH = 'proto/api/stub/src/main/proto/MFTTransferApi.proto';

const packageDefinition = loadSync(PROTO_PATH, { /* ... options ... */ });
const proto = loadPackageDefinition(packageDefinition);
const Service = get(proto, "org.apache.airavata.mft.resource.stubs.storage.common.StorageCommonService");
const serviceClient = new Service("localhost:7003", ChannelCredentials.createInsecure());

const transferApiPackageDefinition = loadSync(TRANSFER_API_PROTO_PATH, { /* ... options ... */ });
const transferApiProto = loadPackageDefinition(transferApiPackageDefinition);
const TransferService = get(transferApiProto, "org.apache.airavata.mft.api.service.MFTTransferService");
const TransferServiceClient = new TransferService("localhost:7003", ChannelCredentials.createInsecure());

// CORS Configuration
app.use(cors({
  origin: allowedOrigins,
}));

// Example API Endpoint
app.get('/storage/list', (req, res) => {
  // Call gRPC service method using serviceClient
  serviceClient.listFiles({}, (error, response) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error listing files');
    } else {
      res.json(response.getFileList());
    }
  });
});

// Start the Server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});