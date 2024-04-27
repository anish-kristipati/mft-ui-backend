import express from 'express';
import { loadSync } from '@grpc/proto-loader';
import { loadPackageDefinition, ChannelCredentials } from '@grpc/grpc-js';
import cors from 'cors';
import lodash from 'lodash';

const app = express();
const port = 5500;

const PROTO_PATH = 'proto/StorageCommon.proto';
const packageDefinition = loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    arrays: true,
    defaults: true,
    oneofs: true,
});
const proto = loadPackageDefinition(packageDefinition);
const Service = lodash.get(proto, 'org.apache.airavata.mft.resource.stubs.storage.common.StorageCommonService');
const serviceClient = new Service('localhost:7003', ChannelCredentials.createInsecure());

// Define allowed origins
const allowedOrigins = ["http://localhost:3000"];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.get('/', (req, res) => {
    res.json({
        message: "You've reached the MFT API!"
    });
});

app.get('/list-storages', (req, res) => {
    serviceClient.listStorages({}, (err, resp) => {
        if (err) {
            res.json(err);
        } else {
            res.json(resp);
        }
    });
});

app.get('/list-storages/:storageId', (req, res) => {
    const storageId = req.params.storageId;
    const storageType = req.headers.storagetype;
    const path = req.headers.path;

    if (storageType === "LOCAL") {
        // Assuming TransferServiceClient is properly defined
        TransferServiceClient.resourceMetadata({"idRequest" :{
            "resourcePath": path,
            "storageId": storageId,
            "secretId": "",
            "recursiveSearch": true,
        }}, (err, resp) => {
            if (err) {
                res.json(err);
            } else {
                res.json(resp);
            }
        });
    } else {
        serviceClient.getSecretForStorage({"storageId": storageId}, (err, resp) => {
            if (err) {
                res.json(err);
            } else {
                const secretId = resp.secretId;
                TransferServiceClient.resourceMetadata({"idRequest" :{
                    "resourcePath": path,
                    "storageId": storageId,
                    "secretId": secretId,
                    "recursiveSearch": true,
                }}, (err, resp) => {
                    if (err) {
                        res.json(err);
                    } else {
                        res.json(resp);
                    }
                });
            }
        });
    }
});

app.listen(port, () => {
    console.log(`MFT backend listening on port ${port}`);
});

