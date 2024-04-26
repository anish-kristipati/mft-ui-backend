import { createRequire } from "module";
const require = createRequire(import.meta.url);
const express = require('express');
const { loadSync } = require('@grpc/proto-loader');
const { loadPackageDefinition, ChannelCredentials } = require('@grpc/grpc-js');
const lodash = require('lodash');
var cors = require('cors');

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.get('/', (req, res) => {
    res.send('Welcome to the MFT gRPC API');
});

app.get('/list-storages', (req, res) => {
    serviceClient.listStorages({}, (err, response) => {
        if (err) {
            res.status(500).send('Error listing storages');
        } else {
            res.json(response);
        }
    });
});