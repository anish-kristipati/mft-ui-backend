import express from 'express';
const cors = require('cors');
const { loadSync, loadPackageDefinition, get } = require('@grpc/proto-loader');
const { ChannelCredentials } = require('@grpc/grpc-js');
const { spawn } = require('child_process');

// Child Process for mft initialization
const child = spawn('mft', ['init']);
console.log("Running mft init");
child.stdout.on('data', (data) => console.log(`stdout: ${data}`));
child.stderr.on('data', (data) => console.error(`stderr: ${data}`));

const app = express();
const port = 5500;
const allowedOrigins = ["http://localhost:3000", "http://localhost:80", "http://localhost:8080"];

// gRPC Proto & Client Setup
const PROTO_PATH = 'proto/StorageCommon.proto';
const TRANSFER_API_PROTO_PATH = 'src/proto/api/stub/src/main/proto/MFTTransferApi.proto';

const packageDefinition = loadSync(PROTO_PATH, { /* ... options ... */ });
const proto = loadPackageDefinition(packageDefinition);
const Service = get(proto, "org.apache.airavata.mft.resource.stubs.storage.common.StorageCommonService");
const serviceClient = new Service("localhost:7003", ChannelCredentials.createInsecure());

const transferApiPackageDefinition = loadSync(TRANSFER_API_PROTO_PATH, { /* ... options ... */ });
const transferApiProto = loadPackageDefinition(transferApiPackageDefinition);
const TransferService = get(transferApiProto, "org.apache.airavata.mft.api.service.MFTTransferService");
const TransferServiceClient = new TransferService("localhost:7003", ChannelCredentials.createInsecure());

// CORS Configuration (with Options)
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// API Endpoints
app.get('/', (req, res) => {
  res.send("<h2>You've reached the MFT API!</h2>");
});

app.get('/list-storages', (req, res) => {
  serviceClient.listStorages({}, (error, response) => {
    if (error) {
      console.error(error);
      res.status(500).json(error);
    } else {
      res.json(response);
    }
  });
});

app.get('/list-storages/:storageId', (req, res) => {
  const storageId = req.params.storageId;
  const storageType = req.headers.storagetype;
  const path = req.headers.path || '/'; // Default to root path

  const retrieveMetadata = (secretId) => {
    TransferServiceClient.resourceMetadata({
      idRequest: {
        resourcePath: path,
        storageId: storageId,
        secretId: secretId,
        recursiveSearch: true,
      }
    }, (error, response) => {
      if (error) {
        console.error(error);
        res.status(500).json(error);
      } else {
        res.json(response);
      }
    });
  };

  if (storageType === "LOCAL") {
    retrieveMetadata(""); // Empty secretId for local storage
  } else {
    serviceClient.getSecretForStorage({ storageId }, (error, response) => {
      if (error) {
        console.error(error);
        res.status(500).json(error);
      } else {
        retrieveMetadata(response.secretId);
      }
    });
  }
});

// Start the Server
app.listen(port, () => {
  console.log(`MFT backend listening on port ${port}`);
});