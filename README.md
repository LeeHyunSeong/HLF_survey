## JNU survey network (Hyperledger Fabric)

### ��Ʈ��ũ �غ����

Hyperledger Fabric ���� SW�� ��ġ
* node.js 8.9 ~ 9.0
* NPM 5.6.0 ~
* golang 1.11 ~
* docker 17.06 CE ~
* docker-compose 1.14 ~

Hyperledger Fabric �̹��� ���� ��ġ
```bash
curl -sSL http://bit.ly/2ysbOFE | bash -s 1.4.0
```

### ��Ʈ��ũ ����
```bash
cp ~/fabric-samples/bin/* ./gentool/
./operation.sh up
```

### ��Ʈ��ũ ����
```bash
./operation.sh down
```

### ����
* [hyperledger-fabricdocs (release-1.4)](https://hyperledger-fabric.readthedocs.io/en/release-1.4/)
* [Hyperledger Fabric SDK for node.js](https://hyperledger.github.io/fabric-sdk-node/release-1.4/index.html)
* [Hyperledger Fabric contract SDK for node.js](https://hyperledger.github.io/fabric-chaincode-node/release-1.4/api/)
* [hyperledger/fabric-samples/first-network](https://github.com/hyperledger/fabric-samples/tree/release-1.4/first-network)
* [hyperledger/fabric-samples/balance-transfer](https://github.com/hyperledger/fabric-samples/tree/release-1.4/balance-transfer)
* [hyperledger/fabric-samples/commercial-paper](https://github.com/hyperledger/fabric-samples/tree/release-1.4/commercial-paper)
* [IBM/evote](https://github.com/IBM/evote)
* [DappCampus/chaincode-tutorial](https://github.com/DappCampus/chaincode-tutorial)

#### TODO
* chaincode ���� ��ġ ���濡 ���� artifacts, scripts ���ϵ� ���� ����